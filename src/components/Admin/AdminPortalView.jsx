import React, { useState, useEffect, useMemo, useRef } from 'react';
import {
  Shield,
  ShieldCheck,
  User,
  Lock,
  Mail,
  Eye,
  EyeOff,
  ArrowLeft,
  LogOut,
  RefreshCw,
  Download,
  Trash2,
  CheckCircle2,
  AlertTriangle,
  Info,
  MapPin,
  Calendar,
  Camera,
  Database,
  Search,
  Filter,
  Check,
  X,
  ExternalLink,
  ChevronRight,
  Activity,
  Layers,
  Sparkles,
  Maximize2,
  Sun,
  Moon
} from 'lucide-react';
import {
  loginAdmin,
  logoutAdmin,
  verifyAdminSession
} from '../../lib/adminAuth';
import { getArsenicLevelConfig } from '../../data/waterWatchData';
import {
  fetchAdminSamples,
  fetchAdminContact,
  fetchAdminAlerts,
  fetchAdminMembers,
  reviewAdminSample,
  inviteAdmin,
  deactivateAdmin,
  fetchContactRemovalRequests,
  resolveContactRemovalRequest
} from '../../lib/supabase';
import { downloadWaterWatchCSV } from '../KokWaterWatch/waterWatchExport';
import { filterAdminSubmissions, getCollectorDisplayName } from './adminFilter';

function ThemeToggle({ theme, onChange, className = '' }) {
  const isDark = theme === 'dark';
  return (
    <div
      className={`inline-flex items-center p-1 rounded-xl border transition-all text-xs font-semibold shadow-xs gap-1 ${
        isDark ? 'bg-slate-900/90 border-slate-700 text-slate-300' : 'bg-slate-100 border-slate-300 text-slate-700'
      } ${className}`}
      role="group"
      aria-label="เลือกธีมสี"
    >
      <button
        type="button"
        onClick={() => onChange('light')}
        className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg transition-all cursor-pointer font-bold ${
          !isDark
            ? 'bg-white text-slate-900 shadow-sm border border-slate-300/80 scale-102'
            : 'text-slate-400 hover:text-white'
        }`}
        title="เปลี่ยนเป็นธีมสีขาว (Light Mode - ค่าเริ่มต้น)"
      >
        <span className="w-3.5 h-3.5 rounded-full bg-white border-2 border-slate-400 inline-block shadow-xs" />
        <span>สีขาว</span>
      </button>

      <button
        type="button"
        onClick={() => onChange('dark')}
        className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg transition-all cursor-pointer font-bold ${
          isDark
            ? 'bg-slate-950 text-white shadow-sm border border-slate-700 scale-102'
            : 'text-slate-500 hover:text-slate-900'
        }`}
        title="เปลี่ยนเป็นธีมสีดำ (Dark Mode)"
      >
        <span className="w-3.5 h-3.5 rounded-full bg-slate-900 border-2 border-slate-600 inline-block shadow-xs" />
        <span>สีดำ</span>
      </button>
    </div>
  );
}

