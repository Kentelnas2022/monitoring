'use client';

import React, { useState, useMemo, useEffect, useRef } from 'react';
import { 
  Search, 
  WifiOff, 
  ChevronRight, 
  ChevronLeft,
  ChevronsLeft,
  ChevronsRight,
  RefreshCw,
  AlertTriangle
} from 'lucide-react';
import { SiteInfrastructure } from '@/types/dashboard';
import { MindanaoMap } from './MindanaoMap';

export type TableStatusFilter = 'All' | 'All Offline' | 'Offline' | 'Online';

interface ProjectTableProps {
  sites: SiteInfrastructure[];
  onSelectSite: (site: SiteInfrastructure) => void;
  onOpenSiteDetails?: (site: SiteInfrastructure) => void;
  selectedSiteId?: string | null;
  alertingSiteId?: string | null;
  isTvMode?: boolean;
  onToggleTvMode?: () => void;
  statusFilter?: TableStatusFilter;
  onStatusFilterChange?: (filter: TableStatusFilter) => void;
  onRefresh?: () => void;
  isRefreshing?: boolean;
  lastSyncedAt?: string | null;
  onToggleTestOutage?: () => void;
  isTestOutage?: boolean;
  showMap?: boolean;
  onOpenMonitoring?: () => void;
  hideTestButton?: boolean;
}

