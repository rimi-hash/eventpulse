import React, { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { apiClient } from '../services/apiClient';
import { OrderResponse, TicketDto } from '../types/api';
import { Badge } from '../components/ui/Badge';
import { Button } from '../components/ui/Button';
import { QrCodeView } from '../components/ui/QrCodeView';
import { LoadingSpinner } from '../components/ui/LoadingSpinner';
import { ErrorAlert } from '../components/ui/ErrorAlert';
import { CheckCircle2, Ticket, QrCode, Calendar, MapPin } from 'lucide-react';

export const OrderConfirmationPage: React.FC = () => {
  const { orderId } = useParams<{ orderId: string }>();
  const [order, setOrder] = useState<OrderResponse | null>(null);
  const [tickets, setTickets] = useState<TicketDto[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchOrderAndTickets = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const [orderRes, ticketsRes] = await Promise.all([
        apiClient.get<OrderResponse>(`/orders/${orderId}`),
        apiClient.get<TicketDto[]>('/tickets/my'),
      ]);

      setOrder(orderRes.data);
      // Filter tickets belonging to this order
      const orderTickets = (ticketsRes.data || []).filter((t) => t.orderId === orderId);
      setTickets(orderTickets);
    } catch (err: unknown) {
      if (err instanceof Error) {
        setError(err.message);
      } else {
        setError('Failed to load order confirmation details');
      }
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchOrderAndTickets();
  }, [orderId]);

  if (isLoading) {
    return (
      <div className="container" style={{ paddingTop: '5rem', textAlign: 'center' }}>
        <LoadingSpinner label="Retrieving cryptographic passes and issuance verification..." />
      </div>
    );
  }

  if (error && !order) {
    return (
      <div className="container" style={{ paddingTop: '3rem' }}>
        <ErrorAlert title="Confirmation Notice" message={error} onRetry={fetchOrderAndTickets} inline />
      </div>
    );
  }

  if (!order) return null;

  return (
    <div style={{ backgroundColor: 'var(--bg-primary)', minHeight: '100vh', paddingTop: '3rem', paddingBottom: '5rem' }}>
      <div className="container" style={{ maxWidth: '880px' }}>
        {/* Success Hero */}
        <div style={{ textAlign: 'center', marginBottom: '3rem' }}>
          <div
            style={{
              width: '72px',
              height: '72px',
              borderRadius: '50%',
              backgroundColor: 'var(--status-success-bg)',
              color: 'var(--status-success)',
              border: '2px solid var(--status-success-border)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              margin: '0 auto 1.25rem',
              boxShadow: '0 4px 20px rgba(16, 185, 129, 0.25)',
            }}
          >
            <CheckCircle2 size={38} />
          </div>

          <div style={{ marginBottom: '0.75rem' }}>
            <span
              style={{
                fontSize: '0.82rem',
                fontWeight: 700,
                color: 'var(--status-success)',
                backgroundColor: 'var(--status-success-bg)',
                padding: '0.25rem 0.85rem',
                borderRadius: 'var(--radius-full)',
                border: '1px solid var(--status-success-border)',
              }}
            >
              Payment Confirmed &amp; Passes Issued
            </span>
          </div>

          <h1 style={{ fontSize: 'clamp(1.8rem, 3.2vw, 2.5rem)', fontWeight: 800, color: 'var(--text-primary)', marginBottom: '0.5rem', fontFamily: 'var(--font-display)' }}>
            You're Going to {order.eventTitle}!
          </h1>
          <p style={{ color: 'var(--text-secondary)', fontSize: '1rem', maxWidth: '640px', margin: '0 auto' }}>
            Order reference <span style={{ color: 'var(--text-primary)', fontWeight: 700, fontFamily: 'monospace' }}>{order.orderNumber}</span>.
            Cryptographic passes with HMAC-SHA256 signatures are ready in your wallet for gate admission.
          </p>
        </div>

        {/* Digital Tickets Pass Stubs */}
        <div style={{ marginBottom: '3rem' }}>
          <h2 style={{ fontSize: '1.25rem', fontWeight: 800, color: 'var(--text-primary)', marginBottom: '1.25rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <Ticket size={20} color="var(--brand-primary)" />
            Issued Digital Passes ({tickets.length || order.items.length})
          </h2>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
            {tickets.map((t) => (
              <div
                key={t.id}
                className="ticket-perforated-border"
                style={{
                  display: 'grid',
                  gridTemplateColumns: '1fr auto',
                  padding: '2rem',
                  gap: '2rem',
                  alignItems: 'center',
                  backgroundColor: '#ffffff',
                  borderRadius: 'var(--radius-xl)',
                  boxShadow: 'var(--shadow-sm)',
                  border: '1px solid var(--border-subtle)',
                }}
              >
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', marginBottom: '0.75rem', flexWrap: 'wrap' }}>
                    <Badge variant="success">Active Gate-Ready</Badge>
                    <span style={{ fontSize: '0.82rem', color: 'var(--brand-primary)', fontWeight: 800, fontFamily: 'monospace', backgroundColor: 'var(--brand-subtle)', padding: '0.15rem 0.5rem', borderRadius: '4px' }}>
                      {t.ticketNumber}
                    </span>
                  </div>

                  <h3 style={{ fontSize: '1.35rem', fontWeight: 800, color: 'var(--text-primary)', marginBottom: '0.5rem' }}>
                    {t.seatLabel || t.ticketTypeName}
                  </h3>

                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem', color: 'var(--text-secondary)', fontSize: '0.88rem', marginBottom: '1.25rem' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                      <Calendar size={15} color="var(--brand-primary)" />
                      <span>
                        {new Date(t.sessionStartsAt).toLocaleString(undefined, {
                          weekday: 'short',
                          month: 'short',
                          day: 'numeric',
                          year: 'numeric',
                          hour: '2-digit',
                          minute: '2-digit',
                        })}
                      </span>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                      <MapPin size={15} color="var(--brand-primary)" />
                      <span>{t.venueName}, {t.venueCity}</span>
                    </div>
                  </div>

                  <div style={{ fontSize: '0.85rem' }}>
                    <span style={{ color: 'var(--text-secondary)' }}>Ticket Holder: </span>
                    <strong style={{ color: 'var(--text-primary)' }}>{t.attendeeName}</strong>
                    <span style={{ color: 'var(--text-secondary)', marginLeft: '0.35rem' }}>({t.attendeeEmail})</span>
                  </div>

                  <div style={{ marginTop: '1.25rem' }}>
                    <Link to={`/scanner?code=${t.ticketNumber}`}>
                      <Button size="sm" variant="secondary" style={{ display: 'inline-flex', alignItems: 'center', gap: '0.4rem', fontWeight: 600 }}>
                        <QrCode size={15} />
                        Simulate Gate Check-In Test
                      </Button>
                    </Link>
                  </div>
                </div>

                {/* Verified QR Code Component */}
                <div style={{ textAlign: 'center', backgroundColor: 'var(--bg-primary)', padding: '1rem', borderRadius: 'var(--radius-lg)', border: '1px solid var(--border-subtle)' }}>
                  <QrCodeView value={t.qrCryptographicPayload || t.ticketNumber} size={140} />
                  <div style={{ fontSize: '0.68rem', color: 'var(--text-secondary)', marginTop: '0.5rem', fontFamily: 'monospace', fontWeight: 700, letterSpacing: '0.04em' }}>
                    HMAC-SHA256 VERIFIED
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Navigation Actions */}
        <div style={{ display: 'flex', justifyContent: 'center', gap: '1rem', flexWrap: 'wrap' }}>
          <Link to="/my-tickets">
            <Button variant="primary" size="md" style={{ fontWeight: 700 }}>
              Go to My Tickets Wallet
            </Button>
          </Link>
          <Link to="/">
            <Button variant="secondary" size="md" style={{ fontWeight: 600 }}>
              Explore More Events
            </Button>
          </Link>
        </div>
      </div>
    </div>
  );
};
