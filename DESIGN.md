# DESIGN.md - MFU Kok Water Watch (WattVision Telemetry Architecture)

## 1. Visual Theme & Atmosphere
ออกแบบตามพื้นฐาน **Sistema de Monitoreo "WattVision"** เพื่อถ่ายทอด **ความน่าเชื่อถือทางเทคนิค (Confiabilidad Técnica)** และ **การควบคุมข้อมูลจริง (Control)**. ไม่ใช่แอปโซเชียลมีเดียหรือเกม แต่เป็นระบบติดตามและเฝ้าระวังคุณภาพน้ำแม่น้ำกกแบบ **"Power BI / Telemetry Dashboard"** ที่ลดความซับซ้อนให้ชาวบ้าน อาสาสมัคร ผู้ประสานงาน และทีมวิจัย มฟล. ใช้งานได้จริงทั้งบน Laptop, Tablet และสมาร์ตโฟนภาคสนาม

## 2. Color Palette
- **Background Primario:** `#121212` (Dark Mode เพื่อประสิทธิภาพการมองเห็นและขับเน้นข้อมูลจริง/แผนที่/กราฟ)
- **Superficie de Tarjetas (Card Surface):** `#1E1E1E`
- **Acento Primario (Datos / Primary Data Accent):** `#00E5FF` (Cyan/Neon สำหรับกราฟ, KPI หลัก และปุ่มดำเนินการหลัก)
- **Acento de Alerta (Alert Accent):** `#FF453A` (Red สำหรับแจ้งเตือนค่าสารหนู `> 10 ppb` หรือรายการ `> 50 ppb` ที่ต้องเข้าคิวตรวจสอบ)
- **Acento Secundario (Live / Normal Accent):** `#32D74B` (Lime Green สำหรับสถานะเชื่อมต่อข้อมูลจริง / ค่าปกติ `<= 10 ppb`)
- **Texto Principal:** `#FFFFFF` (High contrast)
- **Texto Secundario:** `#98989D` (ป้ายกำกับและคำอธิบายรอง)
- **Borde Sutil (Subtle Border):** `#2C2C2E`
- **Hover de Tabla / Fila:** `#252525`
- **Fondo de Alerta:** `#3A1C1C` พร้อมเส้นขอบซ้าย `#FF453A`
- **แถบสีชุดทดสอบสารหนูภาคสนาม 9 ระดับ (Real Strip Swatches `R04`/`R06`):**
  - `0 ppb`: `#FBF9F2`
  - `5 ppb`: `#FEF3A9`
  - `10 ppb`: `#F7E752`
  - `30 ppb`: `#E8BE36`
  - `50 ppb`: `#DE9922`
  - `100 ppb`: `#C07128`
  - `200 ppb`: `#974E22`
  - `300 ppb`: `#683115`
  - `500 ppb`: `#3A1807`

## 3. Component Stylings
- **Tarjetas (Cards):** `border-radius: 16px`, พื้นหลัง `#1E1E1E`, `padding: 20px`, เส้นขอบ `1px solid #2C2C2E`
- **Gráficos (Charts):** เส้นกริด `#2C2C2E`, เส้นข้อมูลหลัก `#00E5FF` พร้อมไล่ระดับพื้นที่ (Area Gradient) ด้วย `#30D158` โดยไม่ใช้เส้นขอบหนาเกินจำเป็น
- **Tablas:** แถวมี `border-bottom: 1px solid #2C2C2E`, เมื่อ hover เปลี่ยนพื้นหลังเป็น `#252525`
- **Alertas:** กล่องพื้นหลัง `#3A1C1C`, ข้อความสี `#FF453A` และเส้นเน้นด้านซ้าย `#FF453A`

## 4. Typography
- **Títulos (Headings):** `Inter`, `Noto Sans Thai`, Semi Bold, `24px`
- **Métricas KPIs (`ppb`, `km²`, `แถว`, จำนวนจุดสำรวจ):** `JetBrains Mono` หรือ `Fira Code` (Monospace, `tabular-nums`), Bold, `32px`
- **Cuerpo (Body):** `Inter`, `Noto Sans Thai`, Regular, `14px`–`16px`

## 5. Layout Principles
- **Grid:** 12 คอลัมน์ (`12-column grid`)
- **Espaciado:** พหุคูณของ `8px` (`8px`, `16px`, `24px`, `32px`)
- **Dashboard Structure:**
  - แถวบน: 3 คอลัมน์ KPI หลัก (`4 + 4 + 4` คอลัมน์)
  - พื้นที่หลักด้านซ้าย (`8` คอลัมน์): แผนที่ดาวเทียม/กริดสำรวจ 1 กม. และกราฟแนวโน้มเทียบชุดข้อมูลเดียวกัน
  - แผงด้านขวา (`4` คอลัมน์): แผงแจ้งเตือน คิวตรวจสอบ `> 50 ppb` และการส่งต่อผู้ประสานงาน

## 6. Do's and Don'ts
- ✅ **Do:** ใช้กราฟพื้นที่ (Area Chart) เพื่อแสดงแนวโน้มของจุดตรวจที่เป็นชุดข้อมูลเดียวกัน พร้อมหน่วยวัดชัดเจน (`ppb`, `mg/L`, `km²`, `แถว`)
- ✅ **Do:** แสดงเฉพาะข้อมูลที่มีหลักฐานจริงใน `KokData/` พร้อมระบุรหัสหลักฐาน (`E01`–`E27`, `D01`–`D10`, `R01`–`R29`)
- ❌ **Don't:** ห้ามใช้พื้นหลังสีขาวสว่างจ้าหรือสีพาสเทลที่ลดทอนความคมชัดของแดชบอร์ดมอนิเตอร์ข้อมูล
- ❌ **Don't:** ห้ามปั้นข้อมูลเทียม ห้ามเปิดเผยชื่อ-เบอร์โทร-พิกัดบ้านรายครัวเรือนสู่สาธารณะ และห้ามบวกรวมตัวส่วนคนละชุด
