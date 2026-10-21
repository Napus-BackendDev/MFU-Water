"""Normalize all My Maps layers for loopback-only review; no public household export."""
from collections import Counter
import hashlib
import json
import math
import os
from pathlib import Path
import xml.etree.ElementTree as ET

NS = {'k':'http://www.opengis.net/kml/2.2'}
MAP_ID = '1hbtcxYsGW1WDgBtuXnvKoUh11XQ0rAM'
DIRECTORY = Path(os.environ['LOCALAPPDATA'])/'MFUKokWaterWatch/restricted/mymaps-20261020'


def normalize(source):
    tree = ET.parse(source)
    styles = {s.attrib['id']:s for s in tree.findall('.//k:Style',NS)}
    maps = {s.attrib['id']:s for s in tree.findall('.//k:StyleMap',NS)}

    def color(style_id):
        if style_id in maps:
            pairs = maps[style_id].findall('k:Pair',NS)
            ref = next(p.findtext('k:styleUrl',namespaces=NS) for p in pairs if p.findtext('k:key',namespaces=NS)=='normal')
            style_id = ref.lstrip('#')
        value = styles[style_id].findtext('k:IconStyle/k:color',namespaces=NS)
        assert value and len(value)==8 and all(c in '0123456789abcdefABCDEF' for c in value)
        return '#'+value[6:8]+value[4:6]+value[2:4]

    layers = []
    for index,folder in enumerate(tree.findall('.//k:Folder',NS),1):
        records = []
        for row,placemark in enumerate(folder.findall('k:Placemark',NS),1):
            coordinates = placemark.findtext('k:Point/k:coordinates',namespaces=NS)
            assert coordinates, 'Unsupported geometry; review before importing'
            lon,lat = [float(v) for v in coordinates.strip().split(',')[:2]]
            assert math.isfinite(lat) and math.isfinite(lon) and 19<lat<21 and 99<lon<100
            fields = {item.attrib['name']:item.findtext('k:value',default='',namespaces=NS)
                      for item in placemark.findall('k:ExtendedData/k:Data',NS)}
            status = fields.get(f'สถานะจัดสีหมุด_Layer{index}')
            assert status, 'Missing source status; do not invent a risk class'
            # Keep household identifiers only in the original restricted KML.
            visible = {key:value for key,value in fields.items()
                       if key not in ('Latitude','Longitude','เลขที่บ้าน') and not key.startswith('สถานะจัดสีหมุด_')}
            records.append({'id':f'MM{index}-{row:03}','latitude':lat,'longitude':lon,
                            'status':status,'color':color(placemark.findtext('k:styleUrl',namespaces=NS).lstrip('#')),
                            'fields':visible})
        legends = Counter((r['status'],r['color']) for r in records)
        layers.append({'id':f'layer-{index}','label':folder.findtext('k:name',namespaces=NS),'records':records,
                       'legend':[{'label':label,'color':shade,'rows':count} for (label,shade),count in sorted(legends.items())]})
    assert len(layers)==6 and all(len(layer['records'])==129 for layer in layers), 'Source structure changed; review counts'
    base = [(r['latitude'],r['longitude']) for r in layers[0]['records']]
    assert all([(r['latitude'],r['longitude']) for r in layer['records']]==base for layer in layers)
    return {'visibility':'local-review-only','sourceUrl':f'https://www.google.com/maps/d/viewer?mid={MAP_ID}',
            'title':tree.findtext('.//k:Document/k:name',namespaces=NS),
            'importedAt':'2026-10-20','surveyDate':None,'sourceSha256':hashlib.sha256(source.read_bytes()).hexdigest(),
            'sourceRowsPerLayer':129,'distinctCoordinates':len(set(base)),'layers':layers}


if __name__=='__main__':
    result = normalize(DIRECTORY/'source.kml')
    temporary = DIRECTORY/'review.tmp'
    temporary.write_text(json.dumps(result,ensure_ascii=False,indent=2),encoding='utf-8')
    temporary.replace(DIRECTORY/'review.json')
    print(json.dumps({'layers':len(result['layers']),'rowsPerLayer':result['sourceRowsPerLayer'],
                      'distinctCoordinates':result['distinctCoordinates'],'storedOutsideProject':True}))
