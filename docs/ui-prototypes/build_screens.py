# -*- coding: utf-8 -*-
"""
Generate 9 Production-Grade UI Prototypes for MFU Kok Water Watch
Specially tailored for rural Thai villagers and farmers who have zero technical background.
Warm Earthy Green theme (#F5F4ED, #195640, #213E32, #2E7D32, #DE9922, #A33228)
Extra-large touch targets (64-72px), high legibility typography (Noto Sans Thai),
Zero technical jargon (no NTU, ppb, GEDTM30 on farmer screens), real village landmarks.
"""

import os
import sys

# Ensure UTF-8 output
sys.stdout.reconfigure(encoding='utf-8')

OUTPUT_DIR = r"C:\Users\asus\Desktop\Fastwork\mfu kok water watch\docs\ui-prototypes\images"
os.makedirs(OUTPUT_DIR, exist_ok=True)

# -------------------------------------------------------------
# Common SVG Header & Footer
# -------------------------------------------------------------
def svg_wrapper(width, height, content, bg="#F5F4ED"):
    return f"""<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 {width} {height}" width="{width}" height="{height}">
  <defs>
    <style>
      @import url('https://fonts.googleapis.com/css2?family=Noto+Sans+Thai:wght@300;400;500;600;700;800&amp;display=swap');
      * {{ font-family: 'Noto Sans Thai', 'Segoe UI', sans-serif; }}
      .bold {{ font-weight: 700; }}
      .semibold {{ font-weight: 600; }}
      .medium {{ font-weight: 500; }}
      .regular {{ font-weight: 400; }}
      .shadow {{ filter: drop-shadow(0px 4px 12px rgba(0,0,0,0.08)); }}
      .shadow-lg {{ filter: drop-shadow(0px 8px 24px rgba(0,0,0,0.14)); }}
      .btn-pulse {{ animation: pulse 2s infinite; }}
    </style>
    <linearGradient id="grad-green" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0%" stop-color="#195640"/>
      <stop offset="100%" stop-color="#113D2E"/>
    </linearGradient>
    <linearGradient id="grad-safe" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0%" stop-color="#E8F5E9"/>
      <stop offset="100%" stop-color="#C8E6C9"/>
    </linearGradient>
    <linearGradient id="grad-danger" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0%" stop-color="#FFEBEE"/>
      <stop offset="100%" stop-color="#FFCDD2"/>
    </linearGradient>
    <linearGradient id="river-grad" x1="0" y1="0" x2="1" y2="0">
      <stop offset="0%" stop-color="#72B5CC"/>
      <stop offset="50%" stop-color="#4A9BB8"/>
      <stop offset="100%" stop-color="#3182A0"/>
    </linearGradient>
    <linearGradient id="flood-water" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0%" stop-color="#1976D2" stop-opacity="0.6"/>
      <stop offset="100%" stop-color="#0D47A1" stop-opacity="0.8"/>
    </linearGradient>
  </defs>
  <rect width="{width}" height="{height}" fill="{bg}"/>
  {content}
</svg>"""

# ==============================================================================
# SCREEN 01: แผนที่น้ำกกใกล้บ้าน (หน้าหลักชาวบ้านบนมือถือ - ดูน้ำวันนี้ ปลอดภัยไหม)
# Viewport: Mobile Frame 480 x 960 (Rendered in centered phone layout 1200 x 960)
# ==============================================================================
def screen_01_map():
    # We display a realistic smartphone device layout on warm background
    content = """
    <!-- Outer Stage Background & Title for non-tech users -->
    <rect x="0" y="0" width="1200" height="960" fill="#EBE9DF"/>
    
    <!-- Title Header on Canvas -->
    <text x="60" y="56" fill="#195640" font-size="28" font-weight="800">🌊 น้ำกกใกล้บ้าน — หน้าหลักสำหรับชาวบ้านและเกษตรกร (บนมือถือ)</text>
    <text x="60" y="90" fill="#556B60" font-size="16" font-weight="500">ดูสถานะน้ำวันนี้ได้ทันที ตัวหนังสือใหญ่ ปุ่มสัมผัส 68px แตะง่าย ไม่ต้องมีความรู้เรื่องคอมพิวเตอร์</text>

    <!-- Phone Mockup Container (Width: 440, Height: 820, Centered at x=380, y=110) -->
    <g transform="translate(380, 110)">
      <!-- Phone Shadow & Shell -->
      <rect x="-6" y="-6" width="452" height="832" rx="42" fill="#2D3732" opacity="0.15" class="shadow-lg"/>
      <rect x="0" y="0" width="440" height="820" rx="36" fill="#FFFFFF" stroke="#D0D7D0" stroke-width="3"/>
      
      <!-- Top Speaker & Camera Notch -->
      <rect x="150" y="10" width="140" height="22" rx="11" fill="#213E32"/>
      <circle cx="270" cy="21" r="4.5" fill="#3A5C4D"/>

      <!-- App Header: Green Banner -->
      <rect x="0" y="38" width="440" height="74" fill="url(#grad-green)"/>
      <text x="24" y="72" fill="#FFFFFF" font-size="22" font-weight="700">💧 น้ำกกใกล้บ้าน</text>
      <text x="24" y="96" fill="#D2E7DC" font-size="14" font-weight="500">📍 บ้านท่าตอน หมู่ 3 (เชียงใหม่-เชียงราย)</text>
      <!-- Help / Sound Icon Button -->
      <rect x="360" y="54" width="56" height="42" rx="21" fill="rgba(255,255,255,0.2)"/>
      <text x="375" y="81" font-size="20">🔊</text>

      <!-- 1. BIG TODAY STATUS BANNER (The #1 thing villagers care about) -->
      <g transform="translate(18, 126)">
        <rect x="0" y="0" width="404" height="110" rx="16" fill="#E8F5E9" stroke="#A5D6A7" stroke-width="2" class="shadow"/>
        <circle cx="48" cy="48" r="28" fill="#2E7D32"/>
        <text x="33" y="58" fill="#FFFFFF" font-size="30">✓</text>
        
        <text x="90" y="42" fill="#1B5E20" font-size="20" font-weight="800">คุณภาพน้ำวันนี้: ปลอดภัย</text>
        <text x="90" y="68" fill="#2E7D32" font-size="14" font-weight="600">ใช้อาบ ซักล้าง รดผัก เลี้ยงปลาได้ปกติ</text>
        <text x="90" y="92" fill="#4B6B56" font-size="12" font-weight="400">💧 ถ้าจะดื่มกิน แนะนำให้ต้มหรือกรองก่อน • ตรวจล่าสุดเมื่อเช้า</text>
      </g>

      <!-- 2. REALISTIC RIVER MAP AREA (With local landmarks in plain Thai) -->
      <g transform="translate(18, 248)">
        <rect x="0" y="0" width="404" height="340" rx="16" fill="#F4F8F4" stroke="#D8DFD5" stroke-width="1.5"/>
        
        <!-- Mountain & Land Contours -->
        <path d="M 0,40 Q 100,20 200,60 T 404,30 L 404,0 L 0,0 Z" fill="#E4EFE7" opacity="0.6"/>
        <path d="M 0,340 Q 150,300 250,320 T 404,290 L 404,340 L 0,340 Z" fill="#E4EFE7" opacity="0.6"/>

        <!-- River Kok Winding Path -->
        <path d="M 20,290 C 80,260 140,240 180,180 C 220,120 280,90 390,70" fill="none" stroke="url(#river-grad)" stroke-width="36" stroke-linecap="round"/>
        <path d="M 20,290 C 80,260 140,240 180,180 C 220,120 280,90 390,70" fill="none" stroke="#FFFFFF" stroke-width="2" stroke-dasharray="8 8" opacity="0.7"/>
        <text x="260" y="125" fill="#1A5B75" font-size="13" font-weight="700" transform="rotate(-15, 260, 125)">แม่น้ำกก (ไหลไปเชียงราย)</text>

        <!-- Bridge Landmark -->
        <rect x="180" y="150" width="16" height="50" rx="3" fill="#8D6E63" transform="rotate(35, 180, 150)"/>
        <text x="135" y="145" fill="#5D4037" font-size="11" font-weight="700">สะพานท่าตอน</text>

        <!-- Villager Landmark Pin 1: วัดท่าตอน -->
        <g transform="translate(90, 80)">
          <rect x="-10" y="-12" width="105" height="26" rx="13" fill="#FFFFFF" stroke="#DE9922" stroke-width="1.5" class="shadow"/>
          <text x="0" y="6" font-size="14">🛕</text>
          <text x="22" y="6" fill="#213E32" font-size="12" font-weight="700">วัดท่าตอน</text>
        </g>

        <!-- Villager Landmark Pin 2: ท่าเรือท่องเที่ยว -->
        <g transform="translate(50, 210)">
          <rect x="-10" y="-12" width="115" height="26" rx="13" fill="#FFFFFF" stroke="#3182A0" stroke-width="1.5" class="shadow"/>
          <text x="0" y="6" font-size="14">🚤</text>
          <text x="22" y="6" fill="#213E32" font-size="12" font-weight="700">ท่าเรือท่าตอน</text>
        </g>

        <!-- Water Testing Point Pin: ท่าน้ำหน้าวัด (SAFE GREEN) -->
        <g transform="translate(195, 175)">
          <circle cx="0" cy="0" r="18" fill="#2E7D32" stroke="#FFFFFF" stroke-width="3" class="shadow"/>
          <text x="-9" y="7" fill="#FFFFFF" font-size="14" font-weight="800">✓</text>
          <!-- Callout -->
          <rect x="22" y="-16" width="150" height="34" rx="8" fill="#FFFFFF" stroke="#2E7D32" stroke-width="1.5" class="shadow"/>
          <text x="32" y="0" fill="#1B5E20" font-size="12" font-weight="700">จุดตรวจหน้าวัด (หมู่ 3)</text>
          <text x="32" y="14" fill="#556B60" font-size="10">ปลอดภัย • ใช้รดผักได้</text>
        </g>

        <!-- Villager Landmark Pin 3: โรงเรียนบ้านท่าตอน -->
        <g transform="translate(280, 240)">
          <rect x="-10" y="-12" width="115" height="26" rx="13" fill="#FFFFFF" stroke="#DE9922" stroke-width="1.5" class="shadow"/>
          <text x="0" y="6" font-size="14">🏫</text>
          <text x="22" y="6" fill="#213E32" font-size="12" font-weight="700">โรงเรียนท่าตอน</text>
        </g>

        <!-- Map Meaning Guide (No technical jargon!) -->
        <g transform="translate(12, 296)">
          <rect x="0" y="0" width="380" height="36" rx="8" fill="rgba(255,255,255,0.92)" stroke="#D8DFD5"/>
          <circle cx="20" cy="18" r="8" fill="#2E7D32"/>
          <text x="34" y="22" fill="#213E32" font-size="11" font-weight="600">เขียว = น้ำปกติ</text>
          
          <circle cx="140" cy="18" r="8" fill="#DE9922"/>
          <text x="154" y="22" fill="#213E32" font-size="11" font-weight="600">ส้ม = ควรระวัง</text>

          <circle cx="255" cy="18" r="8" fill="#A33228"/>
          <text x="269" y="22" fill="#213E32" font-size="11" font-weight="600">แดง = ห้ามดื่ม!</text>
        </g>
      </g>

      <!-- 3. BIG HERO ACTION BUTTON (68px high - impossible for farmer to miss!) -->
      <g transform="translate(18, 604)">
        <rect x="0" y="0" width="404" height="68" rx="20" fill="#DE9922" stroke="#B87B12" stroke-width="2" class="shadow"/>
        <circle cx="44" cy="34" r="22" fill="#FFFFFF"/>
        <text x="31" y="43" font-size="24">📸</text>
        <text x="80" y="32" fill="#213E32" font-size="18" font-weight="800">ส่งผลตรวจน้ำของคุณ</text>
        <text x="80" y="54" fill="#4B3A10" font-size="13" font-weight="600">กดตรงนี้เพื่อถ่ายรูปกระดาษตรวจน้ำ</text>
        <text x="366" y="42" fill="#213E32" font-size="24" font-weight="700">➔</text>
      </g>

      <!-- 4. TWO QUICK HELPER CARDS (Emergency & Evacuation) -->
      <g transform="translate(18, 686)">
        <!-- Left: Flood Escape -->
        <rect x="0" y="0" width="195" height="58" rx="14" fill="#E3F2FD" stroke="#90CAF9" stroke-width="1.5"/>
        <text x="14" y="28" font-size="20">🏃</text>
        <text x="44" y="26" fill="#0D47A1" font-size="14" font-weight="700">จุดหนีน้ำท่วม</text>
        <text x="44" y="46" fill="#1565C0" font-size="11">ดูศาลาปลอดภัยใกล้บ้าน</text>

        <!-- Right: Call Village Leader -->
        <rect x="209" y="0" width="195" height="58" rx="14" fill="#FFF3E0" stroke="#FFE082" stroke-width="1.5"/>
        <text x="223" y="28" font-size="20">📞</text>
        <text x="253" y="26" fill="#E65100" font-size="14" font-weight="700">โทรหาผู้ใหญ่บ้าน</text>
        <text x="253" y="46" fill="#BF360C" font-size="11">ขอแผ่นตรวจ / แจ้งเหตุด่วน</text>
      </g>

      <!-- 5. BOTTOM NAVIGATION BAR (Big clear touch buttons) -->
      <g transform="translate(0, 756)">
        <rect x="0" y="0" width="440" height="64" rx="0" fill="#FFFFFF" stroke="#E0E6E0" stroke-width="1"/>
        
        <!-- Tab 1: Home (Active) -->
        <g transform="translate(30, 10)">
          <text x="16" y="22" font-size="18">🏠</text>
          <text x="6" y="42" fill="#195640" font-size="11" font-weight="700">หน้าหลัก</text>
          <circle cx="26" cy="48" r="2.5" fill="#195640"/>
        </g>

        <!-- Tab 2: Map -->
        <g transform="translate(140, 10)">
          <text x="16" y="22" font-size="18">🗺️</text>
          <text x="6" y="42" fill="#789084" font-size="11" font-weight="500">แผนที่น้ำ</text>
        </g>

        <!-- Tab 3: Evacuation -->
        <g transform="translate(250, 10)">
          <text x="16" y="22" font-size="18">⚠️</text>
          <text x="3" y="42" fill="#789084" font-size="11" font-weight="500">เตือนภัยน้ำ</text>
        </g>

        <!-- Tab 4: Guide -->
        <g transform="translate(355, 10)">
          <text x="16" y="22" font-size="18">📖</text>
          <text x="4" y="42" fill="#789084" font-size="11" font-weight="500">วิธีตรวจ</text>
        </g>
      </g>
    </g>

    <!-- Side Notes for Development Planning (Excalidraw Context) -->
    <g transform="translate(860, 160)">
      <rect x="0" y="0" width="280" height="340" rx="16" fill="#FFFFFF" stroke="#D8DFD5" class="shadow"/>
      <rect x="0" y="0" width="280" height="44" rx="16" fill="#195640"/>
      <text x="18" y="28" fill="#FFFFFF" font-size="15" font-weight="700">📌 จุดเด่นสำหรับชาวบ้าน (R01, R04)</text>
      
      <text x="18" y="75" fill="#213E32" font-size="13" font-weight="700">1. ไร้ศัพท์เทคนิค (No NTU/ppb):</text>
      <text x="18" y="95" fill="#556B60" font-size="12">บอกผลตรงไปตรงมา "ปลอดภัย / ระวัง"</text>
      
      <text x="18" y="130" fill="#213E32" font-size="13" font-weight="700">2. อิงแลนด์มาร์กชุมชนจริง:</text>
      <text x="18" y="150" fill="#556B60" font-size="12">วัดท่าตอน, ท่าเรือ, โรงเรียน, สะพาน</text>

      <text x="18" y="185" fill="#213E32" font-size="13" font-weight="700">3. ปุ่มกดขนาด 68px:</text>
      <text x="18" y="205" fill="#556B60" font-size="12">เกษตรกรมือเปื้อนหรือผู้สูงอายุแตะสะดวก</text>

      <text x="18" y="240" fill="#213E32" font-size="13" font-weight="700">4. ฟังเสียงบรรยายได้:</text>
      <text x="18" y="260" fill="#556B60" font-size="12">มีปุ่มลำโพงอ่านออกเสียงสำหรับคนไม่อ่านหนังสือ</text>
    </g>
    """
    return svg_wrapper(1200, 960, content)

