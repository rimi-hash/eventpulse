import React from 'react';

export interface LoadingSpinnerProps {
  label?: string;
  size?: 'sm' | 'md' | 'lg';
}

export const LoadingSpinner: React.FC<LoadingSpinnerProps> = ({
  label = 'Loading...',
  size = 'md',
}) => {
  const sizePixels = size === 'sm' ? '18px' : size === 'lg' ? '40px' : '28px';

  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '2rem',
        gap: '0.75rem',
        color: 'var(--text-secondary)',
      }}
    >
      <div
        className="animate-spin"
        style={{
          width: sizePixels,
          height: sizePixels,
          border: '3px solid var(--border-medium)',
          borderTopColor: 'var(--brand-primary)',
          borderRadius: '50%',
        }}
      />
      {label && <span style={{ fontSize: '0.9rem' }}>{label}</span>}
    </div>
  );
};
