import React, { useEffect, useState } from 'react';
import { apiClient } from '../services/apiClient';
import { HealthStatusResponse } from '../types/api';
import { Card } from '../components/ui/Card';
import { Badge } from '../components/ui/Badge';
import { Button } from '../components/ui/Button';
import { LoadingSpinner } from '../components/ui/LoadingSpinner';
import { ErrorAlert } from '../components/ui/ErrorAlert';
import { Activity, Database, Server, Cpu, CheckCircle2, ShieldCheck, Zap } from 'lucide-react';

export const HomePage: React.FC = () => {
  const [healthData, setHealthData] = useState<HealthStatusResponse | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchHealth = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const response = await apiClient.get<HealthStatusResponse>('/health');
      setHealthData(response.data);
    } catch (err: unknown) {
      if (err instanceof Error) {
        setError(err.message);
      } else {
        setError('Failed to reach backend health endpoint');
      }
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchHealth();
  }, []);

  return (
    <div className="container" style={{ paddingTop: '3rem' }}>
      {/* Hero Header */}
      <section style={{ textAlign: 'center', marginBottom: '3.5rem' }}>
        <div style={{ display: 'inline-block', marginBottom: '1rem' }}>
          <Badge variant="info">Phase 1 Foundation Operational</Badge>
        </div>
        <h1
          style={{
            fontFamily: 'var(--font-display)',
            fontSize: 'clamp(2.2rem, 5vw, 3.5rem)',
            fontWeight: 800,
            lineHeight: 1.15,
            letterSpacing: '-0.03em',
            marginBottom: '1rem',
          }}
        >
          Intelligent Event Commerce <br />
          <span className="text-gradient">&amp; Operations Platform</span>
        </h1>
        <p
          style={{
            maxWidth: '680px',
            margin: '0 auto',
            fontSize: '1.1rem',
            color: 'var(--text-secondary)',
          }}
        >
          Connecting organizers and attendees through high-concurrency ticket drops, atomic seat holds,
          asymmetric cryptographic passes, and resilient live gate operations.
        </p>
      </section>

      {/* Live System Health Telemetry Card */}
      <section style={{ marginBottom: '3rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1rem' }}>
          <h2 style={{ fontSize: '1.25rem', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <Activity size={20} color="var(--brand-primary)" />
            Backend Runtime Telemetry
          </h2>
          <Button size="sm" variant="secondary" onClick={fetchHealth} isLoading={isLoading}>
            Refresh Status
          </Button>
        </div>

        <Card>
          {isLoading && !healthData && <LoadingSpinner label="Querying EventPulse Health Endpoint..." />}

          {error && (
            <ErrorAlert
              title="Backend Telemetry Notice"
              message={error}
              onRetry={fetchHealth}
            />
          )}

          {healthData && (
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
                gap: '1.5rem',
              }}
            >
              {/* Platform Core Status */}
              <div style={{ display: 'flex', alignItems: 'flex-start', gap: '1rem' }}>
                <div
                  style={{
                    padding: '0.75rem',
                    borderRadius: 'var(--radius-md)',
                    background: 'var(--status-success-bg)',
                    color: 'var(--status-success)',
                  }}
                >
                  <Server size={24} />
                </div>
                <div>
                  <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Core Status</div>
                  <div style={{ fontSize: '1.1rem', fontWeight: 700, marginTop: '2px' }}>
                    {healthData.status}
                  </div>
                  <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
                    Version {healthData.version}
                  </div>
                </div>
              </div>

              {/* Java Runtime */}
              <div style={{ display: 'flex', alignItems: 'flex-start', gap: '1rem' }}>
                <div
                  style={{
                    padding: '0.75rem',
                    borderRadius: 'var(--radius-md)',
                    background: 'rgba(99, 102, 241, 0.12)',
                    color: 'var(--brand-primary)',
                  }}
                >
                  <Cpu size={24} />
                </div>
                <div>
                  <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Java Baseline</div>
                  <div style={{ fontSize: '1.1rem', fontWeight: 700, marginTop: '2px' }}>
                    Java 21 LTS
                  </div>
                  <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
                    Runtime: {healthData.javaVersion}
                  </div>
                </div>
              </div>

              {/* Database Connection */}
              <div style={{ display: 'flex', alignItems: 'flex-start', gap: '1rem' }}>
                <div
                  style={{
                    padding: '0.75rem',
                    borderRadius: 'var(--radius-md)',
                    background:
                      healthData.components?.database?.startsWith('CONNECTED')
                        ? 'var(--status-success-bg)'
                        : 'var(--status-warning-bg)',
                    color:
                      healthData.components?.database?.startsWith('CONNECTED')
                        ? 'var(--status-success)'
                        : 'var(--status-warning)',
                  }}
                >
                  <Database size={24} />
                </div>
                <div>
                  <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>PostgreSQL 16</div>
                  <div style={{ fontSize: '1.1rem', fontWeight: 700, marginTop: '2px' }}>
                    {healthData.components?.database || 'Pending Container'}
                  </div>
                  <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
                    HikariCP Connection Pool
                  </div>
                </div>
              </div>

              {/* Redis Connection */}
              <div style={{ display: 'flex', alignItems: 'flex-start', gap: '1rem' }}>
                <div
                  style={{
                    padding: '0.75rem',
                    borderRadius: 'var(--radius-md)',
                    background:
                      healthData.components?.redis?.startsWith('CONNECTED')
                        ? 'var(--status-success-bg)'
                        : 'var(--status-warning-bg)',
                    color:
                      healthData.components?.redis?.startsWith('CONNECTED')
                        ? 'var(--status-success)'
                        : 'var(--status-warning)',
                  }}
                >
                  <Zap size={24} />
                </div>
                <div>
                  <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Redis 7</div>
                  <div style={{ fontSize: '1.1rem', fontWeight: 700, marginTop: '2px' }}>
                    {healthData.components?.redis || 'Pending Container'}
                  </div>
                  <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
                    Lettuce In-Memory Engine
                  </div>
                </div>
              </div>
            </div>
          )}
        </Card>
      </section>

      {/* Core Architectural Pillars */}
      <section style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '1.5rem' }}>
        <Card>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '0.75rem' }}>
            <ShieldCheck size={22} color="var(--brand-primary)" />
            <h3 style={{ fontSize: '1.1rem', fontWeight: 700 }}>Zero Double-Booking Guarantee</h3>
          </div>
          <p style={{ fontSize: '0.9rem', color: 'var(--text-secondary)', lineHeight: 1.6 }}>
            Two-phase reservation engine combining atomic Redis Lua script locks with PostgreSQL row-level
            optimistic locking. Full compensation rollbacks release Redis keys if database commits fail.
          </p>
        </Card>

        <Card>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '0.75rem' }}>
            <CheckCircle2 size={22} color="var(--status-success)" />
            <h3 style={{ fontSize: '1.1rem', fontWeight: 700 }}>Asymmetric Cryptographic Passes</h3>
          </div>
          <p style={{ fontSize: '0.9rem', color: 'var(--text-secondary)', lineHeight: 1.6 }}>
            ECDSA digital signatures where private signing keys remain strictly on the backend, while offline
            field gate scanners receive only public verification keys. Zero scanner credential abuse possible.
          </p>
        </Card>

        <Card>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '0.75rem' }}>
            <Activity size={22} color="var(--status-info)" />
            <h3 style={{ fontSize: '1.1rem', fontWeight: 700 }}>Domain Modular Monolith</h3>
          </div>
          <p style={{ fontSize: '0.9rem', color: 'var(--text-secondary)', lineHeight: 1.6 }}>
            Zero premature microservice complexity. Single high-throughput Spring Boot 3.4 runtime organized into
            strictly bounded domain packages with RFC 7807 problem details and request correlation tracing.
          </p>
        </Card>
      </section>
    </div>
  );
};
