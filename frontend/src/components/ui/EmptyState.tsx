import React from 'react';
import { Button } from './Button';

export interface EmptyStateProps {
  icon?: React.ReactNode;
  title: string;
  description: string;
  actionLabel?: string;
  onAction?: () => void;
  actionLoading?: boolean;
}

export const EmptyState: React.FC<EmptyStateProps> = ({
  icon,
  title,
  description,
  actionLabel,
  onAction,
  actionLoading = false,
}) => {
  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '48px 24px',
        textAlign: 'center',
        background: 'rgba(255, 255, 255, 0.02)',
        border: '1px dashed rgba(255, 255, 255, 0.1)',
        borderRadius: '16px',
        color: 'var(--text-primary)',
        width: '100%',
        boxSizing: 'border-box',
      }}
    >
      {icon && (
        <div
          style={{
            fontSize: '32px',
            color: 'var(--text-muted)',
            marginBottom: '16px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          {icon}
        </div>
      )}
      <h4 style={{ fontSize: '11pt', fontWeight: 600, margin: '0 0 8px 0', color: 'var(--text-primary)' }}>
        {title}
      </h4>
      <p
        style={{
          fontSize: '9pt',
          color: 'var(--text-secondary)',
          margin: '0 0 20px 0',
          maxWidth: '360px',
          lineHeight: '1.5',
        }}
      >
        {description}
      </p>
      {actionLabel && onAction && (
        <Button variant="secondary" size="sm" onClick={onAction} loading={actionLoading}>
          {actionLabel}
        </Button>
      )}
    </div>
  );
};
