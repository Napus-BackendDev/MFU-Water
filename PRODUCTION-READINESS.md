# MFU Water: Production readiness

ตรวจวันที่ 29 กันยายน 2026 · Task `mfu-production-ready-20260929` · Project `mfu-water-7308d513`

## ข้อสรุป

**NO-GO สำหรับเปิดใช้งานสาธารณะในขณะนี้** แม้ local tests และ production build ผ่านแล้ว ข้อมูลนี้เป็นการตรวจ source, mock HTTP และ UI ในเครื่อง ไม่ใช่การรับรองฐานข้อมูลหรือระบบ production จริง

ผู้ใช้ยืนยันให้โปรเจกต์นี้ใช้ **Supabase เท่านั้น** ไม่มีการเปลี่ยนเป็น MongoDB ไม่มีการเชื่อม Cloud, migration, bootstrap, ส่งอีเมล, push หรือ deploy ในรอบนี้

## สิ่งที่แก้ในเครื่องแล้ว

- Browser เรียก Express เท่านั้น ทั้ง public และ admin; นำ direct SDK fallback, persistent browser auth และข้อยกเว้นอีเมลแอดมินออก API ล้มเหลวต้องแสดงข้อผิดพลาด ไม่สร้างข้อมูลบางส่วนหรือข้ามสิทธิ์
- CSRF cache อายุไม่เกิน 50 นาที และล้างหลัง 403 เพื่อให้ผู้ใช้ลองใหม่ด้วย token ใหม่ ไม่ replay mutation อัตโนมัติ Logout ต้องสำเร็จจาก API ก่อนล้างหน้าจอ
- API รองรับ refresh cookie เมื่อ access cookie หาย ยังคงตรวจ active membership จากเซิร์ฟเวอร์
- จำกัด submission ก่อน Multer/Sharp: 10 คำขอ/IP/ชั่วโมง และ 4 คำขอพร้อมกันต่อ process รวม key ได้ไม่เกิน 10,000 รายการ นี่ไม่ใช่ distributed quota; ต้องมี edge limit หากเปิดหลาย instance
- รูปที่สองผิด format เข้า cleanup แทน early return ที่ทำให้รูปแรกตกค้าง CSV ฝั่ง server และ browser ป้องกัน formula prefix ในช่องข้อความ
- Express เสิร์ฟ `dist` และ `/api` ใน origin เดียวกัน ไม่มี HTML fallback สำหรับ API หรือ JS ที่หาย HTML ใช้ `no-store`; hashed JS/CSS cache immutable; `/healthz` เป็น liveness เท่านั้น ไม่ตรวจฐานข้อมูล
- Production startup ตรวจ config/HTTPS/build ก่อนเริ่ม, cookies ใช้ Secure, ปิด wildcard CORS ใน production, เพิ่ม response headers และ graceful shutdown
- Runtime ต้องใช้ Node.js >=22; `npm start` รัน Express โดยไม่อ่าน `.env` อัตโนมัติ
- อัปเดต MapLibre จาก 4.7.1 เป็น 6.11.2 เพื่อแก้ Critical XSS; เปลี่ยน namespace imports และแพ็ก worker ด้วย Vite ตรวจ UI mock แล้วขอบเขต/หมุด/รูปยังทำงาน
- ปิดช่องว่าง `TRUST_PROXY`: รับเฉพาะรายการ IP/CIDR ไม่รับ boolean true, hop count, alias หรือช่วงกว้างกว่า IPv4 /8 และ IPv6 /32; จำกัด 64 รายการ ค่าไม่ถูกต้องทำให้ startup หยุดโดยไม่สะท้อนค่าดิบ ทดสอบ forwarded headers จากผู้ส่งที่ไม่เชื่อถือ และ chain ที่หยุดที่ proxy แรกซึ่งไม่เชื่อถือแล้ว การตั้ง proxy จริงยังต้องตรวจ topology และการล้าง headers
- ใช้ override เฉพาะ `googleapis-common` ให้ใช้ `uuid` 11.1.1 ที่แก้ advisory แล้ว โดยไม่ downgrade Earth Engine ทดสอบ CommonJS, UUID bounds และ multipart upload ผ่าน mock transport ไม่มีการเชื่อม Google จริง Audit production dependencies ณ รอบนี้ไม่มี findings
- อัปเดต Vite จาก 5.4.21 เป็น 6.4.3 เพื่อแก้ dev-server advisories บน Windows; plugin React เดิมรองรับ Vite 6 ทดสอบ React transform, worker URL และ fs deny ผ่าน HTTP loopback โดยไม่โหลด environment files หรือ API plugin
- Override เฉพาะ Mapshaper ให้ใช้ `adm-zip` 0.6.1 และ Mapshaper/numcodecs ให้ใช้ `fflate` 0.8.3 ทดสอบ ZIP memory round-trip, corrupted ZIP rejection, GeoJSON dissolve จาก ZIP และ gzip/zlib codecs แล้ว ไม่เปลี่ยน published geometry หรือรัน importer ชุดจริง
- Browser QA พบกล่องผลตรวจมือถือถูก UI ทับ เพราะ parent แผนที่เป็น stacking context `z-0`; ย้ายกล่องมือถือและ lightbox เดิมผ่าน React portal ไป `document.body` ไม่ย้ายหมุดหรือกล่อง desktop ไม่เพิ่ม dependency ตรวจภาพและปุ่มปิดหลังแก้แล้ว

