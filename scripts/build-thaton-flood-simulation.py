"""Experimental connected inundation using real DSM, not a hydraulic forecast."""
from collections import deque
from pathlib import Path
import hashlib
import json
import math
import csv
import numpy as np
from PIL import Image
from flood_regions import regions, depth_regions, water_regions
from flood_threshold import minimum_connected_rise
import rasterio

ROOT = Path(__file__).resolve().parents[1]
SOURCE = ROOT / 'KokData/terrain-thaton'
STAGES = [2.5, 5., 7.5]
dem_path = SOURCE / 'copernicus-glo30-N20E099.tif'
water_path = SOURCE / 'copernicus-water-mask-N20E099.tif'
image = Image.open(dem_path)
scale = image.tag_v2[33550]
tie = image.tag_v2[33922]
keys = image.tag_v2[34735]
geo_keys = {keys[i]: keys[i+3] for i in range(4, len(keys), 4)}
assert geo_keys[1025] == 2  # RasterPixelIsPoint: tie point is a sample centre.
west, north = tie[3], tie[4]
dx, dy = scale[:2]
r0, r1 = math.floor((north - 20.08) / dy), math.ceil((north - 20.04) / dy)
c0, c1 = math.floor((99.345 - west) / dx), math.ceil((99.385 - west) / dx)
dem = np.array(image)[r0:r1, c0:c1].astype(float)
water = np.array(Image.open(water_path))[r0:r1, c0:c1]
terrain_path = SOURCE/'gedtm30-thaton-aligned.tif'
terrain_metadata = json.loads((SOURCE/'gedtm30-provenance.json').read_text(encoding='utf-8'))
assert hashlib.sha256(terrain_path.read_bytes()).hexdigest() == terrain_metadata['alignedSha256']
with rasterio.open(terrain_path) as terrain_source:
    assert terrain_source.tags()['VERTICAL_DATUM'] == 'EGM2008/EPSG:3855'
    assert abs(terrain_source.transform.c-(west+(c0-.5)*dx)) < 1e-10
    assert abs(terrain_source.transform.f-(north-(r0-.5)*dy)) < 1e-10
    ground = terrain_source.read(1).astype(float)
assert ground.shape == dem.shape
valid = np.isfinite(ground) & (ground > -100)
river = (water == 3) & valid  # Official WBM: 0 land, 1 ocean, 2 lake, 3 river.
assert river.any()
h, w = dem.shape
rr, cc = np.where(river)
grid_r, grid_c = np.indices(dem.shape)
nearest = np.empty(h * w, dtype=int)
cells = np.column_stack((grid_r.ravel(), grid_c.ravel()))
for start in range(0, len(cells), 512):
    batch = cells[start:start + 512]
    distance = (batch[:, 0, None] - rr) ** 2 + ((batch[:, 1, None] - cc) * math.cos(math.radians(20.06))) ** 2
    nearest[start:start + len(batch)] = distance.argmin(axis=1)
reference = dem[rr[nearest], cc[nearest]].reshape(dem.shape)
threshold = minimum_connected_rise(ground, reference, river, valid)
spread_path = SOURCE/'gedtm30-spread-aligned.tif'
spread_metadata = json.loads((SOURCE/'gedtm30-spread-provenance.json').read_text(encoding='utf-8'))
assert hashlib.sha256(spread_path.read_bytes()).hexdigest() == spread_metadata['sha256']
with rasterio.open(spread_path) as spread_source:
    assert spread_source.transform == terrain_source.transform
    spread = spread_source.read(1).astype(float)
assert spread.shape == ground.shape and np.isfinite(spread).all() and (spread >= 0).all()
# Separate hypothetical terrain case; the main terrain is unchanged.
sensitivity_ground = ground-np.where(water == 0,spread,0)
possible_threshold = minimum_connected_rise(sensitivity_ground,reference,river,valid)
assert (possible_threshold <= threshold).all()


def connected(eligible):
    result = river.copy()
    queue = deque(zip(*np.where(river)))
    while queue:
        r, c = queue.popleft()
        for nr, nc in [(r-1,c), (r+1,c), (r,c-1), (r,c+1)]:
            if 0 <= nr < h and 0 <= nc < w and eligible[nr, nc] and not result[nr, nc]:
                result[nr, nc] = True
                queue.append((nr, nc))
    return result


