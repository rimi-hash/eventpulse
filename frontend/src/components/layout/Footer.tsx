import React from 'react';
import { Link } from 'react-router-dom';
import { ShieldCheck, MapPin, Lock, Sparkles, CheckCircle2 } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';

export const Footer: React.FC = () => {
  const { user } = useAuth();

  return (
    <footer
      style={{
        borderTop: '1px solid var(--border-subtle)',
        backgroundColor: '#FFFFFF',
        padding: '3.5rem 0 2rem',
        marginTop: 'auto',
      }}
    >
      <div className="container">
        {/* Trust & Guarantee Banner */}
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))',
            gap: '1.5rem',
            padding: '1.25rem 1.5rem',
            backgroundColor: 'var(--brand-subtle)',
            border: '1px solid var(--brand-border-subtle)',
            borderRadius: 'var(--radius-md)',
            marginBottom: '3rem',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            <div style={{ padding: '0.4rem', backgroundColor: '#FFFFFF', borderRadius: 'var(--radius-sm)', color: 'var(--brand-primary)', display: 'flex' }}>
              <ShieldCheck size={20} />
            </div>
            <div>
              <div style={{ fontSize: '0.86rem', fontWeight: 700, color: 'var(--text-primary)' }}>100% Buyer Guarantee</div>
              <div style={{ fontSize: '0.78rem', color: 'var(--text-secondary)' }}>Every ticket verified authentic & gate-ready</div>
            </div>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            <div style={{ padding: '0.4rem', backgroundColor: '#FFFFFF', borderRadius: 'var(--radius-sm)', color: 'var(--brand-primary)', display: 'flex' }}>
              <Lock size={20} />
            </div>
            <div>
              <div style={{ fontSize: '0.86rem', fontWeight: 700, color: 'var(--text-primary)' }}>Secure Checkout</div>
              <div style={{ fontSize: '0.78rem', color: 'var(--text-secondary)' }}>256-bit bank-grade payment encryption</div>
            </div>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            <div style={{ padding: '0.4rem', backgroundColor: '#FFFFFF', borderRadius: 'var(--radius-sm)', color: 'var(--brand-primary)', display: 'flex' }}>
              <Sparkles size={20} />
            </div>
            <div>
              <div style={{ fontSize: '0.86rem', fontWeight: 700, color: 'var(--text-primary)' }}>Anti-Scalping Resale</div>
              <div style={{ fontSize: '0.78rem', color: 'var(--text-secondary)' }}>Fan resale capped strictly at face value</div>
            </div>
          </div>
        </div>

        {/* 4-Column Navigation Layout */}
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
            gap: '2.5rem',
            marginBottom: '3rem',
          }}
        >
          {/* Brand Info */}
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', marginBottom: '0.85rem' }}>
              <img
                src="/eventpulse-logo.jpg"
                alt="EventPulse Logo"
                style={{
                  width: '32px',
                  height: '32px',
                  borderRadius: '6px',
                  objectFit: 'cover',
                }}
              />
              <span style={{ fontFamily: 'var(--font-display)', fontSize: '1.25rem', fontWeight: 800, color: 'var(--text-primary)' }}>
                Event<span style={{ color: 'var(--brand-primary)' }}>Pulse</span>
              </span>
            </div>
            <p style={{ fontSize: '0.86rem', color: 'var(--text-secondary)', lineHeight: 1.6, marginBottom: '1rem' }}>
              The high-performance live event ticketing platform. Designed for high-concurrency ticket drops, assigned vector seating, and trusted admissions.
            </p>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', fontSize: '0.82rem', color: 'var(--status-success-text)', fontWeight: 600 }}>
              <CheckCircle2 size={16} color="var(--status-success)" />
              <span>System Status: All Services Operational</span>
            </div>
          </div>

          {/* Event Categories */}
          <div>
            <h4 style={{ fontSize: '0.85rem', fontWeight: 700, color: 'var(--text-primary)', marginBottom: '1rem', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
              Event Categories
            </h4>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.55rem', fontSize: '0.88rem', color: 'var(--text-secondary)' }}>
              <Link to="/events?category=CONCERT" style={{ transition: 'color var(--transition-fast)' }}>Concerts & Live Music</Link>
              <Link to="/events?category=COMEDY" style={{ transition: 'color var(--transition-fast)' }}>Stand-Up Comedy</Link>
              <Link to="/events?category=SPORTS" style={{ transition: 'color var(--transition-fast)' }}>Stadium & Sports</Link>
              <Link to="/events?category=THEATRE" style={{ transition: 'color var(--transition-fast)' }}>Theatre & Performing Arts</Link>
              <Link to="/resale" style={{ transition: 'color var(--transition-fast)' }}>Verified Fan Resale Hub</Link>
            </div>
          </div>

          {/* Featured Cities */}
          <div>
            <h4 style={{ fontSize: '0.85rem', fontWeight: 700, color: 'var(--text-primary)', marginBottom: '1rem', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
              Top Event Hubs
            </h4>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.55rem', fontSize: '0.88rem', color: 'var(--text-secondary)' }}>
              <Link to="/events?city=Chennai" style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                <MapPin size={14} color="var(--brand-primary)" /> Chennai (Catalogue Focus)
              </Link>
              <Link to="/events?city=Bengaluru" style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                <MapPin size={14} color="var(--brand-primary)" /> Bengaluru
              </Link>
              <Link to="/events?city=Mumbai" style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                <MapPin size={14} color="var(--brand-primary)" /> Mumbai
              </Link>
              <Link to="/events?city=Coimbatore" style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                <MapPin size={14} color="var(--brand-primary)" /> Coimbatore
              </Link>
            </div>
          </div>

          {/* Organizer & Platform */}
          <div>
            <h4 style={{ fontSize: '0.85rem', fontWeight: 700, color: 'var(--text-primary)', marginBottom: '1rem', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
              Organizer Solutions
            </h4>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.55rem', fontSize: '0.88rem', color: 'var(--text-secondary)' }}>
              <Link to="/organizer/apply">Become an Organizer</Link>
              <Link to="/organizer">Organizer Studio</Link>
              <Link to="/venue-studio">Venue Architect Studio</Link>
              <Link to="/scanner">Gate Admissions Scanner</Link>
              {user?.role === 'PLATFORM_ADMIN' && <Link to="/admin" style={{ color: 'var(--brand-primary)', fontWeight: 600 }}>Platform Administration</Link>}
            </div>
          </div>
        </div>

        {/* Bottom Bar */}
        <div
          style={{
            paddingTop: '1.5rem',
            borderTop: '1px solid var(--border-subtle)',
            display: 'flex',
            flexWrap: 'wrap',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: '1rem',
            fontSize: '0.8rem',
            color: 'var(--text-secondary)',
          }}
        >
          <div>
            © {new Date().getFullYear()} EventPulse Technologies Inc. All rights reserved.
          </div>
          <div style={{ display: 'flex', gap: '1.25rem' }}>
            <span>Privacy Policy</span>
            <span>Terms of Service</span>
            <span>Security Guarantee</span>
            <span>Ticket Purchase Agreement</span>
          </div>
        </div>
      </div>
    </footer>
  );
};
