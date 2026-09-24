// ข้อมูล GeoJSON สำหรับชั้นข้อมูลเส้นขอบเขตการปกครองและพื้นที่ (Administrative / Boundaries)
// ครอบคลุมพื้นที่ลุ่มน้ำกก (ท่าตอน-แม่อาย-เชียงใหม่-เชียงราย)

// 1. เส้นพรมแดนระหว่างประเทศ (Country: ไทย - เมียนมา)
export const COUNTRY_BOUNDARY_GEOJSON = {
  type: 'FeatureCollection',
  features: [
    {
      type: 'Feature',
      properties: {
        id: 'bnd-country-th-mm',
        name: 'เส้นพรมแดนไทย - เมียนมา (Thailand - Myanmar Border)',
        level: 'country',
        type: 'international'
      },
      geometry: {
        type: 'LineString',
        coordinates: [
          [99.1800, 20.1250],
          [99.2250, 20.1100],
          [99.2700, 20.0980],
          [99.3150, 20.0920],
          [99.3400, 20.0850],
          [99.3650, 20.0880],
          [99.4000, 20.1050],
          [99.4500, 20.1300],
          [99.5000, 20.1600],
          [99.5600, 20.1900],
          [99.6200, 20.2150]
        ]
      }
    }
  ]
};

// 2. เส้นแบ่งเขตจังหวัด / รัฐ (Province: เชียงใหม่ - เชียงราย)
export const PROVINCE_BOUNDARY_GEOJSON = {
  type: 'FeatureCollection',
  features: [
    {
      type: 'Feature',
      properties: {
        id: 'bnd-prov-cm-cr',
        name: 'แนวแบ่งเขต จ.เชียงใหม่ - จ.เชียงราย',
        level: 'province',
        color: '#8b5cf6'
      },
      geometry: {
        type: 'LineString',
        coordinates: [
          [99.5200, 20.1800],
          [99.5350, 20.1350],
          [99.5500, 20.0950],
          [99.5580, 20.0600],
          [99.5620, 20.0200],
          [99.5700, 19.9800],
          [99.5850, 19.9400]
        ]
      }
    }
  ]
};

// 3. ขอบเขตอำเภอ / เขต / เมือง (Locality: อ.แม่อาย จ.เชียงใหม่ & อ.เมือง จ.เชียงราย)
export const LOCALITY_BOUNDARY_GEOJSON = {
  type: 'FeatureCollection',
  features: [
    {
      type: 'Feature',
      properties: {
        id: 'bnd-dist-maeai',
        name: 'ขอบเขตอำเภอแม่อาย (Mae Ai District)',
        level: 'locality'
      },
      geometry: {
        type: 'Polygon',
        coordinates: [
          [
            [99.2800, 20.0200],
            [99.2800, 20.0900],
            [99.3400, 20.0850],
            [99.4500, 20.1000],
            [99.5500, 20.0950],
            [99.5600, 20.0300],
            [99.4800, 19.9900],
            [99.3600, 19.9800],
            [99.2800, 20.0200]
          ]
        ]
      }
    },
    {
      type: 'Feature',
      properties: {
        id: 'bnd-dist-cr-mueang',
        name: 'ขอบเขตอำเภอเมืองเชียงราย (Mueang Chiang Rai District)',
        level: 'locality'
      },
      geometry: {
        type: 'Polygon',
        coordinates: [
          [
            [99.5500, 20.0950],
            [99.6500, 20.1100],
            [99.7800, 20.0600],
            [99.8800, 19.9600],
            [99.8200, 19.8800],
            [99.6800, 19.9200],
            [99.5600, 20.0300],
            [99.5500, 20.0950]
          ]
        ]
      }
    }
  ]
};

