"""Produce a public, aggregated flood-history layer; never export household data."""
import hashlib
import json
import math
from collections import defaultdict
from pathlib import Path
import xml.etree.ElementTree as ET

ROOT = Path(__file__).resolve().parents[1]
SOURCE = next((ROOT / 'KokData').rglob('MyMaps_KML.kml'))
NS = {'k': 'http://www.opengis.net/kml/2.2'}
RADIUS = 6378137
CELL = 1000


def inverse(x, y):
    return [round(math.degrees(x / RADIUS), 6),
            round(math.degrees(2 * math.atan(math.exp(y / RADIUS)) - math.pi / 2), 6)]


cells = defaultdict(lambda: [0, 0])
total = 0
for folder in ET.parse(SOURCE).findall('.//k:Folder', NS):
    if folder.findtext('k:name', namespaces=NS) != 'ความเสี่ยงภัยน้ำท่วมและความลึกของน้ำ':
        continue
    for point in folder.findall('k:Placemark', NS):
        depth = point.findtext("k:ExtendedData/k:Data[@name='ระดับความลึกน้ำท่วมที่บ้าน']/k:value", namespaces=NS)
        coords = point.findtext('k:Point/k:coordinates', namespaces=NS)
        if not coords or not depth:
            raise ValueError('Missing geometry or flood response; review source before publication')
        lon, lat = map(float, coords.strip().split(',')[:2])
        if not (99 < lon < 100 and 19 < lat < 21):
            raise ValueError('Source outside expected Thaton area')
        if depth != 'ไม่ท่วมบริเวณบ้าน' and not depth.startswith('ระดับ'):
            raise ValueError('Unrecognized flood response')
        x = RADIUS * math.radians(lon)
        y = RADIUS * math.log(math.tan(math.pi / 4 + math.radians(lat) / 2))
        cell = cells[(math.floor(x / CELL), math.floor(y / CELL))]
        cell[0] += 1
        cell[1] += int(depth != 'ไม่ท่วมบริเวณบ้าน')
        total += 1

if total != 129:
    raise ValueError('Source row count changed; review before publication')

features = []
for (x, y), (records, flooded) in sorted(cells.items()):
    # Suppress small cells AND small complementary groups; no zero or inferred small count.
    if flooded < 5 or records - flooded < 5:
        continue
    ring = [inverse((x + dx) * CELL, (y + dy) * CELL)
            for dx, dy in [(0, 0), (1, 0), (1, 1), (0, 1), (0, 0)]]
    features.append({'type': 'Feature', 'geometry': {'type': 'Polygon', 'coordinates': [ring]},
                     'properties': {'id': f'FH{len(features) + 1:02}', 'records': records,
                                    'floodedRows': flooded}})

result = {'type': 'FeatureCollection', 'features': features,
          'metadata': {'communityId': 'thaton', 'source': 'MyMaps_KML.kml — flood-history responses',
                       'sourceSha256': hashlib.sha256(SOURCE.read_bytes()).hexdigest(),
                       'sourceRows': total, 'cellSizeMetres': CELL, 'gridCrs': 'EPSG:3857',
                       'minimumGroupSize': 5, 'surveyDate': None,
                       'note': 'Historical survey rows, not households, live flood extent, or evacuation areas. KML coordinates differ from E04; do not join or sum with E04 grids.'}}
(ROOT / 'data/public-flood-history.json').write_text(json.dumps(result, ensure_ascii=False, indent=2) + '\n', encoding='utf-8')
print(json.dumps({'sourceRows': total, 'publicCells': len(features),
                  'publicRows': sum(f['properties']['records'] for f in features)}))
