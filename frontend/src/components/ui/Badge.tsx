import React from 'react';

export interface BadgeProps extends React.HTMLAttributes<HTMLSpanElement> {
  variant?: 'primary' | 'secondary' | 'success' | 'warning' | 'danger';
}

export const Badge: React.FC<BadgeProps> = ({
  children,
  variant = 'primary',
  style,
  ...props
}) => {
  const baseStyle: React.CSSProperties = {
    padding: '4px 10px',
    borderRadius: '12px',
    fontSize: '8pt',
    fontWeight: 600,
    display: 'inline-flex',
    alignItems: 'center',
    gap: '6px',
    border: '1px solid transparent',
    boxSizing: 'border-box',
    ...style,
  };

  const variantStyles: Record<string, React.CSSProperties> = {
    primary: {
      background: 'var(--primary-glow)',
      color: 'var(--primary)',
      borderColor: 'rgba(59, 130, 246, 0.3)',
    },
    secondary: {
      background: 'rgba(255, 255, 255, 0.05)',
      color: 'var(--text-secondary)',
      borderColor: 'var(--card-border)',
    },
    success: {
      background: 'var(--success-glow)',
      color: 'var(--success)',
      borderColor: 'rgba(16, 185, 129, 0.3)',
    },
    warning: {
      background: 'var(--warning-glow)',
      color: 'var(--warning)',
      borderColor: 'rgba(245, 158, 11, 0.3)',
    },
    danger: {
      background: 'var(--danger-glow)',
      color: 'var(--danger)',
      borderColor: 'rgba(239, 68, 68, 0.3)',
    },
  };

  const finalStyle = {
    ...baseStyle,
    ...variantStyles[variant],
  };

  return (
    <span style={finalStyle} {...props}>
      {children}
    </span>
  );
};
