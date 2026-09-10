'use client';

import React, { useState, useEffect } from 'react';
import { 
  X, 
  Phone, 
  Copy, 
  Check, 
  Pencil,
  AtSign
} from 'lucide-react';
import { AssignedHandler, SiteInfrastructure } from '@/types/dashboard';

interface SiteContactModalProps {
  site: SiteInfrastructure | null;
  onClose: () => void;
  onUpdateHandler: (siteName: string, updatedHandler: AssignedHandler, isDispatch?: boolean) => void;
}

export const SiteContactModal: React.FC<SiteContactModalProps> = ({
  site,
  onClose,
  onUpdateHandler,
}) => {
  const [copiedPhone, setCopiedPhone] = useState(false);
  const [copiedSocial, setCopiedSocial] = useState(false);
  const [copiedIp, setCopiedIp] = useState(false);
  const [copiedSummary, setCopiedSummary] = useState(false);

  // Contact person edit state
  const [isEditingContact, setIsEditingContact] = useState(false);
  const [editedName, setEditedName] = useState('');
  const [editedPhone, setEditedPhone] = useState('');
  const [editedSocial, setEditedSocial] = useState('');
  const [saveSuccess, setSaveSuccess] = useState(false);

  useEffect(() => {
    if (site) {
      setEditedName(site.assignedHandler.name);
      setEditedPhone(site.assignedHandler.phone);
      const initialSocial = site.assignedHandler.socialMedia || 
        (site.assignedHandler.telegram ? `@${site.assignedHandler.telegram.replace(/^@/, '')}` : '@noc_support');
      setEditedSocial(initialSocial);
      setIsEditingContact(false);
      setSaveSuccess(false);
      setCopiedPhone(false);
      setCopiedSocial(false);
      setCopiedIp(false);
      setCopiedSummary(false);
    }
  }, [site]);

  // Handle escape key
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        if (isEditingContact) {
          setIsEditingContact(false);
        } else {
          onClose();
        }
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onClose, isEditingContact]);

  if (!site) return null;

  const currentSiteHandler = site.assignedHandler;
  const currentSocialMedia = currentSiteHandler.socialMedia || 
    (currentSiteHandler.telegram ? `@${currentSiteHandler.telegram.replace(/^@/, '')}` : '@noc_support');

  const isAllOffline = site.offlineCount === site.deviceCount && site.deviceCount > 0;
  const isPartialOffline = site.offlineCount > 0 && site.offlineCount < site.deviceCount;
  const isOnline = site.offlineCount === 0;

  const handleCopyPhone = (phoneNum: string) => {
    navigator.clipboard.writeText(phoneNum);
    setCopiedPhone(true);
    setTimeout(() => setCopiedPhone(false), 2000);
  };

  const handleCopySocial = (social: string) => {
    navigator.clipboard.writeText(social);
    setCopiedSocial(true);
    setTimeout(() => setCopiedSocial(false), 2000);
  };

  const handleCopyIp = (ip: string) => {
    navigator.clipboard.writeText(ip);
    setCopiedIp(true);
    setTimeout(() => setCopiedIp(false), 2000);
  };

  const handleCopySummary = () => {
    const text = [
      `SITE: ${site.name} (${site.code})`,
      `STATUS: ${isAllOffline ? 'ALL OFFLINE' : isPartialOffline ? 'PARTIAL OUTAGE' : 'OPERATIONAL'}`,
      `DEVICES: ${site.onlineCount}/${site.deviceCount} Online (${site.offlineCount} Offline)`,
      `GATEWAY IP: ${site.lastKnownIp}`,
      `PROVINCE/REGION: ${site.province}, ${site.region}`,
      `COORDINATES: ${site.coordinates ? `${site.coordinates.lat.toFixed(4)}, ${site.coordinates.lng.toFixed(4)}` : 'N/A'}`,
      `ACTIVE ALARMS: ${site.activeAlarmCount} (${site.alarmType || 'None'})`,
      `DOWNTIME: ${site.downtimeDuration || '0m'}`,
      `CONTACT PERSON: ${currentSiteHandler.name}`,
      `TELEPHONE/PHONE: ${currentSiteHandler.phone}`,
      `SOCIAL MEDIA: ${currentSocialMedia}`,
    ].join('\n');

    navigator.clipboard.writeText(text);
    setCopiedSummary(true);
    setTimeout(() => setCopiedSummary(false), 2000);
  };

  const handleSaveContact = () => {
    if (!editedName.trim()) return;
    const cleanSocial = editedSocial.trim() || currentSocialMedia;
    const telegramClean = cleanSocial.replace(/^@/, '');
    const updated: AssignedHandler = {
      ...currentSiteHandler,
      name: editedName.trim(),
      phone: editedPhone.trim() || currentSiteHandler.phone,
      socialMedia: cleanSocial,
      telegram: telegramClean,
    };
    onUpdateHandler(site.name, updated, false);
    setIsEditingContact(false);
    setSaveSuccess(true);
    setTimeout(() => setSaveSuccess(false), 2500);
  };

  return (
    <div 
      className="fixed inset-0 z-[9999] flex items-center justify-center p-4 sm:p-6 bg-black/60 backdrop-blur-xs animate-in fade-in duration-150"
      onClick={onClose}
    >
      {/* 
        Single Unified Container:
        All typography and elements styled in refined monochrome gray tones with perfectly aligned spacing.
      */}
      <div 
        className="relative w-full max-w-xl bg-white rounded-2xl shadow-2xl border border-zinc-200 text-zinc-600 flex flex-col overflow-hidden animate-in zoom-in-95 duration-150"
        style={{ fontFamily: 'Arial, Helvetica, sans-serif' }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header Section */}
        <div className="px-6 pt-6 pb-5 border-b border-zinc-100">
          <div className="flex items-start justify-between gap-4">
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2 mb-2">
                <span className="font-mono text-xs font-semibold text-zinc-600 bg-zinc-100 px-2 py-0.5 rounded border border-zinc-200">
                  {site.code}
                </span>

                {isAllOffline && (
                  <span className="inline-flex items-center gap-1.5 rounded-full bg-zinc-700 px-2.5 py-0.5 text-[11px] font-semibold tracking-wide uppercase text-zinc-100">
                    <span className="h-1.5 w-1.5 rounded-full bg-zinc-200 animate-pulse" />
                    All Offline
                  </span>
                )}
                {isPartialOffline && (
                  <span className="inline-flex items-center gap-1.5 rounded-full border border-zinc-400 bg-zinc-50 px-2.5 py-0.5 text-[11px] font-semibold tracking-wide uppercase text-zinc-600">
                    <span className="h-1.5 w-1.5 rounded-full bg-zinc-500" />
                    Partial Outage
                  </span>
                )}
                {isOnline && (
                  <span className="inline-flex items-center gap-1.5 rounded-full bg-zinc-100 border border-zinc-300 px-2.5 py-0.5 text-[11px] font-semibold tracking-wide uppercase text-zinc-600">
                    <span className="h-1.5 w-1.5 rounded-full bg-zinc-500" />
                    Operational
                  </span>
                )}
              </div>

              <h2 className="text-xl sm:text-2xl font-bold tracking-tight text-zinc-700 truncate">
                {site.name}
              </h2>
              <p className="text-xs text-zinc-400 mt-1 font-medium">
                {site.province}, {site.region}
              </p>
            </div>

            <button
              type="button"
              onClick={onClose}
              className="p-1.5 rounded-lg text-zinc-400 hover:text-zinc-600 hover:bg-zinc-100 transition-colors cursor-pointer shrink-0"
              title="Close modal (Esc)"
            >
              <X className="h-5 w-5" />
            </button>
          </div>
        </div>

        {/* Modal Body: Continuous surface with perfectly matched section and row spacing */}
        <div className="px-6 py-5 space-y-5 overflow-y-auto max-h-[72vh]">
          {/* 1. DEVICE TELEMETRY: Matching Image 1's key-value layout with uniform spacing and border */}
          <div className="space-y-1.5">
            <span className="text-[10px] font-bold uppercase tracking-wider text-zinc-400 block">
              Device Telemetry
            </span>
            <div className="divide-y divide-zinc-100 border-b border-zinc-100 text-xs sm:text-sm">
              <div className="py-2.5 flex items-center justify-between">
                <span className="text-zinc-400">Connected Devices</span>
                <div className="text-right">
                  <span className="font-semibold text-zinc-700">
                    {site.onlineCount} / {site.deviceCount} Online
                  </span>
                  {site.offlineCount > 0 ? (
                    <span className="text-xs text-rose-600 ml-1.5 font-bold">
                      ({site.offlineCount} Offline)
                    </span>
                  ) : (
                    <span className="text-xs text-[#237227] ml-1.5 font-bold">
                      (100% Operational)
                    </span>
                  )}
                </div>
              </div>

              {(site.apCount || 0) > 0 && (
                <div className="py-2.5 flex items-center justify-between">
                  <span className="text-zinc-400">Access Points (AP)</span>
                  <div className="text-right">
                    <span className={`font-semibold ${(site.apOffline || 0) > 0 ? 'text-rose-600' : 'text-zinc-700'}`}>
                      {Math.max(0, (site.apCount || 0) - (site.apOffline || 0))} / {site.apCount} Online
                    </span>
                    {(site.apOffline || 0) > 0 ? (
                      <span className="text-xs text-rose-600 ml-1.5 font-bold">
                        ({site.apOffline} AP Down)
                      </span>
                    ) : (
                      <span className="text-xs text-[#237227] ml-1.5 font-medium">
                        (All APs Healthy)
                      </span>
                    )}
                  </div>
                </div>
              )}

              {(site.gatewayCount || 0) > 0 && (
                <div className="py-2.5 flex items-center justify-between">
                  <span className="text-zinc-400">Gateway Controller</span>
                  <div className="text-right">
                    <span className={`font-semibold ${(site.gatewayOffline || 0) > 0 ? 'text-rose-600' : 'text-[#237227]'}`}>
                      {(site.gatewayOffline || 0) > 0 ? 'Offline (Unreachable)' : 'Online (Healthy)'}
                    </span>
                  </div>
                </div>
              )}

              <div className="py-2.5 flex items-center justify-between">
                <span className="text-zinc-400">Gateway IP</span>
                <div className="flex items-center gap-2 font-mono font-semibold text-zinc-700">
                  <span>{site.lastKnownIp}</span>
                  <button
                    type="button"
                    onClick={() => handleCopyIp(site.lastKnownIp)}
                    className="text-zinc-400 hover:text-zinc-600 transition-colors cursor-pointer p-0.5"
                    title="Copy Gateway IP"
                  >
                    {copiedIp ? <Check className="h-3.5 w-3.5 text-zinc-600" /> : <Copy className="h-3.5 w-3.5" />}
                  </button>
                </div>
              </div>

              <div className="py-2.5 flex items-center justify-between">
                <span className="text-zinc-400">Active Alarms</span>
                <div className="text-right">
                  <span className="font-semibold text-zinc-700">
                    {site.activeAlarmCount} {site.activeAlarmCount === 1 ? 'Alarm' : 'Alarms'}
                  </span>
                  {site.alarmType && (
                    <span className="text-xs text-zinc-400 ml-1.5 font-normal">
                      ({site.alarmType})
                    </span>
                  )}
                </div>
              </div>

              <div className="py-2.5 flex items-center justify-between">
                <span className="text-zinc-400">Downtime Duration</span>
                <span className="font-mono font-semibold text-zinc-700">
                  {site.downtimeDuration ? `${site.downtimeDuration} (Elapsed)` : 'Normal (0m)'}
                </span>
              </div>
            </div>
          </div>

          {/* 2. SITE SPECIFICATIONS: Exact match of Image 1 with uniform spacing and border */}
          <div className="space-y-1.5">
            <span className="text-[10px] font-bold uppercase tracking-wider text-zinc-400 block">
              Site Specifications
            </span>
            <div className="divide-y divide-zinc-100 border-b border-zinc-100 text-xs sm:text-sm">
              <div className="py-2.5 flex items-center justify-between">
                <span className="text-zinc-400">GPS Coordinates</span>
                <span className="font-mono font-semibold text-zinc-700">
                  {site.coordinates ? `${site.coordinates.lat.toFixed(4)}° N, ${site.coordinates.lng.toFixed(4)}° E` : '8.1130° N, 124.2250° E'}
                </span>
              </div>

              <div className="py-2.5 flex items-center justify-between">
                <span className="text-zinc-400">Cloud Controller</span>
                <span className="font-semibold text-zinc-700">Ruijie Reyee Cloud (DICT Mindanao)</span>
              </div>

              <div className="py-2.5 flex items-center justify-between">
                <span className="text-zinc-400">Subnet Mask</span>
                <span className="font-mono font-semibold text-zinc-700">255.255.255.0</span>
              </div>

              <div className="py-2.5 flex items-center justify-between">
                <span className="text-zinc-400">Alarm Severity</span>
                <span className="font-semibold text-zinc-700">{site.severity || 'Critical'}</span>
              </div>
            </div>
          </div>

          {/* 3. CONTACT PERSON: Edit button, Save & Cancel aligned on the right side corner of the contact pills */}
          <div className="space-y-1.5">
            <span className="text-[10px] font-bold uppercase tracking-wider text-zinc-400 block">
              Contact Person
            </span>

            <div className="space-y-2.5 pt-1">
              {/* Top Row: Name & Role on left */}
              <div className="min-h-[38px] flex items-center justify-between">
                <div className="flex-1 max-w-sm">
                  {isEditingContact ? (
                    <input
                      type="text"
                      value={editedName}
                      onChange={(e) => setEditedName(e.target.value)}
                      placeholder="Contact person name"
                      autoFocus
                      className="w-full font-bold text-zinc-700 text-sm sm:text-base border-b border-zinc-400 bg-transparent px-0 py-0.5 focus:outline-none focus:border-zinc-700 leading-tight"
                    />
                  ) : (
                    <div className="font-bold text-zinc-700 text-sm sm:text-base leading-tight">
                      {currentSiteHandler.name}
                    </div>
                  )}
                  <div className="text-xs text-zinc-400 font-medium mt-0.5">
                    {currentSiteHandler.role || 'Site Technical Lead'} • Primary Contact
                  </div>
                </div>

                {saveSuccess && (
                  <span className="text-xs text-zinc-600 font-semibold flex items-center gap-1">
                    <Check className="h-3 w-3" /> Saved
                  </span>
                )}
              </div>

              {/* Bottom Row: Contact Channels on left, Edit / Save & Cancel on the right side corner */}
              <div className="flex flex-wrap items-center justify-between gap-2.5 pt-0.5">
                {/* Left side: Phone & Social Media pills */}
                <div className="flex flex-wrap items-center gap-2.5">
                  {/* Telephone / Phone Pill */}
                  {isEditingContact ? (
                    <div className="inline-flex items-center rounded-lg border border-zinc-300 bg-white px-2.5 py-1 text-xs font-semibold text-zinc-600 focus-within:border-zinc-600">
                      <Phone className="h-3.5 w-3.5 text-zinc-500 mr-1.5 shrink-0" />
                      <input
                        type="text"
                        value={editedPhone}
                        onChange={(e) => setEditedPhone(e.target.value)}
                        placeholder="+63 9XX XXX XXXX"
                        className="w-36 font-mono text-xs text-zinc-700 bg-transparent focus:outline-none"
                      />
                    </div>
                  ) : (
                    <div className="inline-flex items-center rounded-lg border border-zinc-200 bg-zinc-50/70 p-0.5">
                      <a
                        href={`tel:${currentSiteHandler.phone.replace(/[\s-]/g, '')}`}
                        className="inline-flex items-center gap-1.5 px-2.5 py-1 text-xs font-semibold text-zinc-600 hover:text-zinc-800 transition-colors"
                        title="Call telephone number"
                      >
                        <Phone className="h-3.5 w-3.5 text-zinc-500" />
                        <span>{currentSiteHandler.phone}</span>
                      </a>
                      <button
                        type="button"
                        onClick={() => handleCopyPhone(currentSiteHandler.phone)}
                        className="p-1 text-zinc-400 hover:text-zinc-600 hover:bg-zinc-100 rounded transition-colors cursor-pointer"
                        title="Copy phone number"
                      >
                        {copiedPhone ? <Check className="h-3.5 w-3.5 text-zinc-600" /> : <Copy className="h-3.5 w-3.5" />}
                      </button>
                    </div>
                  )}

                  {/* Social Media Account Pill */}
                  {isEditingContact ? (
                    <div className="inline-flex items-center rounded-lg border border-zinc-300 bg-white px-2.5 py-1 text-xs font-mono font-medium text-zinc-600 focus-within:border-zinc-600">
                      <AtSign className="h-3.5 w-3.5 text-zinc-500 mr-1.5 shrink-0" />
                      <input
                        type="text"
                        value={editedSocial}
                        onChange={(e) => setEditedSocial(e.target.value)}
                        placeholder="@username"
                        className="w-36 font-mono text-xs text-zinc-700 bg-transparent focus:outline-none"
                      />
                    </div>
                  ) : (
                    <div className="inline-flex items-center rounded-lg border border-zinc-200 bg-zinc-50/70 p-0.5">
                      <span 
                        className="inline-flex items-center gap-1.5 px-2.5 py-1 text-xs font-mono font-medium text-zinc-600"
                        title="Social Media Account"
                      >
                        <AtSign className="h-3.5 w-3.5 text-zinc-500" />
                        <span>{currentSocialMedia}</span>
                      </span>
                      <button
                        type="button"
                        onClick={() => handleCopySocial(currentSocialMedia)}
                        className="p-1 text-zinc-400 hover:text-zinc-600 hover:bg-zinc-100 rounded transition-colors cursor-pointer"
                        title="Copy social media handle"
                      >
                        {copiedSocial ? <Check className="h-3.5 w-3.5 text-zinc-600" /> : <Copy className="h-3.5 w-3.5" />}
                      </button>
                    </div>
                  )}
                </div>

                {/* Right side corner: Edit button / Save & Cancel */}
                <div className="flex items-center gap-1.5 shrink-0 ml-auto">
                  {isEditingContact ? (
                    <>
                      <button
                        type="button"
                        onClick={handleSaveContact}
                        className="inline-flex items-center gap-1 rounded-lg bg-zinc-700 px-2.5 py-1.5 text-xs font-semibold text-zinc-100 hover:bg-zinc-600 transition-colors cursor-pointer"
                      >
                        <Check className="h-3 w-3" />
                        <span>Save</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          setIsEditingContact(false);
                          setEditedName(currentSiteHandler.name);
                          setEditedPhone(currentSiteHandler.phone);
                          setEditedSocial(currentSocialMedia);
                        }}
                        className="inline-flex items-center rounded-lg border border-zinc-300 bg-white px-2.5 py-1.5 text-xs font-semibold text-zinc-600 hover:bg-zinc-50 transition-colors cursor-pointer"
                      >
                        <span>Cancel</span>
                      </button>
                    </>
                  ) : (
                    <button
                      type="button"
                      onClick={() => setIsEditingContact(true)}
                      className="inline-flex items-center gap-1 rounded-lg border border-zinc-200 bg-zinc-50 px-2.5 py-1.5 text-xs font-semibold text-zinc-600 hover:bg-zinc-100 hover:text-zinc-700 transition-colors cursor-pointer"
                    >
                      <Pencil className="h-3 w-3 text-zinc-400" />
                      <span>Edit</span>
                    </button>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Modal Footer: Gray Controls and Buttons */}
        <div className="px-6 py-4 border-t border-zinc-100 bg-zinc-50/70 flex items-center justify-between">
          <button
            type="button"
            onClick={handleCopySummary}
            className="inline-flex items-center gap-1.5 text-xs font-semibold text-zinc-500 hover:text-zinc-700 transition-colors cursor-pointer"
          >
            {copiedSummary ? <Check className="h-3.5 w-3.5 text-zinc-600" /> : <Copy className="h-3.5 w-3.5" />}
            <span>{copiedSummary ? 'Copied Site Details' : 'Copy Site Details'}</span>
          </button>

          <button
            type="button"
            onClick={onClose}
            className="rounded-xl bg-zinc-700 hover:bg-zinc-600 px-6 py-2 text-xs font-semibold text-zinc-100 shadow-xs transition-colors cursor-pointer"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};