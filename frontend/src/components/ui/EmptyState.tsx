import React from 'react';
import { Button } from './Button';

export interface EmptyStateProps {
  icon?: React.ReactNode;
  title?: string;
  description: string;
  actionLabel?: string;
  onAction?: () => void;
}

export const EmptyState: React.FC<EmptyStateProps> = ({ icon, title, description, actionLabel, onAction }) => {
  return (
    <div style={{
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '48px 24px',
      textAlign: 'center',
      background: 'rgba(255, 255, 255, 0.02)',
      borderRadius: '12px',
      border: '1px dashed var(--card-border)',
    }}>
      {icon && (
        <div style={{
          width: '64px', height: '64px',
          borderRadius: '50%',
          background: 'rgba(59, 130, 246, 0.1)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          color: 'var(--primary)',
          marginBottom: '16px'
        }}>
          {icon}
        </div>
      )}
      {title && (
        <h4 style={{ margin: '0 0 8px 0', fontSize: '11pt', fontWeight: 600, color: 'var(--text-primary)' }}>
          {title}
        </h4>
      )}
      <p style={{ margin: 0, fontSize: '9.5pt', color: 'var(--text-secondary)', maxWidth: '300px' }}>
        {description}
      </p>
      {actionLabel && onAction && (
        <div style={{ marginTop: '24px' }}>
          <Button variant="outline" onClick={onAction}>
            {actionLabel}
          </Button>
        </div>
      )}
    </div>
  );
};
