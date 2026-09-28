import { pointInGeometry, shouldShowAreaSamples } from './mapAreaNavigation.js';

export function submittedSampleVisibility(saved, published, area, areaFeature, regions) {
  const code = saved.sample_code;
  if (saved.publication_status === 'pending_review') return { message: `รับผล ${code} แล้ว — เกิน 50 PPB ผลและรูปรอผู้ดูแลอนุมัติ จึงยังไม่แสดงบนแผนที่` };
  const sample = Array.isArray(published) && published.find(item => item.sample_code === code);
  if (!sample) return { message: `รับผล ${code} แล้ว แต่ยังตรวจยืนยันการแสดงผลสาธารณะไม่ได้ กรุณารอรีเฟรชหรือตรวจบริการ API ไม่ต้องส่งซ้ำ` };
  const features = Array.isArray(areaFeature) ? areaFeature : areaFeature ? [areaFeature] : [];
  const inside = shouldShowAreaSamples(area) && features.some(f => pointInGeometry(sample.coordinates, f.geometry));
  const region = !inside && regions?.features?.find(f => pointInGeometry(sample.coordinates, f.geometry));
  const selection = region ? { level: 'region', countryIso: 'THA', regionId: region.properties.regionId } : null;
  if (!inside && !selection) return { message: `ผล ${code} เผยแพร่แล้ว แต่พิกัดอยู่นอกพื้นที่แผนที่ที่รองรับ` };
  return { selection, resetFilters: true, message: `ผล ${code} อยู่ในข้อมูลสาธารณะแล้ว — เปิดพื้นที่และช่วงเวลาทั้งหมดให้ หากยังไม่เห็นหมุด ให้เปิดสวิตช์จุดตรวจวัดในตั้งค่า` };
}
