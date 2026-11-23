import React from 'react';

export interface EmptyStateProps {
  icon?: React.ReactNode;
  title: string;
  description: string;
  action?: React.ReactNode;
}

export const EmptyState: React.FC<EmptyStateProps> = ({
  icon,
  title,
  description,
  action,
}) => {
  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '3rem 1.5rem',
        textAlign: 'center',
        color: 'var(--text-secondary)',
      }}
    >
      {icon && <div style={{ marginBottom: '1rem', color: 'var(--text-muted)' }}>{icon}</div>}
      <h3 style={{ color: 'var(--text-primary)', fontSize: '1.15rem', fontWeight: 600 }}>{title}</h3>
      <p style={{ maxWidth: '420px', fontSize: '0.9rem', marginTop: '0.5rem', marginBottom: '1.25rem' }}>
        {description}
      </p>
      {action}
    </div>
  );
};
