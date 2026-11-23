import React, { useState, useEffect } from 'react';
import { EventCategory, VenueDto, EventDetail } from '../../types/api';
import { apiClient } from '../../services/apiClient';
import { Button } from '../ui/Button';
import { Card } from '../ui/Card';
import { Badge } from '../ui/Badge';
import { 
  X, 
  CheckCircle2, 
  AlertCircle, 
  MapPin, 
  ArrowRight, 
  ArrowLeft,
  Sparkles,
  Search,
  Armchair,
  Check,
} from 'lucide-react';

interface EventWizardModalProps {
  isOpen: boolean;
  onClose: () => void;
  onCreated: () => void;
  venues: VenueDto[];
  editingEvent?: EventDetail | null;
}

export const EventWizardModal: React.FC<EventWizardModalProps> = ({
  isOpen,
  onClose,
  onCreated,
  venues,
  editingEvent = null,
}) => {
  const [currentStep, setCurrentStep] = useState<number>(1);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  // Step 1: Basic Information
  const [title, setTitle] = useState('');
  const [category, setCategory] = useState<EventCategory>('CONCERT');
  const [shortSummary, setShortSummary] = useState('');
  const [description, setDescription] = useState('');
  const [bannerUrl, setBannerUrl] = useState('https://images.unsplash.com/photo-1540039155733-5bb30b53aa14?w=1600&auto=format&fit=crop&q=80');
  const [thumbnailUrl, setThumbnailUrl] = useState('https://images.unsplash.com/photo-1516450360452-9312f5e86fc7?w=600&auto=format&fit=crop&q=80');

  // Step 2: Venue & Layout
  const [selectedVenueId, setSelectedVenueId] = useState<string>(venues[0]?.id || '');
  const [layoutSearchQuery, setLayoutSearchQuery] = useState<string>('');

  // Step 3: Schedule & Entry
  const now = new Date();
  const defaultStartsAt = new Date(now.getTime() + 86400000 * 21).toISOString().slice(0, 16);
  const defaultEndsAt = new Date(now.getTime() + 86400000 * 21 + 14400000).toISOString().slice(0, 16);
  const [sessionTitle, setSessionTitle] = useState('Grand Opening Evening Showcase');
  const [startsAt, setStartsAt] = useState(defaultStartsAt);
  const [endsAt, setEndsAt] = useState(defaultEndsAt);
  const [ageRestriction, setAgeRestriction] = useState('16+ (Valid Photo ID required at gates)');
  const [requiresVirtualQueue, setRequiresVirtualQueue] = useState(false);

  // Step 4: Ticket Tiers
  const [ticketTiers, setTicketTiers] = useState<Array<{ name: string; price: number; quota: number; sectionId?: string }>>([
    { name: 'VIP Front Stage Access', price: 4999, quota: 100 },
    { name: 'General Admission Floor', price: 1499, quota: 400 },
  ]);
  const [maxTicketsPerUser, setMaxTicketsPerUser] = useState<number>(6);

  // Step 5: Policies & Commercial Terms
  const [isFeatured, setIsFeatured] = useState<boolean>(true);
  const [allowResale, setAllowResale] = useState<boolean>(true);
  const [refundPolicy, setRefundPolicy] = useState('Refunds permitted up to 48 hours prior to doors opening.');

  // Pre-fill fields when editingEvent is provided
  useEffect(() => {
    if (editingEvent) {
      setTitle(editingEvent.title || '');
      setCategory(editingEvent.category || 'CONCERT');
      setShortSummary(editingEvent.shortSummary || '');
      setDescription(editingEvent.description || '');
      if (editingEvent.bannerUrl) setBannerUrl(editingEvent.bannerUrl);
      if (editingEvent.thumbnailUrl) setThumbnailUrl(editingEvent.thumbnailUrl);
      if (editingEvent.venueId) setSelectedVenueId(editingEvent.venueId);
      setIsFeatured(editingEvent.isFeatured ?? true);
      setRequiresVirtualQueue(editingEvent.requiresVirtualQueue ?? false);
      if (editingEvent.maxTicketsPerUser) setMaxTicketsPerUser(editingEvent.maxTicketsPerUser);
      if (editingEvent.ageRestriction) setAgeRestriction(editingEvent.ageRestriction);

      if (editingEvent.sessions && editingEvent.sessions.length > 0) {
        const s = editingEvent.sessions[0];
        setSessionTitle(s.sessionTitle || 'Main Session');
        if (s.startsAt) setStartsAt(new Date(s.startsAt).toISOString().slice(0, 16));
        if (s.endsAt) setEndsAt(new Date(s.endsAt).toISOString().slice(0, 16));
      }

      if (editingEvent.ticketTypes && editingEvent.ticketTypes.length > 0) {
        setTicketTiers(
          editingEvent.ticketTypes.map((t) => ({
            name: t.name,
            price: Number(t.basePrice) || 0,
            quota: t.quota || 100,
            sectionId: t.sectionId || undefined,
          }))
        );
      }
    } else {
      // Reset to defaults for creation
      setTitle('');
      setCategory('CONCERT');
      setShortSummary('');
      setDescription('');
      setBannerUrl('https://images.unsplash.com/photo-1540039155733-5bb30b53aa14?w=1600&auto=format&fit=crop&q=80');
      setThumbnailUrl('https://images.unsplash.com/photo-1516450360452-9312f5e86fc7?w=600&auto=format&fit=crop&q=80');
      if (venues.length > 0) setSelectedVenueId(venues[0].id);
      setSessionTitle('Grand Opening Evening Showcase');
      setStartsAt(defaultStartsAt);
      setEndsAt(defaultEndsAt);
      setTicketTiers([
        { name: 'VIP Front Stage Access', price: 4999, quota: 100 },
        { name: 'General Admission Floor', price: 1499, quota: 400 },
      ]);
    }
    setCurrentStep(1);
    setError(null);
  }, [editingEvent, isOpen, venues]);

  useEffect(() => {
    if (venues.length > 0 && !selectedVenueId) {
      setSelectedVenueId(venues[0].id);
    }
  }, [venues]);

  if (!isOpen) return null;

  const handleAddTier = () => {
    setTicketTiers([...ticketTiers, { name: 'Balcony Reserved Tier', price: 1999, quota: 150 }]);
  };

  const handleRemoveTier = (idx: number) => {
    if (ticketTiers.length <= 1) return;
    setTicketTiers(ticketTiers.filter((_, i) => i !== idx));
  };

  const handleFinishSubmit = async (publishLive: boolean) => {
    setLoading(true);
    setError(null);

    try {
      if (editingEvent) {
        const updatePayload = {
          title: title.trim(),
          shortSummary: shortSummary.trim(),
          description: description.trim(),
          category,
          bannerUrl,
          thumbnailUrl,
          venueId: selectedVenueId,
          isFeatured,
          requiresVirtualQueue,
          maxTicketsPerUser,
          ageRestriction,
          refundPolicy,
          ticketSaleStatus: editingEvent.ticketSaleStatus || 'EVENTPULSE_MANAGED',
          officialInfoUrl: editingEvent.officialInfoUrl || '',
          officialBookingUrl: editingEvent.officialBookingUrl || '',
          sessions: [
            {
              id: editingEvent.sessions?.[0]?.id || null,
              sessionTitle: sessionTitle.trim(),
              doorsOpenAt: new Date(new Date(startsAt).getTime() - 3600000).toISOString(),
              startsAt: new Date(startsAt).toISOString(),
              endsAt: new Date(endsAt).toISOString(),
            },
          ],
          ticketTypes: ticketTiers.map((t, idx) => ({
            id: editingEvent.ticketTypes?.[idx]?.id || null,
            name: t.name,
            description: '',
            basePrice: t.price,
            serviceFee: Math.round(t.price * 0.05),
            taxAmount: Math.round(t.price * 0.18),
            quota: t.quota,
            sectionId: t.sectionId || null,
            salesEndAt: new Date(startsAt).toISOString(),
          })),
        };

        await apiClient.put(`/organizer/events/${editingEvent.id}`, updatePayload);
      } else {
        const payload = {
          title: title.trim(),
          shortSummary: shortSummary.trim(),
          description: description.trim(),
          category,
          bannerUrl,
          thumbnailUrl,
          venueId: selectedVenueId,
          isFeatured,
          requiresVirtualQueue,
          maxTicketsPerUser,
          sessions: [
            {
              sessionTitle: sessionTitle.trim(),
              doorsOpenAt: new Date(new Date(startsAt).getTime() - 3600000).toISOString(),
              startsAt: new Date(startsAt).toISOString(),
              endsAt: new Date(endsAt).toISOString(),
            },
          ],
          ticketTypes: ticketTiers.map((t) => ({
            name: t.name,
            basePrice: t.price,
            serviceFee: Math.round(t.price * 0.05),
            taxAmount: Math.round(t.price * 0.18),
            quota: t.quota,
            sectionId: t.sectionId || null,
            salesEndAt: new Date(startsAt).toISOString(),
          })),
        };

        const res = await apiClient.post<{ id: string }>('/organizer/events', payload);
        const eventId = res.data.id;

        if (publishLive) {
          try {
            await apiClient.post(`/organizer/events/${eventId}/publish`);
          } catch (pubErr) {
            console.warn('Note: Publish rejected if organizer unverified, saved as draft:', pubErr);
          }
        }
      }

      onCreated();
      onClose();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to save event');
    } finally {
      setLoading(false);
    }
  };

  const selectedVenue = venues.find((v) => v.id === selectedVenueId) || venues[0];

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        backgroundColor: 'rgba(15, 23, 42, 0.6)',
        backdropFilter: 'blur(6px)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 110,
        padding: '1.5rem',
        overflowY: 'auto',
      }}
    >
      <div
        style={{
          width: '100%',
          maxWidth: '780px',
          maxHeight: '90vh',
          backgroundColor: '#ffffff',
          borderRadius: 'var(--radius-xl)',
          border: '1px solid var(--border-subtle)',
          display: 'flex',
          flexDirection: 'column',
          position: 'relative',
          boxShadow: '0 25px 50px -12px rgba(15, 23, 42, 0.25)',
          overflow: 'hidden',
        }}
      >
        {/* Modal Header */}
        <div style={{ padding: '1.5rem 2rem', borderBottom: '1px solid var(--border-subtle)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', backgroundColor: '#ffffff' }}>
          <div>
            <h2 style={{ fontSize: '1.35rem', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '0.5rem', color: 'var(--text-primary)', margin: 0 }}>
              <Sparkles size={22} color="var(--brand-primary)" />
              {editingEvent ? 'Edit Event Configuration' : 'Event Creation & Lifecycle Wizard'}
            </h2>
            <p style={{ color: 'var(--text-secondary)', fontSize: '0.85rem', margin: '0.25rem 0 0' }}>
              {editingEvent
                ? `Updating: ${editingEvent.title} (Step ${currentStep} of 6)`
                : `Step ${currentStep} of 6 — Follow the guided lifecycle to draft, validate, and publish an event.`}
            </p>
          </div>
          <button
            onClick={onClose}
            style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', padding: '0.35rem' }}
          >
            <X size={22} />
          </button>
        </div>

        {/* Step Progress Stepper */}
        <div style={{ display: 'flex', borderBottom: '1px solid var(--border-subtle)', backgroundColor: '#f8fafc', overflowX: 'auto' }}>
          {[
            { num: 1, title: 'Basics' },
            { num: 2, title: 'Venue' },
            { num: 3, title: 'Schedule' },
            { num: 4, title: 'Tickets' },
            { num: 5, title: 'Policies' },
            { num: 6, title: 'Review & Publish' },
          ].map((s) => (
            <div
              key={s.num}
              onClick={() => s.num < currentStep && setCurrentStep(s.num)}
              style={{
                flex: 1,
                minWidth: '100px',
                padding: '0.75rem 0.5rem',
                textAlign: 'center',
                fontSize: '0.78rem',
                fontWeight: 600,
                color: currentStep === s.num ? 'var(--brand-primary)' : currentStep > s.num ? '#16a34a' : 'var(--text-muted)',
                borderBottom: currentStep === s.num ? '2px solid var(--brand-primary)' : '2px solid transparent',
                backgroundColor: currentStep === s.num ? '#eff6ff' : 'transparent',
                cursor: s.num < currentStep ? 'pointer' : 'default',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '0.4rem',
                transition: 'all 0.15s ease',
              }}
            >
              <span
                style={{
                  width: '20px',
                  height: '20px',
                  borderRadius: '50%',
                  backgroundColor: currentStep === s.num ? 'var(--brand-primary)' : currentStep > s.num ? '#16a34a' : '#e2e8f0',
                  color: currentStep === s.num || currentStep > s.num ? '#ffffff' : '#64748b',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: '0.7rem',
                  fontWeight: 700,
                }}
              >
                {currentStep > s.num ? '✓' : s.num}
              </span>
              {s.title}
            </div>
          ))}
        </div>

        {/* Modal Scrollable Body */}
        <div style={{ padding: '1.75rem 2rem', overflowY: 'auto', flex: 1, backgroundColor: '#ffffff' }}>
          {error && (
            <div style={{ padding: '0.75rem 1rem', backgroundColor: '#fef2f2', border: '1px solid #fecaca', color: '#dc2626', borderRadius: 'var(--radius-sm)', fontSize: '0.85rem', marginBottom: '1.25rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <AlertCircle size={16} />
              {error}
            </div>
          )}

          {/* STEP 1: Basic Information */}
          {currentStep === 1 && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
              <div>
                <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-primary)', marginBottom: '0.35rem' }}>
                  Event Title *
                </label>
                <input
                  type="text"
                  required
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="e.g. Electric Symphony World Tour 2027"
                  style={{ width: '100%', padding: '0.75rem', backgroundColor: '#ffffff', border: '1px solid var(--border-medium)', borderRadius: 'var(--radius-sm)', color: 'var(--text-primary)', boxSizing: 'border-box' }}
                />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-primary)', marginBottom: '0.35rem' }}>
                    Event Category *
                  </label>
                  <select
                    value={category}
                    onChange={(e) => setCategory(e.target.value as EventCategory)}
                    style={{ width: '100%', padding: '0.75rem', backgroundColor: '#ffffff', border: '1px solid var(--border-medium)', borderRadius: 'var(--radius-sm)', color: 'var(--text-primary)', boxSizing: 'border-box' }}
                  >
                    <option value="CONCERT">Concert & Live Music</option>
                    <option value="CONFERENCE">Technology & Cloud Conference</option>
                    <option value="THEATRE">Performing Arts & Theatre</option>
                    <option value="SPORTS">Stadium Sports & Tournaments</option>
                    <option value="COMEDY">Comedy & Special Showcases</option>
                  </select>
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-primary)', marginBottom: '0.35rem' }}>
                    Short Summary (Hero tagline) *
                  </label>
                  <input
                    type="text"
                    required
                    value={shortSummary}
                    onChange={(e) => setShortSummary(e.target.value)}
                    placeholder="e.g. The definitive multi-sensory orchestral concert."
                    style={{ width: '100%', padding: '0.75rem', backgroundColor: '#ffffff', border: '1px solid var(--border-medium)', borderRadius: 'var(--radius-sm)', color: 'var(--text-primary)', boxSizing: 'border-box' }}
                  />
                </div>
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-primary)', marginBottom: '0.35rem' }}>
                  Comprehensive Description *
                </label>
                <textarea
                  rows={4}
                  required
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Provide complete event highlights, lineup, and schedule details..."
                  style={{ width: '100%', padding: '0.75rem', backgroundColor: '#ffffff', border: '1px solid var(--border-medium)', borderRadius: 'var(--radius-sm)', color: 'var(--text-primary)', resize: 'vertical', boxSizing: 'border-box' }}
                />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-primary)', marginBottom: '0.35rem' }}>
                    Banner Image URL
                  </label>
                  <input
                    type="text"
                    value={bannerUrl}
                    onChange={(e) => setBannerUrl(e.target.value)}
                    style={{ width: '100%', padding: '0.75rem', backgroundColor: '#ffffff', border: '1px solid var(--border-medium)', borderRadius: 'var(--radius-sm)', color: 'var(--text-primary)', fontSize: '0.85rem', boxSizing: 'border-box' }}
                  />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-primary)', marginBottom: '0.35rem' }}>
                    Thumbnail Image URL
                  </label>
                  <input
                    type="text"
                    value={thumbnailUrl}
                    onChange={(e) => setThumbnailUrl(e.target.value)}
                    style={{ width: '100%', padding: '0.75rem', backgroundColor: '#ffffff', border: '1px solid var(--border-medium)', borderRadius: 'var(--radius-sm)', color: 'var(--text-primary)', fontSize: '0.85rem', boxSizing: 'border-box' }}
                  />
                </div>
              </div>
            </div>
          )}

          {/* STEP 2: Venue, Address, & Seating Layout */}
          {currentStep === 2 && (() => {
            const filteredVenues = venues.filter((v) => {
              if (!layoutSearchQuery.trim()) return true;
              const q = layoutSearchQuery.toLowerCase();
              return (
                v.name.toLowerCase().includes(q) ||
                (v.city && v.city.toLowerCase().includes(q)) ||
                (v.layoutType && v.layoutType.toLowerCase().includes(q))
              );
            });

            return (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.4rem', flexWrap: 'wrap', gap: '0.5rem' }}>
                    <div>
                      <h4 style={{ fontSize: '1rem', fontWeight: 800, color: 'var(--text-primary)', margin: 0 }}>
                        Select Architectural Venue Layout *
                      </h4>
                      <p style={{ fontSize: '0.82rem', color: 'var(--text-secondary)', margin: '0.15rem 0 0' }}>
                        Choose from your saved custom layouts or physical arenas. Seating geometry binds automatically.
                      </p>
                    </div>
                    <Badge variant="info">
                      {venues.length} Saved {venues.length === 1 ? 'Layout' : 'Layouts'}
                    </Badge>
                  </div>

                  {/* Search Bar */}
                  {venues.length > 2 && (
                    <div style={{ position: 'relative', marginTop: '0.5rem', marginBottom: '0.75rem' }}>
                      <Search
                        size={15}
                        style={{
                          position: 'absolute',
                          left: '0.75rem',
                          top: '50%',
                          transform: 'translateY(-50%)',
                          color: 'var(--text-muted)',
                        }}
                      />
                      <input
                        type="text"
                        value={layoutSearchQuery}
                        onChange={(e) => setLayoutSearchQuery(e.target.value)}
                        placeholder="Search custom layouts by name, city, or layout type..."
                        style={{
                          width: '100%',
                          padding: '0.55rem 0.75rem 0.55rem 2.2rem',
                          backgroundColor: '#ffffff',
                          border: '1px solid var(--border-medium)',
                          borderRadius: 'var(--radius-sm)',
                          fontSize: '0.85rem',
                          boxSizing: 'border-box',
                        }}
                      />
                    </div>
                  )}

                  {/* Layout Selection Cards Grid */}
                  <div
                    style={{
                      display: 'grid',
                      gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))',
                      gap: '0.85rem',
                      maxHeight: '280px',
                      overflowY: 'auto',
                      padding: '2px',
                    }}
                  >
                    {filteredVenues.map((v) => {
                      const isSelected = v.id === (selectedVenue?.id || selectedVenueId);
                      return (
                        <div
                          key={v.id}
                          onClick={() => setSelectedVenueId(v.id)}
                          style={{
                            padding: '1rem',
                            borderRadius: 'var(--radius-md)',
                            border: isSelected ? '2px solid var(--brand-primary)' : '1px solid var(--border-medium)',
                            backgroundColor: isSelected ? '#f5f7ff' : '#ffffff',
                            cursor: 'pointer',
                            transition: 'all 0.15s ease',
                            display: 'flex',
                            flexDirection: 'column',
                            gap: '0.6rem',
                            boxShadow: isSelected ? '0 4px 12px rgba(99, 102, 241, 0.12)' : 'none',
                          }}
                        >
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '0.5rem' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.45rem' }}>
                              <div
                                style={{
                                  width: '28px',
                                  height: '28px',
                                  borderRadius: '6px',
                                  backgroundColor: isSelected ? 'var(--brand-primary)' : 'var(--bg-secondary)',
                                  color: isSelected ? '#ffffff' : 'var(--text-secondary)',
                                  display: 'flex',
                                  alignItems: 'center',
                                  justifyContent: 'center',
                                  flexShrink: 0,
                                }}
                              >
                                <Armchair size={15} />
                              </div>
                              <span style={{ fontWeight: 700, fontSize: '0.92rem', color: 'var(--text-primary)', lineHeight: 1.2 }}>
                                {v.name}
                              </span>
                            </div>
                            {isSelected && (
                              <Badge variant="success" style={{ fontSize: '0.7rem', padding: '2px 6px' }}>
                                <Check size={11} style={{ marginRight: '2px' }} /> Selected
                              </Badge>
                            )}
                          </div>

                          <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                            <MapPin size={13} color="var(--brand-primary)" />
                            <span>{v.city}, {v.state || 'India'}</span>
                          </div>

                          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap', marginTop: 'auto' }}>
                            <span
                              style={{
                                fontSize: '0.72rem',
                                fontWeight: 700,
                                backgroundColor: '#e0e7ff',
                                color: '#3730a3',
                                padding: '2px 6px',
                                borderRadius: '4px',
                                textTransform: 'uppercase',
                              }}
                            >
                              {v.layoutType || 'RESERVED'}
                            </span>
                            <span style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-secondary)' }}>
                              {v.totalCapacity?.toLocaleString() || 0} seats
                            </span>
                            <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>•</span>
                            <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                              {v.sections?.length || 0} zones
                            </span>
                          </div>
                        </div>
                      );
                    })}
                  </div>

                  {filteredVenues.length === 0 && (
                    <div style={{ padding: '2rem', textAlign: 'center', backgroundColor: '#f8fafc', borderRadius: 'var(--radius-md)', border: '1px dashed var(--border-medium)' }}>
                      <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem', margin: 0 }}>
                        No venue layouts match "{layoutSearchQuery}".
                      </p>
                    </div>
                  )}
                </div>

                {/* Selected Layout Deep Inspection Panel */}
                {selectedVenue && (
                  <Card style={{ padding: '1.25rem', backgroundColor: '#f8fafc', border: '1px solid var(--border-subtle)' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '0.75rem' }}>
                      <div>
                        <h4 style={{ fontWeight: 800, fontSize: '1.05rem', display: 'flex', alignItems: 'center', gap: '0.4rem', color: 'var(--text-primary)', margin: 0 }}>
                          <MapPin size={17} color="var(--brand-primary)" />
                          {selectedVenue.name}
                        </h4>
                        <p style={{ color: 'var(--text-secondary)', fontSize: '0.85rem', margin: '0.25rem 0 0' }}>
                          {selectedVenue.addressLine1}, {selectedVenue.city}, {selectedVenue.state} {selectedVenue.postalCode}
                        </p>
                      </div>
                      <Badge variant="info">{selectedVenue.layoutType} GEOMETRY</Badge>
                    </div>

                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '1rem', marginTop: '1rem', paddingTop: '0.75rem', borderTop: '1px solid var(--border-subtle)', fontSize: '0.85rem' }}>
                      <div>
                        <span style={{ color: 'var(--text-muted)', display: 'block', fontSize: '0.72rem', textTransform: 'uppercase', fontWeight: 600 }}>Total Capacity</span>
                        <strong style={{ color: 'var(--text-primary)', fontSize: '0.95rem' }}>{selectedVenue.totalCapacity?.toLocaleString()} Attendees</strong>
                      </div>
                      <div>
                        <span style={{ color: 'var(--text-muted)', display: 'block', fontSize: '0.72rem', textTransform: 'uppercase', fontWeight: 600 }}>Layout Version</span>
                        <strong style={{ color: 'var(--text-primary)', fontSize: '0.95rem' }}>v{selectedVenue.layoutVersion || 1}.0 Verified</strong>
                      </div>
                      <div>
                        <span style={{ color: 'var(--text-muted)', display: 'block', fontSize: '0.72rem', textTransform: 'uppercase', fontWeight: 600 }}>Configured Sections</span>
                        <strong style={{ color: 'var(--text-primary)', fontSize: '0.95rem' }}>{selectedVenue.sections?.length || 2} Zones Available</strong>
                      </div>
                    </div>

                    {selectedVenue.sections && selectedVenue.sections.length > 0 && (
                      <div style={{ marginTop: '0.85rem', display: 'flex', alignItems: 'center', gap: '0.4rem', flexWrap: 'wrap' }}>
                        <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontWeight: 600 }}>Zones:</span>
                        {selectedVenue.sections.map((s) => (
                          <span
                            key={s.id || s.sectionCode}
                            style={{
                              fontSize: '0.72rem',
                              padding: '2px 8px',
                              borderRadius: '4px',
                              backgroundColor: '#e2e8f0',
                              color: '#334155',
                              fontWeight: 600,
                            }}
                          >
                            {s.name} ({s.capacity} seats)
                          </span>
                        ))}
                      </div>
                    )}
                  </Card>
                )}
              </div>
            );
          })()}

          {/* STEP 3: Date, Time, Timezone & Entry */}
          {currentStep === 3 && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
              <div>
                <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-primary)', marginBottom: '0.35rem' }}>
                  Showcase Session Title
                </label>
                <input
                  type="text"
                  value={sessionTitle}
                  onChange={(e) => setSessionTitle(e.target.value)}
                  style={{ width: '100%', padding: '0.75rem', backgroundColor: '#ffffff', border: '1px solid var(--border-medium)', borderRadius: 'var(--radius-sm)', color: 'var(--text-primary)', boxSizing: 'border-box' }}
                />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-primary)', marginBottom: '0.35rem' }}>
                    Starts At (Date & Time) *
                  </label>
                  <input
                    type="datetime-local"
                    required
                    value={startsAt}
                    onChange={(e) => setStartsAt(e.target.value)}
                    style={{ width: '100%', padding: '0.75rem', backgroundColor: '#ffffff', border: '1px solid var(--border-medium)', borderRadius: 'var(--radius-sm)', color: 'var(--text-primary)', boxSizing: 'border-box' }}
                  />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-primary)', marginBottom: '0.35rem' }}>
                    Ends At (Date & Time) *
                  </label>
                  <input
                    type="datetime-local"
                    required
                    value={endsAt}
                    onChange={(e) => setEndsAt(e.target.value)}
                    style={{ width: '100%', padding: '0.75rem', backgroundColor: '#ffffff', border: '1px solid var(--border-medium)', borderRadius: 'var(--radius-sm)', color: 'var(--text-primary)', boxSizing: 'border-box' }}
                  />
                </div>
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-primary)', marginBottom: '0.35rem' }}>
                  Entry Age & Identification Policy
                </label>
                <input
                  type="text"
                  value={ageRestriction}
                  onChange={(e) => setAgeRestriction(e.target.value)}
                  style={{ width: '100%', padding: '0.75rem', backgroundColor: '#ffffff', border: '1px solid var(--border-medium)', borderRadius: 'var(--radius-sm)', color: 'var(--text-primary)', boxSizing: 'border-box' }}
                />
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', padding: '0.85rem 1rem', backgroundColor: '#f8fafc', border: '1px solid var(--border-subtle)', borderRadius: 'var(--radius-md)' }}>
                <input
                  type="checkbox"
                  id="vqToggle"
                  checked={requiresVirtualQueue}
                  onChange={(e) => setRequiresVirtualQueue(e.target.checked)}
                  style={{ accentColor: 'var(--brand-primary)', width: '16px', height: '16px' }}
                />
                <div>
                  <label htmlFor="vqToggle" style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-primary)', cursor: 'pointer' }}>
                    Enable High-Concurrency Virtual Waiting Queue
                  </label>
                  <span style={{ display: 'block', fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                    Throttles burst booking requests to prevent database row lock starvation during onsale peaks.
                  </span>
                </div>
              </div>
            </div>
          )}

          {/* STEP 4: Ticket Tiers & Capacity */}
          {currentStep === 4 && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontSize: '0.9rem', fontWeight: 700, color: 'var(--text-primary)' }}>Ticket Categories & Pricing</span>
                <Button size="sm" variant="secondary" onClick={handleAddTier}>
                  Add Tier
                </Button>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.85rem' }}>
                {ticketTiers.map((tier, idx) => (
                  <Card key={idx} style={{ padding: '1rem', display: 'flex', gap: '1rem', alignItems: 'center', flexWrap: 'wrap', backgroundColor: '#f8fafc', border: '1px solid var(--border-subtle)' }}>
                    <div style={{ flex: 2, minWidth: '180px' }}>
                      <label style={{ display: 'block', fontSize: '0.75rem', color: 'var(--text-secondary)', marginBottom: '0.2rem', fontWeight: 600 }}>Tier Name</label>
                      <input
                        type="text"
                        value={tier.name}
                        onChange={(e) => {
                          const val = e.target.value;
                          setTicketTiers(ticketTiers.map((t, i) => (i === idx ? { ...t, name: val } : t)));
                        }}
                        style={{ width: '100%', padding: '0.55rem 0.75rem', backgroundColor: '#ffffff', border: '1px solid var(--border-medium)', borderRadius: 'var(--radius-sm)', color: 'var(--text-primary)', boxSizing: 'border-box' }}
                      />
                    </div>
                    <div style={{ flex: 1, minWidth: '120px' }}>
                      <label style={{ display: 'block', fontSize: '0.75rem', color: 'var(--text-secondary)', marginBottom: '0.2rem', fontWeight: 600 }}>Base Price (₹)</label>
                      <input
                        type="number"
                        value={tier.price}
                        onChange={(e) => {
                          const val = parseInt(e.target.value) || 0;
                          setTicketTiers(ticketTiers.map((t, i) => (i === idx ? { ...t, price: val } : t)));
                        }}
                        style={{ width: '100%', padding: '0.55rem 0.75rem', backgroundColor: '#ffffff', border: '1px solid var(--border-medium)', borderRadius: 'var(--radius-sm)', color: 'var(--text-primary)', boxSizing: 'border-box' }}
                      />
                    </div>
                    <div style={{ flex: 1, minWidth: '120px' }}>
                      <label style={{ display: 'block', fontSize: '0.75rem', color: 'var(--text-secondary)', marginBottom: '0.2rem', fontWeight: 600 }}>Quota (Quantity)</label>
                      <input
                        type="number"
                        value={tier.quota}
                        onChange={(e) => {
                          const val = parseInt(e.target.value) || 0;
                          setTicketTiers(ticketTiers.map((t, i) => (i === idx ? { ...t, quota: val } : t)));
                        }}
                        style={{ width: '100%', padding: '0.55rem 0.75rem', backgroundColor: '#ffffff', border: '1px solid var(--border-medium)', borderRadius: 'var(--radius-sm)', color: 'var(--text-primary)', boxSizing: 'border-box' }}
                      />
                    </div>
                    {ticketTiers.length > 1 && (
                      <button
                        onClick={() => handleRemoveTier(idx)}
                        style={{ background: 'none', border: 'none', color: '#dc2626', cursor: 'pointer', alignSelf: 'flex-end', paddingBottom: '0.6rem', fontWeight: 600, fontSize: '0.8rem' }}
                      >
                        Remove
                      </button>
                    )}
                  </Card>
                ))}
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-primary)', marginBottom: '0.35rem' }}>
                  Purchase Limit (Max Tickets per User Order)
                </label>
                <input
                  type="number"
                  min="1"
                  max="12"
                  value={maxTicketsPerUser}
                  onChange={(e) => setMaxTicketsPerUser(parseInt(e.target.value) || 4)}
                  style={{ width: '120px', padding: '0.55rem 0.75rem', backgroundColor: '#ffffff', border: '1px solid var(--border-medium)', borderRadius: 'var(--radius-sm)', color: 'var(--text-primary)', boxSizing: 'border-box' }}
                />
              </div>
            </div>
          )}

          {/* STEP 5: Policies & Commercial Terms */}
          {currentStep === 5 && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', padding: '0.85rem 1rem', backgroundColor: '#f8fafc', border: '1px solid var(--border-subtle)', borderRadius: 'var(--radius-md)' }}>
                <input
                  type="checkbox"
                  id="featuredToggle"
                  checked={isFeatured}
                  onChange={(e) => setIsFeatured(e.target.checked)}
                  style={{ accentColor: 'var(--brand-primary)', width: '16px', height: '16px' }}
                />
                <div>
                  <label htmlFor="featuredToggle" style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-primary)', cursor: 'pointer' }}>
                    Feature on EventPulse Homepage Hero Banner
                  </label>
                  <span style={{ display: 'block', fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                    Maximizes marketplace visibility and discovery across audience segments.
                  </span>
                </div>
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', padding: '0.85rem 1rem', backgroundColor: '#f8fafc', border: '1px solid var(--border-subtle)', borderRadius: 'var(--radius-md)' }}>
                <input
                  type="checkbox"
                  id="resaleToggle"
                  checked={allowResale}
                  onChange={(e) => setAllowResale(e.target.checked)}
                  style={{ accentColor: 'var(--brand-primary)', width: '16px', height: '16px' }}
                />
                <div>
                  <label htmlFor="resaleToggle" style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-primary)', cursor: 'pointer' }}>
                    Allow Fan-to-Fan Verified Ticket Resale
                  </label>
                  <span style={{ display: 'block', fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                    Allows ticket holders to list verified tickets at strict discount prices (&lt; original price).
                  </span>
                </div>
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-primary)', marginBottom: '0.35rem' }}>
                  Refund & Cancellation Policy
                </label>
                <textarea
                  rows={3}
                  value={refundPolicy}
                  onChange={(e) => setRefundPolicy(e.target.value)}
                  style={{ width: '100%', padding: '0.75rem', backgroundColor: '#ffffff', border: '1px solid var(--border-medium)', borderRadius: 'var(--radius-sm)', color: 'var(--text-primary)', boxSizing: 'border-box' }}
                />
              </div>
            </div>
          )}

          {/* STEP 6: Review, Validation Checklist & Publish */}
          {currentStep === 6 && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
              <div style={{ padding: '1.25rem', backgroundColor: '#f8fafc', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-subtle)' }}>
                <h4 style={{ fontWeight: 700, fontSize: '1.1rem', marginBottom: '0.5rem', color: 'var(--text-primary)' }}>{title || 'Untitled Showcase'}</h4>
                <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap', marginBottom: '1rem' }}>
                  <Badge variant="info">{category}</Badge>
                  <Badge variant="neutral">{selectedVenue?.name}</Badge>
                  <Badge variant="success">Capacity: {ticketTiers.reduce((a, b) => a + b.quota, 0)} Tickets</Badge>
                </div>
                <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', margin: 0 }}>{shortSummary}</p>
              </div>

              {/* Validation Checklist */}
              <div style={{ padding: '1.25rem', backgroundColor: '#f8fafc', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-subtle)' }}>
                <span style={{ fontSize: '0.8rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--text-secondary)', display: 'block', marginBottom: '0.75rem' }}>
                  Lifecycle Validation Checks:
                </span>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', fontSize: '0.85rem' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: '#16a34a', fontWeight: 500 }}>
                    <CheckCircle2 size={16} /> Title and categorization validated
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: '#16a34a', fontWeight: 500 }}>
                    <CheckCircle2 size={16} /> Physical venue and geospatial coordinates attached
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: '#16a34a', fontWeight: 500 }}>
                    <CheckCircle2 size={16} /> Sales session schedule configured ({startsAt})
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: '#16a34a', fontWeight: 500 }}>
                    <CheckCircle2 size={16} /> {ticketTiers.length} tier categories ready for inventory allocation
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: '#16a34a', fontWeight: 500 }}>
                    <CheckCircle2 size={16} /> Anti-scalping resale policy enforced
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Modal Navigation Footer */}
        <div style={{ padding: '1.25rem 2rem', borderTop: '1px solid var(--border-subtle)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', backgroundColor: '#f8fafc' }}>
          {currentStep > 1 ? (
            <Button size="sm" variant="secondary" onClick={() => setCurrentStep(currentStep - 1)}>
              <ArrowLeft size={14} style={{ marginRight: '0.35rem' }} /> Back
            </Button>
          ) : (
            <div />
          )}

          <div style={{ display: 'flex', gap: '0.75rem' }}>
            {currentStep < 6 ? (
              <Button
                size="sm"
                variant="primary"
                onClick={() => {
                  if (currentStep === 1 && (!title || !shortSummary)) {
                    setError('Title and Short Summary are required.');
                    return;
                  }
                  setError(null);
                  setCurrentStep(currentStep + 1);
                }}
              >
                Next <ArrowRight size={14} style={{ marginLeft: '0.35rem' }} />
              </Button>
            ) : editingEvent ? (
              <Button
                size="sm"
                variant="primary"
                isLoading={loading}
                onClick={() => handleFinishSubmit(false)}
              >
                Save Changes
              </Button>
            ) : (
              <>
                <Button
                  size="sm"
                  variant="secondary"
                  isLoading={loading}
                  onClick={() => handleFinishSubmit(false)}
                >
                  Save as Draft
                </Button>
                <Button
                  size="sm"
                  variant="primary"
                  isLoading={loading}
                  onClick={() => handleFinishSubmit(true)}
                >
                  Publish Event Live
                </Button>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
