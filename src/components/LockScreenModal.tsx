'use client';

import React, { useState } from 'react';
import { Lock, Eye, EyeOff, ShieldAlert, LogOut, CheckCircle2 } from 'lucide-react';

interface LockScreenModalProps {
  operatorName: string;
  operatorEmail?: string;
  operatorUsername?: string;
  operatorRole?: string;
  timeoutMinutes: number;
  onUnlock: () => void;
  onLogout: () => void;
}

export const LockScreenModal: React.FC<LockScreenModalProps> = ({
  operatorName,
  operatorEmail = 'emontero@dict.gov.ph',
  operatorUsername = 'emontero',
  operatorRole = 'Super Administrator / Security Officer',
  timeoutMinutes,
  onUnlock,
  onLogout,
}) => {
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const handleUnlockSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!password) {
      setErrorMessage('Please enter your password to unlock.');
      return;
    }

    setIsLoading(true);
    setErrorMessage(null);

    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          username: operatorUsername || operatorEmail,
          password,
        }),
      });

      const data = await res.json();
      if (res.ok && data.success) {
        onUnlock();
      } else {
        setErrorMessage(data.message || 'Incorrect password. Please try again.');
      }
    } catch {
      setErrorMessage('Authentication service error. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const getInitials = (name: string) => {
    return name
      .split(' ')
      .map((part) => part[0])
      .filter(Boolean)
      .slice(0, 2)
      .join('')
      .toUpperCase();
  };

  return (
    <div 
      className="fixed inset-0 z-[99999] flex items-center justify-center p-4 bg-slate-950/85 backdrop-blur-xl animate-in fade-in duration-200 select-none"
      style={{ fontFamily: 'Arial, Helvetica, sans-serif' }}
    >
      {/* Centered Lock Card */}
      <div className="w-full max-w-md bg-white rounded-3xl shadow-2xl border border-slate-200/80 overflow-hidden flex flex-col">
        {/* Top Header Banner */}
        <div className="bg-gradient-to-r from-emerald-800 to-[#237227] px-6 py-5 text-white flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="h-9 w-9 rounded-xl bg-white/15 flex items-center justify-center backdrop-blur-sm border border-white/20">
              <Lock className="h-5 w-5 text-emerald-200" />
            </div>
            <div>
              <div className="text-[10px] uppercase font-bold tracking-widest text-emerald-200">
                NOC Command Center
              </div>
              <div className="text-sm font-extrabold tracking-tight">
                Session Auto-Locked
              </div>
            </div>
          </div>
          <div className="px-2.5 py-1 rounded-full text-[10px] font-bold bg-white/20 text-white border border-white/30 flex items-center gap-1.5">
            <span className="h-2 w-2 rounded-full bg-emerald-300 animate-pulse" />
            <span>Secure Mode</span>
          </div>
        </div>

        {/* Body Content */}
        <div className="p-6 sm:p-7 space-y-6">
          {/* Operator Profile Card */}
          <div className="flex items-center gap-4 p-3.5 bg-slate-50 border border-slate-200/70 rounded-2xl">
            <div className="h-12 w-12 rounded-2xl bg-gradient-to-br from-[#237227] to-emerald-700 text-white font-black text-sm flex items-center justify-center shadow-md shadow-emerald-900/10 shrink-0">
              {getInitials(operatorName)}
            </div>
            <div className="min-w-0 flex-1">
              <div className="text-xs font-bold text-slate-900 truncate">
                {operatorName}
              </div>
              <div className="text-[11px] text-slate-500 truncate mt-0.5">
                {operatorRole}
              </div>
              <div className="text-[10px] text-emerald-800 font-medium truncate mt-0.5 font-mono">
                {operatorEmail}
              </div>
            </div>
          </div>

          {/* Inactivity Notice */}
          <div className="flex items-start gap-2.5 p-3 rounded-xl bg-amber-50 border border-amber-200 text-amber-900 text-xs">
            <ShieldAlert className="h-4 w-4 text-amber-600 shrink-0 mt-0.5" />
            <div>
              <span className="font-bold">Inactivity Lockout: </span>
              <span>
                The dashboard was locked after {timeoutMinutes > 0 ? `${timeoutMinutes} minutes` : 'configured timeout'} of inactivity. Enter your password to resume where you left off.
              </span>
            </div>
          </div>

          {/* Error Message */}
          {errorMessage && (
            <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-xs flex items-center gap-2">
              <ShieldAlert className="h-4 w-4 text-rose-600 shrink-0" />
              <span>{errorMessage}</span>
            </div>
          )}

          {/* Password Unlock Form */}
          <form onSubmit={handleUnlockSubmit} className="space-y-4">
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-800 flex items-center justify-between">
                <span>Account Password</span>
                <span className="text-[10px] font-normal text-slate-500">Press Enter to unlock</span>
              </label>
              <div className="relative">
                <input
                  type={showPassword ? 'text' : 'password'}
                  autoFocus
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Enter your operator password"
                  className="w-full h-11 pl-4 pr-11 bg-white border border-slate-300 rounded-xl text-xs text-slate-900 focus:outline-none focus:border-[#237227] focus:ring-2 focus:ring-[#237227]/20 transition-all font-sans"
                />
                <button
                  type="button"
                  tabIndex={-1}
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-700 p-1 cursor-pointer transition-colors"
                >
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </div>

            <button
              type="submit"
              disabled={isLoading || !password.trim()}
              className={`w-full h-11 rounded-xl text-xs font-bold text-white flex items-center justify-center gap-2 shadow-lg transition-all cursor-pointer ${
                isLoading || !password.trim()
                  ? 'bg-slate-400 cursor-not-allowed opacity-75'
                  : 'bg-[#237227] hover:bg-[#1b5e20] active:scale-[0.99] shadow-emerald-900/20'
              }`}
            >
              {isLoading ? (
                <>
                  <div className="h-4 w-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  <span>Verifying Credentials...</span>
                </>
              ) : (
                <>
                  <CheckCircle2 className="h-4 w-4" />
                  <span>Unlock Dashboard</span>
                </>
              )}
            </button>
          </form>

          {/* Footer: Switch Operator / Log Out */}
          <div className="pt-2 border-t border-slate-100 flex items-center justify-between text-xs">
            <span className="text-slate-500 text-[11px]">Not {operatorName.split(' ')[0]}?</span>
            <button
              type="button"
              onClick={onLogout}
              className="text-xs font-semibold text-rose-600 hover:text-rose-800 flex items-center gap-1.5 transition-colors cursor-pointer py-1 px-2 rounded-lg hover:bg-rose-50"
            >
              <LogOut className="h-3.5 w-3.5" />
              <span>Switch Operator / Log Out</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
