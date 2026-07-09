import React, { forwardRef } from 'react';

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'outline' | 'danger';
  size?: 'sm' | 'md' | 'lg';
  loading?: boolean;
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  (
    {
      children,
      variant = 'primary',
      size = 'md',
      loading = false,
      disabled = false,
      leftIcon,
      rightIcon,
      style,
      ...props
    },
    ref
  ) => {
    // Styling classes and styles mapping based on index.css design tokens
    const baseStyle: React.CSSProperties = {
      display: 'inline-flex',
      alignItems: 'center',
      justifyContent: 'center',
      fontFamily: 'inherit',
      fontWeight: 600,
      borderRadius: '10px',
      cursor: disabled || loading ? 'not-allowed' : 'pointer',
      transition: 'all 0.2s cubic-bezier(0.4, 0, 0.2, 1)',
      opacity: disabled || loading ? 0.5 : 1,
      border: 'none',
      outline: 'none',
      userSelect: 'none',
      textDecoration: 'none',
      gap: '8px',
      ...style,
    };

    const variantStyles: Record<string, React.CSSProperties> = {
      primary: {
        background: 'linear-gradient(135deg, var(--primary) 0%, var(--primary-hover) 100%)',
        color: '#ffffff',
        boxShadow: disabled || loading ? 'none' : '0 4px 12px rgba(59, 130, 246, 0.2)',
      },
      secondary: {
        background: 'rgba(255, 255, 255, 0.05)',
        border: '1px solid var(--card-border)',
        color: 'var(--text-primary)',
      },
      outline: {
        background: 'transparent',
        border: '1px solid rgba(59, 130, 246, 0.4)',
        color: '#60a5fa',
      },
      danger: {
        background: 'linear-gradient(135deg, var(--danger) 0%, #dc2626 100%)',
        color: '#ffffff',
        boxShadow: disabled || loading ? 'none' : '0 4px 12px rgba(239, 68, 68, 0.2)',
      },
    };

    const sizeStyles: Record<string, React.CSSProperties> = {
      sm: {
        padding: '8px 16px',
        fontSize: '8.5pt',
      },
      md: {
        padding: '12px 24px',
        fontSize: '9.5pt',
      },
      lg: {
        padding: '16px 32px',
        fontSize: '11pt',
      },
    };

    const activeStyles = {
      ...baseStyle,
      ...variantStyles[variant],
      ...sizeStyles[size],
    };

    return (
      <button
        ref={ref}
        disabled={disabled || loading}
        aria-busy={loading}
        aria-live={loading ? 'polite' : 'off'}
        style={activeStyles}
        {...props}
      >
        {loading && (
          <svg
            className="animate-spin"
            viewBox="0 0 24 24"
            fill="none"
            style={{
              width: '1em',
              height: '1em',
              marginRight: leftIcon ? '0' : '4px',
              animation: 'spin 1s linear infinite',
            }}
          >
            <circle
              style={{ opacity: 0.25 }}
              cx="12"
              cy="12"
              r="10"
              stroke="currentColor"
              strokeWidth="4"
            />
            <path
              style={{ opacity: 0.75 }}
              fill="currentColor"
              d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
            />
          </svg>
        )}
        {!loading && leftIcon && <span style={{ display: 'inline-flex' }}>{leftIcon}</span>}
        <span>{children}</span>
        {!loading && rightIcon && <span style={{ display: 'inline-flex' }}>{rightIcon}</span>}
        <style dangerouslySetInnerHTML={{__html: `
          @keyframes spin {
            from { transform: rotate(0deg); }
            to { transform: rotate(360deg); }
          }
        `}} />
      </button>
    );
  }
);

Button.displayName = 'Button';