## สิ่งที่ยังขวางการเปิดจริง

1. **Credentials:** หมุนเวียน service/secret key และ CSRF secret ที่เคยส่งในแชตผ่านเจ้าของระบบ แล้วเก็บเฉพาะ secret manager ไม่ส่งค่ากลับมาในแชต ไม่มีหลักฐานในรอบนี้ว่าหมุนเวียนแล้ว
2. **Hosting/HTTPS:** ยังไม่ได้เลือก hosting/domain หรือ reverse proxy ค่า default listener เป็น loopback ต้องกำหนด `HOST` ให้ตรง topology หากใช้ container และกำหนด `TRUST_PROXY` เฉพาะ proxy addresses ที่เชื่อถือ ห้ามตั้ง trust-all
3. **Supabase:** ยังไม่ได้ตรวจ RLS, grants, private bucket, migration revision, RPC, admin membership หรือ backups บน target จริง ต้องมี current permission แยกสำหรับ production read และแต่ละ write ขั้นแรกทดสอบ schema/RPC บน local test DB ใหม่ก่อน ไม่ถือว่า source SQL ผ่านแล้วแปลว่า Cloud ตรงกัน
4. **ฐานข้อมูลใหม่:** migration ปัจจุบันพึ่งตารางจาก `supabase/schema.sql` ที่อยู่นอก migration chain ห้าม apply บนฐานข้อมูลว่างโดยเดา ต้องจัด baseline migration ที่ทดสอบได้ก่อน provisioning ใหม่
   ตรวจ runtime local รอบล่าสุด: Docker CLI มี แต่เชื่อม Docker Desktop Linux engine ไม่ได้; ไม่พบ Supabase CLI/psql ใน PATH และไม่มี `supabase/config.toml` จึงยังไม่มีหลักฐาน integration บนฐานข้อมูลว่าง ไม่เปิด daemon หรือติดตั้งระบบ global อัตโนมัติ
