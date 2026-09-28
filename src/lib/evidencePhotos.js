export const MAX_EVIDENCE_BYTES = 1.5 * 1024 * 1024;
export const MAX_SUBMISSION_BYTES = 3.5 * 1024 * 1024;
export const MAX_SAMPLE_BYTES = 64 * 1024;

async function decodePhoto(file) {
  if (typeof createImageBitmap === 'function') return createImageBitmap(file, { imageOrientation: 'from-image' });
  const url = URL.createObjectURL(file);
  try {
    const image = new Image();
    await new Promise((resolve, reject) => {
      const timer = setTimeout(() => reject(new Error('อ่านรูปไม่สำเร็จ กรุณาเลือกใหม่')), 30_000);
      image.onload = () => { clearTimeout(timer); resolve(); };
      image.onerror = () => { clearTimeout(timer); reject(new Error('อ่านรูปไม่สำเร็จ กรุณาเลือกใหม่')); };
      image.src = url;
    });
    return image;
  } finally { URL.revokeObjectURL(url); }
}

// Redraw rather than upload original file metadata; retain original aspect ratio.
export async function compressEvidencePhoto(file, { decode = decodePhoto, canvas = () => document.createElement('canvas') } = {}) {
  if (!['image/jpeg', 'image/png', 'image/webp'].includes(file?.type)) throw new Error('รองรับเฉพาะภาพ JPEG, PNG หรือ WebP');
  if (!file.size || file.size > 10 * 1024 * 1024) throw new Error('รูปต้นฉบับต้องมีขนาดไม่เกิน 10 MiB');
  const image = await decode(file);
  let surface;
  try {
    const width = image.naturalWidth || image.width;
    const height = image.naturalHeight || image.height;
    if (!width || !height || width * height > 30_000_000) throw new Error('ความละเอียดรูปสูงเกินไป กรุณาเลือกรูปเล็กลง');
    surface = canvas();
    let scale = Math.min(1, 2048 / Math.max(width, height));
    for (let attempt = 0; attempt < 5; attempt++, scale *= 0.75) {
      surface.width = Math.max(1, Math.round(width * scale));
      surface.height = Math.max(1, Math.round(height * scale));
      const context = surface.getContext('2d');
      if (!context) throw new Error('เบราว์เซอร์ไม่รองรับการลดขนาดรูป');
      context.fillStyle = '#ffffff';
      context.fillRect(0, 0, surface.width, surface.height);
      context.drawImage(image, 0, 0, surface.width, surface.height);
      for (const quality of [0.88, 0.76, 0.64]) {
        const blob = await new Promise((resolve, reject) => {
          const timer = setTimeout(() => reject(new Error('ลดขนาดรูปไม่สำเร็จ กรุณาลองใหม่')), 30_000);
          try { surface.toBlob(value => { clearTimeout(timer); resolve(value); }, 'image/jpeg', quality); }
          catch (error) { clearTimeout(timer); reject(error); }
        });
        if (!blob || blob.type !== 'image/jpeg' || !blob.size) throw new Error('ลดขนาดรูปไม่สำเร็จ กรุณาเลือกใหม่');
        if (blob.size <= MAX_EVIDENCE_BYTES) return blob;
      }
    }
    throw new Error('ลดขนาดรูปให้ต่ำกว่า 1.5 MiB ไม่สำเร็จ กรุณาเลือกรูปอื่น');
  } finally {
    image.close?.();
    if (surface) { surface.width = 0; surface.height = 0; }
  }
}

export async function createEvidenceForm(record, photos) {
  if (photos.length > 2) throw new Error('แนบรูปได้ไม่เกิน 2 รูป');
  const sample = JSON.stringify(record);
  if (new Blob([sample]).size > MAX_SAMPLE_BYTES) throw new Error('ข้อมูลผลตรวจมีขนาดใหญ่เกินไป');
  const form = new FormData();
  form.set('sample', sample);
  for (const photo of photos) {
    if (photo.type !== 'image/jpeg' || !photo.size || photo.size > MAX_EVIDENCE_BYTES) throw new Error('กรุณาลดขนาดรูปก่อนส่ง ไม่เกิน 1.5 MiB ต่อรูป');
    form.append('photos', photo, 'evidence.jpg');
  }
  // Measure encoded multipart including boundaries and UTF-8 fields, before fetch.
  const bytes = (await new Response(form).arrayBuffer()).byteLength;
  if (bytes > MAX_SUBMISSION_BYTES) throw new Error('ข้อมูลและรูปมีขนาดรวมใหญ่เกินไป กรุณาเลือกรูปเล็กลง');
  return form;
}
