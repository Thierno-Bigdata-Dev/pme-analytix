import React, { forwardRef, useId } from 'react';

export interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  description?: string;
  error?: string | null;
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
}

export const Input = forwardRef<HTMLInputElement, InputProps>(
  (
    {
      label,
      description,
      error = null,
      leftIcon,
      rightIcon,
      disabled = false,
      style,
      ...props
    },
    ref
  ) => {
    const generatedId = useId();
    const errorId = `${generatedId}-error`;
    const descId = `${generatedId}-desc`;

    const containerStyle: React.CSSProperties = {
      display: 'flex',
      flexDirection: 'column',
      gap: '6px',
      width: '100%',
      boxSizing: 'border-box',
    };

    const labelStyle: React.CSSProperties = {
      fontSize: '9pt',
      fontWeight: 500,
      color: 'var(--text-primary)',
    };

    const descStyle: React.CSSProperties = {
      fontSize: '8pt',
      color: 'var(--text-secondary)',
    };

    const inputWrapperStyle: React.CSSProperties = {
      position: 'relative',
      display: 'flex',
      alignItems: 'center',
      width: '100%',
    };

    const baseInputStyle: React.CSSProperties = {
      width: '100%',
      padding: '12px 16px',
      paddingLeft: leftIcon ? '40px' : '16px',
      paddingRight: rightIcon ? '40px' : '16px',
      background: 'rgba(31, 41, 55, 0.5)',
      border: '1px solid var(--card-border)',
      borderRadius: '10px',
      color: 'var(--text-primary)',
      fontFamily: 'inherit',
      fontSize: '10pt',
      outline: 'none',
      boxSizing: 'border-box',
      transition: 'all 0.2s ease',
      borderColor: error ? 'var(--danger)' : 'var(--card-border)',
      opacity: disabled ? 0.5 : 1,
      cursor: disabled ? 'not-allowed' : 'text',
      ...style,
    };

    return (
      <div style={containerStyle}>
        {label && (
          <label htmlFor={generatedId} style={labelStyle}>
            {label}
          </label>
        )}
        {description && (
          <span id={descId} style={descStyle}>
            {description}
          </span>
        )}
        <div style={inputWrapperStyle}>
          {leftIcon && (
            <div
              style={{
                position: 'absolute',
                left: '14px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: 'var(--text-secondary)',
              }}
            >
              {leftIcon}
            </div>
          )}
          <input
            id={generatedId}
            ref={ref}
            disabled={disabled}
            aria-invalid={!!error}
            aria-describedby={
              [error ? errorId : null, description ? descId : null].filter(Boolean).join(' ') || undefined
            }
            style={baseInputStyle}
            {...props}
          />
          {rightIcon && (
            <div
              style={{
                position: 'absolute',
                right: '14px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: 'var(--text-secondary)',
              }}
            >
              {rightIcon}
            </div>
          )}
        </div>
        {error && (
          <span
            id={errorId}
            role="alert"
            style={{ fontSize: '8.5pt', color: 'var(--danger)', marginTop: '2px' }}
          >
            {error}
          </span>
        )}
      </div>
    );
  }
);

Input.displayName = 'Input';
