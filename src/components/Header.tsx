'use client';

import React, { useState, useEffect } from 'react';
import { Menu, X } from 'lucide-react';
import { formatLocalizedDate, formatLocalizedTime, getTimezoneAbbr } from '@/utils/i18n';

interface HeaderProps {
  title?: string;
  onRefresh?: () => void;
  isRefreshing?: boolean;
  onLogout?: () => void;
  isBurgerOpen: boolean;
  onToggleBurger: () => void;
  onOpenActivityLogs?: () => void;
  activityCount?: number;
  language?: string;
  timezone?: string;
}

export const Header: React.FC<HeaderProps> = ({ 
  title = 'Dashboard',
  isBurgerOpen,
  onToggleBurger,
  language = 'English',
  timezone = 'Asia/Manila',
  onRefresh,
  isRefreshing = false,
}) => {
  const [currentTime, setCurrentTime] = useState<string>('');
  const [currentDate, setCurrentDate] = useState<string>('');
  const [tzAbbr, setTzAbbr] = useState<string>('PST');

  useEffect(() => {
    const updateDateTime = () => {
      const now = new Date();
      setCurrentDate(formatLocalizedDate(now, language, timezone, 'short'));
      setCurrentTime(formatLocalizedTime(now, language, timezone));
      setTzAbbr(getTimezoneAbbr(timezone));
    };

    updateDateTime();
    const timer = setInterval(updateDateTime, 1000);
    return () => clearInterval(timer);
  }, [language, timezone]);

  return (
    <header className="shrink-0 z-30 w-full border-b border-zinc-200 bg-white transition-colors" style={{ fontFamily: 'Arial, Helvetica, sans-serif' }}>
      {/* Full width container spanning left corner to right corner on Desktop and TV */}
      <div className="w-full px-4 sm:px-6 lg:px-8">
        <div className="flex h-[72px] items-center justify-between gap-4">
          {/* LEFT CORNER: Provided Logo & Exact Branding + Auto-removing Menu Icon */}
          <div className="flex items-center gap-3 sm:gap-4">
            {/* Menu Bar Icon: Auto-removed from display when navigation sidebar is open */}
            {!isBurgerOpen && (
              <button
                type="button"
                onClick={onToggleBurger}
                title="Open navigation menu"
                aria-label="Open navigation menu"
                className="h-10 w-10 rounded-2xl border border-slate-200/90 bg-white hover:bg-slate-50 flex items-center justify-center text-slate-600 shadow-2xs transition-all cursor-pointer shrink-0 animate-in fade-in duration-150"
              >
                <div className="flex flex-col gap-[3.5px] w-4">
                  <span className="h-[2px] w-full bg-[#334155] rounded-full" />
                  <span className="h-[2px] w-full bg-[#334155] rounded-full" />
                  <span className="h-[2px] w-full bg-[#334155] rounded-full" />
                </div>
              </button>
            )}

            {/* Header Title: Dynamic (DASHBOARD / RECEIVER) */}
            <div className="flex flex-col justify-center">
              <h1 className="text-base sm:text-lg font-bold tracking-tight text-zinc-900 leading-tight">
                {title}
              </h1>
            </div>
          </div>

          {/* RIGHT CORNER: Live Realtime Date & Time + Telemetry Sync Button */}
          <div className="flex items-center gap-2 sm:gap-3">


            {/* Live Realtime Date & Time (Clean, Text-Only) */}
            <div className="flex flex-col text-right justify-center">
              <div className="flex items-center justify-end gap-1.5">
                <span className="font-mono text-xs sm:text-sm font-bold text-zinc-900 tracking-tight leading-none" suppressHydrationWarning>
                  {currentTime || '--:--:-- --'}
                </span>
                <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-slate-100 text-slate-600 border border-slate-200">
                  {tzAbbr}
                </span>
              </div>
              <span className="text-[11px] sm:text-xs font-medium text-zinc-500 leading-tight mt-1" suppressHydrationWarning>
                {currentDate || '---------'}
              </span>
            </div>
          </div>
        </div>
      </div>
    </header>
  );
};


