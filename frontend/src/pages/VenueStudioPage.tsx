import React, { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { VenueDesigner } from '../components/organizer/VenueDesigner';
import { apiClient } from '../services/apiClient';
import { VenueDto } from '../types/api';
import { LoadingSpinner } from '../components/ui/LoadingSpinner';
import { MapPin, Sparkles } from 'lucide-react';

export const VenueStudioPage: React.FC = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const [venues, setVenues] = useState<VenueDto[]>([]);
  const [selectedVenueId, setSelectedVenueId] = useState<string>('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    apiClient
      .get<VenueDto[]>('/venues')
      .then((res) => {
        const loaded = res.data || [];
        setVenues(loaded);

        const paramId = searchParams.get('venueId');
        if (paramId && loaded.some((v) => v.id === paramId)) {
          setSelectedVenueId(paramId);
        } else {
          // Default to Express Avenue Mall Grounds if present
          const eaVenue = loaded.find((v) => v.name.toLowerCase().includes('express avenue'));
          if (eaVenue) {
            setSelectedVenueId(eaVenue.id);
          } else if (loaded.length > 0) {
            setSelectedVenueId(loaded[0].id);
          }
        }
      })
      .catch((err) => {
        console.warn('Failed to load venues', err);
      })
      .finally(() => {
        setLoading(false);
      });
  }, [searchParams]);

  if (loading) {
    return (
      <div style={{ padding: '6rem 0', textAlign: 'center' }}>
        <LoadingSpinner label="Initializing Professional Venue Architect Canvas..." />
      </div>
    );
  }

  const currentVenue = venues.find((v) => v.id === selectedVenueId) || venues[0] || null;

  return (
    <div>
      {/* Venue Switcher Bar */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '0.75rem 1.5rem',
          backgroundColor: '#0f172a',
          color: '#ffffff',
          borderBottom: '1px solid #1e293b',
          flexWrap: 'wrap',
          gap: '1rem',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              width: '32px',
              height: '32px',
              borderRadius: '8px',
              background: 'linear-gradient(135deg, #6366f1, #a855f7)',
            }}
          >
            <Sparkles size={18} color="#ffffff" />
          </div>
          <div>
            <span style={{ fontSize: '0.9rem', fontWeight: 700, letterSpacing: '0.02em' }}>
              Venue Architect Studio
            </span>
            <span style={{ fontSize: '0.75rem', color: '#94a3b8', marginLeft: '0.6rem' }}>
              Select a venue to view, customize, and edit 2D geometries
            </span>
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
          <MapPin size={16} color="#94a3b8" />
          <label htmlFor="venue-selector" style={{ fontSize: '0.82rem', color: '#cbd5e1', fontWeight: 600 }}>
            Active Venue:
          </label>
          <select
            id="venue-selector"
            value={selectedVenueId}
            onChange={(e) => {
              const newId = e.target.value;
              setSelectedVenueId(newId);
              setSearchParams({ venueId: newId });
            }}
            style={{
              padding: '0.45rem 1rem',
              backgroundColor: '#1e293b',
              color: '#ffffff',
              border: '1px solid #334155',
              borderRadius: '6px',
              fontSize: '0.85rem',
              fontWeight: 600,
              cursor: 'pointer',
              outline: 'none',
            }}
          >
            {venues.map((v) => (
              <option key={v.id} value={v.id}>
                {v.name} ({v.city}) — Cap: {v.totalCapacity}
              </option>
            ))}
          </select>
        </div>
      </div>

      {currentVenue && (
        <VenueDesigner
          key={currentVenue.id}
          initialVenue={currentVenue}
          fullScreenDefault={false}
          onSaved={(saved) => {
            setVenues([saved, ...venues.filter((v) => v.id !== saved.id)]);
            setSelectedVenueId(saved.id);
          }}
        />
      )}
    </div>
  );
};
