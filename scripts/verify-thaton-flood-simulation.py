"""Check the published polygons against the source grid, independently of rendering."""
from collections import deque
from pathlib import Path
import hashlib
import json
import math
import numpy as np
import rasterio
from flood_threshold import minimum_connected_rise
from PIL import Image
from shapely import contains_xy
from shapely.geometry import shape
from shapely.strtree import STRtree
from shapely.ops import unary_union
from shapely.affinity import affine_transform
from flood_regions import depth_regions, _smooth_samples, _contours

root = Path(__file__).resolve().parents[1]
source = root / 'KokData/terrain-thaton'
data = json.loads((root / 'public/flood-simulations/thaton.json').read_text())
image = Image.open(source / 'copernicus-glo30-N20E099.tif')
water = np.array(Image.open(source / 'copernicus-water-mask-N20E099.tif'))
dx, dy = image.tag_v2[33550][:2]
west, north = image.tag_v2[33922][3:5]
assert data['sourceSha256'] == hashlib.sha256((source/'copernicus-glo30-N20E099.tif').read_bytes()).hexdigest()
assert [s['riseMetres'] for s in data['scenarios']] == data['availableStages'] == [2.5, 5, 7.5]
grid_path = source/'flood-grid-audit.npz'
assert data['gridAuditSha256'] == hashlib.sha256(grid_path.read_bytes()).hexdigest()
grid = np.load(grid_path)
provenance = json.loads((source/'gedtm30-provenance.json').read_text(encoding='utf-8'))
terrain_path = source/'gedtm30-thaton-aligned.tif'
assert data['terrain']['sha256'] == provenance['alignedSha256'] == hashlib.sha256(terrain_path.read_bytes()).hexdigest()
with rasterio.open(terrain_path) as terrain:
    assert terrain.tags()['VERTICAL_DATUM'] == 'EGM2008/EPSG:3855'
    assert np.array_equal(terrain.read(1), grid['ground'])
# A low settlement behind a higher barrier floods only after the barrier is crossed.
synthetic = np.array([[0.,6.,2.],[0.,4.,2.]])
seeds = np.zeros(synthetic.shape,dtype=bool)
seeds[0,0] = True
thresholds = minimum_connected_rise(synthetic,np.zeros_like(synthetic),seeds,np.ones_like(seeds))
assert thresholds[0,2] == 4, 'Choose the lowest connected path, not the nearest barrier or local elevation'
valid = np.ones_like(seeds)
valid[:,1] = False
assert np.isinf(minimum_connected_rise(synthetic,np.zeros_like(synthetic),seeds,valid)[0,2])
assert np.allclose(np.array(data['grid']['groundMetres']).reshape(grid['ground'].shape),grid['ground'].round(1))
assert np.allclose(np.array(data['grid']['requiredRiseMetres']).reshape(grid['ground'].shape),grid['threshold'])
origin_west, origin_north, grid_dx, grid_dy = grid['origin']
rows, cols = np.indices(grid['firstStage'].shape)
longitude, latitude = origin_west+cols*grid_dx, origin_north-rows*grid_dy
water_polygons = [shape(feature['geometry']) for feature in data['waterFeatures']]
assert water_polygons and all(p.is_valid and not p.is_empty for p in water_polygons)
display_water = unary_union(water_polygons)
assert np.array_equal(contains_xy(display_water,longitude,latitude),grid['water']!=0), 'Blue water must match the source water mask, not dry land'
first = np.zeros(rows.shape, dtype=float)
previous = np.zeros(rows.shape, dtype=bool)
previous_impacts = {}
previous_possible = np.zeros(rows.shape,dtype=bool)
spread_path = source/'gedtm30-spread-aligned.tif'
assert data['sensitivity']['sha256'] == hashlib.sha256(spread_path.read_bytes()).hexdigest()
with rasterio.open(spread_path) as spread_source:
    assert np.array_equal(spread_source.read(1),grid['spread'])
lower_ground = grid['ground']-np.where(grid['water'] == 0,grid['spread'],0)
relative = np.array(data['grid']['heightAboveReferenceMetres']).reshape(rows.shape)
possible_relative = np.array(data['grid']['possibleHeightAboveReferenceMetres']).reshape(rows.shape)
assert np.array_equal(relative,np.round(grid['ground']-grid['reference'],2))
assert np.array_equal(possible_relative,np.round(lower_ground-grid['reference'],2))
assert (grid['spread'] >= 0).all()
assert np.allclose(np.array(data['grid']['possibleRequiredRiseMetres']).reshape(rows.shape),grid['possibleThreshold'])