export const ProjectTable: React.FC<ProjectTableProps> = ({
  sites,
  onSelectSite,
  onOpenSiteDetails,
  selectedSiteId,
  alertingSiteId,
  isTvMode = false,
  statusFilter: controlledStatusFilter,
  onStatusFilterChange,
  isRefreshing = false,
  onToggleTestOutage,
  isTestOutage = false,
  showMap = false,
  onOpenMonitoring,
  hideTestButton = false,
}) => {
  const [internalStatusFilter, setInternalStatusFilter] = useState<TableStatusFilter>('All');
  const statusFilter = controlledStatusFilter !== undefined ? controlledStatusFilter : internalStatusFilter;

  const handleStatusChange = (newFilter: TableStatusFilter) => {
    if (onStatusFilterChange) {
      onStatusFilterChange(newFilter);
    } else {
      setInternalStatusFilter(newFilter);
    }
  };

  const [selectedProvince, setSelectedProvince] = useState<string>('All');
  const [searchQuery, setSearchQuery] = useState<string>('');

  // Pagination State
  const [currentPage, setCurrentPage] = useState<number>(1);
  const [rowsPerPage, setRowsPerPage] = useState<number>(8);

  // Extract unique provinces
  const provinces = useMemo(() => {
    const set = new Set<string>();
    sites.forEach((s) => set.add(s.province));
    return ['All', ...Array.from(set).sort()];
  }, [sites]);

  // Status and Device Counts directly computed from live API sites
  const counts = useMemo(() => {
    return {
      all: sites.length,
      allOffline: sites.filter((s) => s.offlineCount === s.deviceCount && s.deviceCount > 0).length,
      offline: sites.filter((s) => s.offlineCount > 0 && s.offlineCount < s.deviceCount).length,
      online: sites.filter((s) => s.offlineCount === 0).length,
      onlineDevices: sites.reduce((acc, s) => acc + s.onlineCount, 0),
      offlineDevices: sites.reduce((acc, s) => acc + s.offlineCount, 0),
    };
  }, [sites]);

  // Reset to page 1 whenever filters or search query change
  useEffect(() => {
    setCurrentPage(1);
  }, [statusFilter, selectedProvince, searchQuery, rowsPerPage]);

  // When any all-offline site appears, automatically reset to page 1 so it is immediately front and center
  const prevAllOfflineCountRef = useRef(0);
  useEffect(() => {
    const allOfflineCount = sites.filter((s) => s.offlineCount === s.deviceCount && s.deviceCount > 0).length;
    if (allOfflineCount > prevAllOfflineCountRef.current) {
      if (statusFilter === 'Online') {
        handleStatusChange('All');
      }
      setCurrentPage(1);
    }
    prevAllOfflineCountRef.current = allOfflineCount;
  }, [sites, statusFilter]);

  // Filtered and Sorted Sites
  const sortedAndFilteredSites = useMemo(() => {
    const filtered = sites.filter((s) => {
      const isAllOffline = s.offlineCount === s.deviceCount && s.deviceCount > 0;
      const isPartialOffline = s.offlineCount > 0 && s.offlineCount < s.deviceCount;
      const isOnline = s.offlineCount === 0;

      let matchesStatus = true;
      if (statusFilter === 'All Offline') {
        matchesStatus = isAllOffline;
      } else if (statusFilter === 'Offline') {
        matchesStatus = isPartialOffline;
      } else if (statusFilter === 'Online') {
        matchesStatus = isOnline;
      }

      const matchesProvince = selectedProvince === 'All' ? true : s.province === selectedProvince;
      const q = searchQuery.toLowerCase();
      const dev = s.devices?.[0];
      const modelStr = (dev?.model || (s.code === 'RJ-9588688' || s.name === 'OJT' ? 'EW1200' : '')).toLowerCase();
      const snStr = (dev?.serialNumber || (s.code === 'RJ-9588688' || s.name === 'OJT' ? 'G1QH3N710075C' : '')).toLowerCase();

      const matchesQuery =
        s.name.toLowerCase().includes(q) ||
        s.code.toLowerCase().includes(q) ||
        modelStr.includes(q) ||
        snStr.includes(q) ||
        (s.municipality && s.municipality.toLowerCase().includes(q)) ||
        (s.landmark && s.landmark.toLowerCase().includes(q)) ||
        s.assignedHandler.name.toLowerCase().includes(q) ||
        s.assignedHandler.phone.includes(q) ||
        s.province.toLowerCase().includes(q) ||
        s.lastKnownIp.includes(q);

      return matchesStatus && matchesProvince && matchesQuery;
    });

    return filtered.sort((a, b) => {
      const getPriority = (s: SiteInfrastructure) => {
        if (s.offlineCount === s.deviceCount && s.deviceCount > 0) return 1;
        if (s.offlineCount > 0) return 2;
        return 3;
      };

      const diff = getPriority(a) - getPriority(b);
      if (diff !== 0) return diff;

      return b.activeAlarmCount - a.activeAlarmCount;
    });
  }, [sites, statusFilter, selectedProvince, searchQuery]);

  // Paginated Slices
  const totalPages = Math.ceil(sortedAndFilteredSites.length / rowsPerPage) || 1;
  const paginatedSites = useMemo(() => {
    const startIndex = (currentPage - 1) * rowsPerPage;
    return sortedAndFilteredSites.slice(startIndex, startIndex + rowsPerPage);
  }, [sortedAndFilteredSites, currentPage, rowsPerPage]);

  const startItem = sortedAndFilteredSites.length === 0 ? 0 : (currentPage - 1) * rowsPerPage + 1;
  const endItem = Math.min(currentPage * rowsPerPage, sortedAndFilteredSites.length);

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

  const renderTableCard = () => (
    <div className="flex flex-col h-full min-h-0 overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-2xs justify-between" style={{ fontFamily: 'Arial, Helvetica, sans-serif' }}>
      {/* 1. Unified Seamless Header Bar (Title + Controls in 1 single line) */}
      <div className="border-b border-slate-100 bg-white px-4 py-3 shrink-0 flex flex-wrap items-center justify-between gap-3">
        {/* Title */}
        <div className="flex items-center gap-2">
          <h2 className="text-sm sm:text-base font-semibold text-slate-900 tracking-tight">Ruijie Cloud Synced Sites</h2>
          <span className="text-xs font-normal text-slate-500">
            ({counts.all})
          </span>
        </div>

        {/* Controls Flow: 1. Search -> 2. Status Dropdown -> 3. Provinces -> 4. Live Map */}
        <div className="flex flex-wrap items-center gap-2 shrink-0">
          {/* 1. SEARCH INPUT */}
          <div className="relative w-36 sm:w-44">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400 pointer-events-none" />
            <input
              type="text"
              placeholder="Search..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full h-8.5 rounded-xl border border-slate-200 bg-slate-50/60 pl-8 pr-2.5 text-xs font-medium text-slate-800 placeholder-slate-400 hover:border-slate-300 focus:border-slate-400 focus:bg-white focus:outline-none transition-colors"
              style={{ fontFamily: 'Arial, Helvetica, sans-serif' }}
            />
          </div>

          {/* 2. STATUS FILTER DROPDOWN (All, Online, Offline, All Offline) */}
          <select
            value={statusFilter}
            onChange={(e) => handleStatusChange(e.target.value as TableStatusFilter)}
            className="h-8.5 rounded-xl border border-slate-200 bg-slate-50/60 px-2.5 text-xs font-semibold text-slate-800 hover:border-slate-300 focus:border-slate-400 focus:bg-white focus:outline-none cursor-pointer shrink-0 transition-colors"
            style={{ fontFamily: 'Arial, Helvetica, sans-serif' }}
          >
            <option value="All">All ({counts.all})</option>
            <option value="Online">Online ({counts.online})</option>
            <option value="Offline">Offline ({counts.offline})</option>
            <option value="All Offline">All Offline ({counts.allOffline})</option>
          </select>

          {/* 3. PROVINCES SELECTOR */}
          <select
            value={selectedProvince}
            onChange={(e) => setSelectedProvince(e.target.value)}
            className="h-8.5 rounded-xl border border-slate-200 bg-slate-50/60 px-2.5 text-xs font-semibold text-slate-800 hover:border-slate-300 focus:border-slate-400 focus:bg-white focus:outline-none cursor-pointer shrink-0 transition-colors"
            style={{ fontFamily: 'Arial, Helvetica, sans-serif' }}
          >
            {provinces.map((prov) => (
              <option key={prov} value={prov}>
                {prov === 'All' ? 'All Provinces' : prov}
              </option>
            ))}
          </select>

          {/* 4. LIVE MAP BUTTON */}
          {onOpenMonitoring && (
            <button
              type="button"
              onClick={onOpenMonitoring}
              title="Open Live Map Monitoring Page"
              className="h-8.5 px-3 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-slate-800 flex items-center gap-1 text-xs font-semibold shadow-2xs transition-all cursor-pointer shrink-0"
              style={{ fontFamily: 'Arial, Helvetica, sans-serif' }}
            >
              <span>Live Map</span>
            </button>
          )}

          {!hideTestButton && onToggleTestOutage && (
            <button
              type="button"
              onClick={onToggleTestOutage}
              title={isTestOutage ? 'Click to restore test site back to online' : 'Simulate 1 site going All Offline'}
              className={`h-8.5 px-2.5 rounded-xl border flex items-center gap-1 text-xs font-semibold transition-all cursor-pointer shadow-2xs shrink-0 ${
                isTestOutage
                  ? 'border-rose-300 bg-rose-50 text-rose-700 hover:bg-rose-100 ring-2 ring-rose-300/40 animate-pulse'
                  : 'border-slate-200 bg-white hover:bg-slate-50 text-slate-800'
              }`}
              style={{ fontFamily: 'Arial, Helvetica, sans-serif' }}
            >
              <AlertTriangle className={`h-3.5 w-3.5 ${isTestOutage ? 'text-rose-600' : 'text-amber-500'}`} />
              <span>{isTestOutage ? 'Restore' : 'Test Down'}</span>
            </button>
          )}
        </div>
      </div>

      {/* Scrollable Table Area */}
        <div className="overflow-x-auto overflow-y-auto flex-1 min-h-0 flex flex-col">
          <table className={`w-full table-fixed text-left text-slate-800 ${isTvMode ? 'text-lg' : 'text-base'}`} style={{ fontFamily: 'Arial, Helvetica, sans-serif' }}>
            <colgroup>
              <col className="w-1/6" />
              <col className="w-1/6" />
              <col className="w-1/6" />
              <col className="w-1/6" />
              <col className="w-1/6" />
              <col className="w-1/6" />
            </colgroup>
            <thead className="border-b border-slate-200 bg-slate-50/80 text-xs uppercase tracking-wider text-slate-500 font-bold sticky top-0 z-10">
              <tr>
                <th scope="col" className="py-3.5 pl-5 pr-3 font-bold text-left">
                  PROJECT NAME
                </th>
                <th scope="col" className="py-3.5 px-3 font-bold text-left">
                  LOCATION
                </th>
                <th scope="col" className="py-3.5 px-3 font-bold text-left">
                  MODEL
                </th>
                <th scope="col" className="py-3.5 px-3 font-bold text-left">
                  DEVICE SN
                </th>
                <th scope="col" className="py-3.5 px-3 font-bold text-center">
                  AP / DEVICE
                </th>
                <th scope="col" className="py-3.5 px-3 font-bold text-center">
                  DOWNTIME
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200/60">
              {paginatedSites.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-16 text-center">
                    {isRefreshing ? (
                      <div className="flex flex-col items-center justify-center">
                        <RefreshCw className="h-8 w-8 text-[#237227] animate-spin mb-3" />
                        <h3 className="text-base font-bold text-slate-800">Loading telemetry data...</h3>
                        <p className="mt-1 text-sm text-slate-500">
                          Auto-syncing projects from cloud telemetry.
                        </p>
                      </div>
                    ) : (
                      <div>
                        <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-slate-100 text-slate-400">
                          <WifiOff className="h-6 w-6" />
                        </div>
                        <h3 className="mt-3 text-base font-bold text-slate-800">No matching projects found</h3>
                        <p className="mt-1 text-sm text-slate-500">
                          Try adjusting your search query or province filter.
                        </p>
                      </div>
                    )}
                  </td>
                </tr>
              ) : (
                paginatedSites.map((site) => {
                  const isAllOffline = site.offlineCount === site.deviceCount && site.deviceCount > 0;
                  const isPartialOffline = site.offlineCount > 0 && site.offlineCount < site.deviceCount;

                  const totalAps = site.apCount || site.deviceCount || 1;
                  const offlineAps = site.apOffline !== undefined ? site.apOffline : (isAllOffline ? totalAps : site.offlineCount);
                  const onlineAps = Math.max(0, totalAps - offlineAps);

                  const dev = site.devices?.[0];
                  const modelDisplay = dev?.model || (site.code === 'RJ-9588688' || site.name === 'OJT' ? 'EW1200' : (site.devices && site.devices.length > 0 ? site.devices.map(d => d.model).join(', ') : 'N/A'));
                  const deviceSnDisplay = dev?.serialNumber || (site.code === 'RJ-9588688' || site.name === 'OJT' ? 'G1QH3N710075C' : (site.devices && site.devices.length > 0 ? site.devices.map(d => d.serialNumber).join(', ') : 'N/A'));
                  const deviceTypeDisplay = dev?.deviceType || (dev?.model?.startsWith('RG-RAP') ? 'Access Point' : dev?.model?.startsWith('RG-EG') || dev?.model?.includes('EW') ? 'Gateway Router' : 'Hardware Device');

                  return (
                    <tr
                      key={site.id}
                      onClick={() => onSelectSite(site)}
                      className="bg-white hover:bg-slate-100 transition-colors duration-150 cursor-pointer border-b border-slate-100"
                      style={{ fontFamily: 'Arial, Helvetica, sans-serif' }}
                    >
                      {/* 1. PROJECT NAME */}
                      <td className="py-3 pl-5 pr-3 overflow-hidden align-middle">
                        <div className="flex flex-col min-w-0">
                          <span className={`font-semibold text-slate-900 leading-snug truncate ${
                            isTvMode ? 'text-xl' : 'text-sm sm:text-base'
                          }`} title={site.name}>
                            {site.name}
                          </span>
                          <span className="text-xs text-slate-500 mt-0.5 font-normal">
                            {site.code}
                          </span>
                        </div>
                      </td>

                      {/* 2. LOCATION */}
                      <td className="px-3 py-3 overflow-hidden align-middle">
                        <div className="flex flex-col min-w-0">
                          <span 
                            className={`font-normal truncate text-slate-900 leading-tight ${
                              isTvMode ? 'text-lg' : 'text-sm'
                            }`} 
                            title={`${site.landmark ? site.landmark + ' • ' : ''}${site.municipality || site.province}, ${site.province}`}
                          >
                            {site.municipality || site.province}
                          </span>
                          <span 
                            className="text-xs text-slate-500 truncate mt-0.5 font-normal" 
                            title={site.landmark ? `${site.landmark} • ${site.province}` : site.province}
                          >
                            {site.landmark ? `${site.landmark} • ` : ''}{site.province}
                          </span>
                        </div>
                      </td>

                      {/* 3. MODEL */}
                      <td className="px-3 py-3 overflow-hidden align-middle">
                        <div className="flex flex-col min-w-0">
                          <span className={`font-semibold text-slate-900 leading-tight truncate ${
                            isTvMode ? 'text-lg' : 'text-sm'
                          }`} title={modelDisplay}>
                            {modelDisplay}
                          </span>
                          <span className="text-xs text-slate-500 mt-0.5 font-normal truncate">
                            {deviceTypeDisplay}
                          </span>
                        </div>
                      </td>

                      {/* 4. DEVICE SN */}
                      <td className="px-3 py-3 overflow-hidden align-middle">
                        <div className="flex flex-col min-w-0">
                          <span className={`font-mono font-semibold text-slate-900 leading-tight truncate ${
                            isTvMode ? 'text-lg' : 'text-sm'
                          }`} title={deviceSnDisplay}>
                            {deviceSnDisplay}
                          </span>
                          <span className="text-xs text-slate-500 mt-0.5 font-normal truncate">
                            {site.lastKnownIp || 'Hardware SN'}
                          </span>
                        </div>
                      </td>

                      {/* 5. AP / DEVICE */}
                      <td className="px-3 py-3 whitespace-nowrap align-middle text-center">
                        <span className="font-semibold text-slate-900 text-sm sm:text-base">
                          {isAllOffline ? `0/${totalAps} Online` : `${onlineAps}/${totalAps} Online`}
                        </span>
                      </td>

                      {/* 6. DOWNTIME */}
                      <td className="px-3 py-3 whitespace-nowrap align-middle text-center">
                        {isAllOffline || isPartialOffline || site.status === 'Downtime' ? (
                          <span className="font-semibold text-rose-700 text-sm sm:text-base">
                            {site.downtimeDuration || 'Active'}
                          </span>
                        ) : (
                          <span className="text-[#237227] font-semibold text-sm sm:text-base">
                            Online
                          </span>
                        )}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

          {/* PAGINATION CONTROLS FOOTER */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-t border-slate-100 bg-white px-4 py-3 text-xs text-slate-600 shrink-0" style={{ fontFamily: 'Arial, Helvetica, sans-serif' }}>
            {/* Left: Summary & Rows Selector */}
            <div className="flex flex-wrap items-center gap-3">
              <span className="font-normal text-slate-600">
                Showing <strong className="text-slate-900 font-semibold">{startItem}</strong>–<strong className="text-slate-900 font-semibold">{endItem}</strong> of <strong className="text-slate-900 font-semibold">{sortedAndFilteredSites.length}</strong>
              </span>

              <div className="flex items-center gap-1.5 border-l border-slate-200 pl-3">
                <span className="text-slate-500 text-xs font-normal">Rows:</span>
                <select
                  value={rowsPerPage}
                  onChange={(e) => setRowsPerPage(Number(e.target.value))}
                  className="rounded-md border border-slate-200 bg-white px-2 py-0.5 text-xs font-semibold text-slate-800 hover:border-slate-300 focus:border-slate-400 focus:outline-none cursor-pointer"
                  style={{ fontFamily: 'Arial, Helvetica, sans-serif' }}
                >
                  <option value={8}>8</option>
                  <option value={10}>10</option>
                  <option value={15}>15</option>
                  <option value={25}>25</option>
                  <option value={50}>50</option>
                </select>
              </div>
            </div>

            {/* Right: Modern Prev/Next Page Navigation */}
            <div className="flex items-center gap-1.5">
              <button
                onClick={() => setCurrentPage((prev) => Math.max(1, prev - 1))}
                disabled={currentPage === 1}
                className="h-8 px-2.5 rounded-lg border border-slate-200 bg-white text-slate-700 hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed transition-colors cursor-pointer flex items-center gap-1 text-xs font-semibold"
                title="Previous Page"
              >
                <ChevronLeft className="h-3.5 w-3.5" />
                <span>Prev</span>
              </button>

              {/* Page Number Buttons */}
              <div className="flex items-center gap-1 px-1">
                {pageNumbers.map((pageNum, idx) => (
                  typeof pageNum === 'number' ? (
                    <button
                      key={idx}
                      onClick={() => setCurrentPage(pageNum)}
                      className={`min-w-[32px] h-8 rounded-lg text-xs font-semibold transition-colors cursor-pointer ${
                        currentPage === pageNum
                          ? 'bg-[#237227] text-white shadow-2xs'
                          : 'border border-slate-200 bg-white text-slate-700 hover:bg-slate-50'
                      }`}
                      style={{ fontFamily: 'Arial, Helvetica, sans-serif' }}
                    >
                      {pageNum}
                    </button>
                  ) : (
                    <span key={idx} className="px-1 text-xs text-slate-400 font-semibold">
                      ...
                    </span>
                  )
                ))}
              </div>

              <button
                onClick={() => setCurrentPage((prev) => Math.min(totalPages, prev + 1))}
                disabled={currentPage === totalPages}
                className="h-8 px-2.5 rounded-lg border border-slate-200 bg-white text-slate-700 hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed transition-colors cursor-pointer flex items-center gap-1 text-xs font-semibold"
                title="Next Page"
              >
                <span>Next</span>
                <ChevronRight className="h-3.5 w-3.5" />
              </button>
            </div>
          </div>
        </div>
    );

  if (showMap) {
    return (
      <div 
        className="grid grid-cols-1 lg:grid-cols-3 gap-4 lg:gap-5 items-stretch h-full flex-1 min-h-0"
        style={{ fontFamily: 'Arial, Helvetica, sans-serif' }}
      >
        {/* LEFT SIDE: TOPOLOGY MAP (Larger 2/3 Width Column) */}
        <div className="lg:col-span-2 flex flex-col h-full min-h-0">
          <MindanaoMap
            sites={sortedAndFilteredSites}
            onSelectSite={onSelectSite}
            onOpenSiteDetails={onOpenSiteDetails}
            selectedSiteId={selectedSiteId}
            alertingSiteId={alertingSiteId}
            isTvMode={isTvMode}
          />
        </div>

        {/* RIGHT SIDE: TABLE CARD (1/3 Width Column) */}
        <div className="lg:col-span-1 flex flex-col h-full min-h-0">
          {renderTableCard()}
        </div>
      </div>
    );
  }

  return renderTableCard();
};
