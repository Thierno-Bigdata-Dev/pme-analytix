import React from 'react';
import { Skeleton } from './Skeleton';

export interface CardProps extends Omit<React.HTMLAttributes<HTMLDivElement>, 'title'> {
  title?: React.ReactNode;
  subtitle?: React.ReactNode;
  loading?: boolean;
  error?: string | null;
  footer?: React.ReactNode;
  hoverable?: boolean;
}

export const Card: React.FC<CardProps> = ({
  children,
  title,
  subtitle,
  loading = false,
  error = null,
  footer,
  hoverable = true,
  style,
  ...props
}) => {
  const cardStyle: React.CSSProperties = {
    background: 'var(--card-bg)',
    border: '1px solid var(--card-border)',
    backdropFilter: 'blur(16px)',
    WebkitBackdropFilter: 'blur(16px)',
    borderRadius: '16px',
    boxShadow: '0 10px 30px rgba(0, 0, 0, 0.3)',
    padding: '24px',
    transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
    position: 'relative',
    overflow: 'hidden',
    display: 'flex',
    flexDirection: 'column',
    boxSizing: 'border-box',
    ...style,
  };

  const errorStyle: React.CSSProperties = {
    borderColor: 'rgba(239, 68, 68, 0.4)',
    boxShadow: '0 0 0 1px rgba(239, 68, 68, 0.1)',
  };

  const finalStyle = {
    ...cardStyle,
    ...(error ? errorStyle : {}),
  };

  return (
    <div
      style={finalStyle}
      className={hoverable ? 'glass-card' : ''}
      {...props}
    >
      {/* Header Area */}
      {(title || subtitle) && !loading && (
        <div style={{ marginBottom: '20px' }}>
          {title && (
            <h3 style={{ margin: 0, fontSize: '13pt', fontWeight: 700, color: 'var(--text-primary)' }}>
              {title}
            </h3>
          )}
          {subtitle && (
            <p style={{ margin: '4px 0 0 0', fontSize: '9pt', color: 'var(--text-secondary)' }}>
              {subtitle}
            </p>
          )}
        </div>
      )}

      {/* Loading Skeleton */}
      {loading ? (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', width: '100%' }}>
          <Skeleton width="40%" height="20px" />
          <Skeleton width="100%" height="60px" />
          <Skeleton width="70%" height="20px" />
        </div>
      ) : error ? (
        /* Error State */
        <div style={{ padding: '16px 0', color: 'var(--danger)', fontSize: '9.5pt', display: 'flex', flexDirection: 'column', gap: '8px' }}>
          <span style={{ fontWeight: 700 }}>⚠️ Une erreur est survenue</span>
          <span>{error}</span>
        </div>
      ) : (
        /* Core Content */
        <div style={{ flexGrow: 1, display: 'flex', flexDirection: 'column' }}>{children}</div>
      )}

      {/* Footer Area */}
      {footer && !loading && !error && (
        <div
          style={{
            marginTop: '20px',
            paddingTop: '16px',
            borderTop: '1px solid var(--card-border)',
            display: 'flex',
            justifyContent: 'flex-end',
            gap: '12px',
          }}
        >
          {footer}
        </div>
      )}
    </div>
  );
};
