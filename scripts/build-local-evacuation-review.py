"""Extract supplied PDF symbols for loopback-only review; never write to public/ or data/."""
import hashlib
import json
import math
import os
from collections import Counter
from pathlib import Path
import pdfplumber
import pypdfium2
import numpy as np
from align_evacuation_roads import connect_route_gaps, ROADS

source = Path.home() / 'Downloads/SWG5_ThaTon_Vulnerable_Populations_Evacuation_Map.pdf'
categories = {
    (0.9059, 0.098, 0.1216): 'elderly',
    (1.0, 0.651, 0.1608): 'disability',
    (1.0, 0.9608, 0.0): 'children',
    (0.9373, 0.8431, 0.0): 'children',
    (0.0039, 0.0039, 0.0039): 'children_elderly',
}
seeds = []
with pdfplumber.open(source) as pdf:
    for rect in pdf.pages[0].rects:
        kind = categories.get(rect.get('non_stroking_color'))
        if not kind or not (8 <= rect['width'] <= 16 and 8 <= rect['height'] <= 16):
            continue
        x = (rect['x0'] + rect['width'] / 2) * 1.5
        y = rect['bottom'] * 1.5
        if not (130 < x < 1437 and 248 < y < 1096):
            continue  # Exclude legend symbols.
        seeds.append({'kind': kind, 'x': x, 'y': y})

# Match visible circular symbols to vector seeds; hidden redraws are not separate houses.
pdf = pypdfium2.PdfDocument(str(source))
image = np.array(pdf[0].render(scale=1.5).to_pil().convert('RGB'))
r, g, b = [image[:, :, i].astype(float) for i in range(3)]
masks = {
    'elderly': (r > 180) & (r > 1.6 * g) & (r > 1.5 * b) & (g < 160),
    'disability': (r > 220) & (g > 90) & (g < 200) & (b < 100),
    'children': (r > 210) & (g > 200) & (b < 100) & (abs(r - g) < 60),
    'children_elderly': (r < 40) & (g < 40) & (b < 40),
}
symbols = []
for kind, mask in masks.items():
    mask[:360, :] = False
    mask[940:, :] = False
    mask[:, :650] = False
    mask[:, 1230:] = False
    remaining = set(zip(*np.where(mask)))
    while remaining:
        pending, component = [remaining.pop()], []
        while pending:
            yy, xx = pending.pop()
            component.append((yy, xx))
            for neighbor in [(yy - 1, xx), (yy + 1, xx), (yy, xx - 1), (yy, xx + 1)]:
                if neighbor in remaining:
                    remaining.remove(neighbor)
                    pending.append(neighbor)
        ys, xs = zip(*component)
        width, height = max(xs) - min(xs) + 1, max(ys) - min(ys) + 1
        if not (5 <= width <= 16 and 5 <= height <= 16 and .65 < width / height < 1.5 and len(component) / (width * height) > .5):
            continue
        x, y = float(sum(xs) / len(xs)), float(sum(ys) / len(ys))
        if any(s['kind'] == kind and math.hypot(s['x'] - x, s['y'] - y) < 18 for s in seeds):
            symbols.append((kind, x, y))

# Visual audit: touching black dots merge in the mask; three translucent yellow dots
# fall below the raster threshold. These centres were checked against the source render.
for kind, x, y in [
    ('children_elderly', 761.3, 416.7), ('children_elderly', 759.3, 426.7),
    ('children', 836.7, 503.3), ('children', 878.0, 500.0), ('children', 990.7, 672.0),
]:
    if not any(k == kind and math.hypot(xx - x, yy - y) < 5 for k, xx, yy in symbols):
        symbols.append((kind, x, y))

points = []
for kind, x, y in sorted(symbols, key=lambda s: (s[2], s[1])):
    sx = x * 0.4554762834878796 - y * 0.008244751937824965 + 509.2067561732836
    sy = x * -0.0023130538478935447 + y * 0.48133108538766783 + 280.9320064971112
    wx, wy = 25427 * 256 + sx - 497, 14519 * 256 + sy - 295
    longitude = wx / (256 * 2**15) * 360 - 180
    latitude = math.degrees(math.atan(math.sinh(math.pi * (1 - 2 * wy / (256 * 2**15)))))
    points.append({'id': f'LOCAL-{len(points) + 1:03}', 'kind': kind,
                   'latitude': round(latitude, 5), 'longitude': round(longitude, 5),
                   'sourcePixel': [round(x, 2), round(y, 2)]})

# Trace only the orange strokes visible in the PDF, preserving the visible gap.
# Do not extend the trace to the nearby assembly point or invent travel directions.
route_pixels = [
    [[448, 459], [531, 493], [558, 411], [609, 334], [625, 348],
     [671, 372], [718, 397], [706, 431], [718, 452], [742, 477],
     [771, 501], [846, 504], [873, 517], [899, 522]],
    [[902, 536], [904, 605], [917, 708], [924, 770], [944, 861]],
]
routes = []
for segment in route_pixels:
    route = []
    for x, y in segment:
        sx = x * 0.4554762834878796 - y * 0.008244751937824965 + 509.2067561732836
        sy = x * -0.0023130538478935447 + y * 0.48133108538766783 + 280.9320064971112
        wx, wy = 25427 * 256 + sx - 497, 14519 * 256 + sy - 295
        route.append([round(math.degrees(math.atan(math.sinh(math.pi * (1 - 2 * wy / (256 * 2**15))))), 5),
                      round(wx / (256 * 2**15) * 360 - 180, 5)])
    routes.append(route)

source_routes = routes
routes,route_audit,connectors = connect_route_gaps(source_routes,json.loads(ROADS.read_text(encoding='utf-8')))
output = Path(os.environ['LOCALAPPDATA']) / 'MFUKokWaterWatch/restricted/evacuation-review.json'
output.parent.mkdir(parents=True, exist_ok=True)
output.write_text(json.dumps({'communityId': 'thaton', 'visibility': 'local-review-only',
                             'verificationStatus': 'approximate_not_field_verified',
                             'source': source.name, 'sourceSha256': hashlib.sha256(source.read_bytes()).hexdigest(),
                             'points': points, 'routes': routes, 'sourceRoutes':source_routes,
                             'routeAlignment':{'method':'offline_osm_road_alignment','status':'not_field_verified',
                                               'roadDataSha256':hashlib.sha256(ROADS.read_bytes()).hexdigest(),
                                               'segments':route_audit,'continuity':'connected_cached_roads',
                                               'connectors':connectors}}, ensure_ascii=False, indent=2), encoding='utf-8')
print(json.dumps({'points': len(points), 'counts': dict(Counter(p['kind'] for p in points)),
                  'savedOutsideProject': True}))
