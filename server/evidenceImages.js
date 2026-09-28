import sharp from 'sharp';

export const MAX_EVIDENCE_OUTPUT_BYTES = 1.5 * 1024 * 1024;
const MAX_INPUT_BYTES = 10 * 1024 * 1024;

// Always re-encode, including legacy evidence, to remove metadata and bound responses.
export async function encodeEvidenceImage(input) {
  if (!Buffer.isBuffer(input) || !input.length || input.length > MAX_INPUT_BYTES) {
    throw Object.assign(new Error('ขนาดรูปหลักฐานไม่ถูกต้อง'), { status: 413 });
  }
  try {
    const options = { failOn: 'error', limitInputPixels: 30_000_000 };
    const metadata = await sharp(input, options).metadata();
    if (!['jpeg', 'png', 'webp'].includes(metadata.format) || (metadata.pages || 1) > 1) {
      throw Object.assign(new Error('รองรับเฉพาะภาพนิ่ง JPEG, PNG หรือ WebP'), { status: 415 });
    }
    for (let attempt = 0; attempt < 5; attempt++) {
      const edge = Math.round(2048 * 0.75 ** attempt);
      for (const quality of [88, 76, 64]) {
        const output = await sharp(input, options).rotate()
          .resize(edge, edge, { fit: 'inside', withoutEnlargement: true })
          .flatten({ background: '#ffffff' })
          .jpeg({ quality, mozjpeg: true }).toBuffer();
        if (output.length > 0 && output.length <= MAX_EVIDENCE_OUTPUT_BYTES) return output;
      }
    }
    throw Object.assign(new Error('ลดขนาดรูปหลักฐานไม่สำเร็จ'), { status: 413 });
  } catch (error) {
    if (error.status) throw error;
    throw Object.assign(new Error('อ่านหรือแปลงรูปหลักฐานไม่สำเร็จ'), { status: 415 });
  }
}
