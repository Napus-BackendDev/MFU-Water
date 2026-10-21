"""Approximate region contours from classified terrain; grid totals stay authoritative."""
import math
import numpy as np
from contourpy import contour_generator
from shapely import contains_xy
from shapely.geometry import Polygon
from shapely.ops import unary_union


def water_regions(water, west, north, dx, dy):
    """Existing-water display, aligned with the same interpolation as flood land."""
    x,y,surface = _smooth_samples(np.pad((water!=0).astype(float),1))
    features = []
    for polygon in _contours(x,y,surface,.5,1.5):
        rings = [[[round(west+px*dx,10),round(north-py*dy,10)] for px,py in ring.coords]
                 for ring in [polygon.exterior,*polygon.interiors]]
        features.append({'type':'Feature','properties':{'kind':'existing_water'},
                         'geometry':{'type':'Polygon','coordinates':rings}})
    return features


def _smooth_samples(values, subdivisions=6):
    """Monotone interpolation: retain samples, round transitions without overshoot."""
    h, w = values.shape
    x = np.arange((w-1)*subdivisions+1)/subdivisions
    y = np.arange((h-1)*subdivisions+1)/subdivisions
    cols, rows = np.minimum(x.astype(int),w-2), np.minimum(y.astype(int),h-2)
    tx, ty = x-cols, y-rows
    tx, ty = tx*tx*(3-2*tx), ty*ty*(3-2*ty)
    horizontal = values[:,cols]*(1-tx)+values[:,cols+1]*tx
    return x-1, y-1, horizontal[rows]*(1-ty[:,None])+horizontal[rows+1]*ty[:,None]


def _contours(x, y, field, lower, upper):
    points, offsets = contour_generator(x=x,y=y,z=field,fill_type='OuterOffset',corner_mask=False).filled(lower,upper)
    return [Polygon(coordinates[ends[0]:ends[1]],
                    [coordinates[a:b] for a,b in zip(ends[1:-1],ends[2:])])
            for coordinates,ends in zip(points,offsets)]


def depth_regions(labels, depth, west, north, dx, dy):
    """One continuous depth surface, clipped to a shared smooth wet-land outline."""
    x,y,wet_surface = _smooth_samples(np.pad((labels>0).astype(float),1))
    footprint = unary_union(_contours(x,y,wet_surface,.5,1.5))
    _,_,depth_surface = _smooth_samples(np.pad(depth,1,mode='edge'))
    features,areas = [],[]
    # Source depths are rounded to centimetres. Half-centimetre boundaries keep
    # exact 0.50/1.00 m samples inside their original class, not on a contour.
    limits = [min(float(depth.min())-1,0),.505,1.005,max(float(depth.max())+1,2)]
    for value in [1,2,3]:
        rows,cols = np.where(labels==value)
        cell_areas = 6371008.8**2*math.radians(dx)*(
            np.sin(np.radians(north-(rows-.5)*dy))-np.sin(np.radians(north-(rows+.5)*dy)))
        areas.append(round(float(cell_areas.sum())))
        assigned = np.zeros(len(rows),dtype=int)
        for band in _contours(x,y,depth_surface,limits[value-1],limits[value]):
            clipped = band.intersection(footprint)
            polygons = [clipped] if clipped.geom_type=='Polygon' else list(getattr(clipped,'geoms',[]))
            for polygon in polygons:
                if polygon.geom_type=='Polygon' and not polygon.is_empty:
                    _append(features,polygon,rows,cols,depth,assigned,'level',value,west,north,dx,dy,keep_empty=True)
        assert (assigned==1).all(), 'Shared depth boundaries must preserve source classes'
    return features,areas


def regions(labels, depth, values, property_name, west, north, dx, dy):
    h, w = labels.shape
    features, areas = [], []
    for value in values:
        mask = labels == value
        rows, cols = np.where(mask)
        cell_areas = 6371008.8**2 * math.radians(dx) * (
            np.sin(np.radians(north-(rows-.5)*dy)) - np.sin(np.radians(north-(rows+.5)*dy)))
        areas.append(round(float(cell_areas.sum())))
        if not mask.any():
            continue
        points, offsets = contour_generator(
            x=np.arange(-1, w+1), y=np.arange(-1, h+1),
            z=np.pad(mask.astype(float), 1), fill_type='OuterOffset',
            corner_mask=False).filled(.5, 1.5)
        assigned = np.zeros(len(rows), dtype=int)
        for coordinates, ends in zip(points, offsets):
            rings = [coordinates[a:b] for a,b in zip(ends[:-1], ends[1:])]
            raw = Polygon(rings[0], rings[1:]).simplify(0, preserve_topology=True)
            # Round corners inward only (~3.6 m radius); never grow a flood area.
            rounded = raw.buffer(-.12, quad_segs=2).buffer(.12, quad_segs=2).intersection(raw)
            polygons = [rounded] if rounded.geom_type == 'Polygon' else list(rounded.geoms)
            for polygon in polygons:
                _append(features, polygon, rows, cols, depth, assigned, property_name, value, west, north, dx, dy)
        assert (assigned == 1).all(), 'Every classified grid centre must belong to exactly one region'
    return features, areas


def _append(features, polygon, rows, cols, depth, assigned, property_name, value, west, north, dx, dy, keep_empty=False):
    assert polygon.is_valid and not polygon.is_empty
    members = contains_xy(polygon, cols, rows)
    if not members.any() and not keep_empty:
        return
    assigned += members
    geographic = []
    for ring in [polygon.exterior, *polygon.interiors]:
        geographic.append([[round(west+x*dx,10),round(north-y*dy,10)] for x,y in ring.coords])
    values_depth = depth[rows[members], cols[members]]
    features.append({'type':'Feature','properties':{
        property_name:float(value),'minDepth':round(float(values_depth.min()),2) if members.any() else None,
        'maxDepth':round(float(values_depth.max()),2) if members.any() else None,'cellCount':int(members.sum())},
        'geometry':{'type':'Polygon','coordinates':geographic}})