# ==============================================================================
# SCREEN 02: แบบฟอร์มรายงานผลตรวจน้ำ 6 มิติ (สำหรับชาวบ้าน - ทำง่ายใน 3 ก้าว)
# Viewport: Mobile Frame 480 x 960 (Rendered in centered phone layout 1200 x 960)
# ==============================================================================
def screen_02_survey():
    content = """
    <rect x="0" y="0" width="1200" height="960" fill="#EBE9DF"/>
    
    <text x="60" y="56" fill="#195640" font-size="28" font-weight="800">📝 แบบฟอร์มส่งผลตรวจน้ำ — ใช้งานง่ายสำหรับเกษตรกร</text>
    <text x="60" y="90" fill="#556B60" font-size="16" font-weight="500">เลือกสีที่ตาเห็น ไม่ต้องพิมพ์ตัวเลข มีรูปช่วยบอกแหล่งน้ำ ถ่ายภาพยืนยันได้ทันที</text>

    <!-- Phone Mockup Container -->
    <g transform="translate(380, 110)">
      <rect x="-6" y="-6" width="452" height="832" rx="42" fill="#2D3732" opacity="0.15" class="shadow-lg"/>
      <rect x="0" y="0" width="440" height="820" rx="36" fill="#FFFFFF" stroke="#D0D7D0" stroke-width="3"/>
      
      <!-- Top Speaker -->
      <rect x="150" y="10" width="140" height="22" rx="11" fill="#213E32"/>

      <!-- App Header: Back Button + Title -->
      <rect x="0" y="38" width="440" height="66" fill="#FFFFFF" stroke="#E0E6E0" stroke-width="1"/>
      <circle cx="36" cy="71" r="20" fill="#F0F4F1"/>
      <text x="28" y="77" fill="#195640" font-size="18" font-weight="700">‹</text>
      <text x="70" y="76" fill="#213E32" font-size="19" font-weight="800">ส่งผลตรวจน้ำของคุณ</text>
      <!-- Audio Readout -->
      <rect x="360" y="50" width="56" height="42" rx="21" fill="#E8F0EC"/>
      <text x="375" y="77" font-size="18">🔊</text>

      <!-- Scrollable Form Container Simulation -->
      <g transform="translate(18, 116)">
        
        <!-- STEP 1: CHOOSE TEST STRIP COLOR (Visually obvious 4 buckets!) -->
        <rect x="0" y="0" width="404" height="170" rx="14" fill="#FAFAFA" stroke="#D8DFD5" stroke-width="1.5"/>
        <rect x="0" y="0" width="404" height="36" rx="14" fill="#E8F0EC"/>
        <text x="14" y="24" fill="#195640" font-size="14" font-weight="700">ก้าวที่ 1: แผ่นตรวจของคุณเปลี่ยนเป็นสีอะไร? (แตะเลือก)</text>

        <!-- 4 Color Choice Blocks (Large touch friendly 85px wide) -->
        <!-- 1. Green / Safe -->
        <g transform="translate(12, 48)">
          <rect x="0" y="0" width="88" height="106" rx="10" fill="#FFFFFF" stroke="#2E7D32" stroke-width="2.5" class="shadow"/>
          <rect x="10" y="10" width="68" height="34" rx="6" fill="#DFF0D8" stroke="#468847"/>
          <text x="44" y="32" fill="#2E7D32" font-size="16" font-weight="800" text-anchor="middle">✓ ปลอดภัย</text>
          <text x="44" y="66" fill="#213E32" font-size="12" font-weight="700" text-anchor="middle">สีไม่เปลี่ยน</text>
          <text x="44" y="82" fill="#556B60" font-size="10" text-anchor="middle">หรือเหลืองอ่อน</text>
          <circle cx="44" cy="96" r="6" fill="#2E7D32"/>
        </g>

        <!-- 2. Amber / Caution -->
        <g transform="translate(108, 48)">
          <rect x="0" y="0" width="88" height="106" rx="10" fill="#FFFFFF" stroke="#D8DFD5"/>
          <rect x="10" y="10" width="68" height="34" rx="6" fill="#F8E5B8" stroke="#D19C24"/>
          <text x="44" y="66" fill="#213E32" font-size="12" font-weight="700" text-anchor="middle">สีส้มอ่อน</text>
          <text x="44" y="82" fill="#DE9922" font-size="10" font-weight="600" text-anchor="middle">เฝ้าระวัง</text>
          <circle cx="44" cy="96" r="6" fill="#FFFFFF" stroke="#CCC"/>
        </g>

        <!-- 3. Dark Amber / Danger -->
        <g transform="translate(204, 48)">
          <rect x="0" y="0" width="88" height="106" rx="10" fill="#FFFFFF" stroke="#D8DFD5"/>
          <rect x="10" y="10" width="68" height="34" rx="6" fill="#E89B58" stroke="#B85818"/>
          <text x="44" y="66" fill="#213E32" font-size="12" font-weight="700" text-anchor="middle">สีส้มเข้ม</text>
          <text x="44" y="82" fill="#C45A10" font-size="10" font-weight="600" text-anchor="middle">ห้ามดื่ม!</text>
          <circle cx="44" cy="96" r="6" fill="#FFFFFF" stroke="#CCC"/>
        </g>

        <!-- 4. Brown-Black / Critical -->
        <g transform="translate(300, 48)">
          <rect x="0" y="0" width="92" height="106" rx="10" fill="#FFFFFF" stroke="#D8DFD5"/>
          <rect x="10" y="10" width="72" height="34" rx="6" fill="#7A4328" stroke="#4A2010"/>
          <text x="46" y="66" fill="#213E32" font-size="12" font-weight="700" text-anchor="middle">น้ำตาล-ดำ</text>
          <text x="46" y="82" fill="#A33228" font-size="10" font-weight="700" text-anchor="middle">อันตรายมาก</text>
          <circle cx="46" cy="96" r="6" fill="#FFFFFF" stroke="#CCC"/>
        </g>

        <!-- STEP 2: WATER SOURCE (The 5 real Thaton sources with big visual buttons) -->
        <g transform="translate(0, 182)">
          <rect x="0" y="0" width="404" height="144" rx="14" fill="#FAFAFA" stroke="#D8DFD5" stroke-width="1.5"/>
          <rect x="0" y="0" width="404" height="36" rx="14" fill="#E8F0EC"/>
          <text x="14" y="24" fill="#195640" font-size="14" font-weight="700">ก้าวที่ 2: น้ำนี้ตักมาจากที่ไหน? (แตะเลือก)</text>

          <!-- 5 Big Source Buttons -->
          <!-- 1. Bottled Water (Used by 91 households!) -->
          <g transform="translate(10, 46)">
            <rect x="0" y="0" width="120" height="42" rx="10" fill="#195640" stroke="#195640"/>
            <text x="12" y="27" font-size="18">🍶</text>
            <text x="36" y="26" fill="#FFFFFF" font-size="12" font-weight="700">น้ำถัง / น้ำขวด</text>
          </g>

          <!-- 2. Tap Water -->
          <g transform="translate(140, 46)">
            <rect x="0" y="0" width="120" height="42" rx="10" fill="#FFFFFF" stroke="#CCD5CC"/>
            <text x="12" y="27" font-size="18">🚰</text>
            <text x="36" y="26" fill="#213E32" font-size="12" font-weight="600">ประปาหมู่บ้าน</text>
          </g>

          <!-- 3. Well Water -->
          <g transform="translate(270, 46)">
            <rect x="0" y="0" width="120" height="42" rx="10" fill="#FFFFFF" stroke="#CCD5CC"/>
            <text x="12" y="27" font-size="18">💧</text>
            <text x="36" y="26" fill="#213E32" font-size="12" font-weight="600">บ่อบาดาล</text>
          </g>

          <!-- 4. River Kok -->
          <g transform="translate(65, 94)">
            <rect x="0" y="0" width="130" height="42" rx="10" fill="#FFFFFF" stroke="#CCD5CC"/>
            <text x="12" y="27" font-size="18">🌊</text>
            <text x="36" y="26" fill="#213E32" font-size="12" font-weight="600">แม่น้ำกกโดยตรง</text>
          </g>

          <!-- 5. Rainwater -->
          <g transform="translate(205, 94)">
            <rect x="0" y="0" width="130" height="42" rx="10" fill="#FFFFFF" stroke="#CCD5CC"/>
            <text x="12" y="27" font-size="18">🌧️</text>
            <text x="36" y="26" fill="#213E32" font-size="12" font-weight="600">น้ำฝนรองใส่โอ่ง</text>
          </g>
        </g>

        <!-- STEP 3: DUAL PHOTO UPLOAD (Big Camera Tap Targets) -->
        <g transform="translate(0, 338)">
          <rect x="0" y="0" width="404" height="142" rx="14" fill="#FAFAFA" stroke="#D8DFD5" stroke-width="1.5"/>
          <rect x="0" y="0" width="404" height="36" rx="14" fill="#E8F0EC"/>
          <text x="14" y="24" fill="#195640" font-size="14" font-weight="700">ก้าวที่ 3: ถ่ายรูปยืนยันผล (กดรูปกล้อง)</text>

          <!-- Box 1: Strip Photo -->
          <g transform="translate(14, 46)">
            <rect x="0" y="0" width="180" height="84" rx="10" fill="#E8F0EC" stroke="#195640" stroke-width="1.5" stroke-dasharray="4 4"/>
            <circle cx="90" cy="34" r="18" fill="#195640"/>
            <text x="81" y="41" font-size="16">📷</text>
            <text x="90" y="66" fill="#195640" font-size="12" font-weight="700" text-anchor="middle">1. รูปแผ่นตรวจคู่แถบสี</text>
            <text x="90" y="78" fill="#4B6B56" font-size="10" text-anchor="middle">✓ แนบแล้ว (IMG_0412.jpg)</text>
          </g>

          <!-- Box 2: Source Photo -->
          <g transform="translate(210, 46)">
            <rect x="0" y="0" width="180" height="84" rx="10" fill="#FFFFFF" stroke="#CCD5CC" stroke-dasharray="4 4"/>
            <circle cx="90" cy="34" r="18" fill="#E8F0EC"/>
            <text x="81" y="41" font-size="16">📷</text>
            <text x="90" y="66" fill="#213E32" font-size="12" font-weight="700" text-anchor="middle">2. รูปจุดที่ตักน้ำ</text>
            <text x="90" y="78" fill="#888" font-size="10" text-anchor="middle">(กดเพื่อเปิดกล้อง)</text>
          </g>
        </g>

        <!-- STEP 4: VILLAGE SELECTION & GPS -->
        <g transform="translate(0, 492)">
          <rect x="0" y="0" width="404" height="74" rx="14" fill="#E8F5E9" stroke="#A5D6A7" stroke-width="1.5"/>
          <text x="16" y="26" font-size="18">📍</text>
          <text x="44" y="26" fill="#1B5E20" font-size="13" font-weight="700">ตำแหน่งของคุณ: บ้านท่าตอน หมู่ 3</text>
          <text x="44" y="44" fill="#2E7D32" font-size="11">ดึงพิกัดอัตโนมัติจากมือถือ • ไม่เปิดเผยชื่อหรือเบอร์โทรสู่สาธารณะ</text>
          <rect x="314" y="16" width="76" height="38" rx="8" fill="#FFFFFF" stroke="#2E7D32"/>
          <text x="352" y="40" fill="#1B5E20" font-size="11" font-weight="700" text-anchor="middle">เปลี่ยนหมู่บ้าน</text>
        </g>

        <!-- BIG SUBMIT BUTTON (70px high - bold and tactile) -->
        <g transform="translate(0, 580)">
          <rect x="0" y="0" width="404" height="70" rx="20" fill="#195640" stroke="#113D2E" stroke-width="2" class="shadow"/>
          <text x="202" y="38" fill="#FFFFFF" font-size="20" font-weight="800" text-anchor="middle">✓ กดส่งผลตรวจน้ำตรงนี้</text>
          <text x="202" y="56" fill="#D2E7DC" font-size="12" font-weight="500" text-anchor="middle">ข้อมูลจะส่งไปยัง อสม. และอาจารย์ มฟล. ทันที</text>
        </g>
      </g>
    </g>

    <!-- Side Notes for Technical & Development Planning -->
    <g transform="translate(860, 160)">
      <rect x="0" y="0" width="280" height="340" rx="16" fill="#FFFFFF" stroke="#D8DFD5" class="shadow"/>
      <rect x="0" y="0" width="280" height="44" rx="16" fill="#195640"/>
      <text x="18" y="28" fill="#FFFFFF" font-size="15" font-weight="700">📌 จุดเด่นแบบฟอร์ม (R05, R10)</text>
      
      <text x="18" y="75" fill="#213E32" font-size="13" font-weight="700">1. รวม 9 ระดับเป็น 4 โซนสีชัดเจน:</text>
      <text x="18" y="95" fill="#556B60" font-size="12">ชาวบ้านเลือกสีได้ทันที ไม่สับสนตัวเลข ppb</text>
      
      <text x="18" y="130" fill="#213E32" font-size="13" font-weight="700">2. มีน้ำถัง/น้ำขวด (ข้อมูลจริง):</text>
      <text x="18" y="150" fill="#556B60" font-size="12">ตรงกับสถิติท่าตอน 91 หลังคาบริโภคน้ำถัง</text>

      <text x="18" y="185" fill="#213E32" font-size="13" font-weight="700">3. ถ่ายภาพคู่ (Dual Photo):</text>
      <text x="18" y="205" fill="#556B60" font-size="12">ภาพกระดาษตรวจ + สภาพแหล่งน้ำ</text>

      <text x="18" y="240" fill="#213E32" font-size="13" font-weight="700">4. ป้องกันข้อมูลส่วนบุคคล (PDPA):</text>
      <text x="18" y="260" fill="#556B60" font-size="12">ซ่อนชื่อ/เบอร์ เผยแพร่เฉพาะรหัสตัวอย่าง</text>
    </g>
    """
    return svg_wrapper(1200, 960, content)

