"""Clip the matching GEDTM30 predictive-tree standard deviation, in metres."""
from pathlib import Path
import hashlib
import json
import math
import numpy as np
import rasterio
from rasterio.windows import from_bounds, Window
from rasterio.warp import reproject, Resampling

folder = Path(__file__).resolve().parents[1]/'KokData/terrain-thaton'
url = 'https://s3.opengeohub.org/global/edtm/gedtm_rf_std_30m_s_20060101_20151231_go_epsg.4326.3855_v20250611.tif'
with rasterio.open(folder/'gedtm30-thaton-aligned.tif') as target:
    transform, bounds, shape = target.transform, target.bounds, target.shape
with rasterio.Env(GDAL_DISABLE_READDIR_ON_OPEN='EMPTY_DIR', CPL_VSIL_CURL_ALLOWED_EXTENSIONS='.tif', GDAL_HTTP_TIMEOUT='45', GDAL_HTTP_MAX_RETRY='1'):
    with rasterio.open('/vsicurl/'+url) as src:
        assert src.tags()['VERTICAL_DATUM'] == 'EGM2008/EPSG:3855'
        window = from_bounds(bounds.left-.001,bounds.bottom-.001,bounds.right+.001,bounds.top+.001,src.transform)
        window = Window(math.floor(window.col_off),math.floor(window.row_off),math.ceil(window.width)+1,math.ceil(window.height)+1)
        raw = src.read(1,window=window)
        values = raw.astype(np.float32)*src.scales[0]+src.offsets[0]
        values[raw == src.nodata] = -9999
        native_transform = src.window_transform(window)
        metadata = {'sourceUrl':url,'sourceDoi':'https://doi.org/10.5281/zenodo.15689805',
                    'paperUrl':'https://doi.org/10.7717/peerj.19673','license':'CC BY 4.0',
                    'dataset':'GEDTM30 v1.1 predictive-tree standard deviation',
                    'sourceScale':src.scales[0],'sourceOffset':src.offsets[0],
                    'sourceNoData':src.nodata,'acquiredAt':'2026-10-20',
                    'nativeTransform':list(native_transform)[:6],
                    'alignedTransform':list(transform)[:6],
                    'resampling':'bilinear to the existing terrain sample centres; descriptive model spread, not independent error propagation',
                    'method':'Sensitivity only: subtract one predictive-tree SD from land elevations; keep the original water reference and water-body elevations fixed.',
                    'limitations':'Tree disagreement is not a calibrated vertical-error interval or flood probability. Water-reference error and hydraulic uncertainty are not quantified. Simultaneous terrain lowering is a hypothetical sensitivity case, not a sampled joint realization.'}
aligned = np.full(shape,-9999,dtype=np.float32)
reproject(values,aligned,src_transform=native_transform,src_crs='EPSG:4326',src_nodata=-9999,
          dst_transform=transform,dst_crs='EPSG:4326',dst_nodata=-9999,resampling=Resampling.bilinear)
assert np.isfinite(aligned).all() and (aligned >= 0).all()
path = folder/'gedtm30-spread-aligned.tif'
with rasterio.open(path,'w',driver='GTiff',height=shape[0],width=shape[1],count=1,dtype='float32',
                   crs='EPSG:4326',transform=transform,nodata=-9999,compress='deflate') as dst:
    dst.write(aligned,1)
    dst.update_tags(UNITS='metres',SOURCE=url,MEANING='predictive-tree standard deviation, not calibrated error')
metadata['sha256'] = hashlib.sha256(path.read_bytes()).hexdigest()
metadata['rangeMetres'] = [float(aligned.min()),float(aligned.max())]
(folder/'gedtm30-spread-provenance.json').write_text(json.dumps(metadata,ensure_ascii=False,indent=2)+'\n',encoding='utf-8')
print(json.dumps({'bytes':path.stat().st_size,'rangeMetres':metadata['rangeMetres']}))
