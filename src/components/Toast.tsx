'use client';

import React, { useEffect, useState, useRef } from 'react';
import { CheckCircle, X } from 'lucide-react';

interface ToastProps {
  message: string | null;
  onClose: () => void;
  durationMs?: number;
}

export const Toast: React.FC<ToastProps> = ({ message, onClose, durationMs = 3000 }) => {
  const onCloseRef = useRef(onClose);
  onCloseRef.current = onClose;

  const totalSec = Math.max(1, Math.ceil(durationMs / 1000));
  const [secondsRemaining, setSecondsRemaining] = useState<number>(totalSec);

  useEffect(() => {
    if (!message) return;

    setSecondsRemaining(totalSec);

    const interval = setInterval(() => {
      setSecondsRemaining((prev) => Math.max(0, prev - 1));
    }, 1000);

    const timer = setTimeout(() => {
      onCloseRef.current();
    }, durationMs);

    return () => {
      clearInterval(interval);
      clearTimeout(timer);
    };
  }, [message, durationMs, totalSec]);

  if (!message) return null;

  const progressPercent = Math.max(0, Math.min(100, (secondsRemaining / totalSec) * 100));

  return (
    <div className="fixed top-5 right-5 z-[10000] flex flex-col rounded-2xl border border-zinc-200/90 bg-white/95 backdrop-blur-md text-xs font-medium text-zinc-900 shadow-xl shadow-zinc-900/10 animate-in fade-in slide-in-from-top-4 duration-200 overflow-hidden max-w-md">
      <div className="flex items-center gap-3 p-4">
        <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-[#237227]/10 text-[#237227] border border-[#237227]/20 shrink-0">
          <CheckCircle className="h-4 w-4" />
        </div>
        <div className="space-y-0.5 pr-2 flex-1 min-w-0">
          <p className="font-bold text-zinc-900 text-xs">Telegram Alert Dispatched</p>
          <p className="text-zinc-500 text-[11px] leading-tight break-words">{message}</p>
        </div>
        <div className="flex flex-col items-end gap-1.5 shrink-0 pl-1">
          <button
            onClick={onClose}
            className="rounded-lg p-1 text-zinc-400 hover:bg-zinc-100 hover:text-zinc-700 transition-colors cursor-pointer shrink-0"
            title="Dismiss"
          >
            <X className="h-4 w-4" />
          </button>
          <span className="text-[10px] font-mono text-zinc-400 pr-0.5 select-none">
            {secondsRemaining}s
          </span>
        </div>
      </div>
      {/* Progress Bar */}
      <div className="h-1 w-full bg-zinc-100 overflow-hidden">
        <div
          className="h-full bg-[#237227]/70 transition-all duration-1000 ease-linear"
          style={{ width: `${progressPercent}%` }}
        />
      </div>
    </div>
  );
};

