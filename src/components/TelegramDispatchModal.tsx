'use client';

import React, { useState, useMemo, useEffect } from 'react';
import { 
  X, 
  Send, 
  UserCheck, 
  Copy, 
  Check, 
  ExternalLink,
  ChevronDown,
  Building2,
  MapPin,
  MessageSquare,
  Zap,
  CheckCircle2
} from 'lucide-react';
import { AssignedHandler, SiteInfrastructure } from '@/types/dashboard';

interface TelegramDispatchModalProps {
  isOpen: boolean;
  onClose: () => void;
  sites: SiteInfrastructure[];
  onUpdatePersonnel: (siteName: string, updatedHandler: AssignedHandler, isDispatch?: boolean) => void;
  onSendTelegramDispatch: (site: SiteInfrastructure, handler: AssignedHandler, notes: string) => void;
}

export const TelegramDispatchModal: React.FC<TelegramDispatchModalProps> = ({
  isOpen,
  onClose,
  sites,
  onUpdatePersonnel,
  onSendTelegramDispatch,
}) => {
  // Filter for down sites
  const downSites = useMemo(() => {
    const offline = sites.filter((s) => s.status === 'Downtime');
    return offline.length > 0 ? offline : sites.slice(0, 5);
  }, [sites]);

  const [selectedSiteId, setSelectedSiteId] = useState<string>(downSites[0]?.id || '');

  const currentSite = useMemo(() => {
    return downSites.find((s) => s.id === selectedSiteId) || downSites[0] || null;
  }, [downSites, selectedSiteId]);

  // Assigned handler state
  const [personName, setPersonName] = useState<string>(() => currentSite?.assignedHandler.name || '');
  const [personPhone, setPersonPhone] = useState<string>(() => currentSite?.assignedHandler.phone || '');
  const [personTelegram, setPersonTelegram] = useState<string>(() => currentSite?.assignedHandler.telegram.replace(/^@/, '') || '');
  const [personChatId, setPersonChatId] = useState<string>(() => currentSite?.assignedHandler.chatId || '');
  const [personRole, setPersonRole] = useState<string>(() => currentSite?.assignedHandler.role || 'Field Engineer');
  const [dispatchNotes, setDispatchNotes] = useState<string>(
    'Urgent on-site triage required. Please inspect Ruijie gateway power and optical uplink.'
  );

  const [copiedMessage, setCopiedMessage] = useState<boolean>(false);
  const [isCustomPersonnel, setIsCustomPersonnel] = useState<boolean>(false);
  const [rosterPersonnel, setRosterPersonnel] = useState<AssignedHandler[]>([]);

  // Load live responders directly from MySQL database API (deduplicated)
  useEffect(() => {
    fetch('/api/assignments')
      .then((r) => r.json())
      .then((d) => {
        if (d.success && Array.isArray(d.data)) {
          const seen = new Set<string>();
          const uniqueRoster: AssignedHandler[] = [];
          for (const a of d.data) {
            const key = (a.personName || '').trim().toLowerCase();
            if (key && !seen.has(key)) {
              seen.add(key);
              uniqueRoster.push({
                name: a.personName,
                phone: a.phone || '',
                telegram: a.telegram || '',
                chatId: a.chatId || '',
                role: a.role || 'Designated Area Responder',
              });
            }
          }
          setRosterPersonnel(uniqueRoster);
        }
      })
      .catch((e) => console.error('Error fetching roster personnel from database:', e));
  }, []);

  // When dropdown selects a different down site, update personnel fields
  const handleSiteChange = (newSiteId: string) => {
    setSelectedSiteId(newSiteId);
    const target = downSites.find((s) => s.id === newSiteId);
    if (target?.assignedHandler) {
      setPersonName(target.assignedHandler.name);
      setPersonPhone(target.assignedHandler.phone);
      setPersonTelegram(target.assignedHandler.telegram.replace(/^@/, ''));
      setPersonChatId(target.assignedHandler.chatId || '');
      setPersonRole(target.assignedHandler.role || 'Field Engineer');
      setIsCustomPersonnel(false);
    }
  };

  const handleSelectRosterPersonnel = (rosterPerson: AssignedHandler) => {
    setPersonName(rosterPerson.name);
    setPersonPhone(rosterPerson.phone);
    setPersonTelegram(rosterPerson.telegram.replace(/^@/, ''));
    setPersonChatId(rosterPerson.chatId || '');
    setPersonRole(rosterPerson.role || 'Field Specialist');
    setIsCustomPersonnel(false);
  };

  const telegramMessage = useMemo(() => {
    if (!currentSite) return '';
    return [
      `🚨 [DICT-RUIJIE OUTAGE ALERT]`,
      `📍 Site: ${currentSite.name} (${currentSite.code})`,
      `⚠️ Status: ${currentSite.alarmType || 'All device offline'}`,
      `🏢 Area: ${currentSite.province}, ${currentSite.region}`,
      `🌐 Gateway IP: ${currentSite.lastKnownIp}`,
      `⏱️ Downtime Duration: ${currentSite.downtimeDuration || 'Active'}`,
      `━━━━━━━━━━━━━━━━━━━━`,
      `👤 Assigned Engineer: ${personName}`,
      `📞 Contact: ${personPhone}`,
      `✈️ Telegram: @${personTelegram.replace(/^@/, '')}`,
      `📋 Task Notes: ${dispatchNotes}`,
      `━━━━━━━━━━━━━━━━━━━━`,
      `NOC Admin Dispatch Command • Ruijie Cloud Mindanao`,
    ].join('\n');
  }, [currentSite, personName, personPhone, personTelegram, dispatchNotes]);

  const handleCopyTelegramMessage = () => {
    navigator.clipboard.writeText(telegramMessage);
    setCopiedMessage(true);
    setTimeout(() => setCopiedMessage(false), 2000);
  };

  const handleDispatchTelegram = () => {
    if (!currentSite) return;

    const handlerPayload: AssignedHandler = {
      name: personName.trim() || currentSite.assignedHandler.name,
      phone: personPhone.trim() || currentSite.assignedHandler.phone,
      telegram: personTelegram.trim().replace(/^@/, '') || currentSite.assignedHandler.telegram,
      chatId: personChatId || currentSite.assignedHandler.chatId,
      role: personRole || 'Assigned Field Responder',
    };

    onUpdatePersonnel(currentSite.name, handlerPayload, false);
    onSendTelegramDispatch(currentSite, handlerPayload, dispatchNotes);

    // Call dynamic backend Telegram API
    fetch('/api/telegram/dispatch', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        siteId: currentSite.id,
        siteName: currentSite.name,
        siteCode: currentSite.code,
        severity: currentSite.severity,
        alarmType: currentSite.alarmType,
        downtimeDuration: currentSite.downtimeDuration,
        recipientName: handlerPayload.name,
        telegramUsername: handlerPayload.telegram,
        chatId: handlerPayload.chatId || personChatId,
        customNotes: dispatchNotes,
      }),
    }).catch((e) => console.warn('Telegram dispatch notice:', e));

    const targetUsername = handlerPayload.telegram.replace(/^@/, '');
    const encodedText = encodeURIComponent(telegramMessage);
    if (targetUsername) {
      if (/^\d+$/.test(targetUsername)) {
        window.open('https://t.me/multifactors_bot', '_blank');
      } else {
        window.open(`https://t.me/${targetUsername}?text=${encodedText}`, '_blank');
      }
    }
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div 
      className="fixed inset-0 z-[9999] flex items-center justify-center p-4 sm:p-6 bg-black/50 backdrop-blur-xs animate-in fade-in duration-150"
      onClick={onClose}
    >
      <div 
        className="relative w-full max-w-xl bg-white rounded-2xl shadow-2xl border border-zinc-200 flex flex-col max-h-[90vh] overflow-hidden animate-in zoom-in-95 duration-150"
        style={{ fontFamily: 'Arial, Helvetica, sans-serif' }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="px-6 py-4 border-b border-zinc-200 bg-zinc-50/80 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-xl bg-[#229ED9] text-white">
              <Send className="h-5 w-5" />
            </div>
            <div>
              <h2 className="text-base sm:text-lg font-bold text-zinc-900 leading-tight">
                Telegram Outage Dispatch
              </h2>
              <p className="text-xs text-zinc-500 mt-0.5">
                Assign a technician to a down area and dispatch alert via Telegram
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-lg text-zinc-400 hover:text-zinc-700 hover:bg-zinc-200/60 transition-colors cursor-pointer"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto p-6 space-y-4">
          {/* Automated 24/7 Dispatch Banner */}
          <div className="flex items-start gap-2.5 p-3 rounded-xl bg-emerald-50 border border-emerald-200/80 text-emerald-900 text-xs">
            <div className="p-1 rounded-lg bg-emerald-100 text-emerald-700 mt-0.5 shrink-0">
              <Zap className="h-4 w-4 fill-emerald-500 text-emerald-600" />
            </div>
            <div>
              <div className="flex items-center gap-1.5 font-bold text-emerald-900">
                <span>Automated 24/7 Outage Dispatch & Assign: ACTIVE</span>
                <span className="inline-flex items-center gap-1 px-1.5 py-0.2 rounded-full bg-emerald-200 text-emerald-800 text-[10px] font-extrabold">
                  <CheckCircle2 className="h-3 w-3" /> ENABLED
                </span>
              </div>
              <p className="text-[11px] text-emerald-700/90 mt-0.5 leading-relaxed">
                Incidents are automatically assigned to designated area responders and dispatched via Telegram upon outage detection. You can also manually review or re-send below.
              </p>
            </div>
          </div>

          {/* STEP 1: Select Down Site */}
          <div className="space-y-1.5">
            <label className="text-xs font-bold text-zinc-700 uppercase tracking-wider flex items-center gap-1.5">
              <Building2 className="h-3.5 w-3.5 text-zinc-500" />
              <span>1. Select Down Site to Address:</span>
            </label>
            <div className="relative">
              <select
                value={selectedSiteId}
                onChange={(e) => handleSiteChange(e.target.value)}
                className="w-full rounded-xl border border-zinc-300 bg-white px-3.5 py-2.5 text-xs sm:text-sm font-semibold text-zinc-800 shadow-2xs focus:border-[#229ED9] focus:outline-none cursor-pointer appearance-none pr-8 truncate"
              >
                {downSites.map((site, idx) => (
                  <option key={`${site.id}-${idx}`} value={site.id}>
                    [{site.code}] {site.name} • {site.province} ({site.offlineCount} APs down)
                  </option>
                ))}
              </select>
              <ChevronDown className="h-4 w-4 text-zinc-400 absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none" />
            </div>
          </div>

          {/* Current Site Card */}
          {currentSite && (
            <div className="p-3.5 rounded-xl bg-sky-50/50 border border-sky-200/70 space-y-2 text-xs">
              <div className="flex items-start justify-between gap-2">
                <div>
                  <span className="font-mono text-[10px] font-bold text-zinc-500 bg-white px-1.5 py-0.5 rounded border border-zinc-200">
                    {currentSite.code}
                  </span>
                  <h4 className="font-bold text-zinc-900 text-sm mt-1">
                    {currentSite.name}
                  </h4>
                  <p className="text-[11px] text-zinc-500 flex items-center gap-1 mt-0.5">
                    <MapPin className="h-3 w-3 text-zinc-400" />
                    {currentSite.province}, {currentSite.region}
                  </p>
                </div>
                <span className="inline-flex items-center gap-1 rounded-full bg-rose-50 px-2.5 py-1 text-xs font-bold text-rose-700 border border-rose-200 shrink-0">
                  <span className="h-1.5 w-1.5 rounded-full bg-rose-600 animate-pulse" />
                  {currentSite.offlineCount}/{currentSite.deviceCount} APs Offline
                </span>
              </div>

              <div className="grid grid-cols-2 gap-2 pt-2 border-t border-sky-100 text-[11px]">
                <div>
                  <span className="text-zinc-500 block">Gateway IP:</span>
                  <span className="font-mono font-bold text-zinc-800">{currentSite.lastKnownIp}</span>
                </div>
                <div>
                  <span className="text-zinc-500 block">Downtime Duration:</span>
                  <span className="font-bold text-rose-700">{currentSite.downtimeDuration || 'Active Outage'}</span>
                </div>
              </div>
            </div>
          )}

          {/* STEP 2: Admin Assigns Personnel */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <label className="text-xs font-bold text-zinc-700 uppercase tracking-wider flex items-center gap-1.5">
                <UserCheck className="h-3.5 w-3.5 text-zinc-500" />
                <span>2. Admin Assigns Responder to Area:</span>
              </label>
              <button
                type="button"
                onClick={() => setIsCustomPersonnel(!isCustomPersonnel)}
                className="text-xs text-[#0088cc] font-semibold hover:underline cursor-pointer"
              >
                {isCustomPersonnel ? 'Choose from Roster' : 'Enter Custom'}
              </button>
            </div>

            {!isCustomPersonnel ? (
              <div className="relative">
                <select
                  value={personName}
                  onChange={(e) => {
                    const found = rosterPersonnel.find((p) => p.name === e.target.value);
                    if (found) handleSelectRosterPersonnel(found);
                  }}
                  className="w-full rounded-xl border border-zinc-300 bg-white px-3.5 py-2.5 text-xs sm:text-sm font-semibold text-zinc-800 shadow-2xs focus:border-[#229ED9] focus:outline-none cursor-pointer appearance-none pr-8"
                >
                  {rosterPersonnel.map((p, idx) => (
                    <option key={`${p.name}-${p.telegram || ''}-${idx}`} value={p.name}>
                      {p.name} — @{p.telegram} ({p.role})
                    </option>
                  ))}
                </select>
                <ChevronDown className="h-4 w-4 text-zinc-400 absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none" />
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
                <div>
                  <span className="text-[10px] font-medium text-zinc-500">Full Name</span>
                  <input
                    type="text"
                    value={personName}
                    onChange={(e) => setPersonName(e.target.value)}
                    placeholder="Engineer Name"
                    className="w-full rounded-lg border border-zinc-300 bg-white px-3 py-1.5 text-xs text-zinc-800 focus:border-[#229ED9] focus:outline-none"
                  />
                </div>
                <div>
                  <span className="text-[10px] font-medium text-zinc-500">Phone Number</span>
                  <input
                    type="text"
                    value={personPhone}
                    onChange={(e) => setPersonPhone(e.target.value)}
                    placeholder="+63 9xx xxx xxxx"
                    className="w-full rounded-lg border border-zinc-300 bg-white px-3 py-1.5 text-xs text-zinc-800 focus:border-[#229ED9] focus:outline-none"
                  />
                </div>
              </div>
            )}

            {/* Telegram Handle */}
            <div className="flex items-center gap-2 p-2.5 rounded-xl bg-sky-50/60 border border-sky-200">
              <div className="p-1 rounded-md bg-sky-100 text-[#0088cc]">
                <Send className="h-3.5 w-3.5" />
              </div>
              <div className="flex-1 min-w-0">
                <span className="text-[10px] font-semibold text-zinc-500 block">Telegram Handle</span>
                <div className="flex items-center text-xs font-mono font-bold text-[#0088cc]">
                  <span>@</span>
                  <input
                    type="text"
                    value={personTelegram}
                    onChange={(e) => setPersonTelegram(e.target.value.replace(/^@/, ''))}
                    placeholder="username"
                    className="w-full bg-transparent focus:outline-none text-zinc-800 font-mono text-xs ml-0.5"
                  />
                </div>
              </div>
              <span className="text-[11px] font-medium text-zinc-500 bg-white px-2 py-0.5 rounded border border-zinc-200">
                {personPhone}
              </span>
            </div>
          </div>

          {/* STEP 3: Dispatch Notes */}
          <div className="space-y-1">
            <label className="text-xs font-bold text-zinc-700 uppercase tracking-wider flex items-center gap-1.5">
              <MessageSquare className="h-3.5 w-3.5 text-zinc-500" />
              <span>3. Dispatch Instructions / Notes:</span>
            </label>
            <textarea
              rows={2}
              value={dispatchNotes}
              onChange={(e) => setDispatchNotes(e.target.value)}
              placeholder="Notes for the responder..."
              className="w-full rounded-xl border border-zinc-300 bg-white p-2.5 text-xs text-zinc-800 shadow-2xs focus:border-[#229ED9] focus:outline-none resize-none leading-relaxed"
            />
          </div>

          {/* Telegram Preview */}
          <div className="space-y-1">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-bold uppercase tracking-wider text-zinc-500">
                Live Telegram Message
              </span>
              <button
                type="button"
                onClick={handleCopyTelegramMessage}
                className="inline-flex items-center gap-1 text-[11px] font-semibold text-zinc-600 hover:text-zinc-900 transition-colors cursor-pointer"
              >
                {copiedMessage ? <Check className="h-3 w-3 text-emerald-600" /> : <Copy className="h-3 w-3" />}
                <span>{copiedMessage ? 'Copied' : 'Copy'}</span>
              </button>
            </div>
            <pre className="p-2.5 rounded-xl bg-zinc-900 text-zinc-200 font-mono text-[10px] sm:text-[11px] whitespace-pre-wrap leading-relaxed border border-zinc-800 max-h-32 overflow-y-auto">
              {telegramMessage}
            </pre>
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-3.5 border-t border-zinc-200 bg-zinc-50 flex items-center justify-between gap-3">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-xs font-semibold text-zinc-600 hover:text-zinc-900 transition-colors cursor-pointer"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleDispatchTelegram}
            className="flex items-center gap-2 px-5 py-2 rounded-xl bg-[#229ED9] hover:bg-[#1a85b8] text-white text-xs sm:text-sm font-bold shadow-md shadow-sky-500/20 transition-all cursor-pointer"
          >
            <Send className="h-4 w-4" />
            <span>Send Dispatch & Assign</span>
            <ExternalLink className="h-3.5 w-3.5 opacity-80" />
          </button>
        </div>
      </div>
    </div>
  );
};
