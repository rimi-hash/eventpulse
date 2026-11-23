import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { apiClient } from '../services/apiClient';
import { OrderResponse, PaymentIntentResponse, PaymentResponse } from '../types/api';
import { Button } from '../components/ui/Button';
import { LoadingSpinner } from '../components/ui/LoadingSpinner';
import { ErrorAlert } from '../components/ui/ErrorAlert';
import { useAssistantAppContext } from '../context/AssistantAppContext';
import { CreditCard, QrCode, Building2, ShieldCheck, Clock, AlertTriangle, CheckCircle2, Tag } from 'lucide-react';

export const CheckoutPage: React.FC = () => {
  const { orderId } = useParams<{ orderId: string }>();
  const navigate = useNavigate();

  const [order, setOrder] = useState<OrderResponse | null>(null);
  const [paymentMethod, setPaymentMethod] = useState<'CARD' | 'UPI' | 'NETBANKING'>('CARD');
  const [countdown, setCountdown] = useState<number>(480); // 8 minutes in seconds
  const [isLoading, setIsLoading] = useState(true);
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [paymentFailed, setPaymentFailed] = useState<string | null>(null);

  // Promotional Coupon State
  const [couponCodeInput, setCouponCodeInput] = useState('');
  const [isApplyingCoupon, setIsApplyingCoupon] = useState(false);
  const [couponMessage, setCouponMessage] = useState<string | null>(null);
  const [couponError, setCouponError] = useState<string | null>(null);

  const handleApplyCoupon = async (codeToApply?: string) => {
    const code = (codeToApply || couponCodeInput).trim().toUpperCase();
    if (!code || !order) return;
    setIsApplyingCoupon(true);
    setCouponError(null);
    setCouponMessage(null);
    try {
      const res = await apiClient.post<OrderResponse>(`/orders/${order.id}/apply-coupon`, { couponCode: code });
      setOrder(res.data);
      setCouponMessage(`Promo code ${code} applied successfully!`);
      setCouponCodeInput(code);
    } catch (err: unknown) {
      if (err instanceof Error) {
        setCouponError(err.message);
      } else {
        setCouponError('Invalid coupon code or order minimum not met.');
      }
    } finally {
      setIsApplyingCoupon(false);
    }
  };

  const fetchOrder = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const res = await apiClient.get<OrderResponse>(`/orders/${orderId}`);
      setOrder(res.data);
      if (res.data.status === 'CONFIRMED') {
        navigate(`/orders/${orderId}/confirmation`);
      }
    } catch (err: unknown) {
      if (err instanceof Error) {
        setError(err.message);
      } else {
        setError('Failed to load order details');
      }
    } finally {
      setIsLoading(false);
    }
  };

  const { setPageContext, clearPageContext } = useAssistantAppContext();

  useEffect(() => {
    fetchOrder();
  }, [orderId]);

  useEffect(() => {
    if (order) {
      setPageContext({
        orderId: order.id,
        eventTitle: order.eventTitle,
        checkoutStage: order.status,
      });
    }
    return () => {
      clearPageContext();
    };
  }, [order, setPageContext, clearPageContext]);

  // Countdown timer
  useEffect(() => {
    if (countdown <= 0) return;
    const timer = setInterval(() => {
      setCountdown((prev) => Math.max(0, prev - 1));
    }, 1000);
    return () => clearInterval(timer);
  }, [countdown]);

  const handleRazorpayPayment = async () => {
    if (!order) return;
    setIsProcessing(true);
    setError(null);
    setPaymentFailed(null);

    try {
      // 1. Authoritative server-side Razorpay order creation
      const res = await apiClient.post<any>(`/payments/razorpay/order/${order.id}`);
      const rzpOrder = res.data;

      if (!window.Razorpay) {
        throw new Error('Razorpay Checkout SDK is not loaded. Please disable ad-blockers or reload the page.');
      }

      // 2. Open Razorpay Checkout modal
      const options = {
        key: rzpOrder.razorpayKeyId,
        amount: rzpOrder.amountInPaise,
        currency: rzpOrder.currency || 'INR',
        name: 'EventPulse Ticketing',
        description: `Order ${rzpOrder.orderNumber} • ${rzpOrder.eventTitle}`,
        order_id: rzpOrder.razorpayOrderId,
        prefill: {
          name: order.contactEmail?.split('@')[0] || 'Attendee',
          email: order.contactEmail,
          contact: order.contactPhone || '+919876543210',
        },
        notes: {
          orderId: order.id,
          orderNumber: order.orderNumber,
        },
        theme: {
          color: '#6366f1',
        },
        handler: async (response: {
          razorpay_payment_id: string;
          razorpay_order_id: string;
          razorpay_signature: string;
        }) => {
          setIsProcessing(true);
          try {
            // 3. Cryptographic server-side verification
            const verifyRes = await apiClient.post<PaymentResponse>('/payments/razorpay/verify', {
              orderId: order.id,
              paymentId: rzpOrder.paymentId,
              razorpayOrderId: response.razorpay_order_id,
              razorpayPaymentId: response.razorpay_payment_id,
              razorpaySignature: response.razorpay_signature,
            });

            if (verifyRes.data.status === 'SUCCESS') {
              navigate(`/orders/${order.id}/confirmation`);
            } else {
              setPaymentFailed(verifyRes.data.failureReason || 'Razorpay payment verification failed.');
            }
          } catch (verifyErr: unknown) {
            if (verifyErr instanceof Error) {
              setError(verifyErr.message);
            } else {
              setError('Payment verification failed on the server.');
            }
          } finally {
            setIsProcessing(false);
          }
        },
        modal: {
          ondismiss: () => {
            setIsProcessing(false);
          },
        },
      };

      const rzpInstance = new window.Razorpay(options);
      rzpInstance.open();

    } catch (err: unknown) {
      if (err instanceof Error) {
        setError(err.message);
      } else {
        setError('Failed to initiate Razorpay checkout.');
      }
      setIsProcessing(false);
    }
  };

  const handleProcessPayment = async (simulateDecline: boolean = false) => {
    if (!order) return;
    setIsProcessing(true);
    setError(null);
    setPaymentFailed(null);

    try {
      // 1. Create Payment Intent
      const intentRes = await apiClient.post<PaymentIntentResponse>('/payments/intent', {
        orderId: order.id,
        provider: 'MOCK',
        paymentMethod: paymentMethod,
      }, {
        headers: { 'Idempotency-Key': 'idemp-pay-' + order.id + '-' + Date.now() },
      });

      // 2. Confirm Payment Intent with Gateway Sandbox
      const confirmRes = await apiClient.post<PaymentResponse>('/payments/confirm', {
        paymentId: intentRes.data.paymentId,
        simulateFailure: simulateDecline,
        failureReason: simulateDecline ? 'Simulated card decline: Insufficient balance' : undefined,
      });

      if (confirmRes.data.status === 'SUCCESS') {
        navigate(`/orders/${order.id}/confirmation`);
      } else {
        setPaymentFailed(confirmRes.data.failureReason || 'Payment declined by card issuer.');
      }
    } catch (err: unknown) {
      if (err instanceof Error) {
        setError(err.message);
      } else {
        setError('Payment gateway error. Please try again.');
      }
    } finally {
      setIsProcessing(false);
    }
  };

  if (isLoading) {
    return (
      <div className="container" style={{ paddingTop: '5rem', textAlign: 'center' }}>
        <LoadingSpinner label="Securing order and initializing payment gateway intent..." />
      </div>
    );
  }

  if (error && !order) {
    return (
      <div className="container" style={{ paddingTop: '3rem' }}>
        <ErrorAlert title="Order Notice" message={error} onRetry={fetchOrder} inline />
      </div>
    );
  }

  if (!order) return null;

  const minutes = Math.floor(countdown / 60);
  const seconds = countdown % 60;
  const timerFormatted = `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;

  return (
    <div style={{ backgroundColor: 'var(--bg-primary)', minHeight: '100vh', paddingTop: '2.5rem', paddingBottom: '5rem' }}>
      <div className="container" style={{ maxWidth: '1080px' }}>
        {/* Step Indicator */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '1rem',
            marginBottom: '1.75rem',
            fontSize: '0.85rem',
            color: 'var(--text-secondary)',
          }}
        >
          <span style={{ color: 'var(--status-success)', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
            <CheckCircle2 size={16} /> 1. Seats Selected
          </span>
          <span style={{ color: 'var(--border-medium)' }}>—</span>
          <span style={{ color: 'var(--brand-primary)', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
            <Clock size={16} /> 2. Ephemeral Hold
          </span>
          <span style={{ color: 'var(--border-medium)' }}>—</span>
          <span style={{ color: 'var(--text-muted)' }}>
            3. Confirmation &amp; Passes
          </span>
        </div>

        {/* Top Hold Banner */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            padding: '1.1rem 1.5rem',
            backgroundColor: countdown > 60 ? '#ffffff' : '#fef2f2',
            borderRadius: 'var(--radius-lg)',
            border: countdown > 60 ? '1px solid var(--border-medium)' : '1px solid #fecaca',
            boxShadow: 'var(--shadow-sm)',
            marginBottom: '2rem',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            <div
              style={{
                width: '40px',
                height: '40px',
                borderRadius: 'var(--radius-md)',
                backgroundColor: countdown > 60 ? 'var(--brand-subtle)' : '#fee2e2',
                color: countdown > 60 ? 'var(--brand-primary)' : 'var(--status-danger)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                flexShrink: 0,
              }}
            >
              <Clock size={20} />
            </div>
            <div>
              <div style={{ fontWeight: 800, fontSize: '0.98rem', color: 'var(--text-primary)' }}>
                Seats Locked in Ephemeral Hold
              </div>
              <div style={{ fontSize: '0.82rem', color: 'var(--text-secondary)', marginTop: '0.15rem' }}>
                Complete payment before the timer expires to prevent atomic release back to the inventory pool.
              </div>
            </div>
          </div>

          <div
            style={{
              fontSize: '1.6rem',
              fontWeight: 800,
              color: countdown > 60 ? 'var(--brand-primary)' : 'var(--status-danger)',
              fontFamily: 'monospace',
              letterSpacing: '0.05em',
              backgroundColor: countdown > 60 ? 'var(--brand-subtle)' : '#fee2e2',
              padding: '0.35rem 0.85rem',
              borderRadius: 'var(--radius-md)',
            }}
          >
            {timerFormatted}
          </div>
        </div>

        {paymentFailed && (
          <div
            style={{
              padding: '1.25rem 1.5rem',
              backgroundColor: '#0f172a',
              border: '1px solid rgba(239, 68, 68, 0.5)',
              borderLeft: '5px solid #ef4444',
              borderRadius: 'var(--radius-lg)',
              color: '#f8fafc',
              boxShadow: '0 12px 28px rgba(0, 0, 0, 0.4), 0 0 20px rgba(239, 68, 68, 0.2)',
              marginBottom: '1.75rem',
              display: 'flex',
              alignItems: 'flex-start',
              gap: '1rem',
            }}
          >
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                width: '36px',
                height: '36px',
                borderRadius: '50%',
                backgroundColor: 'rgba(239, 68, 68, 0.2)',
                border: '1px solid rgba(239, 68, 68, 0.45)',
                color: '#ef4444',
                flexShrink: 0,
                marginTop: '1px',
              }}
            >
              <AlertTriangle size={20} strokeWidth={2.4} />
            </div>
            <div style={{ flex: 1 }}>
              <div style={{ fontWeight: 800, fontSize: '1.05rem', marginBottom: '0.3rem', color: '#ffffff' }}>
                Payment Declined &amp; Hold Released
              </div>
              <div style={{ fontSize: '0.9rem', color: '#f1f5f9', lineHeight: 1.45 }}>
                {paymentFailed} The temporary hold has expired or was declined.
              </div>
              <div style={{ marginTop: '0.85rem' }}>
                <Button size="sm" variant="secondary" onClick={() => navigate('/')}>
                  Back to Explore Events
                </Button>
              </div>
            </div>
          </div>
        )}

        {error && <ErrorAlert title="Checkout Notice" message={error} onClose={() => setError(null)} />}

        <div style={{ display: 'grid', gridTemplateColumns: '1.4fr 1fr', gap: '2rem', alignItems: 'start' }}>
          {/* Left: Payment Gateway Sandbox Simulator */}
          <div>
            <div
              style={{
                backgroundColor: '#ffffff',
                border: '1px solid var(--border-subtle)',
                borderRadius: 'var(--radius-xl)',
                padding: '2rem',
                boxShadow: 'var(--shadow-sm)',
                marginBottom: '1.5rem',
              }}
            >
              <h2 style={{ fontSize: '1.35rem', fontWeight: 800, color: 'var(--text-primary)', marginBottom: '0.3rem' }}>
                Payment Method
              </h2>
              <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', marginBottom: '1.5rem' }}>
                Select an authorized settlement channel to complete this booking.
              </p>

              {/* Payment Method Tabs */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '0.75rem', marginBottom: '1.5rem' }}>
                <button
                  onClick={() => setPaymentMethod('CARD')}
                  style={{
                    padding: '1.1rem 0.75rem',
                    borderRadius: 'var(--radius-md)',
                    backgroundColor: paymentMethod === 'CARD' ? 'var(--brand-subtle)' : '#ffffff',
                    border: paymentMethod === 'CARD' ? '2px solid var(--brand-primary)' : '1px solid var(--border-medium)',
                    color: paymentMethod === 'CARD' ? 'var(--brand-primary)' : 'var(--text-primary)',
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    gap: '0.5rem',
                    cursor: 'pointer',
                    fontWeight: 700,
                    fontSize: '0.88rem',
                    transition: 'all var(--transition-fast)',
                  }}
                >
                  <CreditCard size={22} color={paymentMethod === 'CARD' ? 'var(--brand-primary)' : 'var(--text-secondary)'} />
                  <span>Card</span>
                </button>

                <button
                  onClick={() => setPaymentMethod('UPI')}
                  style={{
                    padding: '1.1rem 0.75rem',
                    borderRadius: 'var(--radius-md)',
                    backgroundColor: paymentMethod === 'UPI' ? 'var(--brand-subtle)' : '#ffffff',
                    border: paymentMethod === 'UPI' ? '2px solid var(--brand-primary)' : '1px solid var(--border-medium)',
                    color: paymentMethod === 'UPI' ? 'var(--brand-primary)' : 'var(--text-primary)',
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    gap: '0.5rem',
                    cursor: 'pointer',
                    fontWeight: 700,
                    fontSize: '0.88rem',
                    transition: 'all var(--transition-fast)',
                  }}
                >
                  <QrCode size={22} color={paymentMethod === 'UPI' ? 'var(--brand-primary)' : 'var(--text-secondary)'} />
                  <span>UPI / QR</span>
                </button>

                <button
                  onClick={() => setPaymentMethod('NETBANKING')}
                  style={{
                    padding: '1.1rem 0.75rem',
                    borderRadius: 'var(--radius-md)',
                    backgroundColor: paymentMethod === 'NETBANKING' ? 'var(--brand-subtle)' : '#ffffff',
                    border: paymentMethod === 'NETBANKING' ? '2px solid var(--brand-primary)' : '1px solid var(--border-medium)',
                    color: paymentMethod === 'NETBANKING' ? 'var(--brand-primary)' : 'var(--text-primary)',
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    gap: '0.5rem',
                    cursor: 'pointer',
                    fontWeight: 700,
                    fontSize: '0.88rem',
                    transition: 'all var(--transition-fast)',
                  }}
                >
                  <Building2 size={22} color={paymentMethod === 'NETBANKING' ? 'var(--brand-primary)' : 'var(--text-secondary)'} />
                  <span>NetBanking</span>
                </button>
              </div>

              {/* Payment Details Display */}
              <div
                style={{
                  padding: '1.25rem',
                  backgroundColor: 'var(--bg-primary)',
                  borderRadius: 'var(--radius-md)',
                  border: '1px solid var(--border-subtle)',
                  marginBottom: '1.75rem',
                  fontSize: '0.88rem',
                }}
              >
                {paymentMethod === 'CARD' && (
                  <div>
                    <div style={{ color: 'var(--text-secondary)', fontSize: '0.8rem', marginBottom: '0.4rem', fontWeight: 600 }}>
                      Sandbox Test Card (Pre-Authorized):
                    </div>
                    <div style={{ fontFamily: 'monospace', fontSize: '1rem', fontWeight: 700, letterSpacing: '0.1em', color: 'var(--text-primary)' }}>
                      •••• •••• •••• 4242 &nbsp;|&nbsp; 12/28 &nbsp;|&nbsp; CVC: 123
                    </div>
                  </div>
                )}
                {paymentMethod === 'UPI' && (
                  <div>
                    <div style={{ color: 'var(--text-secondary)', fontSize: '0.8rem', marginBottom: '0.4rem', fontWeight: 600 }}>
                      Instant UPI Virtual Payment Address (VPA):
                    </div>
                    <div style={{ fontFamily: 'monospace', fontSize: '0.95rem', fontWeight: 700, color: 'var(--brand-primary)' }}>
                      {order.contactEmail.split('@')[0]}@okhdfcbank
                    </div>
                  </div>
                )}
                {paymentMethod === 'NETBANKING' && (
                  <div>
                    <div style={{ color: 'var(--text-secondary)', fontSize: '0.8rem', marginBottom: '0.4rem', fontWeight: 600 }}>
                      Selected Clearing Institution:
                    </div>
                    <div style={{ fontWeight: 700, color: 'var(--text-primary)' }}>
                      HDFC Bank Direct Clearing
                    </div>
                  </div>
                )}
              </div>

              {/* Primary Action: Razorpay Payment Gateway */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', marginBottom: '1.5rem' }}>
                <Button
                  variant="primary"
                  size="lg"
                  isLoading={isProcessing}
                  onClick={handleRazorpayPayment}
                  style={{
                    width: '100%',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '0.6rem',
                    fontSize: '1.05rem',
                    fontWeight: 800,
                    padding: '0.95rem',
                    backgroundColor: 'var(--brand-primary)',
                    boxShadow: 'var(--shadow-md)',
                  }}
                >
                  <CreditCard size={18} />
                  <span>Pay ₹{order.totalAmount.toLocaleString()} with Razorpay</span>
                </Button>
                <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', textAlign: 'center' }}>
                  Supports all Indian Debit/Credit Cards, UPI, NetBanking &amp; Digital Wallets
                </div>
              </div>

              {/* Secondary Action: Developer / Test Simulation */}
              <div style={{ borderTop: '1px solid var(--border-subtle)', paddingTop: '1.25rem' }}>
                <div style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-secondary)', textTransform: 'uppercase', marginBottom: '0.6rem', letterSpacing: '0.04em' }}>
                  Sandbox Development Testing
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.6rem' }}>
                  <Button
                    variant="secondary"
                    size="sm"
                    disabled={isProcessing}
                    onClick={() => handleProcessPayment(false)}
                    style={{ width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.4rem', fontWeight: 600 }}
                  >
                    <CheckCircle2 size={15} color="var(--status-success)" />
                    <span>Instant Sandbox Approval (Mock Gateway)</span>
                  </Button>

                  <Button
                    variant="secondary"
                    size="sm"
                    disabled={isProcessing}
                    onClick={() => handleProcessPayment(true)}
                    style={{ width: '100%', color: 'var(--status-danger)', border: '1px solid rgba(239, 68, 68, 0.3)', fontWeight: 600 }}
                  >
                    Simulate Card Decline (Test Inventory Release)
                  </Button>
                </div>
              </div>
            </div>
          </div>

        {/* Right: Order Pricing Breakdown */}
        <div>
          <div
            style={{
              backgroundColor: '#ffffff',
              border: '1px solid var(--border-subtle)',
              borderRadius: 'var(--radius-xl)',
              padding: '1.75rem',
              boxShadow: 'var(--shadow-sm)',
            }}
          >
            <h3 style={{ fontSize: '1.25rem', fontWeight: 800, color: 'var(--text-primary)', marginBottom: '1rem' }}>
              Order Summary
            </h3>

            <div style={{ fontSize: '0.88rem', color: 'var(--text-secondary)', marginBottom: '1.25rem' }}>
              <div style={{ fontWeight: 800, color: 'var(--text-primary)', fontSize: '1.05rem', marginBottom: '0.25rem' }}>
                {order.eventTitle}
              </div>
              <div style={{ color: 'var(--brand-primary)', fontWeight: 600, fontSize: '0.82rem', marginBottom: '0.2rem' }}>
                {order.sessionTitle}
              </div>
              <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
                {order.venueName}, {order.venueCity}
              </div>
            </div>

            <div style={{ borderTop: '1px solid var(--border-subtle)', paddingTop: '1rem', marginBottom: '1.25rem' }}>
              <div style={{ fontSize: '0.78rem', fontWeight: 700, color: 'var(--text-secondary)', textTransform: 'uppercase', marginBottom: '0.6rem', letterSpacing: '0.04em' }}>
                Allocated Passes ({order.items.length})
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.6rem' }}>
                {order.items.map((item) => (
                  <div key={item.id} style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.88rem' }}>
                    <span style={{ color: 'var(--text-primary)', fontWeight: 600 }}>{item.seatLabel || item.ticketTypeName}</span>
                    <span style={{ fontWeight: 700, color: 'var(--text-primary)' }}>₹{item.unitPrice.toLocaleString()}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Coupon / Promotional Code Section */}
            <div style={{ borderTop: '1px solid var(--border-subtle)', paddingTop: '1rem', marginBottom: '1.25rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', fontSize: '0.85rem', fontWeight: 700, marginBottom: '0.6rem', color: 'var(--text-primary)' }}>
                <Tag size={16} color="var(--brand-primary)" />
                <span>Apply Promo Code</span>
              </div>

              <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '0.6rem' }}>
                <input
                  type="text"
                  placeholder="e.g. EARLYBIRD10"
                  value={couponCodeInput}
                  onChange={(e) => setCouponCodeInput(e.target.value.toUpperCase())}
                  disabled={isApplyingCoupon}
                  style={{
                    flex: 1,
                    padding: '0.6rem 0.85rem',
                    borderRadius: 'var(--radius-md)',
                    border: '1px solid var(--border-medium)',
                    backgroundColor: 'var(--bg-primary)',
                    color: 'var(--text-primary)',
                    fontSize: '0.85rem',
                    fontWeight: 700,
                    textTransform: 'uppercase',
                    letterSpacing: '0.05em',
                  }}
                />
                <Button
                  size="sm"
                  variant="secondary"
                  isLoading={isApplyingCoupon}
                  onClick={() => handleApplyCoupon()}
                  style={{ fontWeight: 700 }}
                >
                  Apply
                </Button>
              </div>

              {/* Demo promo code quick chips */}
              <div style={{ display: 'flex', gap: '0.4rem', flexWrap: 'wrap', alignItems: 'center' }}>
                <span style={{ fontSize: '0.72rem', color: 'var(--text-secondary)' }}>Try:</span>
                <button
                  type="button"
                  onClick={() => handleApplyCoupon('EARLYBIRD10')}
                  style={{
                    fontSize: '0.72rem',
                    fontWeight: 700,
                    padding: '0.2rem 0.5rem',
                    borderRadius: 'var(--radius-full)',
                    border: '1px solid var(--brand-primary)',
                    background: 'var(--brand-subtle)',
                    color: 'var(--brand-primary)',
                    cursor: 'pointer',
                  }}
                >
                  EARLYBIRD10 (10% off)
                </button>
                <button
                  type="button"
                  onClick={() => handleApplyCoupon('FESTIVE500')}
                  style={{
                    fontSize: '0.72rem',
                    fontWeight: 700,
                    padding: '0.2rem 0.5rem',
                    borderRadius: 'var(--radius-full)',
                    border: '1px solid var(--status-success)',
                    background: 'var(--status-success-bg)',
                    color: 'var(--status-success)',
                    cursor: 'pointer',
                  }}
                >
                  FESTIVE500 (₹500 off)
                </button>
              </div>

              {couponMessage && (
                <div style={{ marginTop: '0.5rem', fontSize: '0.8rem', color: 'var(--status-success)', fontWeight: 700 }}>
                  ✓ {couponMessage}
                </div>
              )}
              {couponError && (
                <div style={{ marginTop: '0.5rem', fontSize: '0.8rem', color: 'var(--status-danger)', fontWeight: 600 }}>
                  ✕ {couponError}
                </div>
              )}
            </div>

            <div style={{ borderTop: '1px solid var(--border-subtle)', paddingTop: '1rem', display: 'flex', flexDirection: 'column', gap: '0.55rem', fontSize: '0.88rem' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', color: 'var(--text-secondary)' }}>
                <span>Passes Subtotal</span>
                <span style={{ fontWeight: 600, color: 'var(--text-primary)' }}>₹{order.subtotalAmount.toLocaleString()}</span>
              </div>
              {order.discountAmount > 0 && (
                <div style={{ display: 'flex', justifyContent: 'space-between', color: 'var(--status-success)' }}>
                  <span>Promo Discount</span>
                  <span style={{ fontWeight: 700 }}>-₹{order.discountAmount.toLocaleString()}</span>
                </div>
              )}
              <div style={{ display: 'flex', justifyContent: 'space-between', color: 'var(--text-secondary)' }}>
                <span>Platform &amp; Convenience Fee</span>
                <span style={{ fontWeight: 600, color: 'var(--text-primary)' }}>₹{order.serviceFeeAmount.toLocaleString()}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', color: 'var(--text-secondary)' }}>
                <span>Integrated GST (18%)</span>
                <span style={{ fontWeight: 600, color: 'var(--text-primary)' }}>₹{order.taxAmount.toLocaleString()}</span>
              </div>
              <div
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'baseline',
                  fontSize: '1.3rem',
                  fontWeight: 800,
                  color: 'var(--text-primary)',
                  paddingTop: '0.75rem',
                  borderTop: '1px solid var(--border-subtle)',
                  marginTop: '0.5rem',
                }}
              >
                <span>Total Due</span>
                <span style={{ color: 'var(--brand-primary)', fontSize: '1.45rem' }}>
                  ₹{order.totalAmount.toLocaleString()}
                </span>
              </div>
            </div>

            <div
              style={{
                marginTop: '1.5rem',
                padding: '0.85rem',
                backgroundColor: 'var(--bg-primary)',
                borderRadius: 'var(--radius-md)',
                display: 'flex',
                alignItems: 'center',
                gap: '0.5rem',
                color: 'var(--text-secondary)',
                fontSize: '0.78rem',
              }}
            >
              <ShieldCheck size={18} color="var(--status-success)" style={{ flexShrink: 0 }} />
              <span>TLS 1.3 256-bit encrypted checkout with Razorpay webhook verification.</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
  );
};
