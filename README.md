# MFU Water 3D Simulation — แบบจำลองภูมิประเทศและระดับน้ำท่วมลุ่มน้ำแม่กก

เว็บแอปพลิเคชันจำลองพื้นที่ 3D เสมือนจริงของลุ่มน้ำแม่กก จ.เชียงราย โดยเน้นพื้นที่รอบมหาวิทยาลัยแม่ฟ้าหลวง (MFU) และพื้นที่เมืองเชียงราย ด้วยเทคโนโลยีแผนที่ 3D ฟรี 100% (ไม่มีค่าใช้จ่าย API และไม่ต้องผูกบัตรเครดิต)

---

## ฟังก์ชันการทำงานหลัก

1. **3D Terrain & Satellite View (ฟรี 100%):**
   - แสดงผลความสูงต่ำของเทือกเขาและภูมิประเทศจริงด้วย Global Digital Elevation Model (Terrarium 3D DEM)
   - ภาพถ่ายดาวเทียมความละเอียดสูงระดับโลกจาก ESRI World Imagery
   - สลับดูแผนที่ภูมิประเทศ (Topographic) และแผนที่ถนน (OpenStreetMap) ได้ทันที

2. **ระบบจำลองระดับน้ำท่วม 3D (Interactive Flood Simulation):**
   - แถบเลื่อนปรับระดับน้ำจำลอง (0.0 ถึง 8.0 เมตร)
   - แสดงผลการเอ่อล้นของน้ำท่วมตามระดับความสูงของภูมิประเทศ (Elevation MSL)
   - แสดงสถานะการเตือนภัยอัตโนมัติ 4 ระดับ (ปกติ, เฝ้าระวัง, ล้นตลิ่ง, วิกฤต)
   - คำนวณพื้นที่ท่วมโดยประมาณ (ตร.กม.), อัตราการไหล (m³/s) และประชากรในพื้นที่เสี่ยง

3. **จุดสำคัญ (Landmarks) & 3D Fly-to:**
   - มหาวิทยาลัยแม่ฟ้าหลวง (MFU) & อ่างเก็บน้ำ มฟล.
   - สะพานขัวพญามังราย (จุดวิกฤตกลางเมืองเชียงราย)
   - ฝายเชียงราย (ประตูระบายน้ำ)
   - เกาะลอย & หาดเชียงราย
   - ท่าอากาศยานแม่ฟ้าหลวง เชียงราย (CEI)
   - จุดบรรจบแม่น้ำกรณ์-แม่น้ำกก

