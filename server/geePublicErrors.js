// Provider exceptions can contain credentials and internal URLs. Do not serialize them.
export function sendGeeFailure(res, status = 502) {
  const code = [400, 404, 500, 502].includes(status) ? status : 502;
  const message = code === 404 ? 'ไม่พบภาพในช่วงที่เลือก ลองเปลี่ยนช่วงวันที่'
    : code === 400 ? 'คำขอวิเคราะห์ไม่ถูกต้อง'
      : 'Earth Engine ประมวลผลไม่สำเร็จ กรุณาลองใหม่';
  return res.status(code).set('Cache-Control', 'no-store').json({ error: message });
}
