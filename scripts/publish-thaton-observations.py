"""Export public satellite interpretation only; never change simulation inputs."""
from pathlib import Path
import hashlib
import json
import math
import numpy as np
from rasterio.features import shapes
from rasterio.transform import Affine
import importlib.util
from observation_display import publish_display

ROOT = Path(__file__).resolve().parents[1]
OUT = ROOT/'KokData/flood-validation-2024-09'
PUBLIC = ROOT/'public/flood-observations'
spec = importlib.util.spec_from_file_location('analysis', ROOT/'scripts/analyse-thaton-september-2024.py')
analysis = importlib.util.module_from_spec(spec)
spec.loader.exec_module(analysis)
summary = json.loads((OUT/'analysis.json').read_text(encoding='utf-8'))
grid = np.load(analysis.MODEL)
west,north,dx,dy = grid['origin']
transform = Affine(dx,0,west-dx/2,0,-dy,north+dy/2)
PUBLIC.mkdir(exist_ok=True)
manifest = {'source':'COPERNICUS/S2_SR_HARMONIZED','method':'SCL 4/5/6; MNDWI > 0; NDVI < 0.3; original model grid ~30 m',
            'interpretation':'Detected surface water, including existing river; not measured flood depth or verified flood boundary.',
            'bounds':[[north-(grid['water'].shape[0]-.5)*dy,west-dx/2],[north+dy/2,west+(grid['water'].shape[1]-.5)*dx]],'dates':[]}
for item in summary['dates']:
    date = item['date']
    image = np.load(OUT/f'S2-{date.replace("-","")}.npy')
    clear,water = analysis.optical(image)
    # Exact source-grid topology: no filling cloud gaps or inventing water cells.
    classes = np.where(~clear,2,np.where(water,1,0)).astype('uint8')
    features = [{'type':'Feature','properties':{'kind':'water' if value==1 else 'unobservable'},'geometry':geometry}
                for geometry,value in shapes(classes,mask=classes>0,transform=transform,connectivity=4)]
    data = {'type':'FeatureCollection','features':features}
    (PUBLIC/f'thaton-{date}.json').write_text(json.dumps(data,separators=(',',':')),encoding='utf-8')
    manifest['dates'].append({**item,'capturedBangkok':f'{date}T11:02:{"45" if date.endswith("05") else "41"}+07:00',
                              'file':f'/flood-observations/thaton-{date}.json'})
(PUBLIC/'thaton.json').write_text(json.dumps(manifest,ensure_ascii=False,separators=(',',':')),encoding='utf-8')
publish_display(ROOT)

# Independently sum individual weighted cells (not the implementation's masked NumPy reduction).
audit = np.load(OUT/'comparison-audit.npz')
for metric in summary['metrics']:
    stage = metric['riseMetres']
    predicted = audit[f'model{stage:g}']
    observed,valid,areas = audit['observedNew'],audit['domain'],audit['areasM2']
    intersection = math.fsum(float(area) for area,yes in zip(areas.flat,(valid & observed & predicted).flat) if yes)
    union = math.fsum(float(area) for area,yes in zip(areas.flat,(valid & (observed | predicted)).flat) if yes)
    assert math.isclose(intersection/union,metric['iou'],abs_tol=1e-12)
assert not np.any(audit['model2.5'] & ~audit['model5'])
assert not np.any(audit['model5'] & ~audit['model7.5'])
assert summary['dates'][1]['waterAreaKm2'] is None
assert hashlib.sha256(analysis.MODEL.read_bytes()).hexdigest()==summary['modelAuditSha256']
# Geometry must rasterize back to exactly the classified source cells.
from rasterio.features import rasterize
for item in manifest['dates']:
    data = json.loads((PUBLIC/Path(item['file']).name).read_text(encoding='utf-8'))
    reconstructed = rasterize([(f['geometry'],1 if f['properties']['kind']=='water' else 2) for f in data['features']],
                              out_shape=grid['water'].shape,transform=transform,dtype='uint8')
    clear,water = analysis.optical(np.load(OUT/f'S2-{item["date"].replace("-","")}.npy'))
    assert np.array_equal(reconstructed,np.where(~clear,2,np.where(water,1,0)))


