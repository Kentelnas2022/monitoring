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

  // Generate pagination page numbers window
  const pageNumbers = useMemo(() => {
    const pages: number[] = [];
    const maxVisible = 5;
    let start = Math.max(1, currentPage - 2);
    let end = Math.min(totalPages, start + maxVisible - 1);

    if (end - start < maxVisible - 1) {
      start = Math.max(1, end - maxVisible + 1);
    }

    for (let i = start; i <= end; i++) {
      pages.push(i);
    }
    return pages;
  }, [currentPage, totalPages]);

  const getTypeBadge = (type: ActivityLog['type']) => {
    switch (type) {
      case 'telegram':
        return (
          <span className="inline-flex items-center gap-1.5 rounded-full bg-sky-50 px-2.5 py-1 text-xs font-bold text-[#0088cc] border border-sky-200/80">
            <Send className="h-3 w-3" />
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
          <span className="inline-flex items-center gap-1.5 rounded-full bg-[#eaf3eb] px-2.5 py-1 text-xs font-bold text-[#237227] border border-emerald-200/80">
            <UserCheck className="h-3 w-3" />
            <span>Area Assigned</span>
          </span>
        );
      case 'recovery':
        return (
          <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-50 px-2.5 py-1 text-xs font-bold text-emerald-700 border border-emerald-200">
            <CheckCircle2 className="h-3 w-3" />
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
      className="flex-1 min-h-0 w-full flex flex-col gap-3.5 overflow-y-auto px-4 sm:px-6 py-4"
      style={{ fontFamily: 'Arial, Helvetica, sans-serif' }}
    >
      {/* 1. TOP HEADER & METRIC CARDS */}
      <div className="bg-white border border-slate-200/80 rounded-2xl p-4 sm:p-5 shadow-2xs shrink-0 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="h-2.5 w-2.5 rounded-full bg-[#237227]" />
            <h2 className="text-lg font-bold text-slate-900 tracking-tight">
              Activity Logs
            </h2>
            <span className="text-[11px] font-bold text-[#237227] bg-[#eaf3eb] px-2.5 py-0.5 rounded-full border border-emerald-200/60">
              Real-Time Audit Trail
            </span>
          </div>
          <p className="text-xs sm:text-sm text-slate-500 mt-1 max-w-2xl leading-relaxed">
            Chronological audit of all system activity updates, personnel assignments, and automated Telegram downtime dispatch messages.
          </p>
        </div>

        {/* Action Controls */}
        <div className="flex items-center gap-2.5 shrink-0">
          {onClearLogs && logs.length > 0 && (
            <button
              type="button"
              onClick={onClearLogs}
              className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl border border-slate-200 bg-slate-50 hover:bg-slate-100 text-slate-600 text-xs font-semibold cursor-pointer transition-colors"
            >
              <Trash2 className="h-3.5 w-3.5 text-slate-400" />
              <span>Clear History</span>
            </button>
          )}
        </div>
      </div>

      {/* 2. STATS OVERVIEW CARDS (Minimalist & Clean) */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 shrink-0">
        <div className="bg-white border border-slate-200/80 rounded-2xl p-3.5 shadow-2xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Total Logs</span>
            <div className="p-1.5 rounded-lg bg-slate-100 text-slate-700">
              <Layers className="h-4 w-4" />
            </div>
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-2xl font-black text-slate-900">{stats.total}</span>
            <span className="text-xs text-slate-400">Events Recorded</span>
          </div>
        </div>

        <div className="bg-white border border-slate-200/80 rounded-2xl p-3.5 shadow-2xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Telegram Sent</span>
            <div className="p-1.5 rounded-lg bg-sky-50 text-[#0088cc]">
              <Send className="h-4 w-4" />
            </div>
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-2xl font-black text-[#0088cc]">{stats.telegram}</span>
            <span className="text-xs text-slate-400">Downtime Dispatches</span>
          </div>
        </div>

        <div className="bg-white border border-slate-200/80 rounded-2xl p-3.5 shadow-2xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Area Assigned</span>
            <div className="p-1.5 rounded-lg bg-[#eaf3eb] text-[#237227]">
              <UserCheck className="h-4 w-4" />
            </div>
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-2xl font-black text-[#237227]">{stats.assignments}</span>
            <span className="text-xs text-slate-400">Staff Updated</span>
          </div>
        </div>

        <div className="bg-white border border-slate-200/80 rounded-2xl p-3.5 shadow-2xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Site Alarms</span>
            <div className="p-1.5 rounded-lg bg-slate-100 text-slate-700">
              <AlertTriangle className="h-4 w-4 text-slate-600" />
            </div>
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-2xl font-black text-slate-800">{stats.outages}</span>
            <span className="text-xs text-slate-400">Downtimes Detected</span>
          </div>
        </div>
      </div>

      {/* 3. FILTER TABS & SEARCH CONTROLS */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white border border-slate-200/80 rounded-2xl p-3 shadow-2xs shrink-0">
        {/* Category Tabs */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 sm:pb-0">
          {(
            [
              { id: 'all', label: 'All Activities', count: stats.total },
              { id: 'telegram', label: 'Telegram Dispatches', count: stats.telegram },
              { id: 'outage', label: 'Downtime Alarms', count: stats.outages },
              { id: 'assignment', label: 'Area Assignments', count: stats.assignments },
              { id: 'recovery', label: 'Recoveries', count: stats.recovery },
              { id: 'system', label: 'System & Sync', count: stats.system },
            ] as const
          ).map((tab) => (
            <button
              key={tab.id}
              type="button"
              onClick={() => {
                setActiveCategory(tab.id);
                setCurrentPage(1);
              }}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer whitespace-nowrap flex items-center gap-1.5 ${
                activeCategory === tab.id
                  ? 'bg-[#237227] text-white shadow-2xs'
                  : 'bg-slate-50 hover:bg-slate-100 text-slate-600'
              }`}
            >
              <span>{tab.label}</span>
              <span className={`text-[10px] px-1.5 py-0.2 rounded-full ${
                activeCategory === tab.id ? 'bg-white/20 text-white' : 'bg-slate-200 text-slate-600'
              }`}>
                {tab.count}
              </span>
            </button>
          ))}
        </div>

        {/* Search & Filter */}
        <div className="relative w-full sm:w-80 shrink-0">
          <Search className="h-4 w-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => {
              setSearchQuery(e.target.value);
              setCurrentPage(1);
            }}
            placeholder="Search activity, site, person, @telegram..."
            className="w-full rounded-xl border border-slate-200 bg-slate-50/50 pl-9 pr-3 py-1.5 text-xs text-slate-800 placeholder-slate-400 focus:outline-none focus:border-[#237227] focus:bg-white transition-colors"
          />
        </div>
      </div>

      {/* 4. MASTER ACTIVITY LOGS TABLE */}
      <div className="bg-white border border-slate-200/80 rounded-2xl shadow-2xs overflow-hidden flex-1 flex flex-col">
        {filteredLogs.length === 0 ? (
          <div className="p-12 text-center text-slate-400 text-xs sm:text-sm">
            No activity logs match your filter criteria.
          </div>
        ) : (
          <>
            <div className="overflow-x-auto flex-1">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-slate-100 bg-slate-50/70 text-[11px] font-bold uppercase tracking-wider text-slate-500 sticky top-0 z-10 shadow-2xs">
                  <th className="py-3.5 px-4 sm:px-6">Event Type</th>
                  <th className="py-3.5 px-4 sm:px-6">Activity Details</th>
                  <th className="py-3.5 px-4 sm:px-6">Site / Designated Area</th>
                  <th className="py-3.5 px-4 sm:px-6">Assigned Responder / Telegram</th>
                  <th className="py-3.5 px-4 sm:px-6 text-right">Timestamp</th>
                </tr>
              </thead>
                <tbody className="divide-y divide-slate-100 text-xs sm:text-sm">
                  {paginatedLogs.map((log) => (
                    <tr key={log.id} className="hover:bg-slate-50/60 transition-colors">
                      {/* Event Type Badge */}
                      <td className="py-3.5 px-4 sm:px-6 align-middle whitespace-nowrap">
                        {getTypeBadge(log.type)}
                      </td>

                      {/* Activity Details */}
                      <td className="py-3.5 px-4 sm:px-6 align-middle">
                        <div className="min-w-[200px] max-w-md">
                          <span className="font-bold text-slate-900 block leading-snug">
                            {log.title}
                          </span>
                          <p className="text-xs text-slate-500 leading-relaxed mt-0.5">
                            {log.description}
                          </p>
                        </div>
                      </td>

                      {/* Site / Designated Area */}
                      <td className="py-3.5 px-4 sm:px-6 align-middle">
                        {log.siteName ? (
                          <div>
                            <div className="flex items-center gap-1.5 font-semibold text-slate-800">
                              <MapPin className="h-3.5 w-3.5 text-[#237227] shrink-0" />
                              <span className="truncate">{log.siteName}</span>
                            </div>
                            {log.siteCode && (
                              <span className="font-mono text-[11px] text-slate-400 block mt-0.5">
                                {log.siteCode}
                              </span>
                            )}
                          </div>
                        ) : (
                          <span className="text-slate-400 text-xs">—</span>
                        )}
                      </td>

                      {/* Assigned Responder / Telegram */}
                      <td className="py-3.5 px-4 sm:px-6 align-middle whitespace-nowrap">
                        {log.personName || log.telegramUsername ? (
                          <div className="space-y-0.5">
                            {log.personName && (
                              <span className="font-bold text-slate-800 block">
                                {log.personName}
                              </span>
                            )}
                            {log.telegramUsername && (
                              <a
                                href={`https://t.me/${log.telegramUsername.replace(/^@/, '')}`}
                                target="_blank"
                                rel="noreferrer"
                                className="inline-flex items-center gap-1 text-xs font-mono font-semibold text-[#0088cc] hover:underline"
                              >
                                <Send className="h-3 w-3" />
                                <span>@{log.telegramUsername.replace(/^@/, '')}</span>
                                <ExternalLink className="h-2.5 w-2.5 opacity-60" />
                              </a>
                            )}
                          </div>
                        ) : (
                          <span className="text-slate-400 text-xs">—</span>
                        )}
                      </td>

                      {/* Timestamp */}
                      <td className="py-3.5 px-4 sm:px-6 align-middle text-right whitespace-nowrap">
                        <div className="flex items-center justify-end gap-1.5 text-xs text-slate-500 font-medium">
                          <Clock className="h-3.5 w-3.5 text-slate-400" />
                          <span>{log.timestamp}</span>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* PAGINATION CONTROLS FOOTER */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-t border-slate-100 bg-slate-50/70 px-4 sm:px-6 py-3 text-xs text-slate-600 shrink-0">
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
                  {pageNumbers.map((pageNum) => (
                    <button
                      key={pageNum}
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
