import React, { useEffect, useState } from 'react';
import { apiClient } from '../services/apiClient';
import { HealthStatusResponse } from '../types/api';
import { Card } from '../components/ui/Card';
import { Badge } from '../components/ui/Badge';
import { Button } from '../components/ui/Button';
import { LoadingSpinner } from '../components/ui/LoadingSpinner';
import { ErrorAlert } from '../components/ui/ErrorAlert';
import { Activity, Database, Server, Cpu, Zap, Clock, Terminal } from 'lucide-react';

export const SystemTelemetryPage: React.FC = () => {
  const [healthData, setHealthData] = useState<HealthStatusResponse | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [lastChecked, setLastChecked] = useState<Date>(new Date());

  const fetchHealth = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const response = await apiClient.get<HealthStatusResponse>('/health');
      setHealthData(response.data);
      setLastChecked(new Date());
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
    const interval = setInterval(fetchHealth, 10000);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="container" style={{ paddingTop: '2.5rem' }}>
      {/* Page Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem', flexWrap: 'wrap', gap: '1rem' }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '0.25rem' }}>
            <h1 style={{ fontSize: '2rem', fontWeight: 800, letterSpacing: '-0.02em' }}>
              System Runtime Telemetry & Health
            </h1>
            <Badge variant="success">Operational</Badge>
          </div>
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.95rem' }}>
            Live diagnostic telemetry polled directly from the Spring Boot 3.4 runtime and container dependencies.
          </p>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
          <span style={{ fontSize: '0.85rem', color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: '4px' }}>
            <Clock size={14} /> Last sync: {lastChecked.toLocaleTimeString()}
          </span>
          <Button size="sm" variant="secondary" onClick={fetchHealth} isLoading={isLoading}>
            Refresh Now
          </Button>
        </div>
      </div>

      {error && (
        <ErrorAlert
          title="Telemetry Probe Communication Interrupted"
          message={error}
          onRetry={fetchHealth}
        />
      )}

      {isLoading && !healthData && <LoadingSpinner label="Querying EventPulse Health Endpoint..." />}

      {healthData && (
        <>
          {/* Main Infrastructure Cards */}
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))',
              gap: '1.25rem',
              marginBottom: '2.5rem',
            }}
          >
            {/* Core Application Server */}
            <Card>
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
                  <div style={{ fontSize: '1.25rem', fontWeight: 700, marginTop: '2px' }}>
                    {healthData.status}
                  </div>
                  <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', marginTop: '4px' }}>
                    EventPulse Monolith v{healthData.version}
                  </div>
                </div>
              </div>
            </Card>

            {/* Java Runtime */}
            <Card>
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
                  <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>JVM Baseline</div>
                  <div style={{ fontSize: '1.25rem', fontWeight: 700, marginTop: '2px' }}>
                    Java 21 LTS
                  </div>
                  <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', marginTop: '4px' }}>
                    Runtime: {healthData.javaVersion}
                  </div>
                </div>
              </div>
            </Card>

            {/* PostgreSQL Container */}
            <Card>
              <div style={{ display: 'flex', alignItems: 'flex-start', gap: '1rem' }}>
                <div
                  style={{
                    padding: '0.75rem',
                    borderRadius: 'var(--radius-md)',
                    background: healthData.components?.database?.startsWith('CONNECTED')
                      ? 'var(--status-success-bg)'
                      : 'var(--status-warning-bg)',
                    color: healthData.components?.database?.startsWith('CONNECTED')
                      ? 'var(--status-success)'
                      : 'var(--status-warning)',
                  }}
                >
                  <Database size={24} />
                </div>
                <div>
                  <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>PostgreSQL 16</div>
                  <div style={{ fontSize: '1.25rem', fontWeight: 700, marginTop: '2px' }}>
                    {healthData.components?.database || 'Pending Container'}
                  </div>
                  <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', marginTop: '4px' }}>
                    HikariCP Connection Pool (ACID)
                  </div>
                </div>
              </div>
            </Card>

            {/* Redis Container */}
            <Card>
              <div style={{ display: 'flex', alignItems: 'flex-start', gap: '1rem' }}>
                <div
                  style={{
                    padding: '0.75rem',
                    borderRadius: 'var(--radius-md)',
                    background: healthData.components?.redis?.startsWith('CONNECTED')
                      ? 'var(--status-success-bg)'
                      : 'var(--status-warning-bg)',
                    color: healthData.components?.redis?.startsWith('CONNECTED')
                      ? 'var(--status-success)'
                      : 'var(--status-warning)',
                  }}
                >
                  <Zap size={24} />
                </div>
                <div>
                  <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Redis 7 In-Memory</div>
                  <div style={{ fontSize: '1.25rem', fontWeight: 700, marginTop: '2px' }}>
                    {healthData.components?.redis || 'Pending Container'}
                  </div>
                  <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', marginTop: '4px' }}>
                    Lettuce Driver (Atomic Holds &amp; Virtual Queue)
                  </div>
                </div>
              </div>
            </Card>
          </div>

          {/* Raw Health JSON & System Diagnostics */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '1.5rem', marginBottom: '2.5rem' }}>
            <Card>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '1rem' }}>
                <Terminal size={20} color="var(--brand-primary)" />
                <h3 style={{ fontSize: '1.1rem', fontWeight: 700 }}>Actuator Diagnostic Payload</h3>
              </div>
              <pre
                style={{
                  background: 'var(--bg-tertiary)',
                  padding: '1rem',
                  borderRadius: 'var(--radius-md)',
                  fontSize: '0.85rem',
                  fontFamily: 'monospace',
                  color: 'var(--text-primary)',
                  overflowX: 'auto',
                  border: '1px solid var(--border-color)',
                }}
              >
                {JSON.stringify(healthData, null, 2)}
              </pre>
            </Card>

            <Card>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '1rem' }}>
                <Activity size={20} color="var(--status-info)" />
                <h3 style={{ fontSize: '1.1rem', fontWeight: 700 }}>Telemetry Invariants</h3>
              </div>
              <ul style={{ paddingLeft: '1.25rem', fontSize: '0.9rem', color: 'var(--text-secondary)', display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                <li>
                  <strong>Request Correlation:</strong> Every incoming HTTP request is tagged with a unique <code>X-Correlation-Id</code> UUID returned in response headers and propagated in MDC logs.
                </li>
                <li>
                  <strong>Zero Mock Fallbacks:</strong> Persisted records are strictly verified against Docker container ports 5432 (Postgres) and 6379 (Redis).
                </li>
                <li>
                  <strong>RFC 7807 Error Handling:</strong> Bad requests, concurrent conflict 409s, and authentication errors emit standard Problem Details payloads.
                </li>
                <li>
                  <strong>Inventory Reaper:</strong> Background Spring task actively sweeps expired holds every 15 seconds, returning abandoned seats directly back to available inventory.
                </li>
              </ul>
            </Card>
          </div>
        </>
      )}
    </div>
  );
};
