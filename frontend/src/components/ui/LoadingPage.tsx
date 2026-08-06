import React from 'react';
import { LoadingSpinner } from './LoadingSpinner';
import { cn } from '@/lib/utils';

export interface LoadingPageProps {
  message?: string;
  subtitle?: string;
  className?: string;
  minHeight?: string;
}

export const LoadingPage: React.FC<LoadingPageProps> = ({
  message = 'Loading Gujarat Art & Craft ERP...',
  subtitle = 'Please wait while we prepare your data',
  className,
  minHeight = 'min-h-[60vh]',
}) => {
  return (
    <div
      className={cn(
        'flex flex-col items-center justify-center p-8 text-center rounded-xl bg-white/40 dark:bg-slate-900/40 backdrop-blur-sm border border-slate-200/50 dark:border-slate-800/50 shadow-sm animate-in fade-in duration-300',
        minHeight,
        className
      )}
    >
      <div className="p-4 rounded-full bg-amber-50 dark:bg-amber-950/40 border border-amber-200/60 dark:border-amber-900/50 mb-4 shadow-inner">
        <LoadingSpinner size="lg" variant="primary" />
      </div>
      <h3 className="text-base font-semibold text-slate-800 dark:text-slate-200 tracking-tight">
        {message}
      </h3>
      {subtitle && (
        <p className="mt-1 text-xs text-slate-500 dark:text-slate-400 max-w-sm">
          {subtitle}
        </p>
      )}
    </div>
  );
};
