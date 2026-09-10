'use client';	
import React from 'react';
import { SkeletonBox, SkeletonCircle } from './FacebookSkeleton';

export const SettingsSkeleton: React.FC = () => {
  return (
    <div className="flex-1 flex flex-col gap-3 h-ull overflow-hidden animate-in fade-in duration-200">
      {/* Top Banner Skeleton */}
      <div className="p-3.5 rounded-2xl bg-white border border-zinc-200/80 shadow-2xs flex items-center justify-between shrink-0">
        <div className="flex items-center gap-3">
          <SkeletonCircle className="h-9 w-9" />
          <div className="space-y-1.5">
            <SkeletonBox className="h-4 w-36 rounded-md" />
            <SkeletonBox className="h-2.5 w-52 rounded-full" />
          </div>
        </div>
        <SkeletonBox className="h-8 w-24 rounded-xl" />
      </div>

      {/* Main Settings Panel */}
      <div className="flex-1 min-h-0 grid grid-cols-1 lg:grid-cols-12 gap-4 overflow-hidden">
        {/* Left Tabs (3 cols) */}
        <div className="lg:col-span-3 rounded-2xl border border-zinc-200/80 bg-white p-3 shadow-2xs flex flex-col gap-2 shrink-0">
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <div key={i} className="p-2.5 rounded-xl flex items-center gap-3">
              <SkeletonCircle className="h-6 w-6" />
              <SkeletonBox className="h-3.5 w-28 rounded-md" />
            </div>
          ))}
        </div>

        {/* Right Form Body (9 cols) */}
        <div className="lg:col-span-9 rounded-2xl border border-zinc-200/80 bg-white p-5 shadow-2xs overflow-hidden flex flex-col gap-5">
          <div className="flex items-center justify-between pb-3 border-b border-zinc-100">
            <div className="space-y-1.5">
              <SkeletonBox className="h-5 w-40 rounded-md" />
              <SkeletonBox className="h-3 w-64 rounded-full" />
            </div>
            <SkeletonBox className="h-9 w-28 rounded-xl" />
          </div>

	      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
	        <div className="space-y-2">
		    <SkeletonBox className="h-3 w-28 rounded-full" />
		    <SkeletonBox className="h-10 w-full rounded-xl" />
	        </div>
	        <div className="space-y-2">
		    <SkeletonBox className="h-3 w-28 rounded-full" />
		    <SkeletonBox className="h-10 w-full rounded-xl" />
	        </div>
	        <div className="space-y-2">
		    <SkeletonBox className="h-3 w-28 rounded-full" />
		    <SkeletonBox className="h-10 w-full rounded-xl" />
	        </div>
	        <div className="space-y-2">
		    <SkeletonBox className="h-3 w-28 rounded-full" />
		    <SkeletonBox className="h-10 w-full rounded-xl" />
	        </div>
	      </div>

	      <div className="p-4 rounded-xl border border-zinc-100 bg-slate-50/60 flex items-center justify-between">
		    <div className="flex items-center gap-3">
		      <SkeletonBox className="h-10 w-24 rounded-lg" />
		      <div className="space-y-1.5">
			    <SkeletonBox className="h-3.5 w-48 rounded-md" />
			    <SkeletonBox className="h-2.5 w-32 rounded-full" />
		      </div>
		    </div>
		    <SkeletonBox className="h-6 w-16 rounded-full" />
	      </div>
        </div>
      </div>
    </div>
  );
};