# ==============================================================================
# SCREEN 03: รายละเอียดจุดตรวจ & แนวโน้ม (เข้าใจง่าย น้ำนี้เอาไปทำอะไรได้บ้าง)
# Viewport: Mobile Frame 480 x 960
# ==============================================================================
def screen_03_detail():
    content = """
    <rect x="0" y="0" width="1200" height="960" fill="#EBE9DF"/>
    
    <text x="60" y="56" fill="#195640" font-size="28" font-weight="800">🔍 รายละเอียดจุดตรวจ — แนะนำการใช้น้ำชัดเจน</text>
    <text x="60" y="90" fill="#556B60" font-size="16" font-weight="500">ชาวบ้านรู้ทันทีว่าน้ำนี้ใช้รดผัก เลี้ยงสัตว์ หรือต้มดื่มได้หรือไม่ พร้อมประวัติที่ตรวจมา</text>

    <g transform="translate(380, 110)">
      <rect x="-6" y="-6" width="452" height="832" rx="42" fill="#2D3732" opacity="0.15" class="shadow-lg"/>
      <rect x="0" y="0" width="440" height="820" rx="36" fill="#FFFFFF" stroke="#D0D7D0" stroke-width="3"/>
      <rect x="150" y="10" width="140" height="22" rx="11" fill="#213E32"/>

      <!-- Header -->
      <rect x="0" y="38" width="440" height="66" fill="#FFFFFF" stroke="#E0E6E0" stroke-width="1"/>
      <circle cx="36" cy="71" r="20" fill="#F0F4F1"/>
      <text x="28" y="77" fill="#195640" font-size="18" font-weight="700">‹</text>
      <text x="70" y="76" fill="#213E32" font-size="19" font-weight="800">ผลตรวจจุด: ท่าน้ำวัดท่าตอน</text>

      <g transform="translate(18, 116)">
        <!-- 1. BIG STATUS BADGE -->
        <rect x="0" y="0" width="404" height="110" rx="16" fill="#E8F5E9" stroke="#81C784" stroke-width="2"/>
        <circle cx="48" cy="48" r="28" fill="#2E7D32"/>
        <text x="35" y="57" fill="#FFFFFF" font-size="28">✓</text>
        <text x="88" y="42" fill="#1B5E20" font-size="20" font-weight="800">น้ำสะอาด อยู่ในเกณฑ์ปกติ</text>
        <text x="88" y="66" fill="#2E7D32" font-size="14" font-weight="600">รหัสจุด: W-042 (บ้านท่าตอน หมู่ 3)</text>
        <text x="88" y="90" fill="#556B60" font-size="12">ตรวจเมื่อ: 15 ต.ค. 2569 เวลา 08:30 น. (โดย อสม.)</text>

        <!-- 2. "WHAT CAN I USE THIS WATER FOR?" (ACTIONABLE TABLE FOR FARMERS) -->
        <g transform="translate(0, 124)">
          <rect x="0" y="0" width="404" height="216" rx="16" fill="#FAFAFA" stroke="#D8DFD5" stroke-width="1.5"/>
          <text x="16" y="28" fill="#195640" font-size="15" font-weight="700">💡 น้ำจากจุดนี้ ใช้ทำอะไรได้บ้าง?</text>

          <!-- Row 1: Drinking -->
          <g transform="translate(14, 42)">
            <rect x="0" y="0" width="376" height="48" rx="10" fill="#FFFFFF" stroke="#E0E6E0"/>
            <text x="14" y="31" font-size="20">☕</text>
            <text x="44" y="24" fill="#213E32" font-size="13" font-weight="700">ดื่มกิน ชงชา</text>
            <text x="44" y="40" fill="#556B60" font-size="11">ดื่มได้ แต่ต้องต้มสุกหรือผ่านเครื่องกรองก่อน</text>
            <rect x="306" y="10" width="58" height="28" rx="14" fill="#E8F5E9"/>
            <text x="335" y="28" fill="#2E7D32" font-size="11" font-weight="700" text-anchor="middle">ดื่มได้ (ต้ม)</text>
          </g>

          <!-- Row 2: Bathing / Washing -->
          <g transform="translate(14, 96)">
            <rect x="0" y="0" width="376" height="48" rx="10" fill="#FFFFFF" stroke="#E0E6E0"/>
            <text x="14" y="31" font-size="20">🚿</text>
            <text x="44" y="24" fill="#213E32" font-size="13" font-weight="700">อาบน้ำ ซักผ้า ล้างจาน</text>
            <text x="44" y="40" fill="#556B60" font-size="11">ใช้ได้ตามปกติ ไม่ระคายเคืองผิวหนัง</text>
            <rect x="306" y="10" width="58" height="28" rx="14" fill="#E8F5E9"/>
            <text x="335" y="28" fill="#2E7D32" font-size="11" font-weight="700" text-anchor="middle">ใช้ได้ปกติ</text>
          </g>

          <!-- Row 3: Farming / Fish -->
          <g transform="translate(14, 150)">
            <rect x="0" y="0" width="376" height="48" rx="10" fill="#FFFFFF" stroke="#E0E6E0"/>
            <text x="14" y="31" font-size="20">🥬</text>
            <text x="44" y="24" fill="#213E32" font-size="13" font-weight="700">รดแปลงผัก เลี้ยงปลาในกระชัง</text>
            <text x="44" y="40" fill="#556B60" font-size="11">ปลอดภัยดี ไม่มีสารเคมีสะสมในพืชผล</text>
            <rect x="306" y="10" width="58" height="28" rx="14" fill="#E8F5E9"/>
            <text x="335" y="28" fill="#2E7D32" font-size="11" font-weight="700" text-anchor="middle">ปลอดภัย</text>
          </g>
        </g>

        <!-- 3. TREND OVER TIME (Explained in plain Thai: "4 months of steady improvement") -->
        <g transform="translate(0, 354)">
          <rect x="0" y="0" width="404" height="160" rx="16" fill="#FFFFFF" stroke="#D8DFD5" stroke-width="1.5"/>
          <text x="16" y="28" fill="#195640" font-size="15" font-weight="700">📈 ประวัติความสะอาด 4 เดือนย้อนหลัง</text>
          <text x="16" y="48" fill="#2E7D32" font-size="12" font-weight="600">✓ คุณภาพน้ำดีขึ้นอย่างต่อเนื่อง ไม่พบสารหนูสะสม</text>

          <!-- Friendly Trend Visual: 4 monthly circles with connecting lines -->
          <g transform="translate(20, 68)">
            <!-- Line -->
            <line x1="30" y1="20" x2="330" y2="20" stroke="#C8E6C9" stroke-width="6"/>
            <line x1="30" y1="20" x2="330" y2="20" stroke="#2E7D32" stroke-width="3" stroke-dasharray="6 6"/>

            <!-- Month 1: Jan -->
            <circle cx="30" cy="20" r="16" fill="#FFF3E0" stroke="#DE9922" stroke-width="2"/>
            <text x="30" y="24" fill="#DE9922" font-size="10" font-weight="700" text-anchor="middle">ระวัง</text>
            <text x="30" y="52" fill="#556B60" font-size="11" text-anchor="middle">ม.ค.</text>

            <!-- Month 2: Mar -->
            <circle cx="130" cy="20" r="16" fill="#E8F5E9" stroke="#2E7D32" stroke-width="2"/>
            <text x="130" y="24" fill="#2E7D32" font-size="10" font-weight="700" text-anchor="middle">ปกติ</text>
            <text x="130" y="52" fill="#556B60" font-size="11" text-anchor="middle">มี.ค.</text>

            <!-- Month 3: May -->
            <circle cx="230" cy="20" r="16" fill="#E8F5E9" stroke="#2E7D32" stroke-width="2"/>
            <text x="230" y="24" fill="#2E7D32" font-size="10" font-weight="700" text-anchor="middle">ปกติ</text>
            <text x="230" y="52" fill="#556B60" font-size="11" text-anchor="middle">พ.ค.</text>

            <!-- Month 4: Jul / Today -->
            <circle cx="330" cy="20" r="18" fill="#2E7D32" stroke="#FFFFFF" stroke-width="3" class="shadow"/>
            <text x="330" y="25" fill="#FFFFFF" font-size="11" font-weight="800" text-anchor="middle">ดีมาก</text>
            <text x="330" y="52" fill="#195640" font-size="11" font-weight="700" text-anchor="middle">ล่าสุด</text>
          </g>
        </g>

        <!-- 4. BUTTONS: Call Leader / Request Re-test -->
        <g transform="translate(0, 528)">
          <rect x="0" y="0" width="195" height="58" rx="14" fill="#FFFFFF" stroke="#195640" stroke-width="2"/>
          <text x="97" y="34" fill="#195640" font-size="14" font-weight="700" text-anchor="middle">🔄 ขอให้ อสม. ตรวจซ้ำ</text>

          <rect x="209" y="0" width="195" height="58" rx="14" fill="#195640"/>
          <text x="306" y="34" fill="#FFFFFF" font-size="14" font-weight="700" text-anchor="middle">📞 โทรสอบถาม อสม.</text>
        </g>
      </g>
    </g>

    <g transform="translate(860, 160)">
      <rect x="0" y="0" width="280" height="340" rx="16" fill="#FFFFFF" stroke="#D8DFD5" class="shadow"/>
      <rect x="0" y="0" width="280" height="44" rx="16" fill="#195640"/>
      <text x="18" y="28" fill="#FFFFFF" font-size="15" font-weight="700">📌 จุดเด่นหน้าผลตรวจ (R04, D02)</text>
      
      <text x="18" y="75" fill="#213E32" font-size="13" font-weight="700">1. แปลงผลเป็นคำแนะนำการใช้งาน:</text>
      <text x="18" y="95" fill="#556B60" font-size="12">บอกชัด ดื่มได้ไหม / ซักผ้าได้ไหม / รดผักได้ไหม</text>
      
      <text x="18" y="130" fill="#213E32" font-size="13" font-weight="700">2. กราฟเข้าใจง่ายแบบ Timeline:</text>
      <text x="18" y="150" fill="#556B60" font-size="12">แสดงการดีขึ้นใน 4 เดือน ไม่ต้องดูกราฟแท่งซับซ้อน</text>

      <text x="18" y="185" fill="#213E32" font-size="13" font-weight="700">3. เชื่อมต่อผู้ใหญ่บ้าน/อสม.:</text>
      <text x="18" y="205" fill="#556B60" font-size="12">ปุ่มโทรติดต่อโดยตรงเมื่อมีข้อสงสัย</text>
    </g>
    """
    return svg_wrapper(1200, 960, content)

