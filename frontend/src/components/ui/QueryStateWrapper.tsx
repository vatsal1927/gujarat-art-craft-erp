import React from 'react';
import { LoadingPage } from './LoadingPage';
import { LoadingSpinner } from './LoadingSpinner';
import { SkeletonTable } from './SkeletonTable';
import { SkeletonDashboard } from './SkeletonDashboard';
import { SkeletonCard } from './SkeletonCard';
import { EmptyState } from './EmptyState';
import { ErrorState } from './ErrorState';
import { LucideIcon } from 'lucide-react';

export type SkeletonType = 'table' | 'dashboard' | 'card' | 'page' | 'spinner';

export interface QueryStateWrapperProps<T> {
  isLoading?: boolean;
  isError?: boolean;
  error?: unknown;
  data?: T | null;
  refetch?: () => void | Promise<unknown>;
  skeletonType?: SkeletonType;
  emptyTitle?: string;
  emptyMessage?: string;
  emptyIcon?: LucideIcon;
  emptyAction?: React.ReactNode;
  errorTitle?: string;
  errorMessage?: string;
  isEmpty?: (data: T) => boolean;
  children: ((data: T) => React.ReactNode) | React.ReactNode;
  className?: string;
}

export function QueryStateWrapper<T>({
  isLoading,
  isError,
  error,
  data,
  refetch,
  skeletonType = 'table',
  emptyTitle,
  emptyMessage,
  emptyIcon,
  emptyAction,
  errorTitle,
  errorMessage,
  isEmpty,
  children,
  className,
}: QueryStateWrapperProps<T>) {
  if (isLoading) {
    if (skeletonType === 'dashboard') return <SkeletonDashboard className={className} />;
    if (skeletonType === 'card') return <SkeletonCard className={className} />;
    if (skeletonType === 'page') return <LoadingPage className={className} />;
    if (skeletonType === 'spinner') return <div className="py-12 flex justify-center"><LoadingSpinner size="lg" /></div>;
    return <SkeletonTable className={className} />;
  }

  if (isError || error) {
    return (
      <ErrorState
        title={errorTitle}
        error={error}
        message={errorMessage}
        onRetry={refetch}
        className={className}
      />
    );
  }

  const checkEmpty = isEmpty
    ? isEmpty(data as T)
    : Array.isArray(data)
    ? data.length === 0
    : data === null || data === undefined;

  if (checkEmpty) {
    return (
      <EmptyState
        title={emptyTitle}
        description={emptyMessage}
        icon={emptyIcon}
        action={emptyAction}
        className={className}
      />
    );
  }

  return <>{typeof children === 'function' ? (children as (data: T) => React.ReactNode)(data as T) : children}</>;
}
