import React, { useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import {
  Ticket,
  ShoppingBag,
  QrCode,
  LayoutDashboard,
  Shield,
  LogOut,
  Menu,
  X,
  ChevronDown,
  Layers,
  Sparkles,
  Music,
  Smile,
  Trophy,
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { AuthModal } from '../auth/AuthModal';
import { Button } from '../ui/Button';

export const Navbar: React.FC = () => {
  const { user, logout } = useAuth();
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);
  const [isUserMenuOpen, setIsUserMenuOpen] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const location = useLocation();

  const isActive = (path: string) => {
    if (path === '/') return location.pathname === '/' && !location.search;
    return location.pathname.startsWith(path);
  };

  const isCategoryActive = (catValue: string) => {
    return location.pathname === '/events' && location.search.includes(`category=${catValue}`);
  };

  return (
    <>
      <header
        style={{
          position: 'sticky',
          top: 0,
          zIndex: 50,
          backgroundColor: '#FFFFFF',
          borderBottom: '1px solid var(--border-subtle)',
          boxShadow: 'var(--shadow-xs)',
        }}
      >
        <div
          className="container"
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            height: '68px',
            gap: '1.25rem',
          }}
        >
          {/* Brand Mark & Wordmark */}
          <Link to="/" style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', flexShrink: 0 }}>
            <img
              src="/eventpulse-logo.jpg"
              alt="EventPulse Logo"
              style={{
                width: '38px',
                height: '38px',
                borderRadius: '8px',
                objectFit: 'cover',
                boxShadow: '0 2px 6px rgba(0, 0, 0, 0.12)',
              }}
            />
            <span
              style={{
                fontFamily: 'var(--font-display)',
                fontSize: '1.35rem',
                fontWeight: 800,
                color: 'var(--text-primary)',
                letterSpacing: '-0.03em',
              }}
            >
              Event<span style={{ color: 'var(--brand-primary)' }}>Pulse</span>
            </span>
          </Link>

          {/* Desktop Category Navigation */}
          <nav
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '1.25rem',
            }}
            className="navbar-desktop-categories"
          >
            <Link
              to="/events"
              style={{
                fontSize: '0.9rem',
                fontWeight: 600,
                color: isActive('/events') && !location.search ? 'var(--brand-primary)' : 'var(--text-secondary)',
                borderBottom: isActive('/events') && !location.search ? '2px solid var(--brand-primary)' : '2px solid transparent',
                padding: '0.4rem 0',
                transition: 'color var(--transition-fast)',
              }}
            >
              Explore
            </Link>

            <Link
              to="/events?category=CONCERT"
              style={{
                fontSize: '0.9rem',
                fontWeight: 600,
                color: isCategoryActive('CONCERT') ? 'var(--brand-primary)' : 'var(--text-secondary)',
                borderBottom: isCategoryActive('CONCERT') ? '2px solid var(--brand-primary)' : '2px solid transparent',
                padding: '0.4rem 0',
                display: 'flex',
                alignItems: 'center',
                gap: '0.35rem',
                transition: 'color var(--transition-fast)',
              }}
            >
              <Music size={14} />
              Concerts
            </Link>

            <Link
              to="/events?category=COMEDY"
              style={{
                fontSize: '0.9rem',
                fontWeight: 600,
                color: isCategoryActive('COMEDY') ? 'var(--brand-primary)' : 'var(--text-secondary)',
                borderBottom: isCategoryActive('COMEDY') ? '2px solid var(--brand-primary)' : '2px solid transparent',
                padding: '0.4rem 0',
                display: 'flex',
                alignItems: 'center',
                gap: '0.35rem',
                transition: 'color var(--transition-fast)',
              }}
            >
              <Smile size={14} />
              Comedy
            </Link>

            <Link
              to="/events?category=SPORTS"
              style={{
                fontSize: '0.9rem',
                fontWeight: 600,
                color: isCategoryActive('SPORTS') ? 'var(--brand-primary)' : 'var(--text-secondary)',
                borderBottom: isCategoryActive('SPORTS') ? '2px solid var(--brand-primary)' : '2px solid transparent',
                padding: '0.4rem 0',
                display: 'flex',
                alignItems: 'center',
                gap: '0.35rem',
                transition: 'color var(--transition-fast)',
              }}
            >
              <Trophy size={14} />
              Sports
            </Link>

            <Link
              to="/resale"
              style={{
                fontSize: '0.9rem',
                fontWeight: 600,
                color: isActive('/resale') ? 'var(--brand-primary)' : 'var(--text-secondary)',
                borderBottom: isActive('/resale') ? '2px solid var(--brand-primary)' : '2px solid transparent',
                padding: '0.4rem 0',
                display: 'flex',
                alignItems: 'center',
                gap: '0.35rem',
                transition: 'color var(--transition-fast)',
              }}
            >
              <Sparkles size={14} style={{ color: 'var(--brand-primary)' }} />
              Fan Resale
            </Link>
          </nav>

          {/* Right Action Menu */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', flexShrink: 0 }}>
            {/* Customer Quick Links: My Tickets & Orders */}
            {user && (
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }} className="navbar-customer-quicklinks">
                <Link
                  to="/my-tickets"
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.4rem',
                    fontSize: '0.86rem',
                    fontWeight: 600,
                    color: isActive('/my-tickets') ? 'var(--brand-primary)' : 'var(--text-secondary)',
                    padding: '0.4rem 0.75rem',
                    borderRadius: 'var(--radius-sm)',
                    backgroundColor: isActive('/my-tickets') ? 'var(--brand-subtle)' : 'transparent',
                    transition: 'all var(--transition-fast)',
                  }}
                >
                  <Ticket size={16} />
                  <span>My Tickets</span>
                </Link>

                <Link
                  to="/my-orders"
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.4rem',
                    fontSize: '0.86rem',
                    fontWeight: 600,
                    color: isActive('/my-orders') ? 'var(--brand-primary)' : 'var(--text-secondary)',
                    padding: '0.4rem 0.75rem',
                    borderRadius: 'var(--radius-sm)',
                    backgroundColor: isActive('/my-orders') ? 'var(--brand-subtle)' : 'transparent',
                    transition: 'all var(--transition-fast)',
                  }}
                >
                  <ShoppingBag size={16} />
                  <span>Orders</span>
                </Link>
              </div>
            )}


            {/* Organizer Studio Direct Link for Organizers & Admins */}
            {(user?.role === 'ORGANIZER' || user?.role === 'PLATFORM_ADMIN') && (
              <Link
                to="/organizer"
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '0.4rem',
                  padding: '0.45rem 0.85rem',
                  fontSize: '0.85rem',
                  fontWeight: 700,
                  color: '#FFFFFF',
                  backgroundColor: 'var(--brand-navy)',
                  borderRadius: 'var(--radius-sm)',
                  transition: 'all var(--transition-fast)',
                }}
                className="navbar-organizer-badge"
              >
                <LayoutDashboard size={15} />
                <span>Organizer Studio</span>
              </Link>
            )}

            {/* User Account Dropdown or Sign In */}
            {user ? (
              <div style={{ position: 'relative' }}>
                <button
                  onClick={() => setIsUserMenuOpen(!isUserMenuOpen)}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.5rem',
                    padding: '0.35rem 0.65rem',
                    backgroundColor: 'var(--bg-secondary)',
                    borderRadius: 'var(--radius-sm)',
                    border: '1px solid var(--border-subtle)',
                    fontSize: '0.86rem',
                    cursor: 'pointer',
                  }}
                >
                  <div
                    style={{
                      width: '26px',
                      height: '26px',
                      borderRadius: '50%',
                      backgroundColor: 'var(--brand-primary)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      color: '#FFFFFF',
                      fontSize: '0.75rem',
                      fontWeight: 700,
                    }}
                  >
                    {(user.fullName || user.email || 'U').charAt(0).toUpperCase()}
                  </div>
                  <span style={{ fontWeight: 600, color: 'var(--text-primary)', maxWidth: '120px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {user.fullName || user.email}
                  </span>
                  <ChevronDown size={14} color="var(--text-secondary)" />
                </button>

                {/* Dropdown Menu */}
                {isUserMenuOpen && (
                  <div
                    style={{
                      position: 'absolute',
                      right: 0,
                      top: 'calc(100% + 8px)',
                      width: '240px',
                      backgroundColor: '#FFFFFF',
                      borderRadius: 'var(--radius-md)',
                      border: '1px solid var(--border-subtle)',
                      boxShadow: 'var(--shadow-lg)',
                      padding: '0.5rem 0',
                      zIndex: 100,
                    }}
                  >
                    <div style={{ padding: '0.75rem 1rem', borderBottom: '1px solid var(--border-subtle)' }}>
                      <div style={{ fontWeight: 700, color: 'var(--text-primary)', fontSize: '0.9rem' }}>
                        {user.fullName || 'EventPulse Fan'}
                      </div>
                      <div style={{ color: 'var(--text-secondary)', fontSize: '0.78rem', wordBreak: 'break-all' }}>
                        {user.email}
                      </div>
                      <div
                        style={{
                          display: 'inline-block',
                          marginTop: '0.35rem',
                          padding: '0.15rem 0.5rem',
                          backgroundColor: 'var(--brand-subtle)',
                          color: 'var(--brand-primary)',
                          borderRadius: 'var(--radius-xs)',
                          fontSize: '0.7rem',
                          fontWeight: 700,
                        }}
                      >
                        {user.role}
                      </div>
                    </div>

                    <div style={{ padding: '0.25rem 0' }}>
                      <Link
                        to="/my-tickets"
                        onClick={() => setIsUserMenuOpen(false)}
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: '0.6rem',
                          padding: '0.55rem 1rem',
                          fontSize: '0.86rem',
                          color: 'var(--text-primary)',
                        }}
                      >
                        <Ticket size={15} />
                        My Tickets
                      </Link>
                      <Link
                        to="/my-orders"
                        onClick={() => setIsUserMenuOpen(false)}
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: '0.6rem',
                          padding: '0.55rem 1rem',
                          fontSize: '0.86rem',
                          color: 'var(--text-primary)',
                        }}
                      >
                        <ShoppingBag size={15} />
                        Order History
                      </Link>
                      <Link
                        to="/resale"
                        onClick={() => setIsUserMenuOpen(false)}
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: '0.6rem',
                          padding: '0.55rem 1rem',
                          fontSize: '0.86rem',
                          color: 'var(--text-primary)',
                        }}
                      >
                        <Sparkles size={15} />
                        Fan Resale Hub
                      </Link>

                      {(user.role === 'ORGANIZER' || user.role === 'PLATFORM_ADMIN') && (
                        <>
                          <div style={{ height: '1px', backgroundColor: 'var(--border-subtle)', margin: '0.25rem 0' }} />
                          <Link
                            to="/organizer"
                            onClick={() => setIsUserMenuOpen(false)}
                            style={{
                              display: 'flex',
                              alignItems: 'center',
                              gap: '0.6rem',
                              padding: '0.55rem 1rem',
                              fontSize: '0.86rem',
                              color: 'var(--brand-primary)',
                              fontWeight: 700,
                            }}
                          >
                            <LayoutDashboard size={15} />
                            Organizer Studio
                          </Link>
                          <Link
                            to="/venue-studio"
                            onClick={() => setIsUserMenuOpen(false)}
                            style={{
                              display: 'flex',
                              alignItems: 'center',
                              gap: '0.6rem',
                              padding: '0.55rem 1rem',
                              fontSize: '0.86rem',
                              color: 'var(--text-secondary)',
                            }}
                          >
                            <Layers size={15} />
                            Venue Studio Canvas
                          </Link>
                        </>
                      )}

                      {(user.role === 'GATE_STAFF' || user.role === 'PLATFORM_ADMIN') && (
                        <Link
                          to="/scanner"
                          onClick={() => setIsUserMenuOpen(false)}
                          style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: '0.6rem',
                            padding: '0.55rem 1rem',
                            fontSize: '0.86rem',
                            color: 'var(--text-secondary)',
                          }}
                        >
                          <QrCode size={15} />
                          Gate Admissions Scanner
                        </Link>
                      )}

                      {user.role === 'PLATFORM_ADMIN' && (
                        <Link
                          to="/admin"
                          onClick={() => setIsUserMenuOpen(false)}
                          style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: '0.6rem',
                            padding: '0.55rem 1rem',
                            fontSize: '0.86rem',
                            color: 'var(--brand-primary)',
                            fontWeight: 700,
                          }}
                        >
                          <Shield size={15} />
                          Platform Administration
                        </Link>
                      )}

                      <div style={{ height: '1px', backgroundColor: 'var(--border-subtle)', margin: '0.25rem 0' }} />
                      <button
                        onClick={() => {
                          setIsUserMenuOpen(false);
                          logout();
                        }}
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: '0.6rem',
                          padding: '0.55rem 1rem',
                          fontSize: '0.86rem',
                          color: 'var(--status-danger)',
                          width: '100%',
                          textAlign: 'left',
                        }}
                      >
                        <LogOut size={15} />
                        Sign Out
                      </button>
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <Button
                variant="primary"
                size="sm"
                onClick={() => setIsAuthModalOpen(true)}
                style={{
                  fontWeight: 700,
                  padding: '0.45rem 1rem',
                  borderRadius: 'var(--radius-sm)',
                  backgroundColor: 'var(--brand-primary)',
                }}
              >
                Sign In / Register
              </Button>
            )}

            {/* Mobile Hamburger Button */}
            <button
              onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
              className="navbar-mobile-toggle"
              style={{
                display: 'none',
                padding: '0.4rem',
                color: 'var(--text-primary)',
              }}
              aria-label="Toggle navigation menu"
            >
              {isMobileMenuOpen ? <X size={24} /> : <Menu size={24} />}
            </button>
          </div>
        </div>

        {/* Mobile Navigation Drawer */}
        {isMobileMenuOpen && (
          <div
            style={{
              backgroundColor: '#FFFFFF',
              borderTop: '1px solid var(--border-subtle)',
              padding: '1rem 1.25rem 1.5rem',
              display: 'flex',
              flexDirection: 'column',
              gap: '0.85rem',
            }}
            className="navbar-mobile-drawer"
          >
            <Link
              to="/events"
              onClick={() => setIsMobileMenuOpen(false)}
              style={{ fontSize: '0.95rem', fontWeight: 600, color: 'var(--text-primary)', padding: '0.4rem 0' }}
            >
              Explore Events
            </Link>
            <Link
              to="/events?category=CONCERT"
              onClick={() => setIsMobileMenuOpen(false)}
              style={{ fontSize: '0.95rem', fontWeight: 600, color: 'var(--text-primary)', padding: '0.4rem 0' }}
            >
              Concerts & Music
            </Link>
            <Link
              to="/events?category=COMEDY"
              onClick={() => setIsMobileMenuOpen(false)}
              style={{ fontSize: '0.95rem', fontWeight: 600, color: 'var(--text-primary)', padding: '0.4rem 0' }}
            >
              Stand-Up Comedy
            </Link>
            <Link
              to="/events?category=SPORTS"
              onClick={() => setIsMobileMenuOpen(false)}
              style={{ fontSize: '0.95rem', fontWeight: 600, color: 'var(--text-primary)', padding: '0.4rem 0' }}
            >
              Sports & Stadium
            </Link>
            <Link
              to="/resale"
              onClick={() => setIsMobileMenuOpen(false)}
              style={{ fontSize: '0.95rem', fontWeight: 600, color: 'var(--text-primary)', padding: '0.4rem 0' }}
            >
              Verified Fan Resale
            </Link>

            {user ? (
              <>
                <div style={{ height: '1px', backgroundColor: 'var(--border-subtle)', margin: '0.25rem 0' }} />
                <Link
                  to="/my-tickets"
                  onClick={() => setIsMobileMenuOpen(false)}
                  style={{ fontSize: '0.95rem', fontWeight: 600, color: 'var(--text-primary)', padding: '0.4rem 0' }}
                >
                  My Tickets Wallet
                </Link>
                <Link
                  to="/my-orders"
                  onClick={() => setIsMobileMenuOpen(false)}
                  style={{ fontSize: '0.95rem', fontWeight: 600, color: 'var(--text-primary)', padding: '0.4rem 0' }}
                >
                  My Order History
                </Link>
                {(user.role === 'ORGANIZER' || user.role === 'PLATFORM_ADMIN') && (
                  <Link
                    to="/organizer"
                    onClick={() => setIsMobileMenuOpen(false)}
                    style={{ fontSize: '0.95rem', fontWeight: 700, color: 'var(--brand-primary)', padding: '0.4rem 0' }}
                  >
                    Organizer Studio Workspace
                  </Link>
                )}
                {user.role === 'PLATFORM_ADMIN' && (
                  <Link
                    to="/admin"
                    onClick={() => setIsMobileMenuOpen(false)}
                    style={{ fontSize: '0.95rem', fontWeight: 700, color: 'var(--brand-primary)', padding: '0.4rem 0' }}
                  >
                    Platform Administration
                  </Link>
                )}
                <button
                  onClick={() => {
                    setIsMobileMenuOpen(false);
                    logout();
                  }}
                  style={{
                    fontSize: '0.95rem',
                    fontWeight: 600,
                    color: 'var(--status-danger)',
                    textAlign: 'left',
                    padding: '0.4rem 0',
                  }}
                >
                  Sign Out
                </button>
              </>
            ) : (
              <Button
                variant="primary"
                onClick={() => {
                  setIsMobileMenuOpen(false);
                  setIsAuthModalOpen(true);
                }}
                style={{ width: '100%', marginTop: '0.5rem', backgroundColor: 'var(--brand-primary)' }}
              >
                Sign In / Register
              </Button>
            )}
          </div>
        )}
      </header>

      {/* Responsive Header CSS Rules */}
      <style>{`
        @media (max-width: 1024px) {
          .navbar-desktop-categories {
            display: none !important;
          }
          .navbar-mobile-toggle {
            display: flex !important;
          }
          .navbar-organize-cta {
            display: none !important;
          }
        }
        @media (max-width: 640px) {
          .navbar-customer-quicklinks {
            display: none !important;
          }
          .navbar-organizer-badge {
            display: none !important;
          }
        }
      `}</style>

      {/* Global Authentication Modal */}
      <AuthModal isOpen={isAuthModalOpen} onClose={() => setIsAuthModalOpen(false)} />
    </>
  );
};
