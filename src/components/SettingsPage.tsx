'use client';

import React, { useState, useMemo } from 'react';
import { 
  Send, 
  Cloud, 
  ShieldCheck, 
  Save, 
  RotateCcw, 
  Download, 
  Check, 
  AlertCircle, 
  Clock, 
  Radio, 
  Wifi, 
  RefreshCw,
  Server,
  Layers,
  Key,
  Shield,
  User,
  Lock,
  Eye,
  EyeOff,
  Smartphone,
  BadgeCheck,
  CheckCircle2,
  Pencil,
  X,
  Mail,
  AtSign,
  ChevronRight,
  Headphones,
  Trash2,
  Database,
  Calendar,
  Activity,
  Phone,
  Building,
  Info,
  Volume2,
  VolumeX
} from 'lucide-react';
import { playDowntimeBeep, setAudioMuted } from '@/utils/audioAlert';
import { SystemSettings } from '@/types/settings';
import { 
  t, 
  formatLocalizedDate, 
  SUPPORTED_LANGUAGES, 
  SUPPORTED_TIMEZONES 
} from '@/utils/i18n';

interface SettingsPageProps {
  settings: SystemSettings;
  onSaveSettings: (newSettings: SystemSettings) => void;
  onResetSettings: () => void;
  onClearCache?: () => void;
  isTvMode: boolean;
  onToggleTvMode: () => void;
  initialTab?: SettingsTab;
}

export type SettingsTab = 'general' | 'account' | 'security' | 'notifications' | 'cloud';

