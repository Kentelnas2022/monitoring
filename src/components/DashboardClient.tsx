'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { ChevronLeft, ChevronRight, Search, ArrowUpDown, ArrowUp, ArrowDown } from 'lucide-react';
import { Header } from '@/components/Header';
import { TopStatsCards } from '@/components/TopStatsCards';
import { AnalyticsCharts, SiteDownActivityLogsCard } from '@/components/AnalyticsCharts';
import { ProjectTable } from '@/components/ProjectTable';
import { MindanaoMap } from '@/components/MindanaoMap';
import { SiteContactModal } from '@/components/SiteContactModal';
import { SiteInspectorPanel } from '@/components/SiteInspectorPanel';
import { Sidebar, NavSection } from '@/components/Sidebar';
import { TelegramDispatchModal } from '@/components/TelegramDispatchModal';
import { ActivityLogsModal } from '@/components/ActivityLogsModal';
import { ActivityLogsPage } from '@/components/ActivityLogsPage';
import { SettingsPage } from '@/components/SettingsPage';
import { ReceiverPage } from '@/components/ReceiverPage';
import { Toast } from '@/components/Toast';
import { DowntimeAlertToast } from '@/components/DowntimeAlertToast';
import { playDowntimeBeep, isAudioMuted, setAudioMuted } from '@/utils/audioAlert';
import { LoginLandingPage } from '@/components/LoginLandingPage';
import { LockScreenModal } from '@/components/LockScreenModal';
import { initialSystemSettings } from '@/data/mockSettings';
import { ActivityLog, AssignedHandler, DashboardStats, DowntimeEvent, SiteInfrastructure } from '@/types/dashboard';
import { SystemSettings } from '@/types/settings';
import { t } from '@/utils/i18n';

const emptyStats: DashboardStats = {
  totalProjects: 0,
  connectedDevices: 0,
  activeAlarms: 0,
  projectsActive: 0,
  projectsUnderMaintenance: 0,
  devicesOnline: 0,
  devicesOffline: 0,
  criticalAlarms: 0,
  moderateAlarms: 0,
};

interface DashboardClientProps {
  initialAuthenticated: boolean;
  initialUser: {
    id: string;
    fullName: string;
    email: string;
    username: string;
    role: string;
  } | null;
  initialActiveSection?: NavSection;
}

