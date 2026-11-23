import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { apiClient } from '../services/apiClient';
import { OrganizationDto } from '../types/api';
import { Button } from '../components/ui/Button';
import { Card } from '../components/ui/Card';
import { Badge } from '../components/ui/Badge';
import { LoadingSpinner } from '../components/ui/LoadingSpinner';
import { AuthModal } from '../components/auth/AuthModal';
import {
  Building2,
  CheckCircle2,
  Clock,
  XCircle,
  AlertCircle,
  ArrowRight,
  RefreshCw,
  LayoutDashboard,
  ShieldCheck,
  ArrowLeft,
} from 'lucide-react';

export const OrganizerApplyPage: React.FC = () => {
  const { user, refreshUserProfile } = useAuth();
  const navigate = useNavigate();

  // Application & State
  const [currentOrg, setCurrentOrg] = useState<OrganizationDto | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [submitting, setSubmitting] = useState<boolean>(false);
  const [serverError, setServerError] = useState<string | null>(null);

  // Auth modal toggle
  const [isAuthModalOpen, setIsAuthModalOpen] = useState<boolean>(false);
  const [authMode, setAuthMode] = useState<'LOGIN' | 'REGISTER'>('LOGIN');

  // Form Mode: true when editing/submitting, false when viewing pending/approved/rejected status
  const [isEditing, setIsEditing] = useState<boolean>(false);

  // Form Fields
  const [name, setName] = useState<string>('');
  const [organizationType, setOrganizationType] = useState<string>('ENTERPRISE');
  const [contactName, setContactName] = useState<string>('');
  const [billingEmail, setBillingEmail] = useState<string>('');
  const [contactPhone, setContactPhone] = useState<string>('');
  const [businessAddress, setBusinessAddress] = useState<string>('');
  const [taxIdentifier, setTaxIdentifier] = useState<string>('');
  const [website, setWebsite] = useState<string>('');
  const [description, setDescription] = useState<string>('');

  // Field validation errors
  const [errors, setErrors] = useState<Record<string, string>>({});

  // Fetch current organization application status
  const fetchMyApplication = async () => {
    if (!user) {
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    try {
      const res = await apiClient.get<OrganizationDto | null>('/organizer/organization/me');
      const org = res.data;
      setCurrentOrg(org);

      if (org) {
        // Pre-fill form state in case applicant edits or resubmits
        setName(org.name || '');
        setOrganizationType(org.organizationType || 'ENTERPRISE');
        setBillingEmail(org.billingEmail || org.contactEmail || user.email || '');
        setContactPhone(org.contactPhone || '');
        setBusinessAddress(org.businessAddress || '');
        setTaxIdentifier(org.taxIdentifier || '');
        setWebsite(org.website || org.websiteUrl || '');
        setDescription(org.description || '');

        // If approved and user has already been promoted to ORGANIZER, can redirect or offer studio button
        if (org.verificationStatus === 'VERIFIED') {
          // Refresh user context to ensure role reflects ORGANIZER
          await refreshUserProfile();
        }
      } else {
        // No application yet, prefill with user's account info
        setContactName(user.fullName || '');
        setBillingEmail(user.email || '');
      }
    } catch (err: unknown) {
      console.warn('Failed to fetch organizer application:', err);
      // If 404 or null, treat as no application
      setCurrentOrg(null);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchMyApplication();
  }, [user]);

  // Validation function
  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {};

    if (!name.trim()) {
      newErrors.name = 'Organization or business name is required.';
    } else if (name.trim().length < 2) {
      newErrors.name = 'Organization name must be at least 2 characters.';
    }

    if (!billingEmail.trim()) {
      newErrors.billingEmail = 'Business email address is required.';
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(billingEmail.trim())) {
      newErrors.billingEmail = 'Please provide a valid email format (e.g. contact@company.com).';
    }

    if (!contactPhone.trim()) {
      newErrors.contactPhone = 'Contact phone number is required.';
    } else if (contactPhone.trim().length < 8) {
      newErrors.contactPhone = 'Please provide a valid phone number with area/country code.';
    }

    if (!taxIdentifier.trim()) {
      newErrors.taxIdentifier = 'Tax identifier (GSTIN, PAN, or Business EIN) is required.';
    } else if (taxIdentifier.trim().length < 5) {
      newErrors.taxIdentifier = 'Please enter a valid tax identification number.';
    }

    if (website.trim() && !/^https?:\/\/.+/i.test(website.trim())) {
      newErrors.website = 'Website must start with http:// or https://';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  // Form submission handler
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setServerError(null);

    if (!validateForm()) {
      return;
    }

    setSubmitting(true);

    const payload = {
      name: name.trim(),
      organizationType,
      billingEmail: billingEmail.trim(),
      contactPhone: contactPhone.trim(),
      businessAddress: businessAddress.trim(),
      taxIdentifier: taxIdentifier.trim(),
      website: website.trim(),
      description: description.trim(),
      operatingProfile: JSON.stringify({
        contactPerson: contactName.trim(),
        submittedFrom: 'WEB_APPLICATION_FORM',
      }),
      payoutStatus: 'READY',
      payoutProvider: 'RAZORPAY_ROUTE',
    };

    try {
      let res;
      // If updating an existing rejected application, use PUT
      if (currentOrg && (currentOrg.verificationStatus === 'REJECTED' || isEditing)) {
        res = await apiClient.put<OrganizationDto>('/organizer/organization/me', payload);
      } else {
        // Otherwise use POST to create a new application
        res = await apiClient.post<OrganizationDto>('/organizer/organization/apply', payload);
      }

      setCurrentOrg(res.data);
      setIsEditing(false);
      // Refresh profile state
      await refreshUserProfile();
    } catch (err: unknown) {
      if (err instanceof Error) {
        setServerError(err.message);
      } else {
        setServerError('Failed to submit organizer application. Please check your information and try again.');
      }
    } finally {
      setSubmitting(false);
    }
  };

  // 1. Loading State
  if (isLoading) {
    return (
      <div style={{ minHeight: '80vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <LoadingSpinner label="Retrieving organizer application status..." />
      </div>
    );
  }

  // 2. Unauthenticated State
  if (!user) {
    return (
      <div style={{ backgroundColor: 'var(--bg-primary, #F8FAFC)', minHeight: '85vh', padding: '3.5rem 1rem' }}>
        <div className="container" style={{ maxWidth: '680px', margin: '0 auto' }}>
          <Card style={{ padding: '3rem 2.5rem', textAlign: 'center', boxShadow: 'var(--shadow-md)' }}>
            <div
              style={{
                width: '56px',
                height: '56px',
                borderRadius: '50%',
                backgroundColor: 'rgba(99, 102, 241, 0.1)',
                color: 'var(--brand-primary, #6366F1)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                margin: '0 auto 1.5rem',
              }}
            >
              <Building2 size={28} />
            </div>

            <h1
              style={{
                fontFamily: 'var(--font-display)',
                fontSize: '1.85rem',
                fontWeight: 800,
                color: 'var(--text-primary)',
                marginBottom: '0.75rem',
                letterSpacing: '-0.02em',
              }}
            >
              Become an EventPulse Organizer
            </h1>

            <p style={{ color: 'var(--text-secondary)', fontSize: '1rem', lineHeight: 1.6, marginBottom: '2rem' }}>
              Sign in or create an account to start your organizer application. Your application lets you host
              ticketed events, access interactive vector seating architecture, issue cryptographic QR tickets,
              and receive verified settlements.
            </p>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.85rem', maxWidth: '340px', margin: '0 auto' }}>
              <Button
                variant="primary"
                size="lg"
                onClick={() => {
                  setAuthMode('REGISTER');
                  setIsAuthModalOpen(true);
                }}
                style={{ width: '100%', justifyContent: 'center' }}
              >
                <span>Create Applicant Account</span>
                <ArrowRight size={16} />
              </Button>

              <Button
                variant="secondary"
                size="lg"
                onClick={() => {
                  setAuthMode('LOGIN');
                  setIsAuthModalOpen(true);
                }}
                style={{ width: '100%', justifyContent: 'center' }}
              >
                Sign In with Existing Account
              </Button>
            </div>
          </Card>
        </div>

        <AuthModal
          isOpen={isAuthModalOpen}
          initialMode={authMode}
          onClose={() => setIsAuthModalOpen(false)}
          onSuccess={() => {
            setIsAuthModalOpen(false);
            fetchMyApplication();
          }}
        />
      </div>
    );
  }

  // 3. Approved State
  if (currentOrg && currentOrg.verificationStatus === 'VERIFIED' && !isEditing) {
    return (
      <div style={{ backgroundColor: 'var(--bg-primary, #F8FAFC)', minHeight: '85vh', padding: '3.5rem 1rem' }}>
        <div className="container" style={{ maxWidth: '720px', margin: '0 auto' }}>
          <Card style={{ padding: '3rem 2.5rem', textAlign: 'center', boxShadow: 'var(--shadow-md)' }}>
            <div
              style={{
                width: '64px',
                height: '64px',
                borderRadius: '50%',
                backgroundColor: 'var(--status-success-bg, rgba(16, 185, 129, 0.12))',
                color: 'var(--status-success, #10B981)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                margin: '0 auto 1.5rem',
              }}
            >
              <CheckCircle2 size={36} />
            </div>

            <Badge variant="success" style={{ marginBottom: '1rem', padding: '0.4rem 0.85rem' }}>
              Organizer Verification Verified &amp; Active
            </Badge>

            <h1
              style={{
                fontFamily: 'var(--font-display)',
                fontSize: '2rem',
                fontWeight: 800,
                color: 'var(--text-primary)',
                marginBottom: '0.5rem',
              }}
            >
              You&apos;re approved
            </h1>

            <p style={{ color: 'var(--text-secondary)', fontSize: '1.05rem', marginBottom: '2rem', lineHeight: 1.6 }}>
              Your organizer access is ready. Your organization <strong>{currentOrg.name}</strong> has full
              administrative authority to create, configure, and publish live events on EventPulse.
            </p>

            <div
              style={{
                backgroundColor: 'var(--bg-elevated, #F1F5F9)',
                borderRadius: 'var(--radius-md, 8px)',
                padding: '1.25rem 1.5rem',
                textAlign: 'left',
                marginBottom: '2rem',
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
                gap: '1rem',
                fontSize: '0.9rem',
              }}
            >
              <div>
                <span style={{ color: 'var(--text-muted)', display: 'block', fontSize: '0.8rem', textTransform: 'uppercase' }}>
                  Organization Name
                </span>
                <strong style={{ color: 'var(--text-primary)' }}>{currentOrg.name}</strong>
              </div>
              <div>
                <span style={{ color: 'var(--text-muted)', display: 'block', fontSize: '0.8rem', textTransform: 'uppercase' }}>
                  Business Email
                </span>
                <strong style={{ color: 'var(--text-primary)' }}>{currentOrg.billingEmail}</strong>
              </div>
              <div>
                <span style={{ color: 'var(--text-muted)', display: 'block', fontSize: '0.8rem', textTransform: 'uppercase' }}>
                  Compliance Tax ID
                </span>
                <strong style={{ color: 'var(--text-primary)' }}>{currentOrg.taxIdentifier || 'Verified'}</strong>
              </div>
              <div>
                <span style={{ color: 'var(--text-muted)', display: 'block', fontSize: '0.8rem', textTransform: 'uppercase' }}>
                  Reviewed Date
                </span>
                <strong style={{ color: 'var(--text-primary)' }}>
                  {currentOrg.reviewedAt ? new Date(currentOrg.reviewedAt).toLocaleDateString() : 'Active'}
                </strong>
              </div>
            </div>

            <div style={{ display: 'flex', gap: '1rem', justifyContent: 'center', flexWrap: 'wrap' }}>
              <Button
                variant="primary"
                size="lg"
                onClick={() => navigate('/organizer')}
                style={{ backgroundColor: 'var(--brand-primary, #6366F1)' }}
              >
                <LayoutDashboard size={18} style={{ marginRight: '6px' }} />
                <span>Open Organizer Studio</span>
              </Button>

              <Button
                variant="secondary"
                size="lg"
                onClick={() => navigate('/venue-studio')}
              >
                <span>Venue Architect Studio</span>
              </Button>
            </div>
          </Card>
        </div>
      </div>
    );
  }

  // 4. Pending State
  if (currentOrg && currentOrg.verificationStatus === 'PENDING' && !isEditing) {
    return (
      <div style={{ backgroundColor: 'var(--bg-primary, #F8FAFC)', minHeight: '85vh', padding: '3.5rem 1rem' }}>
        <div className="container" style={{ maxWidth: '720px', margin: '0 auto' }}>
          <Card style={{ padding: '3rem 2.5rem', textAlign: 'center', boxShadow: 'var(--shadow-md)' }}>
            <div
              style={{
                width: '64px',
                height: '64px',
                borderRadius: '50%',
                backgroundColor: 'rgba(245, 158, 11, 0.12)',
                color: '#F59E0B',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                margin: '0 auto 1.5rem',
              }}
            >
              <Clock size={34} />
            </div>

            <Badge variant="warning" style={{ marginBottom: '1rem', padding: '0.4rem 0.85rem' }}>
              Under Administrative Review
            </Badge>

            <h1
              style={{
                fontFamily: 'var(--font-display)',
                fontSize: '2rem',
                fontWeight: 800,
                color: 'var(--text-primary)',
                marginBottom: '0.5rem',
              }}
            >
              Application submitted
            </h1>

            <p style={{ color: 'var(--text-secondary)', fontSize: '1.05rem', lineHeight: 1.6, marginBottom: '2rem' }}>
              Your organizer application is awaiting review. You can return to this page to check its status.
            </p>

            {/* Application Overview Box */}
            <div
              style={{
                backgroundColor: 'var(--bg-elevated, #F1F5F9)',
                borderRadius: 'var(--radius-md, 8px)',
                padding: '1.5rem',
                textAlign: 'left',
                marginBottom: '2rem',
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
                gap: '1.25rem',
                fontSize: '0.9rem',
                border: '1px solid var(--border-subtle, #E2E8F0)',
              }}
            >
              <div>
                <span style={{ color: 'var(--text-muted)', display: 'block', fontSize: '0.8rem', textTransform: 'uppercase' }}>
                  Organization Name
                </span>
                <strong style={{ color: 'var(--text-primary)', fontSize: '1rem' }}>{currentOrg.name}</strong>
              </div>
              <div>
                <span style={{ color: 'var(--text-muted)', display: 'block', fontSize: '0.8rem', textTransform: 'uppercase' }}>
                  Business Email
                </span>
                <strong style={{ color: 'var(--text-primary)' }}>{currentOrg.billingEmail}</strong>
              </div>
              <div>
                <span style={{ color: 'var(--text-muted)', display: 'block', fontSize: '0.8rem', textTransform: 'uppercase' }}>
                  Contact Phone
                </span>
                <strong style={{ color: 'var(--text-primary)' }}>{currentOrg.contactPhone || '—'}</strong>
              </div>
              <div>
                <span style={{ color: 'var(--text-muted)', display: 'block', fontSize: '0.8rem', textTransform: 'uppercase' }}>
                  Submission Date
                </span>
                <strong style={{ color: 'var(--text-primary)' }}>
                  {currentOrg.createdAt ? new Date(currentOrg.createdAt).toLocaleDateString(undefined, {
                    year: 'numeric',
                    month: 'short',
                    day: 'numeric',
                    hour: '2-digit',
                    minute: '2-digit',
                  }) : 'Recently'}
                </strong>
              </div>
            </div>

            <div
              style={{
                padding: '1rem 1.25rem',
                backgroundColor: 'rgba(99, 102, 241, 0.05)',
                border: '1px solid rgba(99, 102, 241, 0.2)',
                borderRadius: 'var(--radius-md, 8px)',
                textAlign: 'left',
                fontSize: '0.88rem',
                color: 'var(--text-secondary)',
                lineHeight: 1.6,
                marginBottom: '2rem',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'flex-start', gap: '0.65rem' }}>
                <ShieldCheck size={18} color="var(--brand-primary, #6366F1)" style={{ marginTop: '2px', flexShrink: 0 }} />
                <div>
                  <strong style={{ color: 'var(--text-primary)', display: 'block', marginBottom: '0.2rem' }}>
                    What happens next?
                  </strong>
                  Our compliance team verifies organization credentials and tax identification details to guarantee
                  safe ticketing and atomic settlement distribution. You will retain normal attendee privileges while
                  your application is pending.
                </div>
              </div>
            </div>

            <div style={{ display: 'flex', gap: '1rem', justifyContent: 'center', flexWrap: 'wrap' }}>
              <Button
                variant="primary"
                onClick={fetchMyApplication}
                style={{ backgroundColor: 'var(--brand-primary, #6366F1)' }}
              >
                <RefreshCw size={16} style={{ marginRight: '6px' }} />
                <span>Refresh Application Status</span>
              </Button>

              <Button variant="secondary" onClick={() => navigate('/')}>
                <ArrowLeft size={16} style={{ marginRight: '6px' }} />
                <span>Back to Events</span>
              </Button>
            </div>
          </Card>
        </div>
      </div>
    );
  }

  // 5. Rejected State
  if (currentOrg && currentOrg.verificationStatus === 'REJECTED' && !isEditing) {
    return (
      <div style={{ backgroundColor: 'var(--bg-primary, #F8FAFC)', minHeight: '85vh', padding: '3.5rem 1rem' }}>
        <div className="container" style={{ maxWidth: '720px', margin: '0 auto' }}>
          <Card style={{ padding: '3rem 2.5rem', textAlign: 'center', boxShadow: 'var(--shadow-md)' }}>
            <div
              style={{
                width: '64px',
                height: '64px',
                borderRadius: '50%',
                backgroundColor: 'rgba(239, 68, 68, 0.12)',
                color: 'var(--status-danger, #EF4444)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                margin: '0 auto 1.5rem',
              }}
            >
              <XCircle size={36} />
            </div>

            <Badge variant="danger" style={{ marginBottom: '1rem', padding: '0.4rem 0.85rem' }}>
              Verification Not Approved
            </Badge>

            <h1
              style={{
                fontFamily: 'var(--font-display)',
                fontSize: '2rem',
                fontWeight: 800,
                color: 'var(--text-primary)',
                marginBottom: '0.5rem',
              }}
            >
              Application not approved
            </h1>

            <p style={{ color: 'var(--text-secondary)', fontSize: '1rem', lineHeight: 1.6, marginBottom: '1.75rem' }}>
              Your organizer application for <strong>{currentOrg.name}</strong> was reviewed and could not be verified
              at this time.
            </p>

            {/* Official Administrator Rejection Reason */}
            <div
              style={{
                backgroundColor: 'rgba(239, 68, 68, 0.06)',
                border: '1px solid rgba(239, 68, 68, 0.25)',
                borderRadius: 'var(--radius-md, 8px)',
                padding: '1.25rem 1.5rem',
                textAlign: 'left',
                marginBottom: '2rem',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'flex-start', gap: '0.65rem' }}>
                <AlertCircle size={20} color="var(--status-danger, #EF4444)" style={{ marginTop: '2px', flexShrink: 0 }} />
                <div>
                  <span style={{ fontSize: '0.8rem', fontWeight: 700, color: 'var(--status-danger, #EF4444)', textTransform: 'uppercase' }}>
                    Reason Provided by Platform Reviewer:
                  </span>
                  <div style={{ marginTop: '0.35rem', fontSize: '0.95rem', color: 'var(--text-primary)', fontWeight: 600 }}>
                    &ldquo;{currentOrg.rejectionReason || 'Documentation could not be verified with official registries.'}&rdquo;
                  </div>
                </div>
              </div>
            </div>

            <p style={{ color: 'var(--text-secondary)', fontSize: '0.92rem', marginBottom: '2rem' }}>
              You may correct the details and resubmit your application for re-review without having to start over.
            </p>

            <div style={{ display: 'flex', gap: '1rem', justifyContent: 'center', flexWrap: 'wrap' }}>
              <Button
                variant="primary"
                size="lg"
                onClick={() => setIsEditing(true)}
                style={{ backgroundColor: 'var(--brand-primary, #6366F1)' }}
              >
                <span>Edit &amp; Resubmit Application</span>
                <ArrowRight size={16} />
              </Button>

              <Button variant="secondary" size="lg" onClick={() => navigate('/')}>
                Return to Homepage
              </Button>
            </div>
          </Card>
        </div>
      </div>
    );
  }

  // 6. Application Form (New Application or Resubmission)
  return (
    <div style={{ backgroundColor: 'var(--bg-primary, #F8FAFC)', minHeight: '90vh', padding: '3.5rem 1rem 5rem' }}>
      <div className="container" style={{ maxWidth: '740px', margin: '0 auto' }}>
        {/* Compact Branded Header */}
        <div style={{ marginBottom: '2rem', textAlign: 'center' }}>
          <div
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '0.45rem',
              backgroundColor: 'rgba(99, 102, 241, 0.08)',
              color: 'var(--brand-primary, #6366F1)',
              padding: '0.35rem 0.85rem',
              borderRadius: '999px',
              fontSize: '0.82rem',
              fontWeight: 700,
              textTransform: 'uppercase',
              letterSpacing: '0.04em',
              marginBottom: '0.75rem',
            }}
          >
            <ShieldCheck size={14} />
            <span>EventPulse Organizer Onboarding</span>
          </div>

          <h1
            style={{
              fontFamily: 'var(--font-display)',
              fontSize: '2.2rem',
              fontWeight: 800,
              color: 'var(--text-primary)',
              letterSpacing: '-0.02em',
              marginBottom: '0.5rem',
            }}
          >
            {isEditing ? 'Update & Resubmit Application' : 'Apply to Become an Organizer'}
          </h1>

          <p style={{ color: 'var(--text-secondary)', fontSize: '1.02rem', maxWidth: '580px', margin: '0 auto', lineHeight: 1.6 }}>
            Submit your business and contact information for administrative verification. Approved organizers
            gain access to the Organizer Studio and direct ticketing tools.
          </p>
        </div>

        {/* Global Server Error Banner */}
        {serverError && (
          <div
            style={{
              padding: '1rem 1.25rem',
              backgroundColor: 'rgba(239, 68, 68, 0.08)',
              border: '1px solid rgba(239, 68, 68, 0.25)',
              borderRadius: 'var(--radius-md, 8px)',
              color: 'var(--status-danger, #EF4444)',
              marginBottom: '1.5rem',
              display: 'flex',
              alignItems: 'center',
              gap: '0.75rem',
            }}
          >
            <AlertCircle size={20} style={{ flexShrink: 0 }} />
            <div style={{ fontSize: '0.92rem', fontWeight: 600 }}>{serverError}</div>
          </div>
        )}

        {/* Main Central Form Card */}
        <Card style={{ padding: '2.5rem', boxShadow: 'var(--shadow-md)' }}>
          <form onSubmit={handleSubmit} noValidate>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1.75rem' }}>
              
              {/* Field 1: Organization Name */}
              <div>
                <label
                  htmlFor="org-name"
                  style={{ display: 'block', fontSize: '0.92rem', fontWeight: 700, color: 'var(--text-primary)', marginBottom: '0.4rem' }}
                >
                  Organization or Business Name <span style={{ color: 'var(--status-danger, #EF4444)' }}>*</span>
                </label>
                <input
                  id="org-name"
                  type="text"
                  value={name}
                  onChange={(e) => {
                    setName(e.target.value);
                    if (errors.name) setErrors((prev) => ({ ...prev, name: '' }));
                  }}
                  style={{
                    width: '100%',
                    padding: '0.75rem 0.95rem',
                    borderRadius: 'var(--radius-md, 6px)',
                    border: errors.name ? '1px solid var(--status-danger, #EF4444)' : '1px solid var(--border-medium, #CBD5E1)',
                    fontSize: '0.95rem',
                    color: 'var(--text-primary)',
                    backgroundColor: '#FFFFFF',
                    outline: 'none',
                    boxSizing: 'border-box',
                  }}
                />
                {errors.name ? (
                  <span style={{ color: 'var(--status-danger, #EF4444)', fontSize: '0.82rem', marginTop: '0.35rem', display: 'block' }}>
                    {errors.name}
                  </span>
                ) : (
                  <span style={{ color: 'var(--text-muted)', fontSize: '0.82rem', marginTop: '0.25rem', display: 'block' }}>
                    The public promoter or company name displayed to ticket buyers.
                  </span>
                )}
              </div>

              {/* Field 2: Organization Type */}
              <div>
                <label
                  htmlFor="org-type"
                  style={{ display: 'block', fontSize: '0.92rem', fontWeight: 700, color: 'var(--text-primary)', marginBottom: '0.4rem' }}
                >
                  Business / Organization Structure <span style={{ color: 'var(--status-danger, #EF4444)' }}>*</span>
                </label>
                <select
                  id="org-type"
                  value={organizationType}
                  onChange={(e) => setOrganizationType(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '0.75rem 0.95rem',
                    borderRadius: 'var(--radius-md, 6px)',
                    border: '1px solid var(--border-medium, #CBD5E1)',
                    fontSize: '0.95rem',
                    color: 'var(--text-primary)',
                    backgroundColor: '#FFFFFF',
                    outline: 'none',
                    boxSizing: 'border-box',
                  }}
                >
                  <option value="ENTERPRISE">Registered Company / Enterprise Promoter</option>
                  <option value="AGENCY">Event Management Agency / Production House</option>
                  <option value="INDEPENDENT">Independent Creator / Performing Artist</option>
                  <option value="NON_PROFIT">Non-Profit / Educational Institution</option>
                </select>
              </div>

              {/* Grid: Contact Person & Email */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '1.25rem' }}>
                <div>
                  <label
                    htmlFor="contact-name"
                    style={{ display: 'block', fontSize: '0.92rem', fontWeight: 700, color: 'var(--text-primary)', marginBottom: '0.4rem' }}
                  >
                    Primary Contact Person
                  </label>
                  <input
                    id="contact-name"
                    type="text"
                    value={contactName}
                    onChange={(e) => setContactName(e.target.value)}
                    style={{
                      width: '100%',
                      padding: '0.75rem 0.95rem',
                      borderRadius: 'var(--radius-md, 6px)',
                      border: '1px solid var(--border-medium, #CBD5E1)',
                      fontSize: '0.95rem',
                      color: 'var(--text-primary)',
                      backgroundColor: '#FFFFFF',
                      outline: 'none',
                      boxSizing: 'border-box',
                    }}
                  />
                  <span style={{ color: 'var(--text-muted)', fontSize: '0.82rem', marginTop: '0.25rem', display: 'block' }}>
                    Authorized representative managing this account.
                  </span>
                </div>

                <div>
                  <label
                    htmlFor="billing-email"
                    style={{ display: 'block', fontSize: '0.92rem', fontWeight: 700, color: 'var(--text-primary)', marginBottom: '0.4rem' }}
                  >
                    Business / Billing Email <span style={{ color: 'var(--status-danger, #EF4444)' }}>*</span>
                  </label>
                  <input
                    id="billing-email"
                    type="email"
                    value={billingEmail}
                    onChange={(e) => {
                      setBillingEmail(e.target.value);
                      if (errors.billingEmail) setErrors((prev) => ({ ...prev, billingEmail: '' }));
                    }}
                    style={{
                      width: '100%',
                      padding: '0.75rem 0.95rem',
                      borderRadius: 'var(--radius-md, 6px)',
                      border: errors.billingEmail ? '1px solid var(--status-danger, #EF4444)' : '1px solid var(--border-medium, #CBD5E1)',
                      fontSize: '0.95rem',
                      color: 'var(--text-primary)',
                      backgroundColor: '#FFFFFF',
                      outline: 'none',
                      boxSizing: 'border-box',
                    }}
                  />
                  {errors.billingEmail ? (
                    <span style={{ color: 'var(--status-danger, #EF4444)', fontSize: '0.82rem', marginTop: '0.35rem', display: 'block' }}>
                      {errors.billingEmail}
                    </span>
                  ) : (
                    <span style={{ color: 'var(--text-muted)', fontSize: '0.82rem', marginTop: '0.25rem', display: 'block' }}>
                      For administrative notifications and settlement invoices.
                    </span>
                  )}
                </div>
              </div>

              {/* Grid: Phone Number & Tax Identifier */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '1.25rem' }}>
                <div>
                  <label
                    htmlFor="contact-phone"
                    style={{ display: 'block', fontSize: '0.92rem', fontWeight: 700, color: 'var(--text-primary)', marginBottom: '0.4rem' }}
                  >
                    Business Phone Number <span style={{ color: 'var(--status-danger, #EF4444)' }}>*</span>
                  </label>
                  <input
                    id="contact-phone"
                    type="tel"
                    value={contactPhone}
                    onChange={(e) => {
                      setContactPhone(e.target.value);
                      if (errors.contactPhone) setErrors((prev) => ({ ...prev, contactPhone: '' }));
                    }}
                    style={{
                      width: '100%',
                      padding: '0.75rem 0.95rem',
                      borderRadius: 'var(--radius-md, 6px)',
                      border: errors.contactPhone ? '1px solid var(--status-danger, #EF4444)' : '1px solid var(--border-medium, #CBD5E1)',
                      fontSize: '0.95rem',
                      color: 'var(--text-primary)',
                      backgroundColor: '#FFFFFF',
                      outline: 'none',
                      boxSizing: 'border-box',
                    }}
                  />
                  {errors.contactPhone ? (
                    <span style={{ color: 'var(--status-danger, #EF4444)', fontSize: '0.82rem', marginTop: '0.35rem', display: 'block' }}>
                      {errors.contactPhone}
                    </span>
                  ) : (
                    <span style={{ color: 'var(--text-muted)', fontSize: '0.82rem', marginTop: '0.25rem', display: 'block' }}>
                      Direct operational line for verification contact.
                    </span>
                  )}
                </div>

                <div>
                  <label
                    htmlFor="tax-id"
                    style={{ display: 'block', fontSize: '0.92rem', fontWeight: 700, color: 'var(--text-primary)', marginBottom: '0.4rem' }}
                  >
                    Tax Identifier / GSTIN / PAN <span style={{ color: 'var(--status-danger, #EF4444)' }}>*</span>
                  </label>
                  <input
                    id="tax-id"
                    type="text"
                    value={taxIdentifier}
                    onChange={(e) => {
                      setTaxIdentifier(e.target.value.toUpperCase());
                      if (errors.taxIdentifier) setErrors((prev) => ({ ...prev, taxIdentifier: '' }));
                    }}
                    style={{
                      width: '100%',
                      padding: '0.75rem 0.95rem',
                      borderRadius: 'var(--radius-md, 6px)',
                      border: errors.taxIdentifier ? '1px solid var(--status-danger, #EF4444)' : '1px solid var(--border-medium, #CBD5E1)',
                      fontSize: '0.95rem',
                      color: 'var(--text-primary)',
                      backgroundColor: '#FFFFFF',
                      outline: 'none',
                      boxSizing: 'border-box',
                    }}
                  />
                  {errors.taxIdentifier ? (
                    <span style={{ color: 'var(--status-danger, #EF4444)', fontSize: '0.82rem', marginTop: '0.35rem', display: 'block' }}>
                      {errors.taxIdentifier}
                    </span>
                  ) : (
                    <span style={{ color: 'var(--text-muted)', fontSize: '0.82rem', marginTop: '0.25rem', display: 'block' }}>
                      Required for statutory invoicing and payment verification.
                    </span>
                  )}
                </div>
              </div>

              {/* Field: Website or Social Profile */}
              <div>
                <label
                  htmlFor="website"
                  style={{ display: 'block', fontSize: '0.92rem', fontWeight: 700, color: 'var(--text-primary)', marginBottom: '0.4rem' }}
                >
                  Official Website or Social Profile
                </label>
                <input
                  id="website"
                  type="url"
                  value={website}
                  onChange={(e) => {
                    setWebsite(e.target.value);
                    if (errors.website) setErrors((prev) => ({ ...prev, website: '' }));
                  }}
                  style={{
                    width: '100%',
                    padding: '0.75rem 0.95rem',
                    borderRadius: 'var(--radius-md, 6px)',
                    border: errors.website ? '1px solid var(--status-danger, #EF4444)' : '1px solid var(--border-medium, #CBD5E1)',
                    fontSize: '0.95rem',
                    color: 'var(--text-primary)',
                    backgroundColor: '#FFFFFF',
                    outline: 'none',
                    boxSizing: 'border-box',
                  }}
                />
                {errors.website ? (
                  <span style={{ color: 'var(--status-danger, #EF4444)', fontSize: '0.82rem', marginTop: '0.35rem', display: 'block' }}>
                    {errors.website}
                  </span>
                ) : (
                  <span style={{ color: 'var(--text-muted)', fontSize: '0.82rem', marginTop: '0.25rem', display: 'block' }}>
                    Example: https://yourbrand.com or https://instagram.com/yourbrand
                  </span>
                )}
              </div>

              {/* Field: Business Address */}
              <div>
                <label
                  htmlFor="business-address"
                  style={{ display: 'block', fontSize: '0.92rem', fontWeight: 700, color: 'var(--text-primary)', marginBottom: '0.4rem' }}
                >
                  Registered Business Address
                </label>
                <input
                  id="business-address"
                  type="text"
                  value={businessAddress}
                  onChange={(e) => setBusinessAddress(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '0.75rem 0.95rem',
                    borderRadius: 'var(--radius-md, 6px)',
                    border: '1px solid var(--border-medium, #CBD5E1)',
                    fontSize: '0.95rem',
                    color: 'var(--text-primary)',
                    backgroundColor: '#FFFFFF',
                    outline: 'none',
                    boxSizing: 'border-box',
                  }}
                />
              </div>

              {/* Field: Business Description */}
              <div>
                <label
                  htmlFor="description"
                  style={{ display: 'block', fontSize: '0.92rem', fontWeight: 700, color: 'var(--text-primary)', marginBottom: '0.4rem' }}
                >
                  Event Portfolio &amp; Brief Description
                </label>
                <textarea
                  id="description"
                  rows={3}
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '0.75rem 0.95rem',
                    borderRadius: 'var(--radius-md, 6px)',
                    border: '1px solid var(--border-medium, #CBD5E1)',
                    fontSize: '0.95rem',
                    color: 'var(--text-primary)',
                    backgroundColor: '#FFFFFF',
                    outline: 'none',
                    boxSizing: 'border-box',
                    fontFamily: 'inherit',
                    resize: 'vertical',
                  }}
                />
                <span style={{ color: 'var(--text-muted)', fontSize: '0.82rem', marginTop: '0.25rem', display: 'block' }}>
                  Share the typical scale, genres, or frequency of events you plan to produce.
                </span>
              </div>

              {/* Form Action Buttons */}
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  gap: '1rem',
                  paddingTop: '1.25rem',
                  borderTop: '1px solid var(--border-subtle, #E2E8F0)',
                  flexWrap: 'wrap',
                }}
              >
                <Button
                  type="button"
                  variant="secondary"
                  onClick={() => {
                    if (isEditing && currentOrg) {
                      setIsEditing(false);
                    } else {
                      navigate('/');
                    }
                  }}
                  disabled={submitting}
                >
                  Cancel
                </Button>

                <Button
                  type="submit"
                  variant="primary"
                  size="lg"
                  isLoading={submitting}
                  style={{ backgroundColor: 'var(--brand-primary, #6366F1)' }}
                >
                  <span>{isEditing ? 'Save & Resubmit Application' : 'Submit Application for Review'}</span>
                  <ArrowRight size={16} />
                </Button>
              </div>

            </div>
          </form>
        </Card>
      </div>
    </div>
  );
};
