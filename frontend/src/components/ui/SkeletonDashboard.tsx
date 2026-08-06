import React from 'react';
import { Skeleton } from './skeleton';
import { SkeletonCard } from './SkeletonCard';
import { Card } from './card';
import { cn } from '@/lib/utils';

export interface SkeletonDashboardProps {
  className?: string;
}

export const SkeletonDashboard: React.FC<SkeletonDashboardProps> = ({ className }) => {
  return (
    <div className={cn('space-y-6 animate-in fade-in duration-300', className)}>
      {/* Top Banner / Header Skeleton */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-white/50 dark:bg-slate-900/50 p-6 rounded-2xl border border-slate-200/80 dark:border-slate-800/80">
        <div className="space-y-2">
          <Skeleton className="h-7 w-64 rounded-lg" />
          <Skeleton className="h-4 w-96 rounded-md" />
        </div>
        <div className="flex items-center gap-2">
          <Skeleton className="h-10 w-32 rounded-xl" />
          <Skeleton className="h-10 w-28 rounded-xl" />
        </div>
      </div>

      {/* 4 Metrics Cards Skeleton */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <SkeletonCard />
        <SkeletonCard />
        <SkeletonCard />
        <SkeletonCard />
      </div>

      {/* Charts & Analytics Section Skeleton */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <Card className="lg:col-span-2 border-slate-200/80 dark:border-slate-800/80 p-6 space-y-4">
          <div className="flex items-center justify-between border-b pb-3">
            <Skeleton className="h-5 w-44" />
            <Skeleton className="h-8 w-24 rounded-md" />
          </div>
          <Skeleton className="h-64 w-full rounded-xl" />
        </Card>

        <Card className="border-slate-200/80 dark:border-slate-800/80 p-6 space-y-4">
          <div className="flex items-center justify-between border-b pb-3">
            <Skeleton className="h-5 w-36" />
            <Skeleton className="h-5 w-5 rounded-full" />
          </div>
          <div className="space-y-3 pt-2">
            <Skeleton className="h-12 w-full rounded-lg" />
            <Skeleton className="h-12 w-full rounded-lg" />
            <Skeleton className="h-12 w-full rounded-lg" />
            <Skeleton className="h-12 w-full rounded-lg" />
          </div>
        </Card>
      </div>
    </div>
  );
};
