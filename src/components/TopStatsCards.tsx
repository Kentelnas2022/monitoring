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
      className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5 sm:gap-4" 
      style={{ fontFamily: 'Arial, Helvetica, sans-serif' }}
    >
      {/* CARD 1: TOTAL PROJECTS (USERS) */}
      <div 
        onClick={() => onSelectFilter?.('All')}
        title="Click to view All Projects in table"
        className={`rounded-2xl border bg-white p-3.5 sm:p-4 transition-all flex flex-col justify-between cursor-pointer select-none ${
          activeFilter === 'All'
            ? 'border-zinc-300 ring-2 ring-zinc-200/80 shadow-xs'
            : 'border-zinc-200/80 hover:border-zinc-300 hover:shadow-xs shadow-2xs'
        }`}
      >
        <div className="flex items-center justify-between">
          <div className="flex h-9 sm:h-10 w-9 sm:w-10 items-center justify-center rounded-xl bg-[#eaf5eb] text-[#237227] shrink-0">
            <Users className="h-4.5 sm:h-5 w-4.5 sm:w-5" />
          </div>
          <span className="inline-flex items-center gap-0.5 rounded-full bg-[#ecf7ed] px-2 py-0.5 text-[11px] font-bold text-[#237227] border border-emerald-200/60 shrink-0">
            <ArrowUpRight className="h-3 w-3" />
            <span>+12%</span>
          </span>
        </div>
        <div className="mt-2.5 sm:mt-3 text-2xl sm:text-3xl font-extrabold text-zinc-900 tracking-tight leading-none">
          {stats.totalProjects.toLocaleString()}
        </div>
        <div className="mt-1 sm:mt-1.5">
          <div className="text-xs sm:text-sm font-bold text-zinc-800 leading-snug truncate">
            Total Projects
          </div>
          <div className="text-[11px] font-normal text-zinc-400 leading-tight mt-0.5 truncate">
            Registered facilities
          </div>
        </div>
      </div>

      {/* CARD 2: ONLINE DEVICES (WIFI / TELEMETRY) */}
      <div 
        onClick={() => onSelectFilter?.('Online')}
        title="Click to filter table to Online facilities"
        className={`rounded-2xl border bg-white p-3.5 sm:p-4 transition-all flex flex-col justify-between cursor-pointer select-none ${
          activeFilter === 'Online'
            ? 'border-zinc-300 ring-2 ring-zinc-200/80 shadow-xs'
            : 'border-zinc-200/80 hover:border-zinc-300 hover:shadow-xs shadow-2xs'
        }`}
      >
        <div className="flex items-center justify-between">
          <div className="flex h-9 sm:h-10 w-9 sm:w-10 items-center justify-center rounded-xl bg-[#edf4ff] text-[#2563eb] shrink-0">
            <Wifi className="h-4.5 sm:h-5 w-4.5 sm:w-5" />
          </div>
          <span className="inline-flex items-center gap-0.5 rounded-full bg-[#eef5ff] px-2 py-0.5 text-[11px] font-bold text-[#2563eb] border border-blue-200/60 shrink-0">
            <ArrowUpRight className="h-3 w-3" />
            <span>+8%</span>
          </span>
        </div>
        <div className="mt-2.5 sm:mt-3 text-2xl sm:text-3xl font-extrabold text-zinc-900 tracking-tight leading-none">
          {stats.devicesOnline.toLocaleString()}
        </div>
        <div className="mt-1 sm:mt-1.5">
          <div className="text-xs sm:text-sm font-bold text-zinc-800 leading-snug truncate">
            Online Devices
          </div>
          <div className="text-[11px] font-normal text-zinc-500 leading-tight mt-0.5 truncate" title={stats.totalAps ? `${stats.onlineAps}/${stats.totalAps} APs • ${stats.onlineGateways || 0} Gateways` : undefined}>
            {stats.onlineAps !== undefined ? `${stats.onlineAps} APs healthy` : 'Live cloud telemetry'}
          </div>
        </div>
      </div>

      {/* CARD 3: OFFLINE DEVICES (WIFI OFF / CRITICAL) */}
      <div 
        onClick={() => onSelectFilter?.('Offline')}
        title="Click to filter table to Partial Offline facilities"
        className={`rounded-2xl border bg-white p-3.5 sm:p-4 transition-all flex flex-col justify-between cursor-pointer select-none ${
          activeFilter === 'Offline'
            ? 'border-zinc-300 ring-2 ring-zinc-200/80 shadow-xs'
            : 'border-zinc-200/80 hover:border-zinc-300 hover:shadow-xs shadow-2xs'
        }`}
      >
        <div className="flex items-center justify-between">
          <div className="flex h-9 sm:h-10 w-9 sm:w-10 items-center justify-center rounded-xl bg-[#fff6e5] text-[#d97706] shrink-0">
            <WifiOff className="h-4.5 sm:h-5 w-4.5 sm:w-5" />
          </div>
          <span className="inline-flex items-center gap-0.5 rounded-full bg-[#fff1f2] px-2 py-0.5 text-[11px] font-bold text-[#e11d48] border border-rose-200/60 shrink-0">
            <ArrowDownRight className="h-3 w-3" />
            <span>-3</span>
          </span>
        </div>
        <div className="mt-2.5 sm:mt-3 text-2xl sm:text-3xl font-extrabold text-zinc-900 tracking-tight leading-none">
          {stats.devicesOffline.toLocaleString()}
        </div>
        <div className="mt-1 sm:mt-1.5">
          <div className="text-xs sm:text-sm font-bold text-zinc-800 leading-snug truncate">
            Offline Devices
          </div>
          <div className="text-[11px] font-normal text-zinc-500 leading-tight mt-0.5 truncate" title={stats.offlineAps !== undefined ? `${stats.offlineAps} APs • ${stats.offlineGateways || 0} Gateways down` : undefined}>
            {stats.offlineAps !== undefined && stats.offlineAps > 0 ? `${stats.offlineAps} APs unreachable` : 'Unreachable APs & switches'}
          </div>
        </div>
      </div>

      {/* CARD 4: OFFLINE DOWN SITES (CLOCK / DISPATCH) */}
      <div 
        onClick={() => onSelectFilter?.('All Offline')}
        title="Click to filter table to All Offline down sites"
        className={`rounded-2xl border bg-white p-3.5 sm:p-4 transition-all flex flex-col justify-between cursor-pointer select-none ${
          activeFilter === 'All Offline'
            ? 'border-zinc-300 ring-2 ring-zinc-200/80 shadow-xs'
            : 'border-zinc-200/80 hover:border-zinc-300 hover:shadow-xs shadow-2xs'
        }`}
      >
        <div className="flex items-center justify-between">
          <div className="flex h-9 sm:h-10 w-9 sm:w-10 items-center justify-center rounded-xl bg-[#ffecee] text-[#e11d48] shrink-0">
            <Clock className="h-4.5 sm:h-5 w-4.5 sm:w-5" />
          </div>
          <span className="inline-flex items-center gap-0.5 rounded-full bg-[#ecfdf5] px-2 py-0.5 text-[11px] font-bold text-[#059669] border border-emerald-200/60 shrink-0">
            <ArrowUpRight className="h-3 w-3" />
            <span>+1</span>
          </span>
        </div>
        <div className="mt-2.5 sm:mt-3 text-2xl sm:text-3xl font-extrabold text-zinc-900 tracking-tight leading-none">
          {offlineSitesCount}
        </div>
        <div className="mt-1 sm:mt-1.5">
          <div className="text-xs sm:text-sm font-bold text-zinc-800 leading-snug truncate">
            Offline Down Sites
          </div>
          <div className="text-[11px] font-normal text-zinc-400 leading-tight mt-0.5 truncate">
            Immediate dispatch
          </div>
        </div>
      </div>
    </div>
  );
};
