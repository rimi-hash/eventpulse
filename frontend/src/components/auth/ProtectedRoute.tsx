import React from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { Role } from '../../types/api';
import { ShieldAlert, ArrowLeft } from 'lucide-react';

interface ProtectedRouteProps {
  allowedRoles?: Role[];
  children: React.ReactNode;
}

export const ProtectedRoute: React.FC<ProtectedRouteProps> = ({ allowedRoles, children }) => {
  const { user, isLoading } = useAuth();
  const location = useLocation();

  if (isLoading) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '60vh', flexDirection: 'column', gap: '1rem' }}>
        <div style={{ width: '40px', height: '40px', border: '3px solid rgba(255,255,255,0.1)', borderTopColor: '#6366f1', borderRadius: '50%', animation: 'spin 1s linear infinite' }} />
        <p style={{ color: '#94a3b8', fontSize: '0.9rem' }}>Verifying workspace permissions...</p>
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  if (allowedRoles && allowedRoles.length > 0 && !allowedRoles.includes(user.role)) {
    return (
      <div
        style={{
          maxWidth: '560px',
          margin: '5rem auto',
          padding: '2.5rem',
          backgroundColor: '#ffffff',
          border: '1px solid var(--border-subtle)',
          borderRadius: 'var(--radius-xl)',
          boxShadow: 'var(--shadow-lg)',
          textAlign: 'center',
          color: 'var(--text-primary)',
        }}
      >
        <div
          style={{
            display: 'inline-flex',
            padding: '1.25rem',
            backgroundColor: '#fef2f2',
            border: '1px solid #fecaca',
            borderRadius: '50%',
            marginBottom: '1.5rem',
            color: '#dc2626',
          }}
        >
          <ShieldAlert size={44} />
        </div>
        <h2 style={{ fontSize: '1.45rem', fontWeight: 800, marginBottom: '0.75rem', color: 'var(--text-primary)' }}>
          Workspace Access Restricted
        </h2>
        <p style={{ color: 'var(--text-secondary)', fontSize: '0.92rem', lineHeight: '1.6', marginBottom: '1.75rem' }}>
          This operations workspace is restricted to <strong style={{ color: 'var(--brand-primary)' }}>{allowedRoles.join(' or ')}</strong> roles.
          Your current account is authenticated as <strong style={{ color: '#d97706' }}>{user.role}</strong>.
        </p>
        <div style={{ display: 'flex', justifyContent: 'center', gap: '1rem' }}>
          <a
            href="/"
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '0.5rem',
              padding: '0.65rem 1.25rem',
              backgroundColor: 'var(--brand-primary)',
              color: '#ffffff',
              borderRadius: 'var(--radius-md)',
              textDecoration: 'none',
              fontWeight: 600,
              fontSize: '0.9rem',
              boxShadow: 'var(--shadow-sm)',
            }}
          >
            <ArrowLeft size={16} /> Return to Home
          </a>
        </div>
      </div>
    );
  }

  return <>{children}</>;
};
