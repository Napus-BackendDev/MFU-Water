// Names correspond exactly to shapeName in the local geoBoundaries files; geometry is unchanged.
export const BOUNDARY_THAI_NAMES = {
  country: {
    Thailand: 'ประเทศไทย'
  },
  province: {
    'Chiang Rai Province': 'จังหวัดเชียงราย',
    'Chiang Mai Province': 'จังหวัดเชียงใหม่'
  },
  locality: {
    'Chai Prakan': 'อำเภอไชยปราการ',
    'Chiang Dao': 'อำเภอเชียงดาว',
    'Chiang Saen': 'อำเภอเชียงแสน',
    Fang: 'อำเภอฝาง',
    'Mae Ai': 'อำเภอแม่อาย',
    'Mae Chan': 'อำเภอแม่จัน',
    'Mae Fa Luang': 'อำเภอแม่ฟ้าหลวง',
    'Mae Lao': 'อำเภอแม่ลาว',
    'Mae Sai': 'อำเภอแม่สาย',
    'Mae Suai': 'อำเภอแม่สรวย',
    'Mueang Chiang Rai': 'อำเภอเมืองเชียงราย',
    'Pa Daet': 'อำเภอป่าแดด',
    Phan: 'อำเภอพาน',
    Phrao: 'อำเภอพร้าว',
    Thoeng: 'อำเภอเทิง',
    'Wiang Chai': 'อำเภอเวียงชัย',
    'Wiang Chiang Rung': 'อำเภอเวียงเชียงรุ้ง',
    'Wiang Pa Pao': 'อำเภอเวียงป่าเป้า'
  }
};

export function thaiBoundaryName(level, sourceName) {
  return BOUNDARY_THAI_NAMES[level]?.[sourceName] || '';
}

export function thaiBoundaryLabelExpression(level) {
  return [
    'match',
    ['get', 'shapeName'],
    ...Object.entries(BOUNDARY_THAI_NAMES[level] || {}).flat(),
    ''
  ];
}
