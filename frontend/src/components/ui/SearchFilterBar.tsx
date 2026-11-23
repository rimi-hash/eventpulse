import React, { useState } from 'react';
import { Search, MapPin, Calendar, X, ArrowRight } from 'lucide-react';
import { Button } from './Button';

export interface SearchFilterBarProps {
  initialQuery?: string;
  initialCity?: string;
  initialDateFilter?: string;
  onSearch: (filters: { query: string; city: string; dateFilter: string }) => void;
  className?: string;
  style?: React.CSSProperties;
}

const CITIES = [
  { label: 'All Cities', value: 'ALL' },
  { label: 'Chennai', value: 'Chennai' },
  { label: 'Bengaluru', value: 'Bengaluru' },
  { label: 'Mumbai', value: 'Mumbai' },
  { label: 'Coimbatore', value: 'Coimbatore' },
];

const DATE_OPTIONS = [
  { label: 'All Dates', value: 'ALL' },
  { label: 'This Weekend', value: 'THIS_WEEKEND' },
  { label: 'Next 30 Days', value: 'THIS_MONTH' },
];

export const SearchFilterBar: React.FC<SearchFilterBarProps> = ({
  initialQuery = '',
  initialCity = 'ALL',
  initialDateFilter = 'ALL',
  onSearch,
  className = '',
  style,
}) => {
  const [query, setQuery] = useState(initialQuery);
  const [city, setCity] = useState(initialCity);
  const [dateFilter, setDateFilter] = useState(initialDateFilter);

  const handleSubmit = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    onSearch({ query: query.trim(), city, dateFilter });
  };

  const handleClear = () => {
    setQuery('');
    setCity('ALL');
    setDateFilter('ALL');
    onSearch({ query: '', city: 'ALL', dateFilter: 'ALL' });
  };

  const hasActiveFilters = query.trim() !== '' || city !== 'ALL' || dateFilter !== 'ALL';

  return (
    <form
      onSubmit={handleSubmit}
      className={`search-pill-container ${className}`}
      style={{
        display: 'flex',
        flexWrap: 'wrap',
        alignItems: 'center',
        padding: '0.4rem',
        backgroundColor: '#FFFFFF',
        border: '1px solid #D0D5DD',
        borderRadius: 'var(--radius-md)',
        boxShadow: 'var(--shadow-sm)',
        width: '100%',
        gap: '0.25rem',
        ...style,
      }}
    >
      {/* 1. Keyword Input */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          flex: '1 1 240px',
          padding: '0.5rem 0.85rem',
          gap: '0.6rem',
        }}
      >
        <Search size={18} style={{ color: 'var(--brand-primary)', flexShrink: 0 }} />
        <input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search by artist, event or keyword..."
          style={{
            border: 'none',
            outline: 'none',
            width: '100%',
            fontSize: '0.92rem',
            color: 'var(--text-primary)',
            backgroundColor: 'transparent',
          }}
        />
        {query && (
          <button
            type="button"
            onClick={() => setQuery('')}
            style={{ color: 'var(--text-muted)', padding: '2px', display: 'flex' }}
            title="Clear text"
          >
            <X size={15} />
          </button>
        )}
      </div>

      {/* Divider */}
      <div
        className="search-divider"
        style={{
          width: '1px',
          height: '28px',
          backgroundColor: 'var(--border-subtle)',
          margin: '0 0.25rem',
          display: 'none',
        }}
      />

      {/* 2. City Selector */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          flex: '0 1 180px',
          padding: '0.5rem 0.85rem',
          gap: '0.5rem',
          borderLeft: '1px solid var(--border-subtle)',
        }}
      >
        <MapPin size={18} style={{ color: 'var(--brand-primary)', flexShrink: 0 }} />
        <select
          value={city}
          onChange={(e) => setCity(e.target.value)}
          style={{
            border: 'none',
            outline: 'none',
            width: '100%',
            fontSize: '0.9rem',
            color: 'var(--text-primary)',
            backgroundColor: 'transparent',
            cursor: 'pointer',
            fontWeight: 500,
          }}
        >
          {CITIES.map((c) => (
            <option key={c.value} value={c.value}>
              {c.label}
            </option>
          ))}
        </select>
      </div>

      {/* 3. Date Range Selector */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          flex: '0 1 180px',
          padding: '0.5rem 0.85rem',
          gap: '0.5rem',
          borderLeft: '1px solid var(--border-subtle)',
        }}
      >
        <Calendar size={18} style={{ color: 'var(--brand-primary)', flexShrink: 0 }} />
        <select
          value={dateFilter}
          onChange={(e) => setDateFilter(e.target.value)}
          style={{
            border: 'none',
            outline: 'none',
            width: '100%',
            fontSize: '0.9rem',
            color: 'var(--text-primary)',
            backgroundColor: 'transparent',
            cursor: 'pointer',
            fontWeight: 500,
          }}
        >
          {DATE_OPTIONS.map((d) => (
            <option key={d.value} value={d.value}>
              {d.label}
            </option>
          ))}
        </select>
      </div>

      {/* 4. Action Buttons */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', marginLeft: 'auto', padding: '0.2rem' }}>
        {hasActiveFilters && (
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={handleClear}
            style={{ fontSize: '0.82rem', color: 'var(--text-secondary)' }}
          >
            Clear
          </Button>
        )}
        <Button
          type="submit"
          variant="primary"
          size="md"
          style={{
            borderRadius: 'var(--radius-sm)',
            padding: '0.55rem 1.4rem',
            fontWeight: 700,
            backgroundColor: 'var(--brand-primary)',
          }}
        >
          <span>Find Events</span>
          <ArrowRight size={15} />
        </Button>
      </div>
    </form>
  );
};
