'use client';

import React from 'react';
import { DashboardStats } from '@/types/dashboard';

interface TopStatsCardsProps {
  stats: DashboardStats;
  offlineSitesCount?: number;
  activeFilter?: 'All' | 'All Offline' | 'Offline' | 'Online';
  onSelectFilter?: (filter: 'All' | 'All Offline' | 'Offline' | 'Online') => void;
}

export const TopStatsCards: React.FC<TopStatsCardsProps> = ({ 
  stats, 
  offlineSitesCount = 0,
  activeFilter = 'All',
  onSelectFilter,
}) => {
  const items = [
    {
      id: 'All' as const,
      label: 'TOTAL PROJECTS',
      value: stats.totalProjects.toLocaleString(),
      badge: 'Region 10',
      badgeClass: 'bg-slate-100 text-slate-600 border border-slate-200/80',
      subtitle: '122 Received · 1 OJT Site',
      targetId: 'master-projects-table',
      sparkline: (
        <svg viewBox="0 0 104 36" className="w-26 sm:w-28 h-9 overflow-visible">
          <defs>
            <linearGradient id="spark-total" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#475569" stopOpacity="0.20" />
              <stop offset="100%" stopColor="#475569" stopOpacity="0.0" />
            </linearGradient>
          </defs>
          <path d="M 0 30 C 20 30, 36 20, 54 20 C 72 20, 84 8, 100 6 L 100 36 L 0 36 Z" fill="url(#spark-total)" />
          <path d="M 0 30 C 20 30, 36 20, 54 20 C 72 20, 84 8, 100 6" fill="none" stroke="#475569" strokeWidth="2.2" strokeLinecap="round" />
          <circle cx="100" cy="6" r="5" fill="#475569" fillOpacity="0.2" className="animate-pulse" />
          <circle cx="100" cy="6" r="2.5" fill="#475569" />
        </svg>
      ),
    },
    {
      id: 'Online' as const,
      label: 'ONLINE DEVICES',
      value: stats.devicesOnline.toLocaleString(),
      badge: 'Live',
      badgeClass: 'bg-emerald-50 text-[#237227] border border-emerald-200/80',
      subtitle: (stats.devicesOnline + stats.devicesOffline) > 0 
        ? `${(((stats.devicesOnline) / (stats.devicesOnline + stats.devicesOffline)) * 100).toFixed(1)}% telemetry active` 
        : 'Active cloud telemetry',
      targetId: 'master-projects-table',
      hasLivePulse: true,
      sparkline: (
        <svg viewBox="0 0 104 36" className="w-26 sm:w-28 h-9 overflow-visible">
          <defs>
            <linearGradient id="spark-online" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#237227" stopOpacity="0.22" />
              <stop offset="100%" stopColor="#237227" stopOpacity="0.0" />
            </linearGradient>
          </defs>
          <path d="M 0 28 C 18 28, 30 10, 50 16 C 70 22, 84 8, 100 6 L 100 36 L 0 36 Z" fill="url(#spark-online)" />
          <path d="M 0 28 C 18 28, 30 10, 50 16 C 70 22, 84 8, 100 6" fill="none" stroke="#237227" strokeWidth="2.2" strokeLinecap="round" />
          <circle cx="100" cy="6" r="5" fill="#237227" fillOpacity="0.25" className="animate-pulse" />
          <circle cx="100" cy="6" r="2.5" fill="#237227" />
        </svg>
      ),
    },
    {
      id: 'Offline' as const,
      label: 'OFFLINE DEVICES',
      value: stats.devicesOffline.toLocaleString(),
      badge: 'Triage',
      badgeClass: 'bg-amber-50 text-amber-800 border border-amber-200/80',
      subtitle: 'Field inspection queue',
      targetId: 'master-projects-table',
      sparkline: (
        <svg viewBox="0 0 104 36" className="w-26 sm:w-28 h-9 overflow-visible">
          <defs>
            <linearGradient id="spark-offline" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#f59e0b" stopOpacity="0.20" />
              <stop offset="100%" stopColor="#f59e0b" stopOpacity="0.0" />
            </linearGradient>
          </defs>
          <path d="M 0 16 C 20 16, 36 26, 56 26 C 74 26, 86 16, 100 12 L 100 36 L 0 36 Z" fill="url(#spark-offline)" />
          <path d="M 0 16 C 20 16, 36 26, 56 26 C 74 26, 86 16, 100 12" fill="none" stroke="#d97706" strokeWidth="2.2" strokeLinecap="round" />
          <circle cx="100" cy="12" r="5" fill="#d97706" fillOpacity="0.25" className="animate-pulse" />
          <circle cx="100" cy="12" r="2.5" fill="#d97706" />
        </svg>
      ),
    },
    {
      id: 'All Offline' as const,
      label: 'SITE DOWN LOGS',
      value: offlineSitesCount.toLocaleString(),
      badge: offlineSitesCount > 0 ? 'Alert' : 'Nominal',
      badgeClass: offlineSitesCount > 0 ? 'bg-rose-50 text-rose-800 border border-rose-200/80' : 'bg-slate-100 text-slate-600 border border-slate-200/80',
      subtitle: 'Recorded downtime events',
      targetId: 'site-down-activity-logs',
      sparkline: (
        <svg viewBox="0 0 104 36" className="w-26 sm:w-28 h-9 overflow-visible">
          <defs>
            <linearGradient id="spark-down" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#e11d48" stopOpacity="0.20" />
              <stop offset="100%" stopColor="#e11d48" stopOpacity="0.0" />
            </linearGradient>
          </defs>
          <path d="M 0 30 C 22 30, 36 20, 54 20 C 72 20, 84 10, 100 8 L 100 36 L 0 36 Z" fill="url(#spark-down)" />
          <path d="M 0 30 C 22 30, 36 20, 54 20 C 72 20, 84 10, 100 8" fill="none" stroke="#e11d48" strokeWidth="2.2" strokeLinecap="round" />
          <circle cx="100" cy="8" r="5" fill="#e11d48" fillOpacity="0.25" className="animate-pulse" />
          <circle cx="100" cy="8" r="2.5" fill="#e11d48" />
        </svg>
      ),
    },
  ];

  const handleCardClick = (id: 'All' | 'All Offline' | 'Offline' | 'Online', targetId: string) => {
    // Toggle back to All if clicking already active filter (except All itself)
    const newFilter = activeFilter === id && id !== 'All' ? 'All' : id;
    onSelectFilter?.(newFilter);

    // Smoothly scroll to the relevant section so the operator immediately sees the filtered data
    if (typeof window !== 'undefined') {
      const el = document.getElementById(targetId) || document.getElementById('master-projects-table');
      if (el) {
        el.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }
    }
  };

  return (
    <div 
      className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-5"
      style={{ fontFamily: 'Arial, Helvetica, sans-serif' }}
    >
      {items.map((item) => {
        const isActive = activeFilter === item.id;

        return (
          <div
            key={item.id}
            onClick={() => handleCardClick(item.id, item.targetId)}
            title={isActive ? 'Active filter — click to reset view' : `Click to filter by ${item.label}`}
            className={`group relative overflow-hidden rounded-2xl p-5 sm:p-6 transition-all duration-300 cursor-pointer select-none flex flex-col justify-between ${
              isActive
                ? 'bg-white border border-slate-400/90 shadow-[0_22px_44px_-12px_rgba(15,23,42,0.13),0_8px_20px_-6px_rgba(15,23,42,0.06)] ring-1 ring-slate-900/5 -translate-y-1'
                : 'bg-white border border-slate-200/80 shadow-[0_2px_8px_-2px_rgba(15,23,42,0.04),0_12px_24px_-8px_rgba(15,23,42,0.04)] hover:shadow-[0_20px_36px_-10px_rgba(15,23,42,0.08),0_6px_14px_-4px_rgba(15,23,42,0.03)] hover:border-slate-300 hover:-translate-y-1'
            }`}
          >
            {/* Top ambient sheen line */}
            <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-slate-200 to-transparent pointer-events-none" />

            {/* Top Row: Micro Category Label & Refined Status Badge */}
            <div className="flex items-center justify-between gap-2 mb-3">
              <span className="text-[11px] font-semibold text-slate-500 tracking-wider uppercase">
                {item.label}
              </span>
              <span className={`text-[10px] font-medium px-2.5 py-0.5 rounded-full flex items-center gap-1.5 shadow-xs transition-colors ${item.badgeClass}`}>
                {item.hasLivePulse && (
                  <span className="relative flex h-1.5 w-1.5">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
                    <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-[#237227]" />
                  </span>
                )}
                {item.badge}
              </span>
            </div>

            {/* Middle Row: Hero Metric + Elegant Alive Sparkline */}
            <div className="flex items-baseline justify-between gap-3 my-2">
              <span className="text-3xl sm:text-[38px] font-bold tracking-tight text-slate-900 tabular-nums leading-none">
                {item.value}
              </span>
              <div className="shrink-0 transition-transform duration-300 group-hover:scale-105">
                {item.sparkline}
              </div>
            </div>

            {/* Bottom Row: Context Subtitle & Interactive Micro Hint */}
            <div className="pt-3 mt-2.5 border-t border-slate-100 flex items-center justify-between text-xs">
              <span className="text-slate-500 font-medium text-[11px]">
                {item.subtitle}
              </span>
              {isActive && item.id !== 'All' ? (
                <span className="text-[10px] font-semibold text-slate-700 bg-slate-100 px-2 py-0.5 rounded-full">
                  Active
                </span>
              ) : (
                <span className="text-[11px] font-medium text-slate-400 group-hover:text-slate-700 transition-colors flex items-center gap-0.5">
                  Filter <span className="transition-transform group-hover:translate-x-0.5">→</span>
                </span>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
};



