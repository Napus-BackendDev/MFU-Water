// GeoJSON ข้อมูลสายน้ำแม่น้ำกก และพื้นที่ลุ่มน้ำท่วมถึง (Floodplains)

export const KOK_RIVER_LINE = {
  type: 'FeatureCollection',
  features: [
    {
      type: 'Feature',
      properties: {
        name: 'แม่น้ำกก (Kok River)',
        category: 'main_river',
        avgWidth: 80
      },
      geometry: {
        type: 'LineString',
        coordinates: [
          [99.6600, 19.9720],
          [99.6850, 19.9620],
          [99.7120, 19.9480],
          [99.7400, 19.9380],
          [99.7750, 19.9200],
          [99.8050, 19.9070],
          [99.8200, 19.9110],
          [99.8295, 19.9142], // สะพานขัวพญามังราย
          [99.8375, 19.9175], // เกาะลอย
          [99.8458, 19.9240], // ฝายเชียงราย
          [99.8700, 19.9325], // บรรจบน้ำกรณ์
          [99.8950, 19.9420],
          [99.9300, 19.9600],
          [99.9700, 19.9850],
          [100.0200, 20.0200],
          [100.0700, 20.0600],
          [100.1500, 20.1200]
        ]
      }
    },
    {
      type: 'Feature',
      properties: {
        name: 'แม่น้ำกรณ์ (Mae Korn)',
        category: 'tributary',
        avgWidth: 35
      },
      geometry: {
        type: 'LineString',
        coordinates: [
          [99.8200, 19.8600],
          [99.8350, 19.8800],
          [99.8500, 19.9050],
          [99.8620, 19.9200],
          [99.8700, 19.9325] // บรรจบแม่น้ำกก
        ]
      }
    },
    {
      type: 'Feature',
      properties: {
        name: 'อ่างเก็บน้ำ มหาวิทยาลัยแม่ฟ้าหลวง (MFU Lake)',
        category: 'reservoir'
      },
      geometry: {
        type: 'LineString',
        coordinates: [
          [99.8900, 20.0420],
          [99.8940, 20.0460],
          [99.8980, 20.0440],
          [99.8950, 20.0400],
          [99.8900, 20.0420]
        ]
      }
    }
  ]
};

// ข้อมูลจำลองพื้นที่รับน้ำ/ท่วมถึงตามระดับความรุนแรง
export function generateFloodPolygon(waterLevelMeters) {
  // waterLevelMeters: 0 ถึง 8 เมตร
  // เมื่อระดับน้ำสูงขึ้น พื้นที่ลุ่มจะขยายตัวตามค่า buffer
  const factor = Math.max(0.1, waterLevelMeters / 8.0);
  const spreadLng = 0.003 * factor * 2.2;
  const spreadLat = 0.0025 * factor * 2.2;

  return {
    type: 'FeatureCollection',
    features: [
      {
        type: 'Feature',
        properties: {
          level: waterLevelMeters,
          severity: waterLevelMeters < 2 ? 'low' : waterLevelMeters < 4 ? 'medium' : 'high'
        },
        geometry: {
          type: 'Polygon',
          coordinates: [
            [
              [99.7950 - spreadLng, 19.9020 - spreadLat],
              [99.8150 - spreadLng, 19.9060 - spreadLat],
              [99.8280 - spreadLng, 19.9100 - spreadLat],
              [99.8400 - spreadLng, 19.9140 - spreadLat],
              [99.8520 - spreadLng, 19.9200 - spreadLat],
              [99.8750 - spreadLng, 19.9280 - spreadLat],
              [99.9100 - spreadLng, 19.9400 - spreadLat],
              // ด้านบน
              [99.9100 + spreadLng, 19.9650 + spreadLat],
              [99.8750 + spreadLng, 19.9450 + spreadLat],
              [99.8520 + spreadLng, 19.9320 + spreadLat],
              [99.8400 + spreadLng, 19.9250 + spreadLat],
              [99.8280 + spreadLng, 19.9200 + spreadLat],
              [99.8150 + spreadLng, 19.9150 + spreadLat],
              [99.7950 + spreadLng, 19.9100 + spreadLat],
              [99.7950 - spreadLng, 19.9020 - spreadLat]
            ]
          ]
        }
      },
      // อ่างเก็บน้ำ มฟล. ขยายระดับน้ำ
      {
        type: 'Feature',
        properties: {
          level: waterLevelMeters,
          name: 'MFU Reservoir Water Extension'
        },
        geometry: {
          type: 'Polygon',
          coordinates: [
            [
              [99.8890 - spreadLng * 0.4, 20.0410 - spreadLat * 0.4],
              [99.8950 - spreadLng * 0.4, 20.0470 + spreadLat * 0.4],
              [99.8990 + spreadLng * 0.4, 20.0450 + spreadLat * 0.4],
              [99.8960 + spreadLng * 0.4, 20.0390 - spreadLat * 0.4],
              [99.8890 - spreadLng * 0.4, 20.0410 - spreadLat * 0.4]
            ]
          ]
        }
      }
    ]
  };
}
