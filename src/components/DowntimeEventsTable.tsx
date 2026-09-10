'use client';

import React, { useState, useMemo } from 'react';
import { 
  AlertCircle, 
  AlertTriangle, 
  Clock, 
  Search, 
  Send, 
  Phone, 
  ExternalLink, 
  User, 
  MapPin, 
  WifiOff
} from 'lucide-react';
import { DowntimeEvent, AlarmSeverity } from '@/types/dashboard';

interface DowntimeEventsTableProps {
  events: DowntimeEvent[];
  onSelectSite?: (siteName: string) => void;
}

export const DowntimeEventsTable: React.FC<DowntimeEventsTableProps> = ({
  events,
  onSelectSite,
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [severityFilter, setSeverityFilter] = useState<'All' | AlarmSeverity>('All');

  const filteredEvents = useMemo(() => {
    return events.filter((evt) => {
      const matchesSearch =
        evt.siteName.toLowerCase().includes(searchTerm.toLowerCase()) ||
        evt.assignedHandler.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        evt.assignedHandler.telegram.toLowerCase().includes(searchTerm.toLowerCase()) ||
        evt.id.toLowerCase().includes(searchTerm.toLowerCase());

      const matchesSeverity =
        severityFilter === 'All' ? true : evt.severity === severityFilter;

      return matchesSearch && matchesSeverity;
    });
  }, [events, searchTerm, severityFilter]);

  return (
    <div className="flex flex-col rounded-2xl border border-zinc-200/90 bg-white shadow-xs overflow-hidden">
      {/* Table Header Controls */}
      <div className="border-b border-zinc-200/80 p-6">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <div className="flex items-center gap-2.5">
              <span className="flex h-2.5 w-2.5 rounded-full bg-rose-500 animate-pulse" />
              <h2 className="text-base font-bold text-zinc-900">Live Alarm Log: Downtime Events</h2>
              <span className="rounded-full bg-rose-50 border border-rose-200 px-2.5 py-0.5 text-xs font-semibold text-rose-700">
                {filteredEvents.length} Un-cleared Incidents
              </span>
            </div>
            <p className="mt-1 text-xs text-zinc-500">
              Monitoring active un-cleared &ldquo;All device offline&rdquo; events across Ruijie physical infrastructure nodes.
            </p>
          </div>

          {/* Search & Filter */}
          <div className="flex flex-wrap items-center gap-2.5">
            {/* Search Input */}
            <div className="relative min-w-[220px]">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-zinc-400" />
              <input
                type="text"
                placeholder="Search site, handler..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full rounded-xl border border-zinc-200 bg-zinc-50/60 pl-9 pr-3 py-1.5 text-xs text-zinc-900 placeholder-zinc-400 transition-colors focus:border-[#237227] focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#237227]/20"
              />
            </div>

            {/* Severity Filter Buttons */}
            <div className="inline-flex rounded-xl border border-zinc-200 bg-zinc-100/70 p-1 text-xs">
              <button
                onClick={() => setSeverityFilter('All')}
                className={`rounded-lg px-3 py-1 font-semibold transition-all ${
                  severityFilter === 'All'
                    ? 'bg-white text-zinc-900 shadow-xs'
                    : 'text-zinc-600 hover:text-zinc-900'
                }`}
              >
                All
              </button>
              <button
                onClick={() => setSeverityFilter('Critical')}
                className={`flex items-center gap-1.5 rounded-lg px-3 py-1 font-semibold transition-all ${
                  severityFilter === 'Critical'
                    ? 'bg-rose-50 text-rose-700 border border-rose-200 shadow-xs'
                    : 'text-zinc-600 hover:text-rose-600'
                }`}
              >
                <span className="h-1.5 w-1.5 rounded-full bg-rose-500" />
                Critical
              </button>
              <button
                onClick={() => setSeverityFilter('Moderate')}
                className={`flex items-center gap-1.5 rounded-lg px-3 py-1 font-semibold transition-all ${
                  severityFilter === 'Moderate'
                    ? 'bg-amber-50 text-amber-700 border border-amber-200 shadow-xs'
                    : 'text-zinc-600 hover:text-amber-600'
                }`}
              >
                <span className="h-1.5 w-1.5 rounded-full bg-amber-500" />
                Moderate
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Table Element */}
      <div className="overflow-x-auto">
        <table className="w-full text-left text-xs text-zinc-700">
          <thead className="border-b border-zinc-200 bg-zinc-50/80 text-[11px] uppercase tracking-wider text-zinc-500">
            <tr>
              <th scope="col" className="py-3.5 pl-6 pr-3 font-semibold">
                Alarm Type
              </th>
              <th scope="col" className="px-3 py-3.5 font-semibold">
                Severity
              </th>
              <th scope="col" className="px-3 py-3.5 font-semibold">
                Site / Group Name
              </th>
              <th scope="col" className="px-3 py-3.5 font-semibold">
                Generated At
              </th>
              <th scope="col" className="px-3 py-3.5 font-semibold min-w-[240px]">
                Assigned Handler
              </th>
              <th scope="col" className="py-3.5 pl-3 pr-6 text-right font-semibold">
                Contact Info
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-zinc-100">
            {filteredEvents.length === 0 ? (
              <tr>
                <td colSpan={6} className="py-12 text-center">
                  <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-zinc-100 text-zinc-400">
                    <WifiOff className="h-6 w-6" />
                  </div>
                  <h3 className="mt-3 text-sm font-semibold text-zinc-900">No matching alarms found</h3>
                  <p className="mt-1 text-xs text-zinc-500">
                    Try adjusting your search query or severity filter.
                  </p>
                </td>
              </tr>
            ) : (
              filteredEvents.map((event) => (
                <tr
                  key={event.id}
                  onClick={() => onSelectSite && onSelectSite(event.siteName)}
                  className="group transition-colors hover:bg-zinc-50/80 cursor-pointer"
                >
                  {/* Alarm Type */}
                  <td className="py-4 pl-6 pr-3 font-medium whitespace-nowrap">
                    <div className="flex items-center gap-2">
                      <span className="relative flex h-2 w-2">
                        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-rose-400 opacity-75"></span>
                        <span className="relative inline-flex rounded-full h-2 w-2 bg-rose-500"></span>
                      </span>
                      <span className="inline-flex items-center gap-1.5 rounded-lg border border-rose-200 bg-rose-50 px-2.5 py-1 text-xs font-bold text-rose-700">
                        <WifiOff className="h-3.5 w-3.5 text-rose-600" />
                        {event.alarmType}
                      </span>
                    </div>
                    <div className="mt-1 flex items-center gap-1.5 text-[11px] text-zinc-500 pl-4 font-mono">
                      <span>{event.id}</span>
                      <span>•</span>
                      <span>{event.offlineDeviceCount}/{event.deviceCount} Devices Offline</span>
                    </div>
                  </td>

                  {/* Alarm Severity */}
                  <td className="px-3 py-4 whitespace-nowrap">
                    {event.severity === 'Critical' ? (
                      <span className="inline-flex items-center gap-1.5 rounded-lg border border-rose-200 bg-rose-50 px-2.5 py-1 text-xs font-bold text-rose-700">
                        <AlertCircle className="h-3.5 w-3.5 text-rose-600" />
                        Critical
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1.5 rounded-lg border border-amber-200 bg-amber-50 px-2.5 py-1 text-xs font-bold text-amber-700">
                        <AlertTriangle className="h-3.5 w-3.5 text-amber-600" />
                        Moderate
                      </span>
                    )}
                  </td>

                  {/* Site / Group Name */}
                  <td className="px-3 py-4">
                    <div className="flex flex-col">
                      <span className="font-bold text-zinc-900 group-hover:text-[#237227] transition-colors">
                        {event.siteName}
                      </span>
                      <div className="mt-0.5 flex items-center gap-2 text-[11px] text-zinc-500">
                        <span className="flex items-center gap-1">
                          <MapPin className="h-3 w-3 text-zinc-400" />
                          Ruijie DICT Node
                        </span>
                        <span>•</span>
                        <span className="font-mono text-zinc-500">IP: {event.lastKnownIp}</span>
                      </div>
                    </div>
                  </td>

                  {/* Generated At */}
                  <td className="px-3 py-4 whitespace-nowrap">
                    <div className="flex flex-col">
                      <div className="flex items-center gap-1 text-zinc-800 font-medium font-mono">
                        <Clock className="h-3 w-3 text-zinc-400" />
                        {event.generatedAt}
                      </div>
                      <span className="text-[11px] font-semibold text-rose-600">
                        {event.relativeTime}
                      </span>
                    </div>
                  </td>

                  {/* Assigned Handler: Only Name and Telephone / Mobile Number */}
                  <td className="px-3 py-4">
                    <div className="flex flex-col gap-1">
                      <span className="font-bold text-zinc-900 text-xs">
                        {event.assignedHandler.name}
                      </span>
                      <a
                        href={`tel:${event.assignedHandler.phone.replace(/[\s-]/g, '')}`}
                        onClick={(e) => e.stopPropagation()}
                        className="inline-flex items-center gap-1.5 font-mono text-zinc-600 hover:text-[#237227] text-xs font-medium transition-colors"
                        title="Call contact number"
                      >
                        <Phone className="h-3 w-3 text-zinc-400" />
                        <span>{event.assignedHandler.phone}</span>
                      </a>
                    </div>
                  </td>

                  {/* Actions: View Contact Details */}
                  <td className="py-4 pl-3 pr-6 text-right whitespace-nowrap">
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        if (onSelectSite) onSelectSite(event.siteName);
                      }}
                      className="inline-flex items-center gap-1.5 rounded-xl border border-zinc-200 bg-white px-3 py-1.5 text-xs font-bold text-zinc-700 shadow-xs hover:border-[#237227] hover:bg-[#237227] hover:text-white transition-all cursor-pointer"
                      title="View contact person details"
                    >
                      <User className="h-3.5 w-3.5" />
                      <span>View Contact</span>
                    </button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Table Footer / Summary */}
      <div className="flex items-center justify-between border-t border-zinc-200 bg-zinc-50/70 px-6 py-3.5 text-xs text-zinc-500">
        <div className="flex items-center gap-2 font-medium">
          <span>Showing {filteredEvents.length} of {events.length} active alarm logs</span>
        </div>
        <div className="flex items-center gap-3">
          <span className="inline-flex items-center gap-1.5 text-zinc-500">
            <span className="h-2 w-2 rounded-full bg-rose-500" />
            Click any row to open the contact person info & details
          </span>
        </div>
      </div>
    </div>
  );
};