4. **มุมกล้อง 3D สำเร็จรูป (Camera Presets):**
   - ภาพรวมลุ่มน้ำกก
   - มหาวิทยาลัยแม่ฟ้าหลวง
   - ตัวเมืองเชียงราย & สะพานกก
   - ฝายเชียงราย
   - มุมมองตานก 3D (Bird's Eye)

---

## การติดตั้งและการเริ่มใช้งาน

```bash
# 1. ติดตั้ง Dependencies
npm install

# 2. เริ่มต้นรัน Development Server
npm run dev

# 3. สร้าง Production Build
npm run build
```

## ข้อมูลขอบเขตแผนที่

KOK Water Watch ใช้ [Thailand COD-AB จาก HDX/OCHA](https://data.humdata.org/dataset/cod-ab-tha) รุ่น v01: 77 จังหวัด และ 928 อำเภอ/เขต มีชื่อไทยและรหัสจังหวัดแม่จากต้นฉบับ ภายใต้ CC BY-IGO ข้อมูลสร้างปี 2022 ทบทวนปี 2025 ไม่ใช่การรับรองแนวเขตทางกฎหมายปัจจุบัน

เส้นจังหวัดได้จากการรวม polygon อำเภอตาม PCODE และประเทศไทยได้จากการรวมจังหวัดชุดเดียวกัน ใช้ geometry เดียวสำหรับเส้น พื้นที่คลิก ซูม และกรองจุด ไม่ลดรายละเอียด ไม่ snap ไม่ repair และไม่เลื่อนพิกัด เส้นจังหวัดสี `#0284C7` หนา 2 px อำเภอ 1 px พร้อมขอบขาวบนภาพดาวเทียม เส้นปกครองของ basemap ไม่ใช้แทนข้อมูล COD เพื่อหลีกเลี่ยงชุดข้อมูลคนละรุ่น

แผนที่ 2D เริ่มประเทศไทย แสดง 4 ภาค: เหนือ 17 จังหวัด กลาง 26 จังหวัด อีสาน 20 จังหวัด ใต้ 14 จังหวัด ชื่อบนแผนที่แสดงเฉพาะระดับที่เลือก: ประเทศ→ภาค ภาค→จังหวัด จังหวัด→อำเภอ ชื่อไทยเป็น HTML ไม่พึ่ง glyph ผู้ให้บริการ อำเภอใน `public/data/boundaries/districts/TH-xx.geojson` โหลดเมื่อเลือกจังหวัดหรือ Quick View เท่านั้น มี in-memory cache ป้องกันผลคำขอเก่าทับพื้นที่ใหม่ และมีปุ่มลองใหม่เมื่อโหลดล้มเหลว ไฟล์ `.gz` ลดขนาดดาวน์โหลดแบบ lossless; geometry ฉบับเต็มยังใช้หน่วยความจำมากกว่าข้อมูลลดรายละเอียด

นำเข้าซ้ำด้วย `node scripts/download-cod-boundaries.mjs` แล้ว `node --max-old-space-size=6144 scripts/import-cod-boundaries.mjs` ผ่านตัวตรวจสิทธิ์ process ของ workspace ดาวน์โหลดแบบ streaming เฉพาะ ADM1/ADM2 จาก ZIP ไม่โหลดตำบล ตรวจรหัส ชื่อไทย พื้นที่ทับซ้อน และ coverage กับ ADM1 รุ่นเดียวกันก่อนเปลี่ยนไฟล์ แหล่งที่มา รุ่น ใบอนุญาต SHA-256 และผล topology อยู่ใน `thailand-provinces.source.json` ข้อมูลประเทศเพื่อนบ้านชุดเดิมยังคงเครดิต/ใบอนุญาตเดิมแยกจาก COD

Google Maps ยังเป็นแหล่งภาพแผนที่และภาพดาวเทียมของระบบ แต่ Google Maps JavaScript Boundary FeatureLayer ต้องใช้ API key และ map ID ที่เปิด data-driven styling จึงไม่สามารถนำมาเสียบเป็น GeoJSON source ใน MapLibre ได้โดยตรง รอบนี้จึงไม่นำขอบเขตตำบลหรือแปลงที่ดินปลอมมาแสดง จนกว่าจะมีข้อมูลภูมิศาสตร์จริงที่ได้รับอนุญาตให้ใช้งาน

## KOK Water Watch: ระบบผู้ดูแลและการเผยแพร่ผล

- เบราว์เซอร์เรียก Express API เท่านั้น; Supabase Auth, Database และ Storage ใช้จากฝั่งเซิร์ฟเวอร์ และ bucket รูปเป็น private
- ผลตรวจ `≤ 50 ppb` เผยแพร่อัตโนมัติ; `> 50 ppb` และค่าที่ไม่ถูกต้องรอตรวจ ค่า 50 ppb เป็นเพียงกฎการเผยแพร่ ไม่ใช่เกณฑ์ความปลอดภัยของน้ำ
- ชื่อ/เบอร์เป็นทางเลือก แยกเก็บจากผลตรวจและไม่ส่งออกสู่สาธารณะ รูปอาจยังระบุตัวบุคคลได้ จึงเตือนให้ตรวจรูปก่อนส่ง
- คำขอลบข้อมูลติดต่อจัดการได้จากหน้าแอดมิน การอนุมัติคำขอลบเฉพาะข้อมูลติดต่อ ไม่ลบผลตรวจหรือรูป

### Supabase environment

คัดลอก `.env.example` เป็น `.env` สำหรับ development ได้ แต่ development API ยอมรับเฉพาะ Supabase บน loopback และจะปฏิเสธ Cloud endpoint โดยไม่ fallback อัตโนมัติ สำหรับแอปที่เชื่อม Supabase Cloud ให้ตั้ง `NODE_ENV=production` และ secret ต่อไปนี้ใน secret manager ของเซิร์ฟเวอร์: `SUPABASE_URL`, `SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`, `ADMIN_CSRF_SECRET` (สุ่มอย่างน้อย 32 ตัวอักษร) และ `PUBLIC_APP_URL` ห้ามใช้ prefix `VITE_` กับ secret และห้ามใส่ service-role key ในเบราว์เซอร์

ก่อนเปิดระบบ ต้องตรวจและอนุมัติ migration `supabase/migrations/202609280001_roles_privacy.sql` กับ Supabase project เป้าหมายด้วยตนเอง การรัน migration/bootstrap บน Cloud ไม่ทำอัตโนมัติ และต้องสำรองข้อมูลก่อนเสมอ จากนั้นสร้างผู้ใช้คนแรกใน Supabase Auth แล้วตั้ง `SEED_ADMIN_USER_ID`, `SEED_ADMIN_EMAIL`, `NODE_ENV=production` และ `ALLOW_CLOUD_ADMIN_BOOTSTRAP=I_APPROVE_FIRST_ADMIN_BOOTSTRAP` ใน environment ของงาน bootstrap และเรียก `npm run bootstrap:admin` ผ่านขั้นตอนอนุมัติ production ของทีม ห้ามส่ง key ผ่านแชตหรือ commit ลง Git

สำหรับ production ให้ตั้ง `ENABLE_ADMIN_INVITES=false` จนกว่าจะทดสอบ password setup และการกู้คืนคิวอีเมลหลัง process หยุดครบ ระบบปฏิเสธ startup หากเปิด invitations ในระหว่างที่ flow ยังไม่ผ่านการตรวจรับ ห้ามเปิดเพียงเพราะมี SMTP แล้ว

Production readiness และเงื่อนไขที่ยังขวางการเปิดจริงอยู่ใน [PRODUCTION-READINESS.md](PRODUCTION-READINESS.md) ค่า `TRUST_PROXY` รับเฉพาะ IP/CIDR ของ proxy ที่เชื่อถือได้จริง ไม่รับ `true`, จำนวน hop หรือชื่อ alias; ถ้าไม่ใช้ proxy ให้เว้นไว้หรือใช้ `false` ต้องให้ proxy ล้าง forwarded headers ที่ผู้ใช้ส่งมาเอง
