'use client';

import React, { useEffect } from 'react';
import { 
  LayoutGrid, 
  Send, 
  AlertCircle, 
  Settings, 
  LogOut 
} from 'lucide-react';
import { t } from '@/utils/i18n';

export type NavSection = 'dashboard' | 'receiver' | 'activity' | 'settings';

interface SidebarProps {
  isOpen: boolean;
  onClose: () => void;
  activeSection: NavSection;
  onSelectSection: (section: NavSection) => void;
  onOpenTelegram: () => void;
  onOpenActivityLogs: () => void;
  onOpenSettings?: () => void;
  onLogout: () => void;
  activityCount: number;
  language?: string;
  currentUser?: { fullName?: string; email?: string; role?: string } | null;
}

export const Sidebar: React.FC<SidebarProps> = ({
  isOpen,
  onClose,
  activeSection,
  onSelectSection,
  onOpenTelegram,
  onOpenActivityLogs,
  onOpenSettings,
  onLogout,
  activityCount,
  language = 'English',
  currentUser,
}) => {
  // ESC key listener to close sidebar
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  const handleItemClick = (section: NavSection) => {
    onSelectSection(section);
    onClose();
  };

  return (
    <aside
      className="h-screen w-60 sm:w-64 bg-white border-r border-slate-200/80 flex flex-col justify-between shrink-0 select-none"
      style={{ fontFamily: 'Arial, Helvetica, sans-serif' }}
      onClick={(e) => e.stopPropagation()}
    >
      {/* TOP HEADER: MULTIFACTORS LOGO */}
      <div>
        <div className="h-[72px] border-b border-slate-100 flex items-center justify-center px-4 overflow-hidden">
          <img
            src="/multifactors-logo.png?v=2"
            alt="Multifactors Sales"
            className="h-9 sm:h-10 w-auto object-contain"
          />
        </div>

        {/* NAVIGATION LIST: Dashboard, Receiver, Activity logs, Settings */}
        <nav className="p-3 space-y-2">
          {/* 1. Dashboard */}
          <button
            type="button"
            onClick={() => handleItemClick('dashboard')}
            title={t('navDashboard', language)}
            className={`w-full flex items-center px-3.5 py-3 rounded-2xl gap-3 text-sm transition-all cursor-pointer ${
              activeSection === 'dashboard'
                ? 'bg-[#1e7029] text-white font-bold shadow-xs'
                : 'text-[#334155] hover:text-slate-900 hover:bg-[#f3f6f9] font-medium'
            }`}
          >
            <LayoutGrid className="h-5 w-5 shrink-0" />
            <span className="font-bold text-[14px]">{t('navDashboard', language)}</span>
          </button>

          {/* 2. Designated Area Assignment */}
          <button
            type="button"
            onClick={() => handleItemClick('receiver')}
            title={t('navReceiver', language)}
            className={`w-full flex items-center px-3.5 py-3 rounded-2xl gap-3 text-sm transition-all cursor-pointer ${
              activeSection === 'receiver'
                ? 'bg-[#1e7029] text-white font-bold shadow-xs'
                : 'text-[#334155] hover:text-slate-900 hover:bg-[#f3f6f9] font-medium'
            }`}
          >
            <Send className="h-5 w-5 shrink-0 text-[#556477]" />
            <span className="text-[13px] sm:text-[14px] leading-tight text-left">{t('navReceiver', language)}</span>
          </button>

          {/* 3. Activity logs (with circular amber badge) */}
          <button
            type="button"
            onClick={() => handleItemClick('activity')}
            title={t('navActivity', language)}
            className={`relative w-full flex items-center px-3.5 py-3 rounded-2xl gap-3 text-sm justify-between transition-all cursor-pointer ${
              activeSection === 'activity'
                ? 'bg-[#1e7029] text-white font-bold shadow-xs'
                : 'text-[#334155] hover:text-slate-900 hover:bg-[#f3f6f9] font-medium'
            }`}
          >
            <div className="flex items-center gap-3">
              <AlertCircle className="h-5 w-5 shrink-0 text-[#556477]" />
              <span className="text-[14px]">{t('navActivity', language)}</span>
            </div>

            {/* Circular Amber Badge */}
            {activityCount > 0 && (
              <span className="h-5 w-5 rounded-full bg-[#e89508] text-white text-[11px] font-bold flex items-center justify-center shrink-0 shadow-xs">
                {activityCount}
              </span>
            )}
          </button>

          {/* 4. Settings */}
          <button
            type="button"
            onClick={() => handleItemClick('settings')}
            title={t('navSettings', language)}
            className={`w-full flex items-center px-3.5 py-3 rounded-2xl gap-3 text-sm transition-all cursor-pointer ${
              activeSection === 'settings'
                ? 'bg-[#1e7029] text-white font-bold shadow-xs'
                : 'text-[#334155] hover:text-slate-900 hover:bg-[#f3f6f9] font-medium'
            }`}
          >
            <Settings className="h-5 w-5 shrink-0 text-[#556477]" />
            <span className="text-[14px]">{t('navSettings', language)}</span>
          </button>
        </nav>
      </div>

      {/* 5. BOTTOM SECTION: SIGN OUT */}
      <div className="p-3 border-t border-slate-100/80">
        <button
          type="button"
          onClick={onLogout}
          title={t('navSignOut', language)}
          className="w-full rounded-2xl bg-[#f0f4f8] hover:bg-slate-200/70 border border-slate-200/70 p-2.5 gap-2.5 flex items-center justify-between transition-all cursor-pointer group"
        >
          <div className="flex items-center gap-2.5 min-w-0">
            {/* Dynamic Avatar Circle with initials */}
            <div className="h-8 w-8 rounded-full bg-[#202428] group-hover:bg-[#237227] text-white flex items-center justify-center font-bold text-xs shrink-0 shadow-2xs transition-colors">
              {currentUser?.fullName
                ? currentUser.fullName
                    .replace(/^(Engr\.|Dr\.|Mr\.|Ms\.)\s*/i, '')
                    .split(' ')
                    .filter(Boolean)
                    .map((w) => w[0])
                    .slice(0, 2)
                    .join('')
                    .toUpperCase()
                : 'EM'}
            </div>

            <div className="text-left min-w-0 flex-1">
              <div className="text-xs font-bold text-slate-800 truncate">
                {currentUser?.fullName || 'Engr. Engel Montero'}
              </div>
              <div className="text-[10px] text-slate-500 truncate">
                {currentUser?.role || 'SuperAdmin'}
              </div>
            </div>
          </div>

          <div className="flex items-center text-[#556477] group-hover:text-rose-600 transition-colors shrink-0 pr-1" title={t('navSignOut', language)}>
            <LogOut className="h-4 w-4" />
          </div>
        </button>
      </div>
    </aside>
  );
};
