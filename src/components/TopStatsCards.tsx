'use client';

import React from 'react';
import { 
  Building2, 
  Wifi, 
  WifiOff,
  AlertTriangle
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
  offlineSitesCount = 0,
  activeFilter = 'All',
  onSelectFilter,
}) => {
  const items = [
    {
      id: 'All' as const,
      label: 'TOTAL PROJECTS',
      value: stats.totalProjects.toLocaleString(),
      icon: Building2,
    },
    {
      id: 'Online' as const,
      label: 'ONLINE DEVICES',
      value: stats.devicesOnline.toLocaleString(),
      icon: Wifi,
    },
    {
      id: 'Offline' as const,
      label: 'OFFLINE DEVICES',
      value: stats.devicesOffline.toLocaleString(),
      icon: WifiOff,
    },
    {
      id: 'All Offline' as const,
      label: 'SITE DOWN LOGS',
      value: offlineSitesCount.toLocaleString(),
      icon: AlertTriangle,
    },
  ];

  return (
    <div 
      className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-5"
      style={{ fontFamily: 'Arial, Helvetica, sans-serif' }}
    >
      {items.map((item) => {
        const isActive = activeFilter === item.id;
        const Icon = item.icon;

        return (
          <div
            key={item.id}
            onClick={() => onSelectFilter?.(item.id)}
            title={`Filter view by ${item.label}`}
            className={`bg-white rounded-2xl border p-4 sm:p-5 shadow-2xs transition-all duration-200 cursor-pointer select-none flex flex-col justify-between ${
              isActive
                ? 'border-slate-300 bg-slate-100/90 shadow-sm'
                : 'border-slate-200 hover:bg-slate-50 hover:shadow-md hover:border-slate-300'
            }`}
          >
            {/* Header: Icon Container */}
            <div className="flex items-center justify-between gap-3 mb-3">
              <div className="h-10 w-10 rounded-xl bg-[#237227] text-white flex items-center justify-center shrink-0 shadow-2xs">
                <Icon className="h-5 w-5 text-white" />
              </div>
            </div>

            {/* Content: Value + Label */}
            <div>
              <span className="text-3xl font-semibold text-slate-900 tracking-tight leading-none">
                {item.value}
              </span>
              <div className="mt-2">
                <h3 className="text-xs font-semibold text-slate-800">
                  {item.label}
                </h3>
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
};



