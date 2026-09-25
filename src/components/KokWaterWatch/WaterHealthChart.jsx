import React, { useState } from 'react';

const STATUS_SEGMENTS = [
  ['normal', 'ปกติ'],
  ['watch', 'เฝ้าระวัง'],
  ['critical', 'เกินเกณฑ์'],
  ['unknown', 'ไม่มีค่า']
];

function periodLabel(period, granularity, short = false) {
  const key = granularity === 'month' ? `${period.month}-01` : period.day;
  const date = new Date(`${key}T12:00:00+07:00`);
  return date.toLocaleDateString('th-TH', {
    timeZone: 'Asia/Bangkok',
    ...(granularity === 'day' ? { day: 'numeric' } : {}),
    month: 'short',
    year: short ? '2-digit' : 'numeric'
  });
}

export default function WaterHealthChart({ summary }) {
  const [granularity, setGranularity] = useState('day');
  const [selectedKey, setSelectedKey] = useState(null);
  const periods = granularity === 'month' ? summary.monthly : summary.daily;
  const periodKey = (period) => granularity === 'month' ? period.month : period.day;
  const selected = periods.find((period) => periodKey(period) === selectedKey) || periods[0];
  const maxCount = Math.max(1, ...periods.map((period) => period.total));

  return (
    <section className="water-health-chart-section" aria-label="กราฟสุขภาพน้ำจากผลตรวจสารหนู">
      <div className="water-summary-section-title water-health-chart-heading">
        <div>
          <h3>กราฟสุขภาพน้ำจากสารหนู</h3>
          <p>จำนวนรายการผลตรวจแยกตามระดับ · {granularity === 'day' ? 'วันที่' : 'เดือนที่'}เก็บตัวอย่าง เวลาไทย</p>
        </div>
        <div className="water-health-chart-filter" role="group" aria-label="ช่วงของกราฟ">
          {[
            ['day', 'รายวัน'],
            ['month', 'รายเดือน']
          ].map(([value, label]) => (
            <button
              type="button"
              key={value}
              className={granularity === value ? 'is-active' : ''}
              aria-pressed={granularity === value}
              onClick={() => { setGranularity(value); setSelectedKey(null); }}
            >
              {label}
            </button>
          ))}
        </div>
      </div>

      {periods.length ? (
        <>
          <div className="water-health-chart" role="group" aria-label={`กราฟจำนวนผลตรวจ${granularity === 'day' ? 'รายวัน' : 'รายเดือน'}`}>
            <div className="water-health-chart-scale" aria-hidden="true"><span>{maxCount}</span><span>0</span></div>
            <div className="water-health-chart-scroll">
              <div className="water-health-chart-columns">
                {periods.map((period) => (
                  <button
                    type="button"
                    key={periodKey(period)}
                    className={`water-health-chart-column ${selected === period ? 'is-selected' : ''}`}
                    aria-pressed={selected === period}
                    aria-label={`${periodLabel(period, granularity)}: ${period.total} รายการ, เกินเกณฑ์ ${period.critical}, เฝ้าระวัง ${period.watch}, ปกติ ${period.normal}, ไม่มีค่า ${period.unknown}`}
                    onClick={() => setSelectedKey(periodKey(period))}
                  >
                    <span className="water-health-chart-count">{period.total}</span>
                    <span className="water-health-chart-bar" style={{ height: `${Math.max(8, period.total / maxCount * 150)}px` }} aria-hidden="true">
                      {STATUS_SEGMENTS.map(([status]) => period[status] > 0 && (
                        <span key={status} className={`is-${status}`} style={{ height: `${period[status] / period.total * 100}%` }} />
                      ))}
                    </span>
                    <span className="water-health-chart-date">{periodLabel(period, granularity, true)}</span>
                  </button>
                ))}
              </div>
            </div>
          </div>
          <div className="water-health-chart-legend" aria-label="ความหมายของสี">
            {STATUS_SEGMENTS.map(([status, label]) => <span key={status}><i className={`is-${status}`} />{label}</span>)}
          </div>
          <div className="water-health-chart-detail" aria-live="polite">
            <div><strong>{periodLabel(selected, granularity)}</strong><span>{selected.total} รายการ · เฉลี่ย {selected.average === null ? '—' : selected.average.toFixed(1)} ppb</span></div>
            <p>{STATUS_SEGMENTS.map(([status, label]) => `${label} ${selected[status]}`).join(' · ')}</p>
          </div>
        </>
      ) : <p className="water-summary-empty">ไม่มีรายการที่ระบุวันเวลาเก็บตัวอย่างในช่วงที่เลือก</p>}
    </section>
  );
}