rows = ''.join(f'<tr><td>Level {i+1} (+{m["riseMetres"]:g} ม.)</td><td>{m["overlapKm2"]:.3f}</td><td>{m["modelOnlyKm2"]:.3f}</td><td>{m["satelliteOnlyKm2"]:.3f}</td><td>{m["iou"]:.1%}</td></tr>' for i,m in enumerate(summary['metrics']))
dates = ''.join(f'<tr><td>{d["date"]}</td><td>{d["usableFraction"]:.1%}</td><td>{"ประเมินไม่ได้ — เมฆบังทั้งหมด" if d["waterAreaKm2"] is None else format(d["waterAreaKm2"],".3f")+" ตร.กม."}</td></tr>' for d in summary['dates'])
html = f'''<!doctype html><html lang="th"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>ท่าตอน: ภาพดาวเทียมเทียบแบบจำลองน้ำท่วม กันยายน 2024</title>
<style>body{{font:16px/1.8 system-ui,sans-serif;color:#172333;background:#f5f7f9;margin:0}}main{{max-width:1060px;margin:auto;padding:32px 20px;background:white}}h1{{font-size:28px;line-height:1.4}}h2{{margin-top:36px;font-size:21px}}img{{width:100%;height:auto}}table{{border-collapse:collapse;width:100%;font-size:14px}}td,th{{border-bottom:1px solid #cbd5e1;padding:10px;text-align:left}}.table{{overflow:auto}}a{{color:#075985}}p,li{{max-width:80ch}}figure{{margin:24px 0}}figcaption{{color:#475569;font-size:14px}}</style><main>
<h1>ภาพดาวเทียมท่าตอน เทียบแบบจำลองน้ำท่วม</h1><p>วันที่เป้าหมาย 5 / 10 / 15 กันยายน 2024 · วิเคราะห์ 21 ตุลาคม 2026</p>
<p><strong>ผล: แบบจำลองยังไม่ผ่านการยืนยันความแม่นยำ</strong> Level 1 พลาดพื้นที่น้ำที่ตรวจพบหลายส่วน ส่วน Level 2–3 ครอบคลุมมากขึ้นแต่มีพื้นที่จำลองเกินผลตรวจจากดาวเทียมมาก วันที่ 10 กันยายนเมฆบังทั้งหมด จึงประเมินน้ำจากภาพวันนั้นไม่ได้</p>
<h2>ภาพจริงในแต่ละวัน</h2><div class="table"><table><tr><th>วันที่ (ไทย)</th><th>พื้นที่ที่ประเมินได้</th><th>พื้นที่น้ำตรวจพบรวมแม่น้ำเดิม</th></tr>{dates}</table></div>
<figure><img src="observations.png" alt="ภาพสีจริง Sentinel-2 วันที่ 5 10 และ 15 กันยายน 2024"><figcaption>Sentinel-2 ถ่ายประมาณ 11:02 น. เวลาไทย ภาพวันที่ 10 เป็นเมฆ ไม่ใช่หลักฐานว่าไม่มีน้ำท่วม ภาพวันที่ 15 ตรวจพบพื้นที่น้ำกว้างกว่าวันที่ 5</figcaption></figure>
<h2>เทียบพื้นที่น้ำเพิ่มวันที่ 15 กับวันที่ 5</h2><p>ใช้เฉพาะพื้นดินที่ภาพทั้งสองวันประเมินได้ ตัดแหล่งน้ำเดิมและน้ำที่ตรวจพบตั้งแต่วันที่ 5 ออกจากตัวส่วน พื้นที่เปรียบเทียบ 15.928 ตร.กม. ตรวจพบน้ำเพิ่มประมาณ <strong>0.614 ตร.กม.</strong> วันที่ 5 เป็นวันอ้างอิง ยังไม่ได้ยืนยันว่าเป็นวันก่อนน้ำท่วม</p>
<div class="table"><table><tr><th>สถานการณ์</th><th>ตรงกัน (ตร.กม.)</th><th>เฉพาะแบบจำลอง</th><th>เฉพาะดาวเทียม</th><th>IoU</th></tr>{rows}</table></div>
<p>IoU = พื้นที่ซ้อนทับ / พื้นที่รวมของสองขอบเขต เป็นคะแนนความสอดคล้องกับผลจำแนกน้ำชุดนี้ <strong>ไม่ใช่เปอร์เซ็นต์ความแม่นยำหรือโอกาสน้ำท่วม</strong> ยังไม่มีระดับน้ำวัดจริงที่เชื่อมวันภาพกับสถานการณ์ +2.5 / +5 / +7.5 ม.</p>
<figure><img src="comparison.png" alt="แผนที่เทียบแบบจำลองสามระดับกับน้ำที่ตรวจเพิ่ม และข้อมูลเรดาร์ประกอบ"><figcaption>ม่วง: ทั้งสองชุดตรงกัน · ฟ้า: ดาวเทียมเท่านั้น · ส้ม: แบบจำลองเท่านั้น · เทา: ไม่รวมในการเปรียบเทียบ แผงล่างขวาสีแดงเป็นการเปลี่ยนแปลงจากเรดาร์ 4 → 16 ก.ย. เวลาไทย ซึ่งเป็นคนละวันกับภาพสีจริง</figcaption></figure>
<h2>วิธีและความไม่แน่นอน</h2><ul><li>ข้อมูล COPERNICUS/S2_SR_HARMONIZED: SCL 4/5/6, MNDWI &gt; 0 และ NDVI &lt; 0.3 ใช้กริดเดียวกับแบบจำลอง 145 × 146 เซลล์ ประมาณ 30 ม.</li>
<li>ทดสอบ MNDWI −0.05 / 0 / +0.05 ได้พื้นที่น้ำเพิ่ม 0.563–0.672 ตร.กม. ลำดับ IoU ทั้งสามสถานการณ์คงเดิม แต่ยังไม่ใช่การสอบเทียบกับภาคสนาม</li>
<li>เมฆ เงา และข้อมูลขาดถูกตัดออก ไม่แทนด้วยพื้นที่แห้ง ภาพแสงตรวจน้ำใต้ต้นไม้หรืออาคารได้จำกัด และไม่ได้วัดความลึก</li>
<li>Sentinel-1 วงโคจร 135 ขาลง วันที่ 4 และ 16 ก.ย. เวลาไทย ใช้ VV หลังเหตุ &lt; −17 dB และลดลง &gt; 3 dB หลัง median radius 20 ม. พบพื้นที่เปลี่ยนแปลงที่อาจเป็นน้ำ 0.277 ตร.กม. ซ้อนกับผลแสง 0.180 ตร.กม. เป็นหลักฐานประกอบคนละวัน ไม่แทนวันที่ 10</li>
<li>วันที่เรดาร์ใน UTC คือ 3 และ 15 ก.ย. เวลาประมาณ 23:16 น. ซึ่งตรงกับวันที่ 4 และ 16 ในไทย</li>
<li>แบบจำลองใช้ GEDTM30 กับระดับอ้างอิงแม่น้ำจาก DSM ยังไม่มีข้อมูลสถานีระดับน้ำหรือท้องน้ำสำรวจรองรับการแปลงเป็นเหตุการณ์นี้</li></ul>
<h2>ใช้ในระบบ</h2><p>โหมด “ข้อมูลจริง” แสดงพื้นที่น้ำที่จำแนกจากภาพจริงเป็นสีม่วง รวมแม่น้ำเดิม สีเทาคือประเมินไม่ได้ ไม่ใช้สีความลึกของแบบจำลอง และไม่ปรับพารามิเตอร์ให้ตรงภาพโดยไม่มีหลักฐาน</p>
<h2>สิ่งที่ควรทำต่อ</h2><p>เทียบระดับน้ำสถานีที่มี datum เดียวกันกับภูมิประเทศ ตรวจขอบเขตน้ำด้วยภาพหรือสำรวจอิสระ และใช้ DTM ละเอียดบริเวณชุมชน ก่อนสรุประดับน้ำหรือพื้นที่รายชุมชน ไม่มีการรับรองรายบ้านจากชุดนี้</p>
<h2>ตรวจสอบและสร้างซ้ำ</h2><p><a href="analysis.json">ผลวิเคราะห์และ SHA-256</a> · <a href="comparison.csv">ตารางเปรียบเทียบหลัก</a> · <a href="date-comparisons.csv">เปรียบเทียบแยกรายวัน</a> · <a href="threshold-sensitivity.csv">ความไวของเกณฑ์จำแนก</a> · <a href="scenes.csv">รายการภาพและเวลาถ่าย</a> · <a href="README.md">วิธีสร้างซ้ำ</a></p>
<p>ตารางรายวันใช้หน้ากากน้ำทั้งหมดนอกแหล่งน้ำเดิม ส่วนตารางหลักใช้เฉพาะน้ำเพิ่มจากวันที่ 5 จึงมีตัวส่วนและ IoU ต่างกัน ไม่ควรใช้สลับกัน</p>
<p>แหล่งข้อมูล: <a href="https://developers.google.com/earth-engine/datasets/catalog/COPERNICUS_S2_SR_HARMONIZED">Sentinel-2 SR Harmonized</a> · <a href="https://developers.google.com/earth-engine/datasets/catalog/COPERNICUS_S1_GRD">Sentinel-1 GRD</a></p></main></html>'''
(OUT/'report.html').write_text(html,encoding='utf-8')
print('Verified independent IoU, nested stages, missing date, unchanged model hash, exact polygon rasterization; published 3 dates and report.')
