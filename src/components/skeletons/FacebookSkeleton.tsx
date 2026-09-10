'use client';

import React from 'react';

interface SkeletonProps {
  className?: string;
  subtle?: boolean;
}

export const SkeletonBox: React.FC<SkeletonProps> = ({ className = '', subtle = false }) => {
  const base = subtle ? 'fb-skeleton-subtle' : 'fb-skeleton';
  return <div className={`${base} rounded-lg ${className}`} />;
};

export const SkeletonCircle: React.FC<SkeletonProps> = ({ className = '', subtle = false }) => {
  const base = subtle ? 'fb-skeleton-subtle' : 'fb-skeleton';
  return <div className={`${base} rounded-full shrink-0 ${className}`} />;
};

export const SkeletonText: React.FC<{
  lines?: number;
  className?: string;
  lastLineWidth?: string;
}> = ({ lines = 2, className = '', lastLineWidth = 'w-3/5' }) => {
  return (
    <div className={`space-y-2 ${className}`}>
      {Array.from({ length: lines }).map((_, i) => {
        const isLast = i === lines - 1 && lines > 1;
        const width = isLast ? lastLineWidth : 'w-full';
        return (
          <div
            key={i}
            className={`fb-skeleton h-2.5 rounded-full ${width}`}
          />
        );
      })}
    </div>
  );
};
