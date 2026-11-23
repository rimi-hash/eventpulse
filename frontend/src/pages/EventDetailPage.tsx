import React, { useEffect, useState, useRef } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import { apiClient } from '../services/apiClient';
import { useAuth } from '../context/AuthContext';
import { useAssistantAppContext } from '../context/AssistantAppContext';
import { EventDetail, SeatAvailability, HoldResponse } from '../types/api';
import { Card } from '../components/ui/Card';
import { Badge } from '../components/ui/Badge';
import { Button } from '../components/ui/Button';
import { LoadingSpinner } from '../components/ui/LoadingSpinner';
import { ErrorAlert } from '../components/ui/ErrorAlert';
import {
  Calendar,
  MapPin,
  Shield,
  Users,
  ArrowRight,
  ExternalLink,
  ShieldCheck,
  Info,
  CheckCircle2,
  History,
} from 'lucide-react';

export const EventDetailPage: React.FC = () => {
  const { idOrSlug } = useParams<{ idOrSlug: string }>();
  const navigate = useNavigate();
  const location = useLocation();
  const { user } = useAuth();

  const locationState = location.state as {
    selectedSessionId?: string;
    selectedTicketTypeId?: string;
    selectedSeatIds?: string[];
    gaQuantity?: number;
  } | null;

  const [event, setEvent] = useState<EventDetail | null>(null);
  const [selectedSessionId, setSelectedSessionId] = useState<string>('');
  const [availability, setAvailability] = useState<SeatAvailability[]>([]);
  const [selectedTicketTypeId, setSelectedTicketTypeId] = useState<string>('');
  const [selectedSeatIds, setSelectedSeatIds] = useState<string[]>([]);
  const [gaQuantity, setGaQuantity] = useState<number>(1);

  const [isLoading, setIsLoading] = useState(true);
  const [isHolding, setIsHolding] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const pendingSeatValidationRef = useRef<string[] | null>(locationState?.selectedSeatIds || null);

  const fetchEvent = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const res = await apiClient.get<EventDetail>(`/events/${idOrSlug}`);
      setEvent(res.data);

      if (locationState?.selectedSessionId) {
        setSelectedSessionId(locationState.selectedSessionId);
      } else if (res.data.sessions && res.data.sessions.length > 0) {
        setSelectedSessionId(res.data.sessions[0].id);
      }

      if (locationState?.selectedTicketTypeId) {
        setSelectedTicketTypeId(locationState.selectedTicketTypeId);
      } else if (res.data.ticketTypes && res.data.ticketTypes.length > 0) {
        setSelectedTicketTypeId(res.data.ticketTypes[0].id);
      }

      if (locationState?.selectedSeatIds && locationState.selectedSeatIds.length > 0) {
        setSelectedSeatIds(locationState.selectedSeatIds);
      }

      if (locationState?.gaQuantity) {
        setGaQuantity(locationState.gaQuantity);
      }
    } catch (err: unknown) {
      if (err instanceof Error) {
        setError(err.message);
      } else {
        setError('Failed to load event details');
      }
    } finally {
      setIsLoading(false);
    }
  };

  const fetchAvailability = async (sessionId: string) => {
    if (!sessionId || !event) return;
    try {
      const res = await apiClient.get<SeatAvailability[]>(`/events/${event.id}/sessions/${sessionId}/availability`);
      const seatList = res.data || [];
      setAvailability(seatList);

      // Revalidate pending seats if user came back from login
      const seatsToVerify = pendingSeatValidationRef.current || selectedSeatIds;
      if (seatsToVerify && seatsToVerify.length > 0) {
        const availableSeatIds = seatList.filter((s) => s.status === 'AVAILABLE').map((s) => s.seatId);
        const validSelected = seatsToVerify.filter((id) => availableSeatIds.includes(id));
        if (validSelected.length < seatsToVerify.length) {
          setSelectedSeatIds(validSelected);
          if (validSelected.length === 0) {
            setError('The seat(s) you previously selected were reserved by other fans while signing in. Please pick another seat.');
          } else {
            setError('Some of your previously selected seats became unavailable and were removed. Available seats were retained.');
          }
        } else {
          setSelectedSeatIds(validSelected);
        }
        pendingSeatValidationRef.current = null;
      }
    } catch {
      console.warn('Failed to fetch seat availability');
    }
  };

  useEffect(() => {
    fetchEvent();
  }, [idOrSlug]);

  const { setPageContext, clearPageContext, registerSeatSelectionHandler, registerQuantityHandler } = useAssistantAppContext();

  useEffect(() => {
    if (selectedSessionId && event?.ticketSaleStatus === 'EVENTPULSE_MANAGED') {
      fetchAvailability(selectedSessionId);
    }
  }, [selectedSessionId, event]);

  // Synchronize live event, section, and selected seats to YAS Assistant Context
  useEffect(() => {
    if (event) {
      const tier = event.ticketTypes?.find((t) => t.id === selectedTicketTypeId) || event.ticketTypes?.[0];
      const selectedLabels = availability
        .filter((a) => a.seatId && selectedSeatIds.includes(a.seatId))
        .map((a) => (a.rowLabel && a.seatNumber ? `${a.rowLabel}${a.seatNumber}` : ''))
        .filter(Boolean);

      setPageContext({
        eventId: event.id,
        eventSlug: event.slug,
        eventTitle: event.title,
        venueId: event.venueId,
        venueName: event.venueName,
        sessionId: selectedSessionId,
        selectedTicketTypeId,
        selectedTicketTierName: tier?.name,
        selectedSeatIds,
        selectedSeatLabels: selectedLabels,
        activeSection: tier?.sectionName,
        quantity: tier?.sectionId ? selectedSeatIds.length : gaQuantity,
      });
    }
    return () => {
      clearPageContext();
    };
  }, [event, selectedSessionId, selectedTicketTypeId, selectedSeatIds, gaQuantity, availability, setPageContext, clearPageContext]);

  // Handle autonomous seat and quantity updates triggered by YAS
  useEffect(() => {
    const unregisterSeat = registerSeatSelectionHandler((seatIds) => {
      setSelectedSeatIds(seatIds);
    });
    const unregisterQty = registerQuantityHandler((qty) => {
      setGaQuantity(qty);
    });
    return () => {
      unregisterSeat();
      unregisterQty();
    };
  }, [registerSeatSelectionHandler, registerQuantityHandler]);

  const handleSeatClick = (seatId: string, status: string) => {
    if (status !== 'AVAILABLE' && !selectedSeatIds.includes(seatId)) return;

    setSelectedSeatIds((prev) => {
      if (prev.includes(seatId)) {
        return prev.filter((id) => id !== seatId);
      } else {
        const limit = event?.maxTicketsPerUser || 6;
        if (prev.length >= limit) {
          setError(`You can select a maximum of ${limit} seats per transaction.`);
          return prev;
        }
        return [...prev, seatId];
      }
    });
  };

  const handleHoldAndProceed = async () => {
    if (!user) {
      navigate('/login', {
        state: {
          from: location,
          selectedSessionId,
          selectedTicketTypeId,
          selectedSeatIds,
          gaQuantity,
        },
      });
      return;
    }

    if (!event || !selectedSessionId || !selectedTicketTypeId) return;

    const currentTier = event.ticketTypes.find((t) => t.id === selectedTicketTypeId);
    const isReserved = currentTier?.sectionId != null;

    if (isReserved && selectedSeatIds.length === 0) {
      setError('Please select at least one seat on the interactive map');
      return;
    }

    setIsHolding(true);
    setError(null);

    try {
      const payload = {
        ticketTypeId: selectedTicketTypeId,
        seatIds: isReserved ? selectedSeatIds : null,
        quantity: isReserved ? selectedSeatIds.length : gaQuantity,
        holdDurationSeconds: 600,
      };

      const res = await apiClient.post<HoldResponse>(`/events/${event.id}/sessions/${selectedSessionId}/holds`, payload);
      const holdToken = res.data.holdSessionToken;

      const orderRes = await apiClient.post<{ id: string }>('/orders', {
        holdSessionToken: holdToken,
        contactEmail: user.email || 'customer@eventpulse.io',
        contactPhone: user.phoneNumber || '+919876543210',
        customerEmail: user.email || 'customer@eventpulse.io',
        customerPhone: user.phoneNumber || '+919876543210',
      });

      navigate(`/checkout/${orderRes.data.id}`);
    } catch (err: unknown) {
      if (err instanceof Error) {
        setError(err.message);
      } else {
        setError('Failed to acquire seat hold. Seats may have been reserved by someone else.');
      }
      fetchAvailability(selectedSessionId);
    } finally {
      setIsHolding(false);
    }
  };

  if (isLoading) {
    return (
      <div className="container" style={{ paddingTop: '5rem', textAlign: 'center' }}>
        <LoadingSpinner label="Loading verified event details and seating geometry..." />
      </div>
    );
  }

  if (error && !event) {
    return (
      <div className="container" style={{ paddingTop: '3rem' }}>
        <ErrorAlert title="Event Error" message={error} onRetry={fetchEvent} inline />
      </div>
    );
  }

  if (!event) return null;

  const isPast = event.status === 'COMPLETED';
  const isManaged = event.ticketSaleStatus === 'EVENTPULSE_MANAGED';
  const isExternal = event.ticketSaleStatus === 'EXTERNAL_TICKETS';
  const isInfoOnly = event.ticketSaleStatus === 'INFO_ONLY';
  const isUnverified = event.verificationStatus === 'VENUE_UNCONFIRMED' || event.verificationStatus === 'PENDING_VERIFICATION' || event.ticketSaleStatus === 'UNVERIFIED_PENDING';

  const currentTier = event.ticketTypes.find((t) => t.id === selectedTicketTypeId) || event.ticketTypes[0];
  const isReservedTier = currentTier && currentTier.sectionId != null;

  const relevantSeats = isReservedTier
    ? availability.filter((a) => a.ticketTypeId === currentTier?.id)
    : [];

  return (
    <div style={{ backgroundColor: 'var(--bg-primary)', minHeight: '100vh', paddingBottom: '5rem' }}>
      {/* Editorial Event Hero Banner */}
      <section
        style={{
          backgroundColor: '#ffffff',
          borderBottom: '1px solid var(--border-subtle)',
          padding: '2.5rem 0',
        }}
      >
        <div className="container">
          {/* Breadcrumb Navigation */}
          <nav
            aria-label="Breadcrumb"
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '0.5rem',
              fontSize: '0.85rem',
              color: 'var(--text-secondary)',
              marginBottom: '1.5rem',
            }}
          >
            <a href="/" style={{ color: 'var(--text-secondary)', textDecoration: 'none' }}>
              Home
            </a>
            <span>/</span>
            <a href="/events" style={{ color: 'var(--text-secondary)', textDecoration: 'none' }}>
              Events
            </a>
            <span>/</span>
            <span style={{ color: 'var(--text-primary)', fontWeight: 600 }}>
              {event.title}
            </span>
          </nav>

          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'minmax(320px, 1fr) 1.5fr',
              gap: '2.5rem',
              alignItems: 'start',
            }}
          >
            {/* Event Photo with 16:9 / 4:3 Proportion and Badges */}
            <div
              style={{
                width: '100%',
                aspectRatio: '16/10',
                borderRadius: 'var(--radius-lg)',
                overflow: 'hidden',
                position: 'relative',
                boxShadow: 'var(--shadow-md)',
                border: '1px solid var(--border-subtle)',
                backgroundColor: 'var(--bg-secondary)',
              }}
            >
              <img
                src={event.bannerUrl || 'https://images.unsplash.com/photo-1501386761578-eac5c94b800a?w=1600'}
                alt={event.title}
                style={{
                  width: '100%',
                  height: '100%',
                  objectFit: 'cover',
                  filter: isPast ? 'grayscale(40%)' : 'none',
                }}
              />
            </div>

            {/* Event Header Information */}
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', marginBottom: '0.75rem', flexWrap: 'wrap' }}>
                <span
                  style={{
                    fontSize: '0.82rem',
                    fontWeight: 700,
                    color: 'var(--brand-primary)',
                    backgroundColor: 'var(--brand-subtle)',
                    padding: '0.25rem 0.75rem',
                    borderRadius: 'var(--radius-full)',
                    letterSpacing: '0.04em',
                    textTransform: 'uppercase',
                  }}
                >
                  {event.category || 'Live Experience'}
                </span>
                <span
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '0.35rem',
                    fontSize: '0.82rem',
                    fontWeight: 600,
                    color: 'var(--status-success)',
                  }}
                >
                  <CheckCircle2 size={15} /> 100% Authentic Tickets
                </span>
              </div>

              <h1
                style={{
                  fontFamily: 'var(--font-display)',
                  fontSize: 'clamp(1.8rem, 3.2vw, 2.5rem)',
                  fontWeight: 800,
                  color: 'var(--text-primary)',
                  lineHeight: 1.2,
                  letterSpacing: '-0.02em',
                  marginBottom: '1rem',
                }}
              >
                {event.title}
              </h1>

              <p
                style={{
                  fontSize: '1rem',
                  color: 'var(--text-secondary)',
                  lineHeight: 1.6,
                  marginBottom: '1.5rem',
                  maxWidth: '720px',
                }}
              >
                {event.shortSummary}
              </p>

              {/* Event Metadata Cards */}
              <div
                style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
                  gap: '1rem',
                  padding: '1.25rem',
                  backgroundColor: 'var(--bg-primary)',
                  borderRadius: 'var(--radius-lg)',
                  border: '1px solid var(--border-subtle)',
                  fontSize: '0.9rem',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'flex-start', gap: '0.75rem' }}>
                  <div
                    style={{
                      width: '36px',
                      height: '36px',
                      borderRadius: 'var(--radius-md)',
                      backgroundColor: 'var(--brand-subtle)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      color: 'var(--brand-primary)',
                      flexShrink: 0,
                    }}
                  >
                    <MapPin size={18} />
                  </div>
                  <div>
                    <div style={{ fontWeight: 700, color: 'var(--text-primary)' }}>{event.venueName}</div>
                    <div style={{ color: 'var(--text-secondary)', fontSize: '0.82rem', marginTop: '0.15rem' }}>
                      {event.venueAddress ? `${event.venueAddress}, ` : ''}{event.venueCity}, {event.venueState}
                    </div>
                  </div>
                </div>

                <div style={{ display: 'flex', alignItems: 'flex-start', gap: '0.75rem' }}>
                  <div
                    style={{
                      width: '36px',
                      height: '36px',
                      borderRadius: 'var(--radius-md)',
                      backgroundColor: 'var(--brand-subtle)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      color: 'var(--brand-primary)',
                      flexShrink: 0,
                    }}
                  >
                    <Users size={18} />
                  </div>
                  <div>
                    <div style={{ fontWeight: 700, color: 'var(--text-primary)' }}>Authorized Promoter</div>
                    <div style={{ color: 'var(--text-secondary)', fontSize: '0.82rem', marginTop: '0.15rem' }}>
                      {event.organizationName || 'Pulse Live Entertainment'}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Main Content Layout */}
      <div className="container" style={{ paddingTop: '2.5rem' }}>
        {error && <ErrorAlert title="Notice" message={error} onClose={() => setError(null)} />}

        {/* STATUS BANNER FOR PAST EVENTS */}
        {isPast && (
          <div
            style={{
              backgroundColor: '#ffffff',
              border: '1px solid var(--border-subtle)',
              borderRadius: 'var(--radius-lg)',
              padding: '1.5rem 2rem',
              marginBottom: '2.5rem',
              display: 'flex',
              alignItems: 'center',
              gap: '1.25rem',
              boxShadow: 'var(--shadow-sm)',
            }}
          >
            <div
              style={{
                width: '44px',
                height: '44px',
                borderRadius: '50%',
                backgroundColor: 'var(--bg-secondary)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: 'var(--text-muted)',
                flexShrink: 0,
              }}
            >
              <History size={22} />
            </div>
            <div>
              <h3 style={{ fontSize: '1.1rem', fontWeight: 800, color: 'var(--text-primary)', margin: 0 }}>
                This Verified Event Has Concluded
              </h3>
              <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', margin: '0.25rem 0 0' }}>
                This historic event is preserved as an archival record. Ticket sales are closed, and tickets are no longer purchasable.
              </p>
            </div>
          </div>
        )}

        {/* STATUS BANNER FOR EXTERNAL TICKETING */}
        {!isPast && isExternal && (
          <div
            style={{
              backgroundColor: '#ffffff',
              border: '1px solid #bfdbfe',
              borderRadius: 'var(--radius-lg)',
              padding: '1.75rem 2rem',
              marginBottom: '2.5rem',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              gap: '1.5rem',
              flexWrap: 'wrap',
              boxShadow: 'var(--shadow-sm)',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
              <div
                style={{
                  width: '44px',
                  height: '44px',
                  borderRadius: '50%',
                  backgroundColor: 'var(--brand-subtle)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: 'var(--brand-primary)',
                  flexShrink: 0,
                }}
              >
                <Info size={22} />
              </div>
              <div>
                <h3 style={{ fontSize: '1.1rem', fontWeight: 800, color: 'var(--text-primary)', margin: 0 }}>
                  Official Partner Ticketing
                </h3>
                <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', margin: '0.25rem 0 0' }}>
                  Tickets for this verified event are issued via authorized partner platforms (BookMyShow / District).
                </p>
              </div>
            </div>

            {event.officialBookingUrl && (
              <a
                href={event.officialBookingUrl}
                target="_blank"
                rel="noopener noreferrer"
                style={{ textDecoration: 'none' }}
              >
                <Button size="md" variant="primary">
                  Open Official Booking Platform <ExternalLink size={15} />
                </Button>
              </a>
            )}
          </div>
        )}

        {/* STATUS BANNER FOR FREE PRE-REGISTRATION (INFO ONLY) */}
        {!isPast && isInfoOnly && (
          <div
            style={{
              backgroundColor: '#ffffff',
              border: '1px solid var(--status-success-border)',
              borderRadius: 'var(--radius-lg)',
              padding: '1.75rem 2rem',
              marginBottom: '2.5rem',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              gap: '1.5rem',
              flexWrap: 'wrap',
              boxShadow: 'var(--shadow-sm)',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
              <div
                style={{
                  width: '44px',
                  height: '44px',
                  borderRadius: '50%',
                  backgroundColor: 'var(--status-success-bg)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: 'var(--status-success)',
                  flexShrink: 0,
                }}
              >
                <CheckCircle2 size={22} />
              </div>
              <div>
                <h3 style={{ fontSize: '1.1rem', fontWeight: 800, color: 'var(--text-primary)', margin: 0 }}>
                  Free Admission with Pre-Registration
                </h3>
                <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', margin: '0.25rem 0 0' }}>
                  This technical builder summit offers complimentary entry with mandatory official organizer pre-registration.
                </p>
              </div>
            </div>

            {event.officialBookingUrl && (
              <a
                href={event.officialBookingUrl}
                target="_blank"
                rel="noopener noreferrer"
                style={{ textDecoration: 'none' }}
              >
                <Button size="md" variant="primary">
                  Pre-Register with AWS Builder ID <ExternalLink size={15} />
                </Button>
              </a>
            )}
          </div>
        )}

        {/* STATUS BANNER FOR UNVERIFIED / PENDING VERIFICATION */}
        {!isPast && isUnverified && (
          <div
            style={{
              backgroundColor: '#fffbeb',
              border: '1px solid #fde68a',
              borderRadius: 'var(--radius-lg)',
              padding: '1.75rem 2rem',
              marginBottom: '2.5rem',
              display: 'flex',
              alignItems: 'center',
              gap: '1.25rem',
              boxShadow: 'var(--shadow-sm)',
            }}
          >
            <div
              style={{
                width: '44px',
                height: '44px',
                borderRadius: '50%',
                backgroundColor: '#fef3c7',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: '#d97706',
                flexShrink: 0,
              }}
            >
              <Info size={22} />
            </div>
            <div>
              <h3 style={{ fontSize: '1.1rem', fontWeight: 800, color: '#92400e', margin: 0 }}>
                Event Details Under Official Verification
              </h3>
              <p style={{ color: '#b45309', fontSize: '0.9rem', margin: '0.25rem 0 0' }}>
                The venue, artist lineup, or schedule for this listing is currently pending final confirmation by platform administrators. Ticket booking is currently disabled until information is verified.
              </p>
            </div>
          </div>
        )}

        {/* Two-Column Grid: Details / Seating (Left) & Action Summary (Right) */}
        <div style={{ display: 'grid', gridTemplateColumns: isManaged && !isPast ? '1.8fr 1.2fr' : '1fr', gap: '2.5rem', alignItems: 'start' }}>
          {/* Left Column */}
          <div>
            {/* About Section */}
            <section style={{ marginBottom: '2.5rem' }}>
              <h2 style={{ fontSize: '1.35rem', fontWeight: 800, color: 'var(--text-primary)', marginBottom: '0.85rem' }}>
                About the Event
              </h2>
              <div
                style={{
                  color: 'var(--text-secondary)',
                  lineHeight: 1.7,
                  fontSize: '0.98rem',
                  whiteSpace: 'pre-line',
                  backgroundColor: '#ffffff',
                  padding: '1.75rem',
                  borderRadius: 'var(--radius-lg)',
                  border: '1px solid var(--border-subtle)',
                }}
              >
                {event.description}
              </div>
            </section>

            {/* Event Sessions & Schedule */}
            <section style={{ marginBottom: '2.5rem' }}>
              <h2 style={{ fontSize: '1.3rem', fontWeight: 800, color: 'var(--text-primary)', marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <Calendar size={20} color="var(--brand-primary)" />
                Session Schedule &amp; Timings
              </h2>
              <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap' }}>
                {event.sessions.map((s) => {
                  const isSelected = selectedSessionId === s.id;
                  return (
                    <button
                      key={s.id}
                      onClick={() => {
                        setSelectedSessionId(s.id);
                        setSelectedSeatIds([]);
                      }}
                      style={{
                        padding: '1rem 1.25rem',
                        borderRadius: 'var(--radius-md)',
                        backgroundColor: isSelected ? 'var(--brand-subtle)' : '#ffffff',
                        border: isSelected ? '2px solid var(--brand-primary)' : '1px solid var(--border-subtle)',
                        cursor: 'pointer',
                        textAlign: 'left',
                        minWidth: '220px',
                        boxShadow: 'var(--shadow-sm)',
                        transition: 'all var(--transition-fast)',
                      }}
                    >
                      <div style={{ fontWeight: 700, fontSize: '0.95rem', color: isSelected ? 'var(--brand-primary)' : 'var(--text-primary)' }}>
                        {s.sessionTitle}
                      </div>
                      <div style={{ fontSize: '0.82rem', color: 'var(--text-secondary)', marginTop: '0.25rem' }}>
                        {new Date(s.startsAt).toLocaleDateString('en-IN', {
                          weekday: 'short',
                          month: 'short',
                          day: 'numeric',
                          year: 'numeric',
                          hour: '2-digit',
                          minute: '2-digit',
                        })}
                      </div>
                    </button>
                  );
                })}
              </div>
            </section>

            {/* EVENTPULSE MANAGED: TICKET TIER SELECTION */}
            {isManaged && !isPast && (
              <section style={{ marginBottom: '2.5rem' }}>
                <h2 style={{ fontSize: '1.3rem', fontWeight: 800, color: 'var(--text-primary)', marginBottom: '1rem' }}>
                  Select Ticket Tier
                </h2>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.85rem' }}>
                  {event.ticketTypes.map((tier) => {
                    const isSelected = selectedTicketTypeId === tier.id;
                    return (
                      <button
                        key={tier.id}
                        onClick={() => {
                          setSelectedTicketTypeId(tier.id);
                          setSelectedSeatIds([]);
                        }}
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'space-between',
                          padding: '1.25rem 1.5rem',
                          borderRadius: 'var(--radius-lg)',
                          backgroundColor: isSelected ? 'var(--brand-subtle)' : '#ffffff',
                          border: isSelected ? '2px solid var(--brand-primary)' : '1px solid var(--border-subtle)',
                          cursor: 'pointer',
                          textAlign: 'left',
                          boxShadow: isSelected ? 'var(--shadow-md)' : 'var(--shadow-sm)',
                          transition: 'all var(--transition-fast)',
                        }}
                      >
                        <div>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
                            <span style={{ fontWeight: 800, fontSize: '1.05rem', color: 'var(--text-primary)' }}>
                              {tier.name}
                            </span>
                            {tier.sectionName && <Badge variant="info">{tier.sectionName}</Badge>}
                          </div>
                          <p style={{ fontSize: '0.86rem', color: 'var(--text-secondary)', marginTop: '0.3rem', maxWidth: '480px' }}>
                            {tier.description || 'Verified admission pass'}
                          </p>
                          <div style={{ fontSize: '0.8rem', color: 'var(--status-success)', marginTop: '0.4rem', fontWeight: 600 }}>
                            {tier.availableQuantity} passes available
                          </div>
                        </div>

                        <div style={{ textAlign: 'right' }}>
                          <div style={{ fontSize: '1.4rem', fontWeight: 800, color: 'var(--text-primary)' }}>
                            ₹{tier.totalPrice.toLocaleString()}
                          </div>
                          <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                            incl. ₹{tier.serviceFee} fee + ₹{tier.taxAmount} GST
                          </div>
                        </div>
                      </button>
                    );
                  })}
                </div>
              </section>
            )}

            {/* EVENTPULSE MANAGED: INTERACTIVE SEAT CANVAS */}
            {isManaged && !isPast && isReservedTier && (
              <section style={{ marginBottom: '2.5rem' }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1rem', flexWrap: 'wrap', gap: '0.75rem' }}>
                  <div>
                    <h2 style={{ fontSize: '1.3rem', fontWeight: 800, color: 'var(--text-primary)', margin: 0 }}>
                      Interactive Seat Map — {currentTier?.name}
                    </h2>
                    <p style={{ fontSize: '0.82rem', color: 'var(--text-secondary)', margin: '0.25rem 0 0' }}>
                      Section: <strong style={{ color: 'var(--brand-primary)' }}>{currentTier?.sectionName}</strong> • {currentTier?.quota} Total Seats • ₹{currentTier?.totalPrice.toLocaleString()} per seat
                    </p>
                  </div>
                  <div style={{ display: 'flex', gap: '0.85rem', flexWrap: 'wrap', fontSize: '0.78rem' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                      <span style={{ width: '12px', height: '12px', borderRadius: '3px', backgroundColor: '#10b981' }} />
                      <span style={{ fontWeight: 600 }}>Available</span>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                      <span style={{ width: '12px', height: '12px', borderRadius: '3px', backgroundColor: '#2563eb' }} />
                      <span style={{ fontWeight: 600 }}>Selected</span>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                      <span style={{ width: '12px', height: '12px', borderRadius: '3px', backgroundColor: '#f59e0b' }} />
                      <span style={{ fontWeight: 600 }}>Held</span>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                      <span style={{ width: '12px', height: '12px', borderRadius: '3px', backgroundColor: '#94a3b8' }} />
                      <span style={{ fontWeight: 600 }}>Sold</span>
                    </div>
                  </div>
                </div>

                <Card style={{ padding: '2rem 1.5rem', backgroundColor: '#ffffff', textAlign: 'center', border: '1px solid var(--border-medium)', borderRadius: 'var(--radius-xl)', boxShadow: '0 4px 20px rgba(0,0,0,0.06)' }}>
                  {/* Concert Stage & Catwalk Visual */}
                  <div style={{ position: 'relative', maxWidth: '580px', margin: '0 auto 2.5rem' }}>
                    <div
                      style={{
                        height: '34px',
                        borderRadius: 'var(--radius-full)',
                        background: 'linear-gradient(90deg, #1e1b4b 0%, #312e81 30%, #4338ca 50%, #312e81 70%, #1e1b4b 100%)',
                        color: '#ffffff',
                        fontSize: '0.75rem',
                        fontWeight: 800,
                        letterSpacing: '0.12em',
                        textTransform: 'uppercase',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        boxShadow: '0 6px 16px rgba(67, 56, 202, 0.35)',
                        border: '1px solid #6366f1',
                      }}
                    >
                      ⚡ MAIN STAGE • ASAL KOLAAR &amp; DACALTY LIVE ⚡
                    </div>
                    {/* Thrust Runway / Catwalk Indicator */}
                    <div
                      style={{
                        width: '36px',
                        height: '24px',
                        margin: '0 auto',
                        background: 'linear-gradient(180deg, #4338ca 0%, #6366f1 100%)',
                        borderRadius: '0 0 8px 8px',
                        boxShadow: '0 4px 10px rgba(99, 102, 241, 0.4)',
                      }}
                    />
                    <div style={{ fontSize: '0.72rem', color: '#64748b', marginTop: '0.4rem', fontWeight: 600 }}>
                      ▲ STAGE FRONT DIRECTION ▲
                    </div>
                  </div>

                  {/* Grouped Rows Seating Layout */}
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.85rem', maxWidth: '620px', margin: '0 auto' }}>
                    {Array.from(new Set(relevantSeats.map((s) => s.rowLabel || 'A'))).map((rowLabel) => {
                      const seatsInThisRow = relevantSeats
                        .filter((s) => (s.rowLabel || 'A') === rowLabel)
                        .sort((a, b) => parseInt(a.seatNumber || '0') - parseInt(b.seatNumber || '0'));

                      return (
                        <div
                          key={rowLabel}
                          style={{
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            gap: '0.6rem',
                          }}
                        >
                          <span
                            style={{
                              width: '54px',
                              fontWeight: 800,
                              fontSize: '0.78rem',
                              color: '#64748b',
                              textAlign: 'right',
                              textTransform: 'uppercase',
                              letterSpacing: '0.05em',
                            }}
                          >
                            Row {rowLabel}
                          </span>

                          <div style={{ display: 'flex', gap: '0.45rem' }}>
                            {seatsInThisRow.map((seat) => {
                              const isSelected = selectedSeatIds.includes(seat.seatId || '');
                              let bgColor = '#10b981'; // Available
                              let statusText = 'Available';
                              if (seat.status === 'HELD') {
                                bgColor = '#f59e0b';
                                statusText = 'Held by another fan';
                              }
                              if (seat.status === 'SOLD') {
                                bgColor = '#94a3b8';
                                statusText = 'Already Sold';
                              }
                              if (isSelected) {
                                bgColor = '#2563eb';
                                statusText = 'Selected in your cart';
                              }

                              const isClickable = seat.status === 'AVAILABLE' || isSelected;

                              return (
                                <button
                                  key={seat.inventoryId}
                                  disabled={!isClickable}
                                  onClick={() => handleSeatClick(seat.seatId || '', seat.status)}
                                  title={`Row ${seat.rowLabel} Seat ${seat.seatNumber} — ₹${seat.price?.toLocaleString() || currentTier?.totalPrice?.toLocaleString()} (${statusText})`}
                                  style={{
                                    width: '38px',
                                    height: '38px',
                                    borderRadius: '6px',
                                    backgroundColor: bgColor,
                                    color: '#ffffff',
                                    fontWeight: 800,
                                    fontSize: '0.75rem',
                                    cursor: isClickable ? 'pointer' : 'not-allowed',
                                    border: isSelected ? '2px solid #0f172a' : '1px solid rgba(0,0,0,0.1)',
                                    boxShadow: isSelected
                                      ? '0 0 0 3px rgba(37, 99, 235, 0.4), 0 4px 8px rgba(0,0,0,0.15)'
                                      : '0 2px 4px rgba(0,0,0,0.06)',
                                    transition: 'all 0.15s ease',
                                    transform: isSelected ? 'scale(1.08)' : 'scale(1)',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                  }}
                                >
                                  {seat.seatNumber}
                                </button>
                              );
                            })}
                          </div>

                          <span
                            style={{
                              width: '54px',
                              fontWeight: 800,
                              fontSize: '0.78rem',
                              color: '#64748b',
                              textAlign: 'left',
                              textTransform: 'uppercase',
                              letterSpacing: '0.05em',
                            }}
                          >
                            Row {rowLabel}
                          </span>
                        </div>
                      );
                    })}
                  </div>

                  {/* Selected Seats Real-Time Summary Ribbon */}
                  {selectedSeatIds.length > 0 && (
                    <div
                      style={{
                        marginTop: '2rem',
                        padding: '1rem 1.5rem',
                        backgroundColor: '#eff6ff',
                        borderRadius: 'var(--radius-lg)',
                        border: '1px solid #bfdbfe',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        flexWrap: 'wrap',
                        gap: '1rem',
                        textAlign: 'left',
                      }}
                    >
                      <div>
                        <div style={{ fontSize: '0.82rem', fontWeight: 700, color: '#1e40af', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                          Selected {selectedSeatIds.length} {selectedSeatIds.length === 1 ? 'Seat' : 'Seats'}:
                        </div>
                        <div style={{ display: 'flex', gap: '0.4rem', flexWrap: 'wrap', marginTop: '0.3rem' }}>
                          {selectedSeatIds.map((sid) => {
                            const st = relevantSeats.find((s) => s.seatId === sid);
                            return (
                              <span
                                key={sid}
                                style={{
                                  padding: '0.2rem 0.6rem',
                                  backgroundColor: '#2563eb',
                                  color: '#ffffff',
                                  borderRadius: '4px',
                                  fontSize: '0.78rem',
                                  fontWeight: 800,
                                }}
                              >
                                Row {st?.rowLabel || '?'}-{st?.seatNumber || '?'}
                              </span>
                            );
                          })}
                        </div>
                      </div>
                      <div style={{ textAlign: 'right' }}>
                        <div style={{ fontSize: '0.78rem', color: '#64748b' }}>Total Subtotal</div>
                        <div style={{ fontSize: '1.25rem', fontWeight: 800, color: '#1e3a8a' }}>
                          ₹{((currentTier?.totalPrice || 0) * selectedSeatIds.length).toLocaleString()}
                        </div>
                      </div>
                    </div>
                  )}
                </Card>
              </section>
            )}

            {/* EVENTPULSE MANAGED: GENERAL ADMISSION QUANTITY */}
            {isManaged && !isPast && !isReservedTier && (
              <Card style={{ padding: '1.5rem', marginBottom: '2.5rem', backgroundColor: '#ffffff' }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <div>
                    <h3 style={{ fontSize: '1.1rem', fontWeight: 800, color: 'var(--text-primary)' }}>Select Quantity</h3>
                    <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
                      Maximum {event.maxTicketsPerUser} passes per order
                    </p>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                    <Button
                      size="sm"
                      variant="secondary"
                      onClick={() => setGaQuantity((q) => Math.max(1, q - 1))}
                    >
                      -
                    </Button>
                    <span style={{ fontSize: '1.3rem', fontWeight: 800, minWidth: '32px', textAlign: 'center', color: 'var(--text-primary)' }}>
                      {gaQuantity}
                    </span>
                    <Button
                      size="sm"
                      variant="secondary"
                      onClick={() => setGaQuantity((q) => Math.min(event.maxTicketsPerUser, q + 1))}
                    >
                      +
                    </Button>
                  </div>
                </div>
              </Card>
            )}

            {/* SOURCE PROVENANCE & AUTHENTICITY AUDIT BOX */}
            <section style={{ marginBottom: '2.5rem' }}>
              <h2 style={{ fontSize: '1.25rem', fontWeight: 800, color: 'var(--text-primary)', marginBottom: '0.85rem' }}>
                Verified Event Provenance
              </h2>
              <Card style={{ padding: '1.5rem', backgroundColor: '#ffffff' }}>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '1.25rem', fontSize: '0.86rem' }}>
                  <div>
                    <span style={{ color: 'var(--text-muted)', display: 'block', marginBottom: '0.2rem' }}>
                      Official Information Source
                    </span>
                    {event.officialInfoUrl ? (
                      <a
                        href={event.officialInfoUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        style={{ color: 'var(--brand-primary)', fontWeight: 600, display: 'inline-flex', alignItems: 'center', gap: '0.3rem' }}
                      >
                        <span>Official Schedule Reference</span> <ExternalLink size={13} />
                      </a>
                    ) : (
                      <span style={{ color: 'var(--text-secondary)' }}>Direct Organizer Feed</span>
                    )}
                  </div>

                  <div>
                    <span style={{ color: 'var(--text-muted)', display: 'block', marginBottom: '0.2rem' }}>
                      Photography Attribution
                    </span>
                    <span style={{ color: 'var(--text-secondary)', fontWeight: 500 }}>
                      {event.imageAttribution || 'Austin Neill on Unsplash'}
                    </span>
                  </div>

                  <div>
                    <span style={{ color: 'var(--text-muted)', display: 'block', marginBottom: '0.2rem' }}>
                      Last Verified Timestamp
                    </span>
                    <span style={{ color: 'var(--text-secondary)', fontWeight: 600 }}>
                      17 October 2026
                    </span>
                  </div>
                </div>
              </Card>
            </section>
          </div>

          {/* Right Column: Checkout Basket & Atomic Hold CTA (Only for Managed & Upcoming) */}
          {isManaged && !isPast && (
            <div>
              <div
                style={{
                  position: 'sticky',
                  top: '90px',
                  backgroundColor: '#ffffff',
                  border: '1px solid var(--border-medium)',
                  borderRadius: 'var(--radius-xl)',
                  boxShadow: 'var(--shadow-lg)',
                  overflow: 'hidden',
                }}
              >
                {/* Header ribbon */}
                <div
                  style={{
                    backgroundColor: 'var(--brand-navy)',
                    color: '#ffffff',
                    padding: '1.25rem 1.5rem',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                  }}
                >
                  <div>
                    <div style={{ fontSize: '1.1rem', fontWeight: 800 }}>
                      Ticket Selection
                    </div>
                    <div style={{ fontSize: '0.8rem', color: '#94a3b8', marginTop: '0.15rem' }}>
                      Official Gate-Ready Passes
                    </div>
                  </div>
                  <span
                    style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '0.3rem',
                      fontSize: '0.75rem',
                      fontWeight: 700,
                      backgroundColor: 'rgba(16, 185, 129, 0.2)',
                      color: '#34d399',
                      padding: '0.25rem 0.6rem',
                      borderRadius: 'var(--radius-full)',
                      border: '1px solid rgba(16, 185, 129, 0.4)',
                    }}
                  >
                    <ShieldCheck size={13} /> 100% Verified
                  </span>
                </div>

                <div style={{ padding: '1.5rem' }}>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', marginBottom: '1.25rem', fontSize: '0.88rem' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', color: 'var(--text-secondary)' }}>
                      <span>Selected Tier:</span>
                      <span style={{ fontWeight: 700, color: 'var(--text-primary)' }}>{currentTier?.name}</span>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', color: 'var(--text-secondary)' }}>
                      <span>Quantity:</span>
                      <span style={{ fontWeight: 700, color: 'var(--text-primary)' }}>
                        {isReservedTier ? selectedSeatIds.length : gaQuantity} { (isReservedTier ? selectedSeatIds.length : gaQuantity) === 1 ? 'pass' : 'passes'}
                      </span>
                    </div>

                    {isReservedTier && selectedSeatIds.length > 0 && (
                      <div style={{ display: 'flex', justifyContent: 'space-between', color: 'var(--text-secondary)' }}>
                        <span>Assigned Seats:</span>
                        <span style={{ fontWeight: 700, color: 'var(--brand-primary)' }}>
                          {selectedSeatIds.length} seat(s) picked
                        </span>
                      </div>
                    )}
                  </div>

                  <div
                    style={{
                      borderTop: '1px solid var(--border-subtle)',
                      paddingTop: '1rem',
                      marginBottom: '1.5rem',
                    }}
                  >
                    {(() => {
                      const qty = isReservedTier ? selectedSeatIds.length : gaQuantity;
                      const unitPrice = currentTier ? currentTier.basePrice : 0;
                      const fee = currentTier ? currentTier.serviceFee : 0;
                      const tax = currentTier ? currentTier.taxAmount : 0;
                      const subtotal = unitPrice * qty;
                      const totalFees = fee * qty;
                      const totalTax = tax * qty;
                      const total = subtotal + totalFees + totalTax;

                      return (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', fontSize: '0.85rem' }}>
                          <div style={{ display: 'flex', justifyContent: 'space-between', color: 'var(--text-secondary)' }}>
                            <span>Passes ({qty} × ₹{unitPrice.toLocaleString()})</span>
                            <span style={{ fontWeight: 600, color: 'var(--text-primary)' }}>₹{subtotal.toLocaleString()}</span>
                          </div>
                          <div style={{ display: 'flex', justifyContent: 'space-between', color: 'var(--text-secondary)' }}>
                            <span>Convenience &amp; Platform Fee</span>
                            <span style={{ fontWeight: 600, color: 'var(--text-primary)' }}>₹{totalFees.toLocaleString()}</span>
                          </div>
                          <div style={{ display: 'flex', justifyContent: 'space-between', color: 'var(--text-secondary)' }}>
                            <span>Integrated GST (18%)</span>
                            <span style={{ fontWeight: 600, color: 'var(--text-primary)' }}>₹{totalTax.toLocaleString()}</span>
                          </div>
                          <div
                            style={{
                              display: 'flex',
                              justifyContent: 'space-between',
                              alignItems: 'baseline',
                              fontSize: '1.25rem',
                              fontWeight: 800,
                              color: 'var(--text-primary)',
                              paddingTop: '0.75rem',
                              borderTop: '1px solid var(--border-subtle)',
                              marginTop: '0.5rem',
                            }}
                          >
                            <span>Total Due</span>
                            <span style={{ color: 'var(--brand-primary)', fontSize: '1.45rem' }}>
                              ₹{total.toLocaleString()}
                            </span>
                          </div>
                        </div>
                      );
                    })()}
                  </div>

                  <Button
                    variant="primary"
                    size="lg"
                    isLoading={isHolding}
                    onClick={handleHoldAndProceed}
                    style={{ width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem', fontSize: '1rem', fontWeight: 700 }}
                  >
                    <span>Hold Seats &amp; Checkout</span>
                    <ArrowRight size={18} />
                  </Button>

                  <div
                    style={{
                      marginTop: '1.25rem',
                      padding: '0.75rem',
                      backgroundColor: 'var(--bg-primary)',
                      borderRadius: 'var(--radius-md)',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '0.5rem',
                      color: 'var(--text-secondary)',
                      fontSize: '0.78rem',
                      lineHeight: 1.4,
                    }}
                  >
                    <Shield size={16} color="var(--brand-primary)" style={{ flexShrink: 0 }} />
                    <span>
                      Seats are held for 10 minutes upon proceeding to protect against concurrent bookings.
                    </span>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
