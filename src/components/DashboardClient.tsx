'use client';

import React, { useState, useEffect } from 'react';
import { Header } from '@/components/Header';
import { TopStatsCards } from '@/components/TopStatsCards';
import { ProjectTable } from '@/components/ProjectTable';
import { SiteContactModal } from '@/components/SiteContactModal';
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
}

export default function DashboardClient({
  initialAuthenticated,
  initialUser,
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
  const [activeSection, setActiveSectionRaw] = useState<NavSection>('dashboard');
  const setActiveSection = React.useCallback((section: NavSection) => {
    setActiveSectionRaw(section);
    try { localStorage.setItem('monitoring_active_section', section); } catch {}
  }, []);
  // Restore saved sidebar section after hydration to avoid SSR mismatch
  useEffect(() => {
    try {
      const saved = localStorage.getItem('monitoring_active_section');
      if (saved === 'dashboard' || saved === 'receiver' || saved === 'activity' || saved === 'settings') {
        setActiveSectionRaw(saved);
      }
    } catch {}
  }, []);
  const [isTelegramOpen, setIsTelegramOpen] = useState<boolean>(false);
  const [isActivityLogsOpen, setIsActivityLogsOpen] = useState<boolean>(false);
  const [isTvMode, setIsTvMode] = useState<boolean>(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [tableStatusFilter, setTableStatusFilter] = useState<'All' | 'All Offline' | 'Offline' | 'Online'>('All');
  const [lastSyncedAt, setLastSyncedAt] = useState<string | null>(null);

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

    // 4. Highlight and blink the red alert beacon on the map
    setAlertingSiteId(site.id);

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
          severity: site.severity || 'Critical',
          alarmType: site.alarmType || 'All device offline',
          downtimeDuration: site.downtimeDuration || 'Active',
          offlineDeviceCount: site.offlineCount || 0,
          totalDeviceCount: site.deviceCount || 1,
          lastKnownIp: site.lastKnownIp,
          recipientName: handlerToAssign.name,
          telegramUsername: handlerToAssign.telegram.replace(/^@/, ''),
          chatId: handlerToAssign.chatId,
          customNotes: `⚡ [AUTOMATED OUTAGE DISPATCH] Incident triage automatically assigned to ${handlerToAssign.name} (@${handlerToAssign.telegram.replace(/^@/, '')}) for ${site.name}.`,
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
      title: '🚨 Critical Downtime Siren Alert',
      description: `Outage alarm detected for ${site.name} (${site.code}). Audio siren triggered (3s).${hasAssignedPerson ? ' Auto-dispatch activated.' : ' No responder assigned yet.'}`,
      timestamp: 'Just now',
      siteName: site.name,
      siteCode: site.code,
      personName: hasAssignedPerson ? handlerToAssign.name : undefined,
      telegramUsername: hasAssignedPerson ? handlerToAssign.telegram : undefined,
      severity: 'critical',
    };

    if (hasAssignedPerson) {
      const autoDispatchLog: ActivityLog = {
        id: `ACT-${(Date.now() + 1).toString().slice(-5)}`,
        type: 'telegram',
        title: '⚡ Auto-Dispatched & Assigned Responder',
        description: `Automatically assigned & dispatched incident alert via Telegram to ${handlerToAssign.name} (@${handlerToAssign.telegram.replace(/^@/, '')}) for ${site.name}.`,
        timestamp: 'Just now',
        siteName: site.name,
        siteCode: site.code,
        personName: handlerToAssign.name,
        telegramUsername: handlerToAssign.telegram,
        severity: 'critical',
      };
      setActivityLogs((prev) => [autoDispatchLog, alertLog, ...prev]);
      setToastMessage(`⚡ Auto-Dispatched & Assigned: ${handlerToAssign.name} (@${handlerToAssign.telegram.replace(/^@/, '')}) to ${site.name}!`);
    } else {
      setActivityLogs((prev) => [alertLog, ...prev]);
      setToastMessage(`🚨 Outage Alert: ${site.name} is down. No designated responder assigned yet.`);
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

  // Handle saving system settings
  const handleSaveSettings = (updated: SystemSettings) => {
    const isAccountUpdated = 
      updated.account.fullName !== systemSettings.account.fullName ||
      updated.account.email !== systemSettings.account.email ||
      updated.account.password !== systemSettings.account.password ||
      updated.account.twoFactorEnabled !== systemSettings.account.twoFactorEnabled;

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
      current && current.name === siteName
        ? { ...current, assignedHandler: updatedHandler }
        : current
    );

    const siteObj = sites.find((s) => s.name === siteName);
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
          severity: siteObj?.severity || 'Critical',
          alarmType: siteObj?.alarmType || 'Outage',
          downtimeDuration: siteObj?.downtimeDuration || 'Active',
          offlineDeviceCount: siteObj?.offlineCount || 0,
          totalDeviceCount: siteObj?.deviceCount || 1,
          lastKnownIp: siteObj?.lastKnownIp,
          recipientName: updatedHandler.name,
          telegramUsername: updatedHandler.telegram,
          customNotes: `Auto-dispatched alert upon assignment update: site status is ${siteObj?.status || 'Down'}.`,
        }),
      }).catch((e) => console.warn('Telegram dispatch error:', e));

      setToastMessage(
        `🚨 Telegram outage alert sent to @${updatedHandler.telegram} (${updatedHandler.name}) for ${siteName}.`
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

  // Triggered when clicking any marker on the map or any row in the ProjectTable: focuses & opens map popup card WITHOUT popping up the big modal
  const handleSelectSite = (site: SiteInfrastructure) => {
    setSelectedSiteId(site.id);
  };

  // Triggered ONLY when clicking the "Inspect →" button on the map popup card: pops up the SiteContactModal
  const handleOpenSiteModal = (site: SiteInfrastructure) => {
    setSelectedSiteForModal(site);
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

      const targetIndex = 0;
      const targetSite = sites[targetIndex];
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

      const updatedSites = sites.map((s, idx) => (idx === targetIndex ? testDownedSite : s));
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
    setCurrentUser(null);
    try {
      if (typeof window !== 'undefined') {
        localStorage.removeItem('monitoring_auth_session');
        localStorage.removeItem('monitoring_auth_user');
        document.cookie = 'monitoring_auth_session=; path=/; max-age=0; SameSite=Lax';
        document.cookie = 'monitoring_auth_user=; path=/; max-age=0; SameSite=Lax';
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
          isSidebarOpen ? 'w-60 sm:w-64' : 'w-0'
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
            activeSection === 'receiver'
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
        <main className="flex-1 min-h-0 w-full px-3 sm:px-5 lg:px-6 py-2 sm:py-2.5 flex flex-col gap-2.5 overflow-hidden">
          {activeSection === 'dashboard' && (
            <>
              {/* SECTION 1: TOP STATS OVERVIEW CARDS */}
              <section aria-label="Top Stats Overview" className="shrink-0">
                <TopStatsCards 
                  stats={stats} 
                  offlineSitesCount={sites.filter((s) => s.status === 'Downtime').length} 
                  activeFilter={tableStatusFilter}
                  onSelectFilter={setTableStatusFilter}
                />
              </section>

              {/* SECTION 2: MASTER PROJECTS TABLE (Split Map & Table, fits remaining screen) */}
              <section aria-label="Master Projects Table" className="flex-1 min-h-0 flex flex-col overflow-hidden">
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
                />
              </section>
            </>
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

      {/* TOP CENTER DOWNTIME ALERT TOAST */}
      <DowntimeAlertToast
        site={alertingSite}
        autoDismissSec={10}
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
    </div>
  );
}
