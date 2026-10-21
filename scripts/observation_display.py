"""Display contours only; original satellite rasters, masks and metrics stay unchanged."""
from pathlib import Path
import hashlib
import json
import numpy as np
from rasterio.features import rasterize, shapes
from rasterio.transform import Affine
from shapely.geometry import shape, mapping
from shapely.ops import unary_union
from flood_regions import water_regions


def publish_display(root):
    public = root/'public/flood-observations'
    source = root/'KokData/flood-validation-2024-09'
    grid = np.load(root/'KokData/terrain-thaton/flood-grid-audit.npz')
    west,north,dx,dy = grid['origin']
    transform = Affine(dx,0,west-dx/2,0,-dy,north+dy/2)
    manifest = json.loads((public/'thaton.json').read_text(encoding='utf-8'))
    for item in manifest['dates']:
        date = item['date']
        raw_path = public/f'thaton-{date}.json'
        before = hashlib.sha256(raw_path.read_bytes()).hexdigest()
        raw = json.loads(raw_path.read_text(encoding='utf-8'))
        image = np.load(source/f'S2-{date.replace("-","")}.npy')
        mask = rasterize([(f['geometry'],1) for f in raw['features'] if f['properties']['kind']=='water'],
                         out_shape=image.shape,transform=transform,dtype='uint8') if item['usablePixels'] else np.zeros(image.shape,dtype='uint8')
        clear = np.isin(image['SCL'],[4,5,6])
        clear_area = unary_union([shape(geom) for geom,value in shapes(clear.astype('uint8'),mask=clear,transform=transform)])
        features = [f for f in raw['features'] if f['properties']['kind']=='unobservable']
        for feature in water_regions(mask,west,north,dx,dy):
            # Never draw an interpolated water edge over a cloud/no-data cell.
            clipped = shape(feature['geometry']).intersection(clear_area)
            polygons = [clipped] if clipped.geom_type=='Polygon' else list(getattr(clipped,'geoms',[]))
            for polygon in polygons:
                if polygon.is_empty or polygon.geom_type!='Polygon':
                    continue
                assert polygon.is_valid
                features.append({'type':'Feature','properties':{'kind':'water'},'geometry':mapping(polygon)})
        water_shapes = [(f['geometry'],1) for f in features if f['properties']['kind']=='water']
        recovered = rasterize(water_shapes,out_shape=image.shape,transform=transform,dtype='uint8') if water_shapes else np.zeros_like(mask)
        assert np.array_equal(recovered,mask), 'Display contour must retain every source cell-centre classification'
        assert not (recovered.astype(bool) & ~clear).any()
        assert hashlib.sha256(raw_path.read_bytes()).hexdigest()==before
        output = {'type':'FeatureCollection','displayOnly':True,'method':'Same monotone interpolation as simulation water_regions; clipped to observable cells',
                  'sourceSha256':before,'features':features}
        (public/f'thaton-{date}-display.json').write_text(json.dumps(output,separators=(',',':')),encoding='utf-8')
    print('3 display contours verified: source cells unchanged, cloud cells excluded, original GeoJSON unchanged.')


if __name__=='__main__':
    publish_display(Path(__file__).resolve().parents[1])
