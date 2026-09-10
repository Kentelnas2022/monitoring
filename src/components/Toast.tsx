'use client';

import React, { useEffect } from 'react';
import { CheckCircle, X } from 'lucide-react';

interface ToastProps {
  message: string | null;
  onClose: () => void;
  durationMs?: number;
}

export const Toast: React.FC<ToastProps> = ({ message, onClose, durationMs = 5000 }) => {
  useEffect(() => {
    if (!message) return;

    const timer = setTimeout(() => {
      onClose();
    }, durationMs);

    return () => clearTimeout(timer);
  }, [message, onClose, durationMs]);

  if (!message) return null;

  return (
    <div className="fixed top-5 right-5 z-50 flex items-center gap-3 rounded-2xl border border-zinc-200/90 bg-white/95 backdrop-blur-md p-4 text-xs font-medium text-zinc-900 shadow-xl shadow-zinc-900/10 animate-in fade-in slide-in-from-top-4 duration-200">
      <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-[#237227]/10 text-[#237227] border border-[#237227]/20 shrink-0">
        <CheckCircle className="h-4 w-4" />
      </div>
      <div className="space-y-0.5 pr-2">
        <p className="font-bold text-zinc-900 text-xs">Telegram Alert Dispatched</p>
        <p className="text-zinc-500 text-[11px] leading-tight">{message}</p>
      </div>
      <button
        onClick={onClose}
        className="rounded-lg p-1 text-zinc-400 hover:bg-zinc-100 hover:text-zinc-700 transition-colors cursor-pointer shrink-0"
        title="Dismiss"
      >
        <X className="h-4 w-4" />
      </button>
    </div>
  );
};
