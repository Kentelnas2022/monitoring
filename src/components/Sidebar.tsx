'use client';

import React, { useEffect } from 'react';
import { 
  LayoutGrid, 
  MapPin,
  Send, 
  AlertCircle, 
  Settings, 
  LogOut,
  Lock
} from 'lucide-react';
import { t } from '@/utils/i18n';

export type NavSection = 'dashboard' | 'monitoring' | 'receiver' | 'activity' | 'settings';

interface SidebarProps {
  isOpen: boolean;
  onClose: () => void;
  activeSection: NavSection;
  onSelectSection: (section: NavSection) => void;
  onOpenTelegram: () => void;
  onOpenActivityLogs: () => void;
  onOpenSettings?: () => void;
  onLogout: () => void;
  onLock?: () => void;
  activityCount: number;
  language?: string;
  currentUser?: { fullName?: string; email?: string; role?: string } | null;
}

export const Sidebar: React.FC<SidebarProps> = ({
  isOpen,
  onClose,
  activeSection,
  onSelectSection,
  onLogout,
  onLock,
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

  const navItems = [
    {
      id: 'dashboard' as NavSection,
      label: t('navDashboard', language),
      icon: LayoutGrid,
    },
    {
      id: 'monitoring' as NavSection,
      label: t('navMonitoring', language),
      icon: MapPin,
    },
    {
      id: 'receiver' as NavSection,
      label: t('navReceiver', language),
      icon: Send,
    },
    {
      id: 'activity' as NavSection,
      label: t('navActivity', language),
      icon: AlertCircle,
      badge: activityCount,
    },
    {
      id: 'settings' as NavSection,
      label: t('navSettings', language),
      icon: Settings,
    },
  ];

  return (
    <aside
      className="h-screen w-56 sm:w-60 bg-white border-r border-slate-200/80 flex flex-col justify-between shrink-0 select-none antialiased shadow-xs"
      onClick={(e) => e.stopPropagation()}
    >
      {/* TOP SECTION: BRAND LOGO & NAVIGATION */}
      <div className="flex flex-col min-h-0">
        {/* BRAND LOGO CONTAINER */}
        <div className="h-16 px-4 flex items-center justify-center border-b border-slate-100/90">
          <div className="flex items-center justify-center overflow-hidden">
            <img
              src="/multifactors-logo.png?v=2"
              alt="Multifactors Sales"
              className="h-8.5 w-auto object-contain transition-transform duration-200 hover:scale-102"
            />
          </div>
        </div>

        {/* NAVIGATION LIST */}
        <nav className="p-3 space-y-1 overflow-y-auto">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = activeSection === item.id;

            return (
              <button
                key={item.id}
                type="button"
                onClick={() => handleItemClick(item.id)}
                title={item.label}
                className={`w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl text-xs sm:text-[13px] transition-all duration-150 cursor-pointer group active:scale-[0.99] ${
                  isActive
                    ? 'bg-[#237227] text-white font-semibold shadow-xs shadow-emerald-950/10'
                    : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100/70 font-medium'
                }`}
              >
                <div className="flex items-center gap-2.5 min-w-0">
                  <Icon
                    className={`h-4 w-4 shrink-0 transition-colors stroke-[1.9] ${
                      isActive
                        ? 'text-white'
                        : 'text-slate-400 group-hover:text-slate-700'
                    }`}
                  />
                  <span className="truncate tracking-tight">{item.label}</span>
                </div>

                {item.badge !== undefined && item.badge > 0 && (
                  <span
                    className={`h-4.5 min-w-4.5 px-1.5 rounded-full text-[10px] font-bold flex items-center justify-center shrink-0 transition-colors ${
                      isActive
                        ? 'bg-white text-[#237227] shadow-2xs'
                        : 'bg-slate-100 text-slate-600 group-hover:bg-slate-200/80 group-hover:text-slate-800'
                    }`}
                  >
                    {item.badge}
                  </span>
                )}
              </button>
            );
          })}
        </nav>
      </div>

      {/* BOTTOM SECTION: USER PROFILE & LOGOUT */}
      <div className="p-3 border-t border-slate-100/90">
        <div className="w-full rounded-2xl bg-slate-50/80 border border-slate-200/60 p-2 flex items-center justify-between transition-all duration-150 hover:bg-slate-100/70">
          <div className="flex items-center gap-2.5 min-w-0">
            {/* Dynamic Avatar Initials */}
            <div className="h-8 w-8 rounded-full bg-slate-900 text-white flex items-center justify-center font-bold text-xs shrink-0 ring-2 ring-white shadow-2xs">
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

            <div className="text-left min-w-0">
              <div className="text-xs font-bold text-slate-900 tracking-tight truncate">
                {currentUser?.fullName || 'Engr. Engel Montero'}
              </div>
              <div className="text-[10px] font-medium text-slate-500 truncate">
                {currentUser?.role || 'SuperAdmin'}
              </div>
            </div>
          </div>

          <div className="flex items-center gap-0.5 shrink-0">
            {onLock && (
              <button
                type="button"
                onClick={onLock}
                title="Lock Session (Auto-Lock)"
                className="p-1.5 rounded-lg text-slate-400 hover:text-emerald-700 hover:bg-emerald-50 transition-colors cursor-pointer"
                aria-label="Lock screen"
              >
                <Lock className="h-4 w-4" />
              </button>
            )}
            <button
              type="button"
              onClick={onLogout}
              title={t('navSignOut', language)}
              className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition-colors cursor-pointer"
              aria-label="Sign out"
            >
              <LogOut className="h-4 w-4" />
            </button>
          </div>
        </div>
      </div>
    </aside>
  );
};
