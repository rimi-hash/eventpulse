import React, { useState, useEffect } from 'react';
import { AlertCircle, X, RotateCcw } from 'lucide-react';

export interface ErrorAlertProps {
  title?: string;
  message: string;
  onRetry?: () => void;
  onClose?: () => void;
  inline?: boolean;
}

export const ErrorAlert: React.FC<ErrorAlertProps> = ({
  title = 'Notice',
  message,
  onRetry,
  onClose,
  inline = false,
}) => {
  const [isDismissed, setIsDismissed] = useState(false);

  // Re-display notification when message or title changes
  useEffect(() => {
    setIsDismissed(false);
  }, [message, title]);

  if (isDismissed) {
    return null;
  }

  const handleDismiss = () => {
    setIsDismissed(true);
    onClose?.();
  };

  const containerStyle: React.CSSProperties = inline
    ? {
        position: 'relative',
        display: 'flex',
        alignItems: 'flex-start',
        gap: '0.85rem',
        padding: '1.1rem 1.35rem',
        backgroundColor: '#0f172a', // Deep Obsidian Slate
        border: '1px solid rgba(239, 68, 68, 0.45)',
        borderLeft: '5px solid #ef4444', // Vibrant crimson warning accent
        borderRadius: 'var(--radius-lg, 12px)',
        boxShadow: '0 8px 24px rgba(0, 0, 0, 0.3), 0 0 16px rgba(239, 68, 68, 0.15)',
        color: '#f8fafc',
        margin: '1.25rem 0',
        width: '100%',
        boxSizing: 'border-box',
      }
    : {
        position: 'fixed',
        bottom: '84px', // Directly above the YAS voice button (bottom: 24px + 46px button + 14px gap)
        right: '24px',
        zIndex: 10001,
        width: '420px',
        maxWidth: 'calc(100vw - 36px)',
        display: 'flex',
        alignItems: 'flex-start',
        gap: '0.85rem',
        padding: '1.1rem 1.35rem',
        backgroundColor: '#0f172a', // Deep Obsidian Slate
        border: '1px solid rgba(239, 68, 68, 0.5)',
        borderLeft: '5px solid #ef4444', // Vibrant crimson warning accent
        borderRadius: 'var(--radius-lg, 12px)',
        boxShadow: '0 20px 40px -4px rgba(0, 0, 0, 0.55), 0 0 24px rgba(239, 68, 68, 0.25)',
        color: '#f8fafc',
        animation: 'errorSlideUp 0.3s cubic-bezier(0.16, 1, 0.3, 1)',
        boxSizing: 'border-box',
      };

  return (
    <aside
      role="alert"
      aria-live="assertive"
      style={containerStyle}
    >
        {/* Icon badge */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            width: '32px',
            height: '32px',
            borderRadius: '50%',
            backgroundColor: 'rgba(239, 68, 68, 0.2)',
            border: '1px solid rgba(239, 68, 68, 0.45)',
            color: '#ef4444',
            flexShrink: 0,
            marginTop: '1px',
          }}
        >
          <AlertCircle size={18} strokeWidth={2.4} />
        </div>

        {/* Content */}
        <div style={{ flex: 1, minWidth: 0 }}>
          <h4
            style={{
              fontWeight: 700,
              color: '#ffffff',
              fontSize: '0.95rem',
              margin: 0,
              letterSpacing: '-0.01em',
              lineHeight: 1.3,
            }}
          >
            {title}
          </h4>
          <p
            style={{
              fontSize: '0.875rem',
              marginTop: '0.35rem',
              marginBottom: 0,
              color: '#f1f5f9',
              lineHeight: 1.45,
              fontWeight: 500,
              wordBreak: 'break-word',
            }}
          >
            {message}
          </p>

          {onRetry && (
            <button
              onClick={onRetry}
              style={{
                marginTop: '0.65rem',
                padding: '5px 12px',
                fontSize: '0.8rem',
                fontWeight: 600,
                backgroundColor: '#ef4444',
                color: '#ffffff',
                border: 'none',
                borderRadius: '6px',
                cursor: 'pointer',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '6px',
                boxShadow: '0 2px 6px rgba(239, 68, 68, 0.35)',
                transition: 'background-color 0.15s, transform 0.15s',
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.backgroundColor = '#dc2626';
                e.currentTarget.style.transform = 'translateY(-1px)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.backgroundColor = '#ef4444';
                e.currentTarget.style.transform = 'translateY(0)';
              }}
            >
              <RotateCcw size={13} />
              Try Again
            </button>
          )}
        </div>

        {/* Close button */}
        <button
          onClick={handleDismiss}
          aria-label="Close notification"
          title="Dismiss notice"
          style={{
            background: 'rgba(255, 255, 255, 0.06)',
            border: 'none',
            color: '#94a3b8',
            cursor: 'pointer',
            padding: '5px',
            marginLeft: '4px',
            borderRadius: '6px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            flexShrink: 0,
            transition: 'color 0.15s, background-color 0.15s',
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.color = '#ffffff';
            e.currentTarget.style.backgroundColor = 'rgba(255, 255, 255, 0.16)';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.color = '#94a3b8';
            e.currentTarget.style.backgroundColor = 'rgba(255, 255, 255, 0.06)';
          }}
        >
          <X size={16} />
        </button>
      </aside>
  );
};
