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
2. **Hosting/HTTPS:** ผู้ใช้เลือก GitHub → Vercel แล้ว รอบ local continuation เพิ่ม `api/index.js` และ routing แยก API จาก Vite CDN; ไม่ส่ง `dist/public` หรือ credential files เข้า function ตรวจ config/security เดิมและปิด worker แบบ timer แต่ยังไม่ได้ build artifact ของ Vercel หรือยืนยัน rewrite/proxy/runtime บนแพลตฟอร์มจริง ต้องตรวจ domain, HTTPS และ client IP; ห้ามตั้ง `TRUST_PROXY=true` เพื่อให้ rate limit ดูเหมือนทำงาน
3. **Supabase:** ยังไม่ได้ตรวจ RLS, grants, private bucket, migration revision, RPC, admin membership หรือ backups บน target จริง ต้องมี current permission แยกสำหรับ production read และแต่ละ write ขั้นแรกทดสอบ schema/RPC บน local test DB ใหม่ก่อน ไม่ถือว่า source SQL ผ่านแล้วแปลว่า Cloud ตรงกัน
4. **ฐานข้อมูลใหม่:** migration ปัจจุบันพึ่งตารางจาก `supabase/schema.sql` ที่อยู่นอก migration chain ห้าม apply บนฐานข้อมูลว่างโดยเดา ต้องจัด baseline migration ที่ทดสอบได้ก่อน provisioning ใหม่
   ตรวจ runtime local รอบล่าสุด: Docker CLI มี แต่เชื่อม Docker Desktop Linux engine ไม่ได้; ไม่พบ Supabase CLI/psql ใน PATH และไม่มี `supabase/config.toml` จึงยังไม่มีหลักฐาน integration บนฐานข้อมูลว่าง ไม่เปิด daemon หรือติดตั้งระบบ global อัตโนมัติ
5. **Dependency/CI:** production audit หลัง UUID override ไม่มี findings; full audit หลัง Vite/ZIP fixes ยังมี 2 Moderate และ 2 High ใน `mapshaper`, `@ngageoint/geopackage`, `file-type`, `image-size` รุ่น patched ของ image parsers เปลี่ยน API ที่ GeoPackage เดิมใช้ จึงไม่ override ตรงหรือ downgrade Mapshaper เพื่อให้ audit ผ่าน ต้องเลือกรุ่น upstream/fork ที่ตรวจ compatibility ได้ก่อนใช้ importer กับข้อมูลไม่เชื่อถือ นอกจากนี้ Mapshaper ฝัง compression code ใน bundle; dependency override ไม่รับรองว่าโค้ดฝังได้รับ patch ห้ามเปิด importer เป็น public endpoint และไม่ถือว่า audit เป็นการรับรองความปลอดภัยทั้งหมด
6. **แผนที่:** ใช้ Google `mt*.google.com/vt` ใน source ปัจจุบัน ไม่ใช่หลักฐานว่าเป็น integration ที่ได้รับสิทธิ์ production ต้องเลือกผู้ให้บริการ/แพ็กเกจที่อนุญาตและ attribution ที่ถูกต้องก่อนเปิดจริง ไม่รับรองว่าใช้ฟรีโดยไม่มีเงื่อนไข
7. **Invitations/อีเมล:** password setup flow ยังไม่ครบ จึงปฏิเสธ production startup หาก `ENABLE_ADMIN_INVITES=true` ไม่เปิดเชิญจน flow ผ่าน การส่งอีเมลต้องตรวจ SMTP, delivery และ recovery ของ outbox `sending` หลัง crash (ยังไม่มี lease reclaim)
8. **การปฏิบัติการ:** ยังไม่มีหลักฐาน restore backup, alerting, monitoring, staging load test, retention/privacy notice หรือ rollback ที่ทดสอบจริง ห้ามลบ asset build เก่าทันทีระหว่าง rolling release เพราะ client เก่าอาจยังเรียก lazy chunks
9. **Performance:** public assets รวมประมาณ 592.6 MB (ไม่ใช่หน้าแรกดาวน์โหลดทั้งหมด) Vite 6 build ให้ MapLibre chunk 1,029.98 kB ก่อน gzip / 281.08 kB gzip และ worker 508.04 kB ก่อน gzip ต้องตรวจ quota hosting และวัดหน้าแรก/มือถือใหม่ ค่า benchmark เดิมไม่ใช่ผลรุ่นที่เพิ่งอัปเดต
10. **Vercel payload/serverless:** API เดิมรับรูป 2 รูป รูปละ 10 MiB แต่ Vercel Functions จำกัด request/response 4.5 MB จึงต้องปรับ upload/evidence delivery และทดสอบ end-to-end ก่อนเปิดรับข้อมูลจริง Rate limiter ยังเป็น per-instance; ต้องมี distributed/edge quota ที่ตรวจแล้ว การส่ง SMTP ถูกปฏิเสธใน Vercel runtime จนมี durable runner และ recovery; GEE มีช่องทาง server-only environment แล้วใน local source แต่ยังต้องตั้ง secret และตรวจสิทธิ์/project/การเชื่อมต่อจริงใน environment ที่ได้รับอนุญาต