# ==============================================================================
# SCREEN 04: แบบจำลองน้ำท่วม (ถ้าน้ำขึ้น... บ้านเราจะท่วมไหม?)
# Responsive Tablet / Mobile Friendly View 1200 x 960
# ==============================================================================
def screen_04_flood():
    content = """
    <rect x="0" y="0" width="1200" height="960" fill="#EBE9DF"/>
    
    <text x="60" y="56" fill="#195640" font-size="28" font-weight="800">🌊 แบบจำลองน้ำท่วม — "ถ้าน้ำขึ้น... บ้านเราจะท่วมไหม?"</text>
    <text x="60" y="90" fill="#556B60" font-size="16" font-weight="500">เลื่อนสไลเดอร์ดูระดับน้ำท่วมล่วงหน้า เพื่อเตรียมยกของขึ้นที่สูงหรือพาผู้สูงอายุอพยพทันเวลา</text>

    <!-- Main Tablet / Large Viewport Box (Width 1080, Height 780) -->
    <g transform="translate(60, 120)">
      <rect x="0" y="0" width="1080" height="780" rx="24" fill="#FFFFFF" stroke="#D8DFD5" class="shadow-lg"/>
      
      <!-- Top Control Bar: Water Rise Slider for Villagers -->
      <g transform="translate(30, 24)">
        <rect x="0" y="0" width="1020" height="120" rx="16" fill="#F4F8F4" stroke="#D0DDD4" stroke-width="1.5"/>
        <text x="24" y="38" fill="#195640" font-size="18" font-weight="800">เลื่อนแถบเพื่อดู: ถ้าน้ำแม่น้ำกกเอ่อล้นตลิ่งสูงขึ้น...</text>
        <text x="24" y="60" fill="#556B60" font-size="13">คำนวณจากระดับความสูงจริงของหมู่บ้านและคันดินธรรมชาติ</text>

        <!-- Slider Bar Visual -->
        <g transform="translate(24, 76)">
          <!-- Track -->
          <rect x="0" y="8" width="972" height="14" rx="7" fill="#E0E8E3"/>
          <rect x="0" y="8" width="486" height="14" rx="7" fill="#1976D2"/> <!-- Active +2m -->

          <!-- 4 Friendly Rise Milestones -->
          <!-- Level 1: +1m -->
          <circle cx="160" cy="15" r="10" fill="#1976D2" stroke="#FFF" stroke-width="2"/>
          <text x="160" y="-4" fill="#213E32" font-size="12" font-weight="700" text-anchor="middle">+1 เมตร (น้ำปริ่มตลิ่ง)</text>

          <!-- Level 2: +2m (CURRENT SELECTED) -->
          <circle cx="486" cy="15" r="16" fill="#DE9922" stroke="#FFF" stroke-width="3" class="shadow"/>
          <text x="486" y="19" fill="#FFF" font-size="11" font-weight="800" text-anchor="middle">✓</text>
          <text x="486" y="-8" fill="#C45A10" font-size="14" font-weight="800" text-anchor="middle">⚠️ +2 เมตร (น้ำเริ่มล้นถนน)</text>

          <!-- Level 3: +3m -->
          <circle cx="750" cy="15" r="10" fill="#E0E8E3" stroke="#888" stroke-width="2"/>
          <text x="750" y="-4" fill="#666" font-size="12" font-weight="600" text-anchor="middle">+3 เมตร (ท่วมใต้ถุนบ้าน)</text>

          <!-- Level 4: +5m -->
          <circle cx="950" cy="15" r="10" fill="#E0E8E3" stroke="#888" stroke-width="2"/>
          <text x="950" y="-4" fill="#666" font-size="12" font-weight="600" text-anchor="middle">+5 เมตร (ท่วมหนักปี 67)</text>
        </g>
      </g>

      <!-- Map Display Area: Realistic River Basin + Flooded Lands -->
      <g transform="translate(30, 160)">
        <rect x="0" y="0" width="700" height="580" rx="16" fill="#F0F4EF" stroke="#D8DFD5"/>
        
        <!-- Mountain areas (Safe high ground) -->
        <path d="M 0,0 L 220,0 L 140,160 L 0,80 Z" fill="#DDEADE"/>
        <text x="50" y="50" fill="#4B6B56" font-size="14" font-weight="700">⛰️ ดอยแม่สลอง / เนินเขาสูง (ปลอดภัย 100%)</text>

        <!-- River Kok Winding Path -->
        <path d="M 40,540 Q 200,420 300,320 T 660,140" fill="none" stroke="#3182A0" stroke-width="44" stroke-linecap="round"/>
        <text x="420" y="240" fill="#FFFFFF" font-size="16" font-weight="700" transform="rotate(-30, 420, 240)">แม่น้ำกก</text>

        <!-- Simulated Flood Water Over Bank (+2m: Blue transparent polygon over lowlands) -->
        <path d="M 60,540 Q 220,400 320,300 Q 420,200 680,120 L 680,260 Q 480,360 360,460 L 160,570 Z" fill="url(#flood-water)"/>
        
        <!-- Flooded Land Warning Tag -->
        <g transform="translate(360, 360)">
          <rect x="-10" y="-12" width="190" height="30" rx="8" fill="#FFF3E0" stroke="#DE9922" stroke-width="2" class="shadow"/>
          <text x="0" y="8" font-size="14">🌊</text>
          <text x="24" y="8" fill="#C45A10" font-size="12" font-weight="700">น้ำท่วมสูงประมาณ 30-50 ซม.</text>
        </g>

        <!-- Landmarks on Map -->
        <!-- 1. วัดท่าตอน (Safe) -->
        <g transform="translate(180, 180)">
          <circle cx="0" cy="0" r="14" fill="#2E7D32" stroke="#FFF" stroke-width="2"/>
          <text x="-8" y="5" fill="#FFF" font-size="12">🛕</text>
          <rect x="20" y="-14" width="150" height="30" rx="6" fill="#FFFFFF" stroke="#2E7D32" stroke-width="1.5"/>
          <text x="28" y="6" fill="#1B5E20" font-size="12" font-weight="700">วัดท่าตอน (น้ำไม่ท่วม ✓)</text>
        </g>

        <!-- 2. ตลาดและท่าเรือ (Flooded!) -->
        <g transform="translate(260, 420)">
          <circle cx="0" cy="0" r="14" fill="#A33228" stroke="#FFF" stroke-width="2"/>
          <text x="-8" y="5" fill="#FFF" font-size="12">🚤</text>
          <rect x="20" y="-14" width="160" height="30" rx="6" fill="#FFFFFF" stroke="#A33228" stroke-width="1.5"/>
          <text x="28" y="6" fill="#A33228" font-size="12" font-weight="700">ท่าเรือท่าตอน (⚠️ น้ำท่วม)</text>
        </g>

        <!-- 3. โรงเรียนบ้านท่าตอน (Safe) -->
        <g transform="translate(480, 100)">
          <circle cx="0" cy="0" r="14" fill="#2E7D32" stroke="#FFF" stroke-width="2"/>
          <text x="-8" y="5" fill="#FFF" font-size="12">🏫</text>
          <rect x="20" y="-14" width="150" height="30" rx="6" fill="#FFFFFF" stroke="#2E7D32" stroke-width="1.5"/>
          <text x="28" y="6" fill="#1B5E20" font-size="12" font-weight="700">โรงเรียนท่าตอน (ปลอดภัย ✓)</text>
        </g>

        <!-- Floating Comparison Button: "Compare with real Flood 2024" -->
        <g transform="translate(20, 520)">
          <rect x="0" y="0" width="260" height="42" rx="10" fill="#FFFFFF" stroke="#195640" stroke-width="1.5" class="shadow"/>
          <text x="14" y="26" font-size="18">🛰️</text>
          <text x="42" y="26" fill="#195640" font-size="12" font-weight="700">เทียบกับภาพดาวเทียมน้ำท่วมปี 67</text>
        </g>
      </g>

      <!-- Right Side: Action Plan for Farmers at +2m -->
      <g transform="translate(750, 160)">
        <rect x="0" y="0" width="300" height="580" rx="16" fill="#FAFAFA" stroke="#D8DFD5"/>
        <rect x="0" y="0" width="300" height="44" rx="16" fill="#195640"/>
        <text x="18" y="28" fill="#FFFFFF" font-size="15" font-weight="700">📢 ข้อแนะนำสำหรับชาวบ้าน (ระดับ +2 ม.)</text>

        <!-- Checklist Cards -->
        <g transform="translate(16, 60)">
          <rect x="0" y="0" width="268" height="90" rx="12" fill="#FFF8E1" stroke="#FFE082"/>
          <text x="14" y="26" font-size="20">📦</text>
          <text x="44" y="24" fill="#C45A10" font-size="13" font-weight="700">1. ยกของขึ้นที่สูงทันที</text>
          <text x="44" y="44" fill="#556B60" font-size="11">เครื่องใช้ไฟฟ้า ปุ๋ย และอาหารสัตว์</text>
          <text x="44" y="60" fill="#556B60" font-size="11">ให้อยู่สูงกว่าพื้นอย่างน้อย 1 เมตร</text>
        </g>

        <g transform="translate(16, 164)">
          <rect x="0" y="0" width="268" height="90" rx="12" fill="#E3F2FD" stroke="#BBDEFB"/>
          <text x="14" y="26" font-size="20">👵</text>
          <text x="44" y="24" fill="#0D47A1" font-size="13" font-weight="700">2. พาผู้สูงอายุและเด็กไปที่ปลอดภัย</text>
          <text x="44" y="44" fill="#556B60" font-size="11">ศูนย์พักพิงที่ศาลาวัดท่าตอนเปิดแล้ว</text>
          <text x="44" y="60" fill="#556B60" font-size="11">มีหมอและพยาบาลประจำการ 24 ชม.</text>
        </g>

        <g transform="translate(16, 268)">
          <rect x="0" y="0" width="268" height="90" rx="12" fill="#FFEBEE" stroke="#FFCDD2"/>
          <text x="14" y="26" font-size="20">🚗</text>
          <text x="44" y="24" fill="#B71C1C" font-size="13" font-weight="700">3. เลี่ยงการใช้ถนนริมแม่น้ำ</text>
          <text x="44" y="44" fill="#556B60" font-size="11">ถนนสายล่างหน้าท่าเรือน้ำท่วมขัง</text>
          <text x="44" y="60" fill="#556B60" font-size="11">ให้ใช้ถนนบายพาสสายบนแทน</text>
        </g>

        <!-- Big Red Call Button -->
        <g transform="translate(16, 480)">
          <rect x="0" y="0" width="268" height="66" rx="16" fill="#A33228" class="shadow"/>
          <text x="134" y="32" fill="#FFFFFF" font-size="16" font-weight="800" text-anchor="middle">🚨 ขอความช่วยเหลือด่วน</text>
          <text x="134" y="52" fill="#FFCDD2" font-size="12" text-anchor="middle">โทรศูนย์กู้ภัย อบต. ท่าตอน</text>
        </g>
      </g>
    </g>
    """
    return svg_wrapper(1200, 960, content)

