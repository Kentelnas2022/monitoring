'use client';

import React, { useState, useMemo, useEffect } from 'react';
import { 
  Activity, 
  AlertTriangle, 
  Send, 
  UserCheck, 
  CheckCircle2, 
  Clock, 
  Search, 
  Filter, 
  Trash2, 
  RefreshCw,
  ExternalLink,
  Shield,
  Layers,
  MapPin,
  Calendar,
  CheckCheck,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight
} from 'lucide-react';
import { ActivityLog } from '@/types/dashboard';

interface ActivityLogsPageProps {
  logs: ActivityLog[];
  onClearLogs?: () => void;
}

export type LogFilterCategory = 'all' | 'outage' | 'telegram' | 'assignment' | 'recovery' | 'system';

export const ActivityLogsPage: React.FC<ActivityLogsPageProps> = ({
  logs,
  onClearLogs,
}) => {
  const [activeCategory, setActiveCategory] = useState<LogFilterCategory>('all');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [severityFilter, setSeverityFilter] = useState<string>('all');

  // Filtered and searched logs
  const filteredLogs = useMemo(() => {
    return logs.filter((log) => {
      // Category filter
      if (activeCategory !== 'all' && log.type !== activeCategory) {
        return false;
      }
      // Severity filter
      if (severityFilter !== 'all' && log.severity !== severityFilter) {
        return false;
      }
      // Search query
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchTitle = log.title.toLowerCase().includes(q);
        const matchDesc = log.description.toLowerCase().includes(q);
        const matchSite = log.siteName?.toLowerCase().includes(q);
        const matchPerson = log.personName?.toLowerCase().includes(q);
        const matchTelegram = log.telegramUsername?.toLowerCase().includes(q);
        const matchCode = log.siteCode?.toLowerCase().includes(q);
        return matchTitle || matchDesc || matchSite || matchPerson || matchTelegram || matchCode;
      }
      return true;
    });
  }, [logs, activeCategory, severityFilter, searchQuery]);

  // Statistics
  const stats = useMemo(() => {
    return {
      total: logs.length,
      telegram: logs.filter((l) => l.type === 'telegram').length,
      outages: logs.filter((l) => l.type === 'outage').length,
      assignments: logs.filter((l) => l.type === 'assignment').length,
      recovery: logs.filter((l) => l.type === 'recovery').length,
      system: logs.filter((l) => l.type === 'system').length,
    };
  }, [logs]);

  // Pagination State
  const [currentPage, setCurrentPage] = useState<number>(1);
  const [rowsPerPage, setRowsPerPage] = useState<number>(10);

  const totalPages = Math.ceil(filteredLogs.length / rowsPerPage) || 1;

  // Auto-adjust page if current page exceeds total pages
  useEffect(() => {
    if (currentPage > totalPages) {
      setCurrentPage(totalPages);
    }
  }, [currentPage, totalPages]);

  // Paginated slice
  const paginatedLogs = useMemo(() => {
    const startIndex = (currentPage - 1) * rowsPerPage;
    return filteredLogs.slice(startIndex, startIndex + rowsPerPage);
  }, [filteredLogs, currentPage, rowsPerPage]);

  const startItem = filteredLogs.length === 0 ? 0 : (currentPage - 1) * rowsPerPage + 1;
  const endItem = Math.min(currentPage * rowsPerPage, filteredLogs.length);

  // Generate pagination page numbers window (never long, truncated with ellipsis when totalPages > 5)
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

  const getTypeBadge = (type: ActivityLog['type']) => {
    switch (type) {
      case 'telegram':
        return (
          <span className="inline-flex items-center gap-1.5 rounded-full bg-sky-50 px-2.5 py-1 text-xs font-bold text-[#0088cc] border border-sky-200/80">
            <Send className="h-3 w-3 text-[#0088cc]" />
            <span>Telegram Sent</span>
          </span>
        );
      case 'outage':
        return (
          <span className="inline-flex items-center gap-1.5 rounded-full bg-slate-100 px-2.5 py-1 text-xs font-bold text-slate-800 border border-slate-300">
            <AlertTriangle className="h-3 w-3 text-slate-600" />
            <span>Site Downtime</span>
          </span>
        );
      case 'assignment':
        return (
          <span className="inline-flex items-center gap-1.5 rounded-full bg-[#237227]/10 px-2.5 py-1 text-xs font-bold text-[#237227] border border-[#237227]/20">
            <UserCheck className="h-3 w-3 text-[#237227]" />
            <span>Area Assigned</span>
          </span>
        );
      case 'recovery':
        return (
          <span className="inline-flex items-center gap-1.5 rounded-full bg-[#237227]/10 px-2.5 py-1 text-xs font-bold text-[#237227] border border-[#237227]/20">
            <CheckCircle2 className="h-3 w-3 text-[#237227]" />
            <span>Restored</span>
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center gap-1.5 rounded-full bg-slate-100 px-2.5 py-1 text-xs font-semibold text-slate-700 border border-slate-200">
            <Activity className="h-3 w-3 text-slate-500" />
            <span>System Update</span>
          </span>
        );
    }
  };

  return (
    <div 
      className="flex-1 min-h-0 w-full flex flex-col gap-4 overflow-y-auto px-4 sm:px-6 py-4"
      style={{ fontFamily: 'Arial, Helvetica, sans-serif' }}
    >
      {/* 1. TOP HEADER SECTION */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white border border-slate-200/80 rounded-2xl p-4 sm:p-5 shadow-2xs shrink-0">
        <div>
          <div className="flex items-center gap-2">
            <span className="h-2.5 w-2.5 rounded-full bg-[#237227]" />
            <h2 className="text-lg font-bold text-slate-900 tracking-tight">
              Activity Logs
            </h2>
          </div>
          <p className="text-xs sm:text-sm text-slate-500 mt-0.5">
            Chronological audit trail of system activities, automated Telegram downtime alerts, and personnel assignments.
          </p>
        </div>

        {/* Action Controls */}
        <div className="flex items-center gap-2.5 shrink-0">
          {onClearLogs && logs.length > 0 && (
            <button
              type="button"
              onClick={onClearLogs}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl border border-slate-200 bg-slate-50 hover:bg-slate-100 text-slate-600 text-xs font-semibold cursor-pointer transition-colors shadow-2xs"
            >
              <Trash2 className="h-3.5 w-3.5 text-slate-400" />
              <span>Clear History</span>
            </button>
          )}
        </div>
      </div>

      {/* 2. UNIFIED ACTIVITY LOGS TABLE CARD */}
      <div className="bg-white border border-slate-200/90 rounded-2xl shadow-xs overflow-hidden flex flex-col">
        {/* Table Top Header Bar (Title, Count on Left; Dropdown Sorting/Filter & Search on Right) */}
        <div className="border-b border-slate-100 bg-white px-5 sm:px-6 py-3.5 shrink-0 flex flex-wrap items-center justify-between gap-3.5">
          {/* Left: Title & Count */}
          <div className="flex items-center gap-2">
            <h3 className="text-base font-bold text-slate-800 tracking-tight">
              All Logs
            </h3>
            <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-slate-100 text-slate-600 border border-slate-200/60">
              {filteredLogs.length}
            </span>
          </div>

          {/* Right: Search Input & Category Dropdown */}
          <div className="flex flex-wrap items-center gap-2.5 w-full sm:w-auto">
            {/* Search Input */}
            <div className="relative flex-1 sm:w-64">
              <Search className="h-4 w-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => {
                  setSearchQuery(e.target.value);
                  setCurrentPage(1);
                }}
                placeholder="Search logs, site, person..."
                className="w-full h-9 rounded-xl border border-slate-200 bg-slate-50/70 pl-9.5 pr-3.5 text-xs font-medium text-slate-800 placeholder-slate-400 hover:border-slate-300 focus:outline-none focus:border-[#237227] focus:bg-white transition-all shadow-2xs"
                style={{ fontFamily: 'Arial, Helvetica, sans-serif' }}
              />
            </div>

            {/* Dropdown Sorting / Category Filter */}
            <div className="relative shrink-0">
              <select
                value={activeCategory}
                onChange={(e) => {
                  setActiveCategory(e.target.value as LogFilterCategory);
                  setCurrentPage(1);
                }}
                className="h-9 rounded-xl border border-slate-200 bg-slate-50/80 px-3 pr-8 text-xs font-bold text-slate-700 hover:border-slate-300 focus:outline-none focus:border-[#237227] focus:bg-white cursor-pointer shadow-2xs transition-all appearance-none"
                style={{ fontFamily: 'Arial, Helvetica, sans-serif' }}
              >
                <option value="all">All Activities ({stats.total})</option>
                <option value="telegram">Telegram Dispatches ({stats.telegram})</option>
                <option value="outage">Downtime Alarms ({stats.outages})</option>
                <option value="assignment">Area Assignments ({stats.assignments})</option>
                <option value="recovery">Recoveries ({stats.recovery})</option>
                <option value="system">System & Sync ({stats.system})</option>
              </select>
              <ChevronDown className="h-3.5 w-3.5 text-slate-500 absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
            </div>
          </div>
        </div>

        {filteredLogs.length === 0 ? (
          <div className="py-16 px-4 text-center flex flex-col items-center justify-center">
            <div className="h-12 w-12 rounded-2xl bg-[#237227] flex items-center justify-center text-white mb-3 shadow-2xs">
              <Activity className="h-6 w-6 text-white" />
            </div>
            <h3 className="text-sm font-semibold text-slate-800">No activity logs recorded</h3>
            <p className="mt-1 text-xs text-slate-500 max-w-sm">
              No matching activity events or audit logs found for your filter criteria.
            </p>
          </div>
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="w-full table-fixed text-left border-collapse" style={{ fontFamily: 'Arial, Helvetica, sans-serif' }}>
                <colgroup>
                  <col className="w-[26%]" />
                  <col className="w-[20%]" />
                  <col className="w-[20%]" />
                  <col className="w-[18%]" />
                  <col className="w-[16%]" />
                </colgroup>
                <thead>
                  <tr className="border-b border-slate-200/80 bg-slate-50/80 text-[11px] font-bold uppercase tracking-wider text-slate-500">
                    <th className="py-3.5 px-5 sm:px-6">ACTIVITY DETAILS</th>
                    <th className="py-3.5 px-4 sm:px-6">SITE / DESIGNATED AREA</th>
                    <th className="py-3.5 px-4 sm:px-6">ASSIGNED RESPONDER</th>
                    <th className="py-3.5 px-4 sm:px-6">ACTIVITIES</th>
                    <th className="py-3.5 px-5 sm:px-6 text-right">TIMESTAMP</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-xs sm:text-sm">
                  {paginatedLogs.map((log) => (
                    <tr key={log.id} className="hover:bg-slate-50/70 transition-colors">
                      {/* 1. Activity Details */}
                      <td className="py-3.5 px-5 sm:px-6 align-middle">
                        <div className="flex flex-col gap-0.5 pr-2">
                          <span className="font-bold text-slate-800 text-sm leading-snug truncate" title={log.title}>
                            {log.title}
                          </span>
                          <p className="text-xs text-slate-500 leading-relaxed truncate" title={log.description}>
                            {log.description}
                          </p>
                        </div>
                      </td>

                      {/* 2. Site / Designated Area */}
                      <td className="py-3.5 px-4 sm:px-6 align-middle">
                        {log.siteName ? (
                          <div className="flex flex-col gap-0.5">
                            <div className="flex items-center gap-2">
                              <div className="h-7 w-7 rounded-lg bg-[#237227] text-white flex items-center justify-center shrink-0 shadow-2xs">
                                <MapPin className="h-4 w-4 text-white" />
                              </div>
                              <div className="flex flex-col min-w-0">
                                <span className="font-bold text-slate-900 text-sm truncate">{log.siteName}</span>
                                {log.siteCode && (
                                  <span className="font-mono text-[11px] text-slate-400">
                                    {log.siteCode}
                                  </span>
                                )}
                              </div>
                            </div>
                          </div>
                        ) : (
                          <span className="text-slate-400 text-xs pl-2">—</span>
                        )}
                      </td>

                      {/* 3. Assigned Responder / Telegram */}
                      <td className="py-3.5 px-4 sm:px-6 align-middle">
                        {log.personName || log.telegramUsername ? (
                          <div className="flex flex-col gap-1">
                            {log.personName && (
                              <span className="font-bold text-slate-800 text-sm truncate">
                                {log.personName}
                              </span>
                            )}
                            {log.telegramUsername && (
                              <div className="inline-flex items-center gap-1.5 bg-slate-50/90 px-2.5 py-1 rounded-lg border border-slate-200/90 w-fit shadow-2xs">
                                <Send className="h-3.5 w-3.5 text-[#0088cc] shrink-0" />
                                <a
                                  href={/^\d+$/.test(log.telegramUsername) ? "https://t.me/multifactors_bot" : `https://t.me/${log.telegramUsername.replace(/^@/, '')}`}
                                  target="_blank"
                                  rel="noreferrer"
                                  className="font-mono text-xs font-bold text-slate-800 hover:text-[#0088cc] hover:underline truncate max-w-[130px]"
                                >
                                  {/^\d+$/.test(log.telegramUsername) ? `ID: ${log.telegramUsername}` : `@${log.telegramUsername.replace(/^@/, '')}`}
                                </a>
                                <ExternalLink className="h-2.5 w-2.5 text-slate-400 opacity-60" />
                              </div>
                            )}
                          </div>
                        ) : (
                          <span className="text-slate-400 text-xs pl-2">—</span>
                        )}
                      </td>

                      {/* 4. Activities (Event Badge) */}
                      <td className="py-3.5 px-4 sm:px-6 align-middle whitespace-nowrap">
                        {getTypeBadge(log.type)}
                      </td>

                      {/* 5. Timestamp */}
                      <td className="py-3.5 px-5 sm:px-6 align-middle text-right whitespace-nowrap">
                        <div className="inline-flex items-center justify-end gap-1.5 text-xs text-slate-500 font-medium">
                          <Clock className="h-3.5 w-3.5 text-slate-400 shrink-0" />
                          <span>{log.timestamp}</span>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* PAGINATION CONTROLS FOOTER */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-t border-slate-100 bg-slate-50/70 px-5 sm:px-6 py-3.5 text-xs text-slate-600 shrink-0">
              {/* Left: Summary and Rows per Page */}
              <div className="flex flex-wrap items-center gap-3">
                <span className="font-medium text-slate-600">
                  Showing <strong className="text-slate-900 font-bold">{startItem}</strong>–<strong className="text-slate-900 font-bold">{endItem}</strong> of <strong className="text-slate-900 font-bold">{filteredLogs.length}</strong> activities
                </span>

                {/* Rows Per Page Dropdown */}
                <div className="flex items-center gap-1.5 pl-2 border-l border-slate-200">
                  <span className="text-slate-500 text-xs">Rows per page:</span>
                  <select
                    value={rowsPerPage}
                    onChange={(e) => {
                      setRowsPerPage(Number(e.target.value));
                      setCurrentPage(1);
                    }}
                    className="rounded-lg border border-slate-200 bg-white px-2.5 py-1 text-xs font-semibold text-slate-800 focus:border-[#237227] focus:outline-none cursor-pointer shadow-2xs transition-colors"
                  >
                    <option value={10}>10</option>
                    <option value={15}>15</option>
                    <option value={25}>25</option>
                    <option value={50}>50</option>
                    <option value={5}>5</option>
                  </select>
                </div>
              </div>

              {/* Right: Page Navigation Buttons */}
              <div className="flex items-center gap-1.5">
                <button
                  type="button"
                  onClick={() => setCurrentPage(1)}
                  disabled={currentPage === 1}
                  className="rounded-lg border border-slate-200 bg-white p-1.5 text-slate-600 hover:bg-slate-100 disabled:opacity-40 disabled:cursor-not-allowed transition-colors cursor-pointer shadow-2xs"
                  title="First Page"
                >
                  <ChevronsLeft className="h-3.5 w-3.5" />
                </button>

                <button
                  type="button"
                  onClick={() => setCurrentPage((prev) => Math.max(1, prev - 1))}
                  disabled={currentPage === 1}
                  className="rounded-lg border border-slate-200 bg-white p-1.5 text-slate-600 hover:bg-slate-100 disabled:opacity-40 disabled:cursor-not-allowed transition-colors cursor-pointer shadow-2xs"
                  title="Previous Page"
                >
                  <ChevronLeft className="h-3.5 w-3.5" />
                </button>

                {/* Page Number Buttons */}
                <div className="flex items-center gap-1 px-1">
                  {pageNumbers.map((pageNum, idx) => (
                    typeof pageNum === 'number' ? (
                      <button
                        key={idx}
                        type="button"
                        onClick={() => setCurrentPage(pageNum)}
                        className={`min-w-[30px] h-7 px-2 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                          currentPage === pageNum
                            ? 'bg-[#237227] text-white shadow-2xs'
                            : 'border border-slate-200 bg-white text-slate-700 hover:bg-slate-100'
                        }`}
                      >
                        {pageNum}
                      </button>
                    ) : (
                      <span key={idx} className="px-1 text-xs text-slate-400 font-bold">
                        ...
                      </span>
                    )
                  ))}
                </div>

                <button
                  type="button"
                  onClick={() => setCurrentPage((prev) => Math.min(totalPages, prev + 1))}
                  disabled={currentPage === totalPages}
                  className="rounded-lg border border-slate-200 bg-white p-1.5 text-slate-600 hover:bg-slate-100 disabled:opacity-40 disabled:cursor-not-allowed transition-colors cursor-pointer shadow-2xs"
                  title="Next Page"
                >
                  <ChevronRight className="h-3.5 w-3.5" />
                </button>

                <button
                  type="button"
                  onClick={() => setCurrentPage(totalPages)}
                  disabled={currentPage === totalPages}
                  className="rounded-lg border border-slate-200 bg-white p-1.5 text-slate-600 hover:bg-slate-100 disabled:opacity-40 disabled:cursor-not-allowed transition-colors cursor-pointer shadow-2xs"
                  title="Last Page"
                >
                  <ChevronsRight className="h-3.5 w-3.5" />
                </button>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
};
