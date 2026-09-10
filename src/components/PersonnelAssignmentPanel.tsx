'use client';

import React, { useState, useEffect } from 'react';
import { 
  UserPlus, 
  Send, 
  Phone, 
  User, 
  Building2, 
  CheckCircle2, 
  ShieldCheck, 
  AlertCircle,
  HelpCircle
} from 'lucide-react';
import { AssignedHandler, SiteInfrastructure } from '@/types/dashboard';

interface PersonnelAssignmentPanelProps {
  sites: SiteInfrastructure[];
  selectedSiteName?: string;
  onUpdatePersonnel: (siteName: string, updatedHandler: AssignedHandler) => void;
}

export const PersonnelAssignmentPanel: React.FC<PersonnelAssignmentPanelProps> = ({
  sites,
  selectedSiteName,
  onUpdatePersonnel,
}) => {
  const [siteName, setSiteName] = useState<string>(sites[0]?.name || '');
  const [fullName, setFullName] = useState<string>('');
  const [phoneNumber, setPhoneNumber] = useState<string>('');
  const [telegramUsername, setTelegramUsername] = useState<string>('');
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Sync when selectedSiteName prop changes
  useEffect(() => {
    if (selectedSiteName) {
      setSiteName(selectedSiteName);
    }
  }, [selectedSiteName]);

  // When site selection changes, pre-fill form with the site's existing handler
  useEffect(() => {
    const currentSite = sites.find((s) => s.name === siteName);
    if (currentSite?.assignedHandler) {
      setFullName(currentSite.assignedHandler.name);
      setPhoneNumber(currentSite.assignedHandler.phone);
      setTelegramUsername(currentSite.assignedHandler.telegram);
    } else {
      setFullName('');
      setPhoneNumber('');
      setTelegramUsername('');
    }
    setSuccessMessage(null);
    setErrorMessage(null);
  }, [siteName, sites]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (!siteName) {
      setErrorMessage('Please select a Ruijie site or group.');
      return;
    }

    if (!fullName.trim()) {
      setErrorMessage('Contact person full name is required.');
      return;
    }

    if (!phoneNumber.trim()) {
      setErrorMessage('Phone number / contact info is required.');
      return;
    }

    if (!telegramUsername.trim()) {
      setErrorMessage('Telegram username is required.');
      return;
    }

    const cleanedTelegram = telegramUsername.trim().replace(/^@+/, '');

    const payload: AssignedHandler = {
      name: fullName.trim(),
      phone: phoneNumber.trim(),
      telegram: cleanedTelegram,
      role: 'Assigned Field Contact',
    };

    // Log to browser console as requested
    console.log('--- [Ruijie Triage] Update Assigned Personnel ---');
    console.log('Site / Group Name:', siteName);
    console.log('Contact Person Full Name:', payload.name);
    console.log('Phone Number / Contact Info:', payload.phone);
    console.log('Telegram Username:', `@${payload.telegram}`);
    console.log('Full Payload Object:', { siteName, ...payload });

    onUpdatePersonnel(siteName, payload);

    setSuccessMessage(`Personnel successfully assigned to ${siteName}!`);
    setErrorMessage(null);

    setTimeout(() => {
      setSuccessMessage(null);
    }, 4000);
  };

  return (
    <div className="flex flex-col rounded-2xl border border-zinc-200/90 bg-white shadow-xs overflow-hidden">
      {/* Panel Header */}
      <div className="border-b border-zinc-200/80 p-6">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#237227]/10 text-[#237227] border border-[#237227]/20">
            <UserPlus className="h-5 w-5" />
          </div>
          <div>
            <h2 className="text-base font-bold text-zinc-900">Personnel Assignment Panel</h2>
            <p className="text-xs text-zinc-500">Assign on-call field engineers & NOC contacts to DICT sites</p>
          </div>
        </div>
      </div>

      {/* Form Body */}
      <form onSubmit={handleSubmit} className="p-6 space-y-4">
        {/* Success Alert */}
        {successMessage && (
          <div className="flex items-center gap-2.5 rounded-xl border border-[#237227]/30 bg-[#237227]/10 p-3.5 text-xs font-medium text-[#237227]">
            <CheckCircle2 className="h-4 w-4 shrink-0 text-[#237227]" />
            <span>{successMessage}</span>
          </div>
        )}

        {/* Error Alert */}
        {errorMessage && (
          <div className="flex items-center gap-2.5 rounded-xl border border-rose-200 bg-rose-50 p-3.5 text-xs font-medium text-rose-700">
            <AlertCircle className="h-4 w-4 shrink-0 text-rose-600" />
            <span>{errorMessage}</span>
          </div>
        )}

        {/* Input 1: Dropdown selector */}
        <div className="space-y-1.5">
          <label htmlFor="site-select" className="block text-xs font-bold text-zinc-700">
            Ruijie Site / Group Name <span className="text-rose-500">*</span>
          </label>
          <div className="relative">
            <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3 text-zinc-400">
              <Building2 className="h-4 w-4" />
            </div>
            <select
              id="site-select"
              value={siteName}
              onChange={(e) => setSiteName(e.target.value)}
              className="w-full rounded-xl border border-zinc-200 bg-zinc-50/60 pl-9 pr-8 py-2 text-xs font-medium text-zinc-900 transition-colors focus:border-[#237227] focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#237227]/20"
            >
              {sites.map((site) => (
                <option key={site.id} value={site.name}>
                  {site.name} ({site.province})
                </option>
              ))}
            </select>
          </div>
          <p className="text-[11px] text-zinc-500">
            Select a physical DICT facility to review or update its primary dispatch contact.
          </p>
        </div>

        {/* Input 2: Contact Person Full Name */}
        <div className="space-y-1.5">
          <label htmlFor="full-name" className="block text-xs font-bold text-zinc-700">
            Contact Person Full Name <span className="text-rose-500">*</span>
          </label>
          <div className="relative">
            <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3 text-zinc-400">
              <User className="h-4 w-4" />
            </div>
            <input
              id="full-name"
              type="text"
              placeholder="e.g. Engr. Juan Dela Cruz"
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              className="w-full rounded-xl border border-zinc-200 bg-zinc-50/60 pl-9 pr-3 py-2 text-xs font-medium text-zinc-900 placeholder-zinc-400 transition-colors focus:border-[#237227] focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#237227]/20"
            />
          </div>
        </div>

        {/* Input 3: Phone Number / Contact Info */}
        <div className="space-y-1.5">
          <label htmlFor="phone-number" className="block text-xs font-bold text-zinc-700">
            Phone Number / Contact Info <span className="text-rose-500">*</span>
          </label>
          <div className="relative">
            <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3 text-zinc-400">
              <Phone className="h-4 w-4" />
            </div>
            <input
              id="phone-number"
              type="text"
              placeholder="e.g. +63 917 123 4567"
              value={phoneNumber}
              onChange={(e) => setPhoneNumber(e.target.value)}
              className="w-full rounded-xl border border-zinc-200 bg-zinc-50/60 pl-9 pr-3 py-2 text-xs font-medium text-zinc-900 placeholder-zinc-400 transition-colors focus:border-[#237227] focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#237227]/20"
            />
          </div>
        </div>

        {/* Input 4: Telegram Username */}
        <div className="space-y-1.5">
          <label htmlFor="telegram-user" className="block text-xs font-bold text-zinc-700">
            Telegram Username (Without the @) <span className="text-rose-500">*</span>
          </label>
          <div className="relative">
            <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3 text-zinc-400 font-mono text-xs font-bold">
              @
            </div>
            <input
              id="telegram-user"
              type="text"
              placeholder="username_noc"
              value={telegramUsername}
              onChange={(e) => setTelegramUsername(e.target.value)}
              className="w-full rounded-xl border border-zinc-200 bg-zinc-50/60 pl-8 pr-3 py-2 text-xs font-mono font-medium text-zinc-900 placeholder-zinc-400 transition-colors focus:border-[#237227] focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#237227]/20"
            />
          </div>
          {telegramUsername && (
            <div className="flex items-center gap-1.5 text-[11px] text-sky-700 font-mono font-medium">
              <Send className="h-3 w-3 text-sky-600" />
              <span>Target: https://t.me/{telegramUsername.replace(/^@+/, '')}</span>
            </div>
          )}
        </div>

        {/* Action Button: Primary styled Tailwind button with #237227 */}
        <div className="pt-2">
          <button
            type="submit"
            className="w-full flex items-center justify-center gap-2 rounded-xl bg-[#237227] px-4 py-2.5 text-xs font-bold text-white shadow-sm shadow-[#237227]/25 hover:bg-[#1b5b1f] focus:outline-none focus:ring-2 focus:ring-[#237227] focus:ring-offset-2 active:scale-[0.99] transition-all cursor-pointer"
          >
            <ShieldCheck className="h-4 w-4" />
            <span>Update Assigned Personnel</span>
          </button>
        </div>

        {/* Helper NOC footer notes */}
        <div className="rounded-xl border border-zinc-200 bg-zinc-50 p-3.5 text-[11px] text-zinc-500 flex items-start gap-2.5">
          <HelpCircle className="h-4 w-4 text-zinc-400 shrink-0 mt-0.5" />
          <p>
            Updating personnel will sync the handler info across the Live Alarm Log and output event traces to the browser developer console.
          </p>
        </div>
      </form>
    </div>
  );
};
