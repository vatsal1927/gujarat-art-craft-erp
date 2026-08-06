import React from 'react';
import { Skeleton } from './skeleton';
import { Card, CardContent, CardHeader } from './card';
import { cn } from '@/lib/utils';

export interface SkeletonCardProps {
  className?: string;
  hasIcon?: boolean;
  hasFooter?: boolean;
}

export const SkeletonCard: React.FC<SkeletonCardProps> = ({
  className,
  hasIcon = true,
  hasFooter = true,
}) => {
  return (
    <Card className={cn('overflow-hidden shadow-sm border-slate-200/80 dark:border-slate-800/80', className)}>
      <CardHeader className="p-4 flex flex-row items-center justify-between space-y-0 pb-2">
        <Skeleton className="h-4 w-28" />
        {hasIcon && <Skeleton className="h-8 w-8 rounded-full" />}
      </CardHeader>
      <CardContent className="p-4 pt-0 space-y-3">
        <Skeleton className="h-8 w-36" />
        <Skeleton className="h-3 w-48" />
        {hasFooter && (
          <div className="pt-2 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between">
            <Skeleton className="h-3 w-20" />
            <Skeleton className="h-3 w-16" />
          </div>
        )}
      </CardContent>
    </Card>
  );
};
