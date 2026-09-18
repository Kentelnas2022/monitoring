'use client';

import React, { useState, useMemo } from 'react';
import { TrendingUp, CheckCircle2, AlertTriangle, ShieldCheck, Clock } from 'lucide-react';
import { SiteInfrastructure, ActivityLog } from '@/types/dashboard';

interface AnalyticsChartsProps {
  sites: SiteInfrastructure[];
  activityLogs?: ActivityLog[];
  onClearLogs?: () => void;
}

export const AnalyticsCharts: React.FC<AnalyticsChartsProps> = ({ 
  sites, 
  activityLogs = [],
  onClearLogs 
}) => {
  const [hoveredPoint, setHoveredPoint] = useState<{ 
    x: number; 
    y: number; 
    label: string; 
    fullDate: string; 
    count: number;
    downSiteNames: string[];
  } | null>(null);

  const [selectedDayLabel, setSelectedDayLabel] = useState<string | null>(null);

  // Calculate Daily Sites Down Trend Data (7-Day timeline showing actual down sites per day)
  const lineData = useMemo(() => {
    // Current live down sites count (offline devices or marked as Downtime)
    const currentDownSites = sites.filter(
      (s) => s.status === 'Downtime' || (s.offlineCount === s.deviceCount && s.deviceCount > 0) || s.offlineCount > 0
    );

    // Generate last 7 days timeline ending with 'Today'
    const days: { 
      label: string; 
      fullDate: string; 
      count: number; 
      isToday: boolean;
      dateKey: string;
      downSiteNames: string[];
    }[] = [];
    const now = new Date();

    for (let i = 6; i >= 0; i--) {
      const d = new Date(now);
      d.setDate(now.getDate() - i);
      const isToday = i === 0;
      const dayName = isToday ? 'Today' : d.toLocaleDateString('en-US', { weekday: 'short' });
      const fullDate = d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
      const dateKey = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
      
      const year = d.getFullYear();
      const month = d.getMonth();
      const dateNum = d.getDate();

      // Find outage logs for this specific calendar day
      const dayOutageLogs = activityLogs.filter((log) => {
        const isOutage = log.type === 'outage' || 
          log.title.toLowerCase().includes('down') || 
          log.title.toLowerCase().includes('outage') ||
          (log.severity === 'critical' && !log.title.toLowerCase().includes('assignment'));
        
        if (!isOutage) return false;

        if (log.createdAt) {
          const lDate = new Date(log.createdAt);
          if (!isNaN(lDate.getTime())) {
            return lDate.getFullYear() === year && lDate.getMonth() === month && lDate.getDate() === dateNum;
          }
        }

        if (log.timestamp) {
          if (isToday && (log.timestamp.includes('Just now') || log.timestamp.includes('mins ago') || log.timestamp.includes('hour') || log.timestamp.includes('Today'))) {
            return true;
          }
          const lDate = new Date(log.timestamp);
          if (!isNaN(lDate.getTime())) {
            return lDate.getFullYear() === year && lDate.getMonth() === month && lDate.getDate() === dateNum;
          }
        }

        return false;
      });

      // Get unique sites that had an outage on this day
      const downSiteSet = new Set<string>();
      dayOutageLogs.forEach((l) => {
        if (l.siteName && l.siteName.trim()) {
          downSiteSet.add(l.siteName.trim());
        } else {
          const match = l.title.match(/^(.+?)\s+(?:DOWN|Outage)/i);
          if (match && match[1]) {
            downSiteSet.add(match[1].trim());
          } else {
            downSiteSet.add(l.id);
          }
        }
      });

      if (isToday) {
        // For today, also include currently active down sites
        currentDownSites.forEach((s) => downSiteSet.add(s.name.trim()));
      }

      const count = downSiteSet.size;
      const downSiteNames = Array.from(downSiteSet);

      days.push({
        label: dayName,
        fullDate,
        count,
        isToday,
        dateKey,
        downSiteNames,
      });
    }

    return days;
  }, [sites, activityLogs]);

  const selectedDayInfo = useMemo(() => {
    if (!selectedDayLabel) return null;
    return lineData.find((d) => d.label === selectedDayLabel) || null;
  }, [selectedDayLabel, lineData]);

  // Line Chart SVG Path Math (Daily Down Sites)
  const chartWidth = 500;
  const chartHeight = 185;
  const paddingLeft = 34;
  const paddingRight = 24;
  const paddingTop = 32;
  const paddingBottom = 34;

  const innerW = chartWidth - paddingLeft - paddingRight;
  const innerH = chartHeight - paddingTop - paddingBottom;

  const maxVal = Math.max(4, ...lineData.map((d) => d.count));
  const minVal = 0;

  const points = lineData.map((d, i) => {
    const x = paddingLeft + (i / Math.max(1, lineData.length - 1)) * innerW;
    const y = paddingTop + innerH - ((d.count - minVal) / (maxVal - minVal)) * innerH;
    return { 
      x, 
      y: Math.max(paddingTop, Math.min(paddingTop + innerH, y)), 
      label: d.label, 
      fullDate: d.fullDate, 
      count: d.count,
      isToday: d.isToday,
      dateKey: d.dateKey,
      downSiteNames: d.downSiteNames,
    };
  });

  const pathD = points.reduce((acc, pt, i) => {
    if (i === 0) return `M ${pt.x} ${pt.y}`;
    const prev = points[i - 1];
    const cx1 = prev.x + (pt.x - prev.x) / 2;
    const cy1 = prev.y;
    const cx2 = prev.x + (pt.x - prev.x) / 2;
    const cy2 = pt.y;
    return `${acc} C ${cx1} ${cy1}, ${cx2} ${cy2}, ${pt.x} ${pt.y}`;
  }, '');

  const fillD = `${pathD} L ${points[points.length - 1].x} ${paddingTop + innerH} L ${points[0].x} ${paddingTop + innerH} Z`;

  // Grid steps (0, 1, 2, 3, 4, etc.)
  const yTicks = [maxVal, Math.round(maxVal / 2), 0];

  const todayCount = lineData[lineData.length - 1]?.count ?? 0;

  return (
    <div 
      className="grid grid-cols-1 lg:grid-cols-2 gap-4 lg:gap-5 items-stretch"
      style={{ fontFamily: 'Arial, Helvetica, sans-serif' }}
    >
      {/* 1. LINE GRAPH: DAILY SITES DOWN TREND */}
      <div className="group relative overflow-hidden bg-white rounded-2xl border border-slate-200/80 p-5 sm:p-6 shadow-[0_2px_8px_-2px_rgba(15,23,42,0.04),0_12px_24px_-8px_rgba(15,23,42,0.04)] hover:shadow-[0_20px_36px_-10px_rgba(15,23,42,0.08),0_6px_14px_-4px_rgba(15,23,42,0.03)] transition-all duration-300 flex flex-col justify-between">
        {/* Top ambient sheen line */}
        <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-slate-200 to-transparent pointer-events-none" />

        {/* Header Row */}
        <div className="flex items-center justify-between gap-3 mb-2 shrink-0">
          <div className="flex items-center gap-2 flex-wrap">
            <h3 className="text-sm font-semibold text-slate-900 tracking-tight">Daily Sites Down Trend</h3>
            <span className="text-[10px] font-medium px-2.5 py-0.5 rounded-full flex items-center gap-1.5 shadow-xs bg-emerald-50 text-[#237227] border border-emerald-200/80">
              <span className="relative flex h-1.5 w-1.5">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
                <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-[#237227]" />
              </span>
              7-Day Telemetry
            </span>
            {selectedDayInfo && (
              <span className="text-[10px] font-semibold text-[#237227] bg-emerald-50 border border-emerald-200/90 px-2.5 py-0.5 rounded-full flex items-center gap-1">
                <span>{selectedDayInfo.label}: {selectedDayInfo.count} down</span>
                <button 
                  type="button" 
                  onClick={() => setSelectedDayLabel(null)}
                  className="hover:text-slate-900 cursor-pointer font-bold ml-0.5"
                  title="Clear day filter"
                >
                  ×
                </button>
              </span>
            )}
          </div>
          <div className="text-right shrink-0">
            <div className="text-sm sm:text-base font-bold text-slate-900 tracking-tight leading-none">
              {todayCount} Down Today
            </div>
            <div className="text-[10px] font-medium text-slate-400 mt-0.5">
              Region 10 Telemetry
            </div>
          </div>
        </div>

        {/* SVG Line Chart Container (Unclipped overflow for Tooltips) */}
        <div className="relative w-full pt-1 flex-1 min-h-[165px]">
          <svg viewBox={`0 0 ${chartWidth} ${chartHeight}`} className="w-full h-auto overflow-visible">
            <defs>
              <linearGradient id="downTrendGrad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#237227" stopOpacity="0.25" />
                <stop offset="100%" stopColor="#237227" stopOpacity="0.02" />
              </linearGradient>
            </defs>

            {/* Clear, Visible Horizontal Gridlines */}
            {yTicks.map((val, idx) => {
              const y = paddingTop + innerH - ((val - minVal) / (maxVal - minVal)) * innerH;
              const isBase = val === 0;

              return (
                <g key={`${val}-${idx}`}>
                  <line 
                    x1={paddingLeft} 
                    y1={y} 
                    x2={chartWidth - paddingRight} 
                    y2={y} 
                    stroke={isBase ? '#cbd5e1' : '#e2e8f0'} 
                    strokeWidth={isBase ? '1.2' : '1'} 
                    strokeDasharray={isBase ? 'none' : '4 4'} 
                  />
                  <text 
                    x={paddingLeft - 8} 
                    y={y + 3.5} 
                    textAnchor="end" 
                    fontSize="10" 
                    fill="#64748b" 
                    fontWeight="600"
                  >
                    {val}
                  </text>
                </g>
              );
            })}

            {/* Vertical Crosshair on Hover */}
            {hoveredPoint && (
              <line 
                x1={hoveredPoint.x} 
                y1={paddingTop - 6} 
                x2={hoveredPoint.x} 
                y2={paddingTop + innerH} 
                stroke="#cbd5e1" 
                strokeWidth="1.2" 
                strokeDasharray="3 3" 
              />
            )}

            {/* Gradient Area Fill */}
            <path d={fillD} fill="url(#downTrendGrad)" />

            {/* Prominent Smooth Curve Stroke */}
            <path 
              d={pathD} 
              fill="none" 
              stroke="#237227" 
              strokeWidth="3" 
              strokeLinecap="round" 
              strokeLinejoin="round" 
            />

            {/* Data Points (Interactive dots with hover & click-to-filter support) */}
            {points.map((pt, i) => {
              const isHovered = hoveredPoint?.label === pt.label;
              const isSelected = selectedDayLabel === pt.label;
              const hasOutages = pt.count > 0;

              return (
                <g 
                  key={i} 
                  className="cursor-pointer" 
                  onMouseEnter={() => setHoveredPoint(pt)} 
                  onMouseLeave={() => setHoveredPoint(null)}
                  onClick={() => setSelectedDayLabel((prev) => prev === pt.label ? null : pt.label)}
                >
                  {/* Outer highlight ring on hover or active outages */}
                  {(isHovered || isSelected || (pt.isToday && hasOutages)) && (
                    <circle 
                      cx={pt.x} 
                      cy={pt.y} 
                      r={isSelected ? 13 : 11} 
                      fill="#237227" 
                      fillOpacity={isSelected ? 0.25 : 0.16} 
                      className={isSelected || (pt.isToday && hasOutages) ? 'animate-pulse' : ''}
                    />
                  )}
                  {/* Main data point dot (Solid white core + dark green rim) */}
                  <circle 
                    cx={pt.x} 
                    cy={pt.y} 
                    r={isHovered || isSelected ? 6 : (pt.isToday ? 5.5 : 4.5)} 
                    fill="#ffffff" 
                    stroke="#237227" 
                    strokeWidth={isHovered || isSelected ? '3' : '2.5'} 
                    className="transition-all duration-150"
                  />
                  {/* Invisible wide hit area for easy hover & tap */}
                  <circle cx={pt.x} cy={pt.y} r="18" fill="transparent" />
                  <text 
                    x={pt.x} 
                    y={chartHeight - 8} 
                    textAnchor="middle" 
                    fontSize="10" 
                    fill={isSelected ? '#237227' : (pt.isToday ? '#0f172a' : '#64748b')} 
                    fontWeight={isSelected || pt.isToday ? '700' : '600'}
                  >
                    {pt.label}
                  </text>
                </g>
              );
            })}
          </svg>

          {/* Smart Non-Overlapping Tooltip */}
          {hoveredPoint && (() => {
            const isNearTop = hoveredPoint.y < 85;
            const isNearRight = hoveredPoint.x > chartWidth - 140;
            const isNearLeft = hoveredPoint.x < 140;

            const leftPos = isNearRight 
              ? 'auto' 
              : isNearLeft 
                ? '10px' 
                : `${(hoveredPoint.x / chartWidth) * 100}%`;

            const rightPos = isNearRight ? '10px' : 'auto';
            const transformClass = isNearRight || isNearLeft ? '' : '-translate-x-1/2';

            const topPos = isNearTop
              ? `${Math.min(70, Math.max(10, (hoveredPoint.y / chartHeight) * 100 + 16))}%`
              : `${Math.max(4, (hoveredPoint.y / chartHeight) * 100 - 32)}%`;

            return (
              <div
                className={`absolute pointer-events-none bg-white border border-slate-200 text-slate-900 text-xs rounded-xl px-3 py-2 shadow-[0_8px_20px_-4px_rgba(0,0,0,0.12)] z-30 transition-all whitespace-nowrap ${transformClass}`}
                style={{
                  left: leftPos,
                  right: rightPos,
                  top: topPos,
                  fontFamily: 'Arial, Helvetica, sans-serif'
                }}
              >
                <div className="text-[11px] font-medium text-slate-500">
                  {hoveredPoint.label} · {hoveredPoint.fullDate}
                </div>
                <div className="text-xs font-bold text-slate-900 mt-0.5 flex items-center gap-1.5">
                  <span className="inline-block w-1.5 h-1.5 rounded-full bg-[#237227]" />
                  <span>{hoveredPoint.count} {hoveredPoint.count === 1 ? 'Site' : 'Sites'} Down</span>
                </div>
                {hoveredPoint.downSiteNames && hoveredPoint.downSiteNames.length > 0 && (
                  <div className="text-[10px] text-slate-500 max-w-[180px] truncate mt-0.5">
                    {hoveredPoint.downSiteNames.join(', ')}
                  </div>
                )}
              </div>
            );
          })()}
        </div>

        {/* Bottom Context Info */}
        <div className="pt-2.5 mt-2 border-t border-slate-100 flex items-center justify-between text-[11px] text-slate-500 font-medium">
          <span>Continuous cloud telemetry sampling</span>
          <span className="text-slate-400">Click dot to filter activity logs</span>
        </div>
      </div>

      {/* 2. SITE DOWN ACTIVITY LOGS CARD */}
      <SiteDownActivityLogsCard 
        sites={sites} 
        activityLogs={activityLogs} 
        onClearLogs={onClearLogs} 
        selectedDay={selectedDayInfo}
        onClearDayFilter={() => setSelectedDayLabel(null)}
      />
    </div>
  );
};

// -----------------------------------------------------------------------------
// REUSABLE SITE DOWN ACTIVITY LOGS CARD COMPONENT
// -----------------------------------------------------------------------------
export interface SiteDownActivityLogsCardProps {
  sites: SiteInfrastructure[];
  activityLogs?: ActivityLog[];
  onClearLogs?: () => void;
  className?: string;
  itemsPerPage?: number;
  selectedDay?: { 
    label: string; 
    fullDate: string; 
    count: number; 
    isToday?: boolean; 
    dateKey?: string;
  } | null;
  onClearDayFilter?: () => void;
}

export const SiteDownActivityLogsCard: React.FC<SiteDownActivityLogsCardProps> = ({
  sites,
  activityLogs = [],
  onClearLogs,
  className = '',
  itemsPerPage = 4,
  selectedDay = null,
  onClearDayFilter,
}) => {
  const [isClearedAll, setIsClearedAll] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);

  // Active down sites count
  const activeDownSites = useMemo(() => {
    return sites.filter((s) => s.status === 'Downtime' || (s.offlineCount === s.deviceCount && s.deviceCount > 0) || s.offlineCount > 0);
  }, [sites]);

  // Un-clear automatically when a site transitions to down or new activity logs arrive
  React.useEffect(() => {
    if (activeDownSites.length > 0 || activityLogs.length > 0) {
      setIsClearedAll(false);
    }
  }, [activeDownSites.length, activityLogs.length]);

  // Reset page when day filter changes
  React.useEffect(() => {
    setCurrentPage(1);
  }, [selectedDay]);

  const handleClearAll = () => {
    setIsClearedAll(true);
    if (onClearLogs) {
      onClearLogs();
    }
  };

  // Derive Site Down Logs (combination of real-time active down sites and outage/critical activity logs)
  const siteDownLogs = useMemo(() => {
    if (isClearedAll) return [];

    // 1. Logs explicitly marked as outage, telegram alert, or critical/warning
    const logsFromState = activityLogs.filter(
      (l) => l.type === 'outage' || l.type === 'telegram' || l.severity === 'critical' || l.severity === 'warning'
    );

    // 2. Derive active downtime logs directly from currently offline sites
    const activeDownSitesLogs: ActivityLog[] = activeDownSites.map((s) => ({
      id: `down-log-${s.id}`,
      type: 'outage',
      title: `${s.name} DOWN`,
      description: `Site "${s.name}" (${s.code}) has ${s.offlineCount}/${s.deviceCount} device(s) offline. Downtime duration: ${s.downtimeDuration || 'Active'}.`,
      timestamp: (() => {
        const dur = s.downtimeDuration;
        if (!dur || dur === 'Just now' || dur === 'Active') return 'Just now';
        return dur.endsWith('ago') ? dur : `${dur} ago`;
      })(),
      createdAt: new Date().toISOString(),
      siteName: s.name,
      siteCode: s.code,
      severity: 'critical',
    }));

    // Combine and deduplicate
    const combined = [...activeDownSitesLogs, ...logsFromState];
    const uniqueMap = new Map<string, ActivityLog>();
    combined.forEach((item) => {
      const key = `${item.id || item.siteName || ''}-${item.title}`;
      if (!uniqueMap.has(key)) {
        uniqueMap.set(key, item);
      }
    });

    let list = Array.from(uniqueMap.values());

    // Apply day filter if selected from trend chart
    if (selectedDay) {
      list = list.filter((log) => {
        if (selectedDay.isToday || selectedDay.label === 'Today') {
          if (log.id.startsWith('down-log-')) return true;
          if (log.timestamp.includes('Just now') || log.timestamp.includes('mins ago') || log.timestamp.includes('hour') || log.timestamp.includes('Today')) return true;
          if (log.createdAt) {
            const d = new Date(log.createdAt);
            const now = new Date();
            return d.toDateString() === now.toDateString();
          }
          return true;
        }

        // Past calendar day
        if (log.id.startsWith('down-log-')) return false;
        if (log.createdAt && selectedDay.dateKey) {
          const d = new Date(log.createdAt);
          const target = new Date(selectedDay.dateKey);
          if (!isNaN(d.getTime()) && !isNaN(target.getTime())) {
            return d.toDateString() === target.toDateString();
          }
        }
        if (log.timestamp && (log.timestamp.includes(selectedDay.fullDate) || log.timestamp.includes(selectedDay.label))) {
          return true;
        }
        return false;
      });
    }

    return list;
  }, [activeDownSites, activityLogs, isClearedAll, selectedDay]);

  const totalPages = Math.max(1, Math.ceil(siteDownLogs.length / itemsPerPage));
  const displayedLogs = useMemo(() => {
    const start = (currentPage - 1) * itemsPerPage;
    return siteDownLogs.slice(start, start + itemsPerPage);
  }, [siteDownLogs, currentPage, itemsPerPage]);

  const pageNumbers = useMemo(() => {
    if (totalPages <= 5) {
      return Array.from({ length: totalPages }, (_, i) => i + 1);
    }
    const pages: (number | string)[] = [1];
    let start = Math.max(2, currentPage - 1);
    let end = Math.min(totalPages - 1, currentPage + 1);

    if (currentPage <= 3) {
      start = 2;
      end = Math.min(totalPages - 1, 4);
    } else if (currentPage >= totalPages - 2) {
      start = Math.max(2, totalPages - 3);
      end = totalPages - 1;
    }

    if (start > 2) pages.push('...');
    for (let i = start; i <= end; i++) pages.push(i);
    if (end < totalPages - 1) pages.push('...');
    pages.push(totalPages);
    return pages;
  }, [currentPage, totalPages]);

  return (
    <div 
      className={`group relative overflow-hidden bg-white rounded-2xl border border-slate-200/80 p-5 sm:p-6 shadow-[0_2px_8px_-2px_rgba(15,23,42,0.04),0_12px_24px_-8px_rgba(15,23,42,0.04)] hover:shadow-[0_20px_36px_-10px_rgba(15,23,42,0.08),0_6px_14px_-4px_rgba(15,23,42,0.03)] transition-all duration-300 flex flex-col justify-between gap-3 ${className}`}
      style={{ fontFamily: 'Arial, Helvetica, sans-serif' }}
    >
      {/* Top ambient sheen line */}
      <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-slate-200 to-transparent pointer-events-none" />

      <div className="flex items-center justify-between gap-3 shrink-0">
        <div className="flex items-center gap-2">
          <h3 className="text-sm font-semibold text-slate-800">Site Down Activity Logs</h3>
          {selectedDay && (
            <span className="text-[11px] font-semibold text-[#237227] bg-emerald-50 border border-emerald-200 px-2.5 py-0.5 rounded-full flex items-center gap-1">
              <span>{selectedDay.label}</span>
              {onClearDayFilter && (
                <button 
                  type="button" 
                  onClick={onClearDayFilter}
                  className="hover:text-slate-900 cursor-pointer font-bold ml-0.5"
                  title="Clear day filter"
                >
                  ×
                </button>
              )}
            </span>
          )}
        </div>
        <div className="flex items-center gap-2">
          {siteDownLogs.length > 0 && (
            <button
              type="button"
              onClick={handleClearAll}
              className="px-2.5 py-1 text-xs font-medium text-slate-500 hover:text-slate-800 hover:bg-slate-100 rounded-lg transition-colors cursor-pointer"
            >
              Clear All
            </button>
          )}
          <span className="text-[11px] font-medium text-slate-600 bg-slate-100 px-2.5 py-0.5 rounded-full border border-slate-200/70">
            {siteDownLogs.length > 0 ? `${siteDownLogs.length} Active Logs` : 'Operational'}
          </span>
        </div>
      </div>

      {/* Activity Log List (Foolish Minimalism, No Red Overload) */}
      <div className="flex-1 space-y-2 pr-1 min-h-[140px]">
        {siteDownLogs.length === 0 ? (
          <div className="py-8 flex flex-col items-center justify-center text-center">
            <div className="w-9 h-9 rounded-full bg-emerald-50 border border-emerald-200/80 flex items-center justify-center mb-2.5 shadow-xs">
              <span className="w-2 h-2 rounded-full bg-[#237227] animate-pulse" />
            </div>
            <div className="text-xs font-bold text-slate-800 tracking-tight">
              {selectedDay ? `No Incidents on ${selectedDay.label}` : 'All Infrastructure Operational'}
            </div>
            <div className="text-[11px] font-medium text-slate-500 mt-1 max-w-xs">
              {selectedDay 
                ? `${selectedDay.fullDate} had 0 recorded downtime incidents.` 
                : 'Zero telemetry outages recorded across Region 10. All facilities online.'}
            </div>
            {selectedDay && onClearDayFilter && (
              <button
                type="button"
                onClick={onClearDayFilter}
                className="mt-2.5 text-xs font-semibold text-[#237227] hover:underline cursor-pointer"
              >
                Show All Incidents
              </button>
            )}
          </div>
        ) : (
          displayedLogs.map((log) => {
            const cleanTitle = (log.title || '').replace(/[\p{Extended_Pictographic}\u{1F300}-\u{1FAFF}\u{2600}-\u{27BF}\u{1F600}-\u{1F64F}\u{1F680}-\u{1F6FF}]/gu, '').trim();
            const cleanDesc = (log.description || '').replace(/[\p{Extended_Pictographic}\u{1F300}-\u{1FAFF}\u{2600}-\u{27BF}\u{1F600}-\u{1F64F}\u{1F680}-\u{1F6FF}]/gu, '').trim();

            return (
              <div 
                key={log.id} 
                className="group/item p-3 rounded-xl border border-slate-100/90 bg-white hover:bg-slate-50/70 hover:border-slate-200/90 transition-all flex items-start justify-between gap-3"
              >
                <div className="flex items-start gap-2.5 min-w-0 flex-1">
                  <span className="w-1.5 h-1.5 rounded-full shrink-0 mt-1.5 bg-slate-400 group-hover/item:bg-slate-700 transition-colors" />
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <span className="font-semibold text-xs text-slate-900 truncate" title={cleanTitle}>{cleanTitle}</span>
                      {log.siteCode && (
                        <span className="px-1.5 py-0.5 rounded bg-slate-100 text-slate-600 text-[10px] font-mono border border-slate-200/80">
                          {log.siteCode}
                        </span>
                      )}
                    </div>
                    <p className="text-[11px] font-normal text-slate-500 truncate mt-0.5" title={cleanDesc}>
                      {cleanDesc}
                    </p>
                  </div>
                </div>
                <div className="flex flex-col items-end shrink-0 pl-1">
                  <span className="text-[10px] font-medium text-slate-400">
                    {log.timestamp}
                  </span>
                  <span className="mt-1 px-2.5 py-0.5 rounded-full text-[10px] font-medium bg-slate-100 text-slate-600 border border-slate-200/70">
                    Offline
                  </span>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Pagination Controls */}
      {siteDownLogs.length > 0 && (
        <div className="pt-2.5 border-t border-slate-100 flex items-center justify-between mt-auto shrink-0">
          <span className="text-[11px] font-medium text-slate-500">
            Showing {Math.min((currentPage - 1) * itemsPerPage + 1, siteDownLogs.length)}-{Math.min(currentPage * itemsPerPage, siteDownLogs.length)} of {siteDownLogs.length} logs
          </span>
          <div className="flex items-center gap-1.5">
            <button
              onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
              disabled={currentPage === 1}
              className="px-3 py-1 text-xs font-medium rounded-full border border-slate-200/90 bg-white text-slate-700 hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed transition-colors cursor-pointer"
            >
              Prev
            </button>
            {pageNumbers.map((pg, idx) => (
              typeof pg === 'number' ? (
                <button
                  key={idx}
                  onClick={() => setCurrentPage(pg)}
                  className={`w-7 h-7 flex items-center justify-center text-xs font-medium rounded-full border transition-colors cursor-pointer ${
                    currentPage === pg
                      ? 'bg-[#237227] text-white border-[#237227] shadow-xs'
                      : 'bg-white text-slate-700 border-slate-200/90 hover:bg-slate-50'
                  }`}
                >
                  {pg}
                </button>
              ) : (
                <span key={idx} className="px-1 text-xs text-slate-400 font-normal">
                  ...
                </span>
              )
            ))}
            <button
              onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
              disabled={currentPage === totalPages}
              className="px-3 py-1 text-xs font-medium rounded-full border border-slate-200/90 bg-white text-slate-700 hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed transition-colors cursor-pointer"
            >
              Next
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