export default function AdminPortalView({ onBackToMap }) {
  const [session, setSession] = useState(null);
  const [emailInput, setEmailInput] = useState('');
  const [passwordInput, setPasswordInput] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loginLoading, setLoginLoading] = useState(false);
  const [loginError, setLoginError] = useState('');
  const [feedbackMsg, setFeedbackMsg] = useState('');

  // Theme State: 'light' (สีขาว - ค่าเริ่มต้น) หรือ 'dark' (สีดำ)
  const [theme, setTheme] = useState(() => {
    if (typeof window !== 'undefined') {
      return localStorage.getItem('kok_admin_theme') || 'light';
    }
    return 'light';
  });

  const handleThemeChange = (nextTheme) => {
    setTheme(nextTheme);
    try {
      localStorage.setItem('kok_admin_theme', nextTheme);
    } catch {}
  };

  const isDark = theme === 'dark';

  // Dashboard Data State
  const [submissions, setSubmissions] = useState([]);
  const [alerts, setAlerts] = useState([]);
  const [adminMembers, setAdminMembers] = useState([]);
  const [contactRemovalRequests, setContactRemovalRequests] = useState([]);
  const [selectedContact, setSelectedContact] = useState(null);
  const [contactLoading, setContactLoading] = useState(false);
  const [inviteEmail, setInviteEmail] = useState('');
  const [activeTab, setActiveTab] = useState('samples'); // 'samples' | 'database' | 'logs'
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('all'); // 'all' | 'normal' | 'watch' | 'critical'
  const [reviewStatus, setReviewStatus] = useState('all');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [photoFilter, setPhotoFilter] = useState('all'); // 'all' | 'with-photo' | 'no-photo'
  const [selectedSubmission, setSelectedSubmission] = useState(null);
  const [previewPhoto, setPreviewPhoto] = useState(null);
  const [isSyncing, setIsSyncing] = useState(false);
  const isLoggedIn = Boolean(session && session.user);

  useEffect(() => {
    let active = true;
    verifyAdminSession().then(currentSession => {
      if (active) setSession(currentSession);
    });
    return () => { active = false; };
  }, []);

  const refreshData = async () => {
    setIsSyncing(true);
    try {
      const [remoteSamples, remoteAlerts, remoteMembers, remoteRemovalRequests] = await Promise.all([
        fetchAdminSamples(), fetchAdminAlerts(), fetchAdminMembers(), fetchContactRemovalRequests()
      ]);
      setSubmissions(remoteSamples);
      setAlerts(remoteAlerts);
      setAdminMembers(remoteMembers);
      setContactRemovalRequests(remoteRemovalRequests);
      setFeedbackMsg(`อัปเดตข้อมูลจากระบบแล้ว (${remoteSamples.length} รายการ)`);
      setTimeout(() => setFeedbackMsg(''), 4000);
    } catch (err) {
      setSubmissions([]);
      setAlerts([]);
      setAdminMembers([]);
      setContactRemovalRequests([]);
      setFeedbackMsg(err.message || 'โหลดข้อมูลจากระบบไม่สำเร็จ');
    } finally {
      setIsSyncing(false);
    }
  };

  useEffect(() => {
    if (!isLoggedIn) return undefined;
    refreshData();
    const timer = setInterval(refreshData, 15_000);
    return () => clearInterval(timer);
  }, [isLoggedIn]);

  const handleLoginSubmit = async (e) => {
    e?.preventDefault();
    setLoginLoading(true);
    setLoginError('');

    try {
      const result = await loginAdmin({
        email: emailInput,
        password: passwordInput
      });

      if (result.success) {
        setSession(result.session);
      } else {
        setLoginError(result.error || 'เข้าสู่ระบบไม่สำเร็จ');
      }
    } catch (err) {
      setLoginError(err.message || 'เกิดข้อผิดพลาดในการเข้าสู่ระบบ');
    } finally {
      setLoginLoading(false);
    }
  };

  const handleLogout = async () => {
    try {
      await logoutAdmin();
      setSession(null);
      setSubmissions([]);
      setAlerts([]);
    } catch (error) {
      setFeedbackMsg(error.message || 'ออกจากระบบไม่สำเร็จ กรุณาลองใหม่');
    }
  };

  const handleReview = async (sample, decision) => {
    const reason = window.prompt(decision === 'approve' ? 'เหตุผล/หมายเหตุการอนุมัติ' : 'เหตุผลที่ปฏิเสธผลตรวจ');
    if (reason === null || reason.trim().length < 3) return;
    try {
      await reviewAdminSample(sample.sample_code, { decision, revision: sample.revision, reason: reason.trim() });
      await refreshData();
      setFeedbackMsg(decision === 'approve' ? 'อนุมัติ revision ปัจจุบันแล้ว' : 'ปฏิเสธผลตรวจและบันทึกเหตุผลแล้ว');
    } catch (error) {
      setFeedbackMsg(error.message || 'บันทึกผลพิจารณาไม่สำเร็จ');
    }
  };

  const handleShowContact = async (sample) => {
    setContactLoading(true);
    try {
      const contact = await fetchAdminContact(sample.sample_code);
      setSelectedContact(contact || {});
    } catch (error) {
      setFeedbackMsg(error.message || 'เปิดข้อมูลติดต่อไม่สำเร็จ');
    } finally {
      setContactLoading(false);
    }
  };

  const handleInvite = async () => {
    try {
      await inviteAdmin(inviteEmail);
      setInviteEmail('');
      setFeedbackMsg('ส่งคำเชิญเข้าคิวอีเมลแล้ว');
    } catch (error) {
      setFeedbackMsg(error.message || 'เชิญผู้ดูแลไม่สำเร็จ');
    }
  };

  const handleDeactivate = async (member) => {
    if (!window.confirm(`ถอนสิทธิ์ผู้ดูแล ${member.email}?`)) return;
    try {
      await deactivateAdmin(member.user_id);
      await refreshData();
      setFeedbackMsg('ถอนสิทธิ์ผู้ดูแลแล้ว');
    } catch (error) {
      setFeedbackMsg(error.message || 'ถอนสิทธิ์ผู้ดูแลไม่สำเร็จ');
    }
  };

  const handleResolveContactRemoval = async (request) => {
    const reason = window.prompt('ยืนยันการลบเฉพาะข้อมูลติดต่อ (ผลตรวจจะคงอยู่) — ระบุเหตุผล');
    if (reason === null || reason.trim().length < 3) return;
    try {
      await resolveContactRemovalRequest(request.id, reason.trim());
      await refreshData();
      setFeedbackMsg('ลบข้อมูลติดต่อและบันทึกประวัติแล้ว โดยเก็บผลตรวจไว้');
    } catch (error) {
      setFeedbackMsg(error.message || 'จัดการคำขอไม่สำเร็จ');
    }
  };

  // Statistics
  const stats = useMemo(() => {
    let normal = 0;
    let watch = 0;
    let critical = 0;
    let withPhoto = 0;

    (Array.isArray(submissions) ? submissions : []).forEach((item) => {
      if (!item) return;
      const ppb = item.measurements?.arsenic?.value ?? item.arsenic_ppb ?? item.arsenic_level_ppb ?? null;
      if (ppb !== null && !isNaN(Number(ppb))) {
        const val = Number(ppb);
        if (val < 5) normal += 1;
        else if (val <= 10) watch += 1;
        else critical += 1;
      }
      if (item.images && item.images.length > 0) withPhoto += 1;
    });

    return {
      total: Array.isArray(submissions) ? submissions.length : 0,
      normal,
      watch,
      critical,
      withPhoto
    };
  }, [submissions]);

  // Filtered Submissions
  const filteredSubmissions = useMemo(() => {
    const filtered = filterAdminSubmissions(submissions, { searchQuery, statusFilter, photoFilter, reviewStatus });
    const from = dateFrom ? new Date(`${dateFrom}T00:00:00`).getTime() : null;
    const to = dateTo ? new Date(`${dateTo}T23:59:59.999`).getTime() : null;
    return filtered.filter(item => {
      const time = Date.parse(item.collection_time || '');
      if (!Number.isFinite(time)) return !from && !to;
      return (from === null || time >= from) && (to === null || time <= to);
    });
  }, [submissions, searchQuery, statusFilter, photoFilter, reviewStatus, dateFrom, dateTo]);

  // If not logged in, render the Login Screen
  if (!isLoggedIn) {
    return (
      <div className={`relative min-h-screen w-full flex flex-col justify-center items-center p-4 sm:p-6 overflow-y-auto font-['Prompt',sans-serif] transition-colors duration-200 ${
        isDark ? 'bg-slate-900 text-slate-100' : 'bg-gradient-to-br from-slate-100 via-stone-50 to-slate-200 text-slate-800'
      }`}>
        {/* Ambient Glow */}
        <div className={`absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[500px] rounded-full blur-3xl pointer-events-none transition-opacity ${
          isDark ? 'bg-[#A6192E]/20' : 'bg-[#A6192E]/10'
        }`} />
        <div className={`absolute bottom-10 right-1/4 w-[350px] h-[350px] rounded-full blur-3xl pointer-events-none transition-opacity ${
          isDark ? 'bg-amber-600/15' : 'bg-amber-500/10'
        }`} />

        {/* Top Header Actions (Back Button & Theme Switcher) */}
        <div className="absolute top-4 left-4 right-4 sm:top-6 sm:left-6 sm:right-6 z-20 flex items-center justify-between pointer-events-none">
          <button
            type="button"
            onClick={onBackToMap}
            className={`pointer-events-auto flex items-center gap-2 px-3.5 py-2 rounded-xl transition-all text-xs sm:text-sm font-semibold cursor-pointer active:scale-95 ${
              isDark
                ? 'bg-white/10 hover:bg-white/20 text-white backdrop-blur-md border border-white/15'
                : 'bg-white hover:bg-slate-50 text-slate-700 border border-slate-300 shadow-sm'
            }`}
          >
            <ArrowLeft size={16} />
            <span>กลับสู่หน้าแผนที่</span>
          </button>

          {/* Theme Toggle Button (White & Black) */}
          <div className="pointer-events-auto">
            <ThemeToggle theme={theme} onChange={handleThemeChange} />
          </div>
        </div>

        {/* Login Card Container */}
        <div className={`relative z-10 w-full max-w-md rounded-3xl p-6 sm:p-8 shadow-2xl transition-all duration-200 animate-in fade-in zoom-in-95 ${
          isDark
            ? 'bg-slate-800/90 backdrop-blur-xl border border-slate-700/80 text-white'
            : 'bg-white/95 backdrop-blur-xl border border-slate-200 shadow-xl text-slate-800'
        }`}>
          {/* Header & Logo */}
          <div className="flex flex-col items-center text-center mb-6">
            <div className="w-16 h-16 rounded-2xl bg-gradient-to-tr from-[#A6192E] to-[#B4975A] flex items-center justify-center text-white shadow-lg shadow-[#A6192E]/25 mb-3 border border-white/20">
              <Shield className="w-8 h-8" />
            </div>
            <h1 className={`text-xl sm:text-2xl font-bold tracking-wide ${isDark ? 'text-white' : 'text-slate-900'}`}>
              ระบบหลังบ้านผู้ดูแลระบบ
            </h1>
            <p className={`text-xs mt-1 max-w-xs ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
              MFU Water Watch · ระบบจัดการข้อมูลและผลตรวจวัดสารหนูในแม่น้ำกก
            </p>
          </div>

          {/* Error Message */}
          {loginError && (
            <div className={`mb-4 p-3 rounded-xl text-xs flex items-center gap-2 animate-in fade-in ${
              isDark
                ? 'bg-red-950/70 border border-red-500/40 text-red-200'
                : 'bg-rose-50 border border-rose-300 text-rose-800'
            }`}>
              <AlertTriangle className="w-4 h-4 text-red-500 shrink-0" />
              <span>{loginError}</span>
            </div>
          )}

          {/* Form */}
          <form onSubmit={handleLoginSubmit} className="space-y-4">
            <div>
              <label className={`block text-xs font-semibold mb-1.5 ${isDark ? 'text-slate-300' : 'text-slate-700'}`}>
                อีเมลผู้ดูแลระบบ (Admin Email)
              </label>
              <div className="relative">
                <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                <input
                  type="text"
                  value={emailInput}
                  onChange={(e) => setEmailInput(e.target.value)}
                  placeholder="admin@mfu.ac.th หรือ admin"
                  required
                  className={`w-full pl-10 pr-4 py-2.5 rounded-xl text-sm transition-all focus:outline-none focus:ring-1 focus:ring-[#A6192E] ${
                    isDark
                      ? 'bg-slate-900/80 border border-slate-600 text-white placeholder-slate-500 focus:border-[#B4975A]'
                      : 'bg-slate-50 border border-slate-300 text-slate-900 placeholder-slate-400 focus:bg-white focus:border-[#A6192E]'
                  }`}
                />
              </div>
            </div>

            <div>
              <label className={`block text-xs font-semibold mb-1.5 ${isDark ? 'text-slate-300' : 'text-slate-700'}`}>
                รหัสผ่าน (Password)
              </label>
              <div className="relative">
                <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={passwordInput}
                  onChange={(e) => setPasswordInput(e.target.value)}
                  placeholder="รหัสผ่าน"
                  required
                  className={`w-full pl-10 pr-10 py-2.5 rounded-xl text-sm transition-all focus:outline-none focus:ring-1 focus:ring-[#A6192E] ${
                    isDark
                      ? 'bg-slate-900/80 border border-slate-600 text-white placeholder-slate-500 focus:border-[#B4975A]'
                      : 'bg-slate-50 border border-slate-300 text-slate-900 placeholder-slate-400 focus:bg-white focus:border-[#A6192E]'
                  }`}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className={`absolute right-3 top-1/2 -translate-y-1/2 cursor-pointer transition-colors ${
                    isDark ? 'text-slate-400 hover:text-slate-200' : 'text-slate-400 hover:text-slate-700'
                  }`}
                >
                  {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
            </div>

            <button
              type="submit"
              disabled={loginLoading}
              className="w-full py-3 px-4 rounded-xl bg-gradient-to-r from-[#A6192E] to-[#8C1022] hover:from-[#B81D33] hover:to-[#9E1428] text-white font-bold text-sm shadow-lg shadow-[#A6192E]/25 transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50 mt-2 active:scale-98"
            >
              {loginLoading ? (
                <>
                  <RefreshCw className="w-4 h-4 animate-spin" />
                  <span>กำลังตรวจสอบ...</span>
                </>
              ) : (
                <>
                  <Lock className="w-4 h-4" />
                  <span>เข้าสู่ระบบผู้ดูแล</span>
                </>
              )}
            </button>
          </form>

          {/* Quick Notice */}
          <div className={`mt-6 pt-5 border-t text-center ${isDark ? 'border-slate-700/60 text-slate-400' : 'border-slate-200 text-slate-500'}`}>
            <p className="text-[11px] leading-relaxed">
              เข้าสู่ระบบด้วยบัญชี Supabase Auth ที่ได้รับสิทธิ์ผู้ดูแลระบบ
              <br />ระบบจะตรวจสิทธิ์สมาชิกผู้ดูแลที่ active ตลอดเวลา
            </p>
          </div>
        </div>
      </div>
    );
  }

  // Admin Dashboard (ระบบหลังบ้านเมื่อเข้าสู่ระบบแล้ว)
  return (
    <div className={`min-h-screen w-full flex flex-col font-['Prompt',sans-serif] transition-colors duration-200 ${
      isDark ? 'bg-slate-950 text-slate-100' : 'bg-slate-50 text-slate-800'
    }`}>
      {/* Top Navbar */}
      <header className={`sticky top-0 z-40 backdrop-blur-md px-4 sm:px-6 py-3 flex items-center justify-between border-b shadow-sm transition-colors duration-200 ${
        isDark ? 'bg-slate-900/90 border-slate-800' : 'bg-white/95 border-slate-200'
      }`}>
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-[#A6192E] to-[#B4975A] flex items-center justify-center text-white shadow-sm">
            <ShieldCheck size={20} />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className={`text-sm font-bold tracking-wide ${isDark ? 'text-white' : 'text-slate-900'}`}>
                ระบบจัดการหลังบ้าน MFU Water
              </span>
              <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                isDark
                  ? 'bg-[#A6192E]/20 text-red-300 border border-[#A6192E]/40'
                  : 'bg-[#A6192E]/10 text-[#A6192E] border border-[#A6192E]/30'
              }`}>
                ADMIN PORTAL
              </span>
            </div>
            <p className={`text-[11px] hidden sm:block ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
              {session?.user?.email || 'ผู้ดูแลระบบ'} · สิทธิ์: {session?.user?.role || 'admin'}
            </p>
          </div>
        </div>

        {/* Header Right Actions */}
        <div className="flex items-center gap-2 sm:gap-3">
          {/* Theme Toggle (White & Black) */}
          <ThemeToggle theme={theme} onChange={handleThemeChange} />

          <button
            type="button"
            onClick={onBackToMap}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold border transition-all cursor-pointer active:scale-95 ${
              isDark
                ? 'bg-slate-800 hover:bg-slate-700 text-slate-200 border-slate-700'
                : 'bg-white hover:bg-slate-100 text-slate-700 border-slate-300 shadow-xs'
            }`}
            title="กลับไปที่หน้าจอแผนที่สาธารณะ"
          >
            <ExternalLink size={14} />
            <span className="hidden sm:inline">ดูหน้าแผนที่</span>
          </button>

          <button
            type="button"
            onClick={handleLogout}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold border transition-all cursor-pointer active:scale-95 ${
              isDark
                ? 'bg-red-950/60 hover:bg-red-900/60 text-red-300 border-red-800/40'
                : 'bg-rose-50 hover:bg-rose-100 text-rose-700 border-rose-200 shadow-xs'
            }`}
            title="ออกจากระบบ"
          >
            <LogOut size={14} />
            <span className="hidden sm:inline">ออกจากระบบ</span>
          </button>
        </div>
      </header>

      {/* Feedback Toast */}
      {feedbackMsg && (
        <div className="fixed top-16 right-4 z-50 bg-[#176756] text-white px-4 py-2.5 rounded-xl shadow-xl border border-emerald-400/40 text-xs flex items-center gap-2 animate-in slide-in-from-top-2">
          <CheckCircle2 size={16} />
          <span>{feedbackMsg}</span>
        </div>
      )}

      {/* Main Content Area */}
      <main className="flex-1 max-w-7xl w-full mx-auto p-4 sm:p-6 space-y-6">
        {/* KPI Stats Overview */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4">
          {/* Total Submissions */}
          <div className={`border rounded-2xl p-4 flex flex-col justify-between shadow-xs transition-colors ${
            isDark ? 'bg-slate-900/80 border-slate-800' : 'bg-white border-slate-200'
          }`}>
            <span className={`text-xs font-semibold ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
              รายการผลตรวจทั้งหมด
            </span>
            <div className="flex items-baseline justify-between mt-2">
              <span className={`text-2xl sm:text-3xl font-extrabold ${isDark ? 'text-white' : 'text-slate-900'}`}>
                {stats.total}
              </span>
              <span className={`text-[11px] ${isDark ? 'text-slate-500' : 'text-slate-400'}`}>จุดบันทึก</span>
            </div>
          </div>

          {/* Normal Count */}
          <div className={`border rounded-2xl p-4 flex flex-col justify-between shadow-xs transition-colors ${
            isDark ? 'bg-slate-900/80 border-slate-800' : 'bg-emerald-50/70 border-emerald-200'
          }`}>
            <div className="flex items-center justify-between">
              <span className={`text-xs font-semibold ${isDark ? 'text-emerald-400' : 'text-emerald-800'}`}>
                ปกติ (&lt; 5 ppb)
              </span>
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-500"></span>
            </div>
            <div className="flex items-baseline justify-between mt-2">
              <span className={`text-2xl sm:text-3xl font-extrabold ${isDark ? 'text-emerald-400' : 'text-emerald-700'}`}>
                {stats.normal}
              </span>
              <span className={`text-[11px] ${isDark ? 'text-slate-500' : 'text-emerald-600'}`}>
                รายการ &lt; 5 ppb
              </span>
            </div>
          </div>

          {/* Watch Count */}
          <div className={`border rounded-2xl p-4 flex flex-col justify-between shadow-xs transition-colors ${
            isDark ? 'bg-slate-900/80 border-slate-800' : 'bg-amber-50/70 border-amber-200'
          }`}>
            <div className="flex items-center justify-between">
              <span className={`text-xs font-semibold ${isDark ? 'text-amber-400' : 'text-amber-800'}`}>
                เฝ้าระวัง (5-10 ppb)
              </span>
              <span className="w-2.5 h-2.5 rounded-full bg-amber-500"></span>
            </div>
            <div className="flex items-baseline justify-between mt-2">
              <span className={`text-2xl sm:text-3xl font-extrabold ${isDark ? 'text-amber-400' : 'text-amber-700'}`}>
                {stats.watch}
              </span>
              <span className={`text-[11px] ${isDark ? 'text-slate-500' : 'text-amber-600'}`}>
                เฝ้าระวัง
              </span>
            </div>
          </div>

          {/* Critical Count */}
          <div className={`border rounded-2xl p-4 flex flex-col justify-between shadow-xs transition-colors ${
            isDark ? 'bg-slate-900/80 border-slate-800' : 'bg-rose-50/70 border-rose-200'
          }`}>
            <div className="flex items-center justify-between">
              <span className={`text-xs font-semibold ${isDark ? 'text-red-400' : 'text-rose-800'}`}>
                เกินเกณฑ์ (&gt; 10 ppb)
              </span>
              <span className="w-2.5 h-2.5 rounded-full bg-red-500 animate-pulse"></span>
            </div>
            <div className="flex items-baseline justify-between mt-2">
              <span className={`text-2xl sm:text-3xl font-extrabold ${isDark ? 'text-red-400' : 'text-rose-700'}`}>
                {stats.critical}
              </span>
              <span className={`text-[11px] ${isDark ? 'text-slate-500' : 'text-rose-600'}`}>
                ต้องบำบัด
              </span>
            </div>
          </div>
        </div>

        {/* Section: Pending, Alerts, Admin Invitations */}
        <section className={`grid grid-cols-1 lg:grid-cols-[1fr_auto] gap-4 border rounded-2xl p-4 shadow-xs transition-colors ${
          isDark ? 'bg-slate-900/80 border-slate-800' : 'bg-white border-slate-200'
        }`}>
          <div className="flex flex-wrap gap-3 text-xs">
            <span className={`px-3 py-2 rounded-xl font-medium ${
              isDark ? 'bg-amber-950/60 text-amber-200' : 'bg-amber-50 text-amber-800 border border-amber-200'
            }`}>
              รอตรวจสอบ &gt; 50 ppb: {submissions.filter(item => item.publication_status === 'pending_review').length}
            </span>
            <span className={`px-3 py-2 rounded-xl font-medium ${
              isDark ? 'bg-red-950/60 text-red-200' : 'bg-rose-50 text-rose-800 border border-rose-200'
            }`}>
              อีเมลแจ้งเตือนส่งไม่สำเร็จ: {alerts.filter(item => item.email_status === 'failed').length}
            </span>
            <span className={`px-3 py-2 rounded-xl font-medium ${
              isDark ? 'bg-slate-800 text-slate-300' : 'bg-slate-100 text-slate-700 border border-slate-200'
            }`}>
              ข้อมูลผู้กรอกเก็บแยก และเปิดดูมีบันทึก audit
            </span>
          </div>
          <div className="flex gap-2">
            <input
              type="email"
              value={inviteEmail}
              onChange={event => setInviteEmail(event.target.value)}
              placeholder="อีเมลผู้ดูแลที่เชิญ"
              className={`min-w-0 px-3 py-2 rounded-xl text-xs border ${
                isDark ? 'bg-slate-950 border-slate-700 text-white' : 'bg-slate-50 border-slate-300 text-slate-900 placeholder-slate-400'
              }`}
            />
            <button
              type="button"
              disabled={!inviteEmail.trim()}
              onClick={handleInvite}
              className="px-3 py-2 rounded-xl bg-sky-600 hover:bg-sky-500 disabled:opacity-50 text-white text-xs font-bold transition-all cursor-pointer"
            >
              เชิญแอดมิน
            </button>
          </div>
          <div className={`lg:col-span-2 flex flex-wrap gap-2 border-t pt-3 ${
            isDark ? 'border-slate-800' : 'border-slate-200'
          }`}>
            {adminMembers.map(member => (
              <div key={member.user_id} className={`flex items-center gap-2 px-3 py-2 rounded-xl text-xs border ${
                isDark ? 'bg-slate-950 border-transparent text-slate-300' : 'bg-slate-100 border-slate-200 text-slate-800'
              }`}>
                <span className={member.active ? (isDark ? 'text-emerald-300 font-semibold' : 'text-emerald-700 font-semibold') : 'text-slate-400'}>
                  {member.email} · {member.active ? 'active' : 'ถอนสิทธิ์แล้ว'}
                </span>
                {member.active && member.user_id !== session?.user?.id && (
                  <button
                    type="button"
                    onClick={() => handleDeactivate(member)}
                    className="text-rose-500 hover:text-rose-700 font-semibold ml-1 cursor-pointer"
                  >
                    ถอนสิทธิ์
                  </button>
                )}
              </div>
            ))}
          </div>
        </section>

        {contactRemovalRequests.length > 0 && (
          <section className={`space-y-3 border rounded-2xl p-4 shadow-xs transition-colors ${
            isDark ? 'bg-slate-900/80 border-amber-800/60 text-slate-100' : 'bg-amber-50/50 border-amber-300 text-slate-800'
          }`}>
            <div className="flex items-center justify-between gap-3">
              <h2 className="text-sm font-bold text-amber-700">คำขอลบข้อมูลติดต่อ ({contactRemovalRequests.length})</h2>
              <span className={`text-[11px] ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>ลบเฉพาะตารางข้อมูลติดต่อ ไม่ลบผลตรวจหรือรูป</span>
            </div>
            <div className="grid gap-2">
              {contactRemovalRequests.map(request => (
                <article key={request.id} className={`flex flex-wrap items-center justify-between gap-3 rounded-xl p-3 border ${
                  isDark ? 'bg-slate-950/70 border-slate-800' : 'bg-white border-slate-200'
                }`}>
                  <div className="min-w-0 text-xs">
                    <p className={`font-mono font-bold ${isDark ? 'text-slate-100' : 'text-slate-900'}`}>{request.sample_code}</p>
                    <p className={`mt-1 break-words ${isDark ? 'text-slate-300' : 'text-slate-600'}`}>{request.reason}</p>
                    <p className={`mt-1 text-[10px] ${isDark ? 'text-slate-500' : 'text-slate-400'}`}>{new Date(request.created_at).toLocaleString('th-TH')}</p>
                  </div>
                  <button type="button" onClick={() => handleResolveContactRemoval(request)} className="rounded-lg bg-amber-600 px-3 py-2 text-xs font-bold text-white hover:bg-amber-700 cursor-pointer">
                    ลบข้อมูลติดต่อและปิดคำขอ
                  </button>
                </article>
              ))}
            </div>
          </section>
        )}

        {/* Tab Navigation & Search Toolbar */}
        <div className={`flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 border rounded-2xl p-3 shadow-xs transition-colors ${
          isDark ? 'bg-slate-900/80 border-slate-800' : 'bg-white border-slate-200'
        }`}>
          {/* Tabs */}
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 sm:pb-0">
            <button
              type="button"
              onClick={() => setActiveTab('samples')}
              className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
                activeTab === 'samples'
                  ? 'bg-[#A6192E] text-white shadow-xs'
                  : isDark
                    ? 'text-slate-400 hover:text-slate-200 hover:bg-slate-800'
                    : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
              }`}
            >
              <Activity size={14} />
              <span>จัดการผลตรวจน้ำ ({submissions.length})</span>
            </button>

            <button
              type="button"
              onClick={() => setActiveTab('database')}
              className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
                activeTab === 'database'
                  ? 'bg-sky-600 text-white shadow-xs'
                  : isDark
                    ? 'text-slate-400 hover:text-slate-200 hover:bg-slate-800'
                    : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
              }`}
            >
              <Database size={14} />
              <span>ฐานข้อมูล Supabase</span>
            </button>
          </div>

          {/* Quick Action Buttons */}
          <div className="flex items-center gap-2 justify-end">
            <button
              type="button"
              onClick={refreshData}
              disabled={isSyncing}
              className={`px-3 py-1.5 rounded-xl text-xs font-semibold flex items-center gap-1.5 border transition-all cursor-pointer disabled:opacity-50 ${
                isDark
                  ? 'bg-slate-800 hover:bg-slate-700 text-slate-300 border-slate-700'
                  : 'bg-slate-100 hover:bg-slate-200 text-slate-700 border-slate-200'
              }`}
              title="ดึงข้อมูลล่าสุด"
            >
              <RefreshCw size={13} className={isSyncing ? 'animate-spin' : ''} />
              <span className="hidden sm:inline">รีเฟรชข้อมูล</span>
            </button>

            <button
              type="button"
              onClick={() => downloadWaterWatchCSV(filteredSubmissions)}
              className="px-3 py-1.5 rounded-xl bg-[#176756] hover:bg-[#125345] text-white text-xs font-semibold flex items-center gap-1.5 cursor-pointer shadow-xs transition-all"
              title="ส่งออก CSV ของรายการที่กรองไว้"
            >
              <Download size={13} />
              <span>ส่งออก CSV</span>
            </button>
          </div>
        </div>

        {/* TAB 1: SAMPLES MANAGEMENT TABLE */}
        {activeTab === 'samples' && (
          <div className="space-y-4">
            {/* Filter & Search Bar */}
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
              {/* Search */}
              <div className="relative flex-1">
                <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="ค้นหารหัสตัวอย่างหรือชื่อจุดตรวจ..."
                  className={`w-full pl-10 pr-4 py-2 border rounded-xl text-xs focus:outline-none transition-colors ${
                    isDark
                      ? 'bg-slate-900 border-slate-800 text-white placeholder-slate-500 focus:border-[#B4975A]'
                      : 'bg-white border-slate-300 text-slate-900 placeholder-slate-400 focus:border-[#A6192E]'
                  }`}
                />
              </div>

              {/* Status Filter */}
              <div className="flex items-center gap-2 flex-wrap">
                <select
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value)}
                  className={`px-3 py-2 border rounded-xl text-xs focus:outline-none transition-colors ${
                    isDark ? 'bg-slate-900 border-slate-800 text-slate-200' : 'bg-white border-slate-300 text-slate-800'
                  }`}
                >
                  <option value="all">ทุกระดับสารหนู</option>
                  <option value="normal">เฉพาะค่าปกติ (&lt; 5 ppb)</option>
                  <option value="watch">เฉพาะเฝ้าระวัง (5-10 ppb)</option>
                  <option value="critical">เฉพาะเกินเกณฑ์ (&gt; 10 ppb)</option>
                </select>

                <select
                  value={photoFilter}
                  onChange={(e) => setPhotoFilter(e.target.value)}
                  className={`px-3 py-2 border rounded-xl text-xs focus:outline-none transition-colors ${
                    isDark ? 'bg-slate-900 border-slate-800 text-slate-200' : 'bg-white border-slate-300 text-slate-800'
                  }`}
                >
                  <option value="all">ทุกรายการภาพ</option>
                  <option value="with-photo">มีภาพถ่ายแนบ</option>
                  <option value="no-photo">ไม่มีภาพ</option>
                </select>

                <select
                  value={reviewStatus}
                  onChange={(e) => setReviewStatus(e.target.value)}
                  className={`px-3 py-2 border rounded-xl text-xs focus:outline-none transition-colors ${
                    isDark ? 'bg-slate-900 border-slate-800 text-slate-200' : 'bg-white border-slate-300 text-slate-800'
                  }`}
                >
                  <option value="all">ทุกสถานะเผยแพร่</option>
                  <option value="pending_review">รอตรวจสอบ</option>
                  <option value="auto_published">เผยแพร่อัตโนมัติ (≤ 50 ppb)</option>
                  <option value="approved">อนุมัติแล้ว</option>
                  <option value="rejected">ปฏิเสธ</option>
                  <option value="withdrawn">ถอนเผยแพร่</option>
                </select>

                <label className={`flex items-center gap-1 text-[10px] ${isDark ? 'text-slate-400' : 'text-slate-600'}`}>
                  ตั้งแต่
                  <input
                    type="date"
                    value={dateFrom}
                    onChange={event => setDateFrom(event.target.value)}
                    className={`px-2 py-2 rounded-lg border text-xs ${
                      isDark ? 'bg-slate-900 border-slate-800 text-slate-200' : 'bg-white border-slate-300 text-slate-800'
                    }`}
                  />
                </label>

                <label className={`flex items-center gap-1 text-[10px] ${isDark ? 'text-slate-400' : 'text-slate-600'}`}>
                  ถึง
                  <input
                    type="date"
                    value={dateTo}
                    onChange={event => setDateTo(event.target.value)}
                    className={`px-2 py-2 rounded-lg border text-xs ${
                      isDark ? 'bg-slate-900 border-slate-800 text-slate-200' : 'bg-white border-slate-300 text-slate-800'
                    }`}
                  />
                </label>
              </div>
            </div>

            {/* Table Container */}
            <div className={`border rounded-2xl overflow-hidden shadow-xs transition-colors ${
              isDark ? 'bg-slate-900/90 border-slate-800' : 'bg-white border-slate-200'
            }`}>
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className={`text-[11px] uppercase tracking-wider border-b ${
                    isDark ? 'bg-slate-800/80 text-slate-400 border-slate-700/60' : 'bg-slate-100/90 text-slate-600 border-slate-200'
                  }`}>
                    <tr>
                      <th className="py-3 px-4">รหัส / สถานี</th>
                      <th className="py-3 px-4">พิกัด GPS</th>
                      <th className="py-3 px-4">วัน-เวลาตรวจวัด</th>
                      <th className="py-3 px-4">สารหนู (ppb)</th>
                      <th className="py-3 px-4">ภาพถ่าย</th>
                      <th className="py-3 px-4">ผู้ตรวจวัด</th>
                      <th className="py-3 px-4">สถานะ</th>
                      <th className="py-3 px-4 text-right">การจัดการ</th>
                    </tr>
                  </thead>
                  <tbody className={`divide-y ${isDark ? 'divide-slate-800/60' : 'divide-slate-100'}`}>
                    {filteredSubmissions.length === 0 ? (
                      <tr>
                        <td colSpan="8" className={`py-12 text-center ${isDark ? 'text-slate-500' : 'text-slate-400'}`}>
                          ไม่พบข้อมูลผลตรวจวัดตามเงื่อนไขที่ค้นหา
                        </td>
                      </tr>
                    ) : (
                      filteredSubmissions.map((sub) => {
                        const ppb = sub.measurements?.arsenic?.value ?? sub.arsenic_ppb ?? sub.arsenic_level_ppb ?? null;
                        const levelConfig = getArsenicLevelConfig(ppb);
                        const hasImg = sub.images && sub.images.length > 0;
                        const photoUrl = hasImg ? (sub.images[0].url || sub.images[0]) : null;

                        return (
                          <tr
                            key={sub.record_id || sub.sample_code}
                            className={`transition-colors ${isDark ? 'hover:bg-slate-800/40' : 'hover:bg-slate-50/80'}`}
                          >
                            {/* Code / Station */}
                            <td className="py-3.5 px-4">
                              <div className={`font-bold font-mono ${isDark ? 'text-white' : 'text-slate-900'}`}>
                                {typeof sub.sample_code === 'object' && sub.sample_code !== null
                                  ? (sub.sample_code.code || sub.sample_code.id || '')
                                  : (sub.sample_code ?? '')}
                              </div>
                              <div className={`text-[11px] truncate max-w-[180px] ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
                                {typeof sub.station_name === 'object' && sub.station_name !== null
                                  ? (sub.station_name.name || sub.station_name.th || 'จุดตรวจวัดริมแม่น้ำกก')
                                  : (sub.station_name || 'จุดตรวจวัดริมแม่น้ำกก')}
                              </div>
                            </td>

                            {/* GPS Coordinates */}
                            <td className={`py-3.5 px-4 font-mono text-[11px] ${isDark ? 'text-slate-400' : 'text-slate-600'}`}>
                              {sub.coordinates
                                ? `${Number(sub.coordinates[1]).toFixed(4)}, ${Number(sub.coordinates[0]).toFixed(4)}`
                                : '—'}
                            </td>

                            {/* Date */}
                            <td className={`py-3.5 px-4 ${isDark ? 'text-slate-300' : 'text-slate-700'}`}>
                              {sub.collection_time ? new Date(sub.collection_time).toLocaleDateString('th-TH', {
                                day: 'numeric',
                                month: 'short',
                                year: '2-digit',
                                hour: '2-digit',
                                minute: '2-digit'
                              }) : '—'}
                            </td>

                            {/* Arsenic ppb */}
                            <td className="py-3.5 px-4">
                              {ppb !== null ? (
                                <span
                                  className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-bold"
                                  style={{
                                    backgroundColor: levelConfig.color,
                                    color: Number(ppb) > 30 ? '#fff' : '#1e293b',
                                    border: `1px solid ${levelConfig.borderColor}`
                                  }}
                                >
                                  {ppb} ppb
                                </span>
                              ) : (
                                <span className={isDark ? 'text-slate-500' : 'text-slate-400'}>—</span>
                              )}
                            </td>

                            {/* Photo Thumbnail */}
                            <td className="py-3.5 px-4">
                              {hasImg ? (
                                <button
                                  type="button"
                                  onClick={() => setPreviewPhoto(photoUrl)}
                                  className={`relative group w-10 h-10 rounded-lg overflow-hidden border transition-all cursor-pointer ${
                                    isDark ? 'border-slate-700 hover:border-[#B4975A]' : 'border-slate-300 hover:border-[#A6192E]'
                                  }`}
                                  title="คลิกดูภาพขยาย"
                                >
                                  <img
                                    src={photoUrl}
                                    alt="หลักฐาน"
                                    className="w-full h-full object-cover group-hover:scale-110 transition-transform"
                                  />
                                  <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 flex items-center justify-center text-white transition-opacity">
                                    <Maximize2 size={12} />
                                  </div>
                                </button>
                              ) : (
                                <span className={`text-[11px] ${isDark ? 'text-slate-600' : 'text-slate-400'}`}>ไม่มีภาพ</span>
                              )}
                            </td>

                            {/* Collector */}
                            <td className={`py-3.5 px-4 ${isDark ? 'text-slate-300' : 'text-slate-600'}`}>
                              ผู้ไม่เปิดเผยชื่อ
                            </td>

                            {/* Status */}
                            <td className="py-3.5 px-4">
                              <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                                sub.publication_status === 'pending_review'
                                  ? (isDark ? 'bg-amber-950 text-amber-300' : 'bg-amber-100 text-amber-800 border border-amber-200')
                                  : (isDark ? 'bg-slate-800 text-slate-300' : 'bg-emerald-50 text-emerald-800 border border-emerald-200')
                              }`}>
                                {({ pending_review: 'รอตรวจ', auto_published: 'เผยแพร่อัตโนมัติ', approved: 'อนุมัติแล้ว', rejected: 'ปฏิเสธ', withdrawn: 'ถอนเผยแพร่' })[sub.publication_status] || sub.publication_status}
                              </span>
                            </td>

                            {/* Actions */}
                            <td className="py-3.5 px-4 text-right">
                              <div className="flex items-center justify-end gap-1.5">
                                <button
                                  type="button"
                                  onClick={() => setSelectedSubmission(sub)}
                                  className={`p-1.5 rounded-lg transition-colors cursor-pointer ${
                                    isDark
                                      ? 'bg-slate-800 hover:bg-slate-700 text-slate-200'
                                      : 'bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-200'
                                  }`}
                                  title="ดูรายละเอียดครบถ้วน"
                                >
                                  <Info size={14} />
                                </button>
                                {sub.publication_status === 'pending_review' && (
                                  <>
                                    <button
                                      type="button"
                                      onClick={() => handleReview(sub, 'approve')}
                                      className="px-2 py-1 rounded bg-emerald-700 hover:bg-emerald-600 text-white text-[10px] font-bold cursor-pointer"
                                    >
                                      อนุมัติ
                                    </button>
                                    <button
                                      type="button"
                                      onClick={() => handleReview(sub, 'reject')}
                                      className="px-2 py-1 rounded bg-rose-800 hover:bg-rose-700 text-white text-[10px] font-bold cursor-pointer"
                                    >
                                      ปฏิเสธ
                                    </button>
                                  </>
                                )}
                              </div>
                            </td>
                          </tr>
                        );
                      })
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* TAB 2: SUPABASE DATABASE CONFIGURATION */}
        {activeTab === 'database' && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Database Connection Card */}
            <div className={`border rounded-2xl p-5 space-y-4 shadow-xs transition-colors ${
              isDark ? 'bg-slate-900/90 border-slate-800 text-slate-100' : 'bg-white border-slate-200 text-slate-800'
            }`}>
              <div className={`flex items-center gap-2.5 pb-3 border-b ${isDark ? 'border-slate-800' : 'border-slate-200'}`}>
                <Database className="w-5 h-5 text-sky-500" />
                <h2 className={`text-sm font-bold ${isDark ? 'text-white' : 'text-slate-900'}`}>สถานะการเชื่อมต่อ Supabase</h2>
              </div>

              <div className="space-y-3 text-xs">
                <div>
                  <span className={`block mb-1 ${isDark ? 'text-slate-400' : 'text-slate-500 font-medium'}`}>Project Endpoint URL:</span>
                  <div className={`p-2.5 rounded-xl border font-mono text-[11px] truncate ${
                    isDark ? 'bg-slate-950 border-slate-800 text-slate-200' : 'bg-slate-50 border-slate-200 text-slate-800'
                  }`}>
                    https://llwdhzvjofjyhlctzxda.supabase.co
                  </div>
                </div>

                <div>
                  <span className={`block mb-1 ${isDark ? 'text-slate-400' : 'text-slate-500 font-medium'}`}>Admin Auth & Membership:</span>
                  <div className={`p-2.5 rounded-xl border font-mono text-[11px] ${
                    isDark ? 'bg-slate-950 border-slate-800 text-slate-200' : 'bg-slate-50 border-slate-200 text-slate-800'
                  }`}>
                    Supabase Cloud Auth + public.kok_admin_memberships
                  </div>
                </div>

                <div>
                  <span className={`block mb-1 ${isDark ? 'text-slate-400' : 'text-slate-500 font-medium'}`}>Database Table:</span>
                  <div className="p-2.5 bg-emerald-50 text-emerald-800 rounded-xl border border-emerald-200 font-mono text-[11px]">
                    public.kok_water_samples
                  </div>
                </div>

                <div className="pt-2">
                  <button
                    type="button"
                    onClick={refreshData}
                    className="w-full py-2.5 px-4 rounded-xl bg-sky-600 hover:bg-sky-500 text-white font-bold text-xs flex items-center justify-center gap-2 cursor-pointer transition-all active:scale-98 shadow-md"
                  >
                    <RefreshCw size={14} />
                    <span>ทดสอบการเชื่อมต่อฐานข้อมูล</span>
                  </button>
                </div>

                {feedbackMsg && (
                  <div className={`p-3 rounded-xl border text-xs ${
                    isDark ? 'bg-slate-950 border-slate-700 text-slate-200' : 'bg-slate-50 border-slate-300 text-slate-800'
                  }`}>
                    {feedbackMsg}
                  </div>
                )}
              </div>
            </div>

            {/* Architecture & Guidelines Card */}
            <div className={`border rounded-2xl p-5 space-y-4 shadow-xs transition-colors ${
              isDark ? 'bg-slate-900/90 border-slate-800 text-slate-100' : 'bg-white border-slate-200 text-slate-800'
            }`}>
              <div className={`flex items-center gap-2.5 pb-3 border-b ${isDark ? 'border-slate-800' : 'border-slate-200'}`}>
                <Shield className="w-5 h-5 text-amber-500" />
                <h2 className={`text-sm font-bold ${isDark ? 'text-white' : 'text-slate-900'}`}>โครงสร้างข้อมูลและความปลอดภัย</h2>
              </div>

              <div className={`space-y-3 text-xs leading-relaxed ${isDark ? 'text-slate-300' : 'text-slate-600'}`}>
                <p>
                  <strong>ตารางฐานข้อมูลหลัก:</strong>{' '}
                  <code className={`px-1.5 py-0.5 rounded font-mono ${
                    isDark ? 'bg-slate-950 text-sky-300' : 'bg-slate-100 text-sky-800 border border-slate-200'
                  }`}>
                    kok_water_samples
                  </code>
                </p>
                <p>
                  ระบบเก็บพิกัด วันเวลา ค่าสารหนู (ppb) และหลักฐานภาพ โดยเน้นความถูกต้องและโปร่งใสของข้อมูลชุมชน
                </p>
                <div className={`p-3 rounded-xl border space-y-1.5 text-[11px] ${
                  isDark ? 'bg-slate-950 border-slate-800 text-slate-400' : 'bg-slate-50 border-slate-200 text-slate-600'
                }`}>
                  <div className="text-[#A6192E] font-bold">สิทธิ์การเข้าถึง (Row Level Security):</div>
                  <ul className="list-disc list-inside space-y-1">
                    <li>สาธารณะ: อ่านเฉพาะผลที่เผยแพร่ และบันทึกผลตรวจใหม่</li>
                    <li>ผู้ดูแลระบบ: ตรวจสอบหลักฐาน อนุมัติ/ปฏิเสธ พร้อมเหตุผล</li>
                    <li>ข้อมูลติดต่อผู้ตรวจแยกเก็บเพื่อปกป้องความเป็นส่วนตัว</li>
                  </ul>
                </div>
              </div>
            </div>
          </div>
        )}
      </main>

      {/* MODAL 1: PREVIEW PHOTO LIGHTBOX */}
      {previewPhoto && (
        <div
          className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-4"
          onClick={() => setPreviewPhoto(null)}
        >
          <div
            className={`relative max-w-3xl w-full rounded-2xl overflow-hidden border shadow-2xl transition-colors ${
              isDark ? 'bg-slate-900 border-slate-700' : 'bg-white border-slate-200'
            }`}
            onClick={e => e.stopPropagation()}
          >
            <div className={`flex items-center justify-between p-3 border-b ${isDark ? 'border-slate-800' : 'border-slate-200'}`}>
              <span className={`text-xs font-bold ${isDark ? 'text-white' : 'text-slate-900'}`}>ภาพถ่ายหลักฐานการตรวจวัด</span>
              <button
                type="button"
                onClick={() => setPreviewPhoto(null)}
                className={`p-1 rounded-lg cursor-pointer transition-colors ${
                  isDark ? 'text-slate-400 hover:text-white hover:bg-slate-800' : 'text-slate-400 hover:text-slate-700 hover:bg-slate-100'
                }`}
              >
                <X size={18} />
              </button>
            </div>
            <div className="p-2 bg-black flex items-center justify-center max-h-[75vh]">
              <img src={previewPhoto} alt="หลักฐาน" className="max-h-[70vh] object-contain rounded" />
            </div>
          </div>
        </div>
      )}

      {/* MODAL 2: SUBMISSION DETAIL MODAL */}
      {selectedSubmission && (
        <div
          className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4 font-['Prompt',sans-serif]"
          onClick={() => setSelectedSubmission(null)}
        >
          <div
            className={`w-full max-w-lg border rounded-3xl p-5 sm:p-6 shadow-2xl space-y-4 max-h-[88vh] overflow-y-auto transition-colors ${
              isDark ? 'bg-slate-900 border-slate-800 text-slate-200' : 'bg-white border-slate-200 text-slate-800'
            }`}
            onClick={e => e.stopPropagation()}
          >
            <div className={`flex items-center justify-between border-b pb-3 ${isDark ? 'border-slate-800' : 'border-slate-200'}`}>
              <div>
                <span className={`text-[10px] font-bold uppercase tracking-wider font-mono ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
                  {typeof selectedSubmission.sample_code === 'object' && selectedSubmission.sample_code !== null
                    ? (selectedSubmission.sample_code.code || selectedSubmission.sample_code.id || '')
                    : (selectedSubmission.sample_code ?? '')}
                </span>
                <h3 className={`text-base font-bold ${isDark ? 'text-white' : 'text-slate-900'}`}>
                  {typeof selectedSubmission.station_name === 'object' && selectedSubmission.station_name !== null
                    ? (selectedSubmission.station_name.name || selectedSubmission.station_name.th || 'จุดตรวจวัดแม่น้ำกก')
                    : (selectedSubmission.station_name || 'จุดตรวจวัดแม่น้ำกก')}
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setSelectedSubmission(null)}
                className={`p-1.5 rounded-xl cursor-pointer transition-colors ${
                  isDark ? 'text-slate-400 hover:text-white hover:bg-slate-800' : 'text-slate-400 hover:text-slate-700 hover:bg-slate-100'
                }`}
              >
                <X size={18} />
              </button>
            </div>

            {/* Information Grid */}
            <div className="grid grid-cols-2 gap-3 text-xs">
              <div className={`p-3 rounded-xl border ${isDark ? 'bg-slate-950 border-slate-800' : 'bg-slate-50 border-slate-200'}`}>
                <span className={`block mb-1 ${isDark ? 'text-slate-400' : 'text-slate-500 font-medium'}`}>ค่าสารหนู (ppb)</span>
                <span className="text-lg font-bold text-[#A6192E]">
                  {selectedSubmission.measurements?.arsenic?.value ?? selectedSubmission.arsenic_ppb ?? '—'} ppb
                </span>
              </div>

              <div className={`p-3 rounded-xl border ${isDark ? 'bg-slate-950 border-slate-800' : 'bg-slate-50 border-slate-200'}`}>
                <span className={`block mb-1 ${isDark ? 'text-slate-400' : 'text-slate-500 font-medium'}`}>สถานะระบบ</span>
                <span className="text-sm font-bold text-emerald-600">
                  {selectedSubmission.publication_status || '—'} · revision {selectedSubmission.revision}
                </span>
              </div>

              <div className={`p-3 rounded-xl border col-span-2 ${isDark ? 'bg-slate-950 border-slate-800' : 'bg-slate-50 border-slate-200'}`}>
                <span className={`block mb-1 ${isDark ? 'text-slate-400' : 'text-slate-500 font-medium'}`}>พิกัด GPS</span>
                <span className={`font-mono text-xs ${isDark ? 'text-white' : 'text-slate-800'}`}>
                  ละติจูด: {selectedSubmission.coordinates?.[1]} , ลองจิจูด: {selectedSubmission.coordinates?.[0]}
                </span>
              </div>

              <div className={`p-3 rounded-xl border ${isDark ? 'bg-slate-950 border-slate-800' : 'bg-slate-50 border-slate-200'}`}>
                <span className={`block mb-1 ${isDark ? 'text-slate-400' : 'text-slate-500 font-medium'}`}>วัน-เวลาเก็บตัวอย่าง</span>
                <span className={`text-xs ${isDark ? 'text-white' : 'text-slate-800'}`}>
                  {selectedSubmission.collection_time ? new Date(selectedSubmission.collection_time).toLocaleString('th-TH') : '—'}
                </span>
              </div>

              <div className={`p-3 rounded-xl border ${isDark ? 'bg-slate-950 border-slate-800' : 'bg-slate-50 border-slate-200'}`}>
                <span className={`block mb-1 ${isDark ? 'text-slate-400' : 'text-slate-500 font-medium'}`}>ผู้บันทึกผล</span>
                <span className={`text-xs ${isDark ? 'text-white' : 'text-slate-800'}`}>
                  ผู้ไม่เปิดเผยชื่อในข้อมูลสาธารณะ
                </span>
                <button
                  type="button"
                  disabled={contactLoading}
                  onClick={() => handleShowContact(selectedSubmission)}
                  className={`mt-2 block px-3 py-1.5 rounded-lg text-[11px] font-semibold border transition-all ${
                    isDark
                      ? 'bg-slate-800 hover:bg-slate-700 text-sky-200 border-slate-700'
                      : 'bg-sky-50 hover:bg-sky-100 text-sky-700 border-sky-200'
                  } disabled:opacity-50 cursor-pointer`}
                >
                  {contactLoading ? 'กำลังตรวจสอบ...' : 'เปิดข้อมูลติดต่อ (บันทึก audit)'}
                </button>
                {selectedContact && (
                  <div className="mt-2 text-[11px] text-amber-800 bg-amber-50 p-2 rounded-lg border border-amber-200">
                    ชื่อ: {selectedContact.name || '—'} · โทร: {selectedContact.phone || '—'}
                  </div>
                )}
              </div>
            </div>

            {/* Photos */}
            {selectedSubmission.images && selectedSubmission.images.length > 0 && (
              <div>
                <span className={`text-xs font-bold block mb-2 ${isDark ? 'text-slate-300' : 'text-slate-700'}`}>
                  ภาพถ่ายแนบ ({selectedSubmission.images.length})
                </span>
                <div className="flex gap-2 overflow-x-auto">
                  {selectedSubmission.images.map((img, idx) => {
                    const u = img.url || img;
                    return (
                      <img
                        key={idx}
                        src={u}
                        alt="หลักฐาน"
                        onClick={() => setPreviewPhoto(u)}
                        className={`w-20 h-20 rounded-xl object-cover border transition-all cursor-pointer ${
                          isDark ? 'border-slate-700 hover:border-amber-400' : 'border-slate-300 hover:border-[#A6192E]'
                        }`}
                      />
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        </div>
      )}

    </div>
  );
}