# ==============================================================================
# SCREEN 05: เส้นทางอพยพปลอดภัย & จุดรวมพล 67 จุด
# Viewport: Mobile / Tablet
# ==============================================================================
def screen_05_evac():
    content = """
    <rect x="0" y="0" width="1200" height="960" fill="#EBE9DF"/>
    
    <text x="60" y="56" fill="#195640" font-size="28" font-weight="800">🏃 ทางหนีน้ำท่วม & จุดปลอดภัยใกล้บ้าน</text>
    <text x="60" y="90" fill="#556B60" font-size="16" font-weight="500">บอกเส้นทางเดินเท้าที่น้ำไม่ท่วม และศาลาพักพิงที่มีอาหาร-ยา พร้อมปุ่มแจ้งช่วยผู้ป่วยติดเตียง</text>

    <g transform="translate(380, 110)">
      <rect x="-6" y="-6" width="452" height="832" rx="42" fill="#2D3732" opacity="0.15" class="shadow-lg"/>
      <rect x="0" y="0" width="440" height="820" rx="36" fill="#FFFFFF" stroke="#D0D7D0" stroke-width="3"/>
      <rect x="150" y="10" width="140" height="22" rx="11" fill="#213E32"/>

      <!-- Header -->
      <rect x="0" y="38" width="440" height="66" fill="#195640"/>
      <text x="24" y="74" fill="#FFFFFF" font-size="20" font-weight="800">⚠️ จุดปลอดภัยใกล้คุณที่สุด</text>
      <text x="24" y="94" fill="#D2E7DC" font-size="12">อิงจากโครงข่ายถนนจริง 190 สายในพื้นที่</text>

      <g transform="translate(18, 116)">
        <!-- 1. NEAREST SAFE HAVEN (Hero Card) -->
        <rect x="0" y="0" width="404" height="136" rx="16" fill="#E8F5E9" stroke="#81C784" stroke-width="2" class="shadow"/>
        <circle cx="48" cy="48" r="28" fill="#2E7D32"/>
        <text x="35" y="57" fill="#FFFFFF" font-size="28">🛕</text>
        <text x="88" y="38" fill="#1B5E20" font-size="18" font-weight="800">ศาลาวัดท่าตอน (จุดที่ 1)</text>
        <text x="88" y="60" fill="#2E7D32" font-size="13" font-weight="600">🚶 เดินเท้า 6 นาที (ห่างจากบ้านคุณ 450 ม.)</text>
        <text x="88" y="80" fill="#4B6B56" font-size="11">✓ พ้นน้ำท่วม 100% • มีน้ำดื่ม ข้าวกล่อง และหน่วยปฐมพยาบาล</text>
        
        <!-- Button: Start Walking Direction -->
        <rect x="88" y="94" width="200" height="32" rx="8" fill="#2E7D32"/>
        <text x="188" y="115" fill="#FFFFFF" font-size="12" font-weight="700" text-anchor="middle">➔ กดเปิดเส้นทางเดินนำทาง</text>

        <!-- 2. SECONDARY SAFE HAVEN -->
        <g transform="translate(0, 150)">
          <rect x="0" y="0" width="404" height="90" rx="14" fill="#FAFAFA" stroke="#D8DFD5" stroke-width="1.5"/>
          <circle cx="40" cy="45" r="22" fill="#E8F0EC"/>
          <text x="28" y="53" font-size="20">🏫</text>
          <text x="76" y="34" fill="#213E32" font-size="16" font-weight="700">โรงเรียนบ้านท่าตอน (จุดที่ 2)</text>
          <text x="76" y="54" fill="#556B60" font-size="12">🚶 เดินเท้า 12 นาที (ห่าง 900 ม.) • รองรับได้ 200 คน</text>
          <text x="76" y="72" fill="#2E7D32" font-size="11">✓ น้ำไม่ท่วม • มีลานจอดรถยนต์และรถไถ</text>
        </g>

        <!-- 3. MAP SNIPPET SHOWING SAFE ROUTE -->
        <g transform="translate(0, 252)">
          <rect x="0" y="0" width="404" height="200" rx="14" fill="#F4F8F4" stroke="#D8DFD5"/>
          
          <!-- Evacuation Path (Green Line) -->
          <path d="M 60,160 L 140,110 L 220,130 L 320,50" fill="none" stroke="#2E7D32" stroke-width="8" stroke-linecap="round" stroke-linejoin="round"/>
          <path d="M 60,160 L 140,110 L 220,130 L 320,50" fill="none" stroke="#FFFFFF" stroke-width="2" stroke-dasharray="6 6"/>

          <!-- Flooded Roads (Red X) -->
          <path d="M 60,160 L 100,180 L 180,180" fill="none" stroke="#A33228" stroke-width="6" stroke-dasharray="4 4"/>
          <circle cx="140" cy="180" r="12" fill="#FFCDD2"/>
          <text x="135" y="185" fill="#A33228" font-size="12" font-weight="700">✕</text>

          <!-- Your Location Pin -->
          <circle cx="60" cy="160" r="14" fill="#1976D2" stroke="#FFF" stroke-width="3" class="shadow"/>
          <text x="54" y="165" fill="#FFF" font-size="11">🏠</text>
          <text x="35" y="190" fill="#0D47A1" font-size="11" font-weight="700">บ้านคุณ</text>

          <!-- Safe Destination Pin -->
          <circle cx="320" cy="50" r="16" fill="#2E7D32" stroke="#FFF" stroke-width="3" class="shadow"/>
          <text x="312" y="56" fill="#FFF" font-size="14">🛕</text>
          <text x="280" y="26" fill="#1B5E20" font-size="12" font-weight="800">วัดท่าตอน</text>

          <rect x="10" y="10" width="130" height="26" rx="6" fill="rgba(255,255,255,0.9)"/>
          <text x="18" y="28" fill="#2E7D32" font-size="11" font-weight="700">เส้นทางปลอดภัย (เดินตามนี้)</text>
        </g>

        <!-- 4. VULNERABLE PERSON EMERGENCY HELP (Elderly, Bedridden, Disabled) -->
        <g transform="translate(0, 466)">
          <rect x="0" y="0" width="404" height="110" rx="14" fill="#FFF3E0" stroke="#FFE082" stroke-width="2"/>
          <text x="16" y="32" font-size="24">🧓</text>
          <text x="50" y="28" fill="#C45A10" font-size="15" font-weight="800">มีผู้สูงอายุ / ผู้ป่วยติดเตียง อยู่ในบ้าน?</text>
          <text x="50" y="48" fill="#556B60" font-size="12">กดแจ้งทีมกู้ภัยและ อสม. จะนำเรือและรถยกมารับถึงบ้าน</text>

          <!-- Big Alert Button -->
          <rect x="50" y="60" width="338" height="40" rx="10" fill="#E65100"/>
          <text x="219" y="85" fill="#FFFFFF" font-size="13" font-weight="700" text-anchor="middle">🚨 กดแจ้งขอทีมมารับผู้ป่วยติดเตียง</text>
        </g>

        <!-- Bottom Call Leader Button -->
        <g transform="translate(0, 588)">
          <rect x="0" y="0" width="404" height="60" rx="16" fill="#195640" class="shadow"/>
          <text x="202" y="36" fill="#FFFFFF" font-size="16" font-weight="800" text-anchor="middle">📞 โทรสายด่วนผู้ใหญ่บ้าน: 081-XXX-XXXX</text>
        </g>
      </g>
    </g>

    <g transform="translate(860, 160)">
      <rect x="0" y="0" width="280" height="340" rx="16" fill="#FFFFFF" stroke="#D8DFD5" class="shadow"/>
      <rect x="0" y="0" width="280" height="44" rx="16" fill="#195640"/>
      <text x="18" y="28" fill="#FFFFFF" font-size="15" font-weight="700">📌 จุดเด่นหน้าอพยพ (R06, R07)</text>
      
      <text x="18" y="75" fill="#213E32" font-size="13" font-weight="700">1. แนบแนวถนนจริง 190 สาย:</text>
      <text x="18" y="95" fill="#556B60" font-size="12">เส้นทางเดินไม่ตัดผ่านทุ่งนาที่น้ำท่วม</text>
      
      <text x="18" y="130" fill="#213E32" font-size="13" font-weight="700">2. บอกระยะทางและเวลาเดิน:</text>
      <text x="18" y="150" fill="#556B60" font-size="12">ชาวบ้านกะเวลาและวางแผนพาครอบครัวได้</text>

      <text x="18" y="185" fill="#213E32" font-size="13" font-weight="700">3. ใส่ใจกลุ่มเปราะบาง 6 มิติ:</text>
      <text x="18" y="205" fill="#556B60" font-size="12">ปุ่มขอเรือรับผู้ป่วยติดเตียงโดยเฉพาะ</text>
    </g>
    """
    return svg_wrapper(1200, 960, content)

