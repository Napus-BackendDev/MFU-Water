"""Fetch only the Thaton window of the public GEDTM30 COG and align to our grid."""
from pathlib import Path
import hashlib
import json
import math
import numpy as np
from PIL import Image
import rasterio
from rasterio.transform import from_origin
from rasterio.windows import from_bounds, Window
from rasterio.warp import reproject, Resampling

root = Path(__file__).resolve().parents[1]
folder = root/'KokData/terrain-thaton'
url = 'https://s3.opengeohub.org/global/edtm/gedtm_rf_m_30m_s_20060101_20151231_go_epsg.4326.3855_v20250611.tif'
image = Image.open(folder/'copernicus-glo30-N20E099.tif')
dx, dy = image.tag_v2[33550][:2]
west, north = image.tag_v2[33922][3:5]
r0, r1 = math.floor((north-20.08)/dy), math.ceil((north-20.04)/dy)
c0, c1 = math.floor((99.345-west)/dx), math.ceil((99.385-west)/dx)
transform = from_origin(west+(c0-.5)*dx,north-(r0-.5)*dy,dx,dy)
bounds = rasterio.transform.array_bounds(r1-r0,c1-c0,transform)
with rasterio.Env(GDAL_DISABLE_READDIR_ON_OPEN='EMPTY_DIR',CPL_VSIL_CURL_ALLOWED_EXTENSIONS='.tif',
                  GDAL_HTTP_TIMEOUT='45',GDAL_HTTP_MAX_RETRY='1'):
    with rasterio.open('/vsicurl/'+url) as src:
        assert src.tags().get('VERTICAL_DATUM') == 'EGM2008/EPSG:3855'
        window = from_bounds(bounds[0]-.001,bounds[1]-.001,bounds[2]+.001,bounds[3]+.001,src.transform)
        window = Window(math.floor(window.col_off),math.floor(window.row_off),math.ceil(window.width)+1,math.ceil(window.height)+1)
        raw = src.read(1,window=window)
        terrain = raw.astype(np.float32)*src.scales[0]+src.offsets[0]
        terrain[raw == src.nodata] = -9999
        native_transform = src.window_transform(window)
        metadata = {'sourceUrl':url,'dataset':'GEDTM30 v1.1 (2025-06-11)',
                    'sourceDoi':'https://doi.org/10.5281/zenodo.15689805',
                    'paperUrl':'https://doi.org/10.7717/peerj.19673',
                    'license':'CC BY 4.0','verticalDatum':src.tags()['VERTICAL_DATUM'],
                    'sourceScale':src.scales[0],'sourceOffset':src.offsets[0],
                    'nativeTransform':list(native_transform)[:6],
                    'nativeWindow':[window.col_off,window.row_off,window.width,window.height],
                    'originalShape':list(src.shape),'acquiredAt':'2026-10-20',
                    'resampling':'bilinear, to original Copernicus sample centres; no vertical datum change',
                    'credit':'GEDTM30: Ho et al. (2025), PeerJ 13:e19673, doi:10.7717/peerj.19673. CC BY 4.0. Adapted, clipped and resampled for Thaton. Includes adapted Copernicus WorldDEM-30 and JAXA ALOS World 3D inputs.',
                    'limitations':'Model-estimated bare earth, approximately 30 m, not a surveyed urban DTM. No measured local starting river level or flood calibration.'}

native_path = folder/'gedtm30-thaton-native.tif'
with rasterio.open(native_path,'w',driver='GTiff',height=terrain.shape[0],width=terrain.shape[1],count=1,
                   dtype='float32',crs='EPSG:4326',transform=native_transform,nodata=-9999,compress='deflate') as dst:
    dst.write(terrain,1)
    dst.update_tags(VERTICAL_DATUM=metadata['verticalDatum'],SOURCE=url,UNITS='metres')
aligned = np.full((r1-r0,c1-c0),-9999,dtype=np.float32)
reproject(terrain,aligned,src_transform=native_transform,src_crs='EPSG:4326',src_nodata=-9999,
          dst_transform=transform,dst_crs='EPSG:4326',dst_nodata=-9999,resampling=Resampling.bilinear)
assert np.isfinite(aligned).all() and (aligned > 0).all()
aligned_path = folder/'gedtm30-thaton-aligned.tif'
with rasterio.open(aligned_path,'w',driver='GTiff',height=aligned.shape[0],width=aligned.shape[1],count=1,
                   dtype='float32',crs='EPSG:4326',transform=transform,nodata=-9999,compress='deflate') as dst:
    dst.write(aligned,1)
    dst.update_tags(VERTICAL_DATUM=metadata['verticalDatum'],SOURCE=url,UNITS='metres')
metadata['nativeSha256'] = hashlib.sha256(native_path.read_bytes()).hexdigest()
metadata['alignedSha256'] = hashlib.sha256(aligned_path.read_bytes()).hexdigest()
metadata['alignedTransform'] = list(transform)[:6]
metadata['alignedShape'] = list(aligned.shape)
(folder/'gedtm30-provenance.json').write_text(json.dumps(metadata,ensure_ascii=False,indent=2)+'\n',encoding='utf-8')
print(json.dumps({'alignedShape':list(aligned.shape),'metresRange':[float(aligned.min()),float(aligned.max())],
                  'localBytes':native_path.stat().st_size+aligned_path.stat().st_size}))
