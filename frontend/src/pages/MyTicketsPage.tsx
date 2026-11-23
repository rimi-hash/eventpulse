import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { apiClient } from '../services/apiClient';
import { useAuth } from '../context/AuthContext';
import { TicketDto, ResaleListingDto } from '../types/api';
import { Card } from '../components/ui/Card';
import { Badge } from '../components/ui/Badge';
import { Button } from '../components/ui/Button';
import { QrCodeView } from '../components/ui/QrCodeView';
import { LoadingSpinner } from '../components/ui/LoadingSpinner';
import { ErrorAlert } from '../components/ui/ErrorAlert';
import { Ticket, Calendar, MapPin, QrCode, Send, CheckCircle2, X, Tag, Shield } from 'lucide-react';

export const MyTicketsPage: React.FC = () => {
  const { user } = useAuth();
  const [tickets, setTickets] = useState<TicketDto[]>([]);
  const [myResales, setMyResales] = useState<ResaleListingDto[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Transfer Modal State
  const [transferTicketId, setTransferTicketId] = useState<string | null>(null);
  const [recipientEmail, setRecipientEmail] = useState('');
  const [transferring, setTransferring] = useState(false);
  const [transferSuccess, setTransferSuccess] = useState<string | null>(null);
  const [transferSuccessModal, setTransferSuccessModal] = useState<{
    recipientEmail: string;
    ticketName: string;
  } | null>(null);

  // Resale Modal State
  const [resaleModalTicket, setResaleModalTicket] = useState<TicketDto | null>(null);
  const [resalePrice, setResalePrice] = useState<string>('');
  const [resaleSubmitting, setResaleSubmitting] = useState(false);
  const [resaleError, setResaleError] = useState<string | null>(null);
  const [cancellingResaleId, setCancellingResaleId] = useState<string | null>(null);

  // QR Modal State
  const [qrModalTicket, setQrModalTicket] = useState<TicketDto | null>(null);

  const fetchTickets = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const [tRes, rRes] = await Promise.all([
        apiClient.get<TicketDto[]>('/tickets/my'),
        apiClient.get<ResaleListingDto[]>('/resale/my').catch(() => ({ data: [] })),
      ]);
      setTickets(tRes.data || []);
      setMyResales(rRes.data || []);
    } catch (err: unknown) {
      if (err instanceof Error) {
        setError(err.message);
      } else {
        setError('Failed to fetch digital tickets from wallet');
      }
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchTickets();
  }, [user]);

  const handleTransfer = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!transferTicketId || !recipientEmail) return;

    const ticketToTransfer = tickets.find((t) => t.id === transferTicketId);
    const eventOrSeat = ticketToTransfer
      ? `${ticketToTransfer.eventTitle} (${ticketToTransfer.seatLabel || ticketToTransfer.ticketTypeName})`
      : 'Digital Pass';

    setTransferring(true);
    setError(null);
    try {
      const targetEmail = recipientEmail.trim();
      await apiClient.post(`/tickets/${transferTicketId}/transfer`, {
        recipientEmail: targetEmail,
      });
      setTransferSuccessModal({
        recipientEmail: targetEmail,
        ticketName: eventOrSeat,
      });
      setTransferSuccess(`Ticket transferred to ${targetEmail} successfully!`);
      setTransferTicketId(null);
      setRecipientEmail('');
      fetchTickets();
    } catch (err: unknown) {
      if (err instanceof Error) {
        setError(err.message);
      } else {
        setError('Transfer failed. Please verify recipient email.');
      }
    } finally {
      setTransferring(false);
    }
  };

  const handleOpenResaleModal = (ticket: TicketDto) => {
    setResaleModalTicket(ticket);
    const orig = ticket.originalPrice || 1000;
    // Suggest 15% discount below original price as default
    setResalePrice((orig * 0.85).toFixed(0));
    setResaleError(null);
  };

  const handleConfirmResale = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!resaleModalTicket) return;

    const priceNum = parseFloat(resalePrice);
    const original = resaleModalTicket.originalPrice || 1000;

    if (isNaN(priceNum) || priceNum <= 0) {
      setResaleError('Please enter a valid positive resale price.');
      return;
    }

    if (priceNum >= original) {
      setResaleError(`Anti-Scalping Rule Violation: Resale price (₹${priceNum}) must be strictly lower than face value (₹${original}).`);
      return;
    }

    setResaleSubmitting(true);
    setResaleError(null);
    try {
      await apiClient.post('/resale/list', {
        ticketId: resaleModalTicket.id,
        resalePrice: priceNum,
      });
      setTransferSuccess(`Ticket listed on Verified Fan Resale Market for ₹${priceNum.toLocaleString()}!`);
      setResaleModalTicket(null);
      fetchTickets();
    } catch (err: unknown) {
      if (err instanceof Error) {
        setResaleError(err.message);
      } else {
        setResaleError('Failed to list ticket for resale.');
      }
    } finally {
      setResaleSubmitting(false);
    }
  };

  const handleCancelResale = async (listingId: string) => {
    setCancellingResaleId(listingId);
    setError(null);
    try {
      await apiClient.post(`/resale/${listingId}/cancel`);
      setTransferSuccess('Resale listing cancelled. Ticket returned to active status in your wallet.');
      fetchTickets();
    } catch (err: unknown) {
      if (err instanceof Error) {
        setError(err.message);
      } else {
        setError('Failed to cancel resale listing.');
      }
    } finally {
      setCancellingResaleId(null);
    }
  };

  return (
    <div className="container" style={{ paddingTop: '2.5rem', paddingBottom: '4rem' }}>
      <div style={{ marginBottom: '2.5rem' }}>
        <h1 style={{ fontSize: '2.2rem', fontWeight: 800, marginBottom: '0.4rem', fontFamily: 'var(--font-display)' }}>
          Digital Pass Wallet
        </h1>
        <p style={{ color: 'var(--text-secondary)', fontSize: '1rem' }}>
          Your verified passes, holographic entry codes, and ticket transfer controls.
        </p>
      </div>

      {transferSuccess && (
        <div
          style={{
            padding: '1rem 1.25rem',
            backgroundColor: 'var(--status-success-bg)',
            color: 'var(--status-success)',
            borderRadius: 'var(--radius-md)',
            marginBottom: '1.5rem',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <CheckCircle2 size={18} />
            <span>{transferSuccess}</span>
          </div>
          <button onClick={() => setTransferSuccess(null)} style={{ color: 'inherit', cursor: 'pointer' }}>
            <X size={16} />
          </button>
        </div>
      )}

      {error && <ErrorAlert title="Wallet Notice" message={error} onRetry={fetchTickets} onClose={() => setError(null)} />}

      {isLoading && <LoadingSpinner label="Decrypting and loading passes from wallet..." />}

      {!isLoading && tickets.length === 0 && (
        <Card style={{ textAlign: 'center', padding: '4rem 1.5rem' }}>
          <Ticket size={48} color="var(--text-muted)" style={{ margin: '0 auto 1rem' }} />
          <h3 style={{ fontSize: '1.3rem', fontWeight: 700, marginBottom: '0.5rem' }}>
            No Digital Passes in Wallet Yet
          </h3>
          <p style={{ color: 'var(--text-secondary)', marginBottom: '1.5rem', maxWidth: '420px', margin: '0 auto 1.5rem' }}>
            Browse upcoming festivals, concerts, and tech summits to reserve your seats.
          </p>
          <Link to="/">
            <Button variant="primary">Explore Upcoming Events</Button>
          </Link>
        </Card>
      )}

      {/* Tickets List */}
      {!isLoading && tickets.length > 0 && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(360px, 1fr))', gap: '1.75rem' }}>
          {tickets.map((t) => {
            const isUsed = t.status === 'USED';
            const activeResale = myResales.find((r) => r.ticketId === t.id && r.status === 'ACTIVE');

            return (
              <div
                key={t.id}
                className="ticket-perforated-border"
                style={{
                  display: 'flex',
                  flexDirection: 'column',
                  padding: 0,
                  overflow: 'hidden',
                  backgroundColor: '#ffffff',
                  borderRadius: 'var(--radius-xl)',
                  boxShadow: 'var(--shadow-sm)',
                  border: isUsed ? '1px solid var(--border-subtle)' : '1px solid var(--border-medium)',
                  opacity: isUsed ? 0.75 : 1,
                  transition: 'all var(--transition-fast)',
                }}
              >
                {/* Header Strip */}
                <div
                  style={{
                    padding: '1rem 1.25rem',
                    backgroundColor: isUsed ? 'var(--bg-primary)' : 'var(--brand-subtle)',
                    borderBottom: '1px solid var(--border-subtle)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                  }}
                >
                  <span style={{ fontSize: '0.82rem', fontFamily: 'monospace', fontWeight: 800, color: isUsed ? 'var(--text-secondary)' : 'var(--brand-primary)', letterSpacing: '0.04em' }}>
                    {t.ticketNumber}
                  </span>
                  <Badge variant={isUsed ? 'neutral' : 'success'}>
                    {isUsed ? 'USED / ADMITTED' : t.status}
                  </Badge>
                </div>

                {/* Content */}
                <div style={{ padding: '1.5rem', flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
                  <div>
                    <h3 style={{ fontSize: '1.25rem', fontWeight: 800, lineHeight: 1.25, marginBottom: '0.35rem', color: 'var(--text-primary)' }}>
                      {t.eventTitle}
                    </h3>
                    <div style={{ fontSize: '0.95rem', fontWeight: 700, color: 'var(--brand-primary)', marginBottom: '1rem' }}>
                      {t.seatLabel || t.ticketTypeName}
                    </div>

                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.45rem', fontSize: '0.85rem', color: 'var(--text-secondary)', marginBottom: '1.25rem' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                        <Calendar size={15} color="var(--brand-primary)" />
                        <span>
                          {new Date(t.sessionStartsAt).toLocaleString(undefined, {
                            weekday: 'short',
                            month: 'short',
                            day: 'numeric',
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
                  </div>

                  {/* QR Preview & Action Buttons */}
                  <div style={{ borderTop: '1px solid var(--border-subtle)', paddingTop: '1.25rem' }}>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.75rem' }}>
                      <div>
                        <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>Ticket Holder:</div>
                        <div style={{ fontSize: '0.88rem', fontWeight: 700, color: 'var(--text-primary)' }}>{t.attendeeName}</div>
                      </div>

                      <button
                        onClick={() => setQrModalTicket(t)}
                        style={{
                          padding: '0.45rem 0.85rem',
                          backgroundColor: 'var(--bg-primary)',
                          border: '1px solid var(--border-medium)',
                          borderRadius: 'var(--radius-md)',
                          display: 'flex',
                          alignItems: 'center',
                          gap: '0.4rem',
                          color: 'var(--text-primary)',
                          fontSize: '0.82rem',
                          fontWeight: 700,
                          cursor: 'pointer',
                        }}
                      >
                        <QrCode size={16} color="var(--brand-primary)" />
                        View QR
                      </button>
                    </div>

                    {activeResale && (
                      <div style={{ marginBottom: '0.75rem' }}>
                        <span
                          style={{
                            fontSize: '0.75rem',
                            fontWeight: 700,
                            backgroundColor: 'var(--brand-subtle)',
                            color: 'var(--brand-primary)',
                            padding: '0.25rem 0.6rem',
                            borderRadius: 'var(--radius-full)',
                            border: '1px solid rgba(8, 79, 232, 0.3)',
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '0.3rem',
                          }}
                        >
                          <Tag size={12} />
                          Listed on Fan Resale: ₹{activeResale.resalePrice.toLocaleString()}
                        </span>
                      </div>
                    )}

                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '0.5rem' }}>
                      <Link to={`/scanner?code=${t.ticketNumber}`} style={{ width: '100%', textDecoration: 'none' }}>
                        <Button size="sm" variant="secondary" style={{ width: '100%', fontSize: '0.78rem', padding: '0.45rem 0.2rem', fontWeight: 600 }}>
                          Gate Pass
                        </Button>
                      </Link>

                      <Button
                        size="sm"
                        variant="secondary"
                        disabled={isUsed || !!activeResale}
                        onClick={() => setTransferTicketId(t.id)}
                        style={{ width: '100%', fontSize: '0.78rem', padding: '0.45rem 0.2rem', fontWeight: 600 }}
                      >
                        Transfer
                      </Button>

                      {activeResale ? (
                        <Button
                          size="sm"
                          variant="secondary"
                          isLoading={cancellingResaleId === activeResale.id}
                          onClick={() => handleCancelResale(activeResale.id)}
                          style={{ width: '100%', fontSize: '0.78rem', padding: '0.45rem 0.2rem', color: 'var(--status-danger)', fontWeight: 600 }}
                        >
                          Delist
                        </Button>
                      ) : (
                        <Button
                          size="sm"
                          disabled={isUsed}
                          onClick={() => handleOpenResaleModal(t)}
                          style={{
                            width: '100%',
                            fontSize: '0.78rem',
                            padding: '0.45rem 0.2rem',
                            backgroundColor: 'var(--brand-subtle)',
                            borderColor: 'var(--brand-primary)',
                            color: 'var(--brand-primary)',
                            fontWeight: 700,
                          }}
                        >
                          Resell
                        </Button>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Full QR Modal */}
      {qrModalTicket && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            backgroundColor: 'rgba(15, 23, 42, 0.6)',
            backdropFilter: 'blur(8px)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 100,
            padding: '1.5rem',
          }}
        >
          <Card style={{ maxWidth: '420px', width: '100%', textAlign: 'center', padding: '2rem', position: 'relative', boxShadow: 'var(--shadow-xl)' }}>
            <button
              onClick={() => setQrModalTicket(null)}
              style={{ position: 'absolute', top: '1rem', right: '1rem', color: 'var(--text-muted)', cursor: 'pointer', background: 'transparent', border: 'none' }}
            >
              <X size={20} />
            </button>

            <h3 style={{ fontSize: '1.25rem', fontWeight: 800, marginBottom: '0.25rem' }}>
              {qrModalTicket.eventTitle}
            </h3>
            <p style={{ color: 'var(--brand-primary)', fontWeight: 700, fontSize: '0.95rem', marginBottom: '1.5rem' }}>
              {qrModalTicket.seatLabel || qrModalTicket.ticketTypeName}
            </p>

            <div style={{ margin: '0 auto 1.5rem', display: 'inline-block' }}>
              <QrCodeView value={qrModalTicket.qrCryptographicPayload || qrModalTicket.ticketNumber} size={220} />
            </div>

            <div style={{ fontSize: '0.85rem', fontFamily: 'monospace', color: 'var(--text-secondary)', marginBottom: '1rem' }}>
              {qrModalTicket.ticketNumber}
            </div>

            <div style={{ fontSize: '0.75rem', color: 'var(--status-success)', fontWeight: 600 }}>
              Cryptographically signed by EventPulse Authority
            </div>
          </Card>
        </div>
      )}

      {/* Ticket Transfer Modal */}
      {transferTicketId && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            backgroundColor: 'rgba(15, 23, 42, 0.6)',
            backdropFilter: 'blur(8px)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 100,
            padding: '1.5rem',
          }}
        >
          <Card style={{ maxWidth: '460px', width: '100%', padding: '2rem', position: 'relative', boxShadow: 'var(--shadow-xl)' }}>
            <button
              onClick={() => setTransferTicketId(null)}
              style={{ position: 'absolute', top: '1rem', right: '1rem', color: 'var(--text-muted)', cursor: 'pointer', background: 'transparent', border: 'none' }}
            >
              <X size={20} />
            </button>

            <h3 style={{ fontSize: '1.35rem', fontWeight: 700, marginBottom: '0.5rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <Send size={20} color="var(--brand-primary)" />
              Transfer Ticket Pass
            </h3>
            <p style={{ color: 'var(--text-secondary)', fontSize: '0.88rem', marginBottom: '1.5rem' }}>
              Enter the registered email of the attendee who should receive this pass. Ownership will transfer securely.
            </p>

            <form onSubmit={handleTransfer} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              <div>
                <label style={{ display: 'block', fontSize: '0.85rem', color: 'var(--text-secondary)', marginBottom: '0.35rem' }}>
                  Recipient User Email
                </label>
                <input
                  type="email"
                  required
                  value={recipientEmail}
                  onChange={(e) => setRecipientEmail(e.target.value)}
                  placeholder="e.g. priya@eventpulse.io"
                  style={{
                    width: '100%',
                    padding: '0.75rem',
                    backgroundColor: 'var(--bg-secondary)',
                    border: '1px solid var(--border-subtle)',
                    borderRadius: 'var(--radius-sm)',
                    color: 'var(--text-primary)',
                  }}
                />
              </div>

              <div style={{ display: 'flex', gap: '0.75rem', marginTop: '0.5rem' }}>
                <Button type="button" variant="secondary" onClick={() => setTransferTicketId(null)} style={{ flex: 1 }}>
                  Cancel
                </Button>
                <Button type="submit" variant="primary" isLoading={transferring} style={{ flex: 1 }}>
                  Confirm Transfer
                </Button>
              </div>
            </form>
          </Card>
        </div>
      )}

      {/* Celebratory Transfer Success Modal */}
      {transferSuccessModal && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            backgroundColor: 'rgba(15, 23, 42, 0.65)',
            backdropFilter: 'blur(8px)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 110,
            padding: '1.5rem',
          }}
        >
          <Card
            style={{
              maxWidth: '460px',
              width: '100%',
              padding: '2.5rem 2rem',
              textAlign: 'center',
              backgroundColor: 'var(--bg-card)',
              border: '1px solid #86efac',
              boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.2), 0 10px 10px -5px rgba(0, 0, 0, 0.04)',
              position: 'relative',
            }}
          >
            <div
              style={{
                width: '64px',
                height: '64px',
                borderRadius: '50%',
                backgroundColor: '#dcfce7',
                color: '#16a34a',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                margin: '0 auto 1.25rem',
                boxShadow: '0 0 20px rgba(22, 163, 74, 0.25)',
              }}
            >
              <CheckCircle2 size={36} strokeWidth={2.5} />
            </div>

            <h3
              style={{
                fontSize: '1.4rem',
                fontWeight: 800,
                color: 'var(--text-primary)',
                marginBottom: '0.6rem',
                fontFamily: 'var(--font-display)',
              }}
            >
              Ticket Transferred Successfully! 🎉
            </h3>

            <p style={{ color: 'var(--text-secondary)', fontSize: '0.92rem', lineHeight: 1.6, marginBottom: '1.5rem' }}>
              Your pass for <strong>{transferSuccessModal.ticketName}</strong> has been transferred to{' '}
              <strong style={{ color: 'var(--brand-primary)' }}>{transferSuccessModal.recipientEmail}</strong>.
              <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)', display: 'block', marginTop: '0.6rem', padding: '0.5rem 0.75rem', backgroundColor: '#f8fafc', borderRadius: '6px', border: '1px solid #e2e8f0' }}>
                🔒 Your previous barcode has been permanently invalidated. A new cryptographic HMAC entry token was issued to the recipient.
              </span>
            </p>

            <Button
              variant="primary"
              size="md"
              onClick={() => setTransferSuccessModal(null)}
              style={{ width: '100%', fontWeight: 700 }}
            >
              Done &amp; Return to Wallet
            </Button>
          </Card>
        </div>
      )}

      {/* Resale Listing Modal with Anti-Scalping Policy */}
      {resaleModalTicket && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            backgroundColor: 'rgba(15, 23, 42, 0.6)',
            backdropFilter: 'blur(8px)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 100,
            padding: '1.5rem',
          }}
        >
          <Card
            style={{
              maxWidth: '480px',
              width: '100%',
              padding: '2rem',
              position: 'relative',
              backgroundColor: 'var(--bg-card)',
              border: '1px solid #c4b5fd',
              boxShadow: 'var(--shadow-xl)',
            }}
          >
            <button
              onClick={() => setResaleModalTicket(null)}
              style={{ position: 'absolute', top: '1rem', right: '1rem', color: 'var(--text-muted)', cursor: 'pointer', background: 'transparent', border: 'none' }}
            >
              <X size={20} />
            </button>

            <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', marginBottom: '0.4rem' }}>
              <div
                style={{
                  width: '36px',
                  height: '36px',
                  borderRadius: '50%',
                  backgroundColor: '#ede9fe',
                  color: '#6d28d9',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <Tag size={18} />
              </div>
              <h3 style={{ fontSize: '1.3rem', fontWeight: 800, margin: 0, color: '#4c1d95' }}>
                List on Verified Resale Market
              </h3>
            </div>

            <p style={{ color: 'var(--text-secondary)', fontSize: '0.85rem', marginBottom: '1.25rem' }}>
              Offer your pass directly to verified fans. When bought, your old barcode is permanently invalidated and a new cryptographic pass is issued.
            </p>

            {/* Anti-Scalping Callout */}
            <div
              style={{
                backgroundColor: '#f5f3ff',
                border: '1px solid #ddd6fe',
                borderRadius: 'var(--radius-sm)',
                padding: '0.85rem 1rem',
                marginBottom: '1.25rem',
                display: 'flex',
                alignItems: 'flex-start',
                gap: '0.6rem',
              }}
            >
              <Shield size={16} color="#6d28d9" style={{ flexShrink: 0, marginTop: '2px' }} />
              <div style={{ fontSize: '0.78rem', color: '#4c1d95', lineHeight: 1.45 }}>
                <strong style={{ color: '#1e1b4b' }}>Strict Anti-Scalping Policy:</strong> In accordance with fair ticketing standards, resale prices must strictly be <strong>lower than face value</strong> (max ₹{resaleModalTicket.originalPrice || 1000}). Markups and profiteering are blocked.
              </div>
            </div>

            <form onSubmit={handleConfirmResale} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              <div style={{ padding: '0.75rem 1rem', backgroundColor: 'var(--bg-elevated)', borderRadius: 'var(--radius-sm)' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.82rem', color: 'var(--text-secondary)', marginBottom: '0.25rem' }}>
                  <span>Event &amp; Tier:</span>
                  <span style={{ fontWeight: 600, color: 'var(--text-primary)' }}>{resaleModalTicket.ticketTypeName}</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.82rem', color: 'var(--text-secondary)' }}>
                  <span>Original Face Value:</span>
                  <span style={{ fontWeight: 700, color: 'var(--text-primary)' }}>₹{(resaleModalTicket.originalPrice || 1000).toLocaleString()}</span>
                </div>
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.85rem', color: 'var(--text-secondary)', marginBottom: '0.35rem' }}>
                  Your Desired Resale Price (₹)
                </label>
                <input
                  type="number"
                  required
                  step="1"
                  min="1"
                  max={(resaleModalTicket.originalPrice || 1000) - 1}
                  value={resalePrice}
                  onChange={(e) => {
                    setResalePrice(e.target.value);
                    setResaleError(null);
                  }}
                  style={{
                    width: '100%',
                    padding: '0.75rem',
                    backgroundColor: 'var(--bg-secondary)',
                    border: '1px solid var(--border-medium)',
                    borderRadius: 'var(--radius-sm)',
                    color: 'var(--text-primary)',
                    fontSize: '1.1rem',
                    fontWeight: 700,
                  }}
                />

                {/* Quick discount chips */}
                {resaleModalTicket.originalPrice && (
                  <div style={{ display: 'flex', gap: '0.4rem', marginTop: '0.5rem', alignItems: 'center' }}>
                    <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>Quick discount:</span>
                    {[0.9, 0.85, 0.75].map((pct) => {
                      const discountVal = Math.round((1 - pct) * 100);
                      const priceVal = Math.floor(resaleModalTicket.originalPrice! * pct);
                      return (
                        <button
                          key={pct}
                          type="button"
                          onClick={() => setResalePrice(priceVal.toString())}
                          style={{
                            fontSize: '0.72rem',
                            fontWeight: 600,
                            padding: '0.15rem 0.45rem',
                            borderRadius: '4px',
                            border: '1px solid #c4b5fd',
                            background: '#ede9fe',
                            color: '#6d28d9',
                            cursor: 'pointer',
                          }}
                        >
                          {discountVal}% off (₹{priceVal})
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>

              {resaleError && (
                <div style={{ fontSize: '0.8rem', color: 'var(--status-danger)', fontWeight: 600 }}>
                  ✕ {resaleError}
                </div>
              )}

              <div style={{ display: 'flex', gap: '0.75rem', marginTop: '0.5rem' }}>
                <Button type="button" variant="secondary" onClick={() => setResaleModalTicket(null)} style={{ flex: 1 }}>
                  Cancel
                </Button>
                <Button
                  type="submit"
                  isLoading={resaleSubmitting}
                  style={{
                    flex: 1,
                    backgroundColor: '#7c3aed',
                    borderColor: '#6d28d9',
                    color: '#FFFFFF',
                    fontWeight: 700,
                  }}
                >
                  List For Resale
                </Button>
              </div>
            </form>
          </Card>
        </div>
      )}
    </div>
  );
};
