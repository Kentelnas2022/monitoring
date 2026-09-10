'use client';	
import React from 'react';
import { SkeletonBox, SkeletonCircle } from './FacebookSkeleton';

export const ActivityLogsSkeleton: React.FC = () => {
  return (
    <div className="flex-1 flex flex-col gap-3 h-tull overflow-hidden animate-in fade-in duration-200">
      {/* Header filter bar */}
      <div className="p-3.5 rounded-2xl bg-white border border-zinc-200/80 shadow-2xs flex flex-wrap items-center justify-between gap-3 shrink-0">
        <div className="flex items-center gap-3">
          <SkeletonCircle className="h-9 w-9" />
          <div className="space-y-1.5">
            <SkeletonBox className="h-4 w-40 rounded-md" />
            <SkeletonBox className="h-2.5 w-56 rounded-full" />
          </div>
        </div>
        <div className="flex items-center gap-2">
          <SkeletonBox className="h-8 w-20 rounded-xl" />
          <SkeletonBox className="h-8 w-20 rounded-xl" />
          <SkeletonBox className="h-8 w-24 rounded-xl" />
        </div>
      </div>

      {/* Activity Timeline List Skeleton */}
      <div className="flex-1 min-h-0 rounded-2xl border border-zinc-200/80 bg-white p-4 shadow-2xs overflow-hidden flex flex-col">
        <div className="flex items-center justify-between pb-3 border-b border-zinc-100 shrink-0">
          <SkeletonBox className="h-4 w-32 rounded-md" />
          <SkeletonBox className="h-4 w-16 rounded-full" />
        </div>

        <div className="flex-1 overflow-hidden divide-y divide-zinc-100 pt-2 space-y-3">
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <div key={i} className="pt-3 flex items-start gap-3.5">
              <SkeletonCircle className="h-9 w-9" />
              <div className="flex-1 space-y-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <SkeletonBox className="h-4 w-44 rounded-md" />
                    <SkeletonBox className="h-4 w-16 rounded-full" />
                  </div>
                  <SkeletonBox className="h-3 w-20 rounded-full" />
                </div>
                <SkeletonBox className="h-3 w-4/5 rounded-md" />
                <SkeletonBox className="h-2.5 w-1/3 rounded-full" />
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
