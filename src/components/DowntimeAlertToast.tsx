'use client';

import React, { useEffect, useState } from 'react';
import { 
  WifiOff, 
  X, 
  MapPin, 
  ChevronRight
} from 'lucide-react';
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
  onLocateOnMap,
  onOpenDispatch,
  onStopAudio,
  autoDismissSec = 5,
}) => {
  const [secondsRemaining, setSecondsRemaining] = useState<number>(autoDismissSec);
  const [isPaused, setIsPaused] = useState<boolean>(false);

  useEffect(() => {
    if (!site) return;
    setSecondsRemaining(autoDismissSec);

    const interval = setInterval(() => {
      if (!isPaused) {
        setSecondsRemaining((prev) => Math.max(0, prev - 1));
      }
    }, 1000);

    return () => clearInterval(interval);
  }, [site, isPaused, autoDismissSec]);

  // Trigger onClose cleanly in useEffect when countdown reaches 0
  useEffect(() => {
    if (secondsRemaining === 0 && site) {
      onClose();
    }
  }, [secondsRemaining, site, onClose]);

  if (!site) return null;

  const isAllOffline = site.offlineCount === site.deviceCount && site.deviceCount > 0;
  const progressPercent = Math.max(0, Math.min(100, (secondsRemaining / autoDismissSec) * 100));

  const handleDismiss = () => {
    if (onStopAudio) onStopAudio();
    onClose();
  };

  const handleLocate = () => {
    if (onLocateOnMap && site) {
      onLocateOnMap(site);
    }
  };

  return (
    <aside 
      className="fixed top-5 left-1/2 -translate-x-1/2 z-[10000] w-[92vw] max-w-lg animate-in fade-in slide-in-from-top-4 duration-300 pointer-events-auto select-none"
      onMouseEnter={() => setIsPaused(true)}
      onMouseLeave={() => setIsPaused(false)}
      role="alert"
      aria-live="assertive"
    >
      <div className="relative overflow-hidden rounded-2xl bg-white border border-zinc-200 shadow-xl shadow-black/5 ring-1 ring-black/5 transition-all">
        {/* Main Content Area */}
        <div className="p-4 flex items-start gap-3.5">
          {/* Outage Badge Icon (Gray) */}
          <div className="relative shrink-0 mt-0.5">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-zinc-100 text-zinc-600 border border-zinc-200 shadow-2xs">
              <WifiOff className="h-5 w-5 text-zinc-600 stroke-[2.2]" />
            </div>
          </div>

          {/* Details */}
          <div className="flex-1 min-w-0">
            {/* Header: Outage Badge (ONLY RED) + Province (Gray) + Code (Gray) */}
            <div className="flex items-center gap-2 flex-wrap">
              <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[11px] font-semibold bg-rose-50 text-rose-700 border border-rose-200/80 tracking-wide">
                <span className="h-1.5 w-1.5 rounded-full bg-rose-500 animate-ping inline-block" />
                Outage Detected
              </span>
              <span className="text-xs text-zinc-500 font-medium truncate flex items-center gap-1">
                <MapPin className="h-3 w-3 text-zinc-400" />
                {site.province}
              </span>
              {site.code && (
                <span className="text-[11px] font-mono px-1.5 py-0.5 rounded bg-zinc-100 text-zinc-500 border border-zinc-200/60">
                  {site.code}
                </span>
              )}
            </div>

            {/* Site Name (Gray/Dark Neutral) */}
            <h3 
              className="mt-1.5 text-sm sm:text-base font-bold text-zinc-900 tracking-tight leading-snug truncate" 
              title={site.name}
            >
              {site.name}
            </h3>

            {/* Status Summary (Gray) & Locate Action (GREEN) */}
            <div className="mt-1.5 flex items-center justify-between gap-2 flex-wrap">
              <div className="flex items-center gap-2 text-xs text-zinc-600">
                <span className="font-semibold text-zinc-600">
                  {isAllOffline ? 'All Devices Offline' : 'Downtime Reported'}
                </span>
                <span className="text-zinc-300">•</span>
                <span className="text-zinc-500">
                  {site.offlineCount || site.deviceCount} / {site.deviceCount} offline
                </span>
              </div>

              {onLocateOnMap && (
                <button
                  type="button"
                  onClick={handleLocate}
                  className="inline-flex items-center gap-1 text-xs font-semibold text-[#237227] hover:text-[#1b5e20] hover:underline cursor-pointer transition-colors"
                >
                  <span>Locate on Map</span>
                  <ChevronRight className="h-3 w-3" />
                </button>
              )}
            </div>
          </div>

          {/* Right Controls: Timer (Gray) + Dismiss Button (Gray) */}
          <div className="flex flex-col items-end gap-2 shrink-0 pl-1">
            <button
              type="button"
              onClick={handleDismiss}
              className="h-7 w-7 rounded-lg text-zinc-400 hover:text-zinc-700 hover:bg-zinc-100 flex items-center justify-center transition-colors cursor-pointer"
              title="Dismiss notification"
            >
              <X className="h-4 w-4" />
            </button>
            <span className="text-[11px] font-mono text-zinc-400 pr-1">
              {secondsRemaining}s
            </span>
          </div>
        </div>

        {/* Smooth Auto-Dismiss Progress Bar (Gray) */}
        <div className="h-1 w-full bg-zinc-100 overflow-hidden">
          <div 
            className="h-full bg-zinc-400 transition-all duration-1000 ease-linear"
            style={{ width: `${progressPercent}%` }}
          />
        </div>
      </div>
    </aside>
  );
};
