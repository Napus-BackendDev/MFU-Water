"""Publish yearly average flood water (river + surrounding flood) as display contours; KokData stays the source of truth."""
from pathlib import Path
import hashlib
import json
import numpy as np
from PIL import Image, ImageDraw
from pyproj import Transformer
from scipy.ndimage import binary_closing, distance_transform_edt
from shapely.geometry import Polygon
from flood_regions import water_regions

ROOT = Path(__file__).resolve().parents[1]
SOURCE = ROOT/'KokData/thaton-flood-events-2022-2026'
PUBLIC = ROOT/'public/flood-observations'
RIVER = ROOT/'public/flood-simulations/thaton.json'
# Masks are exported at ~3.3 m; the analysis scale is 10 m, so finer edges carry no information.
DOWNSAMPLE = 3
AREA_TOLERANCE = 0.12
# The flood mask excludes a slightly different "normal water" than the river layer; close the seam between them.
SEAM_CELLS = 2
THAI_YEAR = 543


def load_mask(path):
    alpha = np.array(Image.open(path).convert('RGBA'))[...,3] > 0
    h,w = alpha.shape[0]//DOWNSAMPLE*DOWNSAMPLE, alpha.shape[1]//DOWNSAMPLE*DOWNSAMPLE
    blocks = alpha[:h,:w].reshape(h//DOWNSAMPLE,DOWNSAMPLE,w//DOWNSAMPLE,DOWNSAMPLE)
    return blocks.mean(axis=(1,3)) >= .5


def utm_box(bounds, crs):
    # Earth Engine thumbnails cover the UTM bounding box of the lon/lat region.
    forward = Transformer.from_crs('EPSG:4326',crs,always_xy=True)
    corners = [forward.transform(lon,lat) for lon in (bounds['west'],bounds['east']) for lat in (bounds['south'],bounds['north'])]
    xs,ys = zip(*corners)
    return min(xs),min(ys),max(xs),max(ys)


def river_mask(shape, box, crs):
    forward = Transformer.from_crs('EPSG:4326',crs,always_xy=True)
    xmin,_,xmax,ymax = box
    ymin = box[1]
    scale = 4
    canvas = Image.new('1',(shape[1]*scale,shape[0]*scale))
    draw = ImageDraw.Draw(canvas)
    def pixels(ring):
        points = [forward.transform(lon,lat) for lon,lat in ring]
        return [((x-xmin)/(xmax-xmin)*shape[1]*scale,(ymax-y)/(ymax-ymin)*shape[0]*scale) for x,y in points]
    for feature in json.loads(RIVER.read_text(encoding='utf-8'))['waterFeatures']:
        exterior,*holes = feature['geometry']['coordinates']
        draw.polygon(pixels(exterior),fill=1)
        for hole in holes:
            draw.polygon(pixels(hole),fill=0)
    fine = np.array(canvas)
    return fine.reshape(shape[0],scale,shape[1],scale).mean(axis=(1,3)) >= .5


def average_flood(masks, river):
    """Area beyond the river equals the mean of the year's events: most-often-flooded cells first, then nearest the river."""
    if len(masks)==1:
        return masks[0]
    frequency = np.mean(masks,axis=0)
    target = round(np.mean([(mask&~river).sum() for mask in masks]))
    candidates = np.flatnonzero((frequency>0)&~river)
    distance = distance_transform_edt(~river).ravel()
    order = candidates[np.lexsort((distance[candidates],-frequency.ravel()[candidates]))]
    result = np.zeros(frequency.size,dtype=bool)
    result[order[:target]] = True
    return result.reshape(frequency.shape)


def contours(mask, box, back):
    xmin,ymin,xmax,ymax = box
    dx,dy = (xmax-xmin)/mask.shape[1],(ymax-ymin)/mask.shape[0]
    features,area = [],0.0
    for region in water_regions(mask,xmin+dx/2,ymax-dy/2,dx,dy):
        rings = region['geometry']['coordinates']
        polygon = Polygon(rings[0],rings[1:]).simplify(1.5)
        if polygon.is_empty or polygon.geom_type!='Polygon':
            continue
        area += polygon.area
        coordinates = [[[round(v,6) for v in back.transform(x,y)] for x,y in ring.coords]
                       for ring in [polygon.exterior,*polygon.interiors]]
        features.append({'type':'Feature','properties':{'kind':'water'},'geometry':{'type':'Polygon','coordinates':coordinates}})
    return features,area/1e6


def main():
    meta = json.loads((SOURCE/'events.json').read_text(encoding='utf-8'))
    box = utm_box(meta['bounds'],meta['crs'])
    back = Transformer.from_crs(meta['crs'],'EPSG:4326',always_xy=True)
    groups = {}
    for event in meta['events']:
        groups.setdefault(event['id'].split('_',1)[1][:4],[]).append(event)
    years = []
    for year,events in groups.items():
        detected = [event for event in events if event['detected']]
        paths = [SOURCE/event['id']/'04_max_flood_extent_mask.png' for event in detected]
        digests = [hashlib.sha256(path.read_bytes()).hexdigest() for path in paths]
        masks = [load_mask(path) for path in paths]
        river = river_mask(masks[0].shape,box,meta['crs'])
        cell_km2 = (box[2]-box[0])*(box[3]-box[1])/masks[0].size/1e6
        flood = average_flood(masks,river)
        merged = binary_closing(river|flood,iterations=SEAM_CELLS)|river|flood
        features,drawn = contours(merged,box,back)
        source_area = merged.sum()*cell_km2
        drift = abs(drawn-source_area)/source_area
        river_km2 = river.sum()*cell_km2
        # Figures describe the drawn water, because part of each flood mask overlaps the river layer and must not count twice.
        # Events the satellites did not detect are left out of the mean rather than counted as zero.
        total_km2 = float(source_area)
        flood_km2 = total_km2-float(river_km2)
        analysed_km2 = float(np.mean([event['maxExtentKm2'] for event in detected]))
        print(year,f'{len(detected)}/{len(events)} events, {len(features)} regions, river {river_km2:.3f}, beyond river {flood_km2:.3f}, total {total_km2:.3f}, analysed flood {analysed_km2:.3f}, drawn {drawn:.3f} km2, contour drift {drift:.1%}')
        assert drift <= AREA_TOLERANCE, f'{year}: contours drifted from the source mask'
        output = {'type':'FeatureCollection','displayOnly':True,'method':'Yearly average flood extent merged with the existing river, contoured with water_regions',
                  'sourceSha256':digests,'features':features}
        target = PUBLIC/f'thaton-{year}-display.json'
        target.write_text(json.dumps(output,separators=(',',':')),encoding='utf-8')
        print(year,'->',target.name,target.stat().st_size,'bytes')
        years.append({'date':year,'labelYear':int(year)+THAI_YEAR,'file':f'/flood-observations/thaton-{year}-display.json',
                      'totalKm2':round(total_km2,3),'totalRai':round(total_km2*625),'riverKm2':round(float(river_km2),3),
                      'floodKm2':round(flood_km2,3),'analysedFloodKm2':round(analysed_km2,3),'eventLabels':[event['label'] for event in detected],
                      'undetectedLabels':[event['label'] for event in events if not event['detected']]})
    manifest_path = PUBLIC/'thaton.json'
    manifest = json.loads(manifest_path.read_text(encoding='utf-8'))
    manifest.pop('events',None)
    manifest.pop('eventsInterpretation',None)
    manifest['years'] = years
    manifest['yearsInterpretation'] = 'Mean of the maximum flood extent of the events detected in each year, plus the existing river; not depth or a verified flood boundary.'
    manifest_path.write_text(json.dumps(manifest,ensure_ascii=False,separators=(',',':')),encoding='utf-8')


if __name__=='__main__':
    main()
