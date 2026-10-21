"""Independent 15 September review at 10 m output spacing; no model fitting."""
from pathlib import Path
import json
import hashlib
import numpy as np
import matplotlib
matplotlib.use('Agg')
import matplotlib.pyplot as plt
from matplotlib.patches import Patch
from rasterio.transform import Affine
from rasterio.features import rasterize
from rasterio.warp import transform

ROOT = Path(__file__).resolve().parents[1]
SOURCE = ROOT/'KokData/flood-validation-2024-09'
OUT = SOURCE/'review-15'
OUT.mkdir(exist_ok=True)
TRANSFORM = Affine(10,0,536020,0,-10,2220400)


def review():
    image = np.load(SOURCE/'S2-20240915-utm10.npy')
    assert image.shape==(448,426)
    rows,cols = np.indices(image.shape)
    lon,lat = transform('EPSG:32647','EPSG:4326',
                        (536025+10*cols).ravel(),(2220395-10*rows).ravel())
    assert np.allclose(image['longitude'].ravel(),lon,atol=1e-9,rtol=0)
    assert np.allclose(image['latitude'].ravel(),lat,atol=1e-9,rtol=0)
    aoi = ((image['longitude']>=99.34458333333333)&(image['longitude']<=99.38513888888889)&
           (image['latitude']>=20.03986111111111)&(image['latitude']<=20.08013888888889))
    clear = np.isin(image['SCL'],[4,5,6]) & aoi
    ratio = lambda a,b: np.divide(a-b,a+b,out=np.zeros_like(a),where=(a+b)!=0)
    mndwi = ratio(image['B3'],image['B11'])
    ndvi = ratio(image['B8'],image['B4'])
    awei = 4*(image['B3']-image['B11'])-(.25*image['B8']+2.75*image['B12'])
    water = clear & (mndwi>0) & (ndvi<.3)
    # A second spectral check is diagnostic, not tuned against the model.
    supported = water & (awei>0)
    disputed = water & ~supported
    from rasterio.warp import transform_geom
    original = json.loads((ROOT/'public/flood-observations/thaton-2024-09-15.json').read_text())
    old = rasterize([(transform_geom('EPSG:4326','EPSG:32647',f['geometry']),1)
                     for f in original['features'] if f['properties']['kind']=='water'],
                    out_shape=image.shape,transform=TRANSFORM,dtype='uint8').astype(bool)
    rgb = np.clip(np.stack([image[b] for b in ['B4','B3','B2']],axis=-1)/3000,0,1)**(1/1.2)
    extent = [536020,540280,2215920,2220400]
    fig,axes = plt.subplots(2,2,figsize=(14,14),constrained_layout=True)
    masks = [None,old,water,disputed]
    titles = ['Actual RGB, 15 Sep 2024 | 10 m RGB bands','Previous 30 m water mask projected to this grid',
              'Same index rule, 10 m grid | no manual expansion','Index disagreement: MNDWI water but AWEI <= 0']
    for ax,mask,title in zip(axes.flat,masks,titles):
        ax.imshow(rgb,extent=extent)
        if mask is not None:
            overlay = np.zeros((*mask.shape,4)); overlay[mask]=[.64,.1,.69,.55]
            ax.imshow(overlay,extent=extent)
        ax.set_title(title,fontsize=11)
        ax.set_xlim(536700,539300);ax.set_ylim(2217200,2219600)
        ax.ticklabel_format(useOffset=False,style='plain')
    fig.savefig(OUT/'village-review.png',dpi=150);plt.close(fig)
    stats = {'sourceScene':'20240915T034529_20240915T035607_T47QNC',
             'sourceSha256':hashlib.sha256((SOURCE/'S2-20240915-utm10.npy').read_bytes()).hexdigest(),
             'grid':'EPSG:32647 10 m output; SWIR/SCL native 20 m; bilinear reflectance, nearest SCL',
             'transform':list(TRANSFORM)[:6],'shape':list(image.shape),'aoiKm2':float(aoi.sum()/10000),
             'usableFraction':float(clear.sum()/aoi.sum()),'waterKm2':float(water.sum()/10000),
             'aweiSupportedKm2':float(supported.sum()/10000),'indexDisagreementKm2':float(disputed.sum()/10000),
             'oldMaskAreaOnNewGridKm2':float((old & aoi).sum()/10000),
             'gainedKm2':float((water & ~old).sum()/10000),'lostKm2':float((old & clear & ~water).sum()/10000),
             'method':'Same MNDWI > 0 and NDVI < 0.3 rule, finer spatial sampling; AWEI diagnostic only',
             'limitations':['Not ground-truth accuracy validation.','RGB 10 m, SWIR/SCL 20 m, no measured flood depth.',
                            'Do not reuse original coarse-grid model IoU as a score for this revision.']}
    (OUT/'review.json').write_text(json.dumps(stats,indent=2),encoding='utf-8')
    np.savez_compressed(OUT/'classification.npz',water=water,clear=clear,aoi=aoi,supported=supported,disputed=disputed)
    print(json.dumps(stats))
    return image,water,clear,aoi,stats