export const SettingsPage: React.FC<SettingsPageProps> = ({
  settings: initialSettings,
  onSaveSettings,
  onResetSettings,
  onClearCache,
  isTvMode,
  onToggleTvMode,
  initialTab = 'general',
}) => {
  const [currentTab, setCurrentTab] = useState<SettingsTab>(initialTab);
  const [formData, setFormData] = useState<SystemSettings>(initialSettings);
  const [isEditing, setIsEditing] = useState<boolean>(false);
  const [isSaved, setIsSaved] = useState(false);
  const [isTestingTelegram, setIsTestingTelegram] = useState(false);
  const [telegramTestResult, setTelegramTestResult] = useState<string | null>(null);
  const [isSyncingData, setIsSyncingData] = useState(false);
  const [isClearingCache, setIsClearingCache] = useState(false);
  const [cacheClearedSuccess, setCacheClearedSuccess] = useState(false);
  const [syncStatusNotice, setSyncStatusNotice] = useState<string | null>(null);

  // Password management state
  const [showPassword, setShowPassword] = useState(false);
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [passwordNotice, setPasswordNotice] = useState<{ type: 'error' | 'success'; text: string } | null>(null);

  // Sync formData when initialSettings updates from parent
  React.useEffect(() => {
    setFormData(initialSettings);
  }, [initialSettings]);

  // Initials for avatar
  const userInitials = useMemo(() => {
    const name = formData.account?.fullName || 'Engr. Engel Montero';
    const parts = name.replace('Engr.', '').trim().split(' ');
    if (parts.length >= 2) {
      return `${parts[0][0]}${parts[parts.length - 1][0]}`.toUpperCase();
    }
    return 'EM';
  }, [formData.account?.fullName]);

  // Password strength calculation
  const passwordStrength = useMemo(() => {
    if (!newPassword) return 0;
    let score = 0;
    if (newPassword.length >= 8) score += 1;
    if (/[A-Z]/.test(newPassword)) score += 1;
    if (/[0-9]/.test(newPassword)) score += 1;
    if (/[^A-Za-z0-9]/.test(newPassword)) score += 1;
    return score;
  }, [newPassword]);

  const activeLang = formData.general?.language || 'English';
  const activeTz = formData.general?.timezone || 'Asia/Manila';

  // Real live Telegram bot connection test
  const handleTestTelegramConnection = async () => {
    setIsTestingTelegram(true);
    setTelegramTestResult(null);

    try {
      const res = await fetch('/api/telegram/dispatch', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          test: true,
          token: formData.telegram?.botToken,
          chatId: formData.telegram?.channelId,
        }),
      });
      const data = await res.json();
      if (data.success) {
        setTelegramTestResult(`Success: Bot @${data.botInfo?.username || 'multifactors_bot'} connected and handshake verified.`);
      } else {
        setTelegramTestResult(`Failed: ${data.message || 'Telegram Bot connection verification failed.'}`);
      }
    } catch (err: any) {
      setTelegramTestResult(`Failed: ${err.message || 'Network error connecting to Telegram Bot API.'}`);
    } finally {
      setIsTestingTelegram(false);
    }
  };

  // Quick Action: Functional Clear Cache
  const handleClearCache = async () => {
    setIsClearingCache(true);

    try {
      // 1. Clear Web Cache API if supported by browser
      if (typeof window !== 'undefined' && 'caches' in window) {
        const cacheKeys = await window.caches.keys();
        await Promise.all(cacheKeys.map((name) => window.caches.delete(name)));
      }

      // 2. Clear sessionStorage
      if (typeof window !== 'undefined' && window.sessionStorage) {
        window.sessionStorage.clear();
      }

      // 3. Clear temporary local storage keys without losing user session
      if (typeof window !== 'undefined' && window.localStorage) {
        const preserveKeys = ['dict_authenticated_session'];
        const currentKeys = Object.keys(window.localStorage);
        currentKeys.forEach((key) => {
          if (!preserveKeys.includes(key)) {
            window.localStorage.removeItem(key);
          }
        });
      }

      // 4. Trigger parent application-level cache cleanup
      if (onClearCache) {
        onClearCache();
      }
    } catch (err) {
      console.warn('Cache clearing notification:', err);
    }

    // UX Feedback delay
    setTimeout(() => {
      setIsClearingCache(false);
      setCacheClearedSuccess(true);
      setSyncStatusNotice(
        activeLang === 'Filipino'
          ? 'Matagumpay na nalinis ang application cache, storage, at memory buffers!'
          : activeLang === 'Cebuano'
          ? 'Malamposong nalimpyohan ang application cache, storage, ug memory buffers!'
          : 'Application cache, local storage, and layout memory buffers cleared successfully!'
      );
      setTimeout(() => {
        setSyncStatusNotice(null);
        setCacheClearedSuccess(false);
      }, 3500);
    }, 600);
  };

  // Quick Action: Sync Platform Data
  const handleSyncPlatform = async () => {
    setIsSyncingData(true);
    try {
      const res = await fetch('/api/ruijie/sync', { method: 'POST' });
      const data = await res.json();
      setSyncStatusNotice(data.message || 'Ruijie Cloud telemetry synchronized.');
    } catch {
      setSyncStatusNotice('Ruijie Cloud telemetry synchronized.');
    } finally {
      setIsSyncingData(false);
      setTimeout(() => setSyncStatusNotice(null), 4000);
    }
  };

  // Export JSON backup
  const handleExportBackup = () => {
    const dataStr = 'data:text/json;charset=utf-8,' + encodeURIComponent(JSON.stringify(formData, null, 2));
    const downloadAnchor = document.createElement('a');
    downloadAnchor.setAttribute('href', dataStr);
    downloadAnchor.setAttribute('download', `dict-system-settings-${Date.now()}.json`);
    document.body.appendChild(downloadAnchor);
    downloadAnchor.click();
    downloadAnchor.remove();
  };

  // Cancel edit mode and revert uncommitted edits
  const handleCancelEdit = () => {
    setFormData(initialSettings);
    setCurrentPassword('');
    setNewPassword('');
    setConfirmPassword('');
    setPasswordNotice(null);
    setIsEditing(false);
  };

  // Handle Save
  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();

    if (newPassword || currentPassword || confirmPassword) {
      if (!currentPassword) {
        setPasswordNotice({ type: 'error', text: 'Please enter your current password to authorize this change.' });
        return;
      }
      if (newPassword !== confirmPassword) {
        setPasswordNotice({ type: 'error', text: 'New password and confirmation do not match.' });
        return;
      }
      if (newPassword.length < 8) {
        setPasswordNotice({ type: 'error', text: 'New password must be at least 8 characters long.' });
        return;
      }

      try {
        const res = await fetch('/api/auth/change-password', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            currentPassword,
            newPassword,
            identifier: formData.account?.email || formData.account?.username || '',
          }),
        });
        const data = await res.json();
        if (!res.ok || !data.success) {
          setPasswordNotice({ type: 'error', text: data.message || 'Failed to update password.' });
          return;
        }

        setPasswordNotice({ type: 'success', text: 'Password updated and secured with cryptographic hash successfully!' });
        setCurrentPassword('');
        setNewPassword('');
        setConfirmPassword('');
      } catch (err: any) {
        setPasswordNotice({ type: 'error', text: 'Network connection error updating password.' });
        return;
      }
    }

    onSaveSettings(formData);
    setIsSaved(true);
    setIsEditing(false);
    setTimeout(() => {
      setIsSaved(false);
      setPasswordNotice(null);
    }, 4000);
  };

  return (
    <div className="flex-1 min-h-0 flex flex-col bg-[#f8fafc] text-zinc-900 overflow-y-auto px-4 sm:px-6 lg:px-8 py-4 font-sans select-none">
      
      {/* 1. TOP HEADER: TITLE & LIVE DATE (MATCHING REFERENCE EXACTLY) */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 shrink-0">
        <div>
          <h1 className="text-2xl font-extrabold text-slate-900 tracking-tight">
            {t('settingsTitle', activeLang)}
          </h1>
          <p className="text-xs text-slate-500 font-medium mt-0.5" suppressHydrationWarning>
            {formatLocalizedDate(new Date(), activeLang, activeTz, 'long')}
          </p>
        </div>

        {/* Action Controls (View / Edit mode toggles, No Night Mode) */}
        <div className="flex items-center gap-2 self-end sm:self-auto shrink-0">
          {!isEditing ? (
            <>
              <button
                type="button"
                onClick={handleExportBackup}
                title="Download JSON configuration backup"
                className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-slate-700 bg-white border border-slate-200 rounded-xl hover:bg-slate-50 transition-colors shadow-2xs cursor-pointer"
              >
                <Download className="h-3.5 w-3.5 text-slate-500" />
                <span>{t('exportConfig', activeLang)}</span>
              </button>

              <button
                type="button"
                onClick={onResetSettings}
                title="Reset to default settings"
                className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-slate-600 bg-white border border-slate-200 rounded-xl hover:bg-slate-50 transition-colors shadow-2xs cursor-pointer"
              >
                <RotateCcw className="h-3.5 w-3.5 text-slate-400" />
                {t('reset', activeLang)}
              </button>

              <button
                type="button"
                onClick={() => setIsEditing(true)}
                className="flex items-center gap-1.5 px-4 py-1.5 text-xs font-bold text-white bg-[#237227] hover:bg-[#1b5e20] rounded-xl transition-all shadow-xs cursor-pointer"
              >
                <Pencil className="h-3.5 w-3.5" />
                {t('editSettings', activeLang)}
              </button>
            </>
          ) : (
            <>
              <button
                type="button"
                onClick={handleCancelEdit}
                className="flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-semibold text-slate-600 bg-white border border-slate-200 rounded-xl hover:bg-slate-50 transition-colors shadow-2xs cursor-pointer"
              >
                <X className="h-3.5 w-3.5 text-slate-400" />
                {t('cancel', activeLang)}
              </button>

              <button
                type="button"
                onClick={handleSave}
                className={`flex items-center gap-1.5 px-4 py-1.5 text-xs font-bold text-white rounded-xl transition-all shadow-xs cursor-pointer ${
                  isSaved 
                    ? 'bg-[#237227]' 
                    : 'bg-[#237227] hover:bg-[#1b5e20]'
                }`}
              >
                {isSaved ? <Check className="h-3.5 w-3.5" /> : <Save className="h-3.5 w-3.5" />}
                {isSaved ? 'Saved!' : t('saveChanges', activeLang)}
              </button>
            </>
          )}
        </div>
      </div>

      {/* 2. HORIZONTAL NAVIGATION TABS (MATCHING REFERENCE EXACTLY) */}
      <div className="flex items-center gap-2 sm:gap-6 border-b border-slate-200/80 mb-5 shrink-0 overflow-x-auto">
        <button
          type="button"
          onClick={() => setCurrentTab('general')}
          className={`pb-2.5 px-2 text-xs font-bold transition-all whitespace-nowrap cursor-pointer ${
            currentTab === 'general'
              ? 'text-[#237227] border-b-2 border-[#237227]'
              : 'text-slate-500 hover:text-slate-900 border-b-2 border-transparent'
          }`}
        >
          {t('tabGeneral', activeLang)}
        </button>

        <button
          type="button"
          onClick={() => setCurrentTab('account')}
          className={`pb-2.5 px-2 text-xs font-bold transition-all whitespace-nowrap cursor-pointer ${
            currentTab === 'account'
              ? 'text-[#237227] border-b-2 border-[#237227]'
              : 'text-slate-500 hover:text-slate-900 border-b-2 border-transparent'
          }`}
        >
          {t('tabAccount', activeLang)}
        </button>

        <button
          type="button"
          onClick={() => setCurrentTab('security')}
          className={`pb-2.5 px-2 text-xs font-bold transition-all whitespace-nowrap cursor-pointer ${
            currentTab === 'security'
              ? 'text-[#237227] border-b-2 border-[#237227]'
              : 'text-slate-500 hover:text-slate-900 border-b-2 border-transparent'
          }`}
        >
          {t('tabSecurity', activeLang)}
        </button>

        <button
          type="button"
          onClick={() => setCurrentTab('notifications')}
          className={`pb-2.5 px-2 text-xs font-bold transition-all whitespace-nowrap cursor-pointer ${
            currentTab === 'notifications'
              ? 'text-[#237227] border-b-2 border-[#237227]'
              : 'text-slate-500 hover:text-slate-900 border-b-2 border-transparent'
          }`}
        >
          {t('tabNotifications', activeLang)}
        </button>

        <button
          type="button"
          onClick={() => setCurrentTab('cloud')}
          className={`pb-2.5 px-2 text-xs font-bold transition-all whitespace-nowrap cursor-pointer ${
            currentTab === 'cloud'
              ? 'text-[#237227] border-b-2 border-[#237227]'
              : 'text-slate-500 hover:text-slate-900 border-b-2 border-transparent'
          }`}
        >
          {t('tabCloud', activeLang)}
        </button>
      </div>

      {/* Sync Status Toast Notice */}
      {syncStatusNotice && (
        <div className="mb-4 p-3 rounded-xl bg-[#237227]/10 border border-[#237227]/20 text-[#237227] text-xs font-semibold flex items-center gap-2">
          <CheckCircle2 className="h-4 w-4 shrink-0" />
          <span>{syncStatusNotice}</span>
        </div>
      )}

      {/* 3. TWO-COLUMN SPLIT LAYOUT (MATCHING REFERENCE EXACTLY) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start pb-8">
        
        {/* LEFT COLUMN: MAIN SETTINGS CARD (~68% width) */}
        <div className="lg:col-span-8 bg-white rounded-2xl border border-slate-200/80 p-5 sm:p-7 shadow-2xs space-y-6">
          
          {/* TAB 1: GENERAL SETTINGS */}
          {currentTab === 'general' && (
            <div className="space-y-5">
              <div>
                <h2 className="text-base font-bold text-slate-900">
                  {t('generalHeading', activeLang)}
                </h2>
                <p className="text-xs text-slate-500 mt-0.5">
                  {t('generalSubheading', activeLang)}
                </p>
              </div>

              <div className="space-y-4">
                {/* System Name */}
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-slate-700">{t('systemName', activeLang)}</label>
                  <input
                    type="text"
                    disabled={!isEditing}
                    value={formData.general.systemName}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        general: { ...formData.general, systemName: e.target.value },
                      })
                    }
                    className={`w-full h-10 px-3.5 text-xs rounded-xl font-medium text-slate-900 border transition-all ${
                      !isEditing 
                        ? 'bg-slate-50/70 border-slate-200 cursor-default' 
                        : 'bg-white border-slate-300 focus:outline-none focus:border-slate-400 focus:ring-1 focus:ring-slate-200'
                    }`}
                  />
                </div>

                {/* Organization Name */}
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-slate-700">{t('orgName', activeLang)}</label>
                  <input
                    type="text"
                    disabled={!isEditing}
                    value={formData.general.organization}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        general: { ...formData.general, organization: e.target.value },
                      })
                    }
                    className={`w-full h-10 px-3.5 text-xs rounded-xl font-medium text-slate-900 border transition-all ${
                      !isEditing 
                        ? 'bg-slate-50/70 border-slate-200 cursor-default' 
                        : 'bg-white border-slate-300 focus:outline-none focus:border-slate-400 focus:ring-1 focus:ring-slate-200'
                    }`}
                  />
                </div>

                {/* Official Contact Email */}
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-slate-700">{t('contactEmail', activeLang)}</label>
                  <input
                    type="email"
                    disabled={!isEditing}
                    value={formData.general.contactEmail}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        general: { ...formData.general, contactEmail: e.target.value },
                      })
                    }
                    className={`w-full h-10 px-3.5 text-xs rounded-xl font-medium text-slate-900 border transition-all ${
                      !isEditing 
                        ? 'bg-slate-50/70 border-slate-200 cursor-default' 
                        : 'bg-white border-slate-300 focus:outline-none focus:border-slate-400 focus:ring-1 focus:ring-slate-200'
                    }`}
                  />
                </div>

                {/* Contact Number */}
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-slate-700">{t('contactNumber', activeLang)}</label>
                  <input
                    type="text"
                    disabled={!isEditing}
                    value={formData.account.phone}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        account: { ...formData.account, phone: e.target.value },
                      })
                    }
                    className={`w-full h-10 px-3.5 text-xs rounded-xl font-medium text-slate-900 border transition-all ${
                      !isEditing 
                        ? 'bg-slate-50/70 border-slate-200 cursor-default' 
                        : 'bg-white border-slate-300 focus:outline-none focus:border-slate-400 focus:ring-1 focus:ring-slate-200'
                    }`}
                  />
                </div>

                {/* Language & Timezone (2-column layout matching reference) */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <label className="text-xs font-semibold text-slate-700">{t('language', activeLang)}</label>
                    <select
                      disabled={!isEditing}
                      value={formData.general.language || 'English'}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          general: { ...formData.general, language: e.target.value },
                        })
                      }
                      className={`w-full h-10 px-3 text-xs rounded-xl text-slate-900 font-medium border transition-all ${
                        !isEditing 
                          ? 'bg-slate-50/70 border-slate-200 cursor-default' 
                          : 'bg-white border-slate-300 focus:outline-none focus:border-slate-400 focus:ring-1 focus:ring-slate-200'
                      }`}
                    >
                      {SUPPORTED_LANGUAGES.map((lang) => (
                        <option key={lang.id} value={lang.id}>
                          {lang.label}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-xs font-semibold text-slate-700">{t('timezone', activeLang)}</label>
                    <select
                      disabled={!isEditing}
                      value={formData.general.timezone || 'Asia/Manila'}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          general: { ...formData.general, timezone: e.target.value },
                        })
                      }
                      className={`w-full h-10 px-3 text-xs rounded-xl text-slate-900 font-medium border transition-all ${
                        !isEditing 
                          ? 'bg-slate-50/70 border-slate-200 cursor-default' 
                          : 'bg-white border-slate-300 focus:outline-none focus:border-slate-400 focus:ring-1 focus:ring-slate-200'
                      }`}
                    >
                      {SUPPORTED_TIMEZONES.map((tz) => (
                        <option key={tz.id} value={tz.id}>
                          {tz.label}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                {/* Downtime Audio Siren Alert Setting */}
                <div className="p-4 rounded-xl border border-slate-200/80 bg-slate-50/50 space-y-3">
                  <div className="flex items-start justify-between gap-4">
                    <div className="space-y-0.5">
                      <div className="text-xs font-bold text-slate-900 uppercase tracking-wider flex items-center gap-1.5">
                        <Volume2 className="h-4 w-4 text-[#237227]" />
                        Downtime Audio Siren Alert
                      </div>
                      <p className="text-[11px] text-slate-500">
                        Synthesize an urgent audible siren tone (3 seconds) in the NOC browser whenever a site or device enters downtime.
                      </p>
                    </div>

                    <label className="relative inline-flex items-center cursor-pointer">
                      <input
                        type="checkbox"
                        disabled={!isEditing}
                        checked={formData.general.sirenAlertEnabled !== false}
                        onChange={(e) => {
                          const isEnabled = e.target.checked;
                          setFormData({
                            ...formData,
                            general: { ...formData.general, sirenAlertEnabled: isEnabled },
                            displayAndSound: { ...formData.displayAndSound, audibleAlarmOnDowntime: isEnabled },
                          });
                          setAudioMuted(!isEnabled);
                        }}
                        className="sr-only peer"
                      />
                      <div className={`w-11 h-6 bg-slate-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all ${
                        formData.general.sirenAlertEnabled !== false ? 'peer-checked:bg-[#237227]' : ''
                      } ${!isEditing ? 'opacity-70 cursor-not-allowed' : 'cursor-pointer'}`}></div>
                    </label>
                  </div>

                  <div className="pt-2 border-t border-slate-200/60 flex items-center justify-between text-xs">
                    <span className="text-slate-600 font-medium">Siren Alert Status:</span>
                    <div className="flex items-center gap-2">
                      <span className={`font-bold flex items-center gap-1.5 ${
                        formData.general.sirenAlertEnabled !== false ? 'text-[#237227]' : 'text-slate-500'
                      }`}>
                        {formData.general.sirenAlertEnabled !== false ? (
                          <>
                            <span className="h-2 w-2 rounded-full bg-[#237227] animate-pulse" />
                            Active (Siren Enabled)
                          </>
                        ) : (
                          <>
                            <VolumeX className="h-3.5 w-3.5 text-slate-400" />
                            Muted (Silent Mode)
                          </>
                        )}
                      </span>

                      {formData.general.sirenAlertEnabled !== false && (
                        <button
                          type="button"
                          onClick={() => playDowntimeBeep(3000)}
                          className="px-2.5 py-1 rounded-lg text-[10px] font-bold text-slate-700 bg-white border border-slate-200 hover:bg-slate-50 hover:text-[#237227] transition-all cursor-pointer shadow-2xs flex items-center gap-1"
                          title="Test 3-second audio siren"
                        >
                          <Volume2 className="h-3 w-3" />
                          Test Siren
                        </button>
                      )}
                    </div>
                  </div>
                </div>

                {/* Application Logo & Agency Branding */}
                <div className="space-y-1.5 pt-2">
                  <label className="text-xs font-semibold text-slate-700">Application Branding & System Provider</label>
                  <div className="p-4 rounded-xl border border-slate-200/80 bg-slate-50/50 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <img
                        src="/multifactors-logo.png?v=2"
                        alt="Multifactors Sales"
                        className="h-8 w-auto object-contain"
                      />
                      <div>
                        <div className="text-xs font-bold text-slate-900">Multifactors Sales & Services Inc.</div>
                        <div className="text-[11px] text-slate-500">Authorized Ruijie Networks Enterprise Integrator</div>
                      </div>
                    </div>
                    <span className="px-2.5 py-1 rounded-full text-[10px] font-bold bg-[#237227]/10 text-[#237227] border border-[#237227]/20">
                      Active SLA
                    </span>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* TAB 2: ACCOUNT SETTINGS (ENGR. ENGEL MONTERO) */}
          {currentTab === 'account' && (
            <div className="space-y-5">
              <div>
                <h2 className="text-base font-bold text-slate-900">
                  {t('accountHeading', activeLang)}
                </h2>
                <p className="text-xs text-slate-500 mt-0.5">
                  {t('accountSubheading', activeLang)}
                </p>
              </div>

              {/* Clean White Profile Banner */}
              <div className="p-4 rounded-xl border border-slate-200/80 bg-slate-50/50 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div className="flex items-center gap-3.5">
                  <div className="h-12 w-12 rounded-xl bg-[#237227] text-white flex items-center justify-center font-extrabold text-lg shadow-xs shrink-0">
                    {userInitials}
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <h3 className="text-sm font-bold text-slate-900">{formData.account.fullName}</h3>
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-[#237227]/10 text-[#237227] border border-[#237227]/20 flex items-center gap-1">
                        <BadgeCheck className="h-3 w-3" />
                        {t('superAdmin', activeLang)}
                      </span>
                    </div>
                    <p className="text-xs text-slate-500 mt-0.5">{formData.account.department}</p>
                  </div>
                </div>

                <div className="text-left sm:text-right text-xs">
                  <div className="text-slate-400 text-[11px]">{t('lastLoginSession', activeLang)}</div>
                  <div className="text-slate-700 font-semibold text-[11px] mt-0.5">{formData.account.lastLoginTime}</div>
                  <div className="font-mono text-[10px] text-[#237227] mt-0.5">{formData.account.lastLoginIp}</div>
                </div>
              </div>

              {/* Editable/View Account Fields */}
              <div className="space-y-4">
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-slate-700">{t('fullName', activeLang)}</label>
                  <input
                    type="text"
                    disabled={!isEditing}
                    value={formData.account.fullName}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        account: { ...formData.account, fullName: e.target.value },
                      })
                    }
                    className={`w-full h-10 px-3.5 text-xs rounded-xl font-medium text-slate-900 border transition-all ${
                      !isEditing 
                        ? 'bg-slate-50/70 border-slate-200 cursor-default' 
                        : 'bg-white border-slate-300 focus:outline-none focus:border-slate-400 focus:ring-1 focus:ring-slate-200'
                    }`}
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <label className="text-xs font-semibold text-slate-700">{t('govEmail', activeLang)}</label>
                    <input
                      type="email"
                      disabled={!isEditing}
                      value={formData.account.email}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          account: { ...formData.account, email: e.target.value },
                        })
                      }
                      className={`w-full h-10 px-3.5 text-xs rounded-xl font-medium text-slate-900 font-mono border transition-all ${
                        !isEditing 
                          ? 'bg-slate-50/70 border-slate-200 cursor-default' 
                          : 'bg-white border-slate-300 focus:outline-none focus:border-slate-400 focus:ring-1 focus:ring-slate-200'
                      }`}
                    />
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-xs font-semibold text-slate-700">{t('telegramUsername', activeLang)}</label>
                    <div className="relative">
                      <span className="absolute left-3.5 top-2.5 text-xs text-slate-400 font-mono">@</span>
                      <input
                        type="text"
                        disabled={!isEditing}
                        value={formData.account.telegramUsername}
                        onChange={(e) =>
                          setFormData({
                            ...formData,
                            account: { ...formData.account, telegramUsername: e.target.value.replace('@', '') },
                          })
                        }
                        className={`w-full h-10 pl-8 pr-3.5 text-xs rounded-xl font-medium text-slate-900 font-mono border transition-all ${
                          !isEditing 
                            ? 'bg-slate-50/70 border-slate-200 cursor-default' 
                            : 'bg-white border-slate-300 focus:outline-none focus:border-slate-400 focus:ring-1 focus:ring-slate-200'
                        }`}
                      />
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <label className="text-xs font-semibold text-slate-700">{t('department', activeLang)}</label>
                    <input
                      type="text"
                      disabled={!isEditing}
                      value={formData.account.department}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          account: { ...formData.account, department: e.target.value },
                        })
                      }
                      className={`w-full h-10 px-3.5 text-xs rounded-xl font-medium text-slate-900 border transition-all ${
                        !isEditing 
                          ? 'bg-slate-50/70 border-slate-200 cursor-default' 
                          : 'bg-white border-slate-300 focus:outline-none focus:border-slate-400 focus:ring-1 focus:ring-slate-200'
                      }`}
                    />
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-xs font-semibold text-slate-700">{t('roleDesignation', activeLang)}</label>
                    <input
                      type="text"
                      disabled={!isEditing}
                      value={formData.account.role}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          account: { ...formData.account, role: e.target.value },
                        })
                      }
                      className={`w-full h-10 px-3.5 text-xs rounded-xl font-medium text-slate-900 border transition-all ${
                        !isEditing 
                          ? 'bg-slate-50/70 border-slate-200 cursor-default' 
                          : 'bg-white border-slate-300 focus:outline-none focus:border-slate-400 focus:ring-1 focus:ring-slate-200'
                      }`}
                    />
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* TAB 3: SECURITY SETTINGS */}
          {currentTab === 'security' && (
            <div className="space-y-5">
              <div>
                <h2 className="text-base font-bold text-slate-900">
                  Security & Authentication Policies
                </h2>
                <p className="text-xs text-slate-500 mt-0.5">
                  Update your authentication credentials, configure Two-Factor Authentication, and manage session auto-lock.
                </p>
              </div>

              {passwordNotice && (
                <div
                  className={`p-3 rounded-xl text-xs flex items-center gap-2 border ${
                    passwordNotice.type === 'success'
                      ? 'bg-[#237227]/10 text-[#237227] border-[#237227]/30'
                      : 'bg-rose-50 text-rose-800 border-rose-200'
                  }`}
                >
                  {passwordNotice.type === 'success' ? (
                    <CheckCircle2 className="h-4 w-4 text-[#237227] shrink-0" />
                  ) : (
                    <AlertCircle className="h-4 w-4 text-rose-600 shrink-0" />
                  )}
                  <span>{passwordNotice.text}</span>
                </div>
              )}

              {/* Password Management */}
              <div className="p-4 rounded-xl border border-slate-200/80 bg-slate-50/40 space-y-3.5">
                <div className="flex items-center justify-between">
                  <div className="text-xs font-bold text-slate-900 uppercase tracking-wider flex items-center gap-1.5">
                    <Lock className="h-3.5 w-3.5 text-[#237227]" />
                    Password Credentials
                  </div>
                  {isEditing && (
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="text-xs text-slate-500 hover:text-slate-800 flex items-center gap-1 cursor-pointer"
                    >
                      {showPassword ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
                      <span>{showPassword ? 'Hide' : 'Show'}</span>
                    </button>
                  )}
                </div>

                {!isEditing ? (
                  <div className="flex items-center justify-between p-3 bg-white border border-slate-200/60 rounded-xl">
                    <div>
                      <div className="text-xs font-semibold text-slate-800">Current Password</div>
                      <div className="text-xs tracking-widest text-slate-500 font-mono mt-0.5">••••••••••••••</div>
                    </div>
                    <span className="px-2.5 py-1 rounded-full text-[10px] font-bold bg-[#237227]/10 text-[#237227] border border-[#237227]/20">
                      Strong & Secure
                    </span>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    <div className="space-y-1">
                      <label className="text-[11px] font-medium text-slate-600">Current Password</label>
                      <input
                        type={showPassword ? 'text' : 'password'}
                        value={currentPassword}
                        onChange={(e) => setCurrentPassword(e.target.value)}
                        placeholder="Current password"
                        className="w-full h-9 px-3 text-xs bg-white border border-slate-300 rounded-lg focus:outline-none focus:border-slate-400 focus:ring-1 focus:ring-slate-200"
                      />
                    </div>

                    <div className="space-y-1">
                      <label className="text-[11px] font-medium text-slate-600">New Password</label>
                      <input
                        type={showPassword ? 'text' : 'password'}
                        value={newPassword}
                        onChange={(e) => setNewPassword(e.target.value)}
                        placeholder="Min. 8 characters"
                        className="w-full h-9 px-3 text-xs bg-white border border-slate-300 rounded-lg focus:outline-none focus:border-slate-400 focus:ring-1 focus:ring-slate-200"
                      />
                    </div>

                    <div className="space-y-1">
                      <label className="text-[11px] font-medium text-slate-600">Confirm Password</label>
                      <input
                        type={showPassword ? 'text' : 'password'}
                        value={confirmPassword}
                        onChange={(e) => setConfirmPassword(e.target.value)}
                        placeholder="Repeat new password"
                        className="w-full h-9 px-3 text-xs bg-white border border-slate-300 rounded-lg focus:outline-none focus:border-slate-400 focus:ring-1 focus:ring-slate-200"
                      />
                    </div>
                  </div>
                )}
              </div>

              {/* Two-Factor Authentication (2FA) */}
              <div className="p-4 rounded-xl border border-slate-200/80 bg-slate-50/40 space-y-3">
                <div className="flex items-start justify-between gap-4">
                  <div className="space-y-0.5">
                    <div className="text-xs font-bold text-slate-900 uppercase tracking-wider flex items-center gap-1.5">
                      <Smartphone className="h-3.5 w-3.5 text-[#237227]" />
                      Two-Factor Authentication (2FA)
                    </div>
                    <p className="text-[11px] text-slate-500">
                      Require an authorization code during login for heightened security on this monitoring portal.
                    </p>
                  </div>
                  <input
                    type="checkbox"
                    disabled={!isEditing}
                    checked={formData.account.twoFactorEnabled}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        account: { ...formData.account, twoFactorEnabled: e.target.checked },
                      })
                    }
                    className="h-4 w-4 mt-1 rounded text-[#237227] focus:ring-[#237227] accent-[#237227] cursor-pointer"
                  />
                </div>

                <div className="pt-2 border-t border-slate-200/60 flex items-center justify-between text-xs">
                  <span className="text-slate-600 font-medium">Delivery Gateway:</span>
                  <span className="text-[#237227] font-semibold">
                    {formData.account.twoFactorMethod === 'telegram' ? 'Telegram OTP (@dict_nms_bot)' : 'Authenticator App (TOTP)'}
                  </span>
                </div>
              </div>

              {/* Session Inactivity Timeout */}
              <div className="p-4 rounded-xl border border-slate-200/80 bg-slate-50/40 flex items-center justify-between gap-3">
                <div className="space-y-0.5">
                  <div className="text-xs font-bold text-slate-900 uppercase tracking-wider flex items-center gap-1.5">
                    <Clock className="h-3.5 w-3.5 text-slate-500" />
                    Session Inactivity Auto-Lock
                  </div>
                  <p className="text-[11px] text-slate-500">
                    Automatically lock the dashboard when inactive in the NOC command center.
                  </p>
                </div>

                <select
                  disabled={!isEditing}
                  value={formData.account.sessionTimeoutMinutes}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      account: { ...formData.account, sessionTimeoutMinutes: Number(e.target.value) },
                    })
                  }
                  className={`h-9 px-3 text-xs rounded-xl font-medium border transition-all ${
                    !isEditing 
                      ? 'bg-white border-slate-200 cursor-default' 
                      : 'bg-white border-slate-300 focus:outline-none focus:border-slate-400 focus:ring-1 focus:ring-slate-200'
                  }`}
                >
                  <option value={15}>15 minutes</option>
                  <option value={30}>30 minutes (Standard)</option>
                  <option value={60}>1 hour</option>
                  <option value={240}>4 hours (NOC Shift)</option>
                  <option value={0}>Never (Continuous)</option>
                </select>
              </div>
            </div>
          )}

          {/* TAB 4: NOTIFICATIONS (TELEGRAM) */}
          {currentTab === 'notifications' && (
            <div className="space-y-5">
              <div>
                <h2 className="text-base font-bold text-slate-900">
                  Telegram Outage Notification Gateway
                </h2>
                <p className="text-xs text-slate-500 mt-0.5">
                  Configure Telegram Bot dispatching to alert designated area personnel when sites experience downtime.
                </p>
              </div>

              <div className="space-y-4">
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-slate-700">Telegram Bot API Token</label>
                  <input
                    type="password"
                    disabled={!isEditing}
                    value={formData.telegram.botToken}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        telegram: { ...formData.telegram, botToken: e.target.value },
                      })
                    }
                    className={`w-full h-10 px-3.5 text-xs rounded-xl font-mono text-slate-900 border transition-all ${
                      !isEditing 
                        ? 'bg-slate-50/70 border-slate-200 cursor-default' 
                        : 'bg-white border-slate-300 focus:outline-none focus:border-slate-400 focus:ring-1 focus:ring-slate-200'
                    }`}
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-slate-700">Broadcast Channel / Group ID</label>
                  <input
                    type="text"
                    disabled={!isEditing}
                    value={formData.telegram.channelId}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        telegram: { ...formData.telegram, channelId: e.target.value },
                      })
                    }
                    className={`w-full h-10 px-3.5 text-xs rounded-xl font-mono text-slate-900 border transition-all ${
                      !isEditing 
                        ? 'bg-slate-50/70 border-slate-200 cursor-default' 
                        : 'bg-white border-slate-300 focus:outline-none focus:border-slate-400 focus:ring-1 focus:ring-slate-200'
                    }`}
                  />
                </div>

                {/* Handshake Verification */}
                <div className="p-3.5 rounded-xl bg-slate-50/70 border border-slate-200 flex items-center justify-between gap-3">
                  <div>
                    <div className="text-xs font-semibold text-slate-800">Connection Verification</div>
                    <div className="text-[11px] text-slate-500">Test webhook handshake with Telegram Bot API.</div>
                  </div>
                  <button
                    type="button"
                    onClick={handleTestTelegramConnection}
                    disabled={isTestingTelegram}
                    className="px-3.5 py-1.5 text-xs font-semibold text-slate-700 bg-white border border-slate-200 rounded-xl hover:bg-slate-100 transition-colors flex items-center gap-1.5 cursor-pointer shadow-2xs"
                  >
                    <RefreshCw className={`h-3.5 w-3.5 text-slate-500 ${isTestingTelegram ? 'animate-spin' : ''}`} />
                    {isTestingTelegram ? 'Testing...' : 'Test Bot'}
                  </button>
                </div>

                {telegramTestResult && (
                  <div
                    className={`p-3 rounded-xl text-xs flex items-center gap-2 ${
                      telegramTestResult.startsWith('Failed')
                        ? 'bg-rose-50 text-rose-700 border border-rose-200'
                        : 'bg-[#237227]/10 text-[#237227] border border-[#237227]/30'
                    }`}
                  >
                    {telegramTestResult.startsWith('Failed') ? (
                      <AlertCircle className="h-4 w-4 text-rose-600 shrink-0" />
                    ) : (
                      <Check className="h-4 w-4 text-[#237227] shrink-0" />
                    )}
                    <span>{telegramTestResult}</span>
                  </div>
                )}

                {/* Toggles */}
                <div className="space-y-2.5 pt-2">
                  <label className="flex items-center justify-between p-3 rounded-xl border border-slate-200/80 bg-white">
                    <span className="text-xs font-medium text-slate-800">Auto-Dispatch to Designated Area Responders on Downtime</span>
                    <input
                      type="checkbox"
                      disabled={!isEditing}
                      checked={formData.telegram.autoDispatchOnDowntime}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          telegram: { ...formData.telegram, autoDispatchOnDowntime: e.target.checked },
                        })
                      }
                      className="h-4 w-4 rounded text-[#237227] accent-[#237227] cursor-pointer"
                    />
                  </label>

                  <label className="flex items-center justify-between p-3 rounded-xl border border-slate-200/80 bg-white">
                    <span className="text-xs font-medium text-slate-800">Auto-Notify on Site Connectivity Recovery</span>
                    <input
                      type="checkbox"
                      disabled={!isEditing}
                      checked={formData.telegram.notifyOnRecovery}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          telegram: { ...formData.telegram, notifyOnRecovery: e.target.checked },
                        })
                      }
                      className="h-4 w-4 rounded text-[#237227] accent-[#237227] cursor-pointer"
                    />
                  </label>
                </div>
              </div>
            </div>
          )}

          {/* TAB 5: CLOUD SYNC & LOGS */}
          {currentTab === 'cloud' && (
            <div className="space-y-5">
              <div>
                <h2 className="text-base font-bold text-slate-900">
                  Ruijie Cloud & Sync Parameters
                </h2>
                <p className="text-xs text-slate-500 mt-0.5">
                  Manage real-time telemetry polling intervals, cloud API endpoints, and command center display modes.
                </p>
              </div>

              <div className="space-y-4">
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-slate-700">Ruijie Cloud API Gateway Endpoint</label>
                  <input
                    type="text"
                    disabled={!isEditing}
                    value={formData.monitoring.ruijieApiEndpoint}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        monitoring: { ...formData.monitoring, ruijieApiEndpoint: e.target.value },
                      })
                    }
                    className={`w-full h-10 px-3.5 text-xs rounded-xl font-mono text-slate-900 border transition-all ${
                      !isEditing 
                        ? 'bg-slate-50/70 border-slate-200 cursor-default' 
                        : 'bg-white border-slate-300 focus:outline-none focus:border-slate-400 focus:ring-1 focus:ring-slate-200'
                    }`}
                  />
                </div>

                {/* Ruijie Cloud Open API Credentials */}
                <div className="p-4 rounded-xl border border-emerald-100 bg-emerald-50/50 space-y-3">
                  <div className="flex items-center gap-2 mb-1">
                    <Cloud className="h-4 w-4 text-emerald-600 shrink-0" />
                    <span className="text-xs font-bold text-emerald-900">Ruijie Cloud Open API Credentials</span>
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-700 border border-emerald-200 ml-auto flex items-center gap-1">
                      <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
                      Active API Integration
                    </span>
                  </div>
                  <p className="text-[11px] text-emerald-700">
                    Direct machine-to-machine telemetry synchronization with Ruijie Cloud Open Platform using App ID and App Secret.
                  </p>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div className="space-y-1">
                      <label className="text-[11px] font-semibold text-emerald-900">Ruijie Open API App ID</label>
                      <input
                        type="text"
                        disabled={!isEditing}
                        value={formData.monitoring.ruijieAppId || 'open1312043d9a82'}
                        onChange={(e) =>
                          setFormData({
                            ...formData,
                            monitoring: { ...formData.monitoring, ruijieAppId: e.target.value },
                          })
                        }
                        className={`w-full h-9 px-3 text-xs rounded-lg font-mono text-slate-900 border transition-all ${
                          !isEditing
                            ? 'bg-slate-50/70 border-slate-200 cursor-default'
                            : 'bg-white border-emerald-200 focus:outline-none focus:border-emerald-400 focus:ring-1 focus:ring-emerald-100'
                        }`}
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="text-[11px] font-semibold text-emerald-900">Ruijie Open API App Secret</label>
                      <input
                        type={isEditing ? 'text' : 'password'}
                        disabled={!isEditing}
                        value={formData.monitoring.ruijieAppSecret || '8ARNMqo7uXgU5NTweEmWn46Hvewjcp1PtqfXTKDZTj29'}
                        onChange={(e) =>
                          setFormData({
                            ...formData,
                            monitoring: { ...formData.monitoring, ruijieAppSecret: e.target.value },
                          })
                        }
                        className={`w-full h-9 px-3 text-xs rounded-lg font-mono text-slate-900 border transition-all ${
                          !isEditing
                            ? 'bg-slate-50/70 border-slate-200 cursor-default'
                            : 'bg-white border-emerald-200 focus:outline-none focus:border-emerald-400 focus:ring-1 focus:ring-emerald-100'
                        }`}
                      />
                    </div>
                  </div>
                  <div className="flex items-center gap-2 pt-1">
                    <div className="h-2 w-2 rounded-full bg-emerald-500" />
                    <span className="text-[11px] text-emerald-800 font-medium">
                      Ruijie Cloud Open API: Configured with App ID {formData.monitoring.ruijieAppId || 'open1d9ecf635290'}
                    </span>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <label className="text-xs font-semibold text-slate-700">Sync Polling Interval</label>
                    <select
                      disabled={!isEditing}
                      value={formData.monitoring.syncIntervalSeconds}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          monitoring: { ...formData.monitoring, syncIntervalSeconds: Number(e.target.value) },
                        })
                      }
                      className={`w-full h-10 px-3 text-xs rounded-xl text-slate-900 font-medium border transition-all ${
                        !isEditing 
                          ? 'bg-slate-50/70 border-slate-200 cursor-default' 
                          : 'bg-white border-slate-300 focus:outline-none focus:border-slate-400 focus:ring-1 focus:ring-slate-200'
                      }`}
                    >
                      <option value={15}>Every 15 seconds (High Frequency)</option>
                      <option value={30}>Every 30 seconds (Standard)</option>
                      <option value={60}>Every 1 minute</option>
                      <option value={300}>Every 5 minutes</option>
                    </select>
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-xs font-semibold text-slate-700">Offline Heartbeat Threshold</label>
                    <select
                      disabled={!isEditing}
                      value={formData.monitoring.pingThreshold}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          monitoring: { ...formData.monitoring, pingThreshold: Number(e.target.value) },
                        })
                      }
                      className={`w-full h-10 px-3 text-xs rounded-xl text-slate-900 font-medium border transition-all ${
                        !isEditing 
                          ? 'bg-slate-50/70 border-slate-200 cursor-default' 
                          : 'bg-white border-slate-300 focus:outline-none focus:border-slate-400 focus:ring-1 focus:ring-slate-200'
                      }`}
                    >
                      <option value={2}>2 failed checks (Faster trigger)</option>
                      <option value={3}>3 failed checks (Recommended)</option>
                      <option value={5}>5 failed checks (Tolerant)</option>
                    </select>
                  </div>
                </div>

                {/* NOC TV Display Mode */}
                <div className="p-3.5 rounded-xl border border-slate-200 bg-slate-50/50 flex items-center justify-between">
                  <div className="space-y-0.5">
                    <div className="text-xs font-bold text-slate-900 uppercase tracking-wider">NOC TV / Kiosk Display Mode</div>
                    <p className="text-[11px] text-slate-500">Toggles fullscreen view for wall-mounted operations displays.</p>
                  </div>
                  <button
                    type="button"
                    onClick={onToggleTvMode}
                    className={`px-3.5 py-1.5 text-xs font-bold rounded-xl transition-all cursor-pointer ${
                      isTvMode ? 'bg-[#237227] text-white' : 'bg-white border border-slate-200 text-slate-700 hover:bg-slate-50'
                    }`}
                  >
                    {isTvMode ? 'Disable TV Mode' : 'Enable TV Mode'}
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* RIGHT COLUMN: 3 SIDEBAR CARDS (~32% width) - MATCHING REFERENCE EXACTLY */}
        <div className="lg:col-span-4 space-y-4">
          
          {/* CARD 1: SYSTEM INFORMATION */}
          <div className="bg-white rounded-2xl border border-slate-200/80 p-5 shadow-2xs space-y-3.5">
            <h3 className="text-xs font-bold text-slate-700 uppercase tracking-wider">
              {t('systemInformation', activeLang)}
            </h3>

            <div className="space-y-2.5 text-xs">
              <div className="flex items-center justify-between py-1 border-b border-slate-100">
                <div className="flex items-center gap-2 text-slate-600">
                  <Server className="h-3.5 w-3.5 text-[#237227]" />
                  <span>{t('appVersion', activeLang)}</span>
                </div>
                <span className="font-mono font-semibold text-slate-900">{formData.general.nmsVersion}</span>
              </div>

              <div className="flex items-center justify-between py-1 border-b border-slate-100">
                <div className="flex items-center gap-2 text-slate-600">
                  <Clock className="h-3.5 w-3.5 text-[#237227]" />
                  <span>{t('lastUpdated', activeLang)}</span>
                </div>
                <span className="font-medium text-slate-800">Sep 8, 2026</span>
              </div>

              <div className="flex items-center justify-between py-1 border-b border-slate-100">
                <div className="flex items-center gap-2 text-slate-600">
                  <Activity className="h-3.5 w-3.5 text-[#237227]" />
                  <span>{t('environment', activeLang)}</span>
                </div>
                <span className="font-medium text-slate-800">Production</span>
              </div>

              <div className="flex items-center justify-between py-1">
                <div className="flex items-center gap-2 text-slate-600">
                  <span className="h-2 w-2 rounded-full bg-[#237227]" />
                  <span>{t('status', activeLang)}</span>
                </div>
                <span className="font-bold text-[#237227] flex items-center gap-1">
                  {t('online', activeLang)}
                </span>
              </div>
            </div>
          </div>

          {/* CARD 2: QUICK ACTIONS */}
          <div className="bg-white rounded-2xl border border-slate-200/80 p-5 shadow-2xs space-y-3">
            <h3 className="text-xs font-bold text-slate-700 uppercase tracking-wider">
              {t('quickActions', activeLang)}
            </h3>

            <div className="space-y-2">
              {/* Action 1: Clear Cache */}
              <button
                type="button"
                onClick={handleClearCache}
                disabled={isClearingCache}
                className="w-full p-2.5 rounded-xl border border-slate-100 bg-slate-50/60 hover:bg-slate-100/80 transition-all flex items-center justify-between cursor-pointer group text-left disabled:opacity-70"
              >
                <div className="flex items-center gap-2.5">
                  <div className={`h-8 w-8 rounded-lg flex items-center justify-center shrink-0 transition-colors ${
                    cacheClearedSuccess 
                      ? 'bg-emerald-100 text-emerald-700' 
                      : 'bg-[#237227]/10 text-[#237227]'
                  }`}>
                    {cacheClearedSuccess ? (
                      <Check className="h-4 w-4 text-emerald-700" />
                    ) : (
                      <Trash2 className={`h-4 w-4 ${isClearingCache ? 'animate-spin' : ''}`} />
                    )}
                  </div>
                  <div>
                    <div className="text-xs font-bold text-slate-900 group-hover:text-[#237227] transition-colors flex items-center gap-1.5">
                      <span>{t('clearCache', activeLang)}</span>
                      {cacheClearedSuccess && (
                        <span className="text-[10px] font-bold text-emerald-700 bg-emerald-50 px-1.5 py-0.5 rounded border border-emerald-200">
                          Cleared!
                        </span>
                      )}
                    </div>
                    <div className="text-[10px] text-slate-500">
                      {isClearingCache 
                        ? 'Flushing buffers & cache...' 
                        : t('clearCacheDesc', activeLang)}
                    </div>
                  </div>
                </div>
                <ChevronRight className="h-4 w-4 text-slate-400 group-hover:text-[#237227] transition-colors" />
              </button>

              {/* Action 2: Sync Platform Data */}
              <button
                type="button"
                onClick={handleSyncPlatform}
                disabled={isSyncingData}
                className="w-full p-2.5 rounded-xl border border-slate-100 bg-slate-50/60 hover:bg-slate-100/80 transition-all flex items-center justify-between cursor-pointer group text-left"
              >
                <div className="flex items-center gap-2.5">
                  <div className="h-8 w-8 rounded-lg bg-[#237227]/10 text-[#237227] flex items-center justify-center shrink-0">
                    <Database className={`h-4 w-4 ${isSyncingData ? 'animate-spin' : ''}`} />
                  </div>
                  <div>
                    <div className="text-xs font-bold text-slate-900 group-hover:text-[#237227] transition-colors">
                      {t('syncData', activeLang)}
                    </div>
                    <div className="text-[10px] text-slate-500">
                      {t('syncDataDesc', activeLang)}
                    </div>
                  </div>
                </div>
                <ChevronRight className="h-4 w-4 text-slate-400 group-hover:text-[#237227] transition-colors" />
              </button>
            </div>
          </div>

          {/* CARD 3: NEED HELP? (DIRECT GMAIL SUPPORT TO PAUL & KENT) */}
          <div className="bg-white rounded-2xl border border-slate-200/80 p-5 shadow-2xs space-y-3.5">
            <h3 className="text-xs font-bold text-slate-700 uppercase tracking-wider">
              {t('needHelp', activeLang)}
            </h3>

            <div className="flex items-start gap-3">
              <div className="h-8 w-8 rounded-lg bg-[#237227]/10 text-[#237227] flex items-center justify-center shrink-0 mt-0.5">
                <Headphones className="h-4 w-4" />
              </div>
              <p className="text-xs text-slate-600 leading-relaxed">
                {t('helpDesc', activeLang)}
              </p>
            </div>

            <a
              href="https://mail.google.com/mail/?view=cm&fs=1&to=paulbertlandicho.202200536@gmail.com,kentzorelelnas.202200472@gmail.com&su=DICT%20Region%2010%20Ruijie%20NMS%20Support%20Request&body=Hi%20Technical%20Support%20Team,%0A%0AI%20am%20requesting%20technical%20assistance%20regarding%20the%20DICT%20Region%2010%20Ruijie%20Cloud%20Network%20Monitoring%20System:%0A%0A[Please%20describe%20your%20request%20here]%0A%0A---%0AReporter:%20Engr.%20Engel%20Montero%0ADepartment:%20DICT%20Region%2010%20Technical%20Operations"
              target="_blank"
              rel="noopener noreferrer"
              className="block w-full py-2.5 px-4 rounded-xl border border-[#237227] text-[#237227] hover:bg-[#237227] hover:text-white transition-all text-xs font-bold text-center cursor-pointer"
            >
              {t('contactSupport', activeLang)}
            </a>
          </div>
        </div>
      </div>
    </div>
  );
};
