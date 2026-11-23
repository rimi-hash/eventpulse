import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { Button } from '../components/ui/Button';
import { Card } from '../components/ui/Card';
import { Badge } from '../components/ui/Badge';
import { AuthModal } from '../components/auth/AuthModal';
import { OrganizerOnboardingWizard } from '../components/organizer/OrganizerOnboardingWizard';
import {
  Sparkles,
  ArrowRight,
  ShieldCheck,
  Compass,
  Zap,
  Tag,
  QrCode,
  FileSpreadsheet,
  CheckCircle2,
} from 'lucide-react';

export const OrganizerIntroPage: React.FC = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [showAuthModal, setShowAuthModal] = useState(false);
  const [showWizard, setShowWizard] = useState(false);

  useEffect(() => {
    if (user?.role === 'ORGANIZER' || user?.role === 'PLATFORM_ADMIN') {
      navigate('/organizer', { replace: true });
    }
  }, [user, navigate]);

  const handleStartOnboarding = () => {
    if (!user) {
      setShowAuthModal(true);
    } else if (user.role === 'ORGANIZER' || user.role === 'PLATFORM_ADMIN') {
      navigate('/organizer');
    } else {
      setShowWizard(true);
    }
  };

  return (
    <div style={{ backgroundColor: 'var(--bg-primary)', minHeight: '100vh', paddingBottom: '5rem' }}>
      {/* Hero Section */}
      <section
        style={{
          borderBottom: '1px solid var(--border-subtle)',
          backgroundColor: '#ffffff',
          padding: '4.5rem 0 4rem',
          textAlign: 'center',
        }}
      >
        <div className="container" style={{ maxWidth: '900px' }}>
          <div style={{ display: 'inline-flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1.25rem' }}>
            <Badge variant="info">
              <Sparkles size={13} style={{ marginRight: '0.35rem' }} />
              EventPulse for Creators &amp; Promoters
            </Badge>
          </div>

          <h1
            style={{
              fontFamily: 'var(--font-display)',
              fontSize: 'clamp(2.4rem, 5vw, 3.8rem)',
              fontWeight: 800,
              color: 'var(--text-primary)',
              lineHeight: 1.15,
              letterSpacing: '-0.03em',
              marginBottom: '1.25rem',
            }}
          >
            Power Your Live Events with <br />
            <span style={{ color: 'var(--brand-primary)' }}>Enterprise Simplicity</span>
          </h1>

          <p
            style={{
              fontSize: '1.15rem',
              color: 'var(--text-secondary)',
              maxWidth: '700px',
              margin: '0 auto 2.5rem',
              lineHeight: 1.6,
            }}
          >
            Publish events in minutes, design custom vector seating geometry, issue cryptographic
            tickets, launch scoped promotional campaigns, and run effortless gate check-ins.
          </p>

          <div style={{ display: 'flex', justifyContent: 'center', gap: '1rem', flexWrap: 'wrap' }}>
            <Button size="lg" variant="primary" onClick={handleStartOnboarding}>
              {user?.role === 'ORGANIZER' || user?.role === 'PLATFORM_ADMIN' ? 'Go to Organizer Studio' : 'Become an Organizer'}
              <ArrowRight size={18} />
            </Button>
            <Button size="lg" variant="secondary" onClick={() => navigate('/')}>
              Explore Live Events
            </Button>
          </div>

          <div
            style={{
              display: 'flex',
              justifyContent: 'center',
              gap: '2.5rem',
              marginTop: '3rem',
              fontSize: '0.85rem',
              color: 'var(--text-muted)',
              flexWrap: 'wrap',
            }}
          >
            <span style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
              <CheckCircle2 size={16} color="var(--status-success)" /> Verified business accreditation
            </span>
            <span style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
              <CheckCircle2 size={16} color="var(--status-success)" /> Zero setup fees
            </span>
            <span style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
              <CheckCircle2 size={16} color="var(--status-success)" /> Automated payouts
            </span>
          </div>
        </div>
      </section>

      {/* Feature Capabilities Grid */}
      <section className="container" style={{ paddingTop: '4rem' }}>
        <div style={{ textAlign: 'center', marginBottom: '3.5rem' }}>
          <h2
            style={{
              fontSize: '2rem',
              fontWeight: 800,
              color: 'var(--text-primary)',
              letterSpacing: '-0.02em',
              marginBottom: '0.75rem',
            }}
          >
            Everything You Need to Run World-Class Events
          </h2>
          <p style={{ color: 'var(--text-secondary)', fontSize: '1.05rem', maxWidth: '620px', margin: '0 auto' }}>
            Built for independent producers, major promoter collectives, corporate conferences, and cultural spaces.
          </p>
        </div>

        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))',
            gap: '1.75rem',
          }}
        >
          {/* Feature 1 */}
          <Card>
            <div
              style={{
                width: '46px',
                height: '46px',
                borderRadius: 'var(--radius-md)',
                backgroundColor: 'var(--brand-subtle)',
                color: 'var(--brand-primary)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                marginBottom: '1.25rem',
              }}
            >
              <Compass size={24} />
            </div>
            <h3 style={{ fontSize: '1.2rem', fontWeight: 700, color: 'var(--text-primary)', marginBottom: '0.5rem' }}>
              Custom Interactive Venue Studio
            </h3>
            <p style={{ color: 'var(--text-secondary)', fontSize: '0.95rem', lineHeight: 1.55 }}>
              Move beyond basic rows and columns. Design stadium arcs, curved tiers, banquet tables with radial chairs,
              and standing floor zones with multi-level undo/redo and live price tier overrides.
            </p>
          </Card>

          {/* Feature 2 */}
          <Card>
            <div
              style={{
                width: '46px',
                height: '46px',
                borderRadius: 'var(--radius-md)',
                backgroundColor: 'var(--brand-subtle)',
                color: 'var(--brand-primary)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                marginBottom: '1.25rem',
              }}
            >
              <Zap size={24} />
            </div>
            <h3 style={{ fontSize: '1.2rem', fontWeight: 700, color: 'var(--text-primary)', marginBottom: '0.5rem' }}>
              Zero-Overselling Cart Engine
            </h3>
            <p style={{ color: 'var(--text-secondary)', fontSize: '0.95rem', lineHeight: 1.55 }}>
              Redis distributed concurrency locks provide 10-minute atomic seat holds during peak drop traffic,
              guaranteeing zero double-bookings with instant checkout settlement.
            </p>
          </Card>

          {/* Feature 3 */}
          <Card>
            <div
              style={{
                width: '46px',
                height: '46px',
                borderRadius: 'var(--radius-md)',
                backgroundColor: 'var(--brand-subtle)',
                color: 'var(--brand-primary)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                marginBottom: '1.25rem',
              }}
            >
              <Tag size={24} />
            </div>
            <h3 style={{ fontSize: '1.2rem', fontWeight: 700, color: 'var(--text-primary)', marginBottom: '0.5rem' }}>
              Event-Scoped Promotions
            </h3>
            <p style={{ color: 'var(--text-secondary)', fontSize: '0.95rem', lineHeight: 1.55 }}>
              Target promotional codes exclusively to selected events. Configure percentage caps, minimum order values,
              and per-user redemption limits with complete cross-event isolation.
            </p>
          </Card>

          {/* Feature 4 */}
          <Card>
            <div
              style={{
                width: '46px',
                height: '46px',
                borderRadius: 'var(--radius-md)',
                backgroundColor: 'var(--brand-subtle)',
                color: 'var(--brand-primary)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                marginBottom: '1.25rem',
              }}
            >
              <QrCode size={24} />
            </div>
            <h3 style={{ fontSize: '1.2rem', fontWeight: 700, color: 'var(--text-primary)', marginBottom: '0.5rem' }}>
              Hardware-Free Gate Check-In
            </h3>
            <p style={{ color: 'var(--text-secondary)', fontSize: '0.95rem', lineHeight: 1.55 }}>
              Equip door staff with any smartphone browser camera. Scans dynamic SHA-256 rotating QR tokens,
              detects duplicates instantly, and logs every entry by gate and terminal.
            </p>
          </Card>

          {/* Feature 5 */}
          <Card>
            <div
              style={{
                width: '46px',
                height: '46px',
                borderRadius: 'var(--radius-md)',
                backgroundColor: 'var(--brand-subtle)',
                color: 'var(--brand-primary)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                marginBottom: '1.25rem',
              }}
            >
              <ShieldCheck size={24} />
            </div>
            <h3 style={{ fontSize: '1.2rem', fontWeight: 700, color: 'var(--text-primary)', marginBottom: '0.5rem' }}>
              Verified Fan Resale Marketplace
            </h3>
            <p style={{ color: 'var(--text-secondary)', fontSize: '0.95rem', lineHeight: 1.55 }}>
              Keep ticket pricing honest with automated anti-scalping price caps. Buyer confirmations trigger atomic
              ownership transfer and immediate cryptographic QR rotation.
            </p>
          </Card>

          {/* Feature 6 */}
          <Card>
            <div
              style={{
                width: '46px',
                height: '46px',
                borderRadius: 'var(--radius-md)',
                backgroundColor: 'var(--brand-subtle)',
                color: 'var(--brand-primary)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                marginBottom: '1.25rem',
              }}
            >
              <FileSpreadsheet size={24} />
            </div>
            <h3 style={{ fontSize: '1.2rem', fontWeight: 700, color: 'var(--text-primary)', marginBottom: '0.5rem' }}>
              RFC 4180 CSV Reports &amp; Exports
            </h3>
            <p style={{ color: 'var(--text-secondary)', fontSize: '0.95rem', lineHeight: 1.55 }}>
              Download attendee manifests, ticket tiers, coupon redemptions, and settlement logs formatted for Excel and
              Google Sheets with built-in CSV formula injection protection.
            </p>
          </Card>
        </div>
      </section>

      {/* Guided 5-Step Process Explainer */}
      <section className="container" style={{ paddingTop: '5rem' }}>
        <div
          style={{
            backgroundColor: '#ffffff',
            borderRadius: 'var(--radius-xl)',
            border: '1px solid var(--border-subtle)',
            padding: '3rem',
            boxShadow: 'var(--shadow-sm)',
          }}
        >
          <div style={{ textAlign: 'center', marginBottom: '3rem' }}>
            <Badge variant="neutral">Simple &amp; Transparent</Badge>
            <h2 style={{ fontSize: '1.85rem', fontWeight: 800, color: 'var(--text-primary)', marginTop: '0.75rem' }}>
              How Organizer Onboarding Works
            </h2>
          </div>

          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
              gap: '2rem',
              textAlign: 'center',
            }}
          >
            <div>
              <div
                style={{
                  width: '40px',
                  height: '40px',
                  borderRadius: '50%',
                  backgroundColor: 'var(--brand-primary)',
                  color: '#ffffff',
                  fontWeight: 700,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  margin: '0 auto 1rem',
                }}
              >
                1
              </div>
              <h4 style={{ fontWeight: 700, color: 'var(--text-primary)', marginBottom: '0.35rem' }}>Account</h4>
              <p style={{ color: 'var(--text-secondary)', fontSize: '0.88rem' }}>
                Sign in with existing credentials or Google OAuth SSO.
              </p>
            </div>

            <div>
              <div
                style={{
                  width: '40px',
                  height: '40px',
                  borderRadius: '50%',
                  backgroundColor: 'var(--brand-primary)',
                  color: '#ffffff',
                  fontWeight: 700,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  margin: '0 auto 1rem',
                }}
              >
                2
              </div>
              <h4 style={{ fontWeight: 700, color: 'var(--text-primary)', marginBottom: '0.35rem' }}>Brand Identity</h4>
              <p style={{ color: 'var(--text-secondary)', fontSize: '0.88rem' }}>
                Establish your organizer name, type, bio, and logo.
              </p>
            </div>

            <div>
              <div
                style={{
                  width: '40px',
                  height: '40px',
                  borderRadius: '50%',
                  backgroundColor: 'var(--brand-primary)',
                  color: '#ffffff',
                  fontWeight: 700,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  margin: '0 auto 1rem',
                }}
              >
                3
              </div>
              <h4 style={{ fontWeight: 700, color: 'var(--text-primary)', marginBottom: '0.35rem' }}>Contact Info</h4>
              <p style={{ color: 'var(--text-secondary)', fontSize: '0.88rem' }}>
                Provide verified business email, phone, and location.
              </p>
            </div>

            <div>
              <div
                style={{
                  width: '40px',
                  height: '40px',
                  borderRadius: '50%',
                  backgroundColor: 'var(--brand-primary)',
                  color: '#ffffff',
                  fontWeight: 700,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  margin: '0 auto 1rem',
                }}
              >
                4
              </div>
              <h4 style={{ fontWeight: 700, color: 'var(--text-primary)', marginBottom: '0.35rem' }}>Event Profile</h4>
              <p style={{ color: 'var(--text-secondary)', fontSize: '0.88rem' }}>
                Tailor your layout preferences and operational features.
              </p>
            </div>

            <div>
              <div
                style={{
                  width: '40px',
                  height: '40px',
                  borderRadius: '50%',
                  backgroundColor: 'var(--brand-primary)',
                  color: '#ffffff',
                  fontWeight: 700,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  margin: '0 auto 1rem',
                }}
              >
                5
              </div>
              <h4 style={{ fontWeight: 700, color: 'var(--text-primary)', marginBottom: '0.35rem' }}>Verification</h4>
              <p style={{ color: 'var(--text-secondary)', fontSize: '0.88rem' }}>
                Verify tax identifier and configure payout readiness.
              </p>
            </div>
          </div>

          <div style={{ textAlign: 'center', marginTop: '3rem' }}>
            <Button size="lg" variant="primary" onClick={handleStartOnboarding}>
              {user?.role === 'ORGANIZER' || user?.role === 'PLATFORM_ADMIN' ? 'Go to Organizer Studio' : 'Start Organizer Application'}
              <ArrowRight size={18} />
            </Button>
          </div>
        </div>
      </section>

      {/* Onboarding Wizard Modal */}
      {showWizard && (
        <OrganizerOnboardingWizard
          isOpen={showWizard}
          onClose={() => setShowWizard(false)}
          onSuccess={() => {
            setShowWizard(false);
            navigate('/organizer');
          }}
        />
      )}

      {/* Authentication Modal */}
      <AuthModal
        isOpen={showAuthModal}
        onClose={() => setShowAuthModal(false)}
        initialMode="REGISTER"
      />
    </div>
  );
};
