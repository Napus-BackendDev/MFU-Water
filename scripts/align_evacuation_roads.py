"""Align approximate PDF traces to cached public OSM roads, entirely offline.

Household locations never enter the road matcher or an external request.
This adjusts map geometry, not evacuation directions or current road safety.
"""
from pathlib import Path
import hashlib
import heapq
import itertools
import json
import math
import os

ROOT = Path(__file__).resolve().parents[1]
ROADS = ROOT/'KokData/thaton-roads/osm-roads.json'
SCALE_X = 111320*math.cos(math.radians(20.06))
SCALE_Y = 111320


def xy(point):
    lat,lon = point
    return lon*SCALE_X,lat*SCALE_Y


def project(point, a, b):
    px,py = xy(point)
    ax,ay = xy(a)
    bx,by = xy(b)
    length2 = (bx-ax)**2+(by-ay)**2
    t = max(0,min(1,((px-ax)*(bx-ax)+(py-ay)*(by-ay))/length2)) if length2 else 0
    snapped = [a[0]+t*(b[0]-a[0]),a[1]+t*(b[1]-a[1])]
    sx,sy = xy(snapped)
    return math.hypot(px-sx,py-sy),t,snapped


def distance(a,b):
    ax,ay = xy(a)
    bx,by = xy(b)
    return math.hypot(ax-bx,ay-by)


def align_routes(routes, roads):
    edges = []
    for way in roads['elements']:
        tags = way.get('tags',{})
        if way.get('type')!='way' or not tags.get('highway'):
            continue
        if tags.get('access') in ('no','private') or tags.get('foot')=='no' or tags.get('area')=='yes':
            continue
        nodes,geometry = way['nodes'],way['geometry']
        for i in range(len(nodes)-1):
            a,b = geometry[i],geometry[i+1]
            edges.append((nodes[i],nodes[i+1],[a['lat'],a['lon']],[b['lat'],b['lon']]))
    assert edges, 'No usable cached OSM roads'
    aligned, audits = [],[]
    for route in routes:
        assert len(route)>=2
        # Keep PDF anchor order, projecting onto actual road segments, not vertices.
        anchors,splits = [],{}
        offsets = []
        for index,point in enumerate(route):
            offset,edge_id,t,snapped = min((project(point,a,b)[0],i,*project(point,a,b)[1:])
                                          for i,(_,_,a,b) in enumerate(edges))
            assert offset<=80, f'PDF anchor {index} is over 80 m from a usable road; manual review required'
            key = f'anchor-{index}'
            anchors.append(key)
            splits.setdefault(edge_id,[]).append((t,key,snapped))
            offsets.append(offset)
        graph,positions = {},{}
        for edge_id,(start,end,a,b) in enumerate(edges):
            pieces = [(0,start,a),*sorted(splits.get(edge_id,[])),(1,end,b)]
            for _,key,point in pieces:
                positions[key] = point
            for (_,u,p),(_,v,q) in zip(pieces,pieces[1:]):
                midpoint = [(p[0]+q[0])/2,(p[1]+q[1])/2]
                deviation = min(project(midpoint,a,b)[0] for a,b in zip(route,route[1:]))
                if deviation>150:
                    continue  # Never invent a large detour outside the PDF corridor.
                cost = distance(p,q)*(1+(deviation/30)**2)
                graph.setdefault(u,[]).append((v,cost))
                graph.setdefault(v,[]).append((u,cost))
        output = []
        for start,end in zip(anchors,anchors[1:]):
            serial = itertools.count()
            queue,best,parent = [(0,next(serial),start)],{start:0},{}
            while queue:
                cost,_,node = heapq.heappop(queue)
                if cost!=best[node]:
                    continue
                if node==end:
                    break
                for neighbor,weight in graph.get(node,[]):
                    candidate = cost+weight
                    if candidate<best.get(neighbor,math.inf):
                        best[neighbor],parent[neighbor] = candidate,node
                        heapq.heappush(queue,(candidate,next(serial),neighbor))
            assert end in best, 'No connected OSM path within the PDF corridor; manual review required'
            path,node = [end],end
            while node!=start:
                node = parent[node]
                path.append(node)
            points = [positions[key] for key in reversed(path)]
            for point in points:
                if not output or distance(point,output[-1])>.01:
                    output.append(point)
        assert len(output)>=2
        # Every rendered segment must lie on a downloaded road segment.
        for a,b in zip(output,output[1:]):
            assert any(project(a,p,q)[0]<.02 and project(b,p,q)[0]<.02 for _,_,p,q in edges)
        aligned.append([[round(lat,8),round(lon,8)] for lat,lon in output])
        audits.append({'sourceAnchors':len(route),'roadVertices':len(output),
                       'maxAnchorOffsetMetres':round(max(offsets),1),
                       'lengthMetres':round(sum(distance(a,b) for a,b in zip(output,output[1:])),1)})
    return aligned,audits


def connect_route_gaps(routes, roads):
    """Join the source's small trace gaps only through the existing road graph."""
    aligned,audit = align_routes(routes,roads)
    joined = list(aligned[0])
    connectors = []
    for following in aligned[1:]:
        gap = distance(joined[-1],following[0])
        assert gap<=80, 'Route gap is over 80 m; manual review required'
        if gap>.01:
            bridge,bridge_audit = align_routes([[joined[-1],following[0]]],roads)
            assert distance(bridge[0][0],joined[-1])<.02 and distance(bridge[0][-1],following[0])<.02
            length = bridge_audit[0]['lengthMetres']
            assert length<=max(100,gap*3), 'Connecting road detour is too long; manual review required'
            joined.extend(bridge[0][1:])
            connectors.append({'gapMetres':round(gap,1),'roadLengthMetres':length})
        joined.extend(following[1:])
    return [joined],audit,connectors


if __name__=='__main__':
    target = Path(os.environ['LOCALAPPDATA'])/'MFUKokWaterWatch/restricted/evacuation-review.json'
    data = json.loads(target.read_text(encoding='utf-8'))
    source = data.get('sourceRoutes',data['routes'])
    routes,audit,connectors = connect_route_gaps(source,json.loads(ROADS.read_text(encoding='utf-8')))
    data.update(sourceRoutes=source,routes=routes,routeAlignment={
        'method':'offline_osm_road_alignment','status':'not_field_verified',
        'roadDataSha256':hashlib.sha256(ROADS.read_bytes()).hexdigest(),'segments':audit,
        'continuity':'connected_cached_roads','connectors':connectors})
    temporary = target.with_suffix('.tmp')
    temporary.write_text(json.dumps(data,ensure_ascii=False,indent=2),encoding='utf-8')
    temporary.replace(target)
    print(json.dumps({'routes':audit,'connectors':connectors,'householdsUnchanged':True,'sourceRoutesRetained':True}))