5. **Dependency/CI:** production audit หลัง UUID override ไม่มี findings; full audit หลัง Vite/ZIP fixes ยังมี 2 Moderate และ 2 High ใน `mapshaper`, `@ngageoint/geopackage`, `file-type`, `image-size` รุ่น patched ของ image parsers เปลี่ยน API ที่ GeoPackage เดิมใช้ จึงไม่ override ตรงหรือ downgrade Mapshaper เพื่อให้ audit ผ่าน ต้องเลือกรุ่น upstream/fork ที่ตรวจ compatibility ได้ก่อนใช้ importer กับข้อมูลไม่เชื่อถือ นอกจากนี้ Mapshaper ฝัง compression code ใน bundle; dependency override ไม่รับรองว่าโค้ดฝังได้รับ patch ห้ามเปิด importer เป็น public endpoint และไม่ถือว่า audit เป็นการรับรองความปลอดภัยทั้งหมด
6. **แผนที่:** ใช้ Google `mt*.google.com/vt` ใน source ปัจจุบัน ไม่ใช่หลักฐานว่าเป็น integration ที่ได้รับสิทธิ์ production ต้องเลือกผู้ให้บริการ/แพ็กเกจที่อนุญาตและ attribution ที่ถูกต้องก่อนเปิดจริง ไม่รับรองว่าใช้ฟรีโดยไม่มีเงื่อนไข
7. **Invitations/อีเมล:** password setup flow ยังไม่ครบ จึงปฏิเสธ production startup หาก `ENABLE_ADMIN_INVITES=true` ไม่เปิดเชิญจน flow ผ่าน การส่งอีเมลต้องตรวจ SMTP, delivery และ recovery ของ outbox `sending` หลัง crash (ยังไม่มี lease reclaim)
8. **การปฏิบัติการ:** ยังไม่มีหลักฐาน restore backup, alerting, monitoring, staging load test, retention/privacy notice หรือ rollback ที่ทดสอบจริง ห้ามลบ asset build เก่าทันทีระหว่าง rolling release เพราะ client เก่าอาจยังเรียก lazy chunks
9. **Performance:** public assets รวมประมาณ 592.6 MB (ไม่ใช่หน้าแรกดาวน์โหลดทั้งหมด) Vite 6 build ให้ MapLibre chunk 1,029.98 kB ก่อน gzip / 281.08 kB gzip และ worker 508.04 kB ก่อน gzip ต้องตรวจ quota hosting และวัดหน้าแรก/มือถือใหม่ ค่า benchmark เดิมไม่ใช่ผลรุ่นที่เพิ่งอัปเดต

## แผนเปิดระบบตามลำดับ

### Development/test — ไม่เชื่อม Cloud

1. เก็บการแก้ไขเดิมและเลือก revision ที่จะ release โดยเจ้าของ repo ไม่ commit/push อัตโนมัติจากการตรวจนี้
2. ตรวจ local Supabase schema/RPC/Auth/Storage ตั้งแต่ฐานข้อมูลว่าง ทดสอบ upload, pending review, approve, withdraw, private contacts และ rollback migration กับฐานข้อมูล test แยก
3. ปิด dependency findings ที่เหลือและทดสอบ Earth Engine แบบ mock ก่อนทดสอบ credentials ของ staging ที่ได้รับอนุญาต
4. เลือก hosting ที่รัน Node/Express ได้จริง และเลือก tile provider ที่ได้รับอนุญาต Vercel config ปัจจุบันเป็น static catch-all จึง **ไม่ใช่** release path ของ full-stack API นี้
5. รัน tests/build, browser flows desktop/mobile และ staging load/security smoke tests ด้วย revision เดียวกัน

### Production — ต้องมีสิทธิ์ปัจจุบันก่อนดำเนินการ

1. เจ้าของระบบหมุนเวียนคีย์ ตั้ง secret manager, domain/TLS, proxy, RLS/private storage และ backup/restore ที่ตรวจได้
2. อนุมัติ production read เพื่อตรวจ readiness โดยไม่เปิดข้อมูลติดต่อ อนุมัติ migration/bootstrap แยกเป็นราย action หากจำเป็น
3. อนุมัติ deploy exact hosting/domain/revision แล้วจึง build/release ผ่าน guard; ไม่ใช้ Vite preview เป็น production server
4. ตรวจ same-origin `/api/samples` เป็น JSON, private photos ตามสถานะล่าสุด, session/access control, export, no-store และการถอนเผยแพร่
5. เปิดรับผู้ใช้เมื่อทุก gate ผ่าน มี monitor/alert/rollback และ owner ยืนยันเท่านั้น

