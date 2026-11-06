# Prompt สำหรับเจนภาพมาสคอตหนูตัวใหม่ (ใช้กับเครื่องมือเจนภาพที่รับภาพอ้างอิงได้)

แนบภาพต้นแบบ 2 ภาพของมหาวิทยาลัย (ตัวเตะบอล และตัวถือกล้อง) เป็น reference ทุกครั้ง แล้วใช้ prompt ฐานต่อด้วยท่าที่ต้องการ

## Prompt ฐาน (ต่อท้ายทุกท่า)
Use the attached mascot as the exact character reference: a grey mole mascot, flat 2D vector illustration style, wide rounded head with short white dash marks on the top-left of the head, small black eyes with white highlights, pink rounded muzzle with a red heart-shaped nose, small white buck tooth and gentle smile, pear-shaped grey body, small yellow three-petal flower brooch on the chest, thin arms with three pointed claws, red pointed shoes, thin tail. Keep identical proportions, colours and line-free flat shading. Plain solid white background (or transparent PNG), centered, full body, 1024x1024, no text, no logo, no "20 years" badge.

## ท่าที่ต้องการ
1. loading — standing and bouncing happily, both arms raised waving, a few light-blue water drops around it
2. waiting — one hand on chin, looking up, thoughtful, tiny hourglass beside it
3. camera — holding a small black camera in both hands, taking a photo of a water sample, tiny flash sparkle
4. success — cheering with both arms up, big happy open smile
5. error — confused or worried face, both arms out in a shrug, one sweat drop

## แอนิเมชันโหลดดิ้ง (ถ้าต้องการให้ขยับจากภาพเจน)
- ขอท่า loading 4–6 เฟรม (ตัวเดียวกัน ตำแหน่งเท้าเท่ากัน ไล่ท่าเด้งขึ้น-ลง) พื้นหลังโปร่งใส ไฟล์ PNG ขนาดเท่ากัน
- ผมจะประกอบเป็น GIF/CSS sprite และใส่ในมอกอัปและแอป

## ที่ผมจะทำเมื่อได้ภาพ
แทนที่ภาพมาสคอต SVG ใน S0–S0.4 และแผ่นชุดมาสคอต M บน canvas ด้วยภาพที่เจนจริง และทำ GIF/สไปรต์โหลดดิ้งจากเฟรมที่ได้
