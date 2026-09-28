import React from 'react';
import { ArrowLeft, ChevronRight, Globe2, MapPinned, LocateFixed } from 'lucide-react';
import { COUNTRIES, QUICK_VIEW_AREAS, SELECTABLE_COUNTRIES, THAI_REGIONS, provincesForRegion } from './mapAreaNavigation.js';
import { THAI_PROVINCE_NAMES, districtDisplayName } from './boundaryThaiLabels.js';

export default function MapAreaSidebar({ area, onSelect, countries, provinces, districts, loading, error, onRetry, resultCount, samplesError, samplesLoading, onRetrySamples, retryingSamples, areaCounts = {} }) {
  const badge = key => areaCounts[key] > 0 ? <span className="map-area-count" aria-label={`${areaCounts[key]} รายการผลสำรวจ`}>{areaCounts[key]}</span> : null;
  const items = area.countryIso !== 'THA' && area.level !== 'world' ? []
    : area.level === 'world' ? SELECTABLE_COUNTRIES.map(country => ({ ...country, level: 'country', countryIso: country.iso }))
      : area.level === 'country' ? THAI_REGIONS.map(region => ({ ...region, level: 'region', countryIso: 'THA' }))
        : area.level === 'region' ? provincesForRegion(area.regionId).map(province => ({ ...province, level: 'province', countryIso: 'THA' }))
          : area.level === 'province' ? (districts?.features || []).filter(feature => feature.properties.provinceCode === area.provinceIso).map(feature => ({ level: 'district', countryIso: 'THA', regionId: area.regionId, provinceIso: area.provinceIso, districtCode: feature.properties.districtCode, districtName: feature.properties.shapeName, label: feature.properties.nameTh }))
            : [];
  const path = [
    ...(area.countryIso ? [{ level: 'country', countryIso: area.countryIso, label: area.countryIso === 'THA' ? 'ประเทศไทย' : COUNTRIES.find(item => item.iso === area.countryIso)?.name }] : []),
    ...(area.regionId ? [{ level: 'region', countryIso: 'THA', regionId: area.regionId, label: THAI_REGIONS.find(item => item.id === area.regionId)?.label }] : []),
    ...(area.provinceIso ? [{ level: 'province', countryIso: 'THA', regionId: area.regionId, provinceIso: area.provinceIso, label: `จังหวัด${THAI_PROVINCE_NAMES[area.provinceIso] || ''}` }] : []),
    ...(area.districtCode ? [{ level: 'district', countryIso: 'THA', regionId: area.regionId, provinceIso: area.provinceIso, districtCode: area.districtCode, districtName: area.districtName, label: area.label || districts?.features?.find(f => f.properties.districtCode === area.districtCode)?.properties.nameTh }] : [])
  ].filter(item => item.label);
  return <aside className="map-area-sidebar" aria-label="เลือกพื้นที่แผนที่">
    <header><div><Globe2 size={17}/><strong>สำรวจพื้นที่</strong></div><span>{loading ? 'กำลังโหลดขอบเขต…' : samplesError ? 'โหลดผลตรวจไม่สำเร็จ' : samplesLoading || resultCount == null ? 'กำลังโหลดผลตรวจ…' : `${resultCount} จุด`}</span></header>
    <nav className="map-area-breadcrumbs" aria-label="เส้นทางพื้นที่">
      {path.map((item, index) => <React.Fragment key={`${item.level}-${index}`}>{index > 0 && <ChevronRight size={12}/>}<button type="button" onClick={() => onSelect(item)} aria-current={index === path.length - 1 ? 'location' : undefined}>{item.level === 'district' ? districtDisplayName(item.label) : item.label}</button></React.Fragment>)}
    </nav>
    {error && <div className="map-area-error" role="alert">โหลดขอบเขตไม่สำเร็จ <button type="button" onClick={onRetry}>ลองอีกครั้ง</button></div>}
    {area.countryIso && area.countryIso !== 'THA' && <p className="map-area-empty">ขณะนี้เปิดดูรายละเอียดแผนที่ย่อยได้เฉพาะประเทศไทย</p>}
    {samplesError && <div className="map-area-error" role="alert">{typeof samplesError === 'string' ? samplesError : 'โหลดผลสำรวจไม่สำเร็จ'} ขอบเขตพื้นที่ยังใช้งานได้ <button type="button" onClick={onRetrySamples} disabled={retryingSamples}>{retryingSamples ? 'กำลังลองใหม่…' : 'ลองโหลดผลตรวจอีกครั้ง'}</button></div>}
    {!loading && !error && !samplesError && (area.level === 'province' || area.level === 'district') && resultCount === 0 && <p className="map-area-empty">ยังไม่มีข้อมูลสำรวจที่เผยแพร่ในพื้นที่นี้ตามช่วงเวลาที่เลือก</p>}
    {!loading && !error && items.length > 0 && <div className="map-area-options" key={`${area.level}-${area.regionId || ''}-${area.provinceIso || ''}`}>
      <span className="map-area-section-title">{area.level === 'world' ? 'เลือกประเทศที่สำรวจ' : area.level === 'country' ? 'เลือกภูมิภาค' : area.level === 'region' ? 'เลือกจังหวัด' : `พื้นที่ใน${THAI_PROVINCE_NAMES[area.provinceIso] || ''}`}</span>
      {items.map(item => <button type="button" key={item.iso || item.id || item.districtCode} onClick={() => onSelect(item)}><MapPinned size={14}/><span>{item.level === 'district' ? districtDisplayName(item.label) : item.label || item.name}</span>{badge(item.districtCode || item.iso || item.id)}<ChevronRight size={14}/></button>)}
    </div>}
    {area.level !== 'world' && area.level !== 'country' && <button className="map-area-back" type="button" onClick={() => onSelect(path[Math.max(0, path.length - 2)])}><ArrowLeft size={14}/>ย้อนกลับหนึ่งระดับ</button>}
    <div className="map-area-quickviews"><span className="map-area-section-title"><LocateFixed size={13}/>Quick View · เชียงราย</span>{QUICK_VIEW_AREAS.map(item => <button type="button" key={item.id} onClick={() => onSelect({ ...item, level: 'district', countryIso: 'THA', regionId: 'north' })}><span>{item.label} {badge(item.districtCode)}</span><small>{item.provinceLabel}</small></button>)}</div>
  </aside>;
}
