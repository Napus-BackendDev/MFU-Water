export async function readGeeApiResponse(response, label) {
  const contentType = response.headers.get('content-type') || '';
  if (!contentType.toLowerCase().includes('application/json')) {
    if (response.status === 404) {
      throw new Error('API วิเคราะห์น้ำยังไม่พร้อม กรุณารีสตาร์ต npm run dev');
    }
    throw new Error(`${label} ตอบกลับไม่ใช่ JSON (HTTP ${response.status}) กรุณารีสตาร์ต npm run dev`);
  }

  let data;
  try {
    data = await response.json();
  } catch {
    throw new Error(`${label} ส่ง JSON ไม่ถูกต้อง (HTTP ${response.status})`);
  }
  if (!response.ok) throw new Error(data?.error || `${label} ล้มเหลว (HTTP ${response.status})`);
  return data;
}
