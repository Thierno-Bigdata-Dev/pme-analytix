import React, { forwardRef } from 'react';
import { cn } from './utils';

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'outline' | 'danger' | 'ghost';
  size?: 'sm' | 'md' | 'lg';
  loading?: boolean;
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  (
    {
      className,
      children,
      variant = 'primary',
      size = 'md',
      loading = false,
      disabled = false,
      leftIcon,
      rightIcon,
      ...props
    },
    ref
  ) => {
    return (
      <button
        ref={ref}
        disabled={disabled || loading}
        aria-busy={loading}
        aria-live={loading ? 'polite' : 'off'}
        className={cn(
          'btn',
          `btn-${variant}`,
          `btn-${size}`,
          { 'btn-loading': loading },
          className
        )}
        {...props}
      >
        {loading && (
          <svg
            className="btn-spinner"
            style={{ marginRight: leftIcon ? 0 : 4 }}
            viewBox="0 0 24 24"
            fill="none"
          >
            <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" opacity={0.25} />
            <path fill="currentColor" opacity={0.75} d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
          </svg>
        )}
        {!loading && leftIcon && <span style={{ display: 'inline-flex' }}>{leftIcon}</span>}
        <span>{children}</span>
        {!loading && rightIcon && <span style={{ display: 'inline-flex' }}>{rightIcon}</span>}
      </button>
    );
  }
);

Button.displayName = 'Button';
