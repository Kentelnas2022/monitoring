'use client';

import React from 'react';
import { 
  Users, 
  Wifi, 
  Clock, 
  WifiOff, 
  ArrowUpRight, 
  ArrowDownRight 
} from 'lucide-react';
import { DashboardStats } from '@/types/dashboard';

interface TopStatsCardsProps {
  stats: DashboardStats;
  offlineSitesCount?: number;
  activeFilter?: 'All' | 'All Offline' | 'Offline' | 'Online';
  onSelectFilter?: (filter: 'All' | 'All Offline' | 'Offline' | 'Online') => void;
}

export const TopStatsCards: React.FC<TopStatsCardsProps> = ({ 
  stats, 
  offlineSitesCount = 8,
  activeFilter = 'All',
  onSelectFilter,
}) => {
  return (
    <div 
      className="grid grid-cols-2 lg:grid-cols-4 gap-2 sm:gap-2.5" 
      style={{ fontFamily: 'Arial, Helvetica, sans-serif' }}
    >
      {/* CARD 1: TOTAL PROJECTS */}
      <div 
        onClick={() => onSelectFilter?.('All')}
        title="Click to view All Projects in table"
        className={`rounded-xl border bg-white px-3 py-2 transition-all flex items-center gap-2.5 cursor-pointer select-none ${
          activeFilter === 'All'
            ? 'border-zinc-300 ring-2 ring-zinc-200/80 shadow-xs'
            : 'border-zinc-200/80 hover:border-zinc-300 hover:shadow-xs shadow-2xs'
        }`}
      >
        <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-[#eaf5eb] text-[#237227] shrink-0">
          <Users className="h-4 w-4" />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between gap-1">
            <span className="text-xl font-extrabold text-zinc-900 tracking-tight leading-none">
              {stats.totalProjects.toLocaleString()}
            </span>
            <span className="inline-flex items-center gap-0.5 rounded-full bg-[#ecf7ed] px-1.5 py-0.5 text-[10px] font-bold text-[#237227] border border-emerald-200/60 shrink-0">
              <ArrowUpRight className="h-2.5 w-2.5" />
              <span>+12%</span>
            </span>
          </div>
          <div className="text-[11px] font-bold text-zinc-700 leading-tight truncate">Total Projects</div>
          <div className="text-[10px] text-zinc-400 leading-tight truncate">Registered facilities</div>
        </div>
      </div>

      {/* CARD 2: ONLINE DEVICES */}
      <div 
        onClick={() => onSelectFilter?.('Online')}
        title="Click to filter table to Online facilities"
        className={`rounded-xl border bg-white px-3 py-2 transition-all flex items-center gap-2.5 cursor-pointer select-none ${
          activeFilter === 'Online'
            ? 'border-zinc-300 ring-2 ring-zinc-200/80 shadow-xs'
            : 'border-zinc-200/80 hover:border-zinc-300 hover:shadow-xs shadow-2xs'
        }`}
      >
        <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-[#edf4ff] text-[#2563eb] shrink-0">
          <Wifi className="h-4 w-4" />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between gap-1">
            <span className="text-xl font-extrabold text-zinc-900 tracking-tight leading-none">
              {stats.devicesOnline.toLocaleString()}
            </span>
            <span className="inline-flex items-center gap-0.5 rounded-full bg-[#eef5ff] px-1.5 py-0.5 text-[10px] font-bold text-[#2563eb] border border-blue-200/60 shrink-0">
              <ArrowUpRight className="h-2.5 w-2.5" />
              <span>+8%</span>
            </span>
          </div>
          <div className="text-[11px] font-bold text-zinc-700 leading-tight truncate">Online Devices</div>
          <div className="text-[10px] text-zinc-400 leading-tight truncate" title={stats.totalAps ? `${stats.onlineAps}/${stats.totalAps} APs healthy` : undefined}>
            {stats.onlineAps !== undefined ? `${stats.onlineAps} APs healthy` : 'Live cloud telemetry'}
          </div>
        </div>
      </div>

      {/* CARD 3: OFFLINE DEVICES */}
      <div 
        onClick={() => onSelectFilter?.('Offline')}
        title="Click to filter table to Partial Offline facilities"
        className={`rounded-xl border bg-white px-3 py-2 transition-all flex items-center gap-2.5 cursor-pointer select-none ${
          activeFilter === 'Offline'
            ? 'border-zinc-300 ring-2 ring-zinc-200/80 shadow-xs'
            : 'border-zinc-200/80 hover:border-zinc-300 hover:shadow-xs shadow-2xs'
        }`}
      >
        <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-[#fff6e5] text-[#d97706] shrink-0">
          <WifiOff className="h-4 w-4" />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between gap-1">
            <span className="text-xl font-extrabold text-zinc-900 tracking-tight leading-none">
              {stats.devicesOffline.toLocaleString()}
            </span>
            <span className="inline-flex items-center gap-0.5 rounded-full bg-[#fff1f2] px-1.5 py-0.5 text-[10px] font-bold text-[#e11d48] border border-rose-200/60 shrink-0">
              <ArrowDownRight className="h-2.5 w-2.5" />
              <span>-3</span>
            </span>
          </div>
          <div className="text-[11px] font-bold text-zinc-700 leading-tight truncate">Offline Devices</div>
          <div className="text-[10px] text-zinc-400 leading-tight truncate" title={stats.offlineAps !== undefined ? `${stats.offlineAps} APs unreachable` : undefined}>
            {stats.offlineAps !== undefined && stats.offlineAps > 0 ? `${stats.offlineAps} APs unreachable` : 'Unreachable APs & switches'}
          </div>
        </div>
      </div>

      {/* CARD 4: OFFLINE DOWN SITES */}
      <div 
        onClick={() => onSelectFilter?.('All Offline')}
        title="Click to filter table to All Offline down sites"
        className={`rounded-xl border bg-white px-3 py-2 transition-all flex items-center gap-2.5 cursor-pointer select-none ${
          activeFilter === 'All Offline'
            ? 'border-zinc-300 ring-2 ring-zinc-200/80 shadow-xs'
            : 'border-zinc-200/80 hover:border-zinc-300 hover:shadow-xs shadow-2xs'
        }`}
      >
        <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-[#ffecee] text-[#e11d48] shrink-0">
          <Clock className="h-4 w-4" />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between gap-1">
            <span className="text-xl font-extrabold text-zinc-900 tracking-tight leading-none">
              {offlineSitesCount}
            </span>
            <span className="inline-flex items-center gap-0.5 rounded-full bg-[#ecfdf5] px-1.5 py-0.5 text-[10px] font-bold text-[#059669] border border-emerald-200/60 shrink-0">
              <ArrowUpRight className="h-2.5 w-2.5" />
              <span>+1</span>
            </span>
          </div>
          <div className="text-[11px] font-bold text-zinc-700 leading-tight truncate">Offline Down Sites</div>
          <div className="text-[10px] text-zinc-400 leading-tight truncate">Immediate dispatch</div>
        </div>
      </div>
    </div>
  );
};