def publish_review():
    from rasterio.features import shapes
    from rasterio.warp import transform_geom, reproject, Resampling
    from shapely.geometry import shape, mapping, box
    from shapely.ops import unary_union
    from flood_regions import water_regions
    from PIL import Image
    image,water,clear,aoi,stats = review()
    diagnostic = np.load(OUT/'classification.npz')
    supported,disputed = diagnostic['supported'],diagnostic['disputed']
    public = ROOT/'public/flood-observations'
    # Preserve the coarse-grid evidence and comparison; publish a separate revision.
    features = []
    classes = np.where(~aoi,0,np.where(~clear,2,np.where(supported,1,np.where(disputed,3,0)))).astype('uint8')
    for geom,value in shapes(classes,mask=classes>0,transform=TRANSFORM):
        properties = {'kind':'unobservable'} if value==2 else {'kind':'water','confidence':'supported' if value==1 else 'uncertain'}
        features.append({'type':'Feature','properties':properties,
                         'geometry':transform_geom('EPSG:32647','EPSG:4326',geom)})
    raw = {'type':'FeatureCollection','features':features}
    raw_path = public/'thaton-2024-09-15-review.json'
    raw_path.write_text(json.dumps(raw,separators=(',',':')),encoding='utf-8')
    observable = unary_union([shape(geom) for geom,value in shapes(clear.astype('uint8'),mask=clear,transform=TRANSFORM)])
    display = [f for f in features if f['properties']['kind']=='unobservable']
    for confidence,mask in [('uncertain',disputed),('supported',supported)]:
        for feature in water_regions(mask,536025,2220395,10,10):
            clipped = shape(feature['geometry']).intersection(observable)
            polygons = [clipped] if clipped.geom_type=='Polygon' else list(getattr(clipped,'geoms',[]))
            for polygon in polygons:
                if polygon.geom_type=='Polygon' and not polygon.is_empty:
                    assert polygon.is_valid
                    display.append({'type':'Feature','properties':{'kind':'water','confidence':confidence},
                                    'geometry':transform_geom('EPSG:32647','EPSG:4326',mapping(polygon))})
    recovered = rasterize([(transform_geom('EPSG:4326','EPSG:32647',f['geometry']),1) for f in display if f['properties']['kind']=='water'],
                          out_shape=water.shape,transform=TRANSFORM,dtype='uint8')
    assert np.array_equal(recovered.astype(bool),water)
    assert not (recovered.astype(bool) & ~clear).any()
    for confidence,expected in [('supported',supported),('uncertain',disputed)]:
        restored = rasterize([(transform_geom('EPSG:4326','EPSG:32647',f['geometry']),1)
                              for f in display if f['properties'].get('confidence')==confidence],
                             out_shape=water.shape,transform=TRANSFORM,dtype='uint8')
        assert np.array_equal(restored.astype(bool),expected)
    # A georeferenced RGB image from the SAME acquisition, not a current basemap.
    bounds = [[20.03986111111111,99.34458333333333],[20.08013888888889,99.38513888888889]]
    [[south,west],[north,east]] = bounds
    height,width = 448,426
    target_transform = Affine((east-west)/width,0,west,0,-(north-south)/height,north)
    rgb = np.clip(np.stack([image[b] for b in ['B4','B3','B2']],axis=0)/3000,0,1)**(1/1.2)
    rgba = np.zeros((4,height,width),dtype='uint8')
    for band in range(3):
        reproject((rgb[band]*255).astype('uint8'),rgba[band],src_transform=TRANSFORM,src_crs='EPSG:32647',
                  dst_transform=target_transform,dst_crs='EPSG:4326',resampling=Resampling.bilinear)
    rgba[3]=255
    Image.fromarray(np.moveaxis(rgba,0,-1)).save(public/'thaton-2024-09-15-rgb.png')
    result = {'type':'FeatureCollection','displayOnly':True,'sourceFile':raw_path.name,
              'sourceSha256':hashlib.sha256(raw_path.read_bytes()).hexdigest(),
              'rasterSourceSha256':stats['sourceSha256'],'method':stats['method'],
              'imageUrl':'/flood-observations/thaton-2024-09-15-rgb.png','imageBounds':bounds,
              'features':display}
    (public/'thaton-2024-09-15-review-display.json').write_text(json.dumps(result,separators=(',',':')),encoding='utf-8')
    manifest_path = public/'thaton.json'
    manifest = json.loads(manifest_path.read_text(encoding='utf-8'))
    for item in manifest['dates']:
        if item['date']=='2024-09-15':
            item.update(usableFraction=stats['usableFraction'],usablePixels=int(clear.sum()),waterAreaKm2=stats['waterKm2'],
                        file='/flood-observations/thaton-2024-09-15-review.json',revision='native-grid-review-2',
                        gridSpacingMetres=10,swirNativeMetres=20)
            # A coarse-grid WBM statistic cannot be silently reused for this grid.
            item.pop('waterOutsideOriginalMaskKm2',None)
    manifest_path.write_text(json.dumps(manifest,ensure_ascii=False,separators=(',',':')),encoding='utf-8')
    (OUT/'README.md').write_text('''# ตรวจภาพ 15 กันยายน 2024 รอบ 2

ภาพ Sentinel-2 scene เดิม ส่งออก RGB/NIR ลงกริด UTM47N 10 เมตร (448×426) โดย SWIR/SCL ต้นทาง 20 เมตร Reflectance ใช้ bilinear ส่วน SCL ใช้ nearest จึงไม่ได้มีรายละเอียดสเปกตรัม 10 เมตรทุก band

ใช้กฎเดิม MNDWI>0 และ NDVI<0.3 โดยไม่ปรับให้เข้ากับแบบจำลอง ตรวจพบน้ำรวม 1.3925 ตร.กม. เทียบเดิม 1.3999 ตร.กม. บนกริดหยาบ รายละเอียดตำแหน่งต่างกัน: พบน้ำเพิ่มจากหน้ากากเดิมประมาณ 0.1635 ตร.กม. และตัดพื้นที่เดิมที่เห็นชัดแต่ไม่ผ่านกฎใหม่ประมาณ 0.1668 ตร.กม. ไม่ใช่การเปลี่ยนของน้ำตามเวลา แต่เป็นการเปลี่ยนวิธี sampling ของวันเดียวกัน

ตรวจประกอบด้วย AWEI_nsh>0 พบว่าพื้นที่ที่สองเกณฑ์เห็นสอดคล้องกัน 1.0159 ตร.กม. อีก 0.3766 ตร.กม. ยังเป็นบริเวณที่เกณฑ์ไม่ตรงกัน โดยเฉพาะขอบน้ำ/ดินเปียก จึงไม่ใช้ภาพนี้รับรองขอบเขตจริงรายจุด และไม่อ้างว่าค่า IoU ของรายงานกริดเดิมเป็นคะแนนของ revision นี้

village-review.png แสดงภาพจริง หน้ากากเดิม หน้ากากรอบใหม่ และบริเวณที่ดัชนีไม่ตรงกัน ตัวเลขพร้อม source hash อยู่ใน review.json กริด/หน้ากากเดิมและรายงานเปรียบเทียบแบบจำลองเดิมคงไว้ ไม่เปลี่ยนภูมิประเทศ/ระดับน้ำจำลอง

เว็บใช้ไฟล์ *-review-display.json และเปิดภาพต้นฉบับวันที่เดียวกันใต้พื้นที่สีม่วงได้ PNG เป็นภาพ RGB ที่ปรับความสว่างสำหรับดู ไม่ใช่ผลจำแนกน้ำ ขอบโค้งเป็น interpolation เพื่อแสดงผล ตรวจ rasterize กลับแล้วศูนย์กลางเซลล์ตรงหน้ากากรอบใหม่ทุกเซลล์ ไม่ระบายผ่านเมฆ ข้อมูลนี้ยังไม่ผ่านการยืนยันภาคสนาม

สร้างซ้ำ: รัน scripts/thaton-september15-native-export.js ใน Earth Engine ดาวน์โหลด S2-20240915-utm10.npy แล้วรัน scripts/review_september15.py ด้วย runtime วิเคราะห์เดิม ไม่มี credential ในเว็บ
''',encoding='utf-8')
    print('Published separate revision 2; contour cell-centres and cloud exclusion verified.')


if __name__=='__main__':
    publish_review()
