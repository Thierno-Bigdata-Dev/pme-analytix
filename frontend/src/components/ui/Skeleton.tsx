import React from 'react';
import { cn } from './utils';

export interface SkeletonProps {
  width?: string | number;
  height?: string | number;
  borderRadius?: string | number;
  className?: string;
  variant?: 'rectangular' | 'circular' | 'text';
}

export const Skeleton: React.FC<SkeletonProps> = ({
  width = '100%',
  height = '20px',
  borderRadius = '8px',
  className,
  variant = 'rectangular',
}) => {
  return (
    <div
      className={cn('skeleton-premium', className)}
      style={{
        width,
        height,
        borderRadius: variant === 'circular' ? '50%' : borderRadius,
      }}
      aria-hidden="true"
    />
  );
};
