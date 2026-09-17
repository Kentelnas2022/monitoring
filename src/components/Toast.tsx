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

  useEffect(() => {
    if (!message) return;

    const timer = setTimeout(() => {
      onCloseRef.current();
    }, durationMs);

    return () => {
      clearTimeout(timer);
    };
  }, [message, durationMs]);

  // Maintain full functional operation & callbacks without rendering the upper right corner visual toast card
  return null;
};

