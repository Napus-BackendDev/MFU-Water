import React from 'react';
import { RotateCcw, AlertTriangle, RefreshCw } from 'lucide-react';

export default class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    console.error('ErrorBoundary caught:', error, errorInfo);
  }

  handleReset = () => {
    try {
      localStorage.removeItem('kok_water_watch_submissions_v2');
      localStorage.removeItem('kok_water_watch_submissions');
      localStorage.removeItem('kok_water_watch_stations');
    } catch (e) {}
    window.location.reload();
  };

  render() {
    if (this.state.hasError) {
      return (
        <div className="w-screen h-screen flex items-center justify-center bg-[#F8F7F5] p-4 font-['Prompt',sans-serif] text-slate-800">
          <div className="max-w-md w-full bg-white rounded-3xl p-6 sm:p-8 shadow-2xl border-2 border-rose-200 text-center space-y-4">
            <div className="w-14 h-14 mx-auto rounded-2xl bg-rose-100 flex items-center justify-center text-[#A6192E]">
              <AlertTriangle className="w-8 h-8" />
            </div>
            <div>
              <h2 className="text-base sm:text-lg font-bold text-slate-900">ระบบตรวจพบข้อผิดพลาดชั่วคราว</h2>
              <p className="text-xs text-slate-500 mt-1">
                {this.state.error?.message || 'ข้อมูลแคชในเบราว์เซอร์อาจไม่เข้ากับระบบเวอร์ชันใหม่'}
              </p>
            </div>
            <div className="flex gap-2.5 justify-center pt-2">
              <button
                type="button"
                onClick={this.handleReset}
                className="px-4 py-2.5 rounded-xl bg-[#A6192E] hover:bg-[#851424] text-white font-bold text-xs transition-all flex items-center gap-1.5 shadow-md cursor-pointer"
              >
                <RotateCcw className="w-4 h-4" />
                <span>ล้างแคชและเริ่มใหม่</span>
              </button>
              <button
                type="button"
                onClick={() => window.location.reload()}
                className="px-4 py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs transition-all flex items-center gap-1.5 cursor-pointer"
              >
                <RefreshCw className="w-4 h-4" />
                <span>โหลดหน้าใหม่</span>
              </button>
            </div>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}
