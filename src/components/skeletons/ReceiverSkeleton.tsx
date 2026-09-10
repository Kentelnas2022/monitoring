'use client';	
import React from 'react';
import { SkeletonBox, SkeletonCircle } from './FacebookSkeleton';

export const ReceiverSkeleton: React.FC = () => {
  return (
    <div className="flex-1 flex flex-col gap-3 h-ull overflow-hidden animate-in fade-in duration-200">
      {/* Top Banner Skeleton */}
      <div className="p-3.5 rounded-2xl bg-white border border-zinc-200/80 shadow-2xs flex flex-wrap items-center justify-between gap-3 shrink-0">
        <div className="flex items-center gap-3">
          <SkeletonCircle className="h-9 w-9" />
          <div className="space-y-1.5">
            <SkeletonBox className="h-4 w-44 rounded-md" />
            <SkeletonBox className="h-2.5 w-60 rounded-full" />
          </div>
        </div>
        <div className="flex items-center gap-2">
          <SkeletonBox className="h-8 w-24 rounded-xl" />
          <SkeletonBox className="h-8 w-28 rounded-xl" />
        </div>
      </div>

      {/* Main Split Body Skeleton */}
      <div className="flex-1 min-h-0 grid grid-cols-1 lg:grid-cols-12 gap-3 sm:gap-4 overflow-hidden">
        {/* Left Column: Sites List (5 cols) *r�
        <div className="lg:col-span-5 rounded-2xl border border-zinc-200/80 bg-white p-3.5 shadow-2xs flex flex-col overflow-hidden">
          <div className="pb-3 border-b border-zinc-100 flex items-center justify-between shrink-0">
            <SkeletonBox className="h-4 w-32 rounded-md" />
            <SkeletonBox className="h-5 w-16 rounded-full" />
          </div>

          <div className="flex-1 overflow-hidden space-y-2.5 pt-3">
            {[1, 2, 3, 4, 5].map((i) => (
              <div
                key={i}
                className="p-3 rounded-xl border border-zinc-100 bg-slate-50/50 space-y-2"
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2.5">
                    <SkeletonCircle className="h-7 w-7" />
                    <div className="space-y-1">
                      <SkeletonBox className="h-3.5 w-32 rounded-md" />
                      <SkeletonBox className="h-2.5 w-20 rounded-full" />
                    </div>
                  </div>
                  <SkeletonBox className="h-5 w-16 rounded-full" />
                </div>
                <div className="flex items-center justify-between pt-1">
                  <SkeletonBox className="h-2.5 w-24 rounded-full" />
                  <SkeletonBox className="h-2.5 w-16 rounded-full" />
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Right Column: Diagnostic & Dispatch Detail (7 cols) */}
        <div className="lg:col-span-7 rounded-2xl border border-zinc-200/80 bg-white p-4 shadow-2xs flex flex-col gap-4 overflow-hidden">
          {/* Detail Header */}
          <div className="flex items-center justify-between pb-3 border-b border-zinc-100 shrink-0">
            <div className="flex items-center gap-3">
              <SkeletonCircle className="h-10 w-10" />
              <div className="space-y-1.5">
                <SkeletonBox className="h-5 w-48 rounded-md" />
                <SkeletonBox className="h-3 w-32 rounded-full" />
              </div>
            </div>
            <SkeletonBox className="h-8 w-28 rounded-xl" />
          </div>

          {/* Cards Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="p-3.5 rounded-xl border border-zinc-100 bg-slate-50/60 space-y-2">
              <SkeletonBox className="h-3 w-28 rounded-full" />
              <SkeletonBox className="h-6 w-36 rounded-md" />
              <SkeletonBox className="h-2.5 w-20 rounded-full" />
            </div>
            <div className="p-3.5 rounded-xl border border-zinc-100 bg-slate-50/60 space-y-2">
              <SkeletonBox className="h-3 w-28 rounded-full" />
              <SkeletonBox className="h-6 w-36 rounded-md" />
              <SkeletonBox className="h-2.5 w-20 rounded-full" />
            </div>
          </div>

          {/* Assigned Technician Box */}
          <div className="p-4 rounded-xl border border-zinc-200/80 bg-white shadow-2xs space-y-3">
            <div className="flex items-center justify-between">
              <SkeletonBox className="h-4 w-36 rounded-md" />
              <SkeletonBox className="h-6 w-20 rounded-lg" />
            </div>
            <div className="flex items-center gap-3 pt-1">
              <SkeletonCircle className="h-11 w-11" />
              <div className="space-y-1.5 flex-1">
                <SkeletonBox className="h-4 w-40 rounded-md" />
                <SkeletonBox className="h-3 w-28 rounded-full" />
              </div>
              <SkeletonBox className="h-8 w-24 rounded-xl" />
            </div>
          </div>

          {/* Incident Timeline / Telegram Dispatch */}
          <div className="flex-1 min-h-0 rounded-xl border border-zinc-100 bg-slate-50/40 p-3.5 space-y-3">
            <SkeletonBox className="h-3.5 w-36 rounded-md" />
            <div className="space-y-2">
              {[1, 2, 3].map((j) => (
                <div key={j} className="flex items-start gap-2.5">
                  <SkeletonCircle className="h-3.5 w-3.5 mt-0.5" />
                  <div className="flex-1 space-y-1">
                    <SkeletonBox className="h-3 w-full rounded-md" />
                    <SkeletonBox className="h-2 w-24 rounded-full" />
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