def connected_land(terrain,rise):
    eligible = np.round(grid['reference']+rise-terrain,2) > 0
    reached = grid['river'].copy()
    pending = deque(zip(*np.where(reached)))
    while pending:
        r,c = pending.popleft()
        for nr,nc in [(r-1,c),(r+1,c),(r,c-1),(r,c+1)]:
            if 0 <= nr < rows.shape[0] and 0 <= nc < rows.shape[1] and eligible[nr,nc] and not reached[nr,nc]:
                reached[nr,nc] = True
                pending.append((nr,nc))
    return reached & (grid['water'] == 0)


def check_regions(features, property_name, expected, depths):
    decoded, count = np.zeros(rows.shape, dtype=float), np.zeros(rows.shape, dtype=int)
    polygons = []
    for feature in features:
        polygon = shape(feature['geometry'])
        assert polygon.is_valid and not polygon.is_empty
        members = contains_xy(polygon, longitude, latitude)
        properties = feature['properties']
        assert members.sum() == properties['cellCount']
        count += members
        decoded[members] = properties[property_name]
        if members.any():
            if property_name != 'level':
                assert len(polygon.exterior.coords) > 5, 'Sampled region outline must not be a rectangular row strip'
            assert abs(float(depths[members].min())-properties['minDepth']) < .011
            assert abs(float(depths[members].max())-properties['maxDepth']) < .011
        else:
            assert properties['minDepth'] is None and properties['maxDepth'] is None
        polygons.append(polygon)
    assert (count <= 1).all(), 'Region interiors overlap at source grid centres'
    assert np.array_equal(decoded, expected), 'Display regions must retain every source classification and every dry hole'
    tree = STRtree(polygons)
    for i, polygon in enumerate(polygons):
        for j in tree.query(polygon, predicate='intersects'):
            if j > i:
                assert polygon.intersection(polygons[j]).area < 1e-12, 'Depth regions overlap'


# Adjacent depth colours must tile one outline, including three-colour junctions.
test_depth = np.array([[.2,.5,.8,1.,1.4],[.3,.7,1.2,.9,1.6],[.2,.4,.8,1.3,1.8]])
test_labels = np.where(test_depth<=.5,1,np.where(test_depth<=1,2,3))
test_features,_ = depth_regions(test_labels,test_depth,0,0,1,1)
test_outline = unary_union([shape(f['geometry']) for f in test_features])
assert test_outline.geom_type == 'Polygon' and not test_outline.interiors, 'No artificial gaps between depth colours'
test_empty,_ = depth_regions(np.zeros_like(test_labels),test_depth,0,0,1,1)
assert not test_empty, 'No display flood where the model has no wet cells'