scenarios, previous, wet_by_stage = [], np.zeros(dem.shape, dtype=bool), {}
previous_possible = np.zeros(dem.shape,dtype=bool)
first_stage = np.zeros(dem.shape, dtype=float)
grid_audit = {}
for rise in STAGES:
    # Quantize before classification so floating-point noise cannot create zero-depth floods.
    depth = np.round(reference + rise - ground, 2)
    wet = connected(valid & (depth > 0)) & (water == 0)
    assert np.array_equal(wet, (threshold < rise) & (water == 0)), 'Threshold must match connected inundation'
    assert not (previous & ~wet).any(), 'Higher stage must not shrink inundation'
    previous = wet
    wet_by_stage[rise] = wet
    first_stage[wet & (first_stage == 0)] = rise
    classes = np.where(wet, np.where(depth <= .5, 1, np.where(depth <= 1, 2, 3)), 0)
    assert (depth[wet] > 0).all()
    assert not (wet & (water != 0)).any(), 'Only connected land is published'
    origin = (west+c0*dx, north-r0*dy, dx, dy)
    features, areas = depth_regions(classes, depth, *origin)
    impacts, impact_areas = regions(np.where(wet, first_stage, 0), depth, STAGES, 'firstRiseMetres', *origin)
    possible_depth = np.round(reference+rise-sensitivity_ground,2)
    possible_wet = connected(valid & (possible_depth > 0)) & (water == 0)
    assert np.array_equal(possible_wet,(possible_threshold < rise) & (water == 0))
    assert not (wet & ~possible_wet).any()
    assert not (previous_possible & ~possible_wet).any()
    previous_possible = possible_wet
    additional = possible_wet & ~wet
    potential_features, potential_areas = regions(additional.astype(int),possible_depth,[1],'sensitivity',*origin)
    assert sum(areas) == sum(impact_areas) or abs(sum(areas)-sum(impact_areas)) <= 2
    grid_audit[f'classes{rise:g}'] = classes.astype(np.uint8)
    grid_audit[f'depth{rise:g}'] = depth
    grid_audit[f'possible{rise:g}'] = possible_wet
    scenarios.append({'riseMetres':rise,'areasM2':areas,'impactAreasM2':impact_areas,
                      'potentialAreaM2':potential_areas[0],'potentialFeatures':potential_features,
                      'type':'FeatureCollection','features':features,'impactFeatures':impacts})

np.savez_compressed(SOURCE/'flood-grid-audit.npz', **grid_audit, firstStage=first_stage,
                    river=river, water=water, origin=np.array(origin),ground=ground,reference=reference,threshold=threshold,
                    spread=spread,possibleThreshold=possible_threshold)

# Audit the reference without flattening or inventing a measured water surface.
jumps = []
for axis in [0, 1]:
    delta = np.abs(np.diff(reference, axis=axis))
    near_wet = (previous[1:, :] | previous[:-1, :]) if axis == 0 else (previous[:, 1:] | previous[:, :-1])
    jumps.append({'axis':axis,'maxMetres':float(delta.max()),
                  'maxBesideFloodedLandMetres':float(delta[near_wet].max()) if near_wet.any() else 0})

# E-W terrain transects for inspection, not surveyed hydraulic cross-sections.
sections = []
for name, latitude, left, right in [
    ('upstream', 20.063333333333333, 99.35, 99.365),
    ('bridge', 20.06111111111111, 99.354, 99.37),
    ('downstream', 20.058888888888887, 99.358, 99.38),
]:
    r = round((north-latitude)/dy)-r0
    first = max(0, round((left-west)/dx)-c0)
    last = min(w-1, round((right-west)/dx)-c0)
    samples = []
    for c in range(first, last+1):
        sample = {'id':f'{name}-{c}', 'longitude':west+(c0+c)*dx,
                        'latitude':north-(r0+r)*dy,'dsmMetres':float(dem[r,c]),
                        'groundMetres':float(ground[r,c]),'requiredRiseMetres':float(threshold[r,c]),
                        'waterMask':int(water[r,c]),'referenceMetres':float(reference[r,c])}
        for rise in STAGES:
            sample[f'connectedDepthAt{rise}m'] = round(float(reference[r,c]+rise-ground[r,c]),2) if wet_by_stage[rise][r,c] else 0
        samples.append(sample)
    assert any(s['waterMask'] == 3 for s in samples), 'Transect must cross the river'
    sections.append({'id':name,'samples':samples})

checks = json.loads((SOURCE/'earth-engine-grid-check.json').read_text(encoding='utf-8'))
for feature in checks['result']['features']:
    lon, lat = feature['geometry']['coordinates']
    r, c = round((north-lat)/dy)-r0, round((lon-west)/dx)-c0
    assert abs(dem[r,c]-feature['properties']['DEM']) < .001, 'Earth Engine native-grid height mismatch'
    assert water[r,c] == feature['properties']['WBM'], 'Earth Engine river mask mismatch'

section_checks = json.loads((SOURCE/'earth-engine-section-check.json').read_text(encoding='utf-8'))
expected = {s['id']:s for section in sections for s in section['samples']}
assert len(section_checks['samples']) == len(expected)
assert {row[0] for row in section_checks['samples']} == set(expected)
for sample_id, elevation, mask in section_checks['samples']:
    assert abs(expected[sample_id]['dsmMetres']-elevation) < .001, 'Transect elevation mismatch'
    assert expected[sample_id]['waterMask'] == mask, 'Transect water mask mismatch'

