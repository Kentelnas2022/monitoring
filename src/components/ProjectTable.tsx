'use client';

import React, { useState, useMemo, useEffect, useRef } from 'react';
import { 
  Search, 
  MapPin, 
  CheckCircle2, 
  Globe, 
  Wifi,
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
}

export const ProjectTable: React.FC<ProjectTableProps> = ({
  sites,
  onSelectSite,
  onOpenSiteDetails,
  selectedSiteId,
  alertingSiteId,
  isTvMode = false,
  onToggleTvMode,
  statusFilter: controlledStatusFilter,
  onStatusFilterChange,
  onRefresh,
  isRefreshing = false,
  lastSyncedAt,
  onToggleTestOutage,
  isTestOutage = false,
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

  // Filtered and Sorted Sites:
  // Priority order: All Offline (1) -> Offline / Partial (2) -> Online (3)
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
      const matchesQuery =
        s.name.toLowerCase().includes(q) ||
        s.code.toLowerCase().includes(q) ||
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

  // SPLIT LAYOUT: ALIGNED WITH TOP CARDS (LEFT 50% UNDER CARDS 1-2, RIGHT 50% UNDER CARDS 3-4)
  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-3.5 sm:gap-4 items-stretch h-full flex-1 min-h-0">
      {/* LEFT SIDE: MINDANAO, PHILIPPINES TOPOLOGY MAP (ALIGNED WITH TOTAL PROJECTS & ONLINE DEVICES) */}
      <div className="flex flex-col h-full min-h-0">
        <MindanaoMap
          sites={sortedAndFilteredSites}
          onSelectSite={onSelectSite}
          onOpenSiteDetails={onOpenSiteDetails}
          selectedSiteId={selectedSiteId}
          alertingSiteId={alertingSiteId}
          isTvMode={isTvMode}
        />
      </div>

      {/* RIGHT SIDE: FILTER CONTROLS & 4-COLUMN PROJECTS TABLE (ALIGNED WITH OFFLINE DOWN SITES & OFFLINE DEVICES) */}
      <div className="flex flex-col h-full min-h-0 space-y-2.5">
        {/* Top Filter and Controls Bar - Clean, Single Row with Space-Between */}
        <div className="rounded-2xl border border-zinc-200 bg-white p-2.5 sm:px-3.5 sm:py-2.5 shadow-xs shrink-0">
          <div className="flex flex-wrap items-center justify-between gap-2 sm:gap-3">
            {/* Left: Status Selector - Identical to All Provinces, shows real-time device counts */}
            <div className="flex items-center gap-2">
              <select
                value={statusFilter}
                onChange={(e) => handleStatusChange(e.target.value as TableStatusFilter)}
                className="h-9 w-40 sm:w-48 rounded-xl border border-zinc-200 bg-white px-2.5 sm:px-3 text-xs sm:text-sm font-semibold text-zinc-700 focus:border-[#237227] focus:outline-none cursor-pointer shrink-0 shadow-2xs"
              >
                <option value="All">All Projects ({counts.all})</option>
                <option value="All Offline">All Offline ({counts.allOffline})</option>
                <option value="Offline">Offline ({counts.offline})</option>
                <option value="Online">Online ({counts.online} • {counts.onlineDevices} devs)</option>
              </select>
            </div>

            {/* Right: Search & Province Selector & Live Sync Button */}
            <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
              {/* Search Input */}
              <div className="relative w-36 sm:w-40 lg:w-40 xl:w-44">
                <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-zinc-400 pointer-events-none" />
                <input
                  type="text"
                  placeholder="Search projects..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full h-9 rounded-xl border border-zinc-200 bg-white pl-8 pr-2.5 text-xs sm:text-sm text-zinc-900 placeholder-zinc-400 focus:border-[#237227] focus:outline-none focus:ring-1 focus:ring-[#237227] shadow-2xs"
                />
              </div>

              {/* Province Selector */}
              <select
                value={selectedProvince}
                onChange={(e) => setSelectedProvince(e.target.value)}
                className="h-9 w-32 sm:w-36 rounded-xl border border-zinc-200 bg-white px-2.5 sm:px-3 text-xs sm:text-sm font-semibold text-zinc-700 focus:border-[#237227] focus:outline-none cursor-pointer shrink-0 shadow-2xs"
              >
                {provinces.map((prov) => (
                  <option key={prov} value={prov}>
                    {prov === 'All' ? 'All Provinces' : prov}
                  </option>
                ))}
              </select>

              {/* Test 1 Site Down Simulation Button */}
              {onToggleTestOutage && (
                <button
                  type="button"
                  onClick={onToggleTestOutage}
                  title={isTestOutage ? 'Click to restore test site back to online' : 'Simulate 1 site going All Offline to test downtime siren & table status'}
                  className={`h-9 px-2.5 sm:px-3 rounded-xl border flex items-center gap-1.5 text-xs sm:text-sm font-semibold transition-all cursor-pointer shadow-2xs shrink-0 ${
                    isTestOutage
                      ? 'border-rose-300 bg-rose-50 text-rose-700 hover:bg-rose-100 ring-2 ring-rose-300/40 animate-pulse'
                      : 'border-zinc-200 bg-white hover:bg-zinc-50 text-zinc-700 hover:border-amber-400 hover:text-amber-700'
                  }`}
                >
                  <AlertTriangle className={`h-3.5 w-3.5 ${isTestOutage ? 'text-rose-600' : 'text-amber-500'}`} />
                  <span className="hidden sm:inline">{isTestOutage ? 'Restore Online' : 'Test Site Down'}</span>
                </button>
              )}
            </div>
          </div>
        </div>

        {/* RIGHT SIDE: BALANCED 4-COLUMN MASTER PROJECTS TABLE */}
        <div className="flex-1 min-h-0 flex flex-col overflow-hidden rounded-2xl border border-zinc-200 bg-white shadow-xs justify-between">
          <div className="overflow-x-auto overflow-y-auto flex-1 min-h-0 flex flex-col">
            <table className={`w-full table-fixed text-left text-zinc-700 ${isTvMode ? 'text-base' : 'text-sm'}`}>
              <colgroup>
                <col className="w-[105px] sm:w-[110px]" />
                <col className="w-[43%]" />
                <col className="w-[23%]" />
                <col className="w-[34%]" />
              </colgroup>
              <thead className="border-b border-zinc-200 bg-zinc-50 text-[10px] uppercase tracking-wider text-zinc-500 font-bold sticky top-0 z-10 shadow-2xs">
                <tr>
                  <th scope="col" className="py-2 pl-3 pr-2 font-bold whitespace-nowrap">
                    Status
                  </th>
                  <th scope="col" className="px-2.5 py-2 font-bold">
                    Project Name
                  </th>
                  <th scope="col" className="px-2.5 py-2 font-bold">
                    Location
                  </th>
                  <th scope="col" className="px-2.5 py-2 font-bold text-left">
                    IP / Device Health
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-100">
                {paginatedSites.length === 0 ? (
                  <tr>
                    <td colSpan={4} className="py-12 text-center">
                      {isRefreshing ? (
                        <div className="flex flex-col items-center justify-center">
                          <RefreshCw className="h-7 w-7 text-[#237227] animate-spin mb-3" />
                          <h3 className="text-sm font-semibold text-zinc-900">Loading realtime telemetry...</h3>
                          <p className="mt-1 text-xs text-zinc-500">
                            Auto-syncing projects from Ruijie Cloud Open API.
                          </p>
                        </div>
                      ) : (
                        <div>
                          <div className="mx-auto flex h-10 w-10 items-center justify-center rounded-full bg-zinc-100 text-zinc-400">
                            <WifiOff className="h-5 w-5" />
                          </div>
                          <h3 className="mt-2.5 text-sm font-semibold text-zinc-900">No matching projects found</h3>
                          <p className="mt-1 text-xs text-zinc-500">
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
                    const isOnline = site.offlineCount === 0;

                    return (
                      <tr
                        key={site.id}
                        onClick={() => onSelectSite(site)}
                        className={`group transition-colors duration-75 cursor-pointer ${
                          isAllOffline
                            ? 'bg-rose-50/25 hover:bg-rose-50/45'
                            : isPartialOffline
                            ? 'bg-amber-50/20 hover:bg-amber-50/40'
                            : 'hover:bg-zinc-50'
                        }`}
                      >
                        {/* 1. STATUS: Snug, clean badge with zero wasted space */}
                        <td className="py-1.5 pl-3 pr-2 whitespace-nowrap align-middle">
                          {isAllOffline && (
                            <span className="inline-flex items-center gap-1 rounded-full bg-rose-100/90 px-2 py-0.5 text-[10px] font-bold text-rose-700 shadow-2xs">
                              <span className="relative flex h-1.5 w-1.5">
                                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-rose-400 opacity-75"></span>
                                <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-rose-500"></span>
                              </span>
                              <span>All Offline</span>
                            </span>
                          )}
                          {isPartialOffline && (
                            <span className="inline-flex items-center gap-1 rounded-full bg-amber-100/90 px-2 py-0.5 text-[10px] font-bold text-amber-800 shadow-2xs">
                              <span className="relative flex h-1.5 w-1.5">
                                <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-amber-500"></span>
                              </span>
                              <span>Offline</span>
                            </span>
                          )}
                          {isOnline && (
                            <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2 py-0.5 text-[10px] font-bold text-[#237227] border border-emerald-200/50 shadow-2xs">
                              <CheckCircle2 className="h-3 w-3" />
                              <span>Online</span>
                            </span>
                          )}
                        </td>

                        {/* 2. PROJECT NAME */}
                        <td className="px-2.5 py-1.5 overflow-hidden align-middle">
                          <div className="flex flex-col min-w-0">
                            <span className={`font-bold text-zinc-900 group-hover:text-[#237227] transition-colors duration-75 leading-snug truncate ${
                              isTvMode ? 'text-lg' : 'text-xs sm:text-sm'
                            }`} title={site.name}>
                              {site.name}
                            </span>
                            <span className="text-[10px] font-mono font-medium text-zinc-400">
                              {site.code}
                            </span>
                          </div>
                        </td>

                        {/* 3. LOCATION */}
                        <td className="px-2.5 py-1.5 overflow-hidden align-middle">
                          <div className="flex items-center gap-1 text-zinc-700 min-w-0">
                            <MapPin className="h-3.5 w-3.5 text-[#237227] shrink-0" />
                            <div className="flex flex-col min-w-0">
                              <span 
                                className={`font-bold truncate text-zinc-900 leading-tight ${
                                  isTvMode ? 'text-base' : 'text-xs'
                                }`} 
                                title={`${site.landmark ? site.landmark + ' • ' : ''}${site.municipality || site.province}, ${site.province}`}
                              >
                                {site.municipality || site.province}
                              </span>
                              <span 
                                className="text-[10px] font-medium text-zinc-500 truncate" 
                                title={site.landmark ? `${site.landmark} • ${site.province}` : site.province}
                              >
                                {site.landmark ? `${site.landmark} • ` : ''}{site.province}
                              </span>
                            </div>
                          </div>
                        </td>

                        {/* 4. IP & OFFLINE HEALTH */}
                        <td className="px-2.5 py-1.5 whitespace-nowrap overflow-hidden align-middle text-left">
                          <div className="flex flex-col items-start min-w-0">
                            <div className="flex items-center gap-1 font-mono text-zinc-800 font-bold">
                              <Globe className="h-3.5 w-3.5 text-zinc-400 shrink-0" />
                              <span className={isTvMode ? 'text-base font-bold' : 'text-xs'}>{site.lastKnownIp}</span>
                            </div>

                            {/* Granular AP & Device Health status */}
                            {isAllOffline && (
                              <div className="flex items-center gap-1 mt-0.5 flex-wrap">
                                {(site.apCount || 0) > 0 && (
                                  <span className={`inline-flex items-center px-1 py-0.5 rounded font-bold bg-rose-100 text-rose-800 border border-rose-200/60 ${
                                    isTvMode ? 'text-sm' : 'text-[10px]'
                                  }`}>
                                    {site.apOffline || site.apCount}/{site.apCount} AP down
                                  </span>
                                )}
                                {(site.gatewayCount || 0) > 0 && (
                                  <span className={`inline-flex items-center px-1 py-0.5 rounded font-bold bg-rose-100 text-rose-800 border border-rose-200/60 ${
                                    isTvMode ? 'text-sm' : 'text-[10px]'
                                  }`}>
                                    {site.gatewayOffline || site.gatewayCount}/{site.gatewayCount} GW down
                                  </span>
                                )}
                                {(site.apCount || 0) === 0 && (site.gatewayCount || 0) === 0 && (
                                  <span className={`font-semibold text-rose-600 truncate ${
                                    isTvMode ? 'text-sm' : 'text-[10px]'
                                  }`}>
                                    {site.offlineCount}/{site.deviceCount} down
                                  </span>
                                )}
                              </div>
                            )}
                            {isPartialOffline && (
                              <div className="flex items-center gap-1 mt-0.5 flex-wrap">
                                {(site.apCount || 0) > 0 && (
                                  <span className={`inline-flex items-center px-1 py-0.5 rounded font-bold ${
                                    (site.apOffline || 0) > 0 
                                      ? 'bg-amber-100 text-amber-800 border border-amber-200/60' 
                                      : 'bg-emerald-50 text-emerald-700 border border-emerald-200/60'
                                  } ${isTvMode ? 'text-sm' : 'text-[10px]'}`}>
                                    {(site.apOffline || 0) > 0 ? `${site.apOffline}/${site.apCount} AP down` : `${site.apCount} AP ok`}
                                  </span>
                                )}
                                {(site.gatewayCount || 0) > 0 && (
                                  <span className={`inline-flex items-center px-1 py-0.5 rounded font-bold ${
                                    (site.gatewayOffline || 0) > 0 
                                      ? 'bg-rose-100 text-rose-800 border border-rose-200/60' 
                                      : 'bg-emerald-50 text-emerald-700 border border-emerald-200/60'
                                  } ${isTvMode ? 'text-sm' : 'text-[10px]'}`}>
                                    {(site.gatewayOffline || 0) > 0 ? `${site.gatewayOffline}/${site.gatewayCount} GW down` : `${site.gatewayCount} GW ok`}
                                  </span>
                                )}
                                {(site.apCount || 0) === 0 && (site.gatewayCount || 0) === 0 && (
                                  <span className={`font-semibold text-amber-700 truncate ${
                                    isTvMode ? 'text-sm' : 'text-[10px]'
                                  }`}>
                                    {site.offlineCount}/{site.deviceCount} down
                                  </span>
                                )}
                              </div>
                            )}
                            {isOnline && (
                              <div className="flex items-center gap-1 mt-0.5 flex-wrap">
                                <span className={`font-medium text-zinc-500 truncate ${
                                  isTvMode ? 'text-sm' : 'text-[10px]'
                                }`}>
                                  {site.onlineCount}/{site.deviceCount} Online
                                </span>
                                {(site.apCount || 0) > 0 && (
                                  <span className="inline-flex items-center gap-0.5 px-1 py-0.5 rounded text-[10px] font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200/50">
                                    <Wifi className="h-2.5 w-2.5" />
                                    <span>{site.apCount} APs healthy</span>
                                  </span>
                                )}
                              </div>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>

          {/* PAGINATION CONTROLS FOOTER */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-t border-zinc-200 bg-zinc-50/70 px-3.5 py-2 text-xs text-zinc-600 shrink-0">
            {/* Left: Summary and Rows per Page */}
            <div className="flex flex-wrap items-center gap-3">
              <span className="font-medium text-zinc-700">
                <strong className="text-zinc-900 font-bold">{startItem}</strong>–<strong className="text-zinc-900 font-bold">{endItem}</strong> of <strong className="text-zinc-900 font-bold">{sortedAndFilteredSites.length}</strong>
              </span>

              {/* Rows Per Page Dropdown */}
              <div className="flex items-center gap-1.5">
                <span className="text-zinc-400 text-xs">Rows:</span>
                <select
                  value={rowsPerPage}
                  onChange={(e) => setRowsPerPage(Number(e.target.value))}
                  className="rounded-lg border border-zinc-200 bg-white px-2.5 py-1 text-xs sm:text-sm font-semibold text-zinc-800 focus:border-[#237227] focus:outline-none cursor-pointer"
                >
                  <option value={8}>8</option>
                  <option value={10}>10</option>
                  <option value={15}>15</option>
                  <option value={25}>25</option>
                  <option value={50}>50</option>
                </select>
              </div>
            </div>

            {/* Right: Page Navigation Buttons */}
            <div className="flex items-center gap-1.5">
              <button
                onClick={() => setCurrentPage(1)}
                disabled={currentPage === 1}
                className="rounded-lg border border-zinc-200 bg-white p-1.5 text-zinc-600 hover:bg-zinc-100 disabled:opacity-40 disabled:cursor-not-allowed transition-colors duration-75 cursor-pointer"
                title="First Page"
              >
                <ChevronsLeft className="h-4 w-4" />
              </button>

              <button
                onClick={() => setCurrentPage((prev) => Math.max(1, prev - 1))}
                disabled={currentPage === 1}
                className="rounded-lg border border-zinc-200 bg-white p-1.5 text-zinc-600 hover:bg-zinc-100 disabled:opacity-40 disabled:cursor-not-allowed transition-colors duration-75 cursor-pointer"
                title="Previous Page"
              >
                <ChevronLeft className="h-4 w-4" />
              </button>

              {/* Page Number Buttons */}
              <div className="flex items-center gap-1 px-0.5">
                {pageNumbers.map((pageNum) => (
                  <button
                    key={pageNum}
                    onClick={() => setCurrentPage(pageNum)}
                    className={`min-w-[32px] h-8 rounded-lg text-xs sm:text-sm font-bold transition-colors duration-75 cursor-pointer ${
                      currentPage === pageNum
                        ? 'bg-[#237227] text-white shadow-xs'
                        : 'border border-zinc-200 bg-white text-zinc-700 hover:bg-zinc-100'
                    }`}
                  >
                    {pageNum}
                  </button>
                ))}
              </div>

              <button
                onClick={() => setCurrentPage((prev) => Math.min(totalPages, prev + 1))}
                disabled={currentPage === totalPages}
                className="rounded-lg border border-zinc-200 bg-white p-1.5 text-zinc-600 hover:bg-zinc-100 disabled:opacity-40 disabled:cursor-not-allowed transition-colors duration-75 cursor-pointer"
                title="Next Page"
              >
                <ChevronRight className="h-4 w-4" />
              </button>

              <button
                onClick={() => setCurrentPage(totalPages)}
                disabled={currentPage === totalPages}
                className="rounded-lg border border-zinc-200 bg-white p-1.5 text-zinc-600 hover:bg-zinc-100 disabled:opacity-40 disabled:cursor-not-allowed transition-colors duration-75 cursor-pointer"
                title="Last Page"
              >
                <ChevronsRight className="h-4 w-4" />
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