ตั้ง runtime environment ใน secret manager: `NODE_ENV=production`, `SUPABASE_URL`, `SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`, `ADMIN_CSRF_SECRET`, `PUBLIC_APP_URL`; ตั้ง `HOST`/`PORT` และ `TRUST_PROXY` ให้ตรง hosting จริง ตั้ง `ENABLE_ADMIN_INVITES=false` ระหว่างเตรียมระบบ ไม่ใช้คีย์หรือ endpoint จริงในเอกสารนี้

## หลักฐานรอบนี้

- 101 regression tests ผ่าน รวม UUID multipart compatibility, proxy validation/spoofing, Vite dev-server HTTP, ZIP/GeoJSON/codec compatibility และ mobile portal source contract; Vite 6.4.3 build ผ่าน การตรวจ source contract ไม่แทน browser QA
- Mock HTTP ตรวจหน้าเว็บ/assets/API JSON 404, missing chunk 404, cache และ headers; pure config validation ไม่ติดต่อ Cloud
- Browser Vite 6 build ตรวจประเทศไทย → ภาคเหนือ (17 จังหวัด) → เชียงราย (18 เขต), Quick View เมืองเชียงราย, หมุดจำลอง 2 รายการ, ชื่อสมมติ/รูป และหน้า admin login ทั้ง desktop และมือถือ 390×844 โดยไม่ login หรือเชื่อมฐานข้อมูลจริง กล่องมือถือหลังแก้ไม่ถูก sidebar/controls ทับและปิดด้วยปุ่มได้
- ยังพบ MapLibre warning `Map cannot fit within canvas with the given bounds, padding, and/or offset.` ระหว่างย่อหน้าจอ จึงไม่รับรอง responsive fit/zoom ครบทุกขนาด และไม่ได้วัด performance ตาม 5-run benchmark
- Screenshot `production-readiness-vite6-desktop-20260929.png` และ `production-readiness-vite6-mobile-20260929.png` เป็นข้อมูลจำลองเท่านั้น
- Native reviewers 2 ราย read-only; main agent เป็นผู้แก้ทั้งหมด; Anti-Gravity guard ปฏิเสธ `shell_executable_denied`; Memory: none useful
- รอบ dependency continuation มีผู้ตรวจ Mapshaper เพิ่ม 1 รายแบบ read-only; Vite smoke ครั้งแรก timeout ระหว่างปิด optimizer จึงปิดเฉพาะ owned test processes แล้วปรับ test ให้ไม่ auto-discover dependencies พร้อม bounded requests; ทดสอบซ้ำผ่านโดยไม่มีการลด assertions
- ผู้ตรวจอ่าน local migration ยืนยัน chain ยังไม่ self-contained และ SQL พึ่ง Supabase Auth/Storage/roles; PostgreSQL เปล่าไม่เพียงพอ การตรวจนี้ไม่รัน SQL ไม่ bootstrap admin และไม่อ่าน credentials

## แหล่งอ้างอิง

- [Supabase production checklist](https://supabase.com/docs/guides/deployment/going-into-prod): ตรวจ RLS, load, availability และ backups
- [Express production security](https://expressjs.com/en/advanced/best-practice-security/): TLS, secure cookies และ security headers
- [Vite deployment](https://vite.dev/guide/static-deploy.html): build กับ preview ไม่ใช่ production API hosting
- [MapLibre security advisory](https://github.com/maplibre/maplibre-gl-js/security/advisories/GHSA-jrc7-96c5-q579): affected <=6.4.0, patched >=6.4.1
- [Google Map Tiles policies](https://developers.google.com/maps/documentation/tile/policies): authorized integration และ attribution ต้องตรวจให้ครบ
- [Vite 6 migration](https://v6.vite.dev/guide/migration) และ [6.4.3 release](https://github.com/vitejs/vite/releases/tag/v6.4.3): ตรวจผลกระทบต่อ build/plugin ก่อนอัปเดต
- [adm-zip 0.6.1](https://github.com/cthackers/adm-zip/releases/tag/v0.6.1) และ [fflate 0.8.3](https://github.com/101arrowz/fflate/releases/tag/v0.8.3): รุ่นแก้การจัดการ ZIP ที่ใช้ใน scoped overrides