audit = {'status':'reference_not_calibrated','earthEngineMatchingSamples':len(checks['result']['features'])+len(expected),
         'referenceJumps':jumps,'crossSections':sections,
         'terrainSource':terrain_metadata,
         'conclusion':'Copernicus DSM/WBM reference samples match Earth Engine. Land now uses GEDTM30 estimated bare earth on the same EGM2008 vertical datum. Minimum connected river rise includes intervening higher terrain. No measured starting river stage or local flood calibration is available.'}
(SOURCE/'terrain-audit.json').write_text(json.dumps(audit,ensure_ascii=False,indent=2)+'\n',encoding='utf-8')
with (SOURCE/'cross-sections.csv').open('w',newline='',encoding='utf-8') as stream:
    writer = csv.DictWriter(stream, fieldnames=list(sections[0]['samples'][0]))
    writer.writeheader()
    for section in sections:
        writer.writerows(section['samples'])

credit = terrain_metadata['credit']+' produced using Copernicus WorldDEM-30 © DLR e.V. 2010-2014 and © Airbus Defence and Space GmbH 2014-2018 provided under COPERNICUS by the European Union and ESA; all rights reserved'
result = {'communityId':'thaton','status':'experimental_not_validated','resolutionMetres':30,
          'displayGeometry':'Shared continuous depth bands clipped to a six-subdivision monotone-interpolated wet-land outline. Adjacent colours share boundaries without inward rounding gaps. Source grid-centre classes, dry holes and grid-based totals retained; interpolation adds no terrain observations.',
          'gridAuditSha256':hashlib.sha256((SOURCE/'flood-grid-audit.npz').read_bytes()).hexdigest(),
          'method':'GEDTM30 estimated bare earth; Copernicus WBM nearest-river surface reference in EGM2008. Minimum connected rise via minimax terrain path, cross-checked against 4-neighbour inundation. No measured initial river stage, hydraulic structures or flood-event calibration.',
          'validation':{'status':'reference_not_calibrated','earthEngineMatchingSamples':audit['earthEngineMatchingSamples'],
                        'maxAdjacentReferenceJumpMetres':max(j['maxMetres'] for j in jumps),
                        'maxJumpBesideFloodedLandMetres':max(j['maxBesideFloodedLandMetres'] for j in jumps)},
          'terrain':{'dataset':terrain_metadata['dataset'],'verticalDatum':terrain_metadata['verticalDatum'],
                     'license':terrain_metadata['license'],'sha256':terrain_metadata['alignedSha256']},
          'availableStages':STAGES,
          'waterFeatures':water_regions(water,*origin),
          'sensitivity':spread_metadata,
          'grid':{'origin':[origin[0],origin[1]],'cellSize':[dx,dy],'width':w,'height':h,
                  'groundMetres':ground.round(1).ravel().tolist(),
                  'heightAboveReferenceMetres':np.round(ground-reference,2).ravel().tolist(),
                  'possibleHeightAboveReferenceMetres':np.round(sensitivity_ground-reference,2).ravel().tolist(),
                  'requiredRiseMetres':[round(float(x),2) if math.isfinite(x) else None for x in threshold.ravel()],
                  'possibleRequiredRiseMetres':[round(float(x),2) if math.isfinite(x) else None for x in possible_threshold.ravel()],
                  'terrainSpreadMetres':spread.round(2).ravel().tolist(),
                  'waterMask':water.ravel().tolist()},
          'bounds':[[north-(r1-.5)*dy,west+(c0-.5)*dx],[north-(r0-.5)*dy,west+(c1-.5)*dx]],
          'source':'GEDTM30 estimated bare earth + Copernicus GLO-30 river reference/WBM',
          'sourceUrl':terrain_metadata['paperUrl'],
          'credit':credit,'sourceSha256':hashlib.sha256(dem_path.read_bytes()).hexdigest(),
          'waterMaskSha256':hashlib.sha256(water_path.read_bytes()).hexdigest(),
          'riverSurfaceRangeMetres':[float(dem[river].min()),float(dem[river].max())],
          'riverCells':int(river.sum()),'scenarios':scenarios}
target = ROOT / 'public/flood-simulations/thaton.json'
target.parent.mkdir(parents=True, exist_ok=True)
target.write_text(json.dumps(result,ensure_ascii=False,separators=(',',':'))+'\n',encoding='utf-8')
print(json.dumps({'grid':[h,w],'riverCells':int(river.sum()),'bytes':target.stat().st_size,
                  'scenarios':[{'rise':s['riseMetres'],'polygons':len(s['features']),'areasM2':s['areasM2']} for s in scenarios]}))