## แผนเปิดระบบตามลำดับ

### Development/test — ไม่เชื่อม Cloud

1. เก็บการแก้ไขเดิมและเลือก revision ที่จะ release โดยเจ้าของ repo ไม่ commit/push อัตโนมัติจากการตรวจนี้
2. ตรวจ local Supabase schema/RPC/Auth/Storage ตั้งแต่ฐานข้อมูลว่าง ทดสอบ upload, pending review, approve, withdraw, private contacts และ rollback migration กับฐานข้อมูล test แยก
3. ปิด dependency findings ที่เหลือและทดสอบ Earth Engine แบบ mock ก่อนทดสอบ credentials ของ staging ที่ได้รับอนุญาต
4. ตรวจ Vercel Function artifact, API rewrite, upload limits, secret provider, edge rate limits และ domain ตาม hosting ที่เลือกแล้ว พร้อมเลือก tile provider ที่ได้รับอนุญาต Local adapter ผ่านไม่ใช่หลักฐานว่า deployed runtime ใช้งานจริงครบ
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
- [Vercel Node.js runtime](https://vercel.com/docs/functions/runtimes/node-js), [function limits](https://vercel.com/docs/functions/limitations) และ [configuration](https://vercel.com/docs/project-configuration/vercel-json): adapter, routing, bundle exclusions และขีดจำกัด payload ต้องตรวจคู่กับ artifact จริง

## Local Vercel continuation — 29 กันยายน 2026

Task `mfu-vercel-local-20260929`: เพิ่ม API entry ที่ export Express app โดยตรง ใช้ routes เดิมทั้งหมด ไม่เปิด listener ใหม่หรือเปิด email worker ใน Vercel mode; CDN เสิร์ฟหน้าเว็บและ assets แยกจาก function มี headers พื้นฐานและ HTML `no-store` รวมถึงไม่มี catch-all ที่เปลี่ยน API/missing chunk เป็น HTML

ผู้ตรวจพบว่า `config.api.bodyParser=false` เป็นรูปแบบ Next.js ไม่ได้ปิด helpers ของ plain Node runtime จึงเลิกใช้ wrapper ใน entry จริง: Express app มี `listen` ซึ่ง runtime ใช้ตรวจเพื่อข้าม request helpers ทดสอบยืนยัน entry ส่งออก Express จริง แต่ยังต้องตรวจ deployed runtime และ function artifact ก่อนรับรอง multipart บน Vercel

ขอบเขตท่าตอนที่ GEE ใช้มีสำเนาใน `server/data` เพื่อไม่ต้อง bundle public assets ทั้งหมด Regression ตรวจ JSON ตรง frontend ทุกค่าและยังคงตรวจ TAM_CODE/Polygon เดิม หากปรับข้อมูลชุดนี้ภายหลังต้องอัปเดตสองฝั่งและผ่าน equality test

ตรวจ adapter ผ่าน local HTTP mock: URL/query/JSON body, multipart, cookies, nested route, lazy app reuse, missing static 404, malformed JSON 400 และ sanitized startup 503; ไม่มี Supabase/Google request หรือ credential จริงใน tests ไม่ใช้ mock เหล่านี้รับรอง production Auth/Storage

เพิ่ม smoke test ที่โหลด Express ตัวจริงผ่าน adapter ด้วย test-only production-validation fixture และบล็อก external fetch: `/healthz`, `/api/status`, unknown API, missing asset และ CSRF/Secure cookie ผ่าน ไม่อ่าน service-account file ใน Vercel mode และ GEE แสดง unavailable อย่างชัดเจน Regression ทั้งหมด 107 รายการผ่าน และ Vite 6.4.3 build ผ่าน (ยังมี MapLibre chunk warning เดิม) `git diff --check` ผ่าน; ไม่ถือว่า Vite build นี้สร้างหรือรับรอง Vercel Function artifact

ไฟล์ continuation ยังอยู่ local ไม่ commit/push/deploy เพิ่ม GitHub branch `mfu-water-update-20260929` ที่ผู้ใช้อนุญาตก่อนหน้านี้อยู่ commit `044e23b` และยังเป็น static-only Vercel config; อย่าสับสนกับ source ที่เพิ่งแก้ในเครื่อง

### GEE initialization continuation

เพิ่ม `GEE_SERVICE_ACCOUNT_JSON` สำหรับ Vercel production runtime เท่านั้น อ่าน JSON ในหน่วยความจำ ตรวจชนิด service account, email, project ID และ RSA private key ก่อนส่งให้ SDK ไม่ส่ง fields อื่นหรือ endpoint overrides ไม่ fallback ไป credential file เมื่อ configuration ขาดหรือผิด และไม่พิมพ์ credential/provider error ลง log ฝั่ง standalone ยังคงใช้แหล่งไฟล์เดิม

Initialization ส่ง project ID เป็น argument ตัวที่ 6 ตาม SDK ที่ติดตั้ง จำกัดเวลา 15 วินาทีและกัน callback ซ้ำ/หลัง timeout ไม่ให้เปลี่ยน readiness หรือเริ่ม initialize รอบใหม่ Application เก็บ promise เดียวและไม่ได้เพิ่ม retry หรือ authentication ซ้อน Timeout นี้ไม่ใช่การยกเลิก network request ภายใน SDK

ทดสอบด้วย mock SDK และข้อมูลที่ไม่ใช่คีย์ใช้งานจริง: success/project, missing/malformed configuration, invalid key, filesystem error, auth/init failure/throw, callback ซ้ำและ late callback ผ่าน รวม regression 112 รายการ; ไม่อ่านคีย์จริง ไม่รับรอง Google access หรือ deployed Vercel runtime การแก้นี้ยังอยู่ local และสถานะรวมยัง NO-GO

เจ้าของระบบตั้ง secret ผ่าน hosting secret mechanism เฉพาะ environment ที่อนุมัติ ห้าม prefix `VITE_`, commit JSON/private key หรือส่งคีย์ผ่านแชต Development/test ไม่ใช้ production secrets อ้างอิง [Google Earth Engine Node authentication](https://developers.google.com/earth-engine/guides/npm_install) และ [Vercel environment variables](https://vercel.com/docs/environment-variables)

### Client photo compression — 29 กันยายน 2026

ตามตัวเลือกผู้ใช้ ลดขนาดรูปก่อนส่งผ่าน Express API เดิม ไม่เปลี่ยน schema, private Storage หรือกฎเผยแพร่ รองรับ JPEG/PNG/WebP ต้นฉบับไม่เกิน 10 MiB; แปลงเป็น JPEG ด้านยาวไม่เกิน 2,048 px ไม่ขยายรูปเล็ก จำกัด 1.5 MiB ต่อรูป สูงสุดสองรูป ลดคุณภาพและขนาดเพิ่มเมื่อจำเป็น หาก decode/encode ล้มเหลวจะหยุด ไม่ส่งต้นฉบับแทน ตรวจขนาด multipart จริงรวมข้อมูล UTF-8 ก่อน fetch ไม่เกิน 3.5 MiB ซึ่งต่ำกว่าขีดจำกัด request 4.5 MB ของ Vercel

อ่านรูปและย่อทีละรูป ปล่อย decoder/canvas หลังใช้ ใช้ object URL สำหรับ preview แทน FileReader เพื่อไม่ให้ callback เก่าทับรูปใหม่ ล็อกการแก้/ลบระหว่างส่ง และเมื่อยังยืนยันผลส่งไม่ได้ retry จะใช้ record, รูปย่อและ idempotency key ชุดเดิมในหน่วยความจำ ไม่เก็บข้อมูลติดต่อถาวร การปิด/เปิดฟอร์มใหม่ยังไม่รักษา attempt ข้าม remount และ API/RPC ที่รับ key ซ้ำกับ payload ต่างกันยังไม่ได้แก้ในรอบนี้

ทดสอบ Canvas ในเบราว์เซอร์จริงผ่านหน้า local test harness ด้วยรูป noise จำลอง: ต้นฉบับ 6,091,540 bytes → JPEG 1,234,139 bytes ขนาด 2,048×1,365; multipart สองรูป 2,468,747 bytes; รูปเล็ก 100×50 ไม่ขยาย และรูปเสียถูกปฏิเสธ ไม่ส่งข้อมูลจริงหรือเชื่อม Supabase Browser check นี้ไม่ใช่การส่งแบบฟอร์มจริง end-to-end

Regression 117 รายการผ่าน รวม codec/limits/multipart และ source-contract ของฟอร์ม; source-contract ไม่แทน component lifecycle test Vite 6.4.3 build ผ่าน (ยังมี MapLibre chunk warning เดิม) ผู้ตรวจ read-only 1 รายช่วยพบและแก้ photo/retry races; Memory: none useful; Anti-Gravity guard denial เดิม ไม่มีการ bypass

สถานะรวมยัง NO-GO: ยังไม่ตรวจ upload จริงบน deployed Vercel และรูปเก่าหรือผล JPEG ที่ server re-encode อาจเกินขีดจำกัด response 4.5 MB การจำกัด client ไม่แทน server-side validation งานนี้ local development/test เท่านั้น ไม่อ่านฐานข้อมูล Cloud ไม่ push และไม่ deploy

### Server evidence limits continuation — 29 กันยายน 2026

แก้ช่องว่างขนาด output ต่อจากรอบ client: `server/evidenceImages.js` แปลงภาพนิ่ง JPEG/PNG/WebP เป็น JPEG ไม่เกิน 1.5 MiB และด้านยาวไม่เกิน 2,048 px คงสัดส่วน ไม่ขยายรูปเล็ก หมุนตาม EXIF และลบ metadata จำกัดต้นฉบับ 10 MiB/30 ล้านพิกเซล ไม่ส่งต้นฉบับกลับเมื่อแปลงล้มเหลว ทั้ง upload ใหม่และ GET/HEAD รูปเก่าผ่าน encoder เดียวกัน รูปเก่าถูกย่อเฉพาะ response ไม่เขียนทับ Storage การ re-encode ทุกครั้งมี CPU overhead และยังไม่ได้วัด load/concurrency บน Vercel

Publication/auth gates อยู่ก่อน download/encode เช่นเดิม ทุก response ใช้ no-store และ JPEG/nosniff ไม่สร้าง public/signed Storage URL ใช้ทักษะ Supabase ตรวจการแยกสิทธิ์แบบอ่านโค้ด ไม่ติดต่อฐานข้อมูล Changelog endpoint อ่านไม่ได้ในรอบนี้ ไม่มีการเปลี่ยน Supabase API หรือ schema

ทดสอบ Sharp ตัวจริงด้วยภาพ noise เกิน output limit, EXIF orientation, ภาพโปร่งใส, รูปเล็ก, input เกินขนาด/พิกเซล, SVG และรูปเสีย ผ่าน HTTP test ใช้ Express router จริงกับ Storage/DB mock ตรวจ GET/HEAD เป็น JPEG, no-store, ไม่ download รายการ pending/rejected/withdrawn หรือ revision ผิด และการเปิดซ้ำหลังถอนเผยแพร่ถูกปฏิเสธ Admin auth integration และ upload/RPC จริงยังไม่ถูกทดสอบในรอบนี้ ไม่ใช้ source-contract แทน integration ดังกล่าว

Regression รวม 122 รายการผ่าน Vite 6.4.3 build ผ่าน `git diff --check` ผ่าน ผู้ตรวจ read-only 1 ราย; main agent แก้ไฟล์ทั้งหมด Memory: none useful; Anti-Gravity guard denial เดิม ไม่มี bypass Task `mfu-vercel-local-20260929`, environment development/test, Supabase ไม่เชื่อมต่อ ไม่ push/deploy สถานะรวมยัง NO-GO จนผ่าน blockers เดิม รวม deployed runtime/artifact, local DB integration, secret rotation และ load/operations gates อ้างอิง [Sharp resize](https://sharp.pixelplumbing.com/api-resize/) และ [Vercel Function limits](https://vercel.com/docs/functions/limitations)

### Duplicate receipt / evidence retention continuation — 29 กันยายน 2026

แก้ API ที่เคยส่ง `sample_code` เก่าพร้อม status/revision จาก request ใหม่บน duplicate: อ่านเฉพาะ `sample_code, publication_status, revision` ของแถวที่ RPC คืนมา ไม่กรองเฉพาะสถานะเผยแพร่ ไม่เพิ่มข้อมูลติดต่อหรือรูปใน response หาก RPC/แถว/สถานะไม่ถูกต้องหรือ lookup ล้มเหลว ตอบ 503 แทนการสร้างรหัสหรือสถานะสำเร็จขึ้นเอง Duplicate ยัง HTTP 200; รายการใหม่ยัง 201 โดยไม่เพิ่ม query อีกครั้ง

ตรวจ Storage remove error ก่อนล้างรายการ paths และลบเฉพาะ UUID paths ที่ request ซ้ำเพิ่งสร้าง ไม่แตะหลักฐานของแถวเดิม หลังเริ่ม RPC แล้ว catch จะไม่ลบรูปเพียงเพราะผลเรียกไม่แน่นอน เพราะ transaction อาจ commit ไปแล้ว ข้อแลกเปลี่ยนคืออาจมี orphan photos เมื่อ transaction ล้มเหลว/response หาย ต้องมี reconciliation ที่ตรวจอ้างอิงจริงก่อนเก็บกวาด ภารกิจนี้ไม่ได้สร้างหรือรัน cleanup job ไม่มีการลบข้อมูล Cloud

Tests ด้วย mock ครอบคลุม duplicate ทุกสถานะ/revision ที่ต่างจาก request ใหม่, fields allowlist, missing/malformed RPC/row และ lookup error พร้อม source-contract ลำดับ cleanup/receipt และการกันลบรูปหลัง dispatch ไม่ถือว่า source-contract พิสูจน์ lifecycle หรือ RPC transaction จริง Regression รวม 126 รายการและ Vite 6.4.3 build ผ่าน (MapLibre chunk warning เดิม) ผู้ตรวจ read-only 1 รายพบ cleanup/ambiguous commit risk; main agent แก้ทั้งหมด ทักษะ Supabase ตรวจไม่เผยข้อมูลส่วนตัว และ easy-documents แยกหลักฐานกับข้อจำกัดในรายงาน

ยังต้องตรวจ concurrent idempotency กับ Supabase local: SQL ปัจจุบัน check key ก่อน insert จึงอาจชน unique key เมื่อพร้อมกัน และยังไม่ได้ตรวจ payload fingerprint/ownership การปิดฟอร์มแล้วเปิดใหม่ยังไม่คง attempt ในหน่วยความจำเดิม ไม่อ้างว่า duplicate receipt fix แก้ทั้งหมดนี้แล้ว ไม่แก้ migration ในรอบนี้ Changelog endpoint อ่านไม่ได้; ใช้ API ที่ติดตั้งใน `@supabase/postgrest-js` ตรวจ `maybeSingle()` แทนการอ้าง docs v1 เป็น v2

Task `mfu-vercel-local-20260929` · development/test · Supabase ไม่เชื่อมต่อ · no push/deploy · Memory none useful · Anti-Gravity guard denial เดิม สถานะรวมยัง NO-GO ตาม blockers ก่อนหน้า

### ประวัติข้อจำกัด: ห้าม Docker (แทนที่ด้วยคำสั่งล่าสุดด้านล่าง)

ผู้ใช้สั่งห้ามใช้ Docker เด็ดขาด จึงยกเลิกคำแนะนำก่อนหน้าที่ให้เปิด Docker Desktop ไม่เรียก Docker/เปิด daemon/ติดตั้ง Docker ในงานต่อไป ข้อความการตรวจ Docker ก่อนหน้านี้เป็นหลักฐานประวัติศาสตร์ ไม่ใช่คำแนะนำที่ยังใช้ได้

ตรวจแบบอ่านอย่างเดียวไม่พบ `postgres`, `pg_ctl`, `psql` ใน PATH หรือโฟลเดอร์ PostgreSQL มาตรฐาน และไม่มี PGlite ใน dependencies ยังไม่ติดตั้งหรือเปิดบริการฐานข้อมูลอัตโนมัติ PostgreSQL native อาจใช้ตรวจ SQL/RPC ได้บางส่วน แต่ต้องจัด test fixtures ของ roles/Auth/Storage ให้ชัดเจน และไม่ถือว่า PostgreSQL เปล่ารับรอง Supabase stack เต็มระบบ

การทดสอบฐานข้อมูลจริงยังติดการเลือกและจัดเตรียม runtime แบบไม่ใช้ Docker ไม่ fallback ไป Cloud/production ไม่ลดเกณฑ์ตรวจรับให้ mocks เพียงอย่างเดียวถือว่าพร้อม production เจ้าของระบบต้องเลือก/อนุญาต runtime ก่อนดำเนินการ ไม่เปลี่ยนฐานข้อมูลหลักจาก Supabase

ผู้ใช้ตอบ “ไม่” ต่อข้อเสนอจัดเตรียม PostgreSQL local เฉพาะโฟลเดอร์โปรเจกต์ จึงไม่ติดตั้ง ดาวน์โหลด หรือเปิด PostgreSQL/native runtime เพิ่ม ไม่ถามขออนุญาตเรื่องเดิมซ้ำหากไม่มีคำสั่งใหม่ ข้อเสนอ native ก่อนหน้านี้ไม่ใช่สิทธิ์ดำเนินการ การต่อ Goal อัตโนมัติไม่เปลี่ยนการปฏิเสธนี้ และไม่ให้สิทธิ์ Docker/Cloud/production/deploy

ผลประเมินยัง NO-GO: หลักฐานล่าสุดมี 126 tests และ build ผ่านใน local/mock แต่ไม่ครบ database integration และ platform/operations gates ไม่มีการแก้ runtime หรือรันทดสอบซ้ำเพื่ออ้างความคืบหน้า งานส่วนที่ต้องใช้ runtime/สิทธิ์ใหม่รอการตัดสินใจใหม่จากเจ้าของระบบ ไม่ถือว่า Goal สำเร็จ

### คำสั่งล่าสุดและผลตรวจ Cloud map — 29 กันยายน 2026

ผู้ใช้อนุญาต Docker ในภายหลัง แต่ยืนยันว่าไม่ใช้ Supabase local และเลือกเชื่อม Supabase Cloud ผ่านคำสั่ง production read-only ที่ผู้ใช้อนุมัติและรันเอง ข้อห้าม Docker ก่อนหน้าเป็นประวัติ ไม่ใช่ข้อจำกัดล่าสุด ไม่ได้สร้าง container ฐานข้อมูล และไม่ได้เปลี่ยนหรือรัน migration บน Cloud สิทธิ์ invocation นี้ไม่ครอบคลุมการเขียนฐานข้อมูล การอนุมัติผล การส่งอีเมล การ deploy หรือการเชื่อม Cloud ครั้งใหม่โดยอัตโนมัติ

ตรวจหน้าแผนที่จากบริการ loopback ที่ผู้ใช้เปิดด้วย `run-cloud-read.ps1 -Map`: DOM แสดงผลตรวจเผยแพร่ 3 รายการในภาคเหนือ เมื่อเลือก Quick View เมืองเชียงรายด้วยคีย์บอร์ด เส้นทางนำทางตรงกับเมืองเชียงราย และแผนที่มีปุ่มหมุด 2 รายการ ค่า 50 และ 10 ppb พร้อมจำนวน 2 รายการ ส่วนแม่ลาวแสดงไม่มีข้อมูลเผยแพร่ตามตัวกรองปัจจุบัน ไม่พบข้อความ API โหลดล้มเหลวในสถานะที่ตรวจ ชื่อสมมติแสดงในรายการ และปุ่ม admin/ส่งแบบสำรวจถูกปิดตามโหมดอ่านอย่างเดียว

หลักฐานนี้ยืนยันเฉพาะการอ่านข้อมูลสาธารณะและการแสดงหมุดในบริการอ่านอย่างเดียวที่รันบนเครื่อง ไม่ใช่การทดสอบ upload, admin authorization, RLS ด้วย anon/authenticated, concurrent RPC, restore หรือ deployed Vercel และไม่ยืนยันว่ารายการที่ไม่แสดงถูกถอนหรือรอตรวจเพราะไม่ได้อ่านข้อมูลส่วนดังกล่าว ไม่เก็บข้อมูลติดต่อ คีย์ หรือ connection string ในรายงาน

สถานะรวมยัง NO-GO: tests/build ล่าสุด 126 รายการผ่านจากรอบก่อน ไม่ได้รันซ้ำในรอบอัปเดตเอกสาร ยังต้องผ่าน secret rotation, Vercel runtime/artifact, database authorization/transaction integration และ operations/load gates ที่รายงานไว้ก่อนหน้า การเลือกไม่ใช้ Supabase local ไม่ลดเกณฑ์ตรวจเหล่านี้ และไม่อนุญาตให้ใช้ production เป็นฐานข้อมูลทดสอบเขียนแทน

ผู้รับผิดชอบ: main agent; agents เพิ่ม 0 (อัปเดตเอกสารจุดเดียว ไม่เหมาะกับการทำขนาน); Memory none useful; Anti-Gravity ไม่เรียกเพิ่ม รอบนี้แก้เฉพาะรายงานใน envelope `mfu-vercel-local-20260929`, environment local documentation, Supabase ไม่เชื่อมต่อเพิ่มเติม

### Modal retry retention / receipt validation — 29 กันยายน 2026

ปิดช่องว่าง local เพิ่มเติม: เมื่อฟอร์มสร้าง payload, compressed evidence และ idempotency key สำหรับส่งแล้ว แจ้ง parent ให้รักษา component instance ไว้ ปิด modal หลัง ambiguous error จะซ่อนด้วย `display:none` แทน unmount เมื่อเปิดใหม่ในหน้าเดิมจะใช้ refs/state เดิม ก่อนส่งยังคง lazy load และ cancel ตามเดิม เมื่อได้รับ receipt ที่ถูกต้องจะปล่อย pending state เพื่อ cleanup ตาม lifecycle เดิม ไม่เพิ่ม dependency หรือเก็บข้อมูลติดต่อ/รูปลง browser storage ข้อความปิดระหว่างรอ retry เปลี่ยนเป็น “ปิดไว้ก่อน” และแจ้งว่าข้อมูลยังอยู่ในหน่วยความจำ

Client ตรวจ receipt ก่อนให้ฟอร์มล้าง attempt: ต้องมี `success:true`, รหัสผลตรวจที่ไม่ว่าง, สถานะที่รองรับ และ revision เป็น safe integer มากกว่า 0 HTTP success ที่ข้อมูลผิดรูปแบบถูกปฏิเสธเพื่อให้ retry ด้วย payload/key เดิม ผู้ตรวจ read-only 1 รายพบช่องว่างนี้และข้อจำกัด navigation

เพิ่ม regression source-contract ก่อน patch ซึ่งล้มเหลวตามเงื่อนไข unmount เดิม แล้วเพิ่ม API-client test ที่เรียกจริงผ่าน fetch mock สำหรับ malformed receipts และ retry สำเร็จ Regression รวม 128 รายการผ่าน และ Vite 6.4.3 production build ผ่านผ่าน guard โดยใช้ output `.codex-preview-local-20260929-retry` แยกจาก `dist` เพื่อไม่รบกวนบริการอ่าน Cloud ที่ผู้ใช้เปิดอยู่ มี MapLibre chunk warning เดิม `git diff --check` ผ่าน

ข้อจำกัด: source-contract ไม่พิสูจน์ React/browser lifecycle หรือ focus management จริง ยังต้องทดสอบ modal close/reopen ด้วย API จำลองที่ response หาย ไม่ส่งข้อมูลทดสอบเข้า production การ refresh/เปลี่ยน route ยังทำให้ parent และ attempt หาย ไม่มีการรักษา draft ข้าม navigation และ error ถาวรอาจทำให้ฟอร์มอยู่ในสถานะ retry จนกว่าจะยืนยันผลได้ ข้อความเตือนไม่ใช่การแก้ concurrent RPC หรือ navigation ทุกกรณี สถานะรวมยัง NO-GO

Task `mfu-vercel-local-20260929` · React/Node.js/Express · development/test · Supabase ไม่เชื่อมต่อ · main agent เป็นผู้แก้ทั้งหมด · read-only reviewer 1 · Memory none useful · Anti-Gravity guard denial เดิม ไม่มี bypass · ไม่ push/deploy

### Browser retry evidence — 29 กันยายน 2026

เพิ่ม `scripts/check-form-retry-browser.mjs` เป็น loopback harness ที่ bundle ฟอร์มและ API client จริงจาก source ปัจจุบันด้วย esbuild ในหน่วยความจำ ใช้ React wrapper จำลองเงื่อนไข keep-mounted ของ parent ไม่ใช้ทั้งหน้าแผนที่ กำหนด CSP ห้าม network connections และแทน fetch ด้วย API จำลอง ไม่อ่าน environment files ไม่ใช้ฐานข้อมูล คีย์ รูปจริง หรือข้อมูลติดต่อจริง

ตรวจด้วย browser/DOM: ส่งผลจำลองที่ค่าพิกัดและสารหนู 0 ppb ครั้งแรกได้รับ HTTP 503 แล้ว pending เป็น true; ปิด modal แล้วไม่เห็น controls ใน accessibility tree และ pending ยังอยู่; เปิดใหม่พิกัดเดิมยังอยู่และแก้ fields ไม่ได้ ครั้งที่สอง HTTP success แต่ receipt ขาด fields ยังคง pending และไม่แสดงสำเร็จ ครั้งที่สามได้ receipt ถูกต้องจึงปล่อย pending ปิดฟอร์ม และแสดงรหัสจำลอง ทั้งสามคำขอมี idempotency key และ serialized payload เดียวกันตาม summary ที่ตรวจจาก DOM เปิดฟอร์มหลังสำเร็จได้ค่าพิกัดว่าง และ cancel ก่อน submit แล้วเปิดใหม่ได้ค่าว่าง โดยจำนวนคำขอยังเท่าเดิม

นี่เป็น runtime evidence ของฟอร์ม/client กับ wrapper จำลองและไม่มีรูปแนบ ไม่ใช่การทดสอบทั้ง parent จริง, รูป/URL cleanup, double-click/in-flight cancellation, focus restoration, navigation/remount หรือ concurrent SQL ข้อจำกัดดังกล่าวและ production gates เดิมยังคงอยู่ ไม่ขยายผลเป็นการรับรองระบบ production

ปิดแท็บทดสอบและยืนยัน parent/command ของ process ก่อนยุติเฉพาะ owned harness tree ผ่าน guard ไม่หยุดบริการของผู้ใช้ ไม่ build ทับ dist ไม่ push/deploy Regression/build ล่าสุด 128 รายการผ่านจากรอบก่อน งานนี้ไม่มีการแก้ runtime แอปเพิ่ม; สถานะยัง NO-GO Main agent 1, agents เพิ่ม 0 เพราะเป็น flow ทดสอบลำดับเดียว; Memory none useful; ทักษะ Playwright ใช้ DOM verification และ easy-documents แยกหลักฐาน/ข้อจำกัดในรายงาน

### คงแผนที่เดิม / ปิดการเปิดเผย GEE errors — 29 กันยายน 2026

ผู้ใช้ยืนยัน “ไม่เปลี่ยน” จึงคงผู้ให้บริการและวิธีเรียกแผนที่เดิม ไม่เปลี่ยน URL ของ basemap ไม่สร้างบัญชีหรือเปิด billing ความเหมาะสมของ direct Google tiles สำหรับ production ยังไม่ยืนยัน แต่ไม่ใช้การเลือกผู้ให้บริการเป็นเหตุหยุดงาน local ส่วนอื่น

พบ API Earth Engine ส่งข้อความ exception จากผู้ให้บริการกลับสาธารณะ และบันทึก error ดิบ/URL ของ water tiles แก้ด้วย `server/geePublicErrors.js` ให้ตอบข้อความคงที่และ `Cache-Control: no-store` ใช้ HTTP 400/404/500/502 ที่รองรับเท่านั้น ค่าอื่นใช้ 502 คงข้อความ validation จาก parser ก่อนเรียกผู้ให้บริการ ไม่ส่งข้อความ exception ภายหลังการเรียกออกสาธารณะ นำ log ที่มี raw exception และ tile URL ออกจาก routes เหล่านี้ ไม่เปลี่ยนผลวิเคราะห์หรือ URL ที่จำเป็นใน response สำเร็จ การวินิจฉัยเหตุขัดข้องยังต้องมีระบบ structured telemetry ที่ไม่เก็บ secrets ในงานถัดไป

Tests เพิ่มตรวจ helper ผ่าน Express/HTTP บน loopback กับ status ที่รองรับและไม่รองรับ พร้อม source-contract ตรวจการนำไปใช้ใน catches/callbacks ไม่มีการจำลอง provider exception ผ่านทุก route จริง จึงไม่อ้างว่าเป็น GEE end-to-end หรือพิสูจน์ว่า API ทั้งระบบไม่มีข้อมูลรั่ว Regression รวม 130 รายการผ่าน และ Vite 6.4.3 build ผ่านใน `.codex-preview-local-20260929-gee-errors` โดยไม่ build ทับ dist มี chunk-size warning เดิม

Task `mfu-vercel-local-20260929` · project `mfu-water-7308d513` · root โปรเจกต์ MFU Water เดิม · action routine-process · environment test · Supabase ไม่เชื่อมต่อ · tests PID 27436 และ build PID 27464 จบ exit 0 · main agent เขียนทั้งหมด · agents เพิ่ม 0 (`not_parallelizable`: patch root cause จุดเดียวใน server และ verification ที่พึ่ง patch) · Memory none useful · Anti-Gravity guard denial เดิม ไม่ bypass · ทักษะ Vercel Functions ตรวจขอบเขต server และ easy-documents แยกหลักฐานจากข้อจำกัด สถานะยัง NO-GO ตาม production gates เดิม ไม่ push/deploy
