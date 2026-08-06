import React, { useState } from 'react';
import { RefreshCw } from 'lucide-react';
import { Button, buttonVariants } from '@/components/ui/button';
import { type VariantProps } from 'class-variance-authority';
import { cn } from '@/lib/utils';

export interface RetryButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  onRetry: () => void | Promise<unknown>;
  label?: string;
  isRetrying?: boolean;
}

export const RetryButton: React.FC<RetryButtonProps> = ({
  onRetry,
  label = 'Retry',
  isRetrying: externalIsRetrying,
  className,
  variant = 'outline',
  size = 'sm',
  disabled,
  ...props
}) => {
  const [internalLoading, setInternalLoading] = useState(false);
  const isLoading = externalIsRetrying ?? internalLoading;

  const handleClick = async (e: React.MouseEvent<HTMLButtonElement>) => {
    e.preventDefault();
    if (isLoading) return;
    try {
      setInternalLoading(true);
      await Promise.resolve(onRetry());
    } finally {
      setInternalLoading(false);
    }
  };

  return (
    <Button
      variant={variant}
      size={size}
      onClick={handleClick}
      disabled={isLoading || disabled}
      className={cn('inline-flex items-center gap-1.5 font-medium transition-colors', className)}
      {...props}
    >
      <RefreshCw className={cn('h-3.5 w-3.5', isLoading && 'animate-spin')} />
      <span>{isLoading ? 'Retrying...' : label}</span>
    </Button>
  );
};
