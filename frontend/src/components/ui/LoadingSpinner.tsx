import React from 'react';
import { cn } from '@/lib/utils';

export interface LoadingSpinnerProps extends React.HTMLAttributes<HTMLDivElement> {
  size?: 'sm' | 'md' | 'lg' | 'xl';
  label?: string;
  variant?: 'primary' | 'secondary' | 'neutral';
}

const sizeClasses = {
  sm: 'h-4 w-4 border-2',
  md: 'h-6 w-6 border-2',
  lg: 'h-10 w-10 border-3',
  xl: 'h-14 w-14 border-4',
};

const variantClasses = {
  primary: 'border-amber-700/20 border-t-amber-700 dark:border-amber-400/20 dark:border-t-amber-400',
  secondary: 'border-slate-300 border-t-slate-700 dark:border-slate-700 dark:border-t-slate-200',
  neutral: 'border-current/20 border-t-current',
};

export const LoadingSpinner: React.FC<LoadingSpinnerProps> = ({
  size = 'md',
  label,
  variant = 'primary',
  className,
  ...props
}) => {
  return (
    <div
      role="status"
      aria-label={label || 'Loading...'}
      className={cn('inline-flex flex-col items-center justify-center gap-2', className)}
      {...props}
    >
      <div
        className={cn(
          'animate-spin rounded-full transition-all duration-200',
          sizeClasses[size],
          variantClasses[variant]
        )}
      />
      {label && (
        <span className="text-xs font-medium text-slate-600 dark:text-slate-400">
          {label}
        </span>
      )}
    </div>
  );
};
