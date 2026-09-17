'use client';

import React, { useState, useEffect } from 'react';
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
    <header className="shrink-0 z-30 w-full border-b border-slate-200 bg-white shadow-2xs" style={{ fontFamily: 'Arial, Helvetica, sans-serif' }}>
      <div className="w-full px-4 sm:px-6">
        <div className="flex h-16 items-center justify-between gap-4">
          {/* LEFT CORNER: Burger toggle & Header title */}
          <div className="flex items-center gap-3">
            {!isBurgerOpen && (
              <button
                type="button"
                onClick={onToggleBurger}
                title="Open navigation menu"
                aria-label="Open navigation menu"
                className="h-10 w-10 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 flex items-center justify-center text-slate-700 shadow-2xs transition-all cursor-pointer shrink-0 animate-in fade-in duration-150"
              >
                <div className="flex flex-col gap-[3.5px] w-4">
                  <span className="h-[2px] w-full bg-slate-800 rounded-full" />
                  <span className="h-[2px] w-full bg-slate-800 rounded-full" />
                  <span className="h-[2px] w-full bg-slate-800 rounded-full" />
                </div>
              </button>
            )}

            <div className="flex flex-col justify-center">
              <h1 className="text-lg sm:text-xl font-bold tracking-tight text-slate-900 leading-tight">
                {title}
              </h1>
            </div>
          </div>

          {/* RIGHT CORNER: Realtime clock */}
          <div className="flex items-center gap-3">
            <div className="flex flex-col text-right justify-center">
              <div className="flex items-center justify-end gap-1.5">
                <span className="text-xs sm:text-sm font-medium text-slate-800 tracking-tight leading-none" suppressHydrationWarning>
                  {currentTime || '--:--:-- --'}
                </span>
                <span className="px-1.5 py-0.5 rounded text-[9px] font-semibold bg-slate-100 text-slate-500 border border-slate-200">
                  {tzAbbr}
                </span>
              </div>
              <span className="text-[11px] font-normal text-slate-500 leading-tight mt-0.5" suppressHydrationWarning>
                {currentDate || '---------'}
              </span>
            </div>
          </div>
        </div>
      </div>
    </header>
  );
};
