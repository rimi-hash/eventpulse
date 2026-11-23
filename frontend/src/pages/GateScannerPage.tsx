import React, { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { apiClient } from '../services/apiClient';
import { CheckinResult, EventScanStats, EventSummary } from '../types/api';
import { Card } from '../components/ui/Card';
import { Badge } from '../components/ui/Badge';
import { Button } from '../components/ui/Button';
import { LoadingSpinner } from '../components/ui/LoadingSpinner';
import { ErrorAlert } from '../components/ui/ErrorAlert';
import { QrCode, CheckCircle2, AlertTriangle, XCircle, Activity, ScanLine } from 'lucide-react';

export const GateScannerPage: React.FC = () => {
  const [searchParams] = useSearchParams();
  const codeParam = searchParams.get('code') || '';

  const [ticketInput, setTicketInput] = useState(codeParam);
  const [gateName, setGateName] = useState('Main Gate - North');
  const [events, setEvents] = useState<EventSummary[]>([]);
  const [selectedEventId, setSelectedEventId] = useState<string>('');
  const [stats, setStats] = useState<EventScanStats | null>(null);

  const [scanResult, setScanResult] = useState<CheckinResult | null>(null);
  const [isScanning, setIsScanning] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [scanHistory, setScanHistory] = useState<CheckinResult[]>([]);

  // Fetch events to get stats
  useEffect(() => {
    const fetchEvents = async () => {
      try {
        const res = await apiClient.get<EventSummary[]>('/events');
        if (res.data && res.data.length > 0) {
          setEvents(res.data);
          setSelectedEventId(res.data[0].id);
        }
      } catch (ignored) {}
    };
    fetchEvents();
  }, []);

  // Fetch event scan stats
  const fetchStats = async (eventId: string) => {
    if (!eventId) return;
    try {
      const res = await apiClient.get<EventScanStats>(`/checkin/stats/${eventId}`);
      setStats(res.data);
    } catch (ignored) {}
  };

  useEffect(() => {
    if (selectedEventId) {
      fetchStats(selectedEventId);
    }
  }, [selectedEventId]);

  // If code was passed in URL params, validate automatically
  useEffect(() => {
    if (codeParam) {
      handleValidate(codeParam);
    }
  }, [codeParam]);

  const handleValidate = async (codeToTest?: string) => {
    const code = (codeToTest || ticketInput).trim();
    if (!code) {
      setError('Please enter a ticket number or QR payload to validate');
      return;
    }

    setIsScanning(true);
    setError(null);
    try {
      const res = await apiClient.post<CheckinResult>('/checkin/validate', {
        ticketCodeOrQrPayload: code,
        gateName: gateName,
        deviceInfo: 'Gate Terminal #1 (Chrome Desktop)',
      });

      setScanResult(res.data);
      setScanHistory((prev) => [res.data, ...prev.slice(0, 9)]);

      if (selectedEventId) {
        fetchStats(selectedEventId);
      }
    } catch (err: unknown) {
      if (err instanceof Error) {
        setError(err.message);
      } else {
        setError('Check-in service encountered an error.');
      }
    } finally {
      setIsScanning(false);
    }
  };

  return (
    <div className="container" style={{ paddingTop: '2.5rem', paddingBottom: '4rem' }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '2.5rem', flexWrap: 'wrap', gap: '1rem' }}>
        <div>
          <div style={{ display: 'inline-flex', alignItems: 'center', gap: '0.4rem', marginBottom: '0.5rem' }}>
            <Badge variant="info">
              <ScanLine size={13} style={{ marginRight: '0.25rem' }} />
              Live Field Operations Terminal
            </Badge>
          </div>
          <h1 style={{ fontSize: '2.2rem', fontWeight: 800, fontFamily: 'var(--font-display)' }}>
            Gate Check-In &amp; Pass Verifier
          </h1>
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.95rem' }}>
            Sub-150ms cryptographic pass verification with instant duplicate scan prevention.
          </p>
        </div>

        {/* Gate Selector */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
          <select
            value={gateName}
            onChange={(e) => setGateName(e.target.value)}
            style={{
              padding: '0.6rem 1rem',
              backgroundColor: 'var(--bg-elevated)',
              border: '1px solid var(--border-medium)',
              borderRadius: 'var(--radius-sm)',
              color: 'var(--text-primary)',
              fontWeight: 600,
              fontSize: '0.85rem',
            }}
          >
            <option value="Main Gate - North">Main Gate - North</option>
            <option value="VIP Turnstile - East">VIP Turnstile - East</option>
            <option value="General Admission Turnstile 1">General Admission Turnstile 1</option>
            <option value="Backstage Staff Entry">Backstage Staff Entry</option>
          </select>
        </div>
      </div>

      {/* Main Scanner Section */}
      <div style={{ display: 'grid', gridTemplateColumns: '1.4fr 1fr', gap: '2rem', alignItems: 'start' }}>
        {/* Left: Interactive Scanner Form & Scan Result Feedback */}
        <div>
          <Card style={{ padding: '2rem', marginBottom: '2rem' }}>
            <h2 style={{ fontSize: '1.25rem', fontWeight: 700, marginBottom: '0.5rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <QrCode size={20} color="var(--brand-primary)" />
              Scan or Enter Pass Identifier
            </h2>
            <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', marginBottom: '1.25rem' }}>
              Paste cryptographic QR payload or standard ticket number (e.g. TKT-2027-...).
            </p>

            <div style={{ display: 'flex', gap: '0.75rem', marginBottom: '1.25rem' }}>
              <input
                type="text"
                value={ticketInput}
                onChange={(e) => setTicketInput(e.target.value)}
                placeholder="Enter Ticket Number or paste QR payload..."
                style={{
                  flex: 1,
                  padding: '0.9rem 1.25rem',
                  backgroundColor: 'var(--bg-secondary)',
                  border: '1px solid var(--border-medium)',
                  borderRadius: 'var(--radius-sm)',
                  color: 'var(--text-primary)',
                  fontSize: '0.95rem',
                  fontFamily: 'monospace',
                }}
              />
              <Button
                variant="primary"
                size="md"
                isLoading={isScanning}
                onClick={() => handleValidate()}
                style={{ minWidth: '140px' }}
              >
                Validate Pass
              </Button>
            </div>

            {/* Quick Demo Pre-filled buttons */}
            <div style={{ padding: '1rem', backgroundColor: 'var(--bg-elevated)', borderRadius: 'var(--radius-sm)', fontSize: '0.82rem' }}>
              <div style={{ color: 'var(--text-muted)', marginBottom: '0.5rem', fontWeight: 600 }}>
                Quick Test Shortcuts:
              </div>
              <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
                <Button
                  size="sm"
                  variant="secondary"
                  onClick={() => {
                    // Try pre-seeded ticket for Priya
                    setTicketInput('TKT-2027-');
                    handleValidate('TKT-2027-');
                  }}
                  style={{ fontSize: '0.75rem' }}
                >
                  Test Active Ticket (1st Scan = Valid)
                </Button>
                <Button
                  size="sm"
                  variant="secondary"
                  onClick={() => {
                    handleValidate('TKT-2027-INVALID-0000');
                  }}
                  style={{ fontSize: '0.75rem', color: 'var(--status-danger)' }}
                >
                  Test Fake Ticket (Red = Invalid)
                </Button>
              </div>
            </div>
          </Card>

          {error && <ErrorAlert title="Scanner Error" message={error} onClose={() => setError(null)} />}

          {/* Real-Time Scan Result Visual Feedback */}
          {scanResult && (
            <Card
              style={{
                padding: '2rem',
                border:
                  scanResult.scanResult === 'VALID'
                    ? '2px solid var(--status-success)'
                    : scanResult.scanResult === 'ALREADY_USED'
                    ? '2px solid var(--status-warning)'
                    : '2px solid var(--status-danger)',
                backgroundColor:
                  scanResult.scanResult === 'VALID'
                    ? 'rgba(16, 185, 129, 0.08)'
                    : scanResult.scanResult === 'ALREADY_USED'
                    ? 'rgba(245, 158, 11, 0.08)'
                    : 'rgba(239, 68, 68, 0.08)',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: '1.25rem' }}>
                {scanResult.scanResult === 'VALID' && (
                  <div style={{ width: '48px', height: '48px', borderRadius: '50%', backgroundColor: 'var(--status-success)', color: '#ffffff', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <CheckCircle2 size={30} />
                  </div>
                )}
                {scanResult.scanResult === 'ALREADY_USED' && (
                  <div style={{ width: '48px', height: '48px', borderRadius: '50%', backgroundColor: 'var(--status-warning)', color: '#ffffff', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <AlertTriangle size={30} />
                  </div>
                )}
                {scanResult.scanResult !== 'VALID' && scanResult.scanResult !== 'ALREADY_USED' && (
                  <div style={{ width: '48px', height: '48px', borderRadius: '50%', backgroundColor: 'var(--status-danger)', color: '#ffffff', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <XCircle size={30} />
                  </div>
                )}

                <div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
                    <h3 style={{ fontSize: '1.5rem', fontWeight: 800 }}>
                      {scanResult.scanResult === 'VALID'
                        ? 'ENTRY APPROVED'
                        : scanResult.scanResult === 'ALREADY_USED'
                        ? 'DUPLICATE REDEMPTION DETECTED'
                        : 'ENTRY DENIED'}
                    </h3>
                    <Badge
                      variant={
                        scanResult.scanResult === 'VALID'
                          ? 'success'
                          : scanResult.scanResult === 'ALREADY_USED'
                          ? 'warning'
                          : 'danger'
                      }
                    >
                      {scanResult.scanResult}
                    </Badge>
                  </div>
                  <p style={{ fontSize: '0.9rem', color: 'var(--text-secondary)' }}>
                    {scanResult.message}
                  </p>
                </div>
              </div>

              {/* Pass Metadata */}
              <div
                style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(2, 1fr)',
                  gap: '1rem',
                  padding: '1.25rem',
                  backgroundColor: 'var(--bg-card)',
                  borderRadius: 'var(--radius-md)',
                  fontSize: '0.88rem',
                }}
              >
                <div>
                  <span style={{ color: 'var(--text-muted)' }}>Ticket Number: </span>
                  <span style={{ fontWeight: 700, fontFamily: 'monospace' }}>{scanResult.ticketNumber}</span>
                </div>
                <div>
                  <span style={{ color: 'var(--text-muted)' }}>Attendee Name: </span>
                  <span style={{ fontWeight: 700 }}>{scanResult.attendeeName}</span>
                </div>
                <div>
                  <span style={{ color: 'var(--text-muted)' }}>Event Title: </span>
                  <span style={{ fontWeight: 600 }}>{scanResult.eventTitle}</span>
                </div>
                <div>
                  <span style={{ color: 'var(--text-muted)' }}>Seat / Tier: </span>
                  <span style={{ fontWeight: 700, color: 'var(--brand-primary)' }}>{scanResult.seatLabel}</span>
                </div>
              </div>

              {/* Duplicate Scan Alert details */}
              {scanResult.firstScanDetails && (
                <div
                  style={{
                    marginTop: '1rem',
                    padding: '1rem',
                    backgroundColor: 'rgba(245, 158, 11, 0.15)',
                    borderRadius: 'var(--radius-sm)',
                    fontSize: '0.85rem',
                    color: 'var(--status-warning)',
                  }}
                >
                  <strong>Security Alert:</strong> This ticket was first redeemed on{' '}
                  {new Date(scanResult.firstScanDetails.scannedAt).toLocaleTimeString()} at{' '}
                  {scanResult.firstScanDetails.gateName} by staff {scanResult.firstScanDetails.staffName}.
                </div>
              )}
            </Card>
          )}

          {/* Recent Scans Log */}
          {scanHistory.length > 0 && (
            <div style={{ marginTop: '2.5rem' }}>
              <h3 style={{ fontSize: '1.1rem', fontWeight: 700, marginBottom: '0.75rem' }}>
                Recent Scans at {gateName}
              </h3>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                {scanHistory.map((h, i) => (
                  <div
                    key={i}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      padding: '0.75rem 1rem',
                      backgroundColor: 'var(--bg-elevated)',
                      borderRadius: 'var(--radius-sm)',
                      fontSize: '0.85rem',
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                      <Badge variant={h.scanResult === 'VALID' ? 'success' : 'danger'}>
                        {h.scanResult}
                      </Badge>
                      <span style={{ fontFamily: 'monospace' }}>{h.ticketNumber}</span>
                      <span>•</span>
                      <span>{h.attendeeName}</span>
                    </div>
                    <span style={{ color: 'var(--text-muted)', fontSize: '0.78rem' }}>
                      {new Date(h.scannedAt).toLocaleTimeString()}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Right: Live Gate Telemetry Metrics */}
        <div>
          <Card style={{ padding: '1.75rem' }}>
            <h3 style={{ fontSize: '1.2rem', fontWeight: 700, marginBottom: '0.5rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <Activity size={18} color="var(--brand-primary)" />
              Live Turnstile Telemetry
            </h3>

            {events.length > 0 && (
              <div style={{ marginBottom: '1.5rem' }}>
                <label style={{ display: 'block', fontSize: '0.8rem', color: 'var(--text-muted)', marginBottom: '0.35rem' }}>
                  Select Event
                </label>
                <select
                  value={selectedEventId}
                  onChange={(e) => setSelectedEventId(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '0.6rem',
                    backgroundColor: 'var(--bg-secondary)',
                    border: '1px solid var(--border-subtle)',
                    borderRadius: 'var(--radius-sm)',
                    color: 'var(--text-primary)',
                    fontSize: '0.85rem',
                  }}
                >
                  {events.map((e) => (
                    <option key={e.id} value={e.id}>
                      {e.title}
                    </option>
                  ))}
                </select>
              </div>
            )}

            {stats ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                  <div style={{ padding: '1rem', backgroundColor: 'var(--bg-elevated)', borderRadius: 'var(--radius-sm)' }}>
                    <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Issued Passes</div>
                    <div style={{ fontSize: '1.5rem', fontWeight: 800 }}>{stats.totalIssued}</div>
                  </div>
                  <div style={{ padding: '1rem', backgroundColor: 'var(--bg-elevated)', borderRadius: 'var(--radius-sm)' }}>
                    <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Checked In</div>
                    <div style={{ fontSize: '1.5rem', fontWeight: 800, color: 'var(--status-success)' }}>
                      {stats.totalCheckedIn}
                    </div>
                  </div>
                </div>

                {/* Progress Gauge */}
                <div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.85rem', marginBottom: '0.4rem' }}>
                    <span style={{ color: 'var(--text-secondary)' }}>Attendance Rate</span>
                    <span style={{ fontWeight: 700 }}>{stats.checkinPercentage}%</span>
                  </div>
                  <div style={{ width: '100%', height: '8px', backgroundColor: 'var(--bg-secondary)', borderRadius: 'var(--radius-full)', overflow: 'hidden' }}>
                    <div
                      style={{
                        width: `${Math.min(100, stats.checkinPercentage)}%`,
                        height: '100%',
                        backgroundColor: 'var(--brand-primary)',
                        borderRadius: 'var(--radius-full)',
                      }}
                    />
                  </div>
                </div>

                <div style={{ padding: '1rem', backgroundColor: 'rgba(245, 158, 11, 0.1)', borderRadius: 'var(--radius-sm)', border: '1px solid rgba(245, 158, 11, 0.2)' }}>
                  <div style={{ fontSize: '0.75rem', color: 'var(--status-warning)' }}>
                    Duplicate Rejection Attempts
                  </div>
                  <div style={{ fontSize: '1.3rem', fontWeight: 800, color: 'var(--status-warning)' }}>
                    {stats.alreadyUsedAttempts}
                  </div>
                </div>
              </div>
            ) : (
              <LoadingSpinner label="Loading telemetry..." />
            )}
          </Card>
        </div>
      </div>
    </div>
  );
};