scenarios = {s['riseMetres']: s for s in data['scenarios']}
for rise in data['availableStages']:
    scenario = scenarios.get(rise) or json.loads((root/f'public/flood-simulations/thaton-{rise}.json').read_text())
    rise = scenario['riseMetres']
    classes, depths = grid[f'classes{rise:g}'], grid[f'depth{rise:g}']
    wet = classes > 0
    point_depth = np.where((grid['threshold'] < rise) & (grid['water'] == 0),np.maximum(0,np.round(rise-relative,2)),0)
    assert np.allclose(point_depth,np.where(wet,depths,0),atol=.001), 'Clicked-point depth must match precomputed main depths'
    assert not (previous & ~wet).any(), 'A higher river stage must not remove flooded land'
    assert not (wet & (grid['water'] != 0)).any()
    first[wet & (first == 0)] = rise
    assert np.array_equal(wet,(grid['threshold'] < rise) & (grid['water'] == 0))
    assert np.allclose(depths[wet],np.round(grid['reference']+rise-grid['ground'],2)[wet])
    assert (depths[wet] > 0).all()
    assert np.array_equal(classes, np.where(wet,np.where(depths<=.5,1,np.where(depths<=1,2,3)),0))
    check_regions(scenario['features'], 'level', classes, depths)
    x,y,surface = _smooth_samples(np.pad(wet.astype(float),1))
    outline = unary_union(_contours(x,y,surface,.5,1.5))
    outline = affine_transform(outline,[grid_dx,0,0,-grid_dy,origin_west,origin_north])
    displayed = unary_union([shape(f['geometry']) for f in scenario['features']])
    assert displayed.symmetric_difference(outline).area < 1e-10, 'Depth colours must cover their shared outline without seams'
    assert displayed.intersection(display_water).area < 1e-10, 'Existing water must stay distinct from land flood depths'
    check_regions(scenario['impactFeatures'], 'firstRiseMetres', np.where(wet,first,0), depths)
    possible = connected_land(lower_ground,rise)
    point_possible = np.where((grid['possibleThreshold'] < rise) & (grid['water'] == 0),np.maximum(0,np.round(rise-possible_relative,2)),0)
    assert np.allclose(point_possible,np.where(possible,np.round(grid['reference']+rise-lower_ground,2),0),atol=.001)
    assert np.array_equal(possible,grid[f'possible{rise:g}'])
    assert np.array_equal(possible,(grid['possibleThreshold'] < rise) & (grid['water'] == 0))
    assert not (wet & ~possible).any(), 'Sensitivity envelope must include main result'
    assert not (previous_possible & ~possible).any(), 'Sensitivity envelope must not shrink at a higher stage'
    additional = possible & ~wet
    check_regions(scenario['potentialFeatures'],'sensitivity',additional.astype(int),np.round(grid['reference']+rise-lower_ground,2))
    previous_possible = possible
    for value in data['availableStages']:
        geometries = [f['geometry'] for f in scenario['impactFeatures'] if f['properties']['firstRiseMetres']==value]
        if value in previous_impacts:
            assert geometries == previous_impacts[value], 'Previously affected areas must stay in place'
        if geometries:
            previous_impacts[value] = geometries
    cell_areas = 6371008.8**2 * math.radians(dx) * (np.sin(np.radians(latitude+dy/2))-np.sin(np.radians(latitude-dy/2)))
    assert abs(float(cell_areas[additional].sum())-scenario['potentialAreaM2']) <= 1
    for values, expected, reported in [([1,2,3], classes, scenario['areasM2']),(data['availableStages'],np.where(wet,first,0),scenario['impactAreasM2'])]:
        for value, area in zip(values,reported):
            assert abs(float(cell_areas[expected==value].sum())-area) <= 1
    previous = wet
    source_r = np.rint((north-latitude)/dy).astype(int)
    source_c = np.rint((longitude-west)/dx).astype(int)
    cells = set(zip(source_r[wet].tolist(), source_c[wet].tolist()))
    # Existing lakes may connect flooded land to the river, without being
    # published as flooded land themselves. Preserve those water pathways.
    south, west_bound = data['bounds'][0]
    north_bound, east = data['bounds'][1]
    r_start, r_stop = round((north-north_bound)/dy+.5), round((north-south)/dy+.5)
    c_start, c_stop = round((west_bound-west)/dx+.5), round((east-west)/dx+.5)
    lake_rows, lake_cols = np.where(water[r_start:r_stop,c_start:c_stop] == 2)
    traversable = cells | {(int(r)+r_start,int(c)+c_start) for r,c in zip(lake_rows,lake_cols)}
    pending, reached = deque(), set()
    for r,c in traversable:
        if any(water[nr,nc] == 3 for nr,nc in [(r-1,c),(r+1,c),(r,c-1),(r,c+1)]):
            pending.append((r,c))
            reached.add((r,c))
    while pending:
        r,c = pending.popleft()
        for neighbour in [(r-1,c),(r+1,c),(r,c-1),(r,c+1)]:
            if neighbour in traversable and neighbour not in reached:
                reached.add(neighbour)
                pending.append(neighbour)
    assert cells <= reached, 'An isolated patch has no land/water connection to the river'
    print(f"+{scenario['riseMetres']:g} m: main {len(cells)} cells; additional {additional.sum()} cells/{scenario['potentialAreaM2']} m2; geometry, connectivity, area and nesting passed")
assert data['validation']['status'] == 'reference_not_calibrated'
assert data['validation']['earthEngineMatchingSamples'] == 200
