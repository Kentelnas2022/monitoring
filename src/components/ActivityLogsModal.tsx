'use client';

import React, { useState } from 'react';
import { 
  X, 
  Activity, 
  AlertTriangle, 
  Send, 
  UserCheck, 
  CheckCircle2, 
  Clock,
  Filter,
  CheckCheck,
  Trash2
} from 'lucide-react';
import { ActivityLog } from '@/types/dashboard';

interface ActivityLogsModalProps {
  isOpen: boolean;
  onClose: () => void;
  logs: ActivityLog[];
  onClearLogs?: () => void;
}

export const ActivityLogsModal: React.FC<ActivityLogsModalProps> = ({
  isOpen,
  onClose,
  logs,
  onClearLogs,
}) => {
  const [filterType, setFilterType] = useState<string>('all');
  const [markedRead, setMarkedRead] = useState<boolean>(false);

  if (!isOpen) return null;

  const filteredLogs = logs.filter((log) => {
    if (filterType === 'all') return true;
    if (filterType === 'outage') return log.type === 'outage';
    if (filterType === 'telegram') return log.type === 'telegram';
    if (filterType === 'assignment') return log.type === 'assignment';
    return true;
  });

  const getLogIcon = (type: ActivityLog['type']) => {
    switch (type) {
      case 'outage':
        return <AlertTriangle className="h-4 w-4 text-rose-600" />;
      case 'telegram':
        return <Send className="h-4 w-4 text-[#229ED9]" />;
      case 'assignment':
        return <UserCheck className="h-4 w-4 text-[#237227]" />;
      case 'recovery':
        return <CheckCircle2 className="h-4 w-4 text-emerald-600" />;
      default:
        return <Activity className="h-4 w-4 text-zinc-500" />;
    }
  };

  const getLogBadge = (type: ActivityLog['type']) => {
    switch (type) {
      case 'outage':
        return (
          <span className="inline-flex items-center gap-1 rounded-full bg-rose-50 px-2 py-0.5 text-[11px] font-semibold text-rose-700 border border-rose-200">
            <span className="h-1.5 w-1.5 rounded-full bg-rose-600" />
            Outage
          </span>
        );
      case 'telegram':
        return (
          <span className="inline-flex items-center gap-1 rounded-full bg-sky-50 px-2 py-0.5 text-[11px] font-semibold text-[#0088cc] border border-sky-200">
            <span className="h-1.5 w-1.5 rounded-full bg-[#0088cc]" />
            Telegram Alert
          </span>
        );
      case 'assignment':
        return (
          <span className="inline-flex items-center gap-1 rounded-full bg-[#eaf3eb] px-2 py-0.5 text-[11px] font-semibold text-[#237227] border border-[#237227]/30">
            <span className="h-1.5 w-1.5 rounded-full bg-[#237227]" />
            Field Assigned
          </span>
        );
      case 'recovery':
        return (
          <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2 py-0.5 text-[11px] font-semibold text-emerald-700 border border-emerald-200">
            <span className="h-1.5 w-1.5 rounded-full bg-emerald-600" />
            Restored
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center gap-1 rounded-full bg-zinc-100 px-2 py-0.5 text-[11px] font-semibold text-zinc-700 border border-zinc-200">
            System
          </span>
        );
    }
  };

  return (
    <div 
      className="fixed inset-0 z-[9999] flex items-center justify-center p-4 sm:p-6 bg-black/50 backdrop-blur-xs animate-in fade-in duration-150"
      onClick={onClose}
    >
      <div 
        className="relative w-full max-w-2xl bg-white rounded-2xl shadow-2xl border border-zinc-200 flex flex-col max-h-[85vh] overflow-hidden animate-in zoom-in-95 duration-150"
        style={{ fontFamily: 'Arial, Helvetica, sans-serif' }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="px-6 py-4 border-b border-zinc-200 flex items-center justify-between bg-zinc-50/70">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-[#eaf3eb] text-[#237227]">
              <Activity className="h-5 w-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base sm:text-lg font-bold text-zinc-900 leading-tight">
                  System Activity Logs
                </h2>
                <span className="px-2 py-0.5 text-[11px] font-mono font-bold bg-[#237227] text-white rounded-full">
                  {logs.length}
                </span>
              </div>
              <p className="text-xs text-zinc-500 mt-0.5">
                Real-time tracking of monitoring events, personnel dispatches, and outage alerts
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-lg text-zinc-400 hover:text-zinc-700 hover:bg-zinc-200/60 transition-colors cursor-pointer"
            title="Close"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Filter Toolbar */}
        <div className="px-6 py-2.5 border-b border-zinc-100 bg-white flex flex-wrap items-center justify-between gap-2 text-xs">
          <div className="flex items-center gap-1.5">
            <Filter className="h-3.5 w-3.5 text-zinc-400 mr-1" />
            <button
              type="button"
              onClick={() => setFilterType('all')}
              className={`px-2.5 py-1 rounded-lg font-semibold transition-colors cursor-pointer ${
                filterType === 'all'
                  ? 'bg-zinc-900 text-white'
                  : 'bg-zinc-100 text-zinc-600 hover:bg-zinc-200'
              }`}
            >
              All ({logs.length})
            </button>
            <button
              type="button"
              onClick={() => setFilterType('outage')}
              className={`px-2.5 py-1 rounded-lg font-semibold transition-colors cursor-pointer ${
                filterType === 'outage'
                  ? 'bg-rose-600 text-white'
                  : 'bg-zinc-100 text-zinc-600 hover:bg-zinc-200'
              }`}
            >
              Outages
            </button>
            <button
              type="button"
              onClick={() => setFilterType('telegram')}
              className={`px-2.5 py-1 rounded-lg font-semibold transition-colors cursor-pointer ${
                filterType === 'telegram'
                  ? 'bg-[#0088cc] text-white'
                  : 'bg-zinc-100 text-zinc-600 hover:bg-zinc-200'
              }`}
            >
              Telegram Alerts
            </button>
            <button
              type="button"
              onClick={() => setFilterType('assignment')}
              className={`px-2.5 py-1 rounded-lg font-semibold transition-colors cursor-pointer ${
                filterType === 'assignment'
                  ? 'bg-[#237227] text-white'
                  : 'bg-zinc-100 text-zinc-600 hover:bg-zinc-200'
              }`}
            >
              Assignments
            </button>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setMarkedRead(true)}
              className="inline-flex items-center gap-1 text-[11px] font-medium text-zinc-500 hover:text-zinc-800 transition-colors cursor-pointer"
            >
              <CheckCheck className="h-3.5 w-3.5" />
              <span>{markedRead ? 'All Read' : 'Mark all read'}</span>
            </button>
            {onClearLogs && (
              <button
                type="button"
                onClick={onClearLogs}
                className="inline-flex items-center gap-1 text-[11px] font-medium text-rose-500 hover:text-rose-700 transition-colors cursor-pointer"
              >
                <Trash2 className="h-3.5 w-3.5" />
                <span>Clear</span>
              </button>
            )}
          </div>
        </div>

        {/* Log List */}
        <div className="flex-1 overflow-y-auto divide-y divide-zinc-100 p-2 sm:p-4 space-y-2">
          {filteredLogs.length === 0 ? (
            <div className="py-12 text-center text-zinc-400">
              <Activity className="h-8 w-8 mx-auto text-zinc-300 mb-2" />
              <p className="text-sm font-semibold text-zinc-600">No activity logs recorded</p>
              <p className="text-xs text-zinc-400 mt-1">Updates on downtime alarms and dispatches will appear here.</p>
            </div>
          ) : (
            filteredLogs.map((log) => (
              <div 
                key={log.id} 
                className="p-3 sm:p-3.5 rounded-xl hover:bg-zinc-50 transition-colors border border-transparent hover:border-zinc-200/70"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-start gap-3">
                    <div className="p-2 rounded-lg bg-zinc-100 shrink-0 mt-0.5">
                      {getLogIcon(log.type)}
                    </div>
                    <div>
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="text-xs sm:text-sm font-bold text-zinc-900">
                          {log.title}
                        </span>
                        {getLogBadge(log.type)}
                      </div>

                      <p className="text-xs text-zinc-600 mt-1 leading-relaxed">
                        {log.description}
                      </p>

                      <div className="flex flex-wrap items-center gap-2 mt-2 text-[11px]">
                        {log.siteCode && (
                          <span className="font-mono px-1.5 py-0.5 rounded bg-zinc-100 text-zinc-700 font-semibold border border-zinc-200">
                            {log.siteCode}
                          </span>
                        )}
                        {log.siteName && (
                          <span className="text-zinc-500 font-medium truncate max-w-xs">
                            {log.siteName}
                          </span>
                        )}
                        {log.personName && (
                          <span className="text-zinc-700 font-semibold inline-flex items-center gap-1">
                            <span className="text-zinc-400">•</span> Assigned: {log.personName}
                          </span>
                        )}
                        {log.telegramUsername && (
                          <span className="font-mono text-[#0088cc] font-medium">
                            (@{log.telegramUsername})
                          </span>
                        )}
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-1 text-[11px] text-zinc-400 shrink-0 whitespace-nowrap">
                    <Clock className="h-3 w-3" />
                    <span>{log.timestamp}</span>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-3 border-t border-zinc-200 bg-zinc-50/70 flex items-center justify-between text-xs text-zinc-500">
          <span>DICT-Ruijie Realtime Telemetry Feed</span>
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-1.5 bg-[#237227] hover:bg-[#1b5b1f] text-white font-semibold rounded-lg shadow-xs transition-colors cursor-pointer"
          >
            Done
          </button>
        </div>
      </div>
    </div>
  );
};
