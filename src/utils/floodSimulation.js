/**
 * โมเดลคำนวณและประเมินสถานการณ์น้ำท่วมลุ่มน้ำแม่กก
 */

export function evaluateFloodRisk(waterLevelMeters) {
  // waterLevelMeters: 0 - 8.0 m
  const level = Number(waterLevelMeters);

  if (level < 1.5) {
    return {
      status: 'normal',
      levelText: 'ปกติ (Normal)',
      color: '#10b981', // green-500
      badgeClass: 'bg-emerald-500/20 text-emerald-400 border-emerald-500/40',
      description: 'ระดับน้ำอยู่ในลำน้ำปกติ ตลิ่งรับน้ำได้ดี ไม่มีผลกระทบต่อชุมชนริมน้ำ',
      warningAdvice: 'กิจกรรมทางน้ำและสัญจรได้ตามปกติ',
      riskScore: Math.round((level / 1.5) * 25),
      floodAreaSqKm: (0.4 + level * 0.3).toFixed(1),
      affectedPopulation: Math.round(150 * level),
      flowRateCms: Math.round(180 + level * 70) // ลูกบาศก์เมตรต่อวินาที (m³/s)
    };
  } else if (level < 3.0) {
    return {
      status: 'watch',
      levelText: 'เฝ้าระวัง (Watch)',
      color: '#eab308', // yellow-500
      badgeClass: 'bg-amber-500/20 text-amber-400 border-amber-500/40',
      description: 'ระดับน้ำเริ่มสูงชิดขอบตลิ่ง บริเวณพื้นที่ลุ่มต่ำหาดเชียงรายเริ่มมีน้ำเอ่อ',
      warningAdvice: 'เฝ้าระวังผู้พักอาศัยริมน้ำ เตรียมยกของขึ้นที่สูงชั้นที่ 1',
      riskScore: Math.round(25 + ((level - 1.5) / 1.5) * 25),
      floodAreaSqKm: (1.2 + (level - 1.5) * 1.4).toFixed(1),
      affectedPopulation: Math.round(1200 + (level - 1.5) * 1800),
      flowRateCms: Math.round(350 + level * 95)
    };
  } else if (level < 5.0) {
    return {
      status: 'warning',
      levelText: 'เตือนภัยล้นตลิ่ง (Warning)',
      color: '#f97316', // orange-500
      badgeClass: 'bg-orange-500/20 text-orange-400 border-orange-500/40',
      description: 'น้ำล้นตลิ่งเข้าท่วมชุมชนริมน้ำกก เกาะลอย และพื้นที่เกษตรกรรมโดยรอบ',
      warningAdvice: 'แจ้งเตือนอพยพกลุ่มเปราะบาง เคลื่อนย้ายยานพาหนะและทรัพย์สินสำคัญ',
      riskScore: Math.round(50 + ((level - 3.0) / 2.0) * 25),
      floodAreaSqKm: (3.5 + (level - 3.0) * 3.8).toFixed(1),
      affectedPopulation: Math.round(4500 + (level - 3.0) * 4200),
      flowRateCms: Math.round(650 + level * 140)
    };
  } else {
    return {
      status: 'critical',
      levelText: 'วิกฤตน้ำท่วมรุนแรง (Critical)',
      color: '#ef4444', // red-500
      badgeClass: 'bg-rose-500/20 text-rose-400 border-rose-500/40',
      description: 'น้ำท่วมล้นสะพานขัวพญามังราย กระทบโครงข่ายการจราจรและเขตเศรษฐกิจเมืองเชียงราย',
      warningAdvice: 'ระดับสูงสุดตามเกณฑ์ภัยพิบัติ อพยพประชาชนสู่ศูนย์พักพิงปลอดภัยทันที',
      riskScore: Math.min(100, Math.round(75 + ((level - 5.0) / 3.0) * 25)),
      floodAreaSqKm: (11.2 + (level - 5.0) * 5.5).toFixed(1),
      affectedPopulation: Math.round(13500 + (level - 5.0) * 6500),
      flowRateCms: Math.round(1100 + level * 180)
    };
  }
}
