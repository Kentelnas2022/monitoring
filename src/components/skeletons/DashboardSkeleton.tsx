'use client';	
import React from 'react';
import { SkeletonBox, SkeletonCircle } from './FacebookSkeleton';

export const DashboardSkeleton: React.FC = () => {
  return (
    <div className="flex-1 flex flex-col gap-2.5 h-ull overflow-hidden animate-in fade-in duration-200">
      {/* 1. TOP STATS CARDS SKELETON (4 CARDS) *r�
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5 sm:gap-4 shrink-0">
        {[1, 2, 3, 4].map((i) => (
          <div
            key={i}
            className="rounded-2xl border border-zinc-200/80 bg-white p-3.5 sm:p-4 shadow-2xs flex flex-col justify-between h-[116px]"
          >
            <div className="flex items-center justify-between">
              <SkeletonBox className="h-9 sm:h-10 w-9 sm:w-10 rounded-xl" />
              <SkeletonBox className="h-5 w-14 rounded-full" />
            </div>
            <div className="mt-2">
              <SkeletonBox className="h-7 w-24 rounded-md mb-1.5" />
              <SkeletonBox className="h-3 w-32 rounded-full" />
            </div>
          </div>
        ))}
      </div>

      {/* 2. MASTER SPLIT VIEW SKELETON (MAP & TABLE) */}
      <div className="flex-1 min-h-0 grid grid-cols-1 lg:grid-cols-12 gap-3 sm:gap-4 overflow-hidden">
        {/* Left Side: Map Skeleton (4 cols) *r�
        <div className="lg:col-span-4 rounded-2xl border border-zinc-200/80 bg-white p-3 sm:p-3.5 shadow-2xs flex flex-col overflow-hidden">
          <div className="flex items-center justify-between pb-2.5 border-b border-zinc-100 shrink-0">
            <div className="flex items-center gap-2">
              <SkeletonCircle className="h-4 w-4" />
              <SkeletonBox className="h-4 w-32 rounded-md" />
            </div>
            <SkeletonBox className="h-5 w-16 rounded-full" />
          </div>

          <div className="flex-1 relative rounded-xl overflow-hidden mt-2.5 bg-slate-100/70 border border-slate-200/60 flex items-center justify-center">
            <div className="fb-skeleton absolute inset-0 opacity-40" />
            <div className="relative z-10 flex flex-col items-center gap-2 text-center px-4">
              <SkeletonCircle className="h-12 w-12" />
              <SkeletonBox className="h-3 w-36 rounded-full" />
              <SkeletonBox className="h-2.5 w-24 rounded-full" />
            </div>
          </div>

          <div className="pt-2.5 mt-2.5 border-t border-zinc-100 flex items-center justify-between shrink-0">
            <SkeletonBox className="h-3 w-28 rounded-full" />
            <SkeletonBox className="h-3 w-16 rounded-full" />
          </div>
        </div>

        {/* Right Side: Projects Table Skeleton (8 cols) */}
        <div className="lg:col-span-8 rounded-2xl border border-zinc-200/80 bg-white p-3 sm:p-4 shadow-2xs flex flex-col overflow-hidden">
          {/* Controls Bar */}
          <div className="flex flex-wrap items-center justify-between gap-3 pb-3 border-b border-zinc-100 shrink-0">
            <div className="flex items-center gap-2 flex-1 max-w-sm">
              <SkeletonBox className="h-9 w-full rounded-xl" />
            </div>
            <div className="flex items-center gap-2 shrink-0">
              <SkeletonBox className="h-8 w-20 rounded-xl" />
              <SkeletonBox className="h-8 w-24 rounded-xl" />
              <SkeletonBox className="h-8 w-16 rounded-xl" />
            </div>
          </div>

          {/* Table Header Skeleton */}
          <div className="grid grid-cols-12 gap-3 py-2.5 px-3 border-b border-zinc-100 bg-slate-50/60 rounded-lg mt-2 shrink-0">
            <div className="col-span-4"><SkeletonBox className="h-3 w-20 rounded-full" /></div>
            <div className="col-span-3"><SkeletonBox className="h-3 w-16 rounded-full" /></div>
            <div className="col-span-2"><SkeletonBox className="h-3 w-14 rounded-full" /></div>
            <div className="col-span-3 text-right flex justify-end"><SkeletonBox className="h-3 w-12 rounded-full" /></div>
          </div>

          {/* Table Rows Skeleton */}
          <div className="flex-1 overflow-hidden divide-y divide-zinc-100/80 pt-1 space-y-1">
            {[1, 2, 3, 4, 5, 6].map((row) => (
              <div key={row} className="grid grid-cols-12 gap-3 py-3 px-3 items-center">
                <div className="col-span-4 flex items-center gap-2.5">
                  <SkeletonCircle className="h-8 w-8" />
                  <div className="space-y-1.5 flex-1">
                    <SkeletonBox className="h-3.5 w-3/4 rounded-md" />
                    <SkeletonBox className="h-2.5 w-1/2 rounded-full" />
                  </div>
                </div>
                <div className="col-span-3 space-y-1.5">
                  <SkeletonBox className="h-3 w-4/5 rounded-md" />
                  <SkeletonBox className="h-2.5 w-3/5 rounded-full" />
                </div>
                <div className="col-span-2">
                  <SkeletonBox className="h-6 w-20 rounded-full" />
                </div>
                <div className="col-span-3 flex items-center justify-end gap-2">
                  <SkeletonBox className="h-7 w-16 rounded-lg" />
                  <SkeletonBox className="h-7 w-7 rounded-lg" />
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};
