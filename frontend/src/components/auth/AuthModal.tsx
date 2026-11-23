import React, { useState, useEffect, useRef } from 'react';
import { useAuth } from '../../context/AuthContext';
import { Button } from '../ui/Button';
import { X, Eye, EyeOff, Check, AlertCircle, ShieldCheck } from 'lucide-react';

interface AuthModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: () => void;
  initialMode?: AuthMode;
}

type AuthMode = 'LOGIN' | 'REGISTER' | 'FORGOT_PASSWORD';

export const AuthModal: React.FC<AuthModalProps> = ({ isOpen, onClose, onSuccess, initialMode = 'LOGIN' }) => {
  const { login, loginWithGoogle, register, requestPasswordReset } = useAuth();
  const [mode, setMode] = useState<AuthMode>(initialMode);

  useEffect(() => {
    if (isOpen) {
      setMode(initialMode);
    }
  }, [isOpen, initialMode]);

  // Form Fields
  const [identifier, setIdentifier] = useState(''); // email or username for login
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [termsAccepted, setTermsAccepted] = useState(false);
  const [forgotIdentifier, setForgotIdentifier] = useState('');

  // UI State
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [infoMessage, setInfoMessage] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const googleBtnRef = useRef<HTMLDivElement>(null);
  const googleClientId = import.meta.env.VITE_GOOGLE_CLIENT_ID || '444478639706-nrklqsnjumbetkdpe021msoslae4j83q.apps.googleusercontent.com';

  // Password validation checks: 8-12 characters, letter, number, special character
  const hasValidLength = password.length >= 8 && password.length <= 12;
  const hasLetter = /[a-zA-Z]/.test(password);
  const hasNumber = /\d/.test(password);
  const hasSpecial = /[!@#$%^&*(),.?":{}|<>_\-+=[\]\\/`~]/.test(password);
  const passwordsMatch = password.length > 0 && password === confirmPassword;
  const isPasswordValid = hasValidLength && hasLetter && hasNumber && hasSpecial;

  useEffect(() => {
    if (!isOpen) return;

    const setupGoogleSignIn = () => {
      if (window.google?.accounts?.id && googleBtnRef.current) {
        try {
          window.google.accounts.id.initialize({
            client_id: googleClientId,
            callback: async (response: { credential: string }) => {
              if (response.credential) {
                setLoading(true);
                setError(null);
                try {
                  await loginWithGoogle(response.credential);
                  onClose();
                  if (onSuccess) onSuccess();
                } catch (err: unknown) {
                  if (err instanceof Error) {
                    setError(err.message);
                  } else {
                    setError('Google sign-in failed. Please verify account.');
                  }
                } finally {
                  setLoading(false);
                }
              }
            },
          });

          window.google.accounts.id.renderButton(googleBtnRef.current, {
            theme: 'outline',
            size: 'large',
            text: mode === 'REGISTER' ? 'signup_with' : 'signin_with',
            shape: 'rectangular',
            width: 380,
          });
        } catch (e) {
          console.warn('Google Identity Services setup warning:', e);
        }
      }
    };

    if (window.google?.accounts?.id) {
      setupGoogleSignIn();
    } else {
      const interval = setInterval(() => {
        if (window.google?.accounts?.id) {
          clearInterval(interval);
          setupGoogleSignIn();
        }
      }, 250);
      return () => clearInterval(interval);
    }
  }, [isOpen, mode]);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setInfoMessage(null);

    if (mode === 'REGISTER') {
      if (!username.trim() || !email.trim() || !password) {
        setError('Please fill in all fields.');
        return;
      }
      if (!isPasswordValid) {
        setError('Password must satisfy all security requirements (8-12 characters, letter, number, and special character).');
        return;
      }
      if (!passwordsMatch) {
        setError('Passwords do not match.');
        return;
      }
      if (!termsAccepted) {
        setError('Please accept the Terms of Service & Privacy Policy.');
        return;
      }
    }

    setLoading(true);
    try {
      if (mode === 'REGISTER') {
        await register(username.trim(), email.trim(), password, username.trim());
        onClose();
        if (onSuccess) onSuccess();
      } else if (mode === 'LOGIN') {
        await login(identifier.trim(), password);
        onClose();
        if (onSuccess) onSuccess();
      } else if (mode === 'FORGOT_PASSWORD') {
        const msg = await requestPasswordReset(forgotIdentifier.trim());
        setInfoMessage(msg);
      }
    } catch (err: unknown) {
      if (err instanceof Error) {
        setError(err.message);
      } else {
        setError('Authentication request failed. Please check credentials.');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        backgroundColor: 'rgba(15, 23, 42, 0.45)',
        backdropFilter: 'blur(6px)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 100,
        padding: '1rem',
        overflowY: 'auto',
      }}
    >
      <div
        style={{
          width: '100%',
          maxWidth: '480px',
          padding: '2.25rem',
          borderRadius: 'var(--radius-xl)',
          border: '1px solid var(--border-subtle)',
          position: 'relative',
          backgroundColor: '#ffffff',
          boxShadow: 'var(--shadow-xl)',
        }}
      >
        <button
          onClick={onClose}
          style={{
            position: 'absolute',
            top: '1.25rem',
            right: '1.25rem',
            color: 'var(--text-muted)',
            cursor: 'pointer',
            background: 'none',
            border: 'none',
          }}
          aria-label="Close"
        >
          <X size={20} />
        </button>

        {/* Header */}
        <div style={{ marginBottom: '1.25rem', textAlign: 'center' }}>
          <div style={{
            display: 'inline-flex',
            alignItems: 'center',
            justifyContent: 'center',
            marginBottom: '0.85rem',
          }}>
            <img
              src="/eventpulse-logo.jpg"
              alt="EventPulse"
              style={{
                width: '56px',
                height: '56px',
                borderRadius: '14px',
                objectFit: 'cover',
                boxShadow: '0 6px 18px rgba(0, 0, 0, 0.12)',
              }}
            />
          </div>
          <h2 style={{ fontSize: '1.5rem', fontWeight: 700, marginBottom: '0.25rem', color: 'var(--text-primary)' }}>
            {mode === 'REGISTER'
              ? 'Create Your Account'
              : mode === 'FORGOT_PASSWORD'
              ? 'Reset Your Password'
              : 'Welcome to EventPulse'}
          </h2>
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.875rem' }}>
            {mode === 'REGISTER'
              ? 'Join EventPulse to book reserved passes, access wallet tickets, and trade verified resale.'
              : mode === 'FORGOT_PASSWORD'
              ? 'Enter your account email or username to receive password reset instructions.'
              : 'Sign in to access your digital tickets, wallet, and order receipts.'}
          </p>
        </div>

        {/* Google OAuth Section (Login and Register) */}
        {mode !== 'FORGOT_PASSWORD' && (
          <div style={{ marginBottom: '1.25rem' }}>
            <div ref={googleBtnRef} style={{ display: 'flex', justifyContent: 'center', minHeight: '44px' }} />
            <div style={{ display: 'flex', alignItems: 'center', margin: '1rem 0 0.5rem', gap: '0.75rem' }}>
              <div style={{ flex: 1, height: '1px', backgroundColor: 'var(--border-subtle)' }} />
              <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                or with credentials
              </span>
              <div style={{ flex: 1, height: '1px', backgroundColor: 'var(--border-subtle)' }} />
            </div>
          </div>
        )}

        {/* Messages */}
        {error && (
          <div
            style={{
              padding: '0.75rem 1rem',
              backgroundColor: 'rgba(239, 68, 68, 0.15)',
              border: '1px solid var(--status-danger)',
              color: '#F87171',
              borderRadius: 'var(--radius-sm)',
              fontSize: '0.85rem',
              marginBottom: '1rem',
              display: 'flex',
              alignItems: 'center',
              gap: '0.5rem',
            }}
          >
            <AlertCircle size={16} />
            {error}
          </div>
        )}

        {infoMessage && (
          <div
            style={{
              padding: '0.75rem 1rem',
              backgroundColor: 'rgba(16, 185, 129, 0.15)',
              border: '1px solid var(--status-success)',
              color: '#34D399',
              borderRadius: 'var(--radius-sm)',
              fontSize: '0.85rem',
              marginBottom: '1rem',
              display: 'flex',
              alignItems: 'center',
              gap: '0.5rem',
            }}
          >
            <ShieldCheck size={16} />
            {infoMessage}
          </div>
        )}

        {/* Form Body */}
        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '0.9rem' }}>
          {mode === 'REGISTER' && (
            <>
              <div>
                <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 500, marginBottom: '0.3rem', color: 'var(--text-secondary)' }}>
                  Username
                </label>
                <input
                  type="text"
                  required
                  value={username}
                  onChange={(e) => setUsername(e.target.value.toLowerCase().replace(/[^a-z0-9._-]/g, ''))}
                  placeholder=""
                  style={{
                    width: '100%',
                    padding: '0.7rem 0.85rem',
                    backgroundColor: 'var(--bg-secondary)',
                    border: '1px solid var(--border-subtle)',
                    borderRadius: 'var(--radius-sm)',
                    color: 'var(--text-primary)',
                    fontSize: '0.9rem',
                  }}
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 500, marginBottom: '0.3rem', color: 'var(--text-secondary)' }}>
                  Email Address
                </label>
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder=""
                  style={{
                    width: '100%',
                    padding: '0.7rem 0.85rem',
                    backgroundColor: 'var(--bg-secondary)',
                    border: '1px solid var(--border-subtle)',
                    borderRadius: 'var(--radius-sm)',
                    color: 'var(--text-primary)',
                    fontSize: '0.9rem',
                  }}
                />
              </div>
            </>
          )}

          {mode === 'LOGIN' && (
            <div>
              <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 500, marginBottom: '0.3rem', color: 'var(--text-secondary)' }}>
                Email or Username
              </label>
              <input
                type="text"
                required
                value={identifier}
                onChange={(e) => setIdentifier(e.target.value)}
                placeholder=""
                style={{
                  width: '100%',
                  padding: '0.7rem 0.85rem',
                  backgroundColor: 'var(--bg-secondary)',
                  border: '1px solid var(--border-subtle)',
                  borderRadius: 'var(--radius-sm)',
                  color: 'var(--text-primary)',
                  fontSize: '0.9rem',
                }}
              />
            </div>
          )}

          {mode === 'FORGOT_PASSWORD' && (
            <div>
              <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 500, marginBottom: '0.3rem', color: 'var(--text-secondary)' }}>
                Account Email or Username
              </label>
              <input
                type="text"
                required
                value={forgotIdentifier}
                onChange={(e) => setForgotIdentifier(e.target.value)}
                placeholder=""
                style={{
                  width: '100%',
                  padding: '0.7rem 0.85rem',
                  backgroundColor: 'var(--bg-secondary)',
                  border: '1px solid var(--border-subtle)',
                  borderRadius: 'var(--radius-sm)',
                  color: 'var(--text-primary)',
                  fontSize: '0.9rem',
                }}
              />
            </div>
          )}

          {mode !== 'FORGOT_PASSWORD' && (
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.3rem' }}>
                <label style={{ fontSize: '0.8rem', fontWeight: 500, color: 'var(--text-secondary)' }}>
                  Password
                </label>
                {mode === 'LOGIN' && (
                  <button
                    type="button"
                    onClick={() => {
                      setMode('FORGOT_PASSWORD');
                      setError(null);
                      setInfoMessage(null);
                    }}
                    style={{
                      background: 'none',
                      border: 'none',
                      fontSize: '0.75rem',
                      color: 'var(--brand-primary)',
                      cursor: 'pointer',
                    }}
                  >
                    Forgot password?
                  </button>
                )}
              </div>
              <div style={{ position: 'relative' }}>
                <input
                  type={showPassword ? 'text' : 'password'}
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder=""
                  style={{
                    width: '100%',
                    padding: '0.7rem 2.5rem 0.7rem 0.85rem',
                    backgroundColor: 'var(--bg-secondary)',
                    border: '1px solid var(--border-subtle)',
                    borderRadius: 'var(--radius-sm)',
                    color: 'var(--text-primary)',
                    fontSize: '0.9rem',
                  }}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  style={{
                    position: 'absolute',
                    right: '0.75rem',
                    top: '50%',
                    transform: 'translateY(-50%)',
                    background: 'none',
                    border: 'none',
                    color: 'var(--text-muted)',
                    cursor: 'pointer',
                  }}
                  tabIndex={-1}
                >
                  {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
            </div>
          )}

          {/* Registration Password Requirements Panel */}
          {mode === 'REGISTER' && (
            <>
              <div>
                <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 500, marginBottom: '0.3rem', color: 'var(--text-secondary)' }}>
                  Confirm Password
                </label>
                <div style={{ position: 'relative' }}>
                  <input
                    type={showConfirmPassword ? 'text' : 'password'}
                    required
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    placeholder=""
                    style={{
                      width: '100%',
                      padding: '0.7rem 2.5rem 0.7rem 0.85rem',
                      backgroundColor: 'var(--bg-secondary)',
                      border: '1px solid var(--border-subtle)',
                      borderRadius: 'var(--radius-sm)',
                      color: 'var(--text-primary)',
                      fontSize: '0.9rem',
                    }}
                  />
                  <button
                    type="button"
                    onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                    style={{
                      position: 'absolute',
                      right: '0.75rem',
                      top: '50%',
                      transform: 'translateY(-50%)',
                      background: 'none',
                      border: 'none',
                      color: 'var(--text-muted)',
                      cursor: 'pointer',
                    }}
                    tabIndex={-1}
                  >
                    {showConfirmPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                </div>
              </div>

              {/* Password Checklist Card (Meeting exact user specs) */}
              <div
                style={{
                  padding: '0.75rem 0.85rem',
                  backgroundColor: 'var(--bg-elevated)',
                  borderRadius: 'var(--radius-sm)',
                  border: '1px solid var(--border-subtle)',
                  fontSize: '0.75rem',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '0.35rem',
                }}
              >
                <div style={{ fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '0.15rem' }}>
                  Password Requirements:
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', color: hasValidLength ? '#10B981' : 'var(--text-muted)' }}>
                  <Check size={13} color={hasValidLength ? '#10B981' : 'var(--text-muted)'} />
                  <span style={{ fontWeight: hasValidLength ? 600 : 400 }}>8–12 characters</span>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', color: hasLetter ? '#10B981' : 'var(--text-muted)' }}>
                  <Check size={13} color={hasLetter ? '#10B981' : 'var(--text-muted)'} />
                  <span style={{ fontWeight: hasLetter ? 600 : 400 }}>At least one letter (a-z, A-Z)</span>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', color: hasNumber ? '#10B981' : 'var(--text-muted)' }}>
                  <Check size={13} color={hasNumber ? '#10B981' : 'var(--text-muted)'} />
                  <span style={{ fontWeight: hasNumber ? 600 : 400 }}>At least one number (0-9)</span>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', color: hasSpecial ? '#10B981' : 'var(--text-muted)' }}>
                  <Check size={13} color={hasSpecial ? '#10B981' : 'var(--text-muted)'} />
                  <span style={{ fontWeight: hasSpecial ? 600 : 400 }}>At least one special character (!@#$%^&amp;*...)</span>
                </div>
                {confirmPassword && (
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', color: passwordsMatch ? '#10B981' : '#EF4444' }}>
                    <Check size={13} color={passwordsMatch ? '#10B981' : '#EF4444'} />
                    <span style={{ fontWeight: 600 }}>{passwordsMatch ? 'Passwords match' : 'Passwords do not match'}</span>
                  </div>
                )}
              </div>

              {/* Terms and Privacy Checkbox */}
              <div style={{ display: 'flex', alignItems: 'flex-start', gap: '0.5rem', marginTop: '0.2rem' }}>
                <input
                  type="checkbox"
                  id="termsConsent"
                  checked={termsAccepted}
                  onChange={(e) => setTermsAccepted(e.target.checked)}
                  style={{ marginTop: '0.2rem', accentColor: 'var(--brand-primary)' }}
                />
                <label htmlFor="termsConsent" style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', lineHeight: 1.4 }}>
                  I agree to the EventPulse Terms of Service, anti-scalping policies, and acknowledge the Privacy Notice.
                </label>
              </div>
            </>
          )}

          <Button
            type="submit"
            variant="primary"
            isLoading={loading}
            style={{ marginTop: '0.5rem', width: '100%', padding: '0.75rem' }}
          >
            {mode === 'REGISTER'
              ? 'Create Customer Account'
              : mode === 'FORGOT_PASSWORD'
              ? 'Send Reset Instructions'
              : 'Sign In'}
          </Button>
        </form>

        {/* Footer switchers */}
        <div style={{ textAlign: 'center', marginTop: '1.25rem', fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
          {mode === 'FORGOT_PASSWORD' ? (
            <button
              onClick={() => {
                setMode('LOGIN');
                setError(null);
                setInfoMessage(null);
              }}
              style={{ color: 'var(--brand-primary)', fontWeight: 600, background: 'none', border: 'none', cursor: 'pointer' }}
            >
              Back to Sign In
            </button>
          ) : mode === 'REGISTER' ? (
            <>
              Already have an account?{' '}
              <button
                onClick={() => {
                  setMode('LOGIN');
                  setError(null);
                  setInfoMessage(null);
                }}
                style={{ color: 'var(--brand-primary)', fontWeight: 600, background: 'none', border: 'none', cursor: 'pointer', textDecoration: 'underline' }}
              >
                Sign In
              </button>
            </>
          ) : (
            <>
              New to EventPulse?{' '}
              <button
                onClick={() => {
                  setMode('REGISTER');
                  setError(null);
                  setInfoMessage(null);
                }}
                style={{ color: 'var(--brand-primary)', fontWeight: 600, background: 'none', border: 'none', cursor: 'pointer', textDecoration: 'underline' }}
              >
                Create Account
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
};