# ==============================================================================
# SCREEN 06: ศูนย์ตรวจผลของ อสม. และผู้ใหญ่บ้าน (Admin Triage Queue)
# Viewport: Tablet / Desktop 1200 x 960
# ==============================================================================
def screen_06_admin_review():
    content = """
    <rect x="0" y="0" width="1200" height="960" fill="#EBE9DF"/>
    
    <text x="60" y="56" fill="#195640" font-size="28" font-weight="800">📋 โต๊ะทำงานผู้ใหญ่บ้าน &amp; อสม. — ตรวจสอบผลตรวจที่ชาวบ้านส่งมา</text>
    <text x="60" y="90" fill="#556B60" font-size="16" font-weight="500">ผลที่สีปกติเผยแพร่อัตโนมัติทันที ส่วนผลที่สีเข้มผิดปกติจะเข้าห้องนี้ เพื่อให้อสม.ช่วยดูรูปขยายและยืนยัน</text>

    <g transform="translate(60, 120)">
      <rect x="0" y="0" width="1080" height="780" rx="20" fill="#FFFFFF" stroke="#D8DFD5" class="shadow-lg"/>
      
      <!-- Top Status Header -->
      <g transform="translate(30, 24)">
        <rect x="0" y="0" width="1020" height="60" rx="12" fill="#E8F0EC"/>
        <text x="24" y="38" fill="#195640" font-size="17" font-weight="700">⚠️ มีผลตรวจที่ต้องช่วยตรวจสอบ: 1 รายการ (สีแผ่นตรวจเข้มกว่าปกติ)</text>
        <rect x="880" y="12" width="120" height="36" rx="8" fill="#195640"/>
        <text x="940" y="35" fill="#FFFFFF" font-size="12" font-weight="700" text-anchor="middle">ดูประวัติทั้งหมด</text>
      </g>

      <!-- Left Column: Pending Item Details -->
      <g transform="translate(30, 100)">
        <rect x="0" y="0" width="460" height="640" rx="14" fill="#FAFAFA" stroke="#D8DFD5"/>
        <rect x="0" y="0" width="460" height="42" rx="14" fill="#DE9922"/>
        <text x="20" y="27" fill="#FFFFFF" font-size="15" font-weight="700">🔔 รายละเอียดผลตรวจที่รอตรวจสอบ</text>

        <!-- Information rows -->
        <g transform="translate(20, 60)">
          <text x="0" y="20" fill="#556B60" font-size="13">รหัสตัวอย่าง:</text>
          <text x="120" y="20" fill="#213E32" font-size="14" font-weight="700">KOK-20261015-0042</text>

          <text x="0" y="55" fill="#556B60" font-size="13">ผู้ส่งข้อมูล:</text>
          <text x="120" y="55" fill="#213E32" font-size="14" font-weight="700">ลุงสมชาย (โทร 089-XXX-4512)</text>

          <text x="0" y="90" fill="#556B60" font-size="13">สถานที่ตักน้ำ:</text>
          <text x="120" y="90" fill="#213E32" font-size="14" font-weight="700">บ่อน้ำบาดาลหลังบ้าน (บ้านรังแร้ง หมู่ 4)</text>

          <text x="0" y="125" fill="#556B60" font-size="13">เวลาที่ตรวจ:</text>
          <text x="120" y="125" fill="#213E32" font-size="14">วันนี้ 09:15 น.</text>

          <text x="0" y="160" fill="#556B60" font-size="13">สีที่ชาวบ้านเลือก:</text>
          <rect x="120" y="142" width="160" height="28" rx="6" fill="#F8E5B8" stroke="#DE9922"/>
          <text x="200" y="161" fill="#C45A10" font-size="12" font-weight="700" text-anchor="middle">สีส้มเข้ม (เฝ้าระวังด่วน)</text>
        </g>

        <!-- Village Leader Quick Notes -->
        <g transform="translate(20, 240)">
          <rect x="0" y="0" width="420" height="120" rx="10" fill="#FFF8E1" stroke="#FFE082"/>
          <text x="16" y="26" fill="#C45A10" font-size="13" font-weight="700">💡 คำแนะนำสำหรับผู้ใหญ่บ้าน / อสม.:</text>
          <text x="16" y="48" fill="#556B60" font-size="12">1. ดูรูปขยายทางขวามือ ว่าสีกระดาษตรงกับแถบสีจริงหรือไม่</text>
          <text x="16" y="70" fill="#556B60" font-size="12">2. ถ้าน้ำขุ่นจากดินโคลน อาจทำให้สีเพี้ยนได้</text>
          <text x="16" y="92" fill="#556B60" font-size="12">3. หากไม่แน่ใจ ให้กดปุ่ม "ส่งทีม อสม. ไปตรวจซ้ำ"</text>
        </g>

        <!-- Action Buttons for Village Leader -->
        <g transform="translate(20, 480)">
          <!-- Button 1: Approve & Alert -->
          <rect x="0" y="0" width="420" height="48" rx="10" fill="#2E7D32"/>
          <text x="210" y="30" fill="#FFFFFF" font-size="14" font-weight="700" text-anchor="middle">✓ ยืนยันผล และแจ้งเตือนชุมชน</text>

          <!-- Button 2: Send Team to re-test -->
          <rect x="0" y="60" width="420" height="48" rx="10" fill="#DE9922"/>
          <text x="210" y="90" fill="#213E32" font-size="14" font-weight="700" text-anchor="middle">🔄 ส่งทีม อสม. ลงพื้นที่ตรวจซ้ำ</text>

          <!-- Button 3: Reject blurry photo -->
          <rect x="0" y="120" width="420" height="40" rx="10" fill="#FFFFFF" stroke="#CCD5CC"/>
          <text x="210" y="145" fill="#777" font-size="13" text-anchor="middle">✕ ภาพไม่ชัด ขอให้ชาวบ้านถ่ายใหม่</text>
        </g>
      </g>

      <!-- Right Column: Visual Dual Photo Inspector -->
      <g transform="translate(510, 100)">
        <rect x="0" y="0" width="540" height="640" rx="14" fill="#FAFAFA" stroke="#D8DFD5"/>
        <rect x="0" y="0" width="540" height="42" rx="14" fill="#195640"/>
        <text x="20" y="27" fill="#FFFFFF" font-size="15" font-weight="700">📸 ภาพถ่ายคู่ที่ชาวบ้านส่งมา (ซูมดูได้ชัดเจน)</text>

        <!-- Photo 1: Strip with Color Swatch -->
        <g transform="translate(24, 60)">
          <text x="0" y="20" fill="#213E32" font-size="14" font-weight="700">1. ภาพแผ่นตรวจเทียบกับแถบสีมาตรฐาน</text>
          <rect x="0" y="32" width="492" height="230" rx="10" fill="#E8F0EC" stroke="#CCD5CC"/>
          <!-- Mockup Strip Inside -->
          <rect x="60" y="110" width="160" height="40" rx="6" fill="#FFFFFF" stroke="#888"/>
          <rect x="70" y="118" width="40" height="24" rx="4" fill="#F8E5B8"/>
          <text x="120" y="135" fill="#555" font-size="11">แผ่นตรวจจริง</text>
          <!-- Standard Swatch Card -->
          <rect x="250" y="70" width="200" height="150" rx="8" fill="#FFFFFF" stroke="#999"/>
          <text x="270" y="95" fill="#222" font-size="12" font-weight="700">แถบสีมาตรฐาน</text>
          <rect x="270" y="110" width="40" height="20" fill="#DFF0D8"/><text x="320" y="125" fill="#333" font-size="10">ปลอดภัย</text>
          <rect x="270" y="140" width="40" height="20" fill="#F8E5B8"/><text x="320" y="155" fill="#333" font-size="10">เฝ้าระวัง (ตรงกับสีนี้)</text>
          <rect x="270" y="170" width="40" height="20" fill="#7A4328"/><text x="320" y="185" fill="#333" font-size="10">อันตราย</text>
        </g>

        <!-- Photo 2: Water Source Environment -->
        <g transform="translate(24, 340)">
          <text x="0" y="20" fill="#213E32" font-size="14" font-weight="700">2. ภาพสถานที่ตักน้ำจริง</text>
          <rect x="0" y="32" width="492" height="230" rx="10" fill="#E8F0EC" stroke="#CCD5CC"/>
          <!-- Mockup Well Landscape -->
          <circle cx="246" cy="140" r="60" fill="#A5D6A7" opacity="0.6"/>
          <rect x="186" y="120" width="120" height="60" rx="10" fill="#8D6E63"/>
          <text x="246" y="155" fill="#FFFFFF" font-size="14" font-weight="700" text-anchor="middle">บ่อน้ำบาดาลลุงสมชาย</text>
          <text x="246" y="175" fill="#FFF" font-size="11" text-anchor="middle">สภาพแวดล้อม: น้ำใส ไม่มีคราบน้ำมัน</text>
        </g>
      </g>
    </g>
    """
    return svg_wrapper(1200, 960, content)

# ==============================================================================
# SCREEN 07: ทะเบียนข้อมูลคุณภาพน้ำ 4 หมู่บ้าน (สำหรับ อบต. และ มฟล.)
# Viewport: Desktop 1200 x 960
# ==============================================================================
def screen_07_admin_table():
    content = """
    <rect x="0" y="0" width="1200" height="960" fill="#EBE9DF"/>
    
    <text x="60" y="56" fill="#195640" font-size="28" font-weight="800">📊 ทะเบียนข้อมูลคุณภาพน้ำ 4 หมู่บ้าน — สำหรับ อบต. และอาจารย์ มฟล.</text>
    <text x="60" y="90" fill="#556B60" font-size="16" font-weight="500">รวบรวมข้อมูลครบทั้ง 129 จุดสำรวจ แสดงสถานะความปลอดภัย และส่งออกรายงานส่งจังหวัดได้ทันที</text>

    <g transform="translate(60, 120)">
      <rect x="0" y="0" width="1080" height="780" rx="20" fill="#FFFFFF" stroke="#D8DFD5" class="shadow-lg"/>
      
      <!-- Summary KPI Metric Cards (Plain Thai) -->
      <g transform="translate(30, 24)">
        <!-- Metric 1: Total Tested -->
        <rect x="0" y="0" width="240" height="84" rx="12" fill="#F4F8F4" stroke="#D8DFD5"/>
        <text x="20" y="32" fill="#556B60" font-size="13">จุดตรวจทั้งหมด</text>
        <text x="20" y="66" fill="#195640" font-size="28" font-weight="800">129 จุด</text>
        <text x="130" y="62" fill="#556B60" font-size="12">ครบ 4 หมู่บ้าน</text>

        <!-- Metric 2: Safe -->
        <rect x="260" y="0" width="240" height="84" rx="12" fill="#E8F5E9" stroke="#A5D6A7"/>
        <text x="280" y="32" fill="#2E7D32" font-size="13" font-weight="600">คุณภาพน้ำปกติ (ปลอดภัย)</text>
        <text x="280" y="66" fill="#1B5E20" font-size="28" font-weight="800">122 จุด</text>
        <text x="390" y="62" fill="#2E7D32" font-size="12">94.6% ของพื้นที่</text>

        <!-- Metric 3: Caution -->
        <rect x="520" y="0" width="240" height="84" rx="12" fill="#FFF8E1" stroke="#FFE082"/>
        <text x="540" y="32" fill="#C45A10" font-size="13" font-weight="600">ต้องเฝ้าระวัง</text>
        <text x="540" y="66" fill="#C45A10" font-size="28" font-weight="800">7 จุด</text>
        <text x="630" y="62" fill="#C45A10" font-size="12">อสม. ติดตามแล้ว</text>

        <!-- Metric 4: Export Button -->
        <rect x="780" y="0" width="240" height="84" rx="12" fill="#195640"/>
        <text x="830" y="38" fill="#FFFFFF" font-size="15" font-weight="700">📥 ดาวน์โหลดรายงาน</text>
        <text x="830" y="60" fill="#D2E7DC" font-size="12">พิมพ์เป็นกระดาษส่งนายอำเภอ</text>
      </g>

      <!-- Search & Filters -->
      <g transform="translate(30, 126)">
        <rect x="0" y="0" width="400" height="42" rx="8" fill="#FFFFFF" stroke="#CCD5CC"/>
        <text x="16" y="27" fill="#888" font-size="14">🔍 ค้นหาตามชื่อหมู่บ้าน หรือรหัสจุดตรวจ...</text>

        <!-- Village Filter Pills -->
        <rect x="420" y="0" width="130" height="42" rx="8" fill="#195640"/>
        <text x="485" y="26" fill="#FFFFFF" font-size="13" font-weight="700" text-anchor="middle">ทุกหมู่บ้าน (4)</text>

        <rect x="560" y="0" width="110" height="42" rx="8" fill="#F0F4F1" stroke="#CCD5CC"/>
        <text x="615" y="26" fill="#213E32" font-size="13" text-anchor="middle">บ้านท่าตอน</text>

        <rect x="680" y="0" width="110" height="42" rx="8" fill="#F0F4F1" stroke="#CCD5CC"/>
        <text x="735" y="26" fill="#213E32" font-size="13" text-anchor="middle">บ้านฮ่างต่ำ</text>

        <rect x="800" y="0" width="110" height="42" rx="8" fill="#F0F4F1" stroke="#CCD5CC"/>
        <text x="855" y="26" fill="#213E32" font-size="13" text-anchor="middle">บ้านรังแร้ง</text>

        <rect x="920" y="0" width="100" height="42" rx="8" fill="#F0F4F1" stroke="#CCD5CC"/>
        <text x="970" y="26" fill="#213E32" font-size="13" text-anchor="middle">บ้านผาใต้</text>
      </g>

      <!-- Table View -->
      <g transform="translate(30, 186)">
        <!-- Table Header -->
        <rect x="0" y="0" width="1020" height="44" rx="6" fill="#E8F0EC"/>
        <text x="24" y="28" fill="#195640" font-size="13" font-weight="700">รหัสจุด</text>
        <text x="140" y="28" fill="#195640" font-size="13" font-weight="700">หมู่บ้าน</text>
        <text x="280" y="28" fill="#195640" font-size="13" font-weight="700">ประเภทแหล่งน้ำ</text>
        <text x="440" y="28" fill="#195640" font-size="13" font-weight="700">ผลตรวจแถบสี</text>
        <text x="600" y="28" fill="#195640" font-size="13" font-weight="700">คำแนะนำการใช้น้ำ</text>
        <text x="800" y="28" fill="#195640" font-size="13" font-weight="700">วันที่ตรวจล่าสุด</text>
        <text x="940" y="28" fill="#195640" font-size="13" font-weight="700">จัดการ</text>

        <!-- Row 1 -->
        <g transform="translate(0, 52)">
          <rect x="0" y="0" width="1020" height="54" rx="6" fill="#FFFFFF" stroke="#EAEAEA"/>
          <text x="24" y="33" fill="#213E32" font-size="13" font-weight="700">W-001</text>
          <text x="140" y="33" fill="#213E32" font-size="13">บ้านท่าตอน หมู่ 3</text>
          <text x="280" y="33" fill="#213E32" font-size="13">น้ำถังบริโภค (91 ครัวเรือน)</text>
          <rect x="440" y="14" width="90" height="26" rx="13" fill="#E8F5E9"/>
          <text x="485" y="32" fill="#2E7D32" font-size="11" font-weight="700" text-anchor="middle">✓ ปลอดภัย</text>
          <text x="600" y="33" fill="#2E7D32" font-size="13">ดื่มได้ตามปกติ</text>
          <text x="800" y="33" fill="#556B60" font-size="13">15 ต.ค. 2569</text>
          <text x="950" y="33" fill="#195640" font-size="13" font-weight="700">ดูรูป 🔍</text>
        </g>

        <!-- Row 2 -->
        <g transform="translate(0, 114)">
          <rect x="0" y="0" width="1020" height="54" rx="6" fill="#FFFFFF" stroke="#EAEAEA"/>
          <text x="24" y="33" fill="#213E32" font-size="13" font-weight="700">W-042</text>
          <text x="140" y="33" fill="#213E32" font-size="13">บ้านท่าตอน หมู่ 3</text>
          <text x="280" y="33" fill="#213E32" font-size="13">ท่าน้ำแม่น้ำกกหน้าวัด</text>
          <rect x="440" y="14" width="90" height="26" rx="13" fill="#E8F5E9"/>
          <text x="485" y="32" fill="#2E7D32" font-size="11" font-weight="700" text-anchor="middle">✓ ปลอดภัย</text>
          <text x="600" y="33" fill="#2E7D32" font-size="13">ใช้อาบ-ซักล้าง-รดผักได้</text>
          <text x="800" y="33" fill="#556B60" font-size="13">15 ต.ค. 2569</text>
          <text x="950" y="33" fill="#195640" font-size="13" font-weight="700">ดูรูป 🔍</text>
        </g>

        <!-- Row 3: Caution -->
        <g transform="translate(0, 176)">
          <rect x="0" y="0" width="1020" height="54" rx="6" fill="#FFFDF8" stroke="#FFE082"/>
          <text x="24" y="33" fill="#213E32" font-size="13" font-weight="700">W-088</text>
          <text x="140" y="33" fill="#213E32" font-size="13">บ้านรังแร้ง หมู่ 4</text>
          <text x="280" y="33" fill="#213E32" font-size="13">บ่อน้ำบาดาลท้ายบ้าน</text>
          <rect x="440" y="14" width="90" height="26" rx="13" fill="#FFF3E0"/>
          <text x="485" y="32" fill="#C45A10" font-size="11" font-weight="700" text-anchor="middle">⚠️ เฝ้าระวัง</text>
          <text x="600" y="33" fill="#C45A10" font-size="13">งดดื่มชั่วคราว / ส่งตรวจซ้ำ</text>
          <text x="800" y="33" fill="#556B60" font-size="13">14 ต.ค. 2569</text>
          <text x="950" y="33" fill="#DE9922" font-size="13" font-weight="700">ติดตาม 📞</text>
        </g>

        <!-- Row 4 -->
        <g transform="translate(0, 238)">
          <rect x="0" y="0" width="1020" height="54" rx="6" fill="#FFFFFF" stroke="#EAEAEA"/>
          <text x="24" y="33" fill="#213E32" font-size="13" font-weight="700">W-105</text>
          <text x="140" y="33" fill="#213E32" font-size="13">บ้านผาใต้ หมู่ 5</text>
          <text x="280" y="33" fill="#213E32" font-size="13">ประปาภูเขาหมู่บ้าน</text>
          <rect x="440" y="14" width="90" height="26" rx="13" fill="#E8F5E9"/>
          <text x="485" y="32" fill="#2E7D32" font-size="11" font-weight="700" text-anchor="middle">✓ ปลอดภัย</text>
          <text x="600" y="33" fill="#2E7D32" font-size="13">ใช้อุปโภคบริโภคได้</text>
          <text x="800" y="33" fill="#556B60" font-size="13">13 ต.ค. 2569</text>
          <text x="950" y="33" fill="#195640" font-size="13" font-weight="700">ดูรูป 🔍</text>
        </g>
      </g>
    </g>
    """
    return svg_wrapper(1200, 960, content)

