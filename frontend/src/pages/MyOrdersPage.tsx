import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { apiClient } from '../services/apiClient';
import { OrderResponse } from '../types/api';
import { Badge } from '../components/ui/Badge';
import { Button } from '../components/ui/Button';
import { LoadingSpinner } from '../components/ui/LoadingSpinner';
import { ErrorAlert } from '../components/ui/ErrorAlert';
import { ShoppingBag, ArrowRight } from 'lucide-react';

export const MyOrdersPage: React.FC = () => {
  const [orders, setOrders] = useState<OrderResponse[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchOrders = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const res = await apiClient.get<OrderResponse[]>('/orders/my');
      setOrders(res.data || []);
    } catch (err: unknown) {
      if (err instanceof Error) {
        setError(err.message);
      } else {
        setError('Failed to fetch orders');
      }
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchOrders();
  }, []);

  const handleCancelOrder = async (orderId: string) => {
    if (!window.confirm('Are you sure you want to cancel this pending order?')) return;
    try {
      await apiClient.post(`/orders/${orderId}/cancel`);
      fetchOrders();
    } catch (err: unknown) {
      alert(err instanceof Error ? err.message : 'Failed to cancel order');
    }
  };

  return (
    <div style={{ backgroundColor: 'var(--bg-primary)', minHeight: '100vh', paddingTop: '2.5rem', paddingBottom: '5rem' }}>
      <div className="container" style={{ maxWidth: '960px' }}>
        <div style={{ marginBottom: '2.5rem' }}>
          <h1 style={{ fontSize: '2.2rem', fontWeight: 800, color: 'var(--text-primary)', marginBottom: '0.4rem', fontFamily: 'var(--font-display)' }}>
            Order &amp; Booking History
          </h1>
          <p style={{ color: 'var(--text-secondary)', fontSize: '1rem' }}>
            Authoritative ledger records of your confirmed and pending event purchases.
          </p>
        </div>

        {error && <ErrorAlert title="Orders Notice" message={error} onRetry={fetchOrders} onClose={() => setError(null)} />}

        {isLoading && <LoadingSpinner label="Querying customer orders from PostgreSQL ledger..." />}

        {!isLoading && orders.length === 0 && (
          <div
            style={{
              backgroundColor: '#ffffff',
              border: '1px solid var(--border-subtle)',
              borderRadius: 'var(--radius-xl)',
              textAlign: 'center',
              padding: '4rem 1.5rem',
              boxShadow: 'var(--shadow-sm)',
            }}
          >
            <div
              style={{
                width: '64px',
                height: '64px',
                borderRadius: '50%',
                backgroundColor: 'var(--brand-subtle)',
                color: 'var(--brand-primary)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                margin: '0 auto 1.25rem',
              }}
            >
              <ShoppingBag size={32} />
            </div>
            <h3 style={{ fontSize: '1.3rem', fontWeight: 800, color: 'var(--text-primary)', marginBottom: '0.5rem' }}>
              No Orders Found
            </h3>
            <p style={{ color: 'var(--text-secondary)', marginBottom: '1.5rem', maxWidth: '420px', margin: '0 auto 1.5rem' }}>
              You haven't placed any bookings yet. Discover live concerts, comedy sets, and sports events.
            </p>
            <Link to="/">
              <Button variant="primary" style={{ fontWeight: 700 }}>Explore Events</Button>
            </Link>
          </div>
        )}

        {!isLoading && orders.length > 0 && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
            {orders.map((o) => {
              const isConfirmed = o.status === 'CONFIRMED';
              const isCancelled = o.status === 'CANCELLED';

              return (
                <div
                  key={o.id}
                  style={{
                    backgroundColor: '#ffffff',
                    border: '1px solid var(--border-subtle)',
                    borderRadius: 'var(--radius-lg)',
                    padding: '1.5rem 1.75rem',
                    boxShadow: 'var(--shadow-sm)',
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    gap: '1.5rem',
                    flexWrap: 'wrap',
                    transition: 'border-color var(--transition-fast)',
                  }}
                >
                  <div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '0.5rem', flexWrap: 'wrap' }}>
                      <span style={{ fontFamily: 'monospace', fontWeight: 800, fontSize: '0.88rem', color: 'var(--brand-primary)', backgroundColor: 'var(--brand-subtle)', padding: '0.15rem 0.55rem', borderRadius: '4px' }}>
                        {o.orderNumber}
                      </span>
                      <Badge variant={isConfirmed ? 'success' : isCancelled ? 'danger' : 'warning'}>
                        {o.status}
                      </Badge>
                    </div>

                    <h3 style={{ fontSize: '1.2rem', fontWeight: 800, color: 'var(--text-primary)', marginBottom: '0.35rem' }}>
                      {o.eventTitle}
                    </h3>

                    <div style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', display: 'flex', gap: '0.75rem', flexWrap: 'wrap', alignItems: 'center' }}>
                      <span style={{ fontWeight: 600, color: 'var(--text-primary)' }}>{o.sessionTitle}</span>
                      <span>•</span>
                      <span>Placed on {new Date(o.createdAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}</span>
                      <span>•</span>
                      <span>{o.items.length} pass(es)</span>
                    </div>
                  </div>

                  <div style={{ textAlign: 'right', display: 'flex', alignItems: 'center', gap: '1.75rem' }}>
                    <div>
                      <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', textTransform: 'uppercase', fontWeight: 600, letterSpacing: '0.04em' }}>
                        Total Paid
                      </div>
                      <div style={{ fontSize: '1.4rem', fontWeight: 800, color: 'var(--text-primary)' }}>
                        ₹{o.totalAmount.toLocaleString()}
                      </div>
                    </div>

                    <div style={{ display: 'flex', gap: '0.5rem' }}>
                      {isConfirmed && (
                        <Link to={`/orders/${o.id}/confirmation`} style={{ textDecoration: 'none' }}>
                          <Button size="sm" variant="primary" style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', fontWeight: 700 }}>
                            <span>View Passes</span>
                            <ArrowRight size={15} />
                          </Button>
                        </Link>
                      )}
                      {o.status === 'PAYMENT_PENDING' && (
                        <>
                          <Link to={`/checkout/${o.id}`} style={{ textDecoration: 'none' }}>
                            <Button size="sm" variant="primary" style={{ fontWeight: 700 }}>
                              Complete Payment
                            </Button>
                          </Link>
                          <Button size="sm" variant="secondary" onClick={() => handleCancelOrder(o.id)}>
                            Cancel
                          </Button>
                        </>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};
