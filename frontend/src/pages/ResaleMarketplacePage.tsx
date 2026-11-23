import React, { useState, useEffect } from 'react';
import { ResaleListingDto } from '../types/api';
import { apiClient } from '../services/apiClient';
import { useAuth } from '../context/AuthContext';
import { Button } from '../components/ui/Button';
import { Badge } from '../components/ui/Badge';
import {
  Ticket,
  ShieldCheck,
  Clock,
  ArrowRight,
  CheckCircle2,
  X,
  CreditCard,
  Lock,
  Calendar,
  MapPin
} from 'lucide-react';
import { useNavigate, useLocation } from 'react-router-dom';

export const ResaleMarketplacePage: React.FC = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const locationState = location.state as {
    action?: string;
    listingId?: string;
  } | null;

  const [listings, setListings] = useState<ResaleListingDto[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [marketplaceNotice, setMarketplaceNotice] = useState<{ type: 'error' | 'info'; message: string } | null>(null);

  // Checkout Modal State
  const [selectedListing, setSelectedListing] = useState<ResaleListingDto | null>(null);
  const [checkoutData, setCheckoutData] = useState<{
    listingId: string;
    eventTitle: string;
    sessionTitle: string;
    seatLabel: string;
    ticketTypeName: string;
    originalPrice: number;
    resalePrice: number;
    processingFee: number;
    totalAmount: number;
    currency: string;
    razorpayOrderId: string;
    holdExpiresAt: string;
  } | null>(null);

  const [checkoutLoading, setCheckoutLoading] = useState<boolean>(false);
  const [checkoutError, setCheckoutError] = useState<string | null>(null);
  const [purchaseSuccess, setPurchaseSuccess] = useState<boolean>(false);
  const [purchasedListing, setPurchasedListing] = useState<ResaleListingDto | null>(null);

  const fetchListings = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await apiClient.get<ResaleListingDto[]>('/resale/marketplace');
      const allListings = res.data || [];
      setListings(allListings);

      // If returning from login to purchase a specific listing
      if (locationState?.action === 'BUY_RESALE' && locationState?.listingId) {
        const target = allListings.find((l) => l.id === locationState.listingId);
        if (target) {
          handleStartCheckout(target);
        } else {
          setMarketplaceNotice({
            type: 'info',
            message: 'The resale listing you selected is no longer available or was reserved by another buyer.',
          });
        }
      }
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to load resale marketplace');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchListings();
  }, []);

  const handleStartCheckout = async (listing: ResaleListingDto) => {
    setMarketplaceNotice(null);

    if (!user) {
      navigate('/login', {
        state: {
          from: location,
          action: 'BUY_RESALE',
          listingId: listing.id,
        },
      });
      return;
    }

    const isSeller = (listing.sellerId && user.id && listing.sellerId === user.id) ||
                     (listing.sellerName && user.fullName && listing.sellerName === user.fullName);

    if (isSeller) {
      setMarketplaceNotice({
        type: 'error',
        message: 'You cannot purchase your own resale listing. Your active listings are managed under "My Tickets".',
      });
      return;
    }

    setSelectedListing(listing);
    setCheckoutLoading(true);
    setCheckoutError(null);
    setPurchaseSuccess(false);

    try {
      const res = await apiClient.post<any>(`/resale/${listing.id}/checkout`);
      setCheckoutData(res.data);
    } catch (err: unknown) {
      setCheckoutError(err instanceof Error ? err.message : 'Unable to lock resale listing');
    } finally {
      setCheckoutLoading(false);
    }
  };

  const handleConfirmPurchase = async () => {
    if (!selectedListing || !checkoutData) return;

    setCheckoutLoading(true);
    setCheckoutError(null);

    try {
      const confirmPayload = {
        paymentProvider: 'MOCK',
        razorpayOrderId: checkoutData.razorpayOrderId,
        razorpayPaymentId: `pay_resale_${Date.now()}`,
        razorpaySignature: 'sig_verified_mock_2027',
      };

      const res = await apiClient.post<ResaleListingDto>(
        `/resale/${selectedListing.id}/confirm`,
        confirmPayload
      );
      setPurchasedListing(res.data);
      setPurchaseSuccess(true);
      fetchListings();
    } catch (err: unknown) {
      setCheckoutError(err instanceof Error ? err.message : 'Payment or ownership transfer failed');
    } finally {
      setCheckoutLoading(false);
    }
  };

  const handleCancelCheckout = async () => {
    if (selectedListing) {
      try {
        await apiClient.post(`/resale/${selectedListing.id}/cancel-checkout`);
      } catch (e) {
        // Safe no-op
      }
    }
    setSelectedListing(null);
    setCheckoutData(null);
    setPurchaseSuccess(false);
    fetchListings();
  };

  return (
    <div style={{ backgroundColor: 'var(--bg-primary)', minHeight: '100vh', padding: '2.5rem 1rem 5rem' }}>
      <div className="container" style={{ maxWidth: '1200px', margin: '0 auto' }}>
        {/* Hero Banner */}
        <div
          style={{
            backgroundColor: '#ffffff',
            border: '1px solid var(--border-subtle)',
            borderRadius: 'var(--radius-xl)',
            padding: '2.5rem',
            marginBottom: '2.5rem',
            position: 'relative',
            overflow: 'hidden',
            boxShadow: 'var(--shadow-sm)',
          }}
        >
          <div style={{ maxWidth: '720px' }}>
            <div style={{ display: 'inline-flex', alignItems: 'center', gap: '0.4rem', padding: '0.35rem 0.85rem', backgroundColor: 'var(--brand-subtle)', border: '1px solid rgba(8, 79, 232, 0.25)', borderRadius: 'var(--radius-full)', color: 'var(--brand-primary)', fontSize: '0.78rem', fontWeight: 700, marginBottom: '1rem' }}>
              <ShieldCheck size={15} color="var(--brand-primary)" />
              Verified Fan-to-Fan Resale Marketplace
            </div>
            <h1 style={{ fontSize: 'clamp(1.8rem, 3.2vw, 2.4rem)', fontWeight: 800, letterSpacing: '-0.02em', color: 'var(--text-primary)', marginBottom: '0.75rem', fontFamily: 'var(--font-display)' }}>
              Fair-Price Verified Ticket Resale
            </h1>
            <p style={{ color: 'var(--text-secondary)', fontSize: '0.98rem', lineHeight: '1.6', marginBottom: '1.25rem' }}>
              Every ticket is cryptographically verified against the EventPulse database. Anti-scalping policies strictly enforce prices at or below original face value with automatic QR code invalidation and re-issuance upon transfer.
            </p>
            <div style={{ display: 'flex', gap: '1.5rem', flexWrap: 'wrap', fontSize: '0.85rem', color: 'var(--text-primary)', fontWeight: 600 }}>
              <span style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', color: 'var(--status-success)' }}>
                <CheckCircle2 size={16} /> 100% Guaranteed Authentic
              </span>
              <span style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', color: 'var(--brand-primary)' }}>
                <ShieldCheck size={16} /> Instant HMAC Barcode Re-issuance
              </span>
              <span style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', color: 'var(--text-secondary)' }}>
                <Lock size={16} /> Zero Scalper Markups (Capped at Face Value)
              </span>
            </div>
          </div>
        </div>

        {marketplaceNotice && (
          <div style={{
            padding: '1rem 1.25rem',
            backgroundColor: marketplaceNotice.type === 'error' ? 'var(--status-danger-bg)' : 'var(--brand-subtle)',
            border: `1px solid ${marketplaceNotice.type === 'error' ? 'var(--status-danger)' : 'var(--brand-primary)'}`,
            color: marketplaceNotice.type === 'error' ? 'var(--status-danger)' : 'var(--brand-primary)',
            borderRadius: 'var(--radius-md)',
            marginBottom: '1.5rem',
            fontSize: '0.9rem',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            fontWeight: 600,
          }}>
            <div>{marketplaceNotice.message}</div>
            <button
              onClick={() => setMarketplaceNotice(null)}
              style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'inherit' }}
            >
              <X size={16} />
            </button>
          </div>
        )}

        {error && (
          <div style={{ padding: '0.85rem 1.25rem', backgroundColor: '#fef2f2', border: '1px solid #fecaca', color: 'var(--status-danger)', borderRadius: 'var(--radius-md)', marginBottom: '1.5rem', fontSize: '0.88rem', fontWeight: 600 }}>
            {error}
          </div>
        )}

        {/* Listings Grid */}
        <div style={{ marginBottom: '1.5rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem' }}>
          <div>
            <h2 style={{ fontSize: '1.35rem', fontWeight: 800, color: 'var(--text-primary)', margin: 0 }}>
              Active Verified Listings ({listings.length})
            </h2>
            <p style={{ fontSize: '0.82rem', color: 'var(--text-secondary)', margin: '0.2rem 0 0' }}>
              Directly transferable passes backed by the EventPulse buyer guarantee.
            </p>
          </div>
          <Button size="sm" variant="secondary" onClick={fetchListings} style={{ fontWeight: 600 }}>
            Refresh Listings
          </Button>
        </div>

        {loading ? (
          <div style={{ textAlign: 'center', padding: '4rem 0', color: 'var(--text-secondary)' }}>
            Loading verified resale inventory...
          </div>
        ) : listings.length === 0 ? (
          <div style={{ padding: '4rem 2rem', textAlign: 'center', backgroundColor: '#ffffff', borderRadius: 'var(--radius-xl)', border: '1px solid var(--border-subtle)', boxShadow: 'var(--shadow-sm)' }}>
            <div
              style={{
                width: '64px',
                height: '64px',
                borderRadius: '50%',
                backgroundColor: 'var(--brand-subtle)',
                color: 'var(--brand-primary)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                margin: '0 auto 1.25rem',
              }}
            >
              <Ticket size={32} />
            </div>
            <h3 style={{ fontSize: '1.25rem', fontWeight: 800, color: 'var(--text-primary)', marginBottom: '0.5rem' }}>No Resale Listings Currently Available</h3>
            <p style={{ color: 'var(--text-secondary)', fontSize: '0.92rem', maxWidth: '450px', margin: '0 auto 1.5rem' }}>
              Fans have not listed any tickets for resale right now. Check back frequently or discover primary event tickets.
            </p>
            <Button variant="primary" onClick={() => navigate('/events')} style={{ fontWeight: 700 }}>
              Explore Live Events
            </Button>
          </div>
        ) : (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(350px, 1fr))', gap: '1.75rem' }}>
            {listings.map((item) => (
              <div
                key={item.id}
                className="ticket-perforated-border"
                style={{
                  padding: '1.75rem',
                  backgroundColor: '#ffffff',
                  border: '1px solid var(--border-subtle)',
                  borderRadius: 'var(--radius-xl)',
                  boxShadow: 'var(--shadow-sm)',
                  display: 'flex',
                  flexDirection: 'column',
                  justifyContent: 'space-between',
                  transition: 'all var(--transition-fast)',
                }}
              >
                <div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.85rem' }}>
                    <Badge variant="info">Verified Resale</Badge>
                    {item.savingsAmount && item.savingsAmount > 0 && (
                      <span style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--status-success)', backgroundColor: 'var(--status-success-bg)', border: '1px solid var(--status-success-border)', padding: '0.2rem 0.55rem', borderRadius: 'var(--radius-full)' }}>
                        Save ₹{item.savingsAmount} ({item.savingsPercentage}%)
                      </span>
                    )}
                  </div>

                  <h3 style={{ fontSize: '1.2rem', fontWeight: 800, color: 'var(--text-primary)', marginBottom: '0.5rem', lineHeight: 1.3 }}>
                    {item.eventTitle || 'Featured Event'}
                  </h3>

                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem', fontSize: '0.85rem', color: 'var(--text-secondary)', marginBottom: '1.25rem' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.45rem' }}>
                      <Calendar size={14} color="var(--brand-primary)" />
                      <span>{item.sessionTitle || 'Session'}</span>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.45rem' }}>
                      <MapPin size={14} color="var(--brand-primary)" />
                      <span>{item.venueName}, {item.city}</span>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.45rem', color: 'var(--brand-primary)', fontWeight: 700, marginTop: '0.2rem' }}>
                      <Ticket size={14} />
                      <span>{item.ticketTypeName} • Seat: {item.seatLabel || item.seatInfo || 'General Admission'}</span>
                    </div>
                  </div>
                </div>

                <div style={{ borderTop: '1px solid var(--border-subtle)', paddingTop: '1.25rem' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: '1rem' }}>
                    <div>
                      <span style={{ fontSize: '0.78rem', color: 'var(--text-muted)', textDecoration: 'line-through', marginRight: '0.5rem' }}>
                        Face Value ₹{item.originalPrice}
                      </span>
                      <span style={{ fontSize: '1.45rem', fontWeight: 800, color: 'var(--text-primary)' }}>
                        ₹{item.resalePrice}
                      </span>
                    </div>
                    <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>incl. verified transfer</span>
                  </div>

                  <Button
                    variant="primary"
                    style={{ width: '100%', fontWeight: 800, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.4rem' }}
                    onClick={() => handleStartCheckout(item)}
                  >
                    <span>Buy Resale Ticket</span>
                    <ArrowRight size={16} />
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}

      {/* Dedicated Resale Checkout Modal */}
      {selectedListing && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            zIndex: 100,
            backgroundColor: 'rgba(15, 23, 42, 0.5)',
            backdropFilter: 'blur(4px)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '1.5rem',
          }}
        >
          <div
            style={{
              width: '100%',
              maxWidth: '540px',
              backgroundColor: '#ffffff',
              border: '1px solid var(--border-subtle, #e2e8f0)',
              borderRadius: '16px',
              padding: '1.75rem',
              boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)',
            }}
          >
            {purchaseSuccess ? (
              <div style={{ textAlign: 'center', padding: '1rem 0' }}>
                <div style={{ display: 'inline-flex', padding: '1rem', background: '#ecfdf5', borderRadius: '50%', color: '#059669', marginBottom: '1rem' }}>
                  <CheckCircle2 size={48} />
                </div>
                <h3 style={{ fontSize: '1.4rem', fontWeight: 800, color: '#0f172a', marginBottom: '0.5rem' }}>
                  Resale Purchase Complete!
                </h3>
                <p style={{ color: '#475569', fontSize: '0.875rem', lineHeight: '1.6', marginBottom: '1.5rem' }}>
                  Ticket {purchasedListing?.ticketNumber ? `(#${purchasedListing.ticketNumber})` : ''} ownership has been atomically transferred to your account. The previous seller's QR code was invalidated and a brand new cryptographic entry QR credential was issued.
                </p>
                <div style={{ display: 'flex', gap: '1rem', justifyContent: 'center' }}>
                  <Button variant="secondary" onClick={handleCancelCheckout}>
                    Back to Marketplace
                  </Button>
                  <Button variant="primary" onClick={() => navigate('/my-tickets')}>
                    View in My Tickets
                  </Button>
                </div>
              </div>
            ) : (
              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem' }}>
                  <h3 style={{ fontSize: '1.2rem', fontWeight: 800, color: '#0f172a', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <Lock size={18} color="#7c3aed" /> Resale Checkout
                  </h3>
                  <button
                    onClick={handleCancelCheckout}
                    style={{ background: 'transparent', border: 'none', color: '#64748b', cursor: 'pointer' }}
                  >
                    <X size={18} />
                  </button>
                </div>

                {checkoutError && (
                  <div style={{ marginBottom: '1rem', padding: '0.75rem', background: '#fef2f2', border: '1px solid #fecaca', color: '#b91c1c', borderRadius: '8px', fontSize: '0.85rem' }}>
                    {checkoutError}
                  </div>
                )}

                {checkoutLoading && !checkoutData ? (
                  <div style={{ textAlign: 'center', padding: '2rem 0', color: '#64748b' }}>
                    Reserving ticket and acquiring temporary checkout lock...
                  </div>
                ) : checkoutData ? (
                  <div>
                    {/* Hold Timer Alert */}
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', padding: '0.65rem 0.85rem', background: '#fffbeb', border: '1px solid #fde68a', borderRadius: '8px', color: '#b45309', fontSize: '0.8rem', marginBottom: '1rem' }}>
                      <Clock size={16} />
                      <span>Reserved for you for 10 minutes. Other buyers are blocked.</span>
                    </div>

                    {/* Ticket Summary */}
                    <div style={{ background: '#f8fafc', border: '1px solid #e2e8f0', padding: '1rem', borderRadius: '8px', marginBottom: '1.25rem', fontSize: '0.85rem' }}>
                      <div style={{ fontWeight: 700, color: '#0f172a', marginBottom: '0.25rem' }}>{checkoutData.eventTitle}</div>
                      <div style={{ color: '#64748b', fontSize: '0.8rem' }}>{checkoutData.sessionTitle}</div>
                      <div style={{ color: '#7c3aed', fontWeight: 600, marginTop: '0.35rem' }}>
                        {checkoutData.ticketTypeName} • Seat: {checkoutData.seatLabel || 'General Admission'}
                      </div>
                    </div>

                    {/* Price Breakdown */}
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', fontSize: '0.85rem', borderBottom: '1px solid #f1f5f9', paddingBottom: '0.75rem', marginBottom: '0.75rem' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', color: '#64748b' }}>
                        <span>Resale Ticket Price</span>
                        <span style={{ fontWeight: 600, color: '#0f172a' }}>₹{checkoutData.resalePrice.toFixed(2)}</span>
                      </div>
                      <div style={{ display: 'flex', justifyContent: 'space-between', color: '#64748b' }}>
                        <span>Platform Processing Fee (5%)</span>
                        <span style={{ fontWeight: 600, color: '#0f172a' }}>₹{checkoutData.processingFee.toFixed(2)}</span>
                      </div>
                      <div style={{ display: 'flex', justifyContent: 'space-between', fontWeight: 800, color: '#0f172a', fontSize: '1.05rem', marginTop: '0.25rem' }}>
                        <span>Total Checkout Amount</span>
                        <span style={{ color: '#0284c7' }}>₹{checkoutData.totalAmount.toFixed(2)}</span>
                      </div>
                    </div>

                    {/* Policy Disclosure */}
                    <p style={{ fontSize: '0.75rem', color: '#64748b', lineHeight: '1.5', marginBottom: '1.25rem' }}>
                      By confirming this purchase, the agreed total will be charged. The seller receives the net resale amount upon settlement reconciliation and their entry barcode is permanently revoked.
                    </p>

                    <div style={{ display: 'flex', gap: '1rem', justifyContent: 'flex-end' }}>
                      <Button variant="secondary" onClick={handleCancelCheckout}>
                        Cancel
                      </Button>
                      <Button
                        variant="primary"
                        isLoading={checkoutLoading}
                        onClick={handleConfirmPurchase}
                        style={{ background: 'linear-gradient(135deg, #059669 0%, #047857 100%)' }}
                      >
                        <CreditCard size={15} style={{ marginRight: '0.35rem' }} /> Confirm &amp; Pay ₹{checkoutData.totalAmount.toFixed(2)}
                      </Button>
                    </div>
                  </div>
                ) : null}
              </div>
            )}
          </div>
        </div>
      )}
      </div>
    </div>
  );
};