# ==============================================================================
# SCREEN 08: ตัวช่วยร่างประกาศเตือนภัยเสียงตามสาย & LINE ชุมชน
# Viewport: Desktop / Mobile 1200 x 960
# ==============================================================================
def screen_08_notice():
    content = """
    <rect x="0" y="0" width="1200" height="960" fill="#EBE9DF"/>
    
    <text x="60" y="56" fill="#195640" font-size="28" font-weight="800">📢 ตัวช่วยร่างประกาศเสียงตามสาย &amp; LINE ชุมชน — สำหรับผู้ใหญ่บ้าน</text>
    <text x="60" y="90" fill="#556B60" font-size="16" font-weight="500">ระบบแปลผลวิทยาศาสตร์ให้เป็นภาษาพูดชาวบ้านที่อ่านง่ายทันที ผู้ใหญ่บ้านกดอ่านออกหอกระจายข่าวได้เลย</text>

    <g transform="translate(60, 120)">
      <rect x="0" y="0" width="1080" height="780" rx="20" fill="#FFFFFF" stroke="#D8DFD5" class="shadow-lg"/>

      <!-- Left Column: Village Loudspeaker Announcement (เสียงตามสาย) -->
      <g transform="translate(30, 30)">
        <rect x="0" y="0" width="500" height="710" rx="16" fill="#F4F8F4" stroke="#D8DFD5"/>
        <rect x="0" y="0" width="500" height="48" rx="16" fill="#195640"/>
        <text x="24" y="32" fill="#FFFFFF" font-size="16" font-weight="700">🎙️ บทอ่านประกาศหอกระจายข่าวประจำหมู่บ้าน</text>

        <!-- Speaker Icon & Advice -->
        <g transform="translate(24, 70)">
          <text x="0" y="20" fill="#C45A10" font-size="13" font-weight="700">💡 ผู้ใหญ่บ้านสามารถถือกระดาษแผ่นนี้ หรือเปิดมือถืออ่านตามได้เลย:</text>
          
          <!-- Script Box -->
          <rect x="0" y="34" width="452" height="450" rx="12" fill="#FFFFFF" stroke="#CCD5CC"/>
          
          <text x="20" y="70" fill="#213E32" font-size="16" font-weight="800">"สวัสดีครับ พ่อแม่พี่น้องบ้านท่าตอนทุกท่าน"</text>
          
          <text x="20" y="115" fill="#213E32" font-size="14" line-height="24">
            <tspan x="20" dy="0">วันนี้ วันที่ 15 ตุลาคม 2569 ทางผู้ใหญ่บ้าน และทีม อสม.</tspan>
            <tspan x="20" dy="28">ร่วมกับอาจารย์จากมหาวิทยาลัยแม่ฟ้าหลวง</tspan>
            <tspan x="20" dy="28">ได้ทำการสุ่มตรวจคุณภาพน้ำในแม่น้ำกก และน้ำประปาหมู่บ้านแล้ว</tspan>
          </text>

          <rect x="18" y="210" width="416" height="84" rx="8" fill="#E8F5E9" stroke="#A5D6A7"/>
          <text x="32" y="238" fill="#1B5E20" font-size="14" font-weight="800">ผลการตรวจวันนี้: น้ำมีคุณภาพดี ปลอดภัยครับ!</text>
          <text x="32" y="262" fill="#2E7D32" font-size="13">น้ำแม่น้ำกกสามารถสูบเข้านา รดพืชผัก และใช้อาบได้ตามปกติ</text>
          <text x="32" y="282" fill="#2E7D32" font-size="13">สำหรับน้ำดื่มกิน ยังขอแนะนำให้ต้มให้สุกก่อนดื่มนะครับ</text>

          <text x="20" y="330" fill="#213E32" font-size="14">
            <tspan x="20" dy="0">หากบ้านไหนต้องการกระดาษตรวจน้ำไปตรวจบ่อน้ำที่บ้าน</tspan>
            <tspan x="20" dy="28">สามารถมาติดต่อขอรับฟรีได้ที่ศาลาประชาคม หรือโทรหา อสม.</tspan>
            <tspan x="20" dy="28">จึงขอประกาศให้ทราบโดยทั่วกัน... ขอบคุณครับ"</tspan>
          </text>

          <!-- Button: Print Script -->
          <g transform="translate(0, 500)">
            <rect x="0" y="0" width="452" height="52" rx="12" fill="#195640"/>
            <text x="226" y="32" fill="#FFFFFF" font-size="15" font-weight="700" text-anchor="middle">🖨️ พิมพ์บทอ่านใส่กระดาษ A4 ตัวโตๆ</text>
          </g>
        </g>
      </g>

      <!-- Right Column: LINE OpenChat Ready Card -->
      <g transform="translate(560, 30)">
        <rect x="0" y="0" width="480" height="710" rx="16" fill="#FAFAFA" stroke="#D8DFD5"/>
        <rect x="0" y="0" width="480" height="48" rx="16" fill="#00B900"/>
        <text x="24" y="32" fill="#FFFFFF" font-size="16" font-weight="700">💬 ข้อความพร้อมส่งเข้ากลุ่ม LINE หมู่บ้าน</text>

        <!-- Simulated LINE Card -->
        <g transform="translate(24, 70)">
          <text x="0" y="20" fill="#556B60" font-size="13">กดปุ่มเดียว คัดลอกส่งเข้า LINE กลุ่มผู้ใหญ่บ้าน/ชาวบ้านได้ทันที:</text>
          
          <rect x="0" y="34" width="432" height="450" rx="16" fill="#7494C0"/> <!-- LINE chat bg -->
          
          <!-- LINE Bubble -->
          <g transform="translate(20, 24)">
            <rect x="0" y="0" width="392" height="390" rx="14" fill="#FFFFFF" class="shadow"/>
            <!-- Bubble header -->
            <rect x="0" y="0" width="392" height="46" rx="14" fill="#195640"/>
            <text x="16" y="30" fill="#FFFFFF" font-size="15" font-weight="700">💧 รายงานน้ำกกประจำวัน • บ้านท่าตอน</text>

            <g transform="translate(16, 65)">
              <text x="0" y="16" fill="#1B5E20" font-size="16" font-weight="800">✅ น้ำวันนี้: ปลอดภัย ใช้อาบ-รดผักได้</text>
              <text x="0" y="42" fill="#556B60" font-size="13">📅 ประจำวันที่: 15 ต.ค. 2569 (ตรวจเช้า)</text>
              <text x="0" y="68" fill="#556B60" font-size="13">📍 จุดตรวจ: ท่าน้ำวัดท่าตอน (หมู่ 3)</text>
              
              <line x1="0" y1="86" x2="360" y2="86" stroke="#EEE"/>

              <text x="0" y="112" fill="#213E32" font-size="13" font-weight="700">คำแนะนำสำหรับพี่น้องในหมู่บ้าน:</text>
              <text x="0" y="138" fill="#333" font-size="12">• ใช้น้ำรดแปลงผัก ข้าวในนา ได้ปลอดภัย 100%</text>
              <text x="0" y="162" fill="#333" font-size="12">• การดื่มกิน แนะนำให้ต้มให้สุกก่อนดื่ม</text>
              <text x="0" y="186" fill="#333" font-size="12">• ระดับน้ำในแม่น้ำกก ปกติ ไม่มีความเสี่ยงน้ำท่วม</text>

              <line x1="0" y1="206" x2="360" y2="206" stroke="#EEE"/>
              
              <text x="0" y="232" fill="#0D47A1" font-size="12">🌐 กดดูแผนที่น้ำใกล้บ้านคุณ: kok-water.mfu.ac.th</text>
              <text x="0" y="256" fill="#888" font-size="11">ด้วยความห่วงใยจาก ผู้ใหญ่บ้าน และ มฟล.</text>
            </g>
          </g>

          <!-- Copy Button -->
          <g transform="translate(0, 500)">
            <rect x="0" y="0" width="432" height="52" rx="12" fill="#00B900" class="shadow"/>
            <text x="216" y="32" fill="#FFFFFF" font-size="15" font-weight="700" text-anchor="middle">📋 คัดลอกข้อความส่งเข้า LINE ทันที</text>
          </g>
        </g>
      </g>
    </g>
    """
    return svg_wrapper(1200, 960, content)

