import React, { lazy, Suspense, useEffect, useState } from 'react';
import ErrorBoundary from './components/ErrorBoundary';
import WaterWatch from './components/KokWaterWatch/KokWaterWatchView';
import { routeFromHash } from './lib/pageRecovery.js';
const Analysis = lazy(() => import('./components/GeeWaterAnalysisView'));
const Admin = lazy(() => import('./components/Admin/AdminPortalView'));
const GoogleMaps = lazy(() => import('./components/GoogleMaps3DView'));

const readRoute = () => routeFromHash(window.location.hash);
export default function AppRoutes() {
  const [route, setRoute] = useState(readRoute);
  useEffect(() => {
    const changed = () => setRoute(readRoute());
    window.addEventListener('hashchange', changed);
    return () => window.removeEventListener('hashchange', changed);
  }, []);
  const openWater = () => { window.location.hash = '#water-watch'; setRoute('water'); };
  const openAdmin = () => { window.location.hash = '#admin'; setRoute('admin'); };
  return <ErrorBoundary><Suspense fallback={<div className="w-screen h-screen flex items-center justify-center bg-[#F8F7F5]" role="status">กำลังโหลด…</div>}>
    {route === 'analysis' ? <Analysis onOpenWaterWatch={openWater} onOpenAdmin={openAdmin}/> :
      route === 'admin' ? <Admin onBackToMap={openWater}/> :
      route === 'google' ? <GoogleMaps onBack={openWater} floodStage={0}/> :
      <WaterWatch onOpenAdmin={openAdmin}/>}
  </Suspense></ErrorBoundary>;
}