// 4. ขอบเขตตำบล / แขวง / ย่านชุมชน (Sublocality: ต.ท่าตอน, ต.หมอกจ๋าม, ต.แม่อาย)
export const SUBLOCALITY_BOUNDARY_GEOJSON = {
  type: 'FeatureCollection',
  features: [
    {
      type: 'Feature',
      properties: {
        id: 'bnd-sub-thaton',
        name: 'ขอบเขตตำบลท่าตอน (Tha Ton Subdistrict)',
        level: 'sublocality'
      },
      geometry: {
        type: 'Polygon',
        coordinates: [
          [
            [99.3300, 20.0400],
            [99.3300, 20.0850],
            [99.4200, 20.0850],
            [99.4300, 20.0400],
            [99.3800, 20.0300],
            [99.3300, 20.0400]
          ]
        ]
      }
    },
    {
      type: 'Feature',
      properties: {
        id: 'bnd-sub-mokjam',
        name: 'ขอบเขตตำบลหมอกจ๋าม (Mok Cham Subdistrict)',
        level: 'sublocality'
      },
      geometry: {
        type: 'Polygon',
        coordinates: [
          [
            [99.4200, 20.0400],
            [99.4200, 20.0850],
            [99.5500, 20.0950],
            [99.5500, 20.0350],
            [99.4800, 20.0250],
            [99.4200, 20.0400]
          ]
        ]
      }
    },
    {
      type: 'Feature',
      properties: {
        id: 'bnd-sub-maeai',
        name: 'ขอบเขตตำบลแม่อาย (Mae Ai Subdistrict)',
        level: 'sublocality'
      },
      geometry: {
        type: 'Polygon',
        coordinates: [
          [
            [99.2800, 20.0200],
            [99.2800, 20.0700],
            [99.3300, 20.0850],
            [99.3300, 20.0400],
            [99.3500, 19.9900],
            [99.2800, 20.0200]
          ]
        ]
      }
    }
  ]
};

// 5. แปลงที่ดิน (Land Parcel): แปลงเกษตรกรรมและโฉนดที่ดินตัวอย่างริมสองฝั่งน้ำกก
export const LAND_PARCEL_BOUNDARY_GEOJSON = {
  type: 'FeatureCollection',
  features: [
    // แปลงริมน้ำท่าตอน ฝั่งเหนือ
    {
      type: 'Feature',
      properties: { id: 'parcel-101', name: 'แปลงที่ดิน น.ส.3ก 4102', zone: 'ริมน้ำกกเหนือสะพาน' },
      geometry: {
        type: 'Polygon',
        coordinates: [[[99.3550, 20.0620], [99.3620, 20.0635], [99.3605, 20.0590], [99.3535, 20.0580], [99.3550, 20.0620]]]
      }
    },
    {
      type: 'Feature',
      properties: { id: 'parcel-102', name: 'แปลงที่ดิน โฉนด 1829', zone: 'ริมน้ำกกเหนือสะพาน' },
      geometry: {
        type: 'Polygon',
        coordinates: [[[99.3620, 20.0635], [99.3700, 20.0645], [99.3685, 20.0600], [99.3605, 20.0590], [99.3620, 20.0635]]]
      }
    },
    // แปลงริมน้ำท่าตอน ฝั่งใต้ (บ้านท่าดอย)
    {
      type: 'Feature',
      properties: { id: 'parcel-103', name: 'แปลงที่ดิน โฉนด 2940', zone: 'บ้านท่าดอย' },
      geometry: {
        type: 'Polygon',
        coordinates: [[[99.3660, 20.0560], [99.3750, 20.0570], [99.3735, 20.0520], [99.3645, 20.0515], [99.3660, 20.0560]]]
      }
    },
    {
      type: 'Feature',
      properties: { id: 'parcel-104', name: 'แปลงที่ดิน น.ส.3ก 8831', zone: 'บ้านท่าดอย' },
      geometry: {
        type: 'Polygon',
        coordinates: [[[99.3750, 20.0570], [99.3840, 20.0585], [99.3820, 20.0535], [99.3735, 20.0520], [99.3750, 20.0570]]]
      }
    },
    // แปลงสวนส้มและเกษตรกรรม ต.หมอกจ๋าม
    {
      type: 'Feature',
      properties: { id: 'parcel-105', name: 'แปลงเกษตรกรรม 551', zone: 'หมอกจ๋าม' },
      geometry: {
        type: 'Polygon',
        coordinates: [[[99.4320, 20.0510], [99.4450, 20.0530], [99.4420, 20.0460], [99.4300, 20.0440], [99.4320, 20.0510]]]
      }
    },
    {
      type: 'Feature',
      properties: { id: 'parcel-106', name: 'แปลงเกษตรกรรม 552', zone: 'หมอกจ๋าม' },
      geometry: {
        type: 'Polygon',
        coordinates: [[[99.4450, 20.0530], [99.4580, 20.0545], [99.4550, 20.0475], [99.4420, 20.0460], [99.4450, 20.0530]]]
      }
    },
    // แปลงเกษตรกรรม ริมน้ำกก อ.เมืองเชียงราย
    {
      type: 'Feature',
      properties: { id: 'parcel-107', name: 'แปลงที่ดินริมกก 904', zone: 'ดอยฮาง' },
      geometry: {
        type: 'Polygon',
        coordinates: [[[99.7600, 19.9280], [99.7720, 19.9300], [99.7690, 19.9230], [99.7580, 19.9215], [99.7600, 19.9280]]]
      }
    }
  ]
};
