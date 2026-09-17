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
  const [isClearedAll, setIsClearedAll] = useState(false);
  const [hoveredPoint, setHoveredPoint] = useState<{ x: number; y: number; label: string; fullDate: string; count: number } | null>(null);
  const [currentPage, setCurrentPage] = useState(1);

  const handleClearAll = () => {
    setIsClearedAll(true);
    if (onClearLogs) {
      onClearLogs();
    }
  };

  // Calculate Daily Sites Down Trend Data (7-Day timeline showing down sites per day)
  const lineData = useMemo(() => {
    // Current live down sites count
    const currentDownCount = sites.filter((s) => s.status === 'Downtime' || s.offlineCount > 0).length;

    // Generate last 7 days labels (e.g. Mon, Tue, Wed, Thu, Fri, Sat, Today)
    const days: { label: string; fullDate: string; count: number }[] = [];
    const today = new Date();

    for (let i = 6; i >= 0; i--) {
      const d = new Date();
      d.setDate(today.getDate() - i);
      const dayName = i === 0 ? 'Today' : d.toLocaleDateString('en-US', { weekday: 'short' });
      const fullDate = d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });

      // Daily historical counts with live data integrated into Today
      // Historical baseline: [1, 3, 0, 2, 1, 0, currentDownCount]
      const historicalDefaults = [1, 2, 0, 3, 1, 0, currentDownCount];
      const count = i === 0 ? currentDownCount : historicalDefaults[6 - i] ?? 0;

      days.push({
        label: dayName,
        fullDate,
        count,
      });
    }

    return days;
  }, [sites]);

  // Derive Site Down Logs (combination of real-time activity logs, down sites, and historical static logs)
  const siteDownLogs = useMemo(() => {
    if (isClearedAll) return [];

    // 1. Logs explicitly marked as outage, telegram alert, or critical/warning
    const logsFromState = activityLogs.filter(
      (l) => l.type === 'outage' || l.type === 'telegram' || l.severity === 'critical' || l.severity === 'warning'
    );

    // 2. Derive active downtime logs directly from currently offline sites
    const activeDownSitesLogs: ActivityLog[] = sites
      .filter((s) => s.status === 'Downtime' || s.offlineCount > 0)
      .map((s) => ({
        id: `down-log-${s.id}`,
        type: 'outage',
        title: `${s.name} DOWN`,
        description: `Site "${s.name}" (${s.code}) has ${s.offlineCount}/${s.deviceCount} device(s) offline. Downtime duration: ${s.downtimeDuration || 'Active'}.`,
        timestamp: s.downtimeDuration ? `${s.downtimeDuration} ago` : 'Just now',
        siteName: s.name,
        siteCode: s.code,
        severity: 'critical',
      }));

    // 3. Static historical sample site down logs (4 items as requested)
    const staticSampleLogs: ActivityLog[] = [
      {
        id: 'static-log-1',
        type: 'outage',
        title: 'Bukidnon Facility Telemetry Interrupted',
        description: 'Bukidnon Regional Office (BUK-01) AP-04 offline event logged.',
        timestamp: '15 mins ago',
        siteName: 'Bukidnon Regional Office',
        siteCode: 'BUK-01',
        severity: 'critical',
      },
      {
        id: 'static-log-2',
        type: 'outage',
        title: 'Misamis Hospital Substation Power Signal Drop',
        description: 'Gateway telemetry timeout detected for Misamis Hospital Substation (MIS-02).',
        timestamp: '1 hour ago',
        siteName: 'Misamis Hospital Substation',
        siteCode: 'MIS-02',
        severity: 'warning',
      },
      {
        id: 'static-log-3',
        type: 'outage',
        title: 'Lanao Facility Signal Outage',
        description: 'Lanao del Norte Substation (LDN-03) telemetry signal lost. AP-02 disconnected.',
        timestamp: '2 hours ago',
        siteName: 'Lanao del Norte Substation',
        siteCode: 'LDN-03',
        severity: 'critical',
      },
      {
        id: 'static-log-4',
        type: 'outage',
        title: 'Cagayan Main Station Link Offline',
        description: 'Cagayan Main Facility (CAG-04) primary link unreachable. Telemetry suspended.',
        timestamp: '4 hours ago',
        siteName: 'Cagayan Main Facility',
        siteCode: 'CAG-04',
        severity: 'warning',
      }
    ];

    // Combine and deduplicate
    const combined = [...activeDownSitesLogs, ...logsFromState, ...staticSampleLogs];
    const uniqueMap = new Map<string, ActivityLog>();
    combined.forEach((item) => {
      const key = `${item.siteName || ''}-${item.title}`;
      if (!uniqueMap.has(key)) {
        uniqueMap.set(key, item);
      }
    });

    return Array.from(uniqueMap.values());
  }, [sites, activityLogs, isClearedAll]);

  const itemsPerPage = 4;
  const totalPages = Math.max(1, Math.ceil(siteDownLogs.length / itemsPerPage));
  const displayedLogs = useMemo(() => {
    const start = (currentPage - 1) * itemsPerPage;
    return siteDownLogs.slice(start, start + itemsPerPage);
  }, [siteDownLogs, currentPage]);

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

  // Line Chart SVG Path Math (Daily Down Sites)
  const chartWidth = 500;
  const chartHeight = 175;
  const paddingLeft = 32;
  const paddingRight = 20;
  const paddingTop = 35;
  const paddingBottom = 30;

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
      count: d.count 
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

  return (
    <div 
      className="grid grid-cols-1 lg:grid-cols-2 gap-4 lg:gap-5 items-stretch"
      style={{ fontFamily: 'Arial, Helvetica, sans-serif' }}
    >
      {/* 1. LINE GRAPH: DAILY SITES DOWN TREND */}
      <div className="bg-white rounded-2xl border border-slate-200 p-4 sm:p-5 shadow-2xs hover:shadow-md transition-all duration-200 flex flex-col justify-between">
        <div className="flex items-center justify-between gap-3 mb-2">
          <h3 className="text-sm font-semibold text-slate-900 tracking-tight">Daily Sites Down Trend</h3>
          <span className="text-xs font-semibold text-slate-700">
            {lineData[lineData.length - 1]?.count} Down Today
          </span>
        </div>

        {/* SVG Line Chart Container (Unclipped overflow for Tooltips) */}
        <div className="relative w-full pt-3">
          <svg viewBox={`0 0 ${chartWidth} ${chartHeight}`} className="w-full h-auto overflow-visible">
            <defs>
              <linearGradient id="downTrendGrad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#237227" stopOpacity="0.2" />
                <stop offset="100%" stopColor="#237227" stopOpacity="0.0" />
              </linearGradient>
            </defs>

            {/* Gridlines */}
            {yTicks.map((val, idx) => {
              const y = paddingTop + innerH - ((val - minVal) / (maxVal - minVal)) * innerH;
              return (
                <g key={`${val}-${idx}`}>
                  <line x1={paddingLeft} y1={y} x2={chartWidth - paddingRight} y2={y} stroke="#f1f5f9" strokeDasharray="3 3" />
                  <text x={paddingLeft - 6} y={y + 3} textAnchor="end" fontSize="9" fill="#94a3b8" fontWeight="600">
                    {val}
                  </text>
                </g>
              );
            })}

            {/* Gradient Fill */}
            <path d={fillD} fill="url(#downTrendGrad)" />

            {/* Smooth Curve Stroke */}
            <path d={pathD} fill="none" stroke="#237227" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />

            {/* Data Points (Clear, visible dots with generous hover target) */}
            {points.map((pt, i) => {
              const isHovered = hoveredPoint?.label === pt.label;
              return (
                <g key={i} className="cursor-pointer" onMouseEnter={() => setHoveredPoint(pt)} onMouseLeave={() => setHoveredPoint(null)}>
                  {/* Outer highlight ring on hover */}
                  {isHovered && (
                    <circle cx={pt.x} cy={pt.y} r="10" fill="#237227" fillOpacity="0.15" />
                  )}
                  {/* Main data point dot */}
                  <circle 
                    cx={pt.x} 
                    cy={pt.y} 
                    r={isHovered ? 6 : 4.5} 
                    fill={isHovered ? '#237227' : '#ffffff'} 
                    stroke="#237227" 
                    strokeWidth={isHovered ? '2.5' : '2'} 
                    className="transition-all duration-150"
                  />
                  {/* Invisible wide hit area for easy hover */}
                  <circle cx={pt.x} cy={pt.y} r="14" fill="transparent" />
                  <text x={pt.x} y={chartHeight - 6} textAnchor="middle" fontSize="9" fill="#64748b" fontWeight="600">
                    {pt.label}
                  </text>
                </g>
              );
            })}
          </svg>

          {/* Interactive Tooltip (Positioned safely above dots with pointer arrow) */}
          {hoveredPoint && (
            <div
              className="absolute pointer-events-none bg-white border border-slate-300 text-slate-900 text-xs rounded-xl px-3 py-1.5 shadow-lg z-30 transition-all -translate-x-1/2 whitespace-nowrap"
              style={{
                left: `${(hoveredPoint.x / chartWidth) * 100}%`,
                top: `${(hoveredPoint.y / chartHeight) * 100 - 46}px`,
                fontFamily: 'Arial, Helvetica, sans-serif'
              }}
            >
              <div className="text-[11px] font-normal text-slate-500">
                {hoveredPoint.label} ({hoveredPoint.fullDate})
              </div>
              <div className="text-xs font-bold text-[#237227] mt-0.5">
                {hoveredPoint.count} {hoveredPoint.count === 1 ? 'Site' : 'Sites'} Down
              </div>
              {/* Downward pointer triangle */}
              <div className="absolute left-1/2 -bottom-1 -translate-x-1/2 w-2 h-2 bg-white rotate-45 border-r border-b border-slate-300" />
            </div>
          )}
        </div>
      </div>

      {/* 2. SITE DOWN ACTIVITY LOGS CARD */}
      <div className="bg-white rounded-2xl border border-slate-200 p-4 sm:p-5 shadow-2xs hover:shadow-md transition-all duration-200 flex flex-col justify-between gap-3">
        <div className="flex items-center justify-between gap-3 shrink-0">
          <h3 className="text-sm font-semibold text-slate-900 tracking-tight">Site Down Activity Logs</h3>
          <div className="flex items-center gap-2">
            {siteDownLogs.length > 0 && (
              <button
                type="button"
                onClick={handleClearAll}
                className="px-2.5 py-0.5 text-xs font-semibold text-slate-600 hover:text-slate-900 bg-white hover:bg-slate-100 border border-slate-200 rounded-lg transition-colors cursor-pointer"
              >
                Clear All
              </button>
            )}
            <span className="text-xs font-semibold text-slate-700">
              {siteDownLogs.length > 0 ? `${siteDownLogs.length} Active Log(s)` : 'Operational'}
            </span>
          </div>
        </div>

        {/* Activity Log List (Text-Only, No Icons/Emojis) */}
        <div className="flex-1 space-y-2 pr-1 min-h-[140px]">
          {siteDownLogs.length === 0 ? (
            <div className="py-8 flex flex-col items-center justify-center text-center">
              <div className="text-xs font-semibold text-slate-800">No Active Downtime Incidents</div>
              <div className="text-[11px] font-normal text-slate-500 mt-0.5">All facilities are currently connected and operational.</div>
            </div>
          ) : (
            displayedLogs.map((log) => {
              const cleanTitle = (log.title || '').replace(/[\u{1F300}-\u{1FAFF}\u{2600}-\u{27BF}\u{1F600}-\u{1F64F}\u{1F680}-\u{1F6FF}]/gu, '').trim();

              return (
                <div 
                  key={log.id} 
                  className="p-2.5 rounded-xl border border-slate-200 bg-slate-50 hover:bg-slate-100 transition-colors flex items-start justify-between gap-2.5"
                >
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-1.5">
                      <span className="font-semibold text-xs text-slate-900 truncate">{cleanTitle}</span>
                      {log.siteCode && (
                        <span className="px-1.5 py-0.5 rounded bg-slate-200 text-slate-700 text-[10px] font-normal font-mono">
                          {log.siteCode}
                        </span>
                      )}
                    </div>
                    <p className="text-[11px] font-normal text-slate-600 truncate mt-0.5">
                      {log.description}
                    </p>
                  </div>
                  <div className="flex flex-col items-end shrink-0">
                    <span className="text-[10px] font-normal text-slate-500">
                      {log.timestamp}
                    </span>
                    <span className="mt-1 px-2 py-0.5 rounded text-[9px] font-normal bg-slate-100 text-slate-700 border border-slate-200">
                      {log.severity || 'Alert'}
                    </span>
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Pagination Controls */}
        {siteDownLogs.length > 0 && (
          <div className="pt-2 border-t border-slate-100 flex items-center justify-between mt-auto shrink-0">
            <span className="text-[11px] font-normal text-slate-500">
              Showing {Math.min((currentPage - 1) * itemsPerPage + 1, siteDownLogs.length)}-{Math.min(currentPage * itemsPerPage, siteDownLogs.length)} of {siteDownLogs.length} logs
            </span>
            <div className="flex items-center gap-1">
              <button
                onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                disabled={currentPage === 1}
                className="px-2.5 py-1 text-xs font-normal rounded-md border border-slate-200 bg-white text-slate-700 hover:bg-slate-100 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
              >
                Prev
              </button>
              {pageNumbers.map((pg, idx) => (
                typeof pg === 'number' ? (
                  <button
                    key={idx}
                    onClick={() => setCurrentPage(pg)}
                    className={`px-2.5 py-1 text-xs font-normal rounded-md border transition-colors ${
                      currentPage === pg
                        ? 'bg-[#237227] text-white border-[#237227]'
                        : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-100'
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
                className="px-2.5 py-1 text-xs font-normal rounded-md border border-slate-200 bg-white text-slate-700 hover:bg-slate-100 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
              >
                Next
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

