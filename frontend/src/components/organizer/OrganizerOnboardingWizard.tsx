import React, { useState } from 'react';
import { OrganizationDto } from '../../types/api';
import { apiClient } from '../../services/apiClient';
import { useAuth } from '../../context/AuthContext';
import { Button } from '../ui/Button';
import { Badge } from '../ui/Badge';
import {
  Building2,
  Mail,
  Sliders,
  FileCheck2,
  CreditCard,
  CheckCircle2,
  ArrowRight,
  ArrowLeft,
  X,
  ShieldCheck,
  AlertCircle,
  CalendarPlus,
  Compass,
  Ticket,
} from 'lucide-react';

interface OrganizerOnboardingWizardProps {
  currentOrg?: OrganizationDto | null;
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: () => void;
  onComplete?: (org: OrganizationDto) => void;
}

export const OrganizerOnboardingWizard: React.FC<OrganizerOnboardingWizardProps> = ({
  currentOrg,
  isOpen,
  onClose,
  onSuccess,
  onComplete,
}) => {
  const { refreshUserProfile } = useAuth();
  const [currentStep, setCurrentStep] = useState<number>(1);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [submittedOrg, setSubmittedOrg] = useState<OrganizationDto | null>(null);

  // Step 1: Identity
  const [name, setName] = useState(currentOrg?.name || '');
  const [organizationType, setOrganizationType] = useState(currentOrg?.organizationType || 'COMPANY');
  const [description, setDescription] = useState(currentOrg?.description || '');
  const [website, setWebsite] = useState(currentOrg?.website || currentOrg?.websiteUrl || '');
  const [logoUrl, setLogoUrl] = useState(currentOrg?.logoUrl || '');

  // Step 2: Contact Details
  const [contactName, setContactName] = useState('Lead Event Producer');
  const [contactEmail, setContactEmail] = useState(currentOrg?.contactEmail || currentOrg?.billingEmail || '');
  const [contactPhone, setContactPhone] = useState(currentOrg?.contactPhone || '');
  const [businessAddress, setBusinessAddress] = useState(currentOrg?.businessAddress || '');
  const [preferredContact, setPreferredContact] = useState('EMAIL');

  // Step 3: Event Profile
  const [eventCategories, setEventCategories] = useState('Concerts, Tech Conferences');
  const [typicalCapacity, setTypicalCapacity] = useState('500 - 2,500');
  const [eventFrequency, setEventFrequency] = useState('Monthly');
  const [seatingPreference, setSeatingPreference] = useState('HYBRID');
  const [needsResale, setNeedsResale] = useState(true);
  const [needsCoupons, setNeedsCoupons] = useState(true);
  const [needsGateScanner, setNeedsGateScanner] = useState(true);

  // Step 4: Business Verification
  const [taxIdentifier, setTaxIdentifier] = useState(currentOrg?.taxIdentifier || '');
  const [verificationAgreed, setVerificationAgreed] = useState(true);

  // Step 5: Payout Readiness
  const [bankAccount, setBankAccount] = useState('**** **** **** 8821');
  const [bankIfsc, setBankIfsc] = useState('HDFC0001234');
  const [payoutProvider, setPayoutProvider] = useState(currentOrg?.payoutProvider || 'RAZORPAY_ROUTE');

  if (!isOpen) return null;

  const handleNext = () => {
    setError(null);
    if (currentStep === 1) {
      if (!name.trim()) {
        setError('Please enter your public organization or brand name');
        return;
      }
    }
    if (currentStep === 2) {
      if (!contactEmail.trim() || !contactPhone.trim()) {
        setError('Please provide business email and contact phone number');
        return;
      }
    }
    if (currentStep === 4) {
      if (!taxIdentifier.trim()) {
        setError('Please provide business tax identifier / GSTIN (e.g. 33AAAAA0000A1Z5)');
        return;
      }
    }
    setCurrentStep((prev) => prev + 1);
  };

  const handlePrev = () => {
    setError(null);
    setCurrentStep((prev) => Math.max(1, prev - 1));
  };

  const handleSubmit = async () => {
    setLoading(true);
    setError(null);

    const operatingProfileObj = {
      contactName,
      preferredContact,
      eventCategories,
      typicalCapacity,
      eventFrequency,
      seatingPreference,
      needsResale,
      needsCoupons,
      needsGateScanner,
      bankAccountPreview: bankAccount,
      bankIfsc,
    };

    const payload = {
      name: name.trim(),
      organizationType,
      description: description.trim(),
      website: website.trim(),
      websiteUrl: website.trim(),
      logoUrl: logoUrl.trim(),
      contactEmail: contactEmail.trim(),
      contactPhone: contactPhone.trim(),
      businessAddress: businessAddress.trim(),
      taxIdentifier: taxIdentifier.trim(),
      operatingProfile: JSON.stringify(operatingProfileObj),
      payoutProvider,
      payoutStatus: 'READY',
      billingEmail: contactEmail.trim(),
    };

    try {
      let res: { data: OrganizationDto };
      if (currentOrg?.id) {
        res = await apiClient.put<OrganizationDto>('/organizer/organization/me', payload);
      } else {
        res = await apiClient.post<OrganizationDto>('/organizer/organization/apply', payload);
      }
      setSubmittedOrg(res.data);
      if (onComplete) onComplete(res.data);
      try {
        const rawUser = localStorage.getItem('eventpulse_user');
        if (rawUser) {
          const parsed = JSON.parse(rawUser);
          parsed.role = 'ORGANIZER';
          localStorage.setItem('eventpulse_user', JSON.stringify(parsed));
        }
        await refreshUserProfile();
      } catch (e) {
        console.warn('Profile refresh error', e);
      }
      // Advance to Step 6 (Welcome & Checklist)
      setCurrentStep(6);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to submit organizer profile');
    } finally {
      setLoading(false);
    }
  };

  const handleFinish = async () => {
    try {
      await refreshUserProfile();
    } catch (e) {}
    onClose();
    if (onSuccess) onSuccess();
  };

  const STEPS = [
    { num: 1, title: 'Identity', icon: Building2 },
    { num: 2, title: 'Contact', icon: Mail },
    { num: 3, title: 'Event Profile', icon: Sliders },
    { num: 4, title: 'Verification', icon: FileCheck2 },
    { num: 5, title: 'Payouts', icon: CreditCard },
  ];

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 100,
        backgroundColor: 'rgba(15, 23, 42, 0.45)',
        backdropFilter: 'blur(6px)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '1.5rem',
      }}
    >
      <div
        style={{
          width: '100%',
          maxWidth: '680px',
          backgroundColor: '#ffffff',
          border: '1px solid var(--border-subtle)',
          borderRadius: 'var(--radius-xl)',
          boxShadow: 'var(--shadow-xl)',
          overflow: 'hidden',
          display: 'flex',
          flexDirection: 'column',
          maxHeight: '90vh',
        }}
      >
        {/* Header */}
        <div
          style={{
            padding: '1.25rem 1.75rem',
            borderBottom: '1px solid var(--border-subtle)',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            backgroundColor: '#ffffff',
          }}
        >
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <h3 style={{ fontSize: '1.2rem', fontWeight: 800, color: 'var(--text-primary)', margin: 0 }}>
                {currentStep === 6 ? 'Welcome to EventPulse Studio' : 'Organizer Onboarding & Verification'}
              </h3>
              {currentStep < 6 && <Badge variant="info">Step {currentStep} of 5</Badge>}
            </div>
            <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', margin: '0.2rem 0 0' }}>
              {currentStep === 6
                ? 'Your organizer profile is active and ready for event production.'
                : 'Establish your trusted event brand, contact channels, and payout readiness.'}
            </p>
          </div>
          <button
            onClick={onClose}
            style={{
              background: 'transparent',
              border: 'none',
              color: 'var(--text-muted)',
              cursor: 'pointer',
              padding: '0.35rem',
              borderRadius: 'var(--radius-sm)',
            }}
          >
            <X size={20} />
          </button>
        </div>

        {/* Step Indicator (Steps 1-5) */}
        {currentStep < 6 && (
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              padding: '0.75rem 1.75rem',
              backgroundColor: 'var(--bg-secondary)',
              borderBottom: '1px solid var(--border-subtle)',
            }}
          >
            {STEPS.map((s) => {
              const isPast = currentStep > s.num;
              const isCurrent = currentStep === s.num;
              return (
                <div
                  key={s.num}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.4rem',
                    color: isCurrent
                      ? 'var(--brand-primary)'
                      : isPast
                      ? 'var(--status-success)'
                      : 'var(--text-muted)',
                    fontWeight: isCurrent ? 700 : 500,
                    fontSize: '0.8rem',
                  }}
                >
                  <div
                    style={{
                      width: '24px',
                      height: '24px',
                      borderRadius: '50%',
                      backgroundColor: isCurrent
                        ? 'var(--brand-primary)'
                        : isPast
                        ? 'var(--status-success-bg)'
                        : '#ffffff',
                      color: isCurrent
                        ? '#ffffff'
                        : isPast
                        ? 'var(--status-success)'
                        : 'var(--text-muted)',
                      border: `1px solid ${
                        isCurrent
                          ? 'var(--brand-primary)'
                          : isPast
                          ? 'var(--status-success-border)'
                          : 'var(--border-medium)'
                      }`,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontSize: '0.75rem',
                      fontWeight: 700,
                    }}
                  >
                    {isPast ? <CheckCircle2 size={14} /> : s.num}
                  </div>
                  <span className="step-label" style={{ display: isCurrent ? 'inline' : 'none' }}>
                    {s.title}
                  </span>
                </div>
              );
            })}
          </div>
        )}

        {/* Content Body */}
        <div style={{ padding: '1.75rem', overflowY: 'auto', flex: 1 }}>
          {error && (
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '0.5rem',
                backgroundColor: 'var(--status-danger-bg)',
                border: '1px solid var(--status-danger-border)',
                color: 'var(--status-danger)',
                padding: '0.75rem 1rem',
                borderRadius: 'var(--radius-md)',
                marginBottom: '1.25rem',
                fontSize: '0.9rem',
              }}
            >
              <AlertCircle size={18} />
              <span>{error}</span>
            </div>
          )}

          {/* STEP 1: IDENTITY */}
          {currentStep === 1 && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
              <div>
                <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: 600, color: 'var(--text-primary)', marginBottom: '0.4rem' }}>
                  Public Brand / Organization Name *
                </label>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="e.g. Apex Music Collective, Chennai Tech Summit"
                  style={{
                    width: '100%',
                    padding: '0.65rem 0.85rem',
                    borderRadius: 'var(--radius-md)',
                    border: '1px solid var(--border-medium)',
                    backgroundColor: '#ffffff',
                    fontSize: '0.95rem',
                  }}
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: 600, color: 'var(--text-primary)', marginBottom: '0.4rem' }}>
                  Organization Type
                </label>
                <select
                  value={organizationType}
                  onChange={(e) => setOrganizationType(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '0.65rem 0.85rem',
                    borderRadius: 'var(--radius-md)',
                    border: '1px solid var(--border-medium)',
                    backgroundColor: '#ffffff',
                    fontSize: '0.95rem',
                  }}
                >
                  <option value="COMPANY">Registered Private Company</option>
                  <option value="ENTERPRISE">Live Entertainment Promoter</option>
                  <option value="VENUE">Venue Operator / Stadium</option>
                  <option value="INDEPENDENT">Independent Creator / Collective</option>
                  <option value="COMMUNITY">Tech Community / Developer Group</option>
                  <option value="NON_PROFIT">Non-Profit / NGO</option>
                </select>
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: 600, color: 'var(--text-primary)', marginBottom: '0.4rem' }}>
                  Short Bio / Description
                </label>
                <textarea
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  rows={3}
                  placeholder="Tell ticket buyers about your experience, past productions, and genre focus..."
                  style={{
                    width: '100%',
                    padding: '0.65rem 0.85rem',
                    borderRadius: 'var(--radius-md)',
                    border: '1px solid var(--border-medium)',
                    backgroundColor: '#ffffff',
                    fontSize: '0.95rem',
                    resize: 'vertical',
                  }}
                />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: 600, color: 'var(--text-primary)', marginBottom: '0.4rem' }}>
                    Official Website / Social
                  </label>
                  <input
                    type="url"
                    value={website}
                    onChange={(e) => setWebsite(e.target.value)}
                    placeholder="https://yourbrand.com"
                    style={{
                      width: '100%',
                      padding: '0.65rem 0.85rem',
                      borderRadius: 'var(--radius-md)',
                      border: '1px solid var(--border-medium)',
                      backgroundColor: '#ffffff',
                      fontSize: '0.95rem',
                    }}
                  />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: 600, color: 'var(--text-primary)', marginBottom: '0.4rem' }}>
                    Brand Logo URL (Optional)
                  </label>
                  <input
                    type="url"
                    value={logoUrl}
                    onChange={(e) => setLogoUrl(e.target.value)}
                    placeholder="https://.../logo.png"
                    style={{
                      width: '100%',
                      padding: '0.65rem 0.85rem',
                      borderRadius: 'var(--radius-md)',
                      border: '1px solid var(--border-medium)',
                      backgroundColor: '#ffffff',
                      fontSize: '0.95rem',
                    }}
                  />
                </div>
              </div>
            </div>
          )}

          {/* STEP 2: CONTACT INFORMATION */}
          {currentStep === 2 && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: 600, color: 'var(--text-primary)', marginBottom: '0.4rem' }}>
                    Contact Person Name *
                  </label>
                  <input
                    type="text"
                    value={contactName}
                    onChange={(e) => setContactName(e.target.value)}
                    placeholder="e.g. Vikram Malhotra"
                    style={{
                      width: '100%',
                      padding: '0.65rem 0.85rem',
                      borderRadius: 'var(--radius-md)',
                      border: '1px solid var(--border-medium)',
                      backgroundColor: '#ffffff',
                      fontSize: '0.95rem',
                    }}
                  />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: 600, color: 'var(--text-primary)', marginBottom: '0.4rem' }}>
                    Preferred Communication
                  </label>
                  <select
                    value={preferredContact}
                    onChange={(e) => setPreferredContact(e.target.value)}
                    style={{
                      width: '100%',
                      padding: '0.65rem 0.85rem',
                      borderRadius: 'var(--radius-md)',
                      border: '1px solid var(--border-medium)',
                      backgroundColor: '#ffffff',
                      fontSize: '0.95rem',
                    }}
                  >
                    <option value="EMAIL">Business Email</option>
                    <option value="PHONE">Phone / WhatsApp</option>
                  </select>
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: 600, color: 'var(--text-primary)', marginBottom: '0.4rem' }}>
                    Business Email *
                  </label>
                  <input
                    type="email"
                    value={contactEmail}
                    onChange={(e) => setContactEmail(e.target.value)}
                    placeholder="producers@yourbrand.com"
                    style={{
                      width: '100%',
                      padding: '0.65rem 0.85rem',
                      borderRadius: 'var(--radius-md)',
                      border: '1px solid var(--border-medium)',
                      backgroundColor: '#ffffff',
                      fontSize: '0.95rem',
                    }}
                  />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: 600, color: 'var(--text-primary)', marginBottom: '0.4rem' }}>
                    Contact Phone *
                  </label>
                  <input
                    type="tel"
                    value={contactPhone}
                    onChange={(e) => setContactPhone(e.target.value)}
                    placeholder="+91 98765 00001"
                    style={{
                      width: '100%',
                      padding: '0.65rem 0.85rem',
                      borderRadius: 'var(--radius-md)',
                      border: '1px solid var(--border-medium)',
                      backgroundColor: '#ffffff',
                      fontSize: '0.95rem',
                    }}
                  />
                </div>
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: 600, color: 'var(--text-primary)', marginBottom: '0.4rem' }}>
                  Registered Business Address
                </label>
                <input
                  type="text"
                  value={businessAddress}
                  onChange={(e) => setBusinessAddress(e.target.value)}
                  placeholder="Suite 400, Express Chambers, Royapettah, Chennai, Tamil Nadu 600014"
                  style={{
                    width: '100%',
                    padding: '0.65rem 0.85rem',
                    borderRadius: 'var(--radius-md)',
                    border: '1px solid var(--border-medium)',
                    backgroundColor: '#ffffff',
                    fontSize: '0.95rem',
                  }}
                />
              </div>
            </div>
          )}

          {/* STEP 3: EVENT PROFILE */}
          {currentStep === 3 && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: 600, color: 'var(--text-primary)', marginBottom: '0.4rem' }}>
                    Primary Event Types
                  </label>
                  <input
                    type="text"
                    value={eventCategories}
                    onChange={(e) => setEventCategories(e.target.value)}
                    placeholder="Concerts, Comedy, Conferences"
                    style={{
                      width: '100%',
                      padding: '0.65rem 0.85rem',
                      borderRadius: 'var(--radius-md)',
                      border: '1px solid var(--border-medium)',
                      backgroundColor: '#ffffff',
                      fontSize: '0.95rem',
                    }}
                  />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: 600, color: 'var(--text-primary)', marginBottom: '0.4rem' }}>
                    Typical Attendance Range
                  </label>
                  <select
                    value={typicalCapacity}
                    onChange={(e) => setTypicalCapacity(e.target.value)}
                    style={{
                      width: '100%',
                      padding: '0.65rem 0.85rem',
                      borderRadius: 'var(--radius-md)',
                      border: '1px solid var(--border-medium)',
                      backgroundColor: '#ffffff',
                      fontSize: '0.95rem',
                    }}
                  >
                    <option value="100 - 500">100 – 500 Attendees (Club / Showcase)</option>
                    <option value="500 - 2,500">500 – 2,500 Attendees (Auditorium / Hall)</option>
                    <option value="2,500 - 10,000">2,500 – 10,000 Attendees (Arena / Open Ground)</option>
                    <option value="10,000+">10,000+ Attendees (Major Stadium / Festival)</option>
                  </select>
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: 600, color: 'var(--text-primary)', marginBottom: '0.4rem' }}>
                    Seating Layout Preference
                  </label>
                  <select
                    value={seatingPreference}
                    onChange={(e) => setSeatingPreference(e.target.value)}
                    style={{
                      width: '100%',
                      padding: '0.65rem 0.85rem',
                      borderRadius: 'var(--radius-md)',
                      border: '1px solid var(--border-medium)',
                      backgroundColor: '#ffffff',
                      fontSize: '0.95rem',
                    }}
                  >
                    <option value="HYBRID">Hybrid (Reserved Seats + Standing Pit)</option>
                    <option value="RESERVED">Reserved Theater / Stadium Seating Only</option>
                    <option value="GENERAL_ADMISSION">General Admission / Standing Only</option>
                    <option value="BANQUET">Banquet Tables with Surrounding Chairs</option>
                  </select>
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: 600, color: 'var(--text-primary)', marginBottom: '0.4rem' }}>
                    Production Frequency
                  </label>
                  <select
                    value={eventFrequency}
                    onChange={(e) => setEventFrequency(e.target.value)}
                    style={{
                      width: '100%',
                      padding: '0.65rem 0.85rem',
                      borderRadius: 'var(--radius-md)',
                      border: '1px solid var(--border-medium)',
                      backgroundColor: '#ffffff',
                      fontSize: '0.95rem',
                    }}
                  >
                    <option value="Weekly">Weekly Events</option>
                    <option value="Monthly">Monthly Events</option>
                    <option value="Quarterly">Quarterly Tours &amp; Festivals</option>
                    <option value="Annual">Annual Flagship Conference</option>
                  </select>
                </div>
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: 600, color: 'var(--text-primary)', marginBottom: '0.6rem' }}>
                  Operational Feature Requirements
                </label>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                  <label style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', fontSize: '0.9rem', color: 'var(--text-secondary)' }}>
                    <input
                      type="checkbox"
                      checked={needsResale}
                      onChange={(e) => setNeedsResale(e.target.checked)}
                    />
                    Enable Fan-to-Fan Resale with price-cap protection
                  </label>
                  <label style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', fontSize: '0.9rem', color: 'var(--text-secondary)' }}>
                    <input
                      type="checkbox"
                      checked={needsCoupons}
                      onChange={(e) => setNeedsCoupons(e.target.checked)}
                    />
                    Enable Scoped Discount Promotions &amp; Partner Promo Codes
                  </label>
                  <label style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', fontSize: '0.9rem', color: 'var(--text-secondary)' }}>
                    <input
                      type="checkbox"
                      checked={needsGateScanner}
                      onChange={(e) => setNeedsGateScanner(e.target.checked)}
                    />
                    Enable Gate Staff QR Check-in Terminal Portals
                  </label>
                </div>
              </div>
            </div>
          )}

          {/* STEP 4: BUSINESS VERIFICATION */}
          {currentStep === 4 && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
              <div
                style={{
                  backgroundColor: 'var(--brand-subtle)',
                  border: '1px solid #bfdbfe',
                  borderRadius: 'var(--radius-md)',
                  padding: '1rem',
                  display: 'flex',
                  gap: '0.75rem',
                  alignItems: 'flex-start',
                }}
              >
                <ShieldCheck size={22} color="var(--brand-primary)" style={{ flexShrink: 0, marginTop: '2px' }} />
                <div style={{ fontSize: '0.88rem', color: 'var(--text-secondary)', lineHeight: 1.5 }}>
                  <strong style={{ color: 'var(--text-primary)' }}>Integrity &amp; Anti-Fraud Accreditation:</strong>
                  {' '}To publish live ticket sales and accept customer payments, EventPulse validates legal entity credentials
                  and tax compliance. Unverified organizers can draft events and design venues freely.
                </div>
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: 600, color: 'var(--text-primary)', marginBottom: '0.4rem' }}>
                  Business Tax Identifier / GSTIN *
                </label>
                <input
                  type="text"
                  value={taxIdentifier}
                  onChange={(e) => setTaxIdentifier(e.target.value.toUpperCase())}
                  placeholder="33AAAAA0000A1Z5"
                  style={{
                    width: '100%',
                    padding: '0.65rem 0.85rem',
                    borderRadius: 'var(--radius-md)',
                    border: '1px solid var(--border-medium)',
                    backgroundColor: '#ffffff',
                    fontSize: '0.95rem',
                    letterSpacing: '0.05em',
                    fontFamily: 'monospace',
                  }}
                />
              </div>

              <div>
                <label style={{ display: 'flex', alignItems: 'flex-start', gap: '0.6rem', fontSize: '0.88rem', color: 'var(--text-secondary)', cursor: 'pointer' }}>
                  <input
                    type="checkbox"
                    checked={verificationAgreed}
                    onChange={(e) => setVerificationAgreed(e.target.checked)}
                    style={{ marginTop: '3px' }}
                  />
                  <span>
                    I confirm that I am an authorized legal representative of this entity. I agree to comply with
                    EventPulse&apos;s anti-scalping policies, customer refund rules, and ticket authenticity standards.
                  </span>
                </label>
              </div>
            </div>
          )}

          {/* STEP 5: PAYOUT READINESS */}
          {currentStep === 5 && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
              <div
                style={{
                  backgroundColor: 'var(--status-success-bg)',
                  border: '1px solid var(--status-success-border)',
                  borderRadius: 'var(--radius-md)',
                  padding: '1rem',
                  display: 'flex',
                  gap: '0.75rem',
                  alignItems: 'center',
                }}
              >
                <CheckCircle2 size={20} color="var(--status-success)" />
                <span style={{ fontSize: '0.88rem', color: 'var(--status-success)', fontWeight: 600 }}>
                  Automated Settlement &amp; Next-Day Bank Payouts
                </span>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: 600, color: 'var(--text-primary)', marginBottom: '0.4rem' }}>
                    Settlement Bank Account
                  </label>
                  <input
                    type="text"
                    value={bankAccount}
                    onChange={(e) => setBankAccount(e.target.value)}
                    placeholder="Account Number or IBAN"
                    style={{
                      width: '100%',
                      padding: '0.65rem 0.85rem',
                      borderRadius: 'var(--radius-md)',
                      border: '1px solid var(--border-medium)',
                      backgroundColor: '#ffffff',
                      fontSize: '0.95rem',
                    }}
                  />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: 600, color: 'var(--text-primary)', marginBottom: '0.4rem' }}>
                    Bank IFSC / Routing Code
                  </label>
                  <input
                    type="text"
                    value={bankIfsc}
                    onChange={(e) => setBankIfsc(e.target.value.toUpperCase())}
                    placeholder="HDFC0001234"
                    style={{
                      width: '100%',
                      padding: '0.65rem 0.85rem',
                      borderRadius: 'var(--radius-md)',
                      border: '1px solid var(--border-medium)',
                      backgroundColor: '#ffffff',
                      fontSize: '0.95rem',
                      letterSpacing: '0.04em',
                      fontFamily: 'monospace',
                    }}
                  />
                </div>
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: 600, color: 'var(--text-primary)', marginBottom: '0.4rem' }}>
                  Payment Gateway Integration
                </label>
                <select
                  value={payoutProvider}
                  onChange={(e) => setPayoutProvider(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '0.65rem 0.85rem',
                    borderRadius: 'var(--radius-md)',
                    border: '1px solid var(--border-medium)',
                    backgroundColor: '#ffffff',
                    fontSize: '0.95rem',
                  }}
                >
                  <option value="RAZORPAY_ROUTE">Razorpay Route (Direct Linked Account Payouts)</option>
                  <option value="DIRECT_SETTLEMENT">Standard T+2 Domestic Bank Wire</option>
                </select>
              </div>
            </div>
          )}

          {/* STEP 6: WELCOME TO ORGANIZER STUDIO & LAUNCH CHECKLIST */}
          {currentStep === 6 && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem', textAlign: 'center' }}>
              <div
                style={{
                  width: '64px',
                  height: '64px',
                  borderRadius: '50%',
                  backgroundColor: 'var(--status-success-bg)',
                  border: '2px solid var(--status-success-border)',
                  color: 'var(--status-success)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  margin: '0 auto',
                }}
              >
                <CheckCircle2 size={36} />
              </div>

              <div>
                <h3 style={{ fontSize: '1.4rem', fontWeight: 800, color: 'var(--text-primary)', marginBottom: '0.35rem' }}>
                  {submittedOrg?.name || name} is Registered!
                </h3>
                <p style={{ color: 'var(--text-secondary)', fontSize: '0.92rem', maxWidth: '480px', margin: '0 auto' }}>
                  Your business credentials have been recorded. You can now launch the Organizer Studio, create professional events, and design vector venues.
                </p>
              </div>

              {/* Checklist Box */}
              <div
                style={{
                  backgroundColor: 'var(--bg-secondary)',
                  border: '1px solid var(--border-subtle)',
                  borderRadius: 'var(--radius-lg)',
                  padding: '1.25rem',
                  textAlign: 'left',
                }}
              >
                <h4 style={{ fontSize: '0.9rem', fontWeight: 700, color: 'var(--text-primary)', marginBottom: '0.75rem' }}>
                  Next Production Milestones
                </h4>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', fontSize: '0.88rem' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
                    <CalendarPlus size={18} color="var(--brand-primary)" />
                    <span><strong>1. Create Your First Event:</strong> Define sessions, schedules, and verified descriptions.</span>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
                    <Compass size={18} color="var(--brand-primary)" />
                    <span><strong>2. Design Your Venue:</strong> Use the Custom Vector Studio for stadium arcs and VIP tables.</span>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
                    <Ticket size={18} color="var(--brand-primary)" />
                    <span><strong>3. Configure Ticket Tiers:</strong> Assign quotas, service fees, and anti-scalping limits.</span>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Footer Navigation */}
        <div
          style={{
            padding: '1.25rem 1.75rem',
            borderTop: '1px solid var(--border-subtle)',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            backgroundColor: '#ffffff',
          }}
        >
          {currentStep > 1 && currentStep < 6 ? (
            <Button variant="secondary" onClick={handlePrev} disabled={loading}>
              <ArrowLeft size={16} /> Back
            </Button>
          ) : (
            <div />
          )}

          {currentStep < 5 && (
            <Button variant="primary" onClick={handleNext}>
              Next Step <ArrowRight size={16} />
            </Button>
          )}

          {currentStep === 5 && (
            <Button
              variant="primary"
              onClick={handleSubmit}
              isLoading={loading}
              disabled={!verificationAgreed}
            >
              Submit &amp; Open Studio <ArrowRight size={16} />
            </Button>
          )}

          {currentStep === 6 && (
            <Button variant="primary" onClick={handleFinish} style={{ width: '100%' }}>
              Launch Organizer Studio <ArrowRight size={16} />
            </Button>
          )}
        </div>
      </div>
    </div>
  );
};
