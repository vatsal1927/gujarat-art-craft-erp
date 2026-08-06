import React from 'react';
import { AlertTriangle, ServerCrash, ShieldAlert, WifiOff } from 'lucide-react';
import { Card } from './card';
import { Badge } from './badge';
import { RetryButton } from './RetryButton';
import { RepositoryError } from '@/utils/apiResult';
import { cn } from '@/lib/utils';

export interface ErrorStateProps {
  title?: string;
  error?: unknown;
  message?: string;
  onRetry?: () => void | Promise<unknown>;
  className?: string;
  compact?: boolean;
}

export const ErrorState: React.FC<ErrorStateProps> = ({
  title = 'Failed to Load Data',
  error,
  message: customMessage,
  onRetry,
  className,
  compact = false,
}) => {
  let displayMessage = customMessage || 'An unexpected error occurred while contacting the server.';
  let errorCode: string | undefined = undefined;

  if (error instanceof RepositoryError) {
    displayMessage = error.message;
    errorCode = error.code;
  } else if (error instanceof Error) {
    displayMessage = error.message;
  } else if (typeof error === 'string') {
    displayMessage = error;
  }

  let Icon = AlertTriangle;
  if (errorCode === 'NETWORK_ERROR' || displayMessage.toLowerCase().includes('network')) {
    Icon = WifiOff;
  } else if (errorCode === 'CANISTER_ERROR' || displayMessage.toLowerCase().includes('canister')) {
    Icon = ServerCrash;
  } else if (errorCode === 'UNAUTHORIZED' || displayMessage.toLowerCase().includes('unauthorized')) {
    Icon = ShieldAlert;
  }

  return (
    <Card
      className={cn(
        'flex flex-col items-center justify-center text-center border-red-200/80 dark:border-red-900/50 bg-red-50/40 dark:bg-red-950/20 shadow-sm animate-in fade-in duration-200',
        compact ? 'p-6' : 'p-10',
        className
      )}
    >
      <div className="p-3.5 rounded-full bg-red-100 dark:bg-red-900/40 text-red-600 dark:text-red-400 mb-3 shadow-sm">
        <Icon className={compact ? 'h-6 w-6' : 'h-8 w-8'} />
      </div>

      <div className="flex items-center justify-center gap-2 mb-1">
        <h4 className="text-base font-semibold text-slate-900 dark:text-slate-100 tracking-tight">
          {title}
        </h4>
        {errorCode && (
          <Badge variant="outline" className="bg-red-100/80 dark:bg-red-950 text-red-700 dark:text-red-300 border-red-200 dark:border-red-800 text-[10px] uppercase tracking-wider font-mono">
            {errorCode}
          </Badge>
        )}
      </div>

      <p className="text-xs text-slate-600 dark:text-slate-400 max-w-md mb-4 leading-relaxed">
        {displayMessage}
      </p>

      {onRetry && (
        <RetryButton onRetry={onRetry} variant="default" className="bg-red-600 hover:bg-red-700 text-white shadow-sm" />
      )}
    </Card>
  );
};
