import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { Calendar, MapPin, Ticket } from 'lucide-react';
import { EventSummary } from '../../types/api';

export interface EventCardProps {
  event: EventSummary;
  className?: string;
  style?: React.CSSProperties;
  priority?: boolean;
}

export const EventCard: React.FC<EventCardProps> = ({ event, className = '', style }) => {
  const [imageError, setImageError] = useState(false);
  const [isHovered, setIsHovered] = useState(false);

  // Parse Date
  const eventDate = event.startDate ? new Date(event.startDate) : null;
  const monthStr = eventDate ? eventDate.toLocaleString('en-US', { month: 'short' }).toUpperCase() : 'LIVE';
  const dayStr = eventDate ? eventDate.getDate() : '—';
  const timeStr = eventDate ? eventDate.toLocaleString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true }) : '';

  // Determine starting price display
  const startingPrice = typeof event.startingPrice === 'number' 
    ? event.startingPrice 
    : (event.startingPrice ? parseFloat(String(event.startingPrice)) : 0);

  const fallbackBanner = 'https://images.unsplash.com/photo-1540039155733-5bb30b53aa14?auto=format&fit=crop&w=1000&q=80';
  const displayImage = (!imageError && event.bannerUrl) ? event.bannerUrl : fallbackBanner;

  return (
    <Link
      to={`/events/${event.slug || event.id}`}
      className={`surface-card-interactive ${className}`}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      style={{
        display: 'flex',
        flexDirection: 'column',
        borderRadius: 'var(--radius-md)',
        overflow: 'hidden',
        height: '100%',
        backgroundColor: '#FFFFFF',
        border: `1px solid ${isHovered ? 'var(--brand-primary)' : 'var(--border-subtle)'}`,
        boxShadow: isHovered ? 'var(--shadow-md)' : 'var(--shadow-xs)',
        transform: isHovered ? 'translateY(-2px)' : 'none',
        transition: 'transform var(--transition-fast), box-shadow var(--transition-fast), border-color var(--transition-fast)',
        textDecoration: 'none',
        ...style,
      }}
    >
      {/* 16:9 Image Wrapper */}
      <div
        style={{
          position: 'relative',
          width: '100%',
          paddingTop: '56.25%', // 16:9 Aspect Ratio
          overflow: 'hidden',
          backgroundColor: '#1E293B',
        }}
      >
        <img
          src={displayImage}
          alt={event.title}
          onError={() => setImageError(true)}
          style={{
            position: 'absolute',
            top: 0,
            left: 0,
            width: '100%',
            height: '100%',
            objectFit: 'cover',
            transition: 'transform var(--transition-slow)',
            transform: isHovered ? 'scale(1.04)' : 'scale(1)',
          }}
          loading="lazy"
        />

        {/* Date Badge Overlay */}
        {eventDate && (
          <div
            style={{
              position: 'absolute',
              top: '12px',
              left: '12px',
              backgroundColor: 'rgba(255, 255, 255, 0.96)',
              backdropFilter: 'blur(4px)',
              borderRadius: 'var(--radius-sm)',
              padding: '0.35rem 0.6rem',
              textAlign: 'center',
              boxShadow: 'var(--shadow-sm)',
              border: '1px solid rgba(0, 0, 0, 0.08)',
              minWidth: '46px',
            }}
          >
            <div style={{ fontSize: '0.68rem', fontWeight: 800, color: 'var(--brand-primary)', letterSpacing: '0.04em' }}>
              {monthStr}
            </div>
            <div style={{ fontSize: '1.15rem', fontWeight: 800, color: 'var(--text-primary)', lineHeight: 1 }}>
              {dayStr}
            </div>
          </div>
        )}
      </div>

      {/* Card Content */}
      <div
        style={{
          padding: '1.25rem',
          display: 'flex',
          flexDirection: 'column',
          flex: 1,
          justifyContent: 'space-between',
        }}
      >
        <div>
          {/* Title */}
          <h3
            style={{
              fontSize: '1.05rem',
              fontWeight: 700,
              color: 'var(--text-primary)',
              lineHeight: 1.35,
              marginBottom: '0.5rem',
              overflow: 'hidden',
              display: '-webkit-box',
              WebkitLineClamp: 2,
              WebkitBoxOrient: 'vertical',
            }}
          >
            {event.title}
          </h3>

          {/* DateTime & Venue */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.35rem', marginBottom: '0.85rem' }}>
            {timeStr && (
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', fontSize: '0.82rem', color: 'var(--text-secondary)' }}>
                <Calendar size={14} style={{ color: 'var(--brand-primary)', flexShrink: 0 }} />
                <span>{timeStr}</span>
              </div>
            )}
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', fontSize: '0.82rem', color: 'var(--text-secondary)' }}>
              <MapPin size={14} style={{ color: 'var(--brand-primary)', flexShrink: 0 }} />
              <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                {event.venueName || event.venueCity ? `${event.venueName || ''}${event.venueName && event.venueCity ? ', ' : ''}${event.venueCity || ''}` : 'Location TBA'}
              </span>
            </div>
          </div>
        </div>

        {/* Card Footer: Starting Price & Action */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            paddingTop: '0.85rem',
            borderTop: '1px solid var(--border-subtle)',
            marginTop: 'auto',
          }}
        >
          <div>
            <div style={{ fontSize: '0.72rem', color: 'var(--text-secondary)', textTransform: 'uppercase', fontWeight: 600, letterSpacing: '0.04em' }}>
              Prices From
            </div>
            <div style={{ fontSize: '1.05rem', fontWeight: 800, color: 'var(--text-primary)' }}>
              {startingPrice > 0 ? `₹${startingPrice.toLocaleString('en-IN')}` : 'Free / Available'}
            </div>
          </div>

          <span
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '0.35rem',
              fontSize: '0.85rem',
              fontWeight: 700,
              color: 'var(--brand-primary)',
            }}
          >
            <Ticket size={14} />
            <span>Tickets</span>
          </span>
        </div>
      </div>
    </Link>
  );
};
