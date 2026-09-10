'use client';

import React, { useState, useMemo } from 'react';
import { 
  Search, 
  MapPin, 
  Send, 
  Phone, 
  CheckCircle2, 
  AlertTriangle, 
  Tv, 
  Layers, 
  Globe
} from 'lucide-react';
import { SiteInfrastructure, SiteStatus } from '@/types/dashboard';

interface ProjectGridProps {
  sites: SiteInfrastructure[];
  onSelectSite: (site: SiteInfrastructure) => void;
  isTvMode?: boolean;
  onToggleTvMode?: () => void;
}

export const ProjectGrid: React.FC<ProjectGridProps> = ({
  sites,
  onSelectSite,
  isTvMode = false,
  onToggleTvMode,
}) => {
  const [statusFilter, setStatusFilter] = useState<'All' | SiteStatus>('All');
  const [selectedProvince, setSelectedProvince] = useState<string>('All');
  const [searchQuery, setSearchQuery] = useState<string>('');

  // Extract unique provinces
  const provinces = useMemo(() => {
    const set = new Set<string>();
    sites.forEach((s) => set.add(s.province));
    return ['All', ...Array.from(set).sort()];
  }, [sites]);

  // Status Counts
  const counts = useMemo(() => {
    return {
      all: sites.length,
      downtime: sites.filter((s) => s.status === 'Downtime').length,
      operational: sites.filter((s) => s.status === 'Operational').length,
      maintenance: sites.filter((s) => s.status === 'Maintenance').length,
    };
  }, [sites]);

  // Filtered sites
  const filteredSites = useMemo(() => {
    return sites.filter((s) => {
      const matchesStatus = statusFilter === 'All' ? true : s.status === statusFilter;
      const matchesProvince = selectedProvince === 'All' ? true : s.province === selectedProvince;
      const q = searchQuery.toLowerCase();
      const matchesQuery =
        s.name.toLowerCase().includes(q) ||
        s.code.toLowerCase().includes(q) ||
        (s.municipality && s.municipality.toLowerCase().includes(q)) ||
        (s.landmark && s.landmark.toLowerCase().includes(q)) ||
        s.assignedHandler.name.toLowerCase().includes(q) ||
        s.assignedHandler.telegram.toLowerCase().includes(q) ||
        s.province.toLowerCase().includes(q) ||
        s.lastKnownIp.includes(q);

      return matchesStatus && matchesProvince && matchesQuery;
    });
  }, [sites, statusFilter, selectedProvince, searchQuery]);

  return (
    <div className="flex flex-col space-y-5">
      {/* Top Filter and Controls Bar */}
      <div className="rounded-2xl border border-zinc-200 bg-white p-5 shadow-xs">
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
          {/* Status Filter Tabs */}
          <div className="flex flex-wrap items-center gap-2">
            <button
              onClick={() => setStatusFilter('All')}
              className={`flex items-center gap-2 rounded-xl px-3.5 py-2 text-xs font-bold transition-all cursor-pointer ${
                statusFilter === 'All'
                  ? 'bg-zinc-900 text-white shadow-xs'
                  : 'bg-zinc-100 text-zinc-700 hover:bg-zinc-200'
              }`}
            >
              <Layers className="h-3.5 w-3.5" />
              <span>All Projects</span>
              <span className={`rounded-full px-2 py-0.2 text-[10px] ${
                statusFilter === 'All' ? 'bg-zinc-800 text-white' : 'bg-zinc-200 text-zinc-800'
              }`}>
                {counts.all}
              </span>
            </button>

            {/* Downtime Filter */}
            <button
              onClick={() => setStatusFilter('Downtime')}
              className={`flex items-center gap-2 rounded-xl px-3.5 py-2 text-xs font-bold transition-all cursor-pointer ${
                statusFilter === 'Downtime'
                  ? 'bg-rose-700 text-white shadow-xs'
                  : 'bg-rose-50 text-rose-700 border border-rose-200 hover:bg-rose-100'
              }`}
            >
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-rose-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-rose-500"></span>
              </span>
              <span>Downtime</span>
              <span className={`rounded-full px-2 py-0.2 text-[10px] ${
                statusFilter === 'Downtime' ? 'bg-rose-800 text-white' : 'bg-rose-200/80 text-rose-800'
              }`}>
                {counts.downtime}
              </span>
            </button>

            {/* Operational Filter */}
            <button
              onClick={() => setStatusFilter('Operational')}
              className={`flex items-center gap-2 rounded-xl px-3.5 py-2 text-xs font-bold transition-all cursor-pointer ${
                statusFilter === 'Operational'
                  ? 'bg-[#237227] text-white shadow-xs'
                  : 'bg-[#237227]/10 text-[#237227] border border-[#237227]/20 hover:bg-[#237227]/20'
              }`}
            >
              <CheckCircle2 className="h-3.5 w-3.5" />
              <span>Operational</span>
              <span className={`rounded-full px-2 py-0.2 text-[10px] ${
                statusFilter === 'Operational' ? 'bg-[#1b5b1f] text-white' : 'bg-[#237227]/20 text-[#237227]'
              }`}>
                {counts.operational}
              </span>
            </button>

            {/* Maintenance Filter */}
            <button
              onClick={() => setStatusFilter('Maintenance')}
              className={`flex items-center gap-2 rounded-xl px-3.5 py-2 text-xs font-bold transition-all cursor-pointer ${
                statusFilter === 'Maintenance'
                  ? 'bg-amber-600 text-white shadow-xs'
                  : 'bg-amber-50 text-amber-700 border border-amber-200 hover:bg-amber-100'
              }`}
            >
              <AlertTriangle className="h-3.5 w-3.5" />
              <span>Maintenance</span>
              <span className="rounded-full bg-amber-200/80 px-2 py-0.2 text-[10px] text-amber-900">
                {counts.maintenance}
              </span>
            </button>
          </div>

          {/* Search, Province Selector & TV Mode Toggle */}
          <div className="flex flex-wrap items-center gap-3">
            {/* Search Input */}
            <div className="relative min-w-[210px] flex-1 sm:flex-initial">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-zinc-400" />
              <input
                type="text"
                placeholder="Search projects, IP, handler..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full rounded-xl border border-zinc-200 bg-zinc-50/70 pl-9 pr-3 py-1.5 text-xs text-zinc-900 placeholder-zinc-400 focus:border-[#237227] focus:bg-white focus:outline-none focus:ring-1 focus:ring-[#237227]"
              />
            </div>

            {/* Province Selector */}
            <select
              value={selectedProvince}
              onChange={(e) => setSelectedProvince(e.target.value)}
              className="rounded-xl border border-zinc-200 bg-zinc-50/70 px-3 py-1.5 text-xs font-semibold text-zinc-700 focus:border-[#237227] focus:outline-none cursor-pointer"
            >
              {provinces.map((prov) => (
                <option key={prov} value={prov}>
                  {prov === 'All' ? 'All Provinces' : prov}
                </option>
              ))}
            </select>

            {/* TV Screen Mode Toggle */}
            {onToggleTvMode && (
              <button
                onClick={onToggleTvMode}
                className={`flex items-center gap-1.5 rounded-xl border px-3.5 py-1.5 text-xs font-bold transition-all cursor-pointer ${
                  isTvMode
                    ? 'border-[#237227] bg-[#237227] text-white shadow-xs'
                    : 'border-zinc-200 bg-white text-zinc-700 hover:border-zinc-300 hover:bg-zinc-50'
                }`}
                title="Toggle TV screen mode"
              >
                <Tv className="h-3.5 w-3.5" />
                <span>{isTvMode ? 'TV Mode Active' : 'TV Screen View'}</span>
              </button>
            )}
          </div>
        </div>

        {/* Informational Sub-bar */}
        <div className="mt-3.5 flex flex-wrap items-center justify-between border-t border-zinc-100 pt-3 text-xs text-zinc-500">
          <div className="flex items-center gap-2">
            <span className="font-semibold text-zinc-800">Showing {filteredSites.length} of {sites.length} Projects</span>
            <span className="hidden sm:inline">• Click any card to inspect full details or dispatch</span>
          </div>
          <div className="flex items-center gap-3 font-medium">
            <span className="flex items-center gap-1 text-rose-700">
              <span className="h-2 w-2 rounded-full bg-rose-500" />
              Downtime: {counts.downtime}
            </span>
            <span className="flex items-center gap-1 text-[#237227]">
              <span className="h-2 w-2 rounded-full bg-[#237227]" />
              Operational: {counts.operational}
            </span>
          </div>
        </div>
      </div>

      {/* Projects Matrix Grid: Clean, Modern, Minimalist Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
        {filteredSites.map((site) => {
          const isDowntime = site.status === 'Downtime';
          const isMaint = site.status === 'Maintenance';

          return (
            <div
              key={site.id}
              onClick={() => onSelectSite(site)}
              className={`group flex flex-col justify-between rounded-2xl bg-white p-5 border transition-all duration-200 cursor-pointer shadow-xs hover:shadow-md hover:-translate-y-0.5 ${
                isDowntime
                  ? 'border-rose-200/90 hover:border-rose-300'
                  : isMaint
                  ? 'border-amber-200 hover:border-amber-300'
                  : 'border-zinc-200 hover:border-zinc-300'
              }`}
            >
              {/* Top Row: Status & Site Code */}
              <div className="flex items-center justify-between gap-2">
                {isDowntime ? (
                  /* Natural red downtime badge */
                  <span className="inline-flex items-center gap-1.5 rounded-full border border-rose-200 bg-rose-50 px-2.5 py-0.5 text-xs font-semibold text-rose-700">
                    <span className="relative flex h-2 w-2">
                      <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-rose-400 opacity-75"></span>
                      <span className="relative inline-flex rounded-full h-2 w-2 bg-rose-500"></span>
                    </span>
                    <span>All Offline</span>
                  </span>
                ) : isMaint ? (
                  <span className="inline-flex items-center gap-1 rounded-full border border-amber-200 bg-amber-50 px-2.5 py-0.5 text-xs font-semibold text-amber-700">
                    <AlertTriangle className="h-3 w-3" />
                    <span>Maintenance</span>
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1 rounded-full border border-[#237227]/20 bg-[#237227]/10 px-2.5 py-0.5 text-xs font-semibold text-[#237227]">
                    <CheckCircle2 className="h-3 w-3" />
                    <span>Operational</span>
                  </span>
                )}

                <span className="text-xs font-mono font-bold text-zinc-400">
                  {site.code}
                </span>
              </div>

              {/* Middle Section: Project Name & Location */}
              <div className="mt-3.5 space-y-1">
                <h4 className="text-sm font-bold text-zinc-900 group-hover:text-[#237227] transition-colors line-clamp-2 leading-snug">
                  {site.name}
                </h4>

                <div className="flex items-center gap-1.5 text-xs text-zinc-500">
                  <MapPin className="h-3.5 w-3.5 text-[#237227] shrink-0" />
                  <span className="truncate font-medium text-zinc-700" title={`${site.landmark ? site.landmark + ' • ' : ''}${site.municipality || site.province}, ${site.province}`}>
                    {site.municipality ? `${site.municipality}, ` : ''}{site.province}
                  </span>
                </div>
              </div>

              {/* IP & Offline Telemetry Strip */}
              <div className="mt-3.5 rounded-xl border border-zinc-100 bg-zinc-50/70 px-3 py-2 text-xs flex items-center justify-between">
                <div className="flex items-center gap-1.5 text-zinc-600 font-mono">
                  <Globe className="h-3.5 w-3.5 text-zinc-400" />
                  <span>{site.lastKnownIp}</span>
                </div>

                {isDowntime ? (
                  <div className="flex items-center gap-1.5 font-semibold text-rose-700">
                    <span>{site.offlineCount}/{site.deviceCount} Offline</span>
                    {(site.apOffline || 0) > 0 && (
                      <span className="text-[10px] px-1 py-0.2 rounded bg-rose-100 text-rose-800 font-bold">
                        {site.apOffline} AP down
                      </span>
                    )}
                    {site.downtimeDuration && (
                      <span className="font-mono text-[11px] text-zinc-500">({site.downtimeDuration})</span>
                    )}
                  </div>
                ) : (
                  <span className="font-semibold text-[#237227] flex items-center gap-1">
                    <span>{site.onlineCount}/{site.deviceCount} Online</span>
                    {(site.apCount || 0) > 0 && (
                      <span className="text-[10px] font-normal text-emerald-700">({site.apCount} APs)</span>
                    )}
                  </span>
                )}
              </div>

              {/* Contact Information: Only Name and Telephone / Mobile Number */}
              <div className="mt-3.5 pt-3 border-t border-zinc-100 flex items-center justify-between text-xs">
                <span className="font-bold text-zinc-900 truncate">
                  {site.assignedHandler.name}
                </span>

                <a
                  href={`tel:${site.assignedHandler.phone.replace(/[\s-]/g, '')}`}
                  onClick={(e) => e.stopPropagation()}
                  className="flex items-center gap-1.5 font-mono text-zinc-600 hover:text-[#237227] font-medium shrink-0 transition-colors"
                  title="Call contact number"
                >
                  <Phone className="h-3.5 w-3.5 text-zinc-400" />
                  <span>{site.assignedHandler.phone}</span>
                </a>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
