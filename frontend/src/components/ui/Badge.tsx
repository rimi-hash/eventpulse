import React from 'react';

export interface BadgeProps {
  children: React.ReactNode;
  variant?: 'success' | 'warning' | 'danger' | 'info' | 'neutral';
  style?: React.CSSProperties;
  className?: string;
}

export const Badge: React.FC<BadgeProps> = ({ children, variant = 'neutral', style, className }) => {
  const variantStyles: Record<string, React.CSSProperties> = {
    success: {
      color: 'var(--status-success)',
      backgroundColor: 'var(--status-success-bg)',
      border: '1px solid rgba(16, 185, 129, 0.25)',
    },
    warning: {
      color: 'var(--status-warning)',
      backgroundColor: 'var(--status-warning-bg)',
      border: '1px solid rgba(245, 158, 11, 0.25)',
    },
    danger: {
      color: 'var(--status-danger)',
      backgroundColor: 'var(--status-danger-bg)',
      border: '1px solid rgba(239, 68, 68, 0.25)',
    },
    info: {
      color: 'var(--status-info)',
      backgroundColor: 'var(--status-info-bg)',
      border: '1px solid rgba(14, 165, 233, 0.25)',
    },
    neutral: {
      color: 'var(--text-secondary)',
      backgroundColor: 'var(--bg-elevated)',
      border: '1px solid var(--border-subtle)',
    },
  };

  return (
    <span
      className={className}
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        padding: '0.2rem 0.6rem',
        borderRadius: 'var(--radius-full)',
        fontSize: '0.75rem',
        fontWeight: 600,
        letterSpacing: '0.02em',
        textTransform: 'uppercase',
        ...variantStyles[variant],
        ...style,
      }}
    >
      {children}
    </span>
  );
};
