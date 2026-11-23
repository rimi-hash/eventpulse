import React, { useState, useEffect, useRef } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { Button } from '../components/ui/Button';
import { 
  Lock, 
  Mail, 
  ArrowLeft, 
  Eye, 
  EyeOff, 
  AlertCircle, 
  CheckCircle2, 
  Ticket
} from 'lucide-react';

export const LoginPage: React.FC = () => {
  const { user, login, register, loginWithGoogle, isLoading } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  // Determine return target and context
  const locationState = location.state as { 
    from?: { pathname: string; search?: string } | string;
    selectedSessionId?: string;
    selectedTicketTypeId?: string;
    selectedSeatIds?: string[];
    gaQuantity?: number;
    action?: string;
    listingId?: string;
    message?: string;
  } | null;

  const returnPath = typeof locationState?.from === 'string'
    ? locationState.from
    : locationState?.from?.pathname
      ? `${locationState.from.pathname}${locationState.from.search || ''}`
      : '/';

  const isTicketFlow = locationState?.selectedSessionId != null || 
                       locationState?.action === 'BUY_RESALE' ||
                       returnPath.includes('/checkout') || 
                       returnPath.includes('/events');

  // If user is already authenticated, redirect immediately
  useEffect(() => {
    if (user && !isLoading) {
      navigate(returnPath, { replace: true, state: locationState });
    }
  }, [user, isLoading, navigate, returnPath, locationState]);

  const [mode, setMode] = useState<'LOGIN' | 'REGISTER'>('LOGIN');
  const [emailOrUsername, setEmailOrUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);

  // Registration fields
  const [username, setUsername] = useState('');
  const [registerEmail, setRegisterEmail] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

  const [formLoading, setFormLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  const googleBtnRef = useRef<HTMLDivElement>(null);
  const googleClientId = import.meta.env.VITE_GOOGLE_CLIENT_ID || '444478639706-nrklqsnjumbetkdpe021msoslae4j83q.apps.googleusercontent.com';

  useEffect(() => {
    const setupGoogle = () => {
      if (window.google?.accounts?.id && googleBtnRef.current) {
        try {
          window.google.accounts.id.initialize({
            client_id: googleClientId,
            callback: async (response: { credential: string }) => {
              if (response.credential) {
                setFormLoading(true);
                setError(null);
                try {
                  await loginWithGoogle(response.credential);
                  navigate(returnPath, { replace: true, state: locationState });
                } catch (err: unknown) {
                  setError(err instanceof Error ? err.message : 'Google sign-in failed');
                } finally {
                  setFormLoading(false);
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
          console.warn('Google setup error:', e);
        }
      }
    };

    if (window.google?.accounts?.id) {
      setupGoogle();
    } else {
      const timer = setInterval(() => {
        if (window.google?.accounts?.id) {
          clearInterval(timer);
          setupGoogle();
        }
      }, 250);
      return () => clearInterval(timer);
    }
  }, [mode, googleClientId, loginWithGoogle, navigate, returnPath, locationState]);

  const handleLoginSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!emailOrUsername.trim() || !password) {
      setError('Please provide your email/username and password');
      return;
    }

    setFormLoading(true);
    setError(null);

    try {
      await login(emailOrUsername.trim(), password);
      // Successfully logged in; useEffect will redirect or redirect directly
      navigate(returnPath, { replace: true, state: locationState });
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Invalid credentials. Please verify and try again.');
    } finally {
      setFormLoading(false);
    }
  };

  // Password criteria:
  const hasValidLength = password.length >= 8 && password.length <= 12;
  const hasLetter = /[a-zA-Z]/.test(password);
  const hasNumber = /\d/.test(password);
  const hasSpecial = /[!@#$%^&*(),.?":{}|<>_\-+=[\]\\/`~]/.test(password);
  const isPasswordValid = hasValidLength && hasLetter && hasNumber && hasSpecial;
  const passwordsMatch = password.length > 0 && password === confirmPassword;

  const handleRegisterSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!username.trim() || !registerEmail.trim() || !password) {
      setError('Please fill in all fields');
      return;
    }
    if (!isPasswordValid) {
      setError('Password must satisfy all security requirements (8-12 characters, letter, number, and special character).');
      return;
    }
    if (password !== confirmPassword) {
      setError('Passwords do not match');
      return;
    }

    setFormLoading(true);
    setError(null);

    try {
      await register(username.trim(), registerEmail.trim(), password, username.trim());
      setSuccessMessage('Account created successfully! Redirecting...');
      setTimeout(() => {
        navigate(returnPath, { replace: true, state: locationState });
      }, 800);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Registration failed. Please try a different email or username.');
    } finally {
      setFormLoading(false);
    }
  };

  return (
    <div style={{
      minHeight: '85vh',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '2.5rem 1rem',
      backgroundColor: '#f8fafc',
    }}>
      <div style={{
        maxWidth: '480px',
        width: '100%',
        backgroundColor: '#ffffff',
        borderRadius: 'var(--radius-xl)',
        boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.08), 0 8px 10px -6px rgba(0, 0, 0, 0.04)',
        border: '1px solid var(--border-subtle)',
        overflow: 'hidden',
      }}>
        {/* Contextual Purchase Banner */}
        {isTicketFlow && (
          <div style={{
            background: 'linear-gradient(135deg, #4f46e5 0%, #7c3aed 100%)',
            color: '#ffffff',
            padding: '1.25rem 1.5rem',
            display: 'flex',
            alignItems: 'center',
            gap: '1rem',
          }}>
            <div style={{
              padding: '0.6rem',
              backgroundColor: 'rgba(255, 255, 255, 0.2)',
              borderRadius: '50%',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}>
              <Ticket size={24} color="#ffffff" />
            </div>
            <div>
              <h4 style={{ margin: 0, fontSize: '0.95rem', fontWeight: 700, letterSpacing: '-0.01em' }}>
                Complete Your Ticket Reservation
              </h4>
              <p style={{ margin: '0.2rem 0 0 0', fontSize: '0.82rem', opacity: 0.9 }}>
                Please sign in to secure your seats. Your selections will be restored immediately after sign in.
              </p>
            </div>
          </div>
        )}

        {/* Normal Top Header if not ticket flow */}
        {!isTicketFlow && (
          <div style={{
            padding: '2rem 2rem 1rem 2rem',
            textAlign: 'center',
          }}>
            <div style={{
              display: 'inline-flex',
              alignItems: 'center',
              justifyContent: 'center',
              marginBottom: '1rem',
            }}>
              <img
                src="/eventpulse-logo.jpg"
                alt="EventPulse"
                style={{
                  width: '64px',
                  height: '64px',
                  borderRadius: '16px',
                  objectFit: 'cover',
                  boxShadow: '0 6px 20px rgba(0, 0, 0, 0.12)',
                }}
              />
            </div>
            <h2 style={{ fontSize: '1.5rem', fontWeight: 800, color: 'var(--text-primary)', margin: 0 }}>
              Welcome to EventPulse
            </h2>
            <p style={{ fontSize: '0.9rem', color: 'var(--text-secondary)', marginTop: '0.4rem', margin: 0 }}>
              Sign in to manage tickets, orders, and verified event access
            </p>
          </div>
        )}

        <div style={{ padding: '2rem' }}>
          {/* Tabs */}
          <div style={{
            display: 'flex',
            backgroundColor: '#f1f5f9',
            borderRadius: 'var(--radius-md)',
            padding: '0.25rem',
            marginBottom: '1.75rem',
          }}>
            <button
              type="button"
              onClick={() => { setMode('LOGIN'); setError(null); }}
              style={{
                flex: 1,
                padding: '0.6rem 0',
                fontSize: '0.9rem',
                fontWeight: 600,
                border: 'none',
                borderRadius: 'calc(var(--radius-md) - 2px)',
                backgroundColor: mode === 'LOGIN' ? '#ffffff' : 'transparent',
                color: mode === 'LOGIN' ? 'var(--text-primary)' : 'var(--text-secondary)',
                boxShadow: mode === 'LOGIN' ? '0 1px 3px rgba(0,0,0,0.1)' : 'none',
                cursor: 'pointer',
                transition: 'all 0.2s',
              }}
            >
              Sign In
            </button>
            <button
              type="button"
              onClick={() => { setMode('REGISTER'); setError(null); }}
              style={{
                flex: 1,
                padding: '0.6rem 0',
                fontSize: '0.9rem',
                fontWeight: 600,
                border: 'none',
                borderRadius: 'calc(var(--radius-md) - 2px)',
                backgroundColor: mode === 'REGISTER' ? '#ffffff' : 'transparent',
                color: mode === 'REGISTER' ? 'var(--text-primary)' : 'var(--text-secondary)',
                boxShadow: mode === 'REGISTER' ? '0 1px 3px rgba(0,0,0,0.1)' : 'none',
                cursor: 'pointer',
                transition: 'all 0.2s',
              }}
            >
              Create Account
            </button>
          </div>

          {/* Feedback Alerts */}
          {error && (
            <div style={{
              display: 'flex',
              alignItems: 'flex-start',
              gap: '0.75rem',
              padding: '0.85rem 1rem',
              backgroundColor: '#fef2f2',
              border: '1px solid #fecaca',
              borderRadius: 'var(--radius-md)',
              color: '#dc2626',
              fontSize: '0.85rem',
              marginBottom: '1.25rem',
            }}>
              <AlertCircle size={18} style={{ flexShrink: 0, marginTop: '2px' }} />
              <div>{error}</div>
            </div>
          )}

          {successMessage && (
            <div style={{
              display: 'flex',
              alignItems: 'center',
              gap: '0.75rem',
              padding: '0.85rem 1rem',
              backgroundColor: '#f0fdf4',
              border: '1px solid #bbf7d0',
              borderRadius: 'var(--radius-md)',
              color: '#16a34a',
              fontSize: '0.85rem',
              marginBottom: '1.25rem',
            }}>
              <CheckCircle2 size={18} style={{ flexShrink: 0 }} />
              <div>{successMessage}</div>
            </div>
          )}

          {/* Google Sign-in */}
          <div style={{ marginBottom: '1.5rem', display: 'flex', justifyContent: 'center' }}>
            <div ref={googleBtnRef} style={{ width: '100%', minHeight: '44px' }} />
          </div>

          <div style={{
            display: 'flex',
            alignItems: 'center',
            margin: '1.25rem 0',
            color: 'var(--text-tertiary)',
            fontSize: '0.8rem',
          }}>
            <div style={{ flex: 1, height: '1px', backgroundColor: 'var(--border-subtle)' }} />
            <span style={{ padding: '0 0.75rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
              Or continue with email
            </span>
            <div style={{ flex: 1, height: '1px', backgroundColor: 'var(--border-subtle)' }} />
          </div>

          {/* Login Form */}
          {mode === 'LOGIN' && (
            <form onSubmit={handleLoginSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1.1rem' }}>
              <div>
                <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-primary)', marginBottom: '0.4rem' }}>
                  Email or Username
                </label>
                <div style={{ position: 'relative' }}>
                  <Mail size={16} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-tertiary)' }} />
                  <input
                    type="text"
                    required
                    value={emailOrUsername}
                    onChange={(e) => setEmailOrUsername(e.target.value)}
                    placeholder=""
                    style={{
                      width: '100%',
                      padding: '0.7rem 0.75rem 0.7rem 2.4rem',
                      border: '1px solid var(--border-medium)',
                      borderRadius: 'var(--radius-md)',
                      fontSize: '0.9rem',
                      boxSizing: 'border-box',
                    }}
                  />
                </div>
              </div>

              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.4rem' }}>
                  <label style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-primary)' }}>
                    Password
                  </label>
                </div>
                <div style={{ position: 'relative' }}>
                  <Lock size={16} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-tertiary)' }} />
                  <input
                    type={showPassword ? 'text' : 'password'}
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder=""
                    style={{
                      width: '100%',
                      padding: '0.7rem 2.4rem 0.7rem 2.4rem',
                      border: '1px solid var(--border-medium)',
                      borderRadius: 'var(--radius-md)',
                      fontSize: '0.9rem',
                      boxSizing: 'border-box',
                    }}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    style={{
                      position: 'absolute',
                      right: '12px',
                      top: '50%',
                      transform: 'translateY(-50%)',
                      border: 'none',
                      background: 'none',
                      cursor: 'pointer',
                      color: 'var(--text-tertiary)',
                    }}
                  >
                    {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                </div>
              </div>

              <Button
                type="submit"
                variant="primary"
                size="md"
                isLoading={formLoading}
                style={{ width: '100%', marginTop: '0.5rem', height: '44px', fontWeight: 700 }}
              >
                Sign In & Continue
              </Button>
            </form>
          )}

          {/* Registration Form */}
          {mode === 'REGISTER' && (
            <form onSubmit={handleRegisterSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              <div>
                <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-primary)', marginBottom: '0.35rem' }}>
                  Username
                </label>
                <input
                  type="text"
                  required
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  placeholder=""
                  style={{
                    width: '100%',
                    padding: '0.65rem 0.75rem',
                    border: '1px solid var(--border-medium)',
                    borderRadius: 'var(--radius-md)',
                    fontSize: '0.9rem',
                    boxSizing: 'border-box',
                  }}
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-primary)', marginBottom: '0.35rem' }}>
                  Email Address
                </label>
                <input
                  type="email"
                  required
                  value={registerEmail}
                  onChange={(e) => setRegisterEmail(e.target.value)}
                  placeholder=""
                  style={{
                    width: '100%',
                    padding: '0.65rem 0.75rem',
                    border: '1px solid var(--border-medium)',
                    borderRadius: 'var(--radius-md)',
                    fontSize: '0.9rem',
                    boxSizing: 'border-box',
                  }}
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-primary)', marginBottom: '0.35rem' }}>
                  Password
                </label>
                <input
                  type="password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder=""
                  style={{
                    width: '100%',
                    padding: '0.65rem 0.75rem',
                    border: '1px solid var(--border-medium)',
                    borderRadius: 'var(--radius-md)',
                    fontSize: '0.9rem',
                    boxSizing: 'border-box',
                  }}
                />
              </div>

              {/* Password Dynamic Requirements Checklist */}
              <div
                style={{
                  padding: '0.75rem 0.85rem',
                  backgroundColor: '#f8fafc',
                  borderRadius: 'var(--radius-md)',
                  border: '1px solid var(--border-subtle)',
                  fontSize: '0.8rem',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '0.35rem',
                }}
              >
                <div style={{ fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '0.15rem' }}>
                  Password Requirements:
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.45rem', color: hasValidLength ? '#16a34a' : 'var(--text-muted)' }}>
                  <CheckCircle2 size={15} color={hasValidLength ? '#16a34a' : '#cbd5e1'} />
                  <span style={{ fontWeight: hasValidLength ? 600 : 400 }}>8–12 characters</span>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.45rem', color: hasLetter ? '#16a34a' : 'var(--text-muted)' }}>
                  <CheckCircle2 size={15} color={hasLetter ? '#16a34a' : '#cbd5e1'} />
                  <span style={{ fontWeight: hasLetter ? 600 : 400 }}>At least one letter (a-z, A-Z)</span>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.45rem', color: hasNumber ? '#16a34a' : 'var(--text-muted)' }}>
                  <CheckCircle2 size={15} color={hasNumber ? '#16a34a' : '#cbd5e1'} />
                  <span style={{ fontWeight: hasNumber ? 600 : 400 }}>At least one number (0-9)</span>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.45rem', color: hasSpecial ? '#16a34a' : 'var(--text-muted)' }}>
                  <CheckCircle2 size={15} color={hasSpecial ? '#16a34a' : '#cbd5e1'} />
                  <span style={{ fontWeight: hasSpecial ? 600 : 400 }}>At least one special character (!@#$%^&amp;*...)</span>
                </div>
                {confirmPassword && (
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.45rem', color: passwordsMatch ? '#16a34a' : '#dc2626' }}>
                    <CheckCircle2 size={15} color={passwordsMatch ? '#16a34a' : '#dc2626'} />
                    <span style={{ fontWeight: 600 }}>{passwordsMatch ? 'Passwords match' : 'Passwords do not match'}</span>
                  </div>
                )}
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-primary)', marginBottom: '0.35rem' }}>
                  Confirm Password
                </label>
                <input
                  type="password"
                  required
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder=""
                  style={{
                    width: '100%',
                    padding: '0.65rem 0.75rem',
                    border: '1px solid var(--border-medium)',
                    borderRadius: 'var(--radius-md)',
                    fontSize: '0.9rem',
                    boxSizing: 'border-box',
                  }}
                />
              </div>

              <Button
                type="submit"
                variant="primary"
                size="md"
                isLoading={formLoading}
                style={{ width: '100%', marginTop: '0.5rem', height: '44px', fontWeight: 700 }}
              >
                Create Account & Continue
              </Button>
            </form>
          )}

          {/* Back Navigation Button */}
          <div style={{ marginTop: '1.5rem', textAlign: 'center' }}>
            <button
              type="button"
              onClick={() => navigate(returnPath.startsWith('/checkout') ? '/events' : returnPath)}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '0.4rem',
                border: 'none',
                background: 'none',
                color: 'var(--text-secondary)',
                fontSize: '0.85rem',
                cursor: 'pointer',
                fontWeight: 600,
              }}
            >
              <ArrowLeft size={16} />
              {isTicketFlow ? 'Return to Event Details' : 'Back to Home'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
