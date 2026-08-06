import React from 'react';
import { Skeleton } from './skeleton';
import { Card } from './card';
import { cn } from '@/lib/utils';

export interface SkeletonTableProps {
  rowsCount?: number;
  colsCount?: number;
  hasHeader?: boolean;
  hasSearch?: boolean;
  className?: string;
}

export const SkeletonTable: React.FC<SkeletonTableProps> = ({
  rowsCount = 5,
  colsCount = 5,
  hasHeader = true,
  hasSearch = true,
  className,
}) => {
  return (
    <Card className={cn('overflow-hidden border-slate-200/80 dark:border-slate-800/80 shadow-sm p-4 space-y-4', className)}>
      {hasSearch && (
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4 pb-2 border-b border-slate-100 dark:border-slate-800">
          <Skeleton className="h-9 w-full sm:w-72 rounded-lg" />
          <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
            <Skeleton className="h-9 w-24 rounded-lg" />
            <Skeleton className="h-9 w-28 rounded-lg" />
          </div>
        </div>
      )}
      <div className="overflow-x-auto">
        <table className="w-full text-left border-collapse">
          {hasHeader && (
            <thead>
              <tr className="border-b border-slate-200 dark:border-slate-800">
                {Array.from({ length: colsCount }).map((_, i) => (
                  <th key={`th-${i}`} className="p-3">
                    <Skeleton className="h-4 w-20" />
                  </th>
                ))}
              </tr>
            </thead>
          )}
          <tbody>
            {Array.from({ length: rowsCount }).map((_, rowIndex) => (
              <tr key={`tr-${rowIndex}`} className="border-b border-slate-100 dark:border-slate-800/60">
                {Array.from({ length: colsCount }).map((_, colIndex) => (
                  <td key={`td-${rowIndex}-${colIndex}`} className="p-3">
                    <Skeleton
                      className={cn(
                        'h-4 rounded',
                        colIndex === 0 ? 'w-28 font-medium' : colIndex === colsCount - 1 ? 'w-16 ml-auto' : 'w-24'
                      )}
                    />
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <div className="flex items-center justify-between pt-2">
        <Skeleton className="h-4 w-36" />
        <div className="flex items-center gap-2">
          <Skeleton className="h-8 w-8 rounded" />
          <Skeleton className="h-8 w-8 rounded" />
        </div>
      </div>
    </Card>
  );
};
