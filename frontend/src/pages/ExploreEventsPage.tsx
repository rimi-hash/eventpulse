import React, { useEffect, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { apiClient } from '../services/apiClient';
import { EventSummary, EventCategory } from '../types/api';
import { EventCard } from '../components/ui/EventCard';
import { SearchFilterBar } from '../components/ui/SearchFilterBar';
import { Button } from '../components/ui/Button';
import { LoadingSpinner } from '../components/ui/LoadingSpinner';
import { ErrorAlert } from '../components/ui/ErrorAlert';
import {
  MapPin,
  Ticket,
  History,
  Music,
  Smile,
  Trophy,
  Cpu,
  Theater,
  Sparkles,
  ArrowRight,
  Building2,
  LucideIcon,
} from 'lucide-react';

const CATEGORIES: { label: string; value?: EventCategory; icon: LucideIcon }[] = [
  { label: 'All Events', icon: Ticket },
  { label: 'Concerts & Music', value: 'CONCERT', icon: Music },
  { label: 'Stand-Up Comedy', value: 'COMEDY', icon: Smile },
  { label: 'Sports & Stadium', value: 'SPORTS', icon: Trophy },
  { label: 'Tech & Conferences', value: 'CONFERENCE', icon: Cpu },
  { label: 'Theatre & Arts', value: 'THEATRE', icon: Theater },
];

export const ExploreEventsPage: React.FC = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const urlCity = searchParams.get('city') || 'ALL';
  const urlCategory = (searchParams.get('category') as EventCategory) || undefined;
  const urlQuery = searchParams.get('q') || '';

  const [events, setEvents] = useState<EventSummary[]>([]);
  const [pastEvents, setPastEvents] = useState<EventSummary[]>([]);
  const [featuredEvents, setFeaturedEvents] = useState<EventSummary[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<EventCategory | undefined>(urlCategory);
  const [selectedCity, setSelectedCity] = useState<string>(urlCity);
  const [viewTab, setViewTab] = useState<'UPCOMING' | 'PAST'>('UPCOMING');
  const [searchQuery, setSearchQuery] = useState(urlQuery);
  const [dateFilter, setDateFilter] = useState('ALL');
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchEvents = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const [eventsRes, featuredRes, pastRes] = await Promise.all([
        apiClient.get<EventSummary[]>('/events?size=50'),
        apiClient.get<EventSummary[]>('/events/featured'),
        apiClient.get<EventSummary[]>('/events/past'),
      ]);

      setEvents(eventsRes.data || []);
      setFeaturedEvents(featuredRes.data || []);
      setPastEvents(pastRes.data || []);
    } catch (err: unknown) {
      if (err instanceof Error) {
        setError(err.message);
      } else {
        setError('Failed to load events from server');
      }
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchEvents();
  }, []);

  // Sync state with search params changes
  useEffect(() => {
    const qCity = searchParams.get('city') || 'ALL';
    const qCat = (searchParams.get('category') as EventCategory) || undefined;
    const qText = searchParams.get('q') || '';
    setSelectedCity(qCity);
    setSelectedCategory(qCat);
    setSearchQuery(qText);
  }, [searchParams]);

  const handleSearch = (filters: { query: string; city: string; dateFilter: string }) => {
    setSearchQuery(filters.query);
    setSelectedCity(filters.city);
    setDateFilter(filters.dateFilter);

    const newParams = new URLSearchParams(searchParams);
    if (filters.query) newParams.set('q', filters.query);
    else newParams.delete('q');

    if (filters.city && filters.city !== 'ALL') newParams.set('city', filters.city);
    else newParams.delete('city');

    setSearchParams(newParams);
  };

  const handleCategorySelect = (category?: EventCategory) => {
    setSelectedCategory(category);
    const newParams = new URLSearchParams(searchParams);
    if (category) newParams.set('category', category);
    else newParams.delete('category');
    setSearchParams(newParams);
  };

  const activeCatalog = viewTab === 'UPCOMING' ? events : pastEvents;

  // Filter events
  const filteredEvents = activeCatalog.filter((e) => {
    const matchesCat = !selectedCategory || e.category === selectedCategory;
    const matchesCity =
      !selectedCity ||
      selectedCity === 'ALL' ||
      (e.city && e.city.toLowerCase().trim() === selectedCity.toLowerCase().trim());
    const query = searchQuery.toLowerCase().trim();
    const matchesQuery =
      !query ||
      e.title.toLowerCase().includes(query) ||
      (e.city && e.city.toLowerCase().includes(query)) ||
      (e.venueName && e.venueName.toLowerCase().includes(query)) ||
      (e.shortSummary && e.shortSummary.toLowerCase().includes(query));
    return matchesCat && matchesCity && matchesQuery;
  });

  // Top featured hero event
  const heroEvent = featuredEvents.length > 0 ? featuredEvents[0] : (events.length > 0 ? events[0] : null);
  const secondaryFeatured = featuredEvents.slice(1, 3);

  const heroDate = heroEvent?.startDate ? new Date(heroEvent.startDate) : null;
  const heroDateStr = heroDate ? heroDate.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' }) : '';
  const heroPrice = typeof heroEvent?.startingPrice === 'number'
    ? heroEvent.startingPrice
    : (heroEvent?.startingPrice ? parseFloat(String(heroEvent.startingPrice)) : 0);

  return (
    <div style={{ backgroundColor: 'var(--bg-primary)', minHeight: '100vh', paddingBottom: '5rem' }}>
      {/* 1. Ticketmaster-Grade Editorial Hero Showcase */}
      {viewTab === 'UPCOMING' && !searchQuery && !selectedCategory && selectedCity === 'ALL' && heroEvent && (
        <section
          style={{
            backgroundColor: '#101828',
            color: '#FFFFFF',
            padding: '2.5rem 0 3.5rem',
            borderBottom: '1px solid #1E293B',
          }}
        >
          <div className="container">

            {/* Asymmetric Editorial Hero Grid */}
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: secondaryFeatured.length > 0 ? 'repeat(auto-fit, minmax(360px, 1fr))' : '1fr',
                gap: '1.75rem',
                alignItems: 'stretch',
              }}
            >
              {/* Primary Large Hero Card */}
              <div
                style={{
                  position: 'relative',
                  borderRadius: 'var(--radius-lg)',
                  overflow: 'hidden',
                  backgroundColor: '#1E293B',
                  minHeight: '380px',
                  display: 'flex',
                  flexDirection: 'column',
                  justifyContent: 'flex-end',
                  boxShadow: 'var(--shadow-xl)',
                }}
              >
                <img
                  src={heroEvent.bannerUrl || 'https://images.unsplash.com/photo-1540039155733-5bb30b53aa14?auto=format&fit=crop&w=1200&q=80'}
                  alt={heroEvent.title}
                  style={{
                    position: 'absolute',
                    top: 0,
                    left: 0,
                    width: '100%',
                    height: '100%',
                    objectFit: 'cover',
                  }}
                />
                <div
                  style={{
                    position: 'absolute',
                    top: 0,
                    left: 0,
                    width: '100%',
                    height: '100%',
                    background: 'linear-gradient(180deg, rgba(16, 24, 40, 0.1) 0%, rgba(16, 24, 40, 0.95) 100%)',
                  }}
                />

                <div style={{ position: 'relative', padding: '2rem', zIndex: 10 }}>
                  {heroDateStr && (
                    <div style={{ marginBottom: '0.6rem' }}>
                      <span style={{ fontSize: '0.85rem', color: '#E2E8F0', fontWeight: 600 }}>
                        {heroDateStr}
                      </span>
                    </div>
                  )}

                  <h1
                    style={{
                      fontFamily: 'var(--font-display)',
                      fontSize: 'clamp(1.75rem, 3.5vw, 2.5rem)',
                      fontWeight: 800,
                      color: '#FFFFFF',
                      lineHeight: 1.2,
                      letterSpacing: '-0.02em',
                      marginBottom: '0.75rem',
                    }}
                  >
                    {heroEvent.title}
                  </h1>

                  <div style={{ display: 'flex', alignItems: 'center', gap: '1.25rem', marginBottom: '1.25rem', flexWrap: 'wrap' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', color: '#CBD5E1', fontSize: '0.9rem' }}>
                      <MapPin size={16} color="var(--brand-primary)" />
                      <span>{heroEvent.venueName || 'Venue'}, {heroEvent.venueCity || 'City'}</span>
                    </div>
                    {heroPrice > 0 && (
                      <div style={{ fontSize: '1.05rem', fontWeight: 800, color: '#38BDF8' }}>
                        Tickets from ₹{heroPrice.toLocaleString('en-IN')}
                      </div>
                    )}
                  </div>

                  <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap' }}>
                    <Link to={`/events/${heroEvent.slug || heroEvent.id}`}>
                      <Button
                        variant="primary"
                        size="lg"
                        style={{
                          backgroundColor: 'var(--brand-primary)',
                          fontWeight: 700,
                          borderRadius: 'var(--radius-sm)',
                        }}
                      >
                        <Ticket size={18} />
                        <span>Find Tickets</span>
                        <ArrowRight size={16} />
                      </Button>
                    </Link>
                  </div>
                </div>
              </div>

              {/* Secondary Featured Features (Side-by-side or stacked on mobile) */}
              {secondaryFeatured.length > 0 && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
                  {secondaryFeatured.map((secEvent) => {
                    const secDate = secEvent.startDate ? new Date(secEvent.startDate) : null;
                    const secDateStr = secDate ? secDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }) : '';
                    const secPrice = typeof secEvent.startingPrice === 'number'
                      ? secEvent.startingPrice
                      : (secEvent.startingPrice ? parseFloat(String(secEvent.startingPrice)) : 0);

                    return (
                      <Link
                        key={secEvent.id}
                        to={`/events/${secEvent.slug || secEvent.id}`}
                        style={{
                          position: 'relative',
                          borderRadius: 'var(--radius-md)',
                          overflow: 'hidden',
                          backgroundColor: '#1E293B',
                          flex: 1,
                          display: 'flex',
                          flexDirection: 'column',
                          justifyContent: 'flex-end',
                          padding: '1.5rem',
                          textDecoration: 'none',
                          border: '1px solid #334155',
                          transition: 'border-color var(--transition-fast), transform var(--transition-fast)',
                        }}
                        className="surface-card-interactive"
                      >
                        <img
                          src={secEvent.bannerUrl || 'https://images.unsplash.com/photo-1540039155733-5bb30b53aa14?auto=format&fit=crop&w=800&q=80'}
                          alt={secEvent.title}
                          style={{
                            position: 'absolute',
                            top: 0,
                            left: 0,
                            width: '100%',
                            height: '100%',
                            objectFit: 'cover',
                          }}
                        />
                        <div
                          style={{
                            position: 'absolute',
                            top: 0,
                            left: 0,
                            width: '100%',
                            height: '100%',
                            background: 'linear-gradient(180deg, rgba(16, 24, 40, 0.2) 0%, rgba(16, 24, 40, 0.95) 100%)',
                          }}
                        />

                        <div style={{ position: 'relative', zIndex: 10 }}>
                          {secDateStr && (
                            <div style={{ marginBottom: '0.4rem' }}>
                              <span style={{ fontSize: '0.8rem', color: '#E2E8F0', fontWeight: 600 }}>{secDateStr}</span>
                            </div>
                          )}
                          <h3 style={{ fontSize: '1.2rem', fontWeight: 700, color: '#FFFFFF', marginBottom: '0.4rem', lineHeight: 1.3 }}>
                            {secEvent.title}
                          </h3>
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <span style={{ fontSize: '0.82rem', color: '#CBD5E1' }}>{secEvent.venueCity || 'Chennai'}</span>
                            <span style={{ fontSize: '0.9rem', fontWeight: 800, color: '#38BDF8' }}>
                              {secPrice > 0 ? `From ₹${secPrice.toLocaleString('en-IN')}` : 'Tickets Available'}
                            </span>
                          </div>
                        </div>
                      </Link>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        </section>
      )}

      {/* 2. Prominent Global Event Search Bar */}
      <section
        style={{
          backgroundColor: '#FFFFFF',
          borderBottom: '1px solid var(--border-subtle)',
          padding: '1.75rem 0',
          boxShadow: 'var(--shadow-xs)',
        }}
      >
        <div className="container">
          <SearchFilterBar
            initialQuery={searchQuery}
            initialCity={selectedCity}
            initialDateFilter={dateFilter}
            onSearch={handleSearch}
          />
        </div>
      </section>

      {/* 3. Category Discovery Bar & Upcoming / Past Filter */}
      <section className="container" style={{ paddingTop: '2rem', marginBottom: '2rem' }}>
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            flexWrap: 'wrap',
            gap: '1rem',
          }}
        >
          {/* Category Pills */}
          <div
            style={{
              display: 'flex',
              gap: '0.5rem',
              overflowX: 'auto',
              paddingBottom: '0.4rem',
            }}
          >
            {CATEGORIES.map((cat) => {
              const isSelected = selectedCategory === cat.value;
              const Icon = cat.icon;
              return (
                <button
                  key={cat.label}
                  onClick={() => handleCategorySelect(cat.value)}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.45rem',
                    padding: '0.5rem 1rem',
                    borderRadius: 'var(--radius-sm)',
                    backgroundColor: isSelected ? 'var(--brand-primary)' : '#FFFFFF',
                    color: isSelected ? '#FFFFFF' : 'var(--text-secondary)',
                    fontWeight: isSelected ? 700 : 500,
                    fontSize: '0.86rem',
                    border: `1px solid ${isSelected ? 'var(--brand-primary)' : 'var(--border-subtle)'}`,
                    cursor: 'pointer',
                    whiteSpace: 'nowrap',
                    boxShadow: isSelected ? 'var(--shadow-xs)' : 'none',
                    transition: 'all var(--transition-fast)',
                  }}
                >
                  <Icon size={14} />
                  <span>{cat.label}</span>
                </button>
              );
            })}
          </div>

          {/* Upcoming vs Past Switcher */}
          <div
            style={{
              display: 'flex',
              backgroundColor: '#FFFFFF',
              border: '1px solid var(--border-subtle)',
              borderRadius: 'var(--radius-sm)',
              padding: '0.2rem',
              boxShadow: 'var(--shadow-xs)',
            }}
          >
            <button
              onClick={() => setViewTab('UPCOMING')}
              style={{
                padding: '0.4rem 0.85rem',
                borderRadius: 'var(--radius-xs)',
                backgroundColor: viewTab === 'UPCOMING' ? 'var(--brand-subtle)' : 'transparent',
                color: viewTab === 'UPCOMING' ? 'var(--brand-primary)' : 'var(--text-secondary)',
                fontWeight: viewTab === 'UPCOMING' ? 700 : 500,
                fontSize: '0.82rem',
                cursor: 'pointer',
              }}
            >
              Upcoming ({events.length})
            </button>
            <button
              onClick={() => setViewTab('PAST')}
              style={{
                padding: '0.4rem 0.85rem',
                borderRadius: 'var(--radius-xs)',
                backgroundColor: viewTab === 'PAST' ? 'var(--bg-secondary)' : 'transparent',
                color: viewTab === 'PAST' ? 'var(--text-primary)' : 'var(--text-secondary)',
                fontWeight: viewTab === 'PAST' ? 700 : 500,
                fontSize: '0.82rem',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '0.35rem',
              }}
            >
              <History size={13} />
              Past ({pastEvents.length})
            </button>
          </div>
        </div>
      </section>

      {/* 4. Main Event Grid Catalog */}
      <div className="container">
        {isLoading && <LoadingSpinner label="Loading verified events..." />}

        {error && <ErrorAlert title="Catalog Notice" message={error} onRetry={fetchEvents} onClose={() => setError(null)} />}

        {!isLoading && !error && (
          <>
            {/* Catalog Section Header */}
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                marginBottom: '1.5rem',
                paddingBottom: '0.75rem',
                borderBottom: '1px solid var(--border-subtle)',
              }}
            >
              <div>
                <h2 style={{ fontSize: '1.35rem', fontWeight: 800, color: 'var(--text-primary)' }}>
                  {viewTab === 'PAST'
                    ? 'Concluded & Historical Events'
                    : selectedCity === 'ALL'
                    ? 'All Upcoming Events'
                    : `Upcoming Events in ${selectedCity}`}
                </h2>
                <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', marginTop: '0.15rem' }}>
                  Showing {filteredEvents.length} {filteredEvents.length === 1 ? 'event' : 'events'} verified for direct purchase
                </p>
              </div>

              {/* Fan Resale Link Banner */}
              <Link
                to="/resale"
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.4rem',
                  fontSize: '0.85rem',
                  fontWeight: 600,
                  color: 'var(--brand-primary)',
                }}
              >
                <Sparkles size={15} />
                <span>Explore Fan Resale Marketplace</span>
                <ArrowRight size={14} />
              </Link>
            </div>

            {/* Events Grid or No-Results State */}
            {filteredEvents.length === 0 ? (
              <div
                style={{
                  textAlign: 'center',
                  padding: '4rem 1.5rem',
                  backgroundColor: '#FFFFFF',
                  borderRadius: 'var(--radius-md)',
                  border: '1px solid var(--border-subtle)',
                }}
              >
                <Ticket size={44} color="var(--text-muted)" style={{ margin: '0 auto 1rem' }} />
                <h3 style={{ fontSize: '1.15rem', fontWeight: 700, color: 'var(--text-primary)', marginBottom: '0.5rem' }}>
                  No matching events found
                </h3>
                <p style={{ color: 'var(--text-secondary)', maxWidth: '420px', margin: '0 auto 1.5rem', fontSize: '0.9rem' }}>
                  We couldn&apos;t find any verified events matching your current filters. Try searching with different keywords or exploring all cities.
                </p>
                <Button
                  variant="primary"
                  onClick={() => {
                    setSelectedCity('ALL');
                    setSelectedCategory(undefined);
                    setSearchQuery('');
                    setSearchParams(new URLSearchParams());
                  }}
                  style={{ backgroundColor: 'var(--brand-primary)' }}
                >
                  Reset All Filters
                </Button>
              </div>
            ) : (
              <div
                style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))',
                  gap: '1.75rem',
                }}
              >
                {filteredEvents.map((event) => (
                  <EventCard key={event.id} event={event} />
                ))}
              </div>
            )}
          </>
        )}
      </div>

      {/* 5. Dedicated Organizer Promotion Section */}
      <section
        style={{
          marginTop: '4rem',
          borderTop: '1px solid var(--border-subtle)',
          backgroundColor: '#FFFFFF',
          padding: '4rem 0',
        }}
        aria-label="Organizer Partnership"
      >
        <div className="container" style={{ maxWidth: '960px' }}>
          <div
            style={{
              backgroundColor: 'var(--brand-navy, #0B132B)',
              color: '#FFFFFF',
              borderRadius: 'var(--radius-lg, 12px)',
              padding: '3rem 2.5rem',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              textAlign: 'center',
              boxShadow: '0 8px 30px rgba(11, 19, 43, 0.15)',
              position: 'relative',
              overflow: 'hidden',
            }}
          >
            <div
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '0.5rem',
                backgroundColor: 'rgba(255, 255, 255, 0.1)',
                padding: '0.4rem 0.85rem',
                borderRadius: '999px',
                fontSize: '0.8rem',
                fontWeight: 600,
                letterSpacing: '0.04em',
                textTransform: 'uppercase',
                color: 'var(--brand-primary, #6366F1)',
                marginBottom: '1.25rem',
              }}
            >
              <Building2 size={14} />
              <span>For Event Producers &amp; Organizers</span>
            </div>

            <h2
              style={{
                fontFamily: 'var(--font-display)',
                fontSize: 'clamp(1.75rem, 3.5vw, 2.5rem)',
                fontWeight: 800,
                lineHeight: 1.25,
                color: '#FFFFFF',
                maxWidth: '680px',
                marginBottom: '1rem',
                letterSpacing: '-0.02em',
              }}
            >
              Your event deserves a bigger stage.
            </h2>

            <p
              style={{
                fontSize: '1.05rem',
                color: 'rgba(255, 255, 255, 0.75)',
                lineHeight: 1.6,
                maxWidth: '620px',
                margin: '0 auto 2rem',
              }}
            >
              Bring your event to life with EventPulse. Apply to become an organizer, manage your events, configure tickets and reach your audience.
            </p>

            <Link
              to="/organizer/apply"
              id="become-organizer-cta"
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '0.6rem',
                backgroundColor: 'var(--brand-primary, #6366F1)',
                color: '#FFFFFF',
                fontWeight: 700,
                fontSize: '1rem',
                padding: '0.85rem 1.75rem',
                borderRadius: 'var(--radius-md, 8px)',
                textDecoration: 'none',
                boxShadow: '0 4px 14px rgba(99, 102, 241, 0.35)',
                transition: 'all 0.2s ease',
              }}
            >
              <span>Become an Organizer</span>
              <ArrowRight size={18} />
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
};
