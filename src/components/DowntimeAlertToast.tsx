'use client';

import React, { useEffect, useState, useRef } from 'react';
import { X, AlertTriangle } from 'lucide-react';
import { SiteInfrastructure } from '@/types/dashboard';

interface DowntimeAlertToastProps {
  site: SiteInfrastructure | null;
  onClose: () => void;
  onLocateOnMap?: (site: SiteInfrastructure) => void;
  onOpenDispatch?: (site: SiteInfrastructure) => void;
  onStopAudio?: () => void;
  autoDismissSec?: number;
}

export const DowntimeAlertToast: React.FC<DowntimeAlertToastProps> = ({
  site,
  onClose,
  onStopAudio,
  autoDismissSec = 8,
}) => {
  const onCloseRef = useRef(onClose);
  onCloseRef.current = onClose;

  const onStopAudioRef = useRef(onStopAudio);
  onStopAudioRef.current = onStopAudio;

  const activeSiteIdRef = useRef<string | null>(null);
  const startTimeRef = useRef<number>(0);
  const [remainingMs, setRemainingMs] = useState<number>(autoDismissSec * 1000);

  // Buttery-smooth, continuous 60FPS progress bar & non-stopping 8-second countdown
  useEffect(() => {
    if (!site) {
      activeSiteIdRef.current = null;
      return;
    }

    const totalMs = autoDismissSec * 1000;

    // Lock start timestamp when a new site outage triggers
    if (activeSiteIdRef.current !== site.id) {
      activeSiteIdRef.current = site.id;
      startTimeRef.current = Date.now();
      setRemainingMs(totalMs);
    }

    // High-frequency 30ms interval for fluid, continuous, uninterrupted progress bar animation
    const interval = setInterval(() => {
      const elapsed = Date.now() - startTimeRef.current;
      const leftMs = Math.max(0, totalMs - elapsed);

      setRemainingMs(leftMs);

      if (leftMs <= 0) {
        clearInterval(interval);
        if (onStopAudioRef.current) onStopAudioRef.current();
        onCloseRef.current();
      }
    }, 30);

    return () => clearInterval(interval);
  }, [site?.id, autoDismissSec]);

  if (!site) return null;

  const totalMs = autoDismissSec * 1000;
  const progressPercent = Math.max(0, Math.min(100, (remainingMs / totalMs) * 100));
  const secondsRemaining = Math.ceil(remainingMs / 1000);

  const handleDismiss = () => {
    if (onStopAudioRef.current) onStopAudioRef.current();
    onClose();
  };

  const locationText = site.municipality || site.province;

  return (
    <aside 
      className="fixed top-5 left-1/2 -translate-x-1/2 z-[10000] w-[92vw] max-w-sm animate-in fade-in slide-in-from-top-4 duration-300 pointer-events-auto select-none"
      role="alert"
      aria-live="assertive"
      style={{ fontFamily: 'Arial, Helvetica, sans-serif' }}
    >
      <div className="relative overflow-hidden rounded-2xl bg-white border border-slate-200 shadow-xl shadow-slate-900/10 transition-all">
        {/* Main Content Area - Solid Flat White Design (No Gradients) */}
        <div className="p-4 flex items-center gap-3.5 bg-white">
          {/* Caution Icon Container (Centered Vertically on the Left) */}
          <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-rose-50 text-rose-600 border border-rose-200/80 shrink-0 self-center shadow-2xs">
            <AlertTriangle className="h-6 w-6 stroke-[2.2] text-rose-600 animate-pulse" />
          </div>

          {/* Details Column: Header Badge -> Project Name -> Location */}
          <div className="flex-1 min-w-0 flex flex-col gap-0.5 pr-1">
            {/* Header Badge */}
            <div className="flex items-center gap-1.5">
              <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[10px] font-bold bg-rose-50 text-rose-700 border border-rose-200/80 uppercase tracking-wider">
                <span className="h-1.5 w-1.5 rounded-full bg-rose-600 animate-ping inline-block" />
                New site down detected
              </span>
            </div>

            {/* Project Name */}
            <h3 
              className="mt-1 text-sm sm:text-base font-bold text-slate-900 tracking-tight leading-snug truncate" 
              title={site.name}
            >
              {site.name}
            </h3>

            {/* Location */}
            <p className="text-xs font-medium text-slate-500 truncate">
              {locationText}
            </p>

            {/* Downtime */}
            <div className="flex items-center gap-1.5 mt-0.5">
              <span className="text-[11px] font-medium text-slate-500">Downtime:</span>
              <span className="text-[11px] font-bold text-rose-600">
                {site.downtimeDuration || 'Just now'}
              </span>
            </div>
          </div>

          {/* Right Controls: Timer Countdown + Dismiss Button */}
          <div className="flex flex-col items-end gap-2 shrink-0 pl-1">
            <button
              type="button"
              onClick={handleDismiss}
              className="h-6 w-6 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 flex items-center justify-center transition-colors cursor-pointer"
              title="Dismiss notification"
            >
              <X className="h-4 w-4" />
            </button>
            <span className="text-[9px] font-mono font-medium text-slate-400 select-none bg-slate-100 px-1 py-0.5 rounded border border-slate-200/70">
              {secondsRemaining}s
            </span>
          </div>
        </div>

        {/* 100% Continuous Fluid Progress Bar (No 1-Second Stepping / Pausing) */}
        <div className="h-1 w-full bg-slate-100 overflow-hidden">
          <div 
            className="h-full bg-rose-600 transition-all duration-75 ease-linear"
            style={{ width: `${progressPercent}%` }}
          />
        </div>
      </div>
    </aside>
  );
};