# ==============================================================================
# SCREEN 09: ป้ายไวนิลคู่มือตรวจน้ำ 4 ขั้นตอน (ขนาด A0 ติดศาลาหมู่บ้าน)
# Viewport: Poster / Field Guide 1200 x 960
# ==============================================================================
def screen_09_guide_a0():
    content = """
    <rect x="0" y="0" width="1200" height="960" fill="#EBE9DF"/>
    
    <text x="60" y="56" fill="#195640" font-size="28" font-weight="800">🖼️ ป้ายไวนิลคู่มือตรวจน้ำ 4 ขั้นตอน — สัดส่วนจริงสำหรับพิมพ์ติดศาลาหมู่บ้าน</text>
    <text x="60" y="90" fill="#556B60" font-size="16" font-weight="500">ตัวหนังสือขนาดใหญ่พิเศษ ภาพวาดชัดเจน มองเห็นได้จากระยะ 3 เมตร เหมาะกับเกษตรกรทุกวัย</text>

    <!-- Main A0 Poster Preview Box (Width 1080, Height 780) -->
    <g transform="translate(60, 120)">
      <rect x="0" y="0" width="1080" height="780" rx="20" fill="#FFFFFF" stroke="#195640" stroke-width="4" class="shadow-lg"/>

      <!-- Poster Header Banner -->
      <rect x="0" y="0" width="1080" height="120" rx="16" fill="url(#grad-green)"/>
      <text x="540" y="56" fill="#FFFFFF" font-size="32" font-weight="800" text-anchor="middle">วิธีตรวจคุณภาพน้ำง่ายๆ ด้วยตัวเอง (4 ขั้นตอน)</text>
      <text x="540" y="92" fill="#D2E7DC" font-size="18" font-weight="600" text-anchor="middle">โครงการตรวจเฝ้าระวังน้ำกก มหาวิทยาลัยแม่ฟ้าหลวง ร่วมกับ ชุมชนลุ่มน้ำกก</text>

      <!-- 4 STEPS GRID (Huge Visual Cards) -->
      <g transform="translate(30, 140)">
        
        <!-- STEP 1: DIP IN WATER -->
        <g transform="translate(0, 0)">
          <rect x="0" y="0" width="240" height="340" rx="16" fill="#F4F8F4" stroke="#A5D6A7" stroke-width="2"/>
          <circle cx="120" cy="46" r="28" fill="#195640"/>
          <text x="120" y="56" fill="#FFFFFF" font-size="26" font-weight="800" text-anchor="middle">1</text>
          
          <rect x="30" y="90" width="180" height="140" rx="12" fill="#FFFFFF" stroke="#CCD5CC"/>
          <!-- Illustration of glass & strip -->
          <rect x="70" y="110" width="100" height="100" rx="10" fill="#E3F2FD" stroke="#90CAF9"/>
          <line x1="120" y1="80" x2="120" y2="180" stroke="#FFB74D" stroke-width="12" stroke-linecap="round"/>
          <text x="120" y="170" fill="#0D47A1" font-size="12" text-anchor="middle">น้ำตัวอย่าง</text>

          <text x="120" y="260" fill="#195640" font-size="18" font-weight="800" text-anchor="middle">จุ่มแผ่นตรวจ</text>
          <text x="120" y="288" fill="#213E32" font-size="14" font-weight="600" text-anchor="middle">จุ่มลงในน้ำ 5 วินาที</text>
          <text x="120" y="312" fill="#556B60" font-size="12" text-anchor="middle">ให้เปียกทั่วทั้งแผ่น</text>
        </g>

        <!-- STEP 2: SHAKE EXCESS WATER -->
        <g transform="translate(260, 0)">
          <rect x="0" y="0" width="240" height="340" rx="16" fill="#F4F8F4" stroke="#A5D6A7" stroke-width="2"/>
          <circle cx="120" cy="46" r="28" fill="#195640"/>
          <text x="120" y="56" fill="#FFFFFF" font-size="26" font-weight="800" text-anchor="middle">2</text>
          
          <rect x="30" y="90" width="180" height="140" rx="12" fill="#FFFFFF" stroke="#CCD5CC"/>
          <!-- Illustration of strip shaking -->
          <line x1="80" y1="120" x2="160" y2="160" stroke="#FFB74D" stroke-width="12" stroke-linecap="round"/>
          <text x="175" y="145" font-size="20">💧</text>
          <text x="70" y="175" font-size="16">💧</text>

          <text x="120" y="260" fill="#195640" font-size="18" font-weight="800" text-anchor="middle">สะบัดเบาๆ</text>
          <text x="120" y="288" fill="#213E32" font-size="14" font-weight="600" text-anchor="middle">สะบัดน้ำส่วนเกินออก 1 ครั้ง</text>
          <text x="120" y="312" fill="#556B60" font-size="12" text-anchor="middle">ไม่ต้องเช็ดหรือเอามือจับ</text>
        </g>

        <!-- STEP 3: WAIT 30 SECONDS -->
        <g transform="translate(520, 0)">
          <rect x="0" y="0" width="240" height="340" rx="16" fill="#F4F8F4" stroke="#A5D6A7" stroke-width="2"/>
          <circle cx="120" cy="46" r="28" fill="#195640"/>
          <text x="120" y="56" fill="#FFFFFF" font-size="26" font-weight="800" text-anchor="middle">3</text>
          
          <rect x="30" y="90" width="180" height="140" rx="12" fill="#FFFFFF" stroke="#CCD5CC"/>
          <!-- Illustration of Clock -->
          <circle cx="120" cy="160" r="45" fill="#FFF9C4" stroke="#FBC02D" stroke-width="3"/>
          <line x1="120" y1="160" x2="120" y2="130" stroke="#333" stroke-width="4"/>
          <line x1="120" y1="160" x2="145" y2="160" stroke="#D32F2F" stroke-width="3"/>
          <text x="120" y="195" fill="#C45A10" font-size="12" font-weight="700" text-anchor="middle">30 วินาที</text>

          <text x="120" y="260" fill="#195640" font-size="18" font-weight="800" text-anchor="middle">รอเทียบสี</text>
          <text x="120" y="288" fill="#213E32" font-size="14" font-weight="600" text-anchor="middle">วางราบบนโต๊ะ 30 วินาที</text>
          <text x="120" y="312" fill="#556B60" font-size="12" text-anchor="middle">สังเกตการเปลี่ยนสี</text>
        </g>

        <!-- STEP 4: TAKE PHOTO & SEND -->
        <g transform="translate(780, 0)">
          <rect x="0" y="0" width="240" height="340" rx="16" fill="#F4F8F4" stroke="#A5D6A7" stroke-width="2"/>
          <circle cx="120" cy="46" r="28" fill="#195640"/>
          <text x="120" y="56" fill="#FFFFFF" font-size="26" font-weight="800" text-anchor="middle">4</text>
          
          <rect x="30" y="90" width="180" height="140" rx="12" fill="#FFFFFF" stroke="#CCD5CC"/>
          <!-- Illustration of Smartphone Taking Photo -->
          <rect x="75" y="110" width="90" height="100" rx="10" fill="#213E32"/>
          <rect x="85" y="120" width="70" height="75" rx="4" fill="#E8F5E9"/>
          <circle cx="120" cy="155" r="14" fill="#DE9922"/>
          <text x="114" y="160" font-size="12">📸</text>

          <text x="120" y="260" fill="#195640" font-size="18" font-weight="800" text-anchor="middle">ถ่ายรูปส่งระบบ</text>
          <text x="120" y="288" fill="#213E32" font-size="14" font-weight="600" text-anchor="middle">ถ่ายคู่กับแผ่นเทียบสี</text>
          <text x="120" y="312" fill="#556B60" font-size="12" text-anchor="middle">หรือส่งให้ อสม. ช่วยดู</text>
        </g>
      </g>

      <!-- GIANT COLOR COMPARISON CHART AT BOTTOM OF POSTER -->
      <g transform="translate(30, 500)">
        <rect x="0" y="0" width="1020" height="170" rx="16" fill="#FAFAFA" stroke="#D8DFD5" stroke-width="2"/>
        <text x="24" y="36" fill="#195640" font-size="17" font-weight="800">แถบเทียบสีความปลอดภัย (ดูเทียบกับแผ่นตรวจจริงของคุณ):</text>

        <!-- 4 Visual Color Buckets for Villagers -->
        <!-- Bucket 1: Green Safe -->
        <g transform="translate(24, 52)">
          <rect x="0" y="0" width="220" height="100" rx="12" fill="#E8F5E9" stroke="#2E7D32" stroke-width="2"/>
          <rect x="16" y="14" width="70" height="34" rx="6" fill="#DFF0D8" stroke="#468847"/>
          <text x="100" y="36" fill="#1B5E20" font-size="16" font-weight="800">ปลอดภัย</text>
          <text x="16" y="68" fill="#2E7D32" font-size="12" font-weight="600">สีไม่เปลี่ยน / เหลืองอ่อน</text>
          <text x="16" y="86" fill="#556B60" font-size="11">ใช้อาบ ซักล้าง รดผัก ต้มดื่มได้</text>
        </g>

        <!-- Bucket 2: Caution Amber -->
        <g transform="translate(268, 52)">
          <rect x="0" y="0" width="220" height="100" rx="12" fill="#FFF8E1" stroke="#DE9922" stroke-width="2"/>
          <rect x="16" y="14" width="70" height="34" rx="6" fill="#F8E5B8" stroke="#D19C24"/>
          <text x="100" y="36" fill="#C45A10" font-size="16" font-weight="800">เฝ้าระวัง</text>
          <text x="16" y="68" fill="#C45A10" font-size="12" font-weight="600">สีส้มอ่อน</text>
          <text x="16" y="86" fill="#556B60" font-size="11">ใช้รดผักได้ แต่ห้ามดื่มเด็ดขาด</text>
        </g>

        <!-- Bucket 3: Dark Amber Alert -->
        <g transform="translate(512, 52)">
          <rect x="0" y="0" width="220" height="100" rx="12" fill="#FFF3E0" stroke="#E65100" stroke-width="2"/>
          <rect x="16" y="14" width="70" height="34" rx="6" fill="#E89B58" stroke="#B85818"/>
          <text x="100" y="36" fill="#B71C1C" font-size="16" font-weight="800">อันตราย</text>
          <text x="16" y="68" fill="#B71C1C" font-size="12" font-weight="600">สีส้มเข้ม</text>
          <text x="16" y="86" fill="#556B60" font-size="11">งดใช้น้ำ รีบแจ้งผู้ใหญ่บ้าน</text>
        </g>

        <!-- Bucket 4: Brown/Black Critical -->
        <g transform="translate(756, 52)">
          <rect x="0" y="0" width="240" height="100" rx="12" fill="#FFEBEE" stroke="#C62828" stroke-width="2"/>
          <rect x="16" y="14" width="70" height="34" rx="6" fill="#7A4328" stroke="#4A2010"/>
          <text x="100" y="36" fill="#C62828" font-size="16" font-weight="800">อันตรายสูงสุด</text>
          <text x="16" y="68" fill="#C62828" font-size="12" font-weight="600">สีน้ำตาล - สีดำ</text>
          <text x="16" y="86" fill="#556B60" font-size="11">ห้ามสัมผัส ส่งเจ้าหน้าที่ตรวจด่วน</text>
        </g>
      </g>

      <!-- Bottom Contacts -->
      <g transform="translate(30, 690)">
        <text x="24" y="50" fill="#195640" font-size="14" font-weight="700">📞 ขอรับแผ่นตรวจน้ำฟรี หรือสอบถามเพิ่มเติม: ศาลาประชาคมหมู่บ้าน หรือติดต่อ อสม. ประจำคุ้ม</text>
      </g>
    </g>
    """
    return svg_wrapper(1200, 960, content)

# -------------------------------------------------------------
# Generate All 9 Screens
# -------------------------------------------------------------
screens = [
    ("screen-01-map.svg", screen_01_map),
    ("screen-02-survey.svg", screen_02_survey),
    ("screen-03-detail.svg", screen_03_detail),
    ("screen-04-flood.svg", screen_04_flood),
    ("screen-05-evac.svg", screen_05_evac),
    ("screen-06-admin-review.svg", screen_06_admin_review),
    ("screen-07-admin-table.svg", screen_07_admin_table),
    ("screen-08-notice.svg", screen_08_notice),
    ("screen-09-guide-a0.svg", screen_09_guide_a0),
]

for filename, generator in screens:
    filepath = os.path.join(OUTPUT_DIR, filename)
    with open(filepath, "w", encoding="utf-8") as f:
        f.write(generator())
    print(f"Generated Production Villager Screen: {filepath}")

print("All 9 Production-Grade Villager UI Screens successfully generated!")
