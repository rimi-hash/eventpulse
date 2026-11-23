import React, { useState } from 'react';

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'outline' | 'danger' | 'ghost';
  size?: 'sm' | 'md' | 'lg';
  isLoading?: boolean;
}

export const Button: React.FC<ButtonProps> = ({
  children,
  variant = 'primary',
  size = 'md',
  isLoading = false,
  disabled,
  style,
  onMouseEnter,
  onMouseLeave,
  ...props
}) => {
  const [isHovered, setIsHovered] = useState(false);

  const baseStyle: React.CSSProperties = {
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontWeight: 600,
    borderRadius: 'var(--radius-md)',
    transition: 'all var(--transition-fast)',
    opacity: disabled || isLoading ? 0.6 : 1,
    pointerEvents: disabled || isLoading ? 'none' : 'auto',
    gap: '0.5rem',
    cursor: disabled || isLoading ? 'not-allowed' : 'pointer',
    textDecoration: 'none',
  };

  const sizeStyles: Record<string, React.CSSProperties> = {
    sm: { padding: '0.4rem 0.85rem', fontSize: '0.85rem' },
    md: { padding: '0.6rem 1.25rem', fontSize: '0.95rem' },
    lg: { padding: '0.85rem 1.75rem', fontSize: '1.05rem' },
  };

  const getVariantStyles = (): React.CSSProperties => {
    switch (variant) {
      case 'primary':
        return {
          background: isHovered ? 'var(--brand-primary-hover)' : 'var(--brand-primary)',
          color: '#ffffff',
          boxShadow: isHovered ? 'var(--shadow-md)' : 'var(--shadow-sm)',
          border: '1px solid transparent',
        };
      case 'secondary':
        return {
          background: isHovered ? '#f1f5f9' : '#ffffff',
          color: 'var(--text-primary)',
          border: '1px solid var(--border-medium)',
          boxShadow: isHovered ? 'var(--shadow-sm)' : 'none',
        };
      case 'outline':
        return {
          background: isHovered ? 'var(--brand-subtle)' : 'transparent',
          color: isHovered ? 'var(--brand-primary)' : 'var(--text-primary)',
          border: `1px solid ${isHovered ? 'var(--brand-primary)' : 'var(--border-medium)'}`,
        };
      case 'danger':
        return {
          background: isHovered ? '#b91c1c' : 'var(--status-danger)',
          color: '#ffffff',
          border: '1px solid transparent',
        };
      case 'ghost':
        return {
          background: isHovered ? '#f1f5f9' : 'transparent',
          color: 'var(--text-secondary)',
          border: '1px solid transparent',
        };
      default:
        return {};
    }
  };

  return (
    <button
      style={{
        ...baseStyle,
        ...sizeStyles[size],
        ...getVariantStyles(),
        ...style,
      }}
      disabled={disabled || isLoading}
      onMouseEnter={(e) => {
        setIsHovered(true);
        if (onMouseEnter) onMouseEnter(e);
      }}
      onMouseLeave={(e) => {
        setIsHovered(false);
        if (onMouseLeave) onMouseLeave(e);
      }}
      {...props}
    >
      {isLoading && (
        <span
          className="animate-spin"
          style={{
            display: 'inline-block',
            width: '1em',
            height: '1em',
            border: '2px solid currentColor',
            borderRightColor: 'transparent',
            borderRadius: '50%',
          }}
        />
      )}
      {children}
    </button>
  );
};
