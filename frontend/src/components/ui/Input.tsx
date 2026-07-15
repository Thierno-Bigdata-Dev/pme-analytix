import React, { forwardRef, useId } from 'react';
import { cn } from './utils';

export interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
}

export const Input = forwardRef<HTMLInputElement, InputProps>(
  (
    {
      className,
      label,
      error,
      leftIcon,
      rightIcon,
      id: providedId,
      ...props
    },
    ref
  ) => {
    const generatedId = useId();
    const id = providedId || generatedId;
    const errorId = `${id}-error`;

    return (
      <div className="input-group" style={{ display: 'flex', flexDirection: 'column', gap: '6px', width: '100%' }}>
        {label && (
          <label htmlFor={id} style={{ fontSize: '9.5pt', color: 'var(--text-secondary)', fontWeight: 500 }}>
            {label}
          </label>
        )}
        <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
          {leftIcon && (
            <div style={{ position: 'absolute', left: '12px', color: 'var(--text-secondary)', pointerEvents: 'none' }}>
              {leftIcon}
            </div>
          )}
          <input
            id={id}
            ref={ref}
            aria-invalid={!!error}
            aria-describedby={error ? errorId : undefined}
            className={cn('input-field', className)}
            style={{
              paddingLeft: leftIcon ? '40px' : '16px',
              paddingRight: rightIcon ? '40px' : '16px',
            }}
            {...props}
          />
          {rightIcon && (
            <div style={{ position: 'absolute', right: '12px', color: 'var(--text-secondary)' }}>
              {rightIcon}
            </div>
          )}
        </div>
        {error && (
          <span id={errorId} style={{ fontSize: '8.5pt', color: 'var(--danger)', marginTop: '2px' }} role="alert">
            {error}
          </span>
        )}
      </div>
    );
  }
);

Input.displayName = 'Input';
