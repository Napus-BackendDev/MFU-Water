import React, { useState, useEffect } from 'react';
import {
  MapPin,
  Calendar,
  Clock,
  User,
  Phone,
  Building,
  Droplets,
  CloudRain,
  Eye,
  Camera,
  UploadCloud,
  CheckCircle2,
  AlertCircle,
  ArrowRight,
  ArrowLeft,
  X,
  FileText,
  Activity,
  Layers,
  Database,
  Check,
  RefreshCw,
  Cpu
} from 'lucide-react';
import { WATER_WATCH_STATIONS, findNearestStation } from '../../data/waterWatchData';
import { uploadSampleImage, saveSampleToSupabase } from '../../lib/supabase';

export default function WaterWatchForm({ onCancel, onSubmitSuccess, lockedStation = null }) {
  const [currentStep, setCurrentStep] = useState(1);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitStage, setSubmitStage] = useState(''); // 'local' | 'sheets' | 'drive' | 'supabase' | 'done'
  const [completedSample, setCompletedSample] = useState(null);
  const [gpsLockedStation, setGpsLockedStation] = useState(null);

  // Form State
  const [formData, setFormData] = useState(() => {
    let savedCollector = { name: '', phone: '', org: 'ทีมอาสาสมัครลุ่มน้ำกก มฟล.', id: `VOL-${Math.floor(1000 + Math.random() * 9000)}` };
    if (typeof window !== 'undefined') {
      try {
        const raw = localStorage.getItem('kok_saved_collector');
        if (raw) savedCollector = JSON.parse(raw);
      } catch(e) {}
    }
    const targetStation = lockedStation || WATER_WATCH_STATIONS[0];
    return {
      // Step 1: Location & Time
      stationMode: 'station',
      stationId: targetStation.id,
      customLocationName: '',
      latitude: targetStation.coordinates[1],
      longitude: targetStation.coordinates[0],
      gpsAccuracy: 5.0,
      gpsTimestamp: new Date().toLocaleTimeString('th-TH'),
      collectionDate: new Date().toISOString().split('T')[0],
      collectionTime: new Date().toTimeString().slice(0, 5),
      entryType: 'realtime',

      // Step 2: Collector (จดจำข้อมูลผู้เก็บตัวอย่าง ไม่ต้องพิมพ์ซ้ำ)
      collectorName: savedCollector.name || '',
      collectorPhone: savedCollector.phone || '',
      collectorOrg: savedCollector.org || 'ทีมอาสาสมัครลุ่มน้ำกก มฟล.',
      collectorId: savedCollector.id || `VOL-${Math.floor(1000 + Math.random() * 9000)}`,
      collectorNotes: '',

      // Step 3: Sample Nature
      waterSource: 'แม่น้ำกก (สายหลัก)',
      waterAppearance: 'ขุ่นปานกลาง',
      odor: 'ไม่พบกลิ่นผิดปกติ',
      rain24h: 'ไม่มีฝนตก',
      observations: '',

      // Step 4: Water Quality Measurements (พร้อมให้กรอกค่าตรวจวัดจริง)
      arsenicMeasured: false,
      arsenicValue: '',
      arsenicUnit: 'µg/L',
      arsenicMethod: 'ชุดทดสอบภาคสนาม (Arsenic Field Test Kit)',
      arsenicInstrument: 'Merck MQuant Arsenic Test',

      phMeasured: true,
      phValue: '7.2',
      phMethod: 'เครื่องวัดดิจิทัลพกพา (pH Meter)',
      phInstrument: 'Hanna Instruments HI98107',

      turbidityMeasured: false,
      turbidityValue: '',
      turbidityMethod: 'เครื่องวัดความขุ่นแบบพกพา',
      turbidityInstrument: 'Turbidimeter 2100Q',

      tempMeasured: false,
      tempValue: '',
      tempMethod: 'หัววัดอุณหภูมิดิจิทัล',
      tempInstrument: 'Digital Probe Thermometer',

      // Step 5: Images
      images: []
    };
  });

  // GPS Location handler
  const [isGettingGps, setIsGettingGps] = useState(false);
  const handleGetLiveGPS = () => {
    if (!navigator.geolocation) {
      alert('เบราว์เซอร์นี้ไม่รองรับการดึงพิกัด GPS');
      return;
    }
    setIsGettingGps(true);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setIsGettingGps(false);
        const lat = Number(pos.coords.latitude.toFixed(6));
        const lng = Number(pos.coords.longitude.toFixed(6));
        const nearest = findNearestStation(lat, lng);

        if (nearest) {
          setGpsLockedStation(nearest);
          setFormData(prev => ({
            ...prev,
            stationMode: 'station',
            stationId: nearest.id,
            latitude: lat,
            longitude: lng,
            gpsAccuracy: Math.round(pos.coords.accuracy || 10),
            gpsTimestamp: new Date().toLocaleTimeString('th-TH')
          }));
        } else {
          setFormData(prev => ({
            ...prev,
            latitude: lat,
            longitude: lng,
            gpsAccuracy: Math.round(pos.coords.accuracy || 10),
            gpsTimestamp: new Date().toLocaleTimeString('th-TH')
          }));
        }
      },
      (err) => {
        setIsGettingGps(false);
        alert('ไม่สามารถดึงพิกัด GPS ได้ กรุณาอนุญาตการเข้าถึงตำแหน่ง หรือกรอกพิกัดด้วยตนเอง');
      },
      { enableHighAccuracy: true, timeout: 10000 }
    );
  };

  // Image Upload handler
  const handleImageUpload = (e) => {
    const files = Array.from(e.target.files);
    if (!files.length) return;

    if (formData.images.length + files.length > 5) {
      alert('แนบภาพได้สูงสุด 5 ภาพต่อหนึ่งตัวอย่าง');
      return;
    }

    files.forEach(file => {
      const reader = new FileReader();
      reader.onloadend = () => {
        setFormData(prev => ({
          ...prev,
          images: [
            ...prev.images,
            {
              id: 'img-' + Date.now() + '-' + Math.random().toString(36).substr(2, 4),
              name: file.name,
              sizeKb: Math.round(file.size / 1024),
              url: reader.result,
              title: file.name.replace(/\.[^/.]+$/, ''),
              rawFile: file
            }
          ]
        }));
      };
      reader.readAsDataURL(file);
    });
  };

  const removeImage = (id) => {
    setFormData(prev => ({
      ...prev,
      images: prev.images.filter(img => img.id !== id)
    }));
  };

  // Submit Flow
  const handleSubmit = async () => {
    setIsSubmitting(true);

    const sampleCode = `KOK-${new Date().toISOString().slice(0, 10).replace(/-/g, '')}-${Math.floor(1000 + Math.random() * 9000)}`;
    const recordId = 'rec-' + Date.now();

    // บันทึกโปรไฟล์ผู้ตรวจวัดลง LocalStorage เพื่อความสะดวกในครั้งต่อไป
    try {
      localStorage.setItem('kok_saved_collector', JSON.stringify({
        name: formData.collectorName,
        phone: formData.collectorPhone,
        org: formData.collectorOrg,
        id: formData.collectorId
      }));
    } catch (e) {}

    // Stage 1: อัปโหลดรูปภาพไปยัง Supabase Cloud Storage ('water-watch-photos')
    setSubmitStage('storage');
    const uploadedImages = [];
    for (let i = 0; i < formData.images.length; i++) {
      const img = formData.images[i];
      if (img.rawFile) {
        const uploadRes = await uploadSampleImage(img.rawFile, sampleCode, i);
        uploadedImages.push({
          id: uploadRes.id,
          title: img.title || `ภาพที่ ${i + 1}`,
          url: uploadRes.url,
          drive_file_id: uploadRes.path || `SP_${sampleCode}_${i + 1}`,
          size_kb: uploadRes.size_kb,
          storage_type: uploadRes.storage_type
        });
      } else {
        uploadedImages.push({
          id: img.id,
          title: img.title || `ภาพที่ ${i + 1}`,
          url: img.url,
          drive_file_id: `LOCAL_${sampleCode}_${i + 1}`,
          size_kb: img.sizeKb
        });
      }
    }

    // Stage 2: บันทึกข้อมูลลงฐานข้อมูล Supabase Database ('kok_water_samples')
    setSubmitStage('supabase');

    const selectedStation = WATER_WATCH_STATIONS.find(s => s.id === formData.stationId);

    // Calculate standardized arsenic
    let arsenicUgL = null;
    if (formData.arsenicMeasured && formData.arsenicValue) {
      const rawVal = parseFloat(formData.arsenicValue);
      arsenicUgL = formData.arsenicUnit === 'mg/L' ? rawVal * 1000 : rawVal;
    }

    const newRecord = {
      record_id: recordId,
      sample_code: sampleCode,
      schema_version: '1.0',
      station_id: formData.stationMode === 'station' ? formData.stationId : 'OFF-STATION',
      station_name: formData.stationMode === 'station' ? selectedStation?.name : (formData.customLocationName || 'จุดเก็บนอกสถานี'),
      coordinates: [formData.longitude, formData.latitude],
      collection_time: `${formData.collectionDate}T${formData.collectionTime}:00+07:00`,
      gps_accuracy_meters: formData.gpsAccuracy,
      entry_type: formData.entryType,
      collector: {
        id: formData.collectorId,
        name: formData.collectorName,
        phone: formData.collectorPhone,
        organization: formData.collectorOrg,
        notes: formData.collectorNotes
      },
      sample_nature: {
        water_source: formData.waterSource,
        water_appearance: formData.waterAppearance,
        odor: formData.odor,
        rain_last_24h: formData.rain24h,
        notes: formData.observations
      },
      measurements: {
        arsenic: {
          value: arsenicUgL,
          unit: 'µg/L',
          status: arsenicUgL > 20 ? 'danger' : (arsenicUgL > 10 ? 'watch' : 'normal'),
          method: formData.arsenicMethod,
          instrument: formData.arsenicInstrument
        },
        ph: {
          value: formData.phMeasured ? parseFloat(formData.phValue) : null,
          status: 'normal',
          method: formData.phMethod,
          instrument: formData.phInstrument
        },
        turbidity: {
          value: formData.turbidityMeasured ? parseFloat(formData.turbidityValue) : null,
          unit: 'NTU',
          status: 'normal',
          method: formData.turbidityMethod,
          instrument: formData.turbidityInstrument
        },
        temperature: {
          value: formData.tempMeasured ? parseFloat(formData.tempValue) : null,
          unit: '°C',
          status: 'normal',
          method: formData.tempMethod,
          instrument: formData.tempInstrument
        }
      },
      images: uploadedImages,
      status: 'COMPLETED',
      sync_stage: 'INDEXED'
    };

    // บันทึกไปยัง Supabase (หากมีการตั้งค่า URL & Anon Key)
    await saveSampleToSupabase(newRecord);

    setSubmitStage('done');
    setCompletedSample(newRecord);
    setIsSubmitting(false);

    if (onSubmitSuccess) {
      onSubmitSuccess(newRecord);
    }
  };

  // Render Step 1: Location & Time
  const renderStep1 = () => (
    <div className="space-y-4">
      <div className="bg-[#F8F7F5] p-3.5 rounded-xl border border-[#B4975A]/30">
        <label className="block text-xs font-bold text-[#A6192E] mb-2 uppercase tracking-wide">
          📍 ประเภทจุดเก็บตัวอย่าง
        </label>
        <div className="grid grid-cols-2 gap-2">
          <button
            type="button"
            onClick={() => setFormData({ ...formData, stationMode: 'station' })}
            className={`py-2 px-3 rounded-lg text-xs font-bold border transition-all ${
              formData.stationMode === 'station'
                ? 'bg-[#A6192E] text-white border-[#A6192E] shadow-sm'
                : 'bg-white text-slate-700 border-slate-300 hover:bg-slate-50'
            }`}
          >
            สถานีหลักแม่น้ำกก ({WATER_WATCH_STATIONS.length} จุด)
          </button>
          <button
            type="button"
            onClick={() => setFormData({ ...formData, stationMode: 'off-station' })}
            className={`py-2 px-3 rounded-lg text-xs font-bold border transition-all ${
              formData.stationMode === 'off-station'
                ? 'bg-[#A6192E] text-white border-[#A6192E] shadow-sm'
                : 'bg-white text-slate-700 border-slate-300 hover:bg-slate-50'
            }`}
          >
            เก็บนอกสถานี (สำรวจพิเศษ)
          </button>
        </div>
      </div>

      {formData.stationMode === 'station' ? (
        <div>
          {/* Locked Station Banner */}
          {lockedStation && (
            <div className="p-3 bg-red-50/90 border border-[#A6192E]/40 rounded-xl text-xs flex items-center justify-between mb-3 shadow-2xs">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-[#A6192E] text-white flex items-center justify-center shrink-0">
                  <Cpu className="w-4 h-4" />
                </div>
                <div>
                  <div className="flex items-center gap-1.5">
                    <span className="font-bold text-[#A6192E]">ล็อกบันทึกเข้าเครื่อง: [{lockedStation.code}]</span>
                    <span className="text-[10px] font-mono text-slate-500 font-semibold">{lockedStation.device?.code}</span>
                  </div>
                  <span className="text-[11px] text-slate-600 font-medium block truncate max-w-xs">{lockedStation.name}</span>
                </div>
              </div>
              <span className="px-2 py-0.5 rounded-md bg-[#A6192E] text-white text-[10px] font-bold shrink-0">
                LOCKED
              </span>
            </div>
          )}

          {/* GPS Auto-Lock Banner */}
          {!lockedStation && gpsLockedStation && (
            <div className="p-3 bg-emerald-50/90 border border-emerald-300 rounded-xl text-xs flex items-center justify-between mb-3 shadow-2xs">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-emerald-600 text-white flex items-center justify-center shrink-0">
                  <MapPin className="w-4 h-4" />
                </div>
                <div>
                  <div className="flex items-center gap-1.5">
                    <span className="font-bold text-emerald-800">ล็อกสถานีอัตโนมัติจาก GPS: [{gpsLockedStation.code}]</span>
                    <span className="text-[10px] font-semibold text-emerald-700 bg-emerald-100/80 px-1.5 py-0.5 rounded">
                      ห่าง {gpsLockedStation.distanceMeters} ม.
                    </span>
                  </div>
                  <span className="text-[11px] text-emerald-700 font-medium block truncate max-w-xs">{gpsLockedStation.name}</span>
                </div>
              </div>
              <span className="px-2 py-0.5 rounded-md bg-emerald-600 text-white text-[10px] font-bold shrink-0">
                GPS LOCKED
              </span>
            </div>
          )}

          <label className="block text-xs font-semibold text-slate-700 mb-1.5">
            เลือกสถานีและเครื่องตรวจวัดคุณภาพน้ำ <span className="text-[#A6192E]">*</span>
          </label>
          <select
            value={formData.stationId}
            disabled={!!lockedStation}
            onChange={(e) => {
              const st = WATER_WATCH_STATIONS.find(s => s.id === e.target.value);
              setFormData({
                ...formData,
                stationId: e.target.value,
                latitude: st ? st.coordinates[1] : formData.latitude,
                longitude: st ? st.coordinates[0] : formData.longitude
              });
            }}
            className={`w-full text-sm p-2.5 rounded-xl border border-slate-300 focus:border-[#A6192E] focus:ring-1 focus:ring-[#A6192E] bg-white text-slate-800 ${
              lockedStation ? 'bg-slate-100 text-slate-500 cursor-not-allowed' : ''
            }`}
          >
            {WATER_WATCH_STATIONS.map(s => (
              <option key={s.id} value={s.id}>
                [{s.code}] {s.name} — เครื่อง: {s.device?.code || 'Node'}
              </option>
            ))}
          </select>
        </div>
      ) : (
        <div>
          <label className="block text-xs font-semibold text-slate-700 mb-1.5">
            ระบุชื่อสถานที่ / จุดเก็บนอกสถานี <span className="text-[#A6192E]">*</span>
          </label>
          <input
            type="text"
            value={formData.customLocationName}
            onChange={(e) => setFormData({ ...formData, customLocationName: e.target.value })}
            placeholder="เช่น ฝั่งตรงข้ามวัดท่าตอน, ริมตลิ่งบ้านร่มเย็น"
            className="w-full text-sm p-2.5 rounded-xl border border-slate-300 focus:border-[#A6192E] focus:ring-1 focus:ring-[#A6192E] bg-white text-slate-800"
          />
        </div>
      )}

      {/* GPS Capture */}
      <div className="p-3 bg-[#F8F7F5] rounded-xl border border-slate-200">
        <div className="flex items-center justify-between mb-2">
          <span className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
            <MapPin className="w-4 h-4 text-[#A6192E]" />
            พิกัด GPS จริง ณ จุดเก็บตัวอย่าง
          </span>
          <button
            type="button"
            onClick={handleGetLiveGPS}
            disabled={isGettingGps}
            className="text-[11px] font-bold px-2.5 py-1 rounded-lg bg-white border border-[#B4975A] text-[#A6192E] hover:bg-[#A6192E] hover:text-white transition-all flex items-center gap-1 shadow-xs"
          >
            <RefreshCw className={`w-3 h-3 ${isGettingGps ? 'animate-spin' : ''}`} />
            {isGettingGps ? 'กำลังจับพิกัด...' : 'ดึง GPS ปัจจุบัน'}
          </button>
        </div>

        <div className="grid grid-cols-2 gap-2 text-xs">
          <div className="bg-white p-2 rounded-lg border border-slate-200">
            <span className="text-slate-500 block text-[10px]">ละติจูด (Lat):</span>
            <input
              type="number"
              step="0.000001"
              value={formData.latitude}
              onChange={(e) => setFormData({ ...formData, latitude: parseFloat(e.target.value) || 0 })}
              className="w-full font-mono text-xs font-bold text-slate-800 focus:outline-hidden"
            />
          </div>
          <div className="bg-white p-2 rounded-lg border border-slate-200">
            <span className="text-slate-500 block text-[10px]">ลองจิจูด (Lng):</span>
            <input
              type="number"
              step="0.000001"
              value={formData.longitude}
              onChange={(e) => setFormData({ ...formData, longitude: parseFloat(e.target.value) || 0 })}
              className="w-full font-mono text-xs font-bold text-slate-800 focus:outline-hidden"
            />
          </div>
        </div>

        <div className="mt-2 flex items-center justify-between text-[11px] text-slate-500">
          <span>ความคลาดเคลื่อน GPS: <strong>±{formData.gpsAccuracy} เมตร</strong></span>
          <span>เวลาจับพิกัด: {formData.gpsTimestamp}</span>
        </div>
      </div>

      {/* Date and Time */}
      <div className="grid grid-cols-2 gap-2">
        <div>
          <label className="block text-xs font-semibold text-slate-700 mb-1">
            วันที่เก็บตัวอย่าง
          </label>
          <input
            type="date"
            value={formData.collectionDate}
            onChange={(e) => setFormData({ ...formData, collectionDate: e.target.value })}
            className="w-full text-xs p-2.5 rounded-xl border border-slate-300 focus:border-[#A6192E] bg-white text-slate-800"
          />
        </div>
        <div>
          <label className="block text-xs font-semibold text-slate-700 mb-1">
            เวลาที่เก็บตัวอย่าง
          </label>
          <input
            type="time"
            value={formData.collectionTime}
            onChange={(e) => setFormData({ ...formData, collectionTime: e.target.value })}
            className="w-full text-xs p-2.5 rounded-xl border border-slate-300 focus:border-[#A6192E] bg-white text-slate-800"
          />
        </div>
      </div>

      <div>
        <label className="block text-xs font-semibold text-slate-700 mb-1">
          ประเภทการบันทึก
        </label>
        <div className="flex gap-4 text-xs">
          <label className="flex items-center gap-1.5 cursor-pointer">
            <input
              type="radio"
              name="entryType"
              checked={formData.entryType === 'realtime'}
              onChange={() => setFormData({ ...formData, entryType: 'realtime' })}
              className="text-[#A6192E] focus:ring-[#A6192E]"
            />
            <span>เก็บสดขณะนี้ (Real-time)</span>
          </label>
          <label className="flex items-center gap-1.5 cursor-pointer">
            <input
              type="radio"
              name="entryType"
              checked={formData.entryType === 'retrospective'}
              onChange={() => setFormData({ ...formData, entryType: 'retrospective' })}
              className="text-[#A6192E] focus:ring-[#A6192E]"
            />
            <span>กรอกย้อนหลัง (Retrospective)</span>
          </label>
        </div>
      </div>
    </div>
  );

  // Render Step 2: Collector
  const renderStep2 = () => (
    <div className="space-y-4">
      <div className="p-3 bg-amber-50/70 border border-amber-200/80 rounded-xl text-xs text-amber-900 flex items-start gap-2">
        <User className="w-4 h-4 text-[#A6192E] shrink-0 mt-0.5" />
        <div>
          <strong>ข้อมูลอาสาสมัคร / ผู้ตรวจวัด</strong>
          <p className="text-[11px] text-amber-800 mt-0.5">
            ระบบจะสร้างรหัสผู้เก็บ (Collector ID) ให้อัตโนมัติเพื่อความเป็นส่วนตัวในการแสดงผลต่อสาธารณะ
          </p>
        </div>
      </div>

      <div>
        <label className="block text-xs font-semibold text-slate-700 mb-1">
          ชื่อ-นามสกุล ผู้เก็บตัวอย่าง <span className="text-[#A6192E]">*</span>
        </label>
        <input
          type="text"
          value={formData.collectorName}
          onChange={(e) => setFormData({ ...formData, collectorName: e.target.value })}
          placeholder="เช่น นายกิตติศักดิ์ เจริญสุข"
          className="w-full text-sm p-2.5 rounded-xl border border-slate-300 focus:border-[#A6192E] focus:ring-1 focus:ring-[#A6192E] bg-white text-slate-800"
          required
        />
      </div>

      <div>
        <label className="block text-xs font-semibold text-slate-700 mb-1">
          เบอร์โทรศัพท์ติดต่อ <span className="text-[#A6192E]">*</span>
        </label>
        <input
          type="tel"
          value={formData.collectorPhone}
          onChange={(e) => setFormData({ ...formData, collectorPhone: e.target.value })}
          placeholder="08X-XXX-XXXX"
          className="w-full text-sm p-2.5 rounded-xl border border-slate-300 focus:border-[#A6192E] focus:ring-1 focus:ring-[#A6192E] bg-white text-slate-800"
          required
        />
      </div>

      <div>
        <label className="block text-xs font-semibold text-slate-700 mb-1">
          หน่วยงาน / สังกัด / ทีมทดลอง
        </label>
        <input
          type="text"
          value={formData.collectorOrg}
          onChange={(e) => setFormData({ ...formData, collectorOrg: e.target.value })}
          placeholder="เช่น มหาวิทยาลัยแม่ฟ้าหลวง (MFU) / ชมรมรักษ์แม่น้ำกก"
          className="w-full text-sm p-2.5 rounded-xl border border-slate-300 focus:border-[#A6192E] focus:ring-1 focus:ring-[#A6192E] bg-white text-slate-800"
        />
      </div>

      <div className="p-3 bg-[#F8F7F5] rounded-xl border border-slate-200">
        <label className="block text-xs font-semibold text-slate-600 mb-1">
          รหัสประจำตัวผู้เก็บตัวอย่าง (Collector ID)
        </label>
        <input
          type="text"
          value={formData.collectorId}
          disabled
          className="w-full text-xs font-mono font-bold p-2 rounded-lg bg-slate-100 border border-slate-300 text-slate-700"
        />
      </div>
    </div>
  );

  // Render Step 3: Sample Nature
  const renderStep3 = () => (
    <div className="space-y-4">
      <div>
        <label className="block text-xs font-semibold text-slate-700 mb-1.5">
          ประเภทแหล่งน้ำที่เก็บ <span className="text-[#A6192E]">*</span>
        </label>
        <select
          value={formData.waterSource}
          onChange={(e) => setFormData({ ...formData, waterSource: e.target.value })}
          className="w-full text-sm p-2.5 rounded-xl border border-slate-300 focus:border-[#A6192E] bg-white text-slate-800"
        >
          <option value="แม่น้ำกก (สายหลัก)">แม่น้ำกก (สายหลัก)</option>
          <option value="ลำห้วยสาขาบรรจบแม่น้ำกก">ลำห้วยสาขาบรรจบแม่น้ำกก</option>
          <option value="คลองส่งน้ำ / ทางน้ำธรรมชาติ">คลองส่งน้ำ / ทางน้ำธรรมชาติ</option>
          <option value="บ่อน้ำตื้น / สระน้ำชุมชน">บ่อน้ำตื้น / สระน้ำชุมชน</option>
          <option value="น้ำบาดาล / ประปาภูเขา">น้ำบาดาล / ประปาภูเขา</option>
          <option value="อื่นๆ">อื่นๆ</option>
        </select>
      </div>

      <div>
        <label className="block text-xs font-semibold text-slate-700 mb-1.5">
          ลักษณะทางกายภาพของน้ำ
        </label>
        <select
          value={formData.waterAppearance}
          onChange={(e) => setFormData({ ...formData, waterAppearance: e.target.value })}
          className="w-full text-sm p-2.5 rounded-xl border border-slate-300 focus:border-[#A6192E] bg-white text-slate-800"
        >
          <option value="ใส ไม่มีตะกอน">ใส ไม่มีตะกอน</option>
          <option value="ขุ่นปานกลาง">ขุ่นปานกลาง (มีตะกอนแขวนลอยเล็กน้อย)</option>
          <option value="ขุ่นข้น สีน้ำตาล/สีโคลน">ขุ่นข้น สีน้ำตาล/สีโคลน</option>
          <option value="มีฟองคราบหรือฟิล์มน้ำมัน">มีฟองคราบหรือฟิล์มน้ำมัน</option>
          <option value="มีสีผิดปกติ (เขียวเข้ม/แดงอิฐ)">มีสีผิดปกติ (เขียวเข้ม/แดงอิฐ)</option>
          <option value="ระบุไม่ได้">ระบุไม่ได้</option>
        </select>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="block text-xs font-semibold text-slate-700 mb-1.5">
            กลิ่นน้ำ
          </label>
          <select
            value={formData.odor}
            onChange={(e) => setFormData({ ...formData, odor: e.target.value })}
            className="w-full text-xs p-2.5 rounded-xl border border-slate-300 focus:border-[#A6192E] bg-white text-slate-800"
          >
            <option value="ไม่พบกลิ่นผิดปกติ">ไม่พบกลิ่นผิดปกติ</option>
            <option value="มีกลิ่นดิน/โคลน">มีกลิ่นดิน/โคลน</option>
            <option value="มีกลิ่นเน่าเหม็น">มีกลิ่นเน่าเหม็น</option>
            <option value="มีกลิ่นสารเคมี">มีกลิ่นสารเคมี</option>
            <option value="ไม่ได้สังเกต">ไม่ได้สังเกต</option>
          </select>
        </div>

        <div>
          <label className="block text-xs font-semibold text-slate-700 mb-1.5">
            ฝนตกในรอบ 24 ชม.
          </label>
          <select
            value={formData.rain24h}
            onChange={(e) => setFormData({ ...formData, rain24h: e.target.value })}
            className="w-full text-xs p-2.5 rounded-xl border border-slate-300 focus:border-[#A6192E] bg-white text-slate-800"
          >
            <option value="ไม่มีฝนตก">ไม่มีฝนตก</option>
            <option value="มีฝนตกเล็กน้อย">มีฝนตกเล็กน้อย</option>
            <option value="มีฝนตกหนัก/พายุ">มีฝนตกหนัก/พายุ</option>
            <option value="ไม่ทราบข้อมูล">ไม่ทราบข้อมูล</option>
          </select>
        </div>
      </div>

      <div>
        <label className="block text-xs font-semibold text-slate-700 mb-1">
          บันทึกสภาพแวดล้อมเพิ่มเติม (ไม่บังคับ)
        </label>
        <textarea
          rows={3}
          value={formData.observations}
          onChange={(e) => setFormData({ ...formData, observations: e.target.value })}
          placeholder="เช่น ระดับน้ำในตลิ่งลดลง 10 ซม., มีเศษวัชพืชลอยมาตามน้ำ"
          className="w-full text-xs p-2.5 rounded-xl border border-slate-300 focus:border-[#A6192E] bg-white text-slate-800"
        />
      </div>
    </div>
  );

  // Render Step 4: Measurements (4 Core Parameters)
  const renderStep4 = () => (
    <div className="space-y-4">
      <div className="bg-[#A6192E]/5 border border-[#B4975A]/40 p-3 rounded-xl flex items-center justify-between">
        <div>
          <span className="text-xs font-bold text-[#A6192E] block">
            🧪 ผลตรวจวัดคุณภาพน้ำ 4 พารามิเตอร์หลัก
          </span>
          <span className="text-[11px] text-slate-600">
            สารหนู (As), ค่ากรด-ด่าง (pH), ความขุ่น (NTU), และ อุณหภูมิ (°C)
          </span>
        </div>
      </div>

      {/* 1. สารหนู (Arsenic) */}
      <div className="p-3 bg-white rounded-xl border-2 border-[#A6192E]/30 shadow-xs space-y-2">
        <div className="flex items-center justify-between">
          <label className="text-xs font-bold text-slate-900 flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-[#A6192E]"></span>
            1. ค่าสารหนู (Arsenic: As)
          </label>
          <label className="text-[11px] flex items-center gap-1 cursor-pointer text-slate-600">
            <input
              type="checkbox"
              checked={formData.arsenicMeasured}
              onChange={(e) => setFormData({ ...formData, arsenicMeasured: e.target.checked })}
              className="rounded text-[#A6192E] focus:ring-[#A6192E]"
            />
            <span>วัดค่านี้</span>
          </label>
        </div>

        {formData.arsenicMeasured ? (
          <div className="space-y-2 pt-1">
            <div className="flex gap-2">
              <input
                type="number"
                step="0.01"
                value={formData.arsenicValue}
                onChange={(e) => setFormData({ ...formData, arsenicValue: e.target.value })}
                placeholder="ระบุตัวเลข เช่น 8.5"
                className="flex-1 text-sm font-bold p-2 rounded-lg border border-slate-300 focus:border-[#A6192E] bg-white text-slate-900 font-mono"
              />
              <select
                value={formData.arsenicUnit}
                onChange={(e) => setFormData({ ...formData, arsenicUnit: e.target.value })}
                className="w-24 text-xs font-bold p-2 rounded-lg border border-slate-300 bg-slate-50 text-slate-800"
              >
                <option value="µg/L">µg/L</option>
                <option value="mg/L">mg/L</option>
              </select>
            </div>
            <div className="grid grid-cols-2 gap-2 text-[11px]">
              <div>
                <span className="text-slate-500 block">วิธีวัด:</span>
                <input
                  type="text"
                  value={formData.arsenicMethod}
                  onChange={(e) => setFormData({ ...formData, arsenicMethod: e.target.value })}
                  className="w-full p-1.5 rounded border border-slate-200 bg-slate-50 text-slate-800"
                />
              </div>
              <div>
                <span className="text-slate-500 block">ชื่อเครื่องมือ/ชุดตรวจ:</span>
                <input
                  type="text"
                  value={formData.arsenicInstrument}
                  onChange={(e) => setFormData({ ...formData, arsenicInstrument: e.target.value })}
                  className="w-full p-1.5 rounded border border-slate-200 bg-slate-50 text-slate-800"
                />
              </div>
            </div>
            <p className="text-[10px] text-slate-500 italic">
              * เกณฑ์น้ำผิวดินมาตรฐาน: 10 µg/L (0.01 mg/L)
            </p>
          </div>
        ) : (
          <p className="text-xs text-slate-400 italic py-1">ยังไม่ได้วัดค่าสารหนู (บันทึกเป็น null)</p>
        )}
      </div>

      {/* 2. ค่ากรด-ด่าง (pH) */}
      <div className="p-3 bg-white rounded-xl border border-slate-200 shadow-xs space-y-2">
        <div className="flex items-center justify-between">
          <label className="text-xs font-bold text-slate-900 flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-600"></span>
            2. ค่าความเป็นกรด-ด่าง (pH)
          </label>
          <label className="text-[11px] flex items-center gap-1 cursor-pointer text-slate-600">
            <input
              type="checkbox"
              checked={formData.phMeasured}
              onChange={(e) => setFormData({ ...formData, phMeasured: e.target.checked })}
              className="rounded text-[#A6192E] focus:ring-[#A6192E]"
            />
            <span>วัดค่านี้</span>
          </label>
        </div>

        {formData.phMeasured && (
          <div className="space-y-2 pt-1">
            <input
              type="number"
              step="0.1"
              min="0"
              max="14"
              value={formData.phValue}
              onChange={(e) => setFormData({ ...formData, phValue: e.target.value })}
              placeholder="0.0 - 14.0 (เช่น 7.2)"
              className="w-full text-sm font-bold p-2 rounded-lg border border-slate-300 focus:border-[#A6192E] bg-white text-slate-900 font-mono"
            />
            <div className="text-[11px]">
              <span className="text-slate-500 block">วิธีวัดและเครื่องมือ:</span>
              <input
                type="text"
                value={formData.phInstrument}
                onChange={(e) => setFormData({ ...formData, phInstrument: e.target.value })}
                className="w-full p-1.5 rounded border border-slate-200 bg-slate-50 text-slate-800"
              />
            </div>
          </div>
        )}
      </div>

      {/* 3. ความขุ่น (Turbidity) */}
      <div className="p-3 bg-white rounded-xl border border-slate-200 shadow-xs space-y-2">
        <div className="flex items-center justify-between">
          <label className="text-xs font-bold text-slate-900 flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-amber-500"></span>
            3. ความขุ่น (Turbidity: NTU)
          </label>
          <label className="text-[11px] flex items-center gap-1 cursor-pointer text-slate-600">
            <input
              type="checkbox"
              checked={formData.turbidityMeasured}
              onChange={(e) => setFormData({ ...formData, turbidityMeasured: e.target.checked })}
              className="rounded text-[#A6192E] focus:ring-[#A6192E]"
            />
            <span>วัดค่านี้</span>
          </label>
        </div>

        {formData.turbidityMeasured && (
          <div className="space-y-2 pt-1">
            <div className="flex gap-2">
              <input
                type="number"
                step="0.1"
                value={formData.turbidityValue}
                onChange={(e) => setFormData({ ...formData, turbidityValue: e.target.value })}
                placeholder="เช่น 26.4"
                className="flex-1 text-sm font-bold p-2 rounded-lg border border-slate-300 focus:border-[#A6192E] bg-white text-slate-900 font-mono"
              />
              <span className="px-3 py-2 bg-slate-100 border border-slate-300 rounded-lg text-xs font-bold text-slate-600">
                NTU
              </span>
            </div>
            <div className="text-[11px]">
              <span className="text-slate-500 block">เครื่องมือวัด:</span>
              <input
                type="text"
                value={formData.turbidityInstrument}
                onChange={(e) => setFormData({ ...formData, turbidityInstrument: e.target.value })}
                className="w-full p-1.5 rounded border border-slate-200 bg-slate-50 text-slate-800"
              />
            </div>
          </div>
        )}
      </div>

      {/* 4. อุณหภูมิ (°C) */}
      <div className="p-3 bg-white rounded-xl border border-slate-200 shadow-xs space-y-2">
        <div className="flex items-center justify-between">
          <label className="text-xs font-bold text-slate-900 flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-sky-500"></span>
            4. อุณหภูมิน้ำ (°C)
          </label>
          <label className="text-[11px] flex items-center gap-1 cursor-pointer text-slate-600">
            <input
              type="checkbox"
              checked={formData.tempMeasured}
              onChange={(e) => setFormData({ ...formData, tempMeasured: e.target.checked })}
              className="rounded text-[#A6192E] focus:ring-[#A6192E]"
            />
            <span>วัดค่านี้</span>
          </label>
        </div>

        {formData.tempMeasured && (
          <div className="space-y-2 pt-1">
            <div className="flex gap-2">
              <input
                type="number"
                step="0.1"
                value={formData.tempValue}
                onChange={(e) => setFormData({ ...formData, tempValue: e.target.value })}
                placeholder="เช่น 24.6"
                className="flex-1 text-sm font-bold p-2 rounded-lg border border-slate-300 focus:border-[#A6192E] bg-white text-slate-900 font-mono"
              />
              <span className="px-3 py-2 bg-slate-100 border border-slate-300 rounded-lg text-xs font-bold text-slate-600">
                °C
              </span>
            </div>
          </div>
        )}
      </div>
    </div>
  );

  // Render Step 5: Images & Media
  const renderStep5 = () => (
    <div className="space-y-4">
      <div className="p-3 bg-[#F8F7F5] border border-[#B4975A]/40 rounded-xl">
        <span className="text-xs font-bold text-[#A6192E] block">
          📷 ภาพถ่ายน้ำและจุดเก็บตัวอย่าง
        </span>
        <p className="text-[11px] text-slate-600 mt-0.5">
          แนบภาพถ่ายน้ำ, ตลับทดสอบสารหนู, หรือสภาพแวดล้อมริมตลิ่ง (ไม่เกิน 5 ภาพ ขนาดไม่เกิน 5MB/ภาพ บันทึกลง Supabase Cloud Storage)
        </p>
      </div>

      {/* Dual Upload Buttons (กล้องสด + คลังภาพ) */}
      <div className="grid grid-cols-2 gap-3">
        {/* Camera Capture Input */}
        <div>
          <input
            type="file"
            id="camera-capture-input"
            accept="image/*"
            capture="environment"
            onChange={handleImageUpload}
            className="hidden"
          />
          <label
            htmlFor="camera-capture-input"
            className="cursor-pointer border-2 border-dashed border-[#A6192E]/40 hover:border-[#A6192E] bg-[#A6192E]/5 hover:bg-[#A6192E]/10 rounded-2xl p-4 text-center transition-all flex flex-col items-center justify-center gap-1.5 shadow-xs"
          >
            <div className="w-10 h-10 rounded-full bg-[#A6192E] text-white flex items-center justify-center shadow-sm">
              <Camera className="w-5 h-5" />
            </div>
            <span className="text-xs font-bold text-[#A6192E]">ถ่ายภาพด้วยกล้อง</span>
            <span className="text-[10px] text-slate-500">เปิดกล้องมือถือ/แท็บเล็ต</span>
          </label>
        </div>

        {/* Gallery Upload Input */}
        <div>
          <input
            type="file"
            id="gallery-upload-input"
            accept="image/jpeg,image/png,image/webp"
            multiple
            onChange={handleImageUpload}
            className="hidden"
          />
          <label
            htmlFor="gallery-upload-input"
            className="cursor-pointer border-2 border-dashed border-slate-300 hover:border-slate-400 bg-white hover:bg-slate-50 rounded-2xl p-4 text-center transition-all flex flex-col items-center justify-center gap-1.5 shadow-xs"
          >
            <div className="w-10 h-10 rounded-full bg-slate-100 text-slate-700 flex items-center justify-center">
              <UploadCloud className="w-5 h-5 text-slate-600" />
            </div>
            <span className="text-xs font-bold text-slate-800">เลือกภาพจากเครื่อง</span>
            <span className="text-[10px] text-slate-500">อัลบั้ม/ไฟล์ ({formData.images.length}/5)</span>
          </label>
        </div>
      </div>

      {/* Image Preview Grid */}
      {formData.images.length > 0 && (
        <div className="grid grid-cols-2 gap-3">
          {formData.images.map((img, idx) => (
            <div key={img.id} className="relative group rounded-xl overflow-hidden border border-slate-200 bg-white shadow-xs">
              <img
                src={img.url}
                alt={img.name}
                className="w-full h-28 object-cover"
              />
              <div className="p-2 text-[10px]">
                <span className="font-bold block truncate text-slate-800">{img.title}</span>
                <span className="text-slate-400">{img.sizeKb} KB</span>
              </div>
              <button
                type="button"
                onClick={() => removeImage(img.id)}
                className="absolute top-1.5 right-1.5 p-1 bg-black/60 hover:bg-rose-600 text-white rounded-full transition-all"
                title="ลบภาพนี้"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );

  // Render Step 6: Review & Submit
  const renderStep6 = () => {
    const selectedStation = WATER_WATCH_STATIONS.find(s => s.id === formData.stationId);

    return (
      <div className="space-y-4">
        <div className="bg-[#A6192E] text-white p-3.5 rounded-xl shadow-md flex items-center justify-between">
          <div>
            <span className="text-xs font-semibold text-amber-200 block">ตรวจทานข้อมูลก่อนส่ง</span>
            <h4 className="text-sm font-bold">
              {formData.stationMode === 'station' ? selectedStation?.name : formData.customLocationName}
            </h4>
          </div>
          <span className="text-xs font-mono bg-white/20 px-2 py-1 rounded">
            {formData.collectionDate}
          </span>
        </div>

        {/* Section 1: Location */}
        <div className="p-3 bg-white rounded-xl border border-slate-200 text-xs space-y-1">
          <div className="flex justify-between items-center text-[#A6192E] font-bold border-b pb-1">
            <span>📍 พิกัดและเวลา</span>
            <button type="button" onClick={() => setCurrentStep(1)} className="text-[11px] underline">แก้ไข</button>
          </div>
          <p className="text-slate-700">พิกัด GPS: <strong>{formData.latitude}, {formData.longitude}</strong> (ความแม่นยำ ±{formData.gpsAccuracy} ม.)</p>
          <p className="text-slate-700">เวลาเก็บ: <strong>{formData.collectionDate} {formData.collectionTime} น.</strong></p>
        </div>

        {/* Section 2: Collector */}
        <div className="p-3 bg-white rounded-xl border border-slate-200 text-xs space-y-1">
          <div className="flex justify-between items-center text-[#A6192E] font-bold border-b pb-1">
            <span>👤 ผู้เก็บตัวอย่าง</span>
            <button type="button" onClick={() => setCurrentStep(2)} className="text-[11px] underline">แก้ไข</button>
          </div>
          <p className="text-slate-700">{formData.collectorName} ({formData.collectorId})</p>
          <p className="text-slate-500">โทร: {formData.collectorPhone} &bull; สังกัด: {formData.collectorOrg}</p>
        </div>

        {/* Section 3: Measurements */}
        <div className="p-3 bg-white rounded-xl border border-slate-200 text-xs space-y-1.5">
          <div className="flex justify-between items-center text-[#A6192E] font-bold border-b pb-1">
            <span>🧪 ผลตรวจวัด 4 พารามิเตอร์</span>
            <button type="button" onClick={() => setCurrentStep(4)} className="text-[11px] underline">แก้ไข</button>
          </div>
          <div className="grid grid-cols-2 gap-2 pt-1 font-mono text-[11px]">
            <div className="p-1.5 bg-[#A6192E]/5 rounded border border-[#A6192E]/20">
              <span className="text-slate-500 block text-[10px]">สารหนู (As):</span>
              <strong className="text-[#A6192E] text-xs">
                {formData.arsenicMeasured ? `${formData.arsenicValue} ${formData.arsenicUnit}` : 'ไม่ได้วัด'}
              </strong>
            </div>
            <div className="p-1.5 bg-emerald-50 rounded border border-emerald-200">
              <span className="text-slate-500 block text-[10px]">กรด-ด่าง (pH):</span>
              <strong className="text-emerald-700 text-xs">
                {formData.phMeasured ? formData.phValue : 'ไม่ได้วัด'}
              </strong>
            </div>
            <div className="p-1.5 bg-amber-50 rounded border border-amber-200">
              <span className="text-slate-500 block text-[10px]">ความขุ่น:</span>
              <strong className="text-amber-800 text-xs">
                {formData.turbidityMeasured ? `${formData.turbidityValue} NTU` : 'ไม่ได้วัด'}
              </strong>
            </div>
            <div className="p-1.5 bg-sky-50 rounded border border-sky-200">
              <span className="text-slate-500 block text-[10px]">อุณหภูมิน้ำ:</span>
              <strong className="text-sky-700 text-xs">
                {formData.tempMeasured ? `${formData.tempValue} °C` : 'ไม่ได้วัด'}
              </strong>
            </div>
          </div>
        </div>

        {/* Section 4: Images */}
        <div className="p-3 bg-white rounded-xl border border-slate-200 text-xs space-y-1">
          <div className="flex justify-between items-center text-[#A6192E] font-bold border-b pb-1">
            <span>📷 รูปถ่ายแนบ ({formData.images.length} ภาพ)</span>
            <button type="button" onClick={() => setCurrentStep(5)} className="text-[11px] underline">แก้ไข</button>
          </div>
          {formData.images.length > 0 ? (
            <div className="flex gap-2 pt-1 overflow-x-auto pb-1">
              {formData.images.map(img => (
                <img key={img.id} src={img.url} alt="thumb" className="w-12 h-12 rounded object-cover border" />
              ))}
            </div>
          ) : (
            <p className="text-slate-400 italic text-[11px]">ไม่มีภาพถ่ายแนบ</p>
          )}
        </div>
      </div>
    );
  };

  // Submission Progress Modal / Overlay
  if (isSubmitting || submitStage === 'done') {
    return (
      <div className="p-6 bg-white rounded-2xl shadow-xl border border-slate-200 text-center space-y-5 animate-in fade-in">
        {submitStage !== 'done' ? (
          <>
            <div className="w-14 h-14 rounded-full bg-[#A6192E]/10 text-[#A6192E] mx-auto flex items-center justify-center animate-pulse">
              <UploadCloud className="w-7 h-7" />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-900">กำลังบันทึกและส่งข้อมูลขึ้น Supabase Cloud...</h3>
              <p className="text-xs text-slate-500 mt-1">กรุณารอสักครู่ ระบบกำลังจัดเก็บข้อมูลและรูปภาพขึ้นระบบคลาวด์</p>
            </div>

            <div className="space-y-2 text-left text-xs bg-[#F8F7F5] p-3.5 rounded-xl border border-slate-200">
              <div className="flex items-center gap-2 text-slate-700">
                {['storage', 'supabase', 'done'].includes(submitStage) ? (
                  <Check className="w-4 h-4 text-emerald-600" />
                ) : <span className="w-4 h-4 rounded-full border border-slate-300"></span>}
                <span>1. อัปโหลดรูปภาพสู่ <strong>Supabase Storage</strong> (water-watch-photos)</span>
              </div>
              <div className="flex items-center gap-2 text-slate-700">
                {['supabase', 'done'].includes(submitStage) ? (
                  <Check className="w-4 h-4 text-emerald-600" />
                ) : <span className="w-4 h-4 rounded-full border border-slate-300"></span>}
                <span>2. บันทึกข้อมูลคุณภาพน้ำสู่ <strong>Supabase Database</strong> (kok_water_samples)</span>
              </div>
              <div className="flex items-center gap-2 text-slate-700">
                {submitStage === 'done' ? (
                  <Check className="w-4 h-4 text-emerald-600" />
                ) : <span className="w-4 h-4 rounded-full border border-slate-300"></span>}
                <span>3. สำรองข้อมูลลงแคชเครื่อง (IndexedDB / Local Cache)</span>
              </div>
              <div className="flex items-center gap-2 text-slate-700">
                {submitStage === 'done' ? (
                  <Check className="w-4 h-4 text-emerald-600" />
                ) : <span className="w-4 h-4 rounded-full border border-slate-300"></span>}
                <span>4. ซิงค์หมุดแสดงผลบนแผนที่แบบ Realtime</span>
              </div>
            </div>
          </>
        ) : (
          <>
            <div className="w-14 h-14 rounded-full bg-emerald-100 text-emerald-600 mx-auto flex items-center justify-center">
              <CheckCircle2 className="w-8 h-8" />
            </div>
            <div>
              <span className="text-xs font-bold text-emerald-700 uppercase tracking-wide">
                บันทึกขึ้น Supabase สำเร็จ
              </span>
              <h3 className="text-lg font-bold text-slate-900 mt-1">
                {completedSample?.sample_code}
              </h3>
              <p className="text-xs text-slate-500 mt-1">
                ข้อมูลถูกส่งขึ้น Supabase Cloud และอัปเดตลงแผนที่เรียบร้อยแล้ว
              </p>
            </div>

            <div className="p-3 bg-[#F8F7F5] rounded-xl border border-slate-200 text-left text-xs space-y-1">
              <p>📍 สถานที่: <strong>{completedSample?.station_name}</strong></p>
              <p>🧪 สารหนู: <strong>{completedSample?.measurements.arsenic.value} µg/L</strong></p>
              <p>👤 ผู้บันทึก: {completedSample?.collector.name}</p>
            </div>

            <button
              type="button"
              onClick={() => {
                if (onSubmitSuccess) onSubmitSuccess(completedSample);
              }}
              className="w-full py-3 rounded-xl bg-[#A6192E] text-white font-bold text-sm shadow-lg shadow-[#A6192E]/25 hover:bg-[#851424] transition-all flex items-center justify-center gap-2"
            >
              <span>ดูข้อมูลตัวอย่างนี้บนแผนที่</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </>
        )}
      </div>
    );
  }

  const validateCurrentStep = () => {
    if (currentStep === 1) {
      if (formData.stationMode === 'off-station' && !formData.customLocationName.trim()) {
        alert('กรุณาระบุชื่อสถานที่ หรือจุดเก็บนอกสถานี');
        return false;
      }
      if (!formData.latitude || !formData.longitude) {
        alert('กรุณาระบุพิกัดละติจูดและลองจิจูด');
        return false;
      }
    }
    if (currentStep === 2) {
      if (!formData.collectorName.trim()) {
        alert('กรุณากรอกชื่อ-นามสกุล ผู้เก็บตัวอย่าง');
        return false;
      }
      if (!formData.collectorPhone.trim()) {
        alert('กรุณากรอกเบอร์โทรศัพท์ติดต่อ');
        return false;
      }
    }
    if (currentStep === 4) {
      if (formData.arsenicMeasured && (!formData.arsenicValue || isNaN(formData.arsenicValue))) {
        alert('กรุณาระบุค่าสารหนูเป็นตัวเลข หรือยกเลิกการติ๊ก "วัดค่านี้"');
        return false;
      }
      if (formData.phMeasured && (!formData.phValue || isNaN(formData.phValue) || parseFloat(formData.phValue) < 0 || parseFloat(formData.phValue) > 14)) {
        alert('กรุณาระบุค่า pH ที่ถูกต้อง (ระหว่าง 0.0 ถึง 14.0) หรือยกเลิกการติ๊ก "วัดค่านี้"');
        return false;
      }
      if (formData.turbidityMeasured && (!formData.turbidityValue || isNaN(formData.turbidityValue))) {
        alert('กรุณาระบุค่าความขุ่นเป็นตัวเลข หรือยกเลิกการติ๊ก "วัดค่านี้"');
        return false;
      }
      if (formData.tempMeasured && (!formData.tempValue || isNaN(formData.tempValue))) {
        alert('กรุณาระบุค่าอุณหภูมิเป็นตัวเลข หรือยกเลิกการติ๊ก "วัดค่านี้"');
        return false;
      }
    }
    return true;
  };

  const handleNextStep = () => {
    if (validateCurrentStep()) {
      setCurrentStep(prev => prev + 1);
    }
  };

  return (
    <div className="bg-white rounded-2xl shadow-xl border border-slate-200 overflow-hidden max-w-lg w-full">
      {/* Header */}
      <div className="bg-[#A6192E] text-white p-4 flex items-center justify-between">
        <div>
          <div className="flex items-center gap-2">
            <span className="text-xs text-slate-200">
              ขั้นที่ {currentStep} จาก 6
            </span>
          </div>
          <h2 className="text-base font-bold text-white mt-1">
            {currentStep === 1 && '1. สถานที่และเวลาเก็บตัวอย่าง'}
            {currentStep === 2 && '2. ข้อมูลผู้เก็บตัวอย่าง'}
            {currentStep === 3 && '3. ลักษณะทางกายภาพของน้ำ'}
            {currentStep === 4 && '4. ผลตรวจวัดคุณภาพน้ำ 4 ค่า'}
            {currentStep === 5 && '5. แนบภาพถ่ายและหลักฐาน'}
            {currentStep === 6 && '6. ตรวจทานข้อมูลและส่ง'}
          </h2>
        </div>
        <button
          type="button"
          onClick={onCancel}
          className="p-1.5 rounded-lg bg-white/10 hover:bg-white/20 text-white transition-all"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      {/* Step Indicators */}
      <div className="grid grid-cols-6 bg-[#F8F7F5] border-b border-slate-200">
        {[1, 2, 3, 4, 5, 6].map(step => (
          <button
            key={step}
            type="button"
            onClick={() => {
              if (step <= currentStep || validateCurrentStep()) {
                setCurrentStep(step);
              }
            }}
            className={`py-2 text-center text-xs font-bold transition-all border-b-2 ${
              currentStep === step
                ? 'border-[#A6192E] text-[#A6192E] bg-white'
                : (step < currentStep ? 'border-emerald-600 text-emerald-700' : 'border-transparent text-slate-400')
            }`}
          >
            {step}
          </button>
        ))}
      </div>

      {/* Body Content */}
      <div className="p-4 max-h-[62vh] overflow-y-auto">
        {currentStep === 1 && renderStep1()}
        {currentStep === 2 && renderStep2()}
        {currentStep === 3 && renderStep3()}
        {currentStep === 4 && renderStep4()}
        {currentStep === 5 && renderStep5()}
        {currentStep === 6 && renderStep6()}
      </div>

      {/* Bottom Navigation Buttons */}
      <div className="p-4 bg-[#F8F7F5] border-t border-slate-200 flex items-center justify-between gap-3">
        {currentStep > 1 ? (
          <button
            type="button"
            onClick={() => setCurrentStep(prev => prev - 1)}
            className="px-4 py-2.5 rounded-xl border border-slate-300 text-slate-700 font-semibold text-xs hover:bg-slate-100 transition-all flex items-center gap-1.5"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            <span>ย้อนกลับ</span>
          </button>
        ) : (
          <button
            type="button"
            onClick={onCancel}
            className="px-4 py-2.5 rounded-xl border border-slate-300 text-slate-600 font-semibold text-xs hover:bg-slate-100 transition-all"
          >
            ยกเลิก
          </button>
        )}

        {currentStep < 6 ? (
          <button
            type="button"
            onClick={handleNextStep}
            className="px-5 py-2.5 rounded-xl bg-[#A6192E] hover:bg-[#851424] text-white font-bold text-xs shadow-md shadow-[#A6192E]/20 transition-all flex items-center gap-1.5 ml-auto"
          >
            <span>ขั้นตอนถัดไป</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        ) : (
          <button
            type="button"
            onClick={handleSubmit}
            className="px-6 py-2.5 rounded-xl bg-[#A6192E] hover:bg-[#851424] text-white font-bold text-xs shadow-lg shadow-[#A6192E]/30 transition-all flex items-center gap-2 ml-auto"
          >
            <CheckCircle2 className="w-4 h-4" />
            <span>ยืนยันบันทึกข้อมูล (Submit)</span>
          </button>
        )}
      </div>
    </div>
  );
}
