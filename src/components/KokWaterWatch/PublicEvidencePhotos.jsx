import React, { useState } from 'react';
import { evidencePhotos } from '../../lib/publicEvidence.js';

function EvidencePhoto({ image, index, onOpen }) {
  const [failed, setFailed] = useState(false);
  const [attempt, setAttempt] = useState(0);
  return <figure className="rounded-xl border border-slate-200 overflow-hidden bg-white">
    {failed ? <div role="alert" className="p-3 text-xs text-slate-600">
      โหลดรูปหลักฐานไม่สำเร็จ
      <button type="button" className="block mt-2 text-blue-700 underline" onClick={() => {
        setFailed(false); setAttempt(value => value + 1);
      }}>ลองโหลดรูปอีกครั้ง</button>
    </div> : <img key={attempt} src={`${image.url}${attempt ? `?retry=${attempt}` : ''}`}
      alt={image.title || `หลักฐานภาพที่ ${index + 1}`} loading="lazy" decoding="async"
      className="w-full h-28 object-contain" onError={() => setFailed(true)} />}
    {!failed && onOpen && <button type="button" className="p-2 text-xs text-blue-700" onClick={() => onOpen(image.url)}>แตะเพื่อขยาย</button>}
    <figcaption className="p-2 text-xs text-slate-600">{image.title || `หลักฐานภาพที่ ${index + 1}`}</figcaption>
  </figure>;
}

export default function PublicEvidencePhotos({ sample, onOpen }) {
  const images = evidencePhotos(sample);
  return <section aria-label="รูปหลักฐาน" className="mt-3 pt-3 border-t border-slate-100">
    <h4 className="text-xs font-semibold text-slate-800 mb-2">รูปหลักฐาน ({images.length})</h4>
    {images.length ? <div className="grid grid-cols-2 gap-2">{images.map((image, index) =>
      <EvidencePhoto key={`${sample.sample_code}-${sample.revision}-${image.url}`} image={image} index={index} onOpen={onOpen} />
    )}</div> : <p className="text-xs text-slate-500">ไม่มีรูปหลักฐาน</p>}
  </section>;
}
