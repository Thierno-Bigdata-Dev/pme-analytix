import React from 'react';
import { cn } from './utils';

export interface CardProps extends Omit<React.HTMLAttributes<HTMLDivElement>, 'title'> {
  title?: React.ReactNode;
  subtitle?: React.ReactNode;
  headerAction?: React.ReactNode;
  children: React.ReactNode;
  noPadding?: boolean;
  isError?: boolean;
  hoverable?: boolean;
}

export const Card: React.FC<CardProps> = ({
  className,
  title,
  subtitle,
  headerAction,
  children,
  noPadding = false,
  isError = false,
  hoverable = false,
  ...props
}) => {
  return (
    <div
      className={cn(
        'glass-card',
        { 'card-error': isError, 'hover-scale': hoverable },
        className
      )}
      {...props}
    >
      {(title || subtitle || headerAction) && (
        <div style={{
          padding: '20px 24px',
          borderBottom: '1px solid var(--card-border)',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'flex-start',
          gap: '16px'
        }}>
          <div>
            {title && <h3 style={{ margin: 0, fontSize: '12pt', fontWeight: 600, color: 'var(--text-primary)' }}>{title}</h3>}
            {subtitle && <p style={{ margin: '4px 0 0 0', fontSize: '9.5pt', color: 'var(--text-secondary)' }}>{subtitle}</p>}
          </div>
          {headerAction && <div>{headerAction}</div>}
        </div>
      )}
      <div style={{ padding: noPadding ? 0 : '24px' }}>
        {children}
      </div>
    </div>
  );
};
