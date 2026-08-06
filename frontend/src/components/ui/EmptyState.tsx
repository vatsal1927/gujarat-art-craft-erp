import React from 'react';
import { FolderOpen, LucideIcon } from 'lucide-react';
import { Card } from './card';
import { cn } from '@/lib/utils';

export interface EmptyStateProps {
  title?: string;
  description?: string;
  icon?: LucideIcon;
  action?: React.ReactNode;
  className?: string;
  compact?: boolean;
}

export const EmptyState: React.FC<EmptyStateProps> = ({
  title = 'No Data Available',
  description = 'There are no records to display at this moment.',
  icon: Icon = FolderOpen,
  action,
  className,
  compact = false,
}) => {
  return (
    <Card
      className={cn(
        'flex flex-col items-center justify-center text-center border-dashed border-2 border-slate-200 dark:border-slate-800 bg-white/50 dark:bg-slate-900/50 shadow-none animate-in fade-in duration-200',
        compact ? 'p-6' : 'p-12',
        className
      )}
    >
      <div className="p-4 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-400 dark:text-slate-500 mb-3 shadow-inner">
        <Icon className={compact ? 'h-6 w-6' : 'h-10 w-10'} />
      </div>
      <h4 className="text-base font-semibold text-slate-800 dark:text-slate-200 tracking-tight">
        {title}
      </h4>
      <p className="mt-1 text-xs text-slate-500 dark:text-slate-400 max-w-md">
        {description}
      </p>
      {action && <div className="mt-4">{action}</div>}
    </Card>
  );
};
