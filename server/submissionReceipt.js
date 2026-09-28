const STATUSES = new Set(['auto_published', 'approved', 'pending_review', 'rejected', 'withdrawn']);

function unavailable() {
  return Object.assign(new Error('ยืนยันผลการบันทึกไม่สำเร็จ กรุณาลองส่งข้อมูลเดิมอีกครั้ง'), { status: 503 });
}

// A replay receipt describes the stored row, never the latest incoming payload.
export async function submissionReceipt(result, submitted, service) {
  if (!result || typeof result.sample_code !== 'string' || !result.sample_code ||
      (result.duplicate !== undefined && typeof result.duplicate !== 'boolean')) throw unavailable();
  let row = submitted;
  if (result.duplicate) {
    const { data, error } = await service.from('kok_water_samples')
      .select('sample_code, publication_status, revision')
      .eq('sample_code', result.sample_code).maybeSingle();
    if (error || !data || data.sample_code !== result.sample_code) throw unavailable();
    row = data;
  } else if (result.sample_code !== submitted.sample_code) {
    throw unavailable();
  }
  if (!STATUSES.has(row.publication_status) || !Number.isInteger(row.revision) || row.revision < 1) throw unavailable();
  return { success: true, status: row.publication_status, sample_code: result.sample_code, revision: row.revision };
}
