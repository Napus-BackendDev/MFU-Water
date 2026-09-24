// ข้อมูลพิกัดและป้ายชื่อระบุประเทศ จังหวัด และอำเภอสำคัญบนแผนที่

export const TERRITORY_LABELS = [
  // 1. ระดับประเทศ (Country Badges)
  {
    id: 'country-myanmar',
    type: 'country',
    name: '🇲🇲 ประเทศเมียนมา (Myanmar)',
    nameEn: 'Republic of the Union of Myanmar',
    subtext: 'รัฐฉาน (Shan State) • ต้นกำเนิดแม่น้ำกก',
    coordinates: [99.2000, 20.1700],
    bgColor: 'bg-amber-500/90 text-slate-950 font-bold border-amber-300',
    borderColor: '#f59e0b',
    textColor: '#ffffff',
    fontSize: 'text-xs sm:text-sm'
  },
  {
    id: 'country-thailand',
    type: 'country',
    name: '🇹🇭 ประเทศไทย (Thailand)',
    nameEn: 'Kingdom of Thailand',
    subtext: 'ภาคเหนือตอนบน • ลุ่มน้ำกก',
    coordinates: [99.6200, 20.0600],
    bgColor: 'bg-sky-600/90 text-white font-bold border-sky-300',
    borderColor: '#0284c7',
    textColor: '#ffffff',
    fontSize: 'text-xs sm:text-sm'
  },

  // 2. ระดับจังหวัด (Province Badges)
  {
    id: 'prov-chiangmai',
    type: 'province',
    name: '📍 จังหวัดเชียงใหม่',
    nameEn: 'Chiang Mai Province',
    subtext: 'โซนต้นน้ำกก (อ.แม่อาย)',
    coordinates: [99.3700, 20.0800],
    bgColor: 'bg-cyan-600/90 text-white font-semibold border-cyan-400',
    borderColor: '#06b6d4',
    textColor: '#ffffff',
    fontSize: 'text-xs'
  },
  {
    id: 'prov-chiangrai',
    type: 'province',
    name: '📍 จังหวัดเชียงราย',
    nameEn: 'Chiang Rai Province',
    subtext: 'โซนกลางน้ำและปลายน้ำสู่แม่น้ำโขง',
    coordinates: [99.8500, 19.9800],
    bgColor: 'bg-blue-600/90 text-white font-semibold border-blue-400',
    borderColor: '#3b82f6',
    textColor: '#ffffff',
    fontSize: 'text-xs'
  },

  // 3. ระดับอำเภอ / สถานที่สำคัญ (District & Landmarks)
  {
    id: 'dist-maeai',
    type: 'district',
    name: 'อำเภอแม่อาย',
    nameEn: 'Mae Ai District',
    subtext: 'ต.ท่าตอน / ต.แม่อาย',
    coordinates: [99.4000, 20.0150],
    bgColor: 'bg-slate-900/90 text-slate-100 border-slate-700',
    borderColor: '#64748b',
    textColor: '#e2e8f0',
    fontSize: 'text-[11px]'
  },
  {
    id: 'dist-mueang',
    type: 'district',
    name: 'อำเภอเมืองเชียงราย',
    nameEn: 'Mueang Chiang Rai District',
    subtext: 'ตัวเมืองเชียงราย • เทศบาลนครเชียงราย',
    coordinates: [99.8200, 19.8900],
    bgColor: 'bg-slate-900/90 text-slate-100 border-slate-700',
    borderColor: '#64748b',
    textColor: '#e2e8f0',
    fontSize: 'text-[11px]'
  },
  {
    id: 'dist-wiangchai',
    type: 'district',
    name: 'อำเภอเวียงชัย',
    nameEn: 'Wiang Chai District',
    subtext: 'ต.เวียงชัย / ต.เวียงเหนือ',
    coordinates: [99.9300, 19.9350],
    bgColor: 'bg-slate-900/90 text-slate-100 border-slate-700',
    borderColor: '#64748b',
    textColor: '#e2e8f0',
    fontSize: 'text-[11px]'
  },
  {
    id: 'dist-chiangsaen',
    type: 'district',
    name: 'อำเภอเชียงแสน',
    nameEn: 'Chiang Saen District',
    subtext: 'สามเหลี่ยมทองคำ • สบกก',
    coordinates: [100.0600, 20.1250],
    bgColor: 'bg-slate-900/90 text-slate-100 border-slate-700',
    borderColor: '#64748b',
    textColor: '#e2e8f0',
    fontSize: 'text-[11px]'
  },
  {
    id: 'landmark-mekong',
    type: 'river',
    name: '🌊 แม่น้ำโขง (Mekong River)',
    nameEn: 'Mekong River Boundary',
    subtext: 'จุดรับน้ำจากแม่น้ำกกที่สบกก',
    coordinates: [100.1400, 20.1400],
    bgColor: 'bg-indigo-900/90 text-indigo-200 border-indigo-500',
    borderColor: '#6366f1',
    textColor: '#c7d2fe',
    fontSize: 'text-xs'
  },
  {
    id: 'border-point',
    type: 'border',
    name: '🚧 พรมแดนไทย - เมียนมา',
    nameEn: 'Thailand - Myanmar Border',
    subtext: 'จุดแม่น้ำกกข้ามแดนเข้าสู่ประเทศไทย',
    coordinates: [99.3300, 20.0850],
    bgColor: 'bg-rose-950/90 text-rose-300 border-rose-500',
    borderColor: '#f43f5e',
    textColor: '#fda4af',
    fontSize: 'text-[11px]'
  }
];

// เส้นพรมแดนไทย-เมียนมา (จำลองแนวเขตแดน)
export const BORDER_LINE = {
  type: 'FeatureCollection',
  features: [
    {
      type: 'Feature',
      properties: {
        name: 'พรมแดนไทย-เมียนมา (Thailand-Myanmar Border)'
      },
      geometry: {
        type: 'LineString',
        coordinates: [
          [99.2500, 20.2500],
          [99.2800, 20.2000],
          [99.3000, 20.1500],
          [99.3200, 20.1000],
          [99.3300, 20.0750], // จุดแม่น้ำกกตัดผ่านพรมแดน
          [99.3400, 20.0400],
          [99.3200, 20.0000]
        ]
      }
    }
  ]
};