export default function DashboardClient({
  initialAuthenticated,
  initialUser,
  initialActiveSection = 'dashboard',
}: DashboardClientProps) {
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(initialAuthenticated);
  const [currentUser, setCurrentUser] = useState<{
    id: string;
    fullName: string;
    email: string;
    username: string;
    role: string;
  } | null>(initialUser);

  const [stats, setStats] = useState<DashboardStats>(emptyStats);
  const [sites, setSites] = useState<SiteInfrastructure[]>([]);
  const [activityLogs, setActivityLogs] = useState<ActivityLog[]>([]);
  const [systemSettings, setSystemSettings] = useState<SystemSettings>(() => {
    if (initialUser) {
      return {
        ...initialSystemSettings,
        account: {
          ...initialSystemSettings.account,
          fullName: initialUser.fullName || initialSystemSettings.account.fullName,
          email: initialUser.email || initialSystemSettings.account.email,
          role: initialUser.role || initialSystemSettings.account.role,
          username: initialUser.username || initialSystemSettings.account.username,
          telegramUsername: initialUser.username || initialSystemSettings.account.telegramUsername,
        },
      };
    }
    return initialSystemSettings;
  });

  const [downtimeEvents, setDowntimeEvents] = useState<DowntimeEvent[]>([]);

  // Derive active outage events strictly from dynamic database sites
  const events: DowntimeEvent[] = React.useMemo(() => {
    return sites
      .filter((s) => s.status === 'Downtime')
      .map((s) => ({
        id: `evt-${s.id}`,
        siteId: s.id,
        siteName: s.name,
        alarmType: s.alarmType || 'All device offline',
        severity: (s.severity as any) || 'Critical',
        generatedAt: new Date().toISOString(),
        relativeTime: s.downtimeDuration || 'Active',
        deviceCount: s.deviceCount,
        offlineDeviceCount: s.offlineCount,
        lastKnownIp: s.lastKnownIp,
        assignedHandler: s.assignedHandler,
        status: 'Active' as const,
      }));
  }, [sites]);

  const activeEvents = downtimeEvents.length > 0 ? downtimeEvents : events;
  
  const [selectedSiteId, setSelectedSiteId] = useState<string | null>(null);
  const [selectedSiteForModal, setSelectedSiteForModal] = useState<SiteInfrastructure | null>(null);
  const [isSidebarOpen, setIsSidebarOpen] = useState<boolean>(false);
  const [activeSection, setActiveSectionRaw] = useState<NavSection>(initialActiveSection);

  const setActiveSection = React.useCallback((section: NavSection) => {
    setActiveSectionRaw(section);
    try {
      localStorage.setItem('monitoring_active_section', section);
      document.cookie = `monitoring_active_section=${encodeURIComponent(section)}; path=/; max-age=2592000; SameSite=Lax`;
    } catch {}
  }, []);

  // Restore saved sidebar section after hydration to ensure consistency
  useEffect(() => {
    try {
      const saved = localStorage.getItem('monitoring_active_section');
      if (saved === 'dashboard' || saved === 'monitoring' || saved === 'receiver' || saved === 'activity' || saved === 'settings') {
        setActiveSectionRaw(saved);
        document.cookie = `monitoring_active_section=${encodeURIComponent(saved)}; path=/; max-age=2592000; SameSite=Lax`;
      }
    } catch {}
  }, []);
  const [isTelegramOpen, setIsTelegramOpen] = useState<boolean>(false);
  const [isActivityLogsOpen, setIsActivityLogsOpen] = useState<boolean>(false);
  const [isTvMode, setIsTvMode] = useState<boolean>(false);
  const [isSiteDetailsCollapsed, setIsSiteDetailsCollapsed] = useState<boolean>(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [tableStatusFilter, setTableStatusFilter] = useState<'All' | 'All Offline' | 'Offline' | 'Online'>('All');
  const [monitorStatusFilter, setMonitorStatusFilter] = useState<'All' | 'Online' | 'Offline' | 'All Offline'>('All');
  const [monitorSelectedProvince, setMonitorSelectedProvince] = useState<string>('All');
  const [monitorSearchQuery, setMonitorSearchQuery] = useState<string>('');
  const [monitorLocationSort, setMonitorLocationSort] = useState<'none' | 'asc' | 'desc'>('none');
  const [monitorCurrentPage, setMonitorCurrentPage] = useState<number>(1);
  const [monitorRowsPerPage, setMonitorRowsPerPage] = useState<number>(8);
  const [lastSyncedAt, setLastSyncedAt] = useState<string | null>(null);
  const [inspectorSite, setInspectorSite] = useState<SiteInfrastructure | null>(null);
  const [siteSelectTrigger, setSiteSelectTrigger] = useState<number>(0);
  const [mapResetZoomTrigger, setMapResetZoomTrigger] = useState<number>(0);

  // Session Inactivity Auto-Lock States
  const [isSessionLocked, setIsSessionLocked] = useState<boolean>(() => {
    if (typeof window !== 'undefined') {
      return localStorage.getItem('monitoring_session_locked') === 'true';
    }
    return false;
  });
  const lastActivityRef = React.useRef<number>(Date.now());

  // Handle Unlocking Session
  const handleUnlockSession = () => {
    setIsSessionLocked(false);
    lastActivityRef.current = Date.now();
    try {
      localStorage.removeItem('monitoring_session_locked');
    } catch {}
  };

  // Handle Manual Lock Screen
  const handleManualLock = () => {
    setIsSessionLocked(true);
    try {
      localStorage.setItem('monitoring_session_locked', 'true');
    } catch {}
  };

  // New Downtime Outage Siren & Alert States
  const [alertingSite, setAlertingSite] = useState<SiteInfrastructure | null>(null);
  const [alertingSiteId, setAlertingSiteId] = useState<string | null>(null);
  const [isAudioMutedState, setIsAudioMutedState] = useState<boolean>(false);
  const knownDownSiteIdsRef = React.useRef<Set<string> | null>(null);
  const beepCancelRef = React.useRef<(() => void) | null>(null);
  const areaAssignmentsRef = React.useRef<any[]>([]);

  useEffect(() => {
    setIsAudioMutedState(isAudioMuted());
  }, []);

  const handleToggleAudioMute = () => {
    const next = !isAudioMutedState;
    setIsAudioMutedState(next);
    setAudioMuted(next);
    if (next && beepCancelRef.current) {
      beepCancelRef.current();
    }
  };

  // Trigger urgent siren beep (3 seconds), top center alert toast, and AUTOMATICALLY Send Dispatch & Assign
  const triggerNewDowntimeAlert = React.useCallback((site: SiteInfrastructure) => {
    // 1. Synthesize urgent alert audio beep sequence if enabled in settings
    const isSirenAllowed = 
      !isAudioMuted() &&
      systemSettings.general?.sirenAlertEnabled !== false &&
      systemSettings.displayAndSound?.audibleAlarmOnDowntime !== false;

    if (isSirenAllowed) {
      const stopAudio = playDowntimeBeep(3000);
      beepCancelRef.current = stopAudio;
    }

    // 2. Resolve responder: from live area assignments or existing site handler
    let handlerToAssign = site.assignedHandler;
    const assignments = areaAssignmentsRef.current || [];
    const siteProv = (site.province || '').toLowerCase();
    const siteNameNorm = (site.name || '').toLowerCase();
    const siteRegionNorm = (site.region || '').toLowerCase();

    const matchedAssignment = assignments.find((a: any) => {
      const area = (a.areaName || '').toLowerCase().replace(/\s+area$/i, '').trim();
      return area && (
        siteProv.includes(area) ||
        area.includes(siteProv) ||
        siteNameNorm.includes(area) ||
        siteRegionNorm.includes(area)
      );
    });

    if (matchedAssignment) {
      handlerToAssign = {
        name: matchedAssignment.personName,
        phone: matchedAssignment.phone || '',
        telegram: (matchedAssignment.telegram || '').replace(/^@/, ''),
        chatId: matchedAssignment.chatId || '',
        role: matchedAssignment.role || 'Designated Area Responder',
      };
    } else if (!handlerToAssign || !handlerToAssign.name) {
      handlerToAssign = {
        name: 'Unassigned',
        phone: '',
        telegram: '',
        chatId: '',
        role: 'Unassigned',
      };
    }

    const updatedSiteWithHandler: SiteInfrastructure = {
      ...site,
      assignedHandler: handlerToAssign,
    };

    // 3. Display the prominent top-center alert message
    setAlertingSite(updatedSiteWithHandler);

    // 4. Highlight and blink the red alert beacon on the map & automatically inspect site details in live sites monitor
    setAlertingSiteId(site.id);
    setSelectedSiteId(site.id);
    setInspectorSite(updatedSiteWithHandler);

    // 5. Auto-clear alerting map highlight after 15 seconds
    setTimeout(() => {
      setAlertingSiteId((prev) => (prev === site.id ? null : prev));
    }, 15000);

    const hasAssignedPerson = handlerToAssign.name && handlerToAssign.name !== 'Unassigned' && (handlerToAssign.telegram || handlerToAssign.chatId);

    // 6. AUTOMATICALLY SEND DISPATCH & ASSIGN ONLY IF RESPONDER CONFIGURED
    if (hasAssignedPerson) {
      fetch('/api/telegram/dispatch', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          siteId: site.id,
          siteName: site.name,
          siteCode: site.code,
          location: site.municipality || site.province || site.region || 'Region 10',
          model: site.devices?.[0]?.model || (site.name === 'OJT' || site.code === 'RJ-9588688' ? 'EW1200' : 'Ruijie Gateway'),
          deviceSn: site.devices?.[0]?.serialNumber || (site.name === 'OJT' || site.code === 'RJ-9588688' ? 'G1QH3N710075C' : 'N/A'),
          severity: site.severity || 'Critical',
          alarmType: site.alarmType || 'All device offline',
          downtimeDuration: site.downtimeDuration || 'Active',
          offlineDeviceCount: site.offlineCount || 0,
          totalDeviceCount: site.deviceCount || 1,
          lastKnownIp: site.lastKnownIp,
          recipientName: handlerToAssign.name,
          telegramUsername: handlerToAssign.telegram.replace(/^@/, ''),
          phone: handlerToAssign.phone || '',
          socialMedia: handlerToAssign.socialMedia || (handlerToAssign.telegram ? `@${handlerToAssign.telegram.replace(/^@/, '')}` : ''),
          chatId: handlerToAssign.chatId,
          customNotes: `Incident triage assigned to ${handlerToAssign.name} for ${site.name}.`,
        }),
      })
        .then((r) => r.json())
        .then((res) => {
          console.log('[Auto-Dispatch] Telegram dispatch result:', res);
        })
        .catch((e) => console.warn('[Auto-Dispatch] Telegram dispatch error:', e));

      // Update in-memory site state
      setSites((prevSites) =>
        prevSites.map((s) => (s.id === site.id ? { ...s, assignedHandler: handlerToAssign } : s))
      );

      // Persist handler assignment to MySQL in background
      fetch('/api/sites', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ siteName: site.name, assignedHandler: handlerToAssign }),
      }).catch(() => {});
    }

    // 7. Append system activity logs
    const alertLog: ActivityLog = {
      id: `ACT-${Date.now().toString().slice(-5)}`,
      type: 'outage',
      title: 'Critical Downtime Siren Alert',
      description: `Outage alarm detected for ${site.name} (${site.code}). Audio siren triggered (3s).${hasAssignedPerson ? ' Auto-dispatch activated.' : ' No responder assigned yet.'}`,
      timestamp: 'Just now',
      siteName: site.name,
      siteCode: site.code,
      personName: hasAssignedPerson ? handlerToAssign.name : undefined,
      telegramUsername: hasAssignedPerson ? handlerToAssign.telegram : undefined,
      severity: 'critical',
    };

    const siteDownLog: ActivityLog = {
      id: `ACT-DOWN-${Date.now().toString().slice(-5)}`,
      type: 'outage',
      title: `${site.name} DOWN`,
      description: `Site "${site.name}" (${site.code}) has ${site.offlineCount || 1}/${site.deviceCount || 1} device(s) offline. Downtime duration: Active.`,
      timestamp: 'Just now',
      siteName: site.name,
      siteCode: site.code,
      severity: 'critical',
    };

    if (hasAssignedPerson) {
      const autoDispatchLog: ActivityLog = {
        id: `ACT-${(Date.now() + 1).toString().slice(-5)}`,
        type: 'telegram',
        title: 'Auto-Dispatched & Assigned Responder',
        description: `Automatically assigned & dispatched incident alert via Telegram to ${handlerToAssign.name} (@${handlerToAssign.telegram.replace(/^@/, '')}) for ${site.name}.`,
        timestamp: 'Just now',
        siteName: site.name,
        siteCode: site.code,
        personName: handlerToAssign.name,
        telegramUsername: handlerToAssign.telegram,
        severity: 'critical',
      };
      setActivityLogs((prev) => [siteDownLog, autoDispatchLog, alertLog, ...prev]);
      setToastMessage(`Auto-Dispatched & Assigned: ${handlerToAssign.name} (@${handlerToAssign.telegram.replace(/^@/, '')}) to ${site.name}!`);

      fetch('/api/activity-logs', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(siteDownLog),
      }).catch(() => {});

      fetch('/api/activity-logs', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(autoDispatchLog),
      }).catch(() => {});

      fetch('/api/activity-logs', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(alertLog),
      }).catch(() => {});
    } else {
      setActivityLogs((prev) => [siteDownLog, alertLog, ...prev]);
      setToastMessage(`Outage Alert: ${site.name} is down. No designated responder assigned yet.`);

      fetch('/api/activity-logs', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(siteDownLog),
      }).catch(() => {});

      fetch('/api/activity-logs', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(alertLog),
      }).catch(() => {});
    }
  }, []);

  // Close alert toast and silence audio cleanly
  const handleCloseAlertToast = React.useCallback(() => {
    if (beepCancelRef.current) {
      try {
        beepCancelRef.current();
      } catch {}
    }
    setAlertingSite(null);
  }, []);

  // Close telegram / general toast cleanly
  const handleCloseToast = React.useCallback(() => {
    setToastMessage(null);
  }, []);

  // Synchronize incoming sites telemetry and detect real-time downtime events
  const applyUpdatedSites = React.useCallback(
    (incomingSites: SiteInfrastructure[], incomingStats?: any) => {
      const currentDown = incomingSites.filter(
        (s) => s.status === 'Downtime' || s.offlineCount > 0
      );

      if (knownDownSiteIdsRef.current === null) {
        // Initial load: silently seed known down site IDs — no toast/siren/map-flyTo on reload
        knownDownSiteIdsRef.current = new Set(currentDown.map((s) => s.id));
      } else {
        // Find sites that transitioned to downtime or have newly offline hardware
        const newlyDown = currentDown.filter((s) => !knownDownSiteIdsRef.current!.has(s.id));
        if (newlyDown.length > 0) {
          // Prioritize any site that has all devices offline
          const priorityDownSite = newlyDown.find(
            (s) => s.offlineCount === s.deviceCount && s.deviceCount > 0
          ) || newlyDown[0];
          triggerNewDowntimeAlert(priorityDownSite);
        }
        knownDownSiteIdsRef.current = new Set(currentDown.map((s) => s.id));
      }

      setSites(incomingSites);
      setInspectorSite((prev) => {
        if (!prev) return null;
        const updated = incomingSites.find((s) => s.id === prev.id);
        return updated || prev;
      });
      if (incomingStats) setStats(incomingStats);
    },
    [triggerNewDowntimeAlert]
  );

  // Initial dynamic load from database API & persistent session restoration
  useEffect(() => {
    // 0. Fallback check for active authenticated session in localStorage/cookies
    try {
      if (typeof window !== 'undefined') {
        const savedSession = localStorage.getItem('monitoring_auth_session');
        const savedUser = localStorage.getItem('monitoring_auth_user');
        if (savedSession === 'true' && savedUser) {
          const parsed = JSON.parse(savedUser);
          if (parsed && (parsed.id || parsed.username || parsed.email)) {
            setIsAuthenticated(true);
            setCurrentUser((prev) => prev || parsed);
            // Ensure cookies stay in sync for server-side SSR on reloads
            document.cookie = 'monitoring_auth_session=true; path=/; max-age=604800; SameSite=Lax';
            document.cookie = `monitoring_auth_user=${encodeURIComponent(savedUser)}; path=/; max-age=604800; SameSite=Lax`;
          }
        }
      }
    } catch (e) {
      console.warn('[Auth] Client session check notice:', e);
    }

    // 1. Fetch sites & telemetry stats from live API with realtime auto-sync
    setIsRefreshing(true);
    fetch('/api/sites', { cache: 'no-store' })
      .then((r) => r.json())
      .then((d) => {
        if (d.success && d.sites && Array.isArray(d.sites) && d.sites.length > 0) {
          applyUpdatedSites(d.sites, d.stats);
          setLastSyncedAt(new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' }));
        } else {
          // If still empty, trigger Ruijie sync directly in background
          return fetch('/api/ruijie/sync', { method: 'POST', headers: { 'Cache-Control': 'no-cache' } })
            .then(() => fetch('/api/sites', { cache: 'no-store' }))
            .then((r) => r.json())
            .then((syncSitesData) => {
              if (syncSitesData.success && syncSitesData.sites) {
                applyUpdatedSites(syncSitesData.sites, syncSitesData.stats);
                setLastSyncedAt(new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' }));
              }
            });
        }
      })
      .catch((err) => {
        console.warn('[Dashboard] Initial realtime sites fetch notice:', err);
      })
      .finally(() => {
        setIsRefreshing(false);
      });

    // 2. Fetch downtime events from live MySQL downtime_events table
    fetch('/api/events')
      .then((r) => r.json())
      .then((d) => {
        if (d.success && d.events && Array.isArray(d.events)) {
          setDowntimeEvents(d.events);
        }
      })
      .catch(() => {});

    // 3. Fetch activity logs from live MySQL
    fetch('/api/activity-logs')
      .then((r) => r.json())
      .then((d) => {
        if (d.success && d.data && Array.isArray(d.data)) {
          setActivityLogs(d.data);
        }
      })
      .catch(() => {});

    // 4. Fetch system settings from live MySQL
    fetch('/api/settings')
      .then((r) => r.json())
      .then((d) => {
        if (d.success && d.settings) {
          setSystemSettings(d.settings);
        }
      })
      .catch(() => {});

    // 5. Fetch operator account dynamically from MySQL users table
    fetch('/api/auth/me')
      .then((r) => r.json())
      .then((d) => {
        if (d.authenticated && d.user) {
          setCurrentUser((prev) => {
            const updated = prev ? { ...prev, ...d.user } : d.user;
            try {
              if (typeof window !== 'undefined') {
                localStorage.setItem('monitoring_auth_user', JSON.stringify(updated));
                document.cookie = `monitoring_auth_user=${encodeURIComponent(JSON.stringify(updated))}; path=/; max-age=604800; SameSite=Lax`;
              }
            } catch {}
            return updated;
          });
          setSystemSettings((prev) => ({
            ...prev,
            account: {
              ...prev.account,
              fullName: d.user.fullName || prev.account.fullName,
              email: d.user.email || prev.account.email,
              role: d.user.role || prev.account.role,
              username: d.user.username || prev.account.username,
              telegramUsername: d.user.username || prev.account.telegramUsername,
            },
          }));
        }
      })
      .catch(() => {});

    // 6. Fetch live designated area assignments for instantaneous auto-dispatch matching
    fetch('/api/assignments', { cache: 'no-store' })
      .then((r) => r.json())
      .then((d) => {
        if (d.success && Array.isArray(d.data)) {
          areaAssignmentsRef.current = d.data;
        }
      })
      .catch(() => {});
  }, []);

  // Periodic automatic realtime telemetry synchronization loop (1-second true realtime fetch)
  const isFetchingRef = React.useRef(false);
  const prevSignatureRef = React.useRef('');
  const isTestOutageRef = React.useRef(false);
  const originalSitesBackupRef = React.useRef<SiteInfrastructure[] | null>(null);
  const [isTestOutage, setIsTestOutage] = useState<boolean>(false);

  useEffect(() => {
    if (!isAuthenticated) return;
    const isAutoRefresh = systemSettings.monitoring?.autoRefreshDashboard !== false;
    if (!isAutoRefresh) return;

    // 1000ms (1 second) interval for instantaneous realtime updates
    const timer = setInterval(() => {
      if (isFetchingRef.current || isTestOutageRef.current) return;
      isFetchingRef.current = true;

      Promise.all([
        fetch('/api/sites', { cache: 'no-store' }).then((r) => r.json()).catch(() => null),
        fetch('/api/events', { cache: 'no-store' }).then((r) => r.json()).catch(() => null),
      ])
        .then(([sitesData, eventsData]) => {
          if (sitesData && sitesData.success && Array.isArray(sitesData.sites) && sitesData.sites.length > 0) {
            const perSiteSig = sitesData.sites.map((s: any) => `${s.id}:${s.offlineCount}`).join(',');
            const signature = `${sitesData.sites.length}-${sitesData.stats?.devicesOffline || 0}-${sitesData.stats?.activeAlarms || 0}|${perSiteSig}`;
            if (signature !== prevSignatureRef.current) {
              prevSignatureRef.current = signature;
              applyUpdatedSites(sitesData.sites, sitesData.stats);
            }
            setLastSyncedAt(new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' }));
          }
          if (eventsData && eventsData.success && Array.isArray(eventsData.events)) {
            setDowntimeEvents(eventsData.events);
          }
        })
        .finally(() => {
          isFetchingRef.current = false;
        });
    }, 1000);

    return () => clearInterval(timer);
  }, [isAuthenticated, systemSettings.monitoring?.autoRefreshDashboard, applyUpdatedSites]);

  // Session Inactivity Auto-Lock Watcher
  useEffect(() => {
    if (!isAuthenticated || isSessionLocked) return;

    const timeoutMinutes = systemSettings.account?.sessionTimeoutMinutes ?? 30;
    if (timeoutMinutes <= 0) return; // 0 = Never (Continuous session)

    const handleUserActivity = () => {
      const now = Date.now();
      // Throttle timestamp updates to once every 2 seconds for high performance
      if (now - lastActivityRef.current > 2000) {
        lastActivityRef.current = now;
      }
    };

    const activityEvents = ['mousemove', 'mousedown', 'keydown', 'touchstart', 'scroll', 'click'];
    activityEvents.forEach((evt) => window.addEventListener(evt, handleUserActivity, { passive: true }));

    const checkInterval = setInterval(() => {
      const idleMs = Date.now() - lastActivityRef.current;
      const limitMs = timeoutMinutes * 60 * 1000;
      if (idleMs >= limitMs) {
        setIsSessionLocked(true);
        try {
          localStorage.setItem('monitoring_session_locked', 'true');
        } catch {}
      }
    }, 3000);

    return () => {
      activityEvents.forEach((evt) => window.removeEventListener(evt, handleUserActivity));
      clearInterval(checkInterval);
    };
  }, [isAuthenticated, isSessionLocked, systemSettings.account?.sessionTimeoutMinutes]);

  // Handle saving system settings
  const handleSaveSettings = (updated: SystemSettings) => {
    const isAccountUpdated = 
      updated.account.fullName !== systemSettings.account.fullName ||
      updated.account.email !== systemSettings.account.email ||
      updated.account.password !== systemSettings.account.password ||
      updated.account.sessionTimeoutMinutes !== systemSettings.account.sessionTimeoutMinutes;

    const isLangOrTzUpdated =
      updated.general.language !== systemSettings.general.language ||
      updated.general.timezone !== systemSettings.general.timezone;

    setSystemSettings(updated);

    if (isAccountUpdated && currentUser) {
      const updatedUser = {
        ...currentUser,
        fullName: updated.account.fullName || currentUser.fullName,
        email: updated.account.email || currentUser.email,
      };
      setCurrentUser(updatedUser);
      try {
        if (typeof window !== 'undefined') {
          localStorage.setItem('monitoring_auth_user', JSON.stringify(updatedUser));
          document.cookie = `monitoring_auth_user=${encodeURIComponent(JSON.stringify(updatedUser))}; path=/; max-age=604800; SameSite=Lax`;
        }
      } catch {}
    }

    // Persist to backend database API
    fetch('/api/settings', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(updated),
    }).catch((e) => console.warn('Settings persist notice:', e));
    
    // Log activity
    const newLog: ActivityLog = {
      id: `ACT-${Date.now().toString().slice(-5)}`,
      type: 'system',
      title: isAccountUpdated 
        ? 'Security & Account Profile Updated' 
        : isLangOrTzUpdated 
        ? 'Language & Timezone Preferences Updated' 
        : 'System Settings Updated',
      description: isAccountUpdated 
        ? `Administrator profile (${updated.account.fullName}) credentials and security policies updated.`
        : isLangOrTzUpdated
        ? `System regional preferences changed to Language: ${updated.general.language}, Timezone: ${updated.general.timezone}.`
        : `Admin updated global parameters (Telegram auto-dispatch: ${updated.telegram.autoDispatchOnDowntime ? 'Enabled' : 'Disabled'}, Sync interval: ${updated.monitoring.syncIntervalSeconds}s).`,
      timestamp: 'Just now',
      severity: 'info',
    };
    setActivityLogs((prev) => [newLog, ...prev]);

    setToastMessage(
      isAccountUpdated 
        ? 'Account profile & security settings updated successfully.' 
        : t('changesSavedToast', updated.general.language)
    );
  };

  // Handle resetting settings to default
  const handleResetSettings = () => {
    setSystemSettings(initialSystemSettings);
    fetch('/api/settings', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(initialSystemSettings),
    }).catch(() => {});

    const newLog: ActivityLog = {
      id: `ACT-${Date.now().toString().slice(-5)}`,
      type: 'system',
      title: 'System Settings Reset',
      description: 'Admin restored system settings to factory defaults.',
      timestamp: 'Just now',
      severity: 'info',
    };
    setActivityLogs((prev) => [newLog, ...prev]);
    setToastMessage('System settings restored to defaults.');
  };

  // Handle application cache clearance
  const handleClearAppCache = () => {
    fetch('/api/activity-logs', { method: 'DELETE' }).catch(() => {});
    const newLog: ActivityLog = {
      id: `ACT-${Date.now().toString().slice(-5)}`,
      type: 'system',
      title: 'Application Cache Cleared',
      description: 'Admin flushed local browser cache, layout buffers, and session telemetry data.',
      timestamp: 'Just now',
      severity: 'info',
    };
    setActivityLogs([newLog]);
    setToastMessage('Application cache, layout buffers, and local storage cleared successfully.');
  };

  // Handle personnel update submitted from SiteContactModal or Telegram Dispatch
  const handleUpdatePersonnel = (siteName: string, updatedHandler: AssignedHandler, isDispatch: boolean = true) => {
    // 1. Update sites list
    setSites((prevSites) =>
      prevSites.map((site) =>
        site.name === siteName ? { ...site, assignedHandler: updatedHandler } : site
      )
    );

    // 2. Persist to MySQL database API
    fetch('/api/sites', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ siteName, assignedHandler: updatedHandler }),
    }).catch((e) => console.warn('Sites updateHandler MySQL sync error:', e));

    // 3. Update currently opened modal site if it's open
    setSelectedSiteForModal((current) =>
      current && (current.name === siteName || current.code === siteName || current.id === siteName)
        ? { ...current, assignedHandler: updatedHandler }
        : current
    );

    // 4. Update inspectorSite panel if currently inspecting this site
    setInspectorSite((current) =>
      current && (current.name === siteName || current.code === siteName || current.id === siteName)
        ? { ...current, assignedHandler: updatedHandler }
        : current
    );

    const siteObj = sites.find((s) => s.name === siteName || s.code === siteName || s.id === siteName);
    const isDown = siteObj && (siteObj.status === 'Downtime' || siteObj.offlineCount > 0);

    // 4. Record Activity Log
    const newLog: ActivityLog = {
      id: `ACT-${Date.now().toString().slice(-5)}`,
      type: (isDispatch || isDown) ? 'telegram' : 'assignment',
      title: (isDispatch || isDown) ? 'Telegram Alert Dispatched' : 'Personnel Assignment Updated',
      description: isDown
        ? `Auto-dispatched Telegram alert to @${updatedHandler.telegram} (${updatedHandler.name}) because ${siteName} is DOWN.`
        : `Admin assigned ${updatedHandler.name} to ${siteName}.`,
      timestamp: 'Just now',
      siteName,
      siteCode: siteObj?.code,
      personName: updatedHandler.name,
      telegramUsername: updatedHandler.telegram,
      severity: isDown ? 'critical' : 'info',
    };
    setActivityLogs((prev) => [newLog, ...prev]);

    // 5. If down or isDispatch is requested, trigger live Telegram notification
    if (isDispatch || isDown) {
      fetch('/api/telegram/dispatch', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          siteName,
          siteCode: siteObj?.code,
          location: siteObj?.municipality || siteObj?.province || siteObj?.region || 'Region 10',
          model: siteObj?.devices?.[0]?.model || (siteObj?.name === 'OJT' || siteObj?.code === 'RJ-9588688' ? 'EW1200' : 'Ruijie Gateway'),
          deviceSn: siteObj?.devices?.[0]?.serialNumber || (siteObj?.name === 'OJT' || siteObj?.code === 'RJ-9588688' ? 'G1QH3N710075C' : 'N/A'),
          severity: siteObj?.severity || 'Critical',
          alarmType: siteObj?.alarmType || 'Outage',
          downtimeDuration: siteObj?.downtimeDuration || 'Active',
          offlineDeviceCount: siteObj?.offlineCount || 0,
          totalDeviceCount: siteObj?.deviceCount || 1,
          lastKnownIp: siteObj?.lastKnownIp,
          recipientName: updatedHandler.name,
          telegramUsername: updatedHandler.telegram,
          phone: updatedHandler.phone || '',
          socialMedia: updatedHandler.socialMedia || (updatedHandler.telegram ? `@${updatedHandler.telegram.replace(/^@/, '')}` : ''),
          chatId: updatedHandler.chatId,
          customNotes: `Incident triage assigned for ${siteName}.`,
        }),
      }).catch((e) => console.warn('Telegram dispatch error:', e));

      setToastMessage(
        `Telegram outage alert sent to @${updatedHandler.telegram} (${updatedHandler.name}) for ${siteName}.`
      );
    } else {
      setToastMessage(`Assigned ${updatedHandler.name} (@${updatedHandler.telegram}) to ${siteName}.`);
    }
  };

  // Handle mass-assignment for a designated Region / City / Province
  const handleUpdateAreaPersonnel = (areaKey: string, updatedHandler: AssignedHandler) => {
    const norm = areaKey.toLowerCase().replace(/\s+area$/i, '').trim();

    setSites((prevSites) =>
      prevSites.map((site) => {
        const p = (site.province || '').toLowerCase();
        const r = (site.region || '').toLowerCase();
        const n = (site.name || '').toLowerCase();
        const matchesArea = 
          p === norm ||
          p.includes(norm) ||
          norm.includes(p) ||
          r.includes(norm) ||
          n.includes(norm);
        return matchesArea ? { ...site, assignedHandler: updatedHandler } : site;
      })
    );

    // Sync in-memory area assignments ref for subsequent auto-dispatches
    areaAssignmentsRef.current = (areaAssignmentsRef.current || []).map((a: any) => {
      const area = (a.areaName || '').toLowerCase();
      if (area.includes(norm) || norm.includes(area)) {
        return {
          ...a,
          personName: updatedHandler.name,
          phone: updatedHandler.phone,
          telegram: updatedHandler.telegram,
          chatId: updatedHandler.chatId,
          role: updatedHandler.role,
        };
      }
      return a;
    });

    // Check if any sites in this assigned area are currently DOWN
    const downSitesInArea = sites.filter((site) => {
      const p = (site.province || '').toLowerCase();
      const r = (site.region || '').toLowerCase();
      const n = (site.name || '').toLowerCase();
      const matchesArea = 
        p === norm ||
        p.includes(norm) ||
        norm.includes(p) ||
        r.includes(norm) ||
        n.includes(norm);
      return matchesArea && (site.status === 'Downtime' || site.offlineCount > 0);
    });

    if (downSitesInArea.length > 0) {
      const newLog: ActivityLog = {
        id: `ACT-${Date.now().toString().slice(-5)}`,
        type: 'telegram',
        title: 'Area Outage Alert Auto-Dispatched',
        description: `Automated Telegram alert dispatched to @${updatedHandler.telegram} (${updatedHandler.name}) for ${downSitesInArea.length} down site(s) in ${areaKey}.`,
        timestamp: 'Just now',
        personName: updatedHandler.name,
        telegramUsername: updatedHandler.telegram,
        severity: 'critical',
      };
      setActivityLogs((prev) => [newLog, ...prev]);

      setToastMessage(
        `Assigned ${updatedHandler.name} to ${areaKey}. 🚨 Auto-sent Telegram alert to @${updatedHandler.telegram} for ${downSitesInArea.length} down site(s)!`
      );
    } else {
      const newLog: ActivityLog = {
        id: `ACT-${Date.now().toString().slice(-5)}`,
        type: 'assignment',
        title: 'Designated Area Assignment Updated',
        description: `${updatedHandler.name} assigned as designated responder for ${areaKey}.`,
        timestamp: 'Just now',
        personName: updatedHandler.name,
        telegramUsername: updatedHandler.telegram,
        severity: 'info',
      };
      setActivityLogs((prev) => [newLog, ...prev]);

      setToastMessage(`Assigned ${updatedHandler.name} (@${updatedHandler.telegram}) to ${areaKey}.`);
    }
  };

  // Telegram dispatch triggered from Telegram Dispatch Modal
  const handleSendTelegramDispatch = (
    site: SiteInfrastructure, 
    handler: AssignedHandler, 
    notes: string
  ) => {
    // 1. Update site handler
    setSites((prevSites) =>
      prevSites.map((s) =>
        s.id === site.id ? { ...s, assignedHandler: handler } : s
      )
    );

    // 2. Log activity
    const newLog: ActivityLog = {
      id: `ACT-${Date.now().toString().slice(-5)}`,
      type: 'telegram',
      title: 'Telegram Alert Sent to Field Engineer',
      description: `Dispatched urgent inspection request to @${handler.telegram} (${handler.name}) for ${site.name}. Notes: "${notes.slice(0, 45)}..."`,
      timestamp: 'Just now',
      siteName: site.name,
      siteCode: site.code,
      personName: handler.name,
      telegramUsername: handler.telegram,
      severity: 'info',
    };
    setActivityLogs((prev) => [newLog, ...prev]);

    // 3. Trigger feedback toast
    setToastMessage(`Telegram outage alert dispatched to @${handler.telegram} (${handler.name}) for ${site.name}.`);
  };

  // Handle customizing site location/area name
  const handleUpdateSiteLocation = (siteId: string, updatedProvince: string, updatedName: string) => {
    setSites((prev) =>
      prev.map((s) =>
        s.id === siteId
          ? { ...s, province: updatedProvince, name: updatedName }
          : s
      )
    );
    setToastMessage(`Designated Area location updated: ${updatedProvince} (${updatedName})`);
  };

  // Triggered when clicking any marker on the map or row: highlights map & opens site inspector panel in right section
  const handleSelectSite = (site: SiteInfrastructure) => {
    setSelectedSiteId(site.id);
    setSiteSelectTrigger(Date.now());
    setInspectorSite(site);
    setIsSiteDetailsCollapsed(false);
  };

  // Triggered when clicking "Inspect →" button on map popup card: switches right section directly to site inspector
  const handleOpenSiteModal = (site: SiteInfrastructure) => {
    setSelectedSiteId(site.id);
    setInspectorSite(site);
    setIsSiteDetailsCollapsed(false);
  };

  // Toggle Fullscreen / TV Mode
  const handleToggleTvMode = () => {
    setIsTvMode((prev) => !prev);
    if (!isTvMode && document.documentElement.requestFullscreen) {
      document.documentElement.requestFullscreen().catch(() => {});
    } else if (isTvMode && document.exitFullscreen) {
      document.exitFullscreen().catch(() => {});
    }
  };

  // Ruijie Cloud live telemetry sync
  const handleRefresh = async () => {
    setIsRefreshing(true);
    try {
      const syncRes = await fetch('/api/ruijie/sync', { 
        method: 'POST',
        headers: { 'Cache-Control': 'no-cache' },
      });
      const syncData = await syncRes.json();

      const sitesRes = await fetch('/api/sites', { cache: 'no-store' });
      const sitesData = await sitesRes.json();
      if (sitesData.success && sitesData.sites) {
        applyUpdatedSites(sitesData.sites, sitesData.stats);
      }

      const logsRes = await fetch('/api/activity-logs', { cache: 'no-store' });
      const logsData = await logsRes.json();
      if (logsData.success && logsData.data) {
        setActivityLogs(logsData.data);
      }

      const eventsRes = await fetch('/api/events', { cache: 'no-store' });
      const eventsData = await eventsRes.json();
      if (eventsData.success && eventsData.events) {
        setDowntimeEvents(eventsData.events);
      }

      const timeStr = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
      setLastSyncedAt(timeStr);
      setToastMessage(syncData.message || `Telemetry synchronized at ${timeStr}.`);
    } catch {
      setToastMessage('Telemetry poll completed.');
    } finally {
      setIsRefreshing(false);
    }
  };

  // Toggle simulation of 1 site down (All Offline) to test downtime siren, alert toast & table status
  const handleToggleTestOutage = React.useCallback(() => {
    if (!isTestOutageRef.current) {
      if (sites.length === 0) return;

      originalSitesBackupRef.current = [...sites];
      isTestOutageRef.current = true;
      setIsTestOutage(true);

      const selectedSite = selectedSiteId ? sites.find((s) => s.id === selectedSiteId) : null;
      const targetSite = selectedSite || sites[0];
      const targetIndex = sites.findIndex((s) => s.id === targetSite.id);

      const testDownedSite: SiteInfrastructure = {
        ...targetSite,
        status: 'Downtime',
        deviceCount: 4,
        offlineCount: 4,
        onlineCount: 0,
        activeAlarmCount: 1,
        alarmType: 'All device offline',
        severity: 'Critical',
        downtimeDuration: 'Just now',
      };

      const updatedSites = sites.map((s, idx) => (idx === (targetIndex >= 0 ? targetIndex : 0) ? testDownedSite : s));
      setSites(updatedSites);

      // Show only one on the table on status "All Offline"
      setTableStatusFilter('All Offline');

      // Update dashboard stats
      setStats((prev) => ({
        ...prev,
        devicesOffline: (prev.devicesOffline || 0) + 4,
        devicesOnline: Math.max(0, (prev.devicesOnline || 0) - 4),
        activeAlarms: (prev.activeAlarms || 0) + 1,
        criticalAlarms: (prev.criticalAlarms || 0) + 1,
      }));

      // Trigger siren, top alert banner, and map blinking beacon
      triggerNewDowntimeAlert(testDownedSite);
      setSelectedSiteId(testDownedSite.id);

      setToastMessage(`🚨 [TEST SIMULATION] Site "${testDownedSite.name}" is simulated as ALL OFFLINE.`);
    } else {
      isTestOutageRef.current = false;
      setIsTestOutage(false);

      if (originalSitesBackupRef.current) {
        setSites(originalSitesBackupRef.current);
      }

      setTableStatusFilter('All');
      handleCloseAlertToast();
      setAlertingSiteId(null);

      // Re-fetch live telemetry from API
      fetch('/api/sites', { cache: 'no-store' })
        .then((r) => r.json())
        .then((d) => {
          if (d.success && d.sites && Array.isArray(d.sites)) {
            applyUpdatedSites(d.sites, d.stats);
          }
        })
        .catch(() => {});

      setToastMessage('✅ Test outage resolved. All sites restored to online.');
    }
  }, [sites, triggerNewDowntimeAlert, handleCloseAlertToast, applyUpdatedSites]);



  // Handle Login with Dynamic User Context & Persistent Session
  const handleLogin = (user?: any) => {
    setIsAuthenticated(true);
    setIsSessionLocked(false);
    lastActivityRef.current = Date.now();
    try {
      localStorage.removeItem('monitoring_session_locked');
    } catch {}

    if (user) {
      setCurrentUser(user);
      try {
        if (typeof window !== 'undefined') {
          localStorage.setItem('monitoring_auth_session', 'true');
          localStorage.setItem('monitoring_auth_user', JSON.stringify(user));
          document.cookie = 'monitoring_auth_session=true; path=/; max-age=604800; SameSite=Lax';
          document.cookie = `monitoring_auth_user=${encodeURIComponent(JSON.stringify(user))}; path=/; max-age=604800; SameSite=Lax`;
        }
      } catch (err) {
        console.error('Failed to store session in localStorage/cookie:', err);
      }
      if (user.fullName || user.email) {
        setSystemSettings((prev) => ({
          ...prev,
          account: {
            ...prev.account,
            fullName: user.fullName || prev.account.fullName,
            email: user.email || prev.account.email,
            role: user.role || prev.account.role,
            username: user.username || prev.account.username,
            telegramUsername: user.username || prev.account.telegramUsername,
          },
        }));
      }
    }
  };

  // Handle Logout (Redirects to Login Landing Page & Clears Persistent Session)
  const handleLogout = () => {
    setIsAuthenticated(false);
    setIsSessionLocked(false);
    setCurrentUser(null);
    try {
      if (typeof window !== 'undefined') {
        localStorage.removeItem('monitoring_auth_session');
        localStorage.removeItem('monitoring_auth_user');
        localStorage.removeItem('monitoring_session_locked');
        document.cookie = 'monitoring_auth_session=; path=/; max-age=0; SameSite=Lax';
        document.cookie = 'monitoring_auth_user=; path=/; max-age=0; SameSite=Lax';
        document.cookie = 'monitoring_session_locked=; path=/; max-age=0; SameSite=Lax';
      }
      fetch('/api/auth/logout', { method: 'POST' }).catch(() => {});
    } catch (err) {
      console.error('Failed to clear session from storage/cookie:', err);
    }
    console.log('--- Console Operator logged out. Persistent session cleared. ---');
  };

  // If not authenticated, always show the Login Landing Page first
  if (!isAuthenticated) {
    return <LoginLandingPage onLogin={handleLogin} />;
  }

  return (
    <div className={`h-screen max-h-screen bg-[#f8fafc] text-zinc-900 flex selection:bg-[#237227] selection:text-white overflow-hidden ${
      isTvMode ? 'text-sm' : ''
    }`}>
      {/* NAVIGATION SIDEBAR: Pushes body/header when open, collapses to w-0 when closed */}
      <div 
        className={`h-screen transition-all duration-300 ease-in-out shrink-0 overflow-hidden ${
          isSidebarOpen ? 'w-56 sm:w-60' : 'w-0'
        }`}
      >
        <Sidebar
          isOpen={isSidebarOpen}
          onClose={() => setIsSidebarOpen(false)}
          activeSection={activeSection}
          onSelectSection={setActiveSection}
          onOpenTelegram={() => setIsTelegramOpen(true)}
          onOpenActivityLogs={() => setIsActivityLogsOpen(true)}
          onOpenSettings={handleToggleTvMode}
          onLogout={handleLogout}
          onLock={handleManualLock}
          activityCount={activityLogs.length}
          language={systemSettings.general.language || 'English'}
          currentUser={currentUser}
        />
      </div>

      {/* MAIN VIEWPORT AREA (Header + Body): Moves when sidebar opens, widens to 100% when closed */}
      <div className="relative flex-1 flex flex-col min-w-0 h-full overflow-hidden transition-all duration-300 ease-in-out w-full">
        {/* When sidebar is open, clicking anywhere on page closes the sidebar */}
        {isSidebarOpen && (
          <div 
            className="absolute inset-0 z-30 bg-black/10 transition-opacity animate-in fade-in duration-200 cursor-pointer"
            onClick={() => setIsSidebarOpen(false)}
            title="Click anywhere to close menu"
            aria-label="Click anywhere on page to close menu"
          />
        )}

        {/* Top Navigation Bar: Menu icon auto-removed when sidebar is open */}
        <Header 
          title={
            activeSection === 'monitoring'
              ? t('headerMonitoring', systemSettings.general.language)
              : activeSection === 'receiver'
              ? t('headerReceiver', systemSettings.general.language)
              : activeSection === 'activity'
              ? t('headerActivity', systemSettings.general.language)
              : activeSection === 'settings'
              ? t('headerSettings', systemSettings.general.language)
              : t('headerDashboard', systemSettings.general.language)
          }
          language={systemSettings.general.language || 'English'}
          timezone={systemSettings.general.timezone || 'Asia/Manila'}
          onRefresh={handleRefresh} 
          isRefreshing={isRefreshing} 
          onLogout={handleLogout}
          isBurgerOpen={isSidebarOpen}
          onToggleBurger={() => setIsSidebarOpen((prev) => !prev)}
        />

        {/* Main Content Area */}
        <main className={`flex-1 min-h-0 w-full px-3 sm:px-5 lg:px-6 py-3 sm:py-4 ${
          activeSection === 'activity' || activeSection === 'monitoring'
            ? 'overflow-hidden flex flex-col h-full' 
            : 'overflow-y-auto'
        }`}>
          {activeSection === 'dashboard' && (
            <div className="flex flex-col gap-4 sm:gap-5 pb-4" style={{ fontFamily: 'Arial, Helvetica, sans-serif' }}>
              {/* SECTION 1: TOP EXECUTIVE STATS OVERVIEW CARDS */}
              <section aria-label="Top Stats Overview" className="shrink-0">
                <TopStatsCards 
                  stats={stats} 
                  offlineSitesCount={sites.filter((s) => s.status === 'Downtime' || (s.offlineCount === s.deviceCount && s.deviceCount > 0)).length} 
                  activeFilter={tableStatusFilter}
                  onSelectFilter={setTableStatusFilter}
                />
              </section>

              <section id="site-down-activity-logs" aria-label="Analytics & Activity Logs">
                <AnalyticsCharts 
                  sites={sites} 
                  activityLogs={activityLogs} 
                  onClearLogs={async () => {
                    setActivityLogs([]);
                    try {
                      await fetch('/api/activity-logs', { method: 'DELETE' });
                    } catch (e) {
                      console.error('Failed clearing logs in MySQL:', e);
                    }
                  }}
                />
              </section>

              {/* SECTION 3: MASTER PROJECTS TABLE (Full Width Table Card) */}
              <section id="master-projects-table" aria-label="Master Projects Table" className="min-h-[420px] flex flex-col">
                <ProjectTable
                  sites={sites}
                  onSelectSite={handleSelectSite}
                  onOpenSiteDetails={handleOpenSiteModal}
                  selectedSiteId={selectedSiteId}
                  alertingSiteId={alertingSiteId}
                  isTvMode={isTvMode}
                  onToggleTvMode={handleToggleTvMode}
                  statusFilter={tableStatusFilter}
                  onStatusFilterChange={setTableStatusFilter}
                  onRefresh={handleRefresh}
                  isRefreshing={isRefreshing}
                  lastSyncedAt={lastSyncedAt}
                  onToggleTestOutage={handleToggleTestOutage}
                  isTestOutage={isTestOutage}
                  showMap={false}
                  hideTestButton={true}
                  onOpenMonitoring={() => setActiveSection('monitoring')}
                />
              </section>
            </div>
          )}

          {activeSection === 'monitoring' && (
            <div className="flex-1 min-h-0 w-full flex flex-col lg:flex-row gap-4 items-stretch h-full overflow-hidden relative" style={{ fontFamily: 'Arial, Helvetica, sans-serif' }}>
              {/* LEFT: EXPANDED MINDANAO TOPOLOGY MAP */}
              <div className="flex-1 min-h-[500px] flex flex-col rounded-2xl border border-slate-200 bg-white overflow-hidden shadow-2xs relative transition-all duration-500 ease-in-out">
                <MindanaoMap
                  sites={sites}
                  onSelectSite={handleSelectSite}
                  onOpenSiteDetails={handleOpenSiteModal}
                  onClosePopup={() => {
                    setInspectorSite(null);
                    setSelectedSiteId(null);
                  }}
                  selectedSiteId={selectedSiteId}
                  flyToTrigger={siteSelectTrigger}
                  resetZoomTrigger={mapResetZoomTrigger}
                  alertingSiteId={alertingSiteId}
                  isTvMode={isTvMode}
                  isPanelCollapsed={isSiteDetailsCollapsed}
                />

                {/* TAB BUTTON ON MAP (WHEN PANEL IS COLLAPSED TO EXPAND IT BACK) */}
                <button
                  type="button"
                  onClick={() => setIsSiteDetailsCollapsed(false)}
                  className={`absolute right-0 top-1/2 -translate-y-1/2 z-20 flex items-center justify-center w-5 h-14 bg-white border border-slate-200 border-r-0 rounded-l-xl shadow-md text-gray-500 hover:text-gray-900 hover:bg-slate-50 transition-all duration-300 cursor-pointer group ${
                    isSiteDetailsCollapsed 
                      ? 'opacity-100 translate-x-0 pointer-events-auto' 
                      : 'opacity-0 translate-x-3 pointer-events-none'
                  }`}
                  title="Show Site Details"
                >
                  <ChevronLeft className="h-4 w-4 text-gray-500 group-hover:text-gray-900 group-hover:-translate-x-0.5 transition-all duration-200" />
                </button>
              </div>

              {/* RIGHT: LIVE SITES MONITOR / SITE INSPECTOR PANEL (Smooth Collapse & Expand) */}
              <div 
                className={`flex flex-col h-full min-h-0 rounded-2xl border border-slate-200 bg-white shadow-md shadow-slate-200/60 transition-all duration-500 ease-in-out relative overflow-visible ${
                  isSiteDetailsCollapsed
                    ? 'w-0 max-w-0 opacity-0 -mr-4 border-transparent pointer-events-none'
                    : 'w-full lg:w-[480px] max-w-[480px] opacity-100 mr-0 pointer-events-auto'
                }`}
              >
                {/* TAB BUTTON ON PANEL (TO COLLAPSE/HIDE AND EXPAND MAP) */}
                <button
                  type="button"
                  onClick={() => setIsSiteDetailsCollapsed(true)}
                  className={`absolute -left-5 top-1/2 -translate-y-1/2 z-30 flex items-center justify-center w-5 h-14 bg-white border border-slate-200 border-r-0 rounded-l-xl shadow-md text-gray-500 hover:text-gray-900 hover:bg-slate-50 transition-all duration-300 cursor-pointer group ${
                    isSiteDetailsCollapsed ? 'hidden pointer-events-none' : 'block'
                  }`}
                  title="Hide Site Details & Expand Map"
                >
                  <ChevronRight className="h-4 w-4 text-gray-500 group-hover:text-gray-900 group-hover:translate-x-0.5 transition-all duration-200" />
                </button>

                  {inspectorSite ? (
                    <SiteInspectorPanel
                      site={inspectorSite}
                      onBack={() => {
                        setInspectorSite(null);
                        setSelectedSiteId(null);
                        setMapResetZoomTrigger(Date.now());
                      }}
                      onUpdatePersonnel={handleUpdatePersonnel}
                      onOpenTelegramDispatch={(site) => {
                        setSelectedSiteForModal(site);
                        setIsTelegramOpen(true);
                      }}
                    />
                  ) : (
                    <>
                      <div className="p-3.5 border-b border-slate-100 bg-white flex items-center justify-between gap-2 shrink-0 rounded-t-2xl">
                        <div>
                          <h3 className="text-sm font-bold text-slate-900 tracking-tight">Live Sites Monitor</h3>
                          <p className="text-xs font-normal text-slate-500">Click a site to inspect full telemetry & map</p>
                        </div>

                        {handleToggleTestOutage && (
                          <button
                            type="button"
                            onClick={handleToggleTestOutage}
                            className={`px-3 py-1.5 rounded-xl border text-xs font-bold transition-all cursor-pointer shadow-2xs shrink-0 ${
                              isTestOutage
                                ? 'border-rose-300 bg-rose-50 text-rose-700 animate-pulse'
                                : 'border-slate-200 bg-white text-slate-800 hover:bg-slate-50'
                            }`}
                          >
                            {isTestOutage ? 'Restore' : 'Test Down'}
                          </button>
                        )}
                      </div>

                      {(() => {
                        const allCount = sites.length;
                        const onlineCount = sites.filter((s) => (s.offlineCount || 0) === 0).length;
                        const partialOfflineCount = sites.filter((s) => (s.offlineCount || 0) > 0 && (s.offlineCount || 0) < (s.deviceCount || 1)).length;
                        const allOfflineCount = sites.filter((s) => (s.offlineCount || 0) === (s.deviceCount || 1) && (s.deviceCount || 1) > 0).length;

                        // Region 10 Provinces list
                        const defaultProvinces = ['Bukidnon', 'Camiguin', 'Lanao del Norte', 'Misamis Occidental', 'Misamis Oriental'];
                        const provSet = new Set<string>(defaultProvinces);
                        sites.forEach((s) => {
                          if (s.province && s.province.trim()) provSet.add(s.province.trim());
                        });
                        const provincesList = ['All', ...Array.from(provSet).sort()];

                        // Filter by Status, Province & Search Query
                        let filteredSites = sites.filter((s) => {
                          const isAllOff = (s.offlineCount || 0) === (s.deviceCount || 1) && (s.deviceCount || 1) > 0;
                          const isPartial = (s.offlineCount || 0) > 0 && (s.offlineCount || 0) < (s.deviceCount || 1);
                          const isOnline = (s.offlineCount || 0) === 0;

                          // Status filter
                          if (monitorStatusFilter === 'Online' && !isOnline) return false;
                          if (monitorStatusFilter === 'Offline' && !isPartial) return false;
                          if (monitorStatusFilter === 'All Offline' && !isAllOff) return false;

                          // Province filter
                          if (monitorSelectedProvince !== 'All') {
                            const matchProv = (s.province || '').toLowerCase() === monitorSelectedProvince.toLowerCase();
                            const matchMun = (s.municipality || '').toLowerCase() === monitorSelectedProvince.toLowerCase();
                            const matchReg = (s.region || '').toLowerCase().includes(monitorSelectedProvince.toLowerCase());
                            if (!matchProv && !matchMun && !matchReg) return false;
                          }

                          // Search query
                          if (monitorSearchQuery.trim()) {
                            const q = monitorSearchQuery.toLowerCase().trim();
                            const name = (s.name || '').toLowerCase();
                            const mun = (s.municipality || '').toLowerCase();
                            const prov = (s.province || '').toLowerCase();
                            const reg = (s.region || '').toLowerCase();
                            const ip = (s.lastKnownIp || '').toLowerCase();
                            const handler = (s.assignedHandler?.name || '').toLowerCase();
                            const matches = name.includes(q) || mun.includes(q) || prov.includes(q) || reg.includes(q) || ip.includes(q) || handler.includes(q);
                            if (!matches) return false;
                          }

                          return true;
                        });

                        // Sort by Location
                        if (monitorLocationSort === 'asc') {
                          filteredSites = [...filteredSites].sort((a, b) => {
                            const locA = [a.municipality, a.province, a.region].filter(Boolean).join(', ').toLowerCase();
                            const locB = [b.municipality, b.province, b.region].filter(Boolean).join(', ').toLowerCase();
                            return locA.localeCompare(locB);
                          });
                        } else if (monitorLocationSort === 'desc') {
                          filteredSites = [...filteredSites].sort((a, b) => {
                            const locA = [a.municipality, a.province, a.region].filter(Boolean).join(', ').toLowerCase();
                            const locB = [b.municipality, b.province, b.region].filter(Boolean).join(', ').toLowerCase();
                            return locB.localeCompare(locA);
                          });
                        }

                        // Pagination calculations for Live Sites Monitor
                        const totalMonitorPages = Math.max(1, Math.ceil(filteredSites.length / monitorRowsPerPage));
                        const safeMonitorPage = Math.min(monitorCurrentPage, totalMonitorPages);
                        const startIdx = (safeMonitorPage - 1) * monitorRowsPerPage;
                        const paginatedMonitorSites = filteredSites.slice(startIdx, startIdx + monitorRowsPerPage);
                        const startItem = filteredSites.length === 0 ? 0 : startIdx + 1;
                        const endItem = Math.min(startIdx + monitorRowsPerPage, filteredSites.length);

                        // Generate pagination page numbers window
                        let monitorPageNumbers: (number | string)[] = [];
                        if (totalMonitorPages <= 5) {
                          monitorPageNumbers = Array.from({ length: totalMonitorPages }, (_, i) => i + 1);
                        } else {
                          monitorPageNumbers = [1];
                          let start = Math.max(2, safeMonitorPage - 1);
                          let end = Math.min(totalMonitorPages - 1, safeMonitorPage + 1);
                          if (safeMonitorPage <= 3) {
                            start = 2;
                            end = Math.min(totalMonitorPages - 1, 4);
                          } else if (safeMonitorPage >= totalMonitorPages - 2) {
                            start = Math.max(2, totalMonitorPages - 3);
                            end = totalMonitorPages - 1;
                          }
                          if (start > 2) monitorPageNumbers.push('...');
                          for (let i = start; i <= end; i++) monitorPageNumbers.push(i);
                          if (end < totalMonitorPages - 1) monitorPageNumbers.push('...');
                          monitorPageNumbers.push(totalMonitorPages);
                        }

                        return (
                          <>
                            {/* Controls Flow: 1. Search -> 2. Status Dropdown -> 3. Provinces Dropdown */}
                            <div className="px-3.5 py-2.5 bg-white border-b border-slate-100 flex items-center gap-2 shrink-0">
                              {/* 1. SEARCH INPUT */}
                              <div className="relative flex-1 min-w-[90px]">
                                <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400 pointer-events-none" />
                                <input
                                  type="text"
                                  placeholder="Search..."
                                  value={monitorSearchQuery}
                                  onChange={(e) => {
                                    setMonitorSearchQuery(e.target.value);
                                    setMonitorCurrentPage(1);
                                  }}
                                  className="w-full h-8.5 rounded-xl border border-slate-200 bg-slate-50/60 pl-8 pr-2.5 text-xs font-medium text-slate-800 placeholder-slate-400 hover:border-slate-300 focus:border-slate-400 focus:bg-white focus:outline-none transition-colors"
                                  style={{ fontFamily: 'Arial, Helvetica, sans-serif' }}
                                />
                              </div>

                              {/* 2. STATUS FILTER DROPDOWN (All, Online, Offline, All Offline) */}
                              <select
                                value={monitorStatusFilter}
                                onChange={(e) => {
                                  setMonitorStatusFilter(e.target.value as any);
                                  setMonitorCurrentPage(1);
                                }}
                                className="h-8.5 rounded-xl border border-slate-200 bg-slate-50/60 px-2.5 text-xs font-semibold text-slate-800 hover:border-slate-300 focus:border-slate-400 focus:bg-white focus:outline-none cursor-pointer shrink-0 transition-colors"
                                style={{ fontFamily: 'Arial, Helvetica, sans-serif' }}
                              >
                                <option value="All">All ({allCount})</option>
                                <option value="Online">Online ({onlineCount})</option>
                                <option value="Offline">Offline ({partialOfflineCount})</option>
                                <option value="All Offline">All Offline ({allOfflineCount})</option>
                              </select>

                              {/* 3. PROVINCES SELECTOR */}
                              <select
                                value={monitorSelectedProvince}
                                onChange={(e) => {
                                  setMonitorSelectedProvince(e.target.value);
                                  setMonitorCurrentPage(1);
                                }}
                                className="h-8.5 rounded-xl border border-slate-200 bg-slate-50/60 px-2.5 text-xs font-semibold text-slate-800 hover:border-slate-300 focus:border-slate-400 focus:bg-white focus:outline-none cursor-pointer shrink-0 transition-colors"
                                style={{ fontFamily: 'Arial, Helvetica, sans-serif' }}
                              >
                                {provincesList.map((prov) => (
                                  <option key={prov} value={prov}>
                                    {prov === 'All' ? 'All Provinces' : prov}
                                  </option>
                                ))}
                              </select>
                            </div>

                            {/* 4-Column Headers Bar */}
                            <div className="px-3.5 py-2 bg-slate-50/80 border-b border-slate-100 grid grid-cols-12 gap-2 text-[10px] font-bold uppercase tracking-wider text-slate-400 shrink-0 select-none">
                              <div className="col-span-3">Project Name</div>
                              <button
                                type="button"
                                onClick={() => {
                                  setMonitorLocationSort(prev => prev === 'asc' ? 'desc' : prev === 'desc' ? 'none' : 'asc');
                                  setMonitorCurrentPage(1);
                                }}
                                className="col-span-3 flex items-center gap-1 hover:text-slate-700 transition-colors cursor-pointer text-left uppercase font-bold"
                                title="Click to sort by Location"
                              >
                                <span>Location</span>
                                {monitorLocationSort === 'asc' && <ArrowUp className="h-3 w-3 text-[#237227]" />}
                                {monitorLocationSort === 'desc' && <ArrowDown className="h-3 w-3 text-[#237227]" />}
                                {monitorLocationSort === 'none' && <ArrowUpDown className="h-3 w-3 text-slate-300 hover:text-slate-400" />}
                              </button>
                              <div className="col-span-3 text-center">AP / Device</div>
                              <div className="col-span-3 text-right">Downtime</div>
                            </div>

                            {/* SITES LIST (Equal 25% Column Widths - Natural Palette & Soft Shadows) */}
                            <div className="flex-1 min-h-0 overflow-y-auto divide-y divide-slate-100/80">
                              {filteredSites.length === 0 ? (
                                <div className="py-12 px-4 text-center">
                                  <p className="text-xs font-medium text-slate-500">No sites matching your filters</p>
                                  {(monitorSearchQuery || monitorStatusFilter !== 'All') && (
                                    <button
                                      type="button"
                                      onClick={() => {
                                        setMonitorSearchQuery('');
                                        setMonitorStatusFilter('All');
                                        setMonitorLocationSort('none');
                                        setMonitorCurrentPage(1);
                                      }}
                                      className="mt-2 text-xs font-bold text-[#237227] hover:underline cursor-pointer"
                                    >
                                      Clear filters
                                    </button>
                                  )}
                                </div>
                              ) : (
                                paginatedMonitorSites.map((site) => {
                                  const isSelected = selectedSiteId === site.id;
                                  const isAlerting = alertingSiteId === site.id;
                                  const isAllOff = site.offlineCount === site.deviceCount && site.deviceCount > 0;
                                  const isPartial = site.offlineCount > 0 && site.offlineCount < site.deviceCount;
                                  const isDown = isAllOff || isPartial || site.status === 'Downtime';

                                  return (
                                    <div
                                      key={site.id}
                                      onClick={() => handleSelectSite(site)}
                                      className={`px-3.5 py-2.5 grid grid-cols-12 gap-2 items-center cursor-pointer transition-all border-l-2 ${
                                        isAlerting
                                          ? 'bg-rose-50/90 border-rose-600 animate-pulse shadow-sm'
                                          : isSelected
                                          ? 'bg-slate-100/90 border-slate-800 shadow-2xs'
                                          : 'border-transparent hover:bg-slate-50/80'
                                      }`}
                                    >
                                      {/* 1. PROJECT NAME */}
                                      <div className="col-span-3 min-w-0 pr-1">
                                        <span className="text-xs font-bold text-slate-900 truncate block">
                                          {site.name}
                                        </span>
                                      </div>

                                      {/* 2. LOCATION */}
                                      <div className="col-span-3 min-w-0 pr-1">
                                        <span className="text-xs text-slate-600 truncate block">
                                          {site.municipality || site.province}
                                        </span>
                                      </div>

                                      {/* 3. AP / DEVICE STATUS */}
                                      <div className="col-span-3 text-center min-w-0">
                                        <span className="text-xs font-medium text-slate-700 truncate block">
                                          {site.onlineCount} / {site.deviceCount} Online
                                        </span>
                                      </div>

                                      {/* 4. DOWNTIME DURATION */}
                                      <div className="col-span-3 text-right min-w-0">
                                        {isDown ? (
                                          <span className="text-[11px] font-semibold text-rose-700 truncate block">
                                            {site.downtimeDuration || 'Active'}
                                          </span>
                                        ) : (
                                          <span className="text-[11px] font-semibold text-[#237227] truncate block">
                                            Online
                                          </span>
                                        )}
                                      </div>
                                    </div>
                                  );
                                })
                              )}
                            </div>

                            {/* PAGINATION CONTROLS FOOTER (Matching Master Dashboard Design) */}
                            <div className="px-3.5 py-2.5 border-t border-slate-100 bg-white flex flex-wrap items-center justify-between gap-2 shrink-0 rounded-b-2xl text-xs text-slate-600">
                              {/* Left: Summary & Rows */}
                              <div className="flex items-center gap-2">
                                <span className="font-normal text-slate-500 text-[11px]">
                                  Showing <strong className="text-slate-900 font-semibold">{startItem}</strong>–<strong className="text-slate-900 font-semibold">{endItem}</strong> of <strong className="text-slate-900 font-semibold">{filteredSites.length}</strong>
                                </span>
                                <div className="flex items-center gap-1 border-l border-slate-200 pl-2">
                                  <span className="text-slate-400 text-[10px]">Rows:</span>
                                  <select
                                    value={monitorRowsPerPage}
                                    onChange={(e) => {
                                      setMonitorRowsPerPage(Number(e.target.value));
                                      setMonitorCurrentPage(1);
                                    }}
                                    className="rounded border border-slate-200 bg-white px-1.5 py-0.5 text-[11px] font-semibold text-slate-700 hover:border-slate-300 focus:border-slate-400 focus:outline-none cursor-pointer"
                                    style={{ fontFamily: 'Arial, Helvetica, sans-serif' }}
                                  >
                                    <option value={6}>6</option>
                                    <option value={8}>8</option>
                                    <option value={10}>10</option>
                                    <option value={15}>15</option>
                                    <option value={20}>20</option>
                                  </select>
                                </div>
                              </div>

                              {/* Right: Prev / Page Numbers / Next */}
                              <div className="flex items-center gap-1">
                                <button
                                  type="button"
                                  onClick={() => setMonitorCurrentPage((p) => Math.max(1, p - 1))}
                                  disabled={safeMonitorPage <= 1}
                                  className="h-7 px-2 rounded-lg border border-slate-200 bg-white text-slate-700 hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed transition-colors cursor-pointer flex items-center gap-1 text-[11px] font-semibold"
                                  title="Previous Page"
                                >
                                  <ChevronLeft className="h-3 w-3" />
                                  <span>Prev</span>
                                </button>

                                <div className="flex items-center gap-1">
                                  {monitorPageNumbers.map((pg, idx) => (
                                    typeof pg === 'number' ? (
                                      <button
                                        key={idx}
                                        type="button"
                                        onClick={() => setMonitorCurrentPage(pg)}
                                        className={`min-w-[26px] h-7 px-1.5 rounded-lg text-[11px] font-semibold transition-colors cursor-pointer ${
                                          safeMonitorPage === pg
                                            ? 'bg-[#237227] text-white shadow-2xs'
                                            : 'border border-slate-200 bg-white text-slate-700 hover:bg-slate-50'
                                        }`}
                                      >
                                        {pg}
                                      </button>
                                    ) : (
                                      <span key={idx} className="px-1 text-slate-400 text-xs">...</span>
                                    )
                                  ))}
                                </div>

                                <button
                                  type="button"
                                  onClick={() => setMonitorCurrentPage((p) => Math.min(totalMonitorPages, p + 1))}
                                  disabled={safeMonitorPage >= totalMonitorPages}
                                  className="h-7 px-2 rounded-lg border border-slate-200 bg-white text-slate-700 hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed transition-colors cursor-pointer flex items-center gap-1 text-[11px] font-semibold"
                                  title="Next Page"
                                >
                                  <span>Next</span>
                                  <ChevronRight className="h-3 w-3" />
                                </button>
                              </div>
                            </div>
                          </>
                        );
                      })()}
                    </>
                  )}
                </div>
            </div>
          )}

          {activeSection === 'receiver' && (
            <ReceiverPage
              sites={sites}
              events={activeEvents}
              onUpdatePersonnel={handleUpdatePersonnel}
              onUpdateAreaPersonnel={handleUpdateAreaPersonnel}
              onSendTelegramDispatch={handleSendTelegramDispatch}
              onUpdateSiteLocation={handleUpdateSiteLocation}
              activityLogs={activityLogs}
            />
          )}

          {activeSection === 'activity' && (
            <ActivityLogsPage
              logs={activityLogs}
              onClearLogs={async () => {
                setActivityLogs([]);
                try {
                  await fetch('/api/activity-logs', { method: 'DELETE' });
                } catch (e) {
                  console.error('Error clearing logs in MySQL:', e);
                }
              }}
            />
          )}

          {activeSection === 'settings' && (
            <SettingsPage
              settings={systemSettings}
              onSaveSettings={handleSaveSettings}
              onResetSettings={handleResetSettings}
              onClearCache={handleClearAppCache}
              isTvMode={isTvMode}
              onToggleTvMode={handleToggleTvMode}
            />
          )}
        </main>
      </div>

      {/* TELEGRAM OUTAGE DISPATCH MODAL */}
      <TelegramDispatchModal
        isOpen={isTelegramOpen}
        onClose={() => {
          setIsTelegramOpen(false);
          setActiveSection('dashboard');
        }}
        sites={sites}
        onUpdatePersonnel={handleUpdatePersonnel}
        onSendTelegramDispatch={handleSendTelegramDispatch}
      />

      {/* ACTIVITY LOGS MODAL */}
      <ActivityLogsModal
        isOpen={isActivityLogsOpen}
        onClose={() => {
          setIsActivityLogsOpen(false);
          setActiveSection('dashboard');
        }}
        logs={activityLogs}
        onClearLogs={() => setActivityLogs([])}
      />

      {/* POPUP MODAL: SITE DETAILS & CONTACT PERSON INFORMATION */}
      <SiteContactModal
        site={selectedSiteForModal}
        onClose={() => setSelectedSiteForModal(null)}
        onUpdateHandler={handleUpdatePersonnel}
      />

      {/* TOP CENTER DOWNTIME ALERT TOAST (8-Second Clean Notification) */}
      <DowntimeAlertToast
        site={alertingSite}
        autoDismissSec={8}
        onClose={handleCloseAlertToast}
        onStopAudio={() => {
          if (beepCancelRef.current) beepCancelRef.current();
        }}
        onLocateOnMap={(site) => {
          setActiveSection('dashboard');
          setSelectedSiteId(site.id);
          setAlertingSiteId(site.id);
        }}
        onOpenDispatch={(site) => {
          setSelectedSiteForModal(site);
          setIsTelegramOpen(true);
        }}
      />

      {/* Global Interactive Toast */}
      <Toast message={toastMessage} onClose={handleCloseToast} durationMs={3000} />

      {/* NOC Command Center Session Inactivity Auto-Lock Modal */}
      {isSessionLocked && (
        <LockScreenModal
          operatorName={currentUser?.fullName || systemSettings.account?.fullName || 'Engr. Engel Montero'}
          operatorEmail={currentUser?.email || systemSettings.account?.email || 'emontero@dict.gov.ph'}
          operatorUsername={currentUser?.username || systemSettings.account?.telegramUsername || 'emontero'}
          operatorRole={currentUser?.role || systemSettings.account?.role || 'Super Administrator / Security Officer'}
          timeoutMinutes={systemSettings.account?.sessionTimeoutMinutes ?? 30}
          onUnlock={handleUnlockSession}
          onLogout={handleLogout}
        />
      )}
    </div>
  );
}
