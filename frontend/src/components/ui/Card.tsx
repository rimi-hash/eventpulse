import React, { useState } from 'react';

export interface CardProps extends React.HTMLAttributes<HTMLDivElement> {
  children: React.ReactNode;
  interactive?: boolean;
}

export const Card: React.FC<CardProps> = ({
  children,
  interactive = false,
  style,
  className = '',
  ...props
}) => {
  const [isHovered, setIsHovered] = useState(false);

  return (
    <div
      className={`surface-panel ${className}`}
      onMouseEnter={() => interactive && setIsHovered(true)}
      onMouseLeave={() => interactive && setIsHovered(false)}
      style={{
        backgroundColor: 'var(--bg-card)',
        borderRadius: 'var(--radius-lg)',
        border: `1px solid ${isHovered && interactive ? 'var(--border-medium)' : 'var(--border-subtle)'}`,
        boxShadow: isHovered && interactive ? 'var(--shadow-md)' : 'var(--shadow-sm)',
        transform: isHovered && interactive ? 'translateY(-2px)' : 'none',
        padding: '1.5rem',
        transition: 'transform var(--transition-fast), box-shadow var(--transition-fast), border-color var(--transition-fast)',
        cursor: interactive ? 'pointer' : 'default',
        ...style,
      }}
      {...props}
    >
      {children}
    </div>
  );
};
