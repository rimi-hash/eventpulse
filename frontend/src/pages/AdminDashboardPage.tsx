import React, { useEffect, useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { apiClient } from '../services/apiClient';
import { Card } from '../components/ui/Card';
import { Badge } from '../components/ui/Badge';
import { Button } from '../components/ui/Button';
import { LoadingSpinner } from '../components/ui/LoadingSpinner';
import { ErrorAlert } from '../components/ui/ErrorAlert';
import { 
  ShieldAlert, 
  DollarSign, 
  Users, 
  Ticket, 
  Calendar, 
  TrendingUp, 
  RefreshCw, 
  Activity,
  Layers,
  Database,
  Lock,
  CheckCircle2,
  XCircle,
  Building2,
  Download,
  Edit3,
  Trash2,
  Search,
  Check,
  X,
  AlertTriangle,
  UserX,
  Image as ImageIcon,
  MapPin,
  ExternalLink,
  Eye
} from 'lucide-react';
import { Link } from 'react-router-dom';
import { OrganizationDto } from '../types/api';

interface AdminStats {
  totalUsers: number;
  totalEvents: number;
  totalOrders: number;
  totalTicketsIssued: number;
  grossTicketVolume?: number;
  platformGrossVolume?: number;
  recentOrders: Array<{
    id?: string;
    orderNumber: string;
    customerEmail: string;
    eventTitle?: string;
    totalAmount: number;
    status: string;
    createdAt?: string;
  }>;
}

interface AdminUser {
  id: string;
  username: string;
  email: string;
  fullName: string;
  phoneNumber?: string;
  role: 'PLATFORM_ADMIN' | 'ORGANIZER' | 'GATE_STAFF' | 'CUSTOMER' | string;
  isActive: boolean;
  isVerified: boolean;
  createdAt: string;
  updatedAt: string;
}

interface EventItem {
  id: string;
  title: string;
  slug: string;
  shortSummary: string;
  category: string;
  bannerUrl: string;
  thumbnailUrl: string;
  status: string;
  isFeatured: boolean;
  requiresVirtualQueue: boolean;
  venueName?: string;
  city?: string;
  startingPrice?: number;
  nextSessionStartsAt?: string;
  ticketSaleStatus?: string;
  officialInfoUrl?: string;
  officialBookingUrl?: string;
}

interface EditEventFormData {
  id: string;
  title: string;
  shortSummary: string;
  description: string;
  category: string;
  bannerUrl: string;
  thumbnailUrl: string;
  maxTicketsPerUser: number;
  isFeatured: boolean;
  requiresVirtualQueue: boolean;
  ageRestriction?: string;
  officialInfoUrl?: string;
  officialBookingUrl?: string;
}

export const AdminDashboardPage: React.FC = () => {
  const { user } = useAuth();
  
  // Navigation Tabs
  const [activeTab, setActiveTab] = useState<'OVERVIEW' | 'APPLICATIONS' | 'EVENTS' | 'USERS'>('OVERVIEW');

  // Stats & Orgs
  const [stats, setStats] = useState<AdminStats | null>(null);
  const [pendingOrgs, setPendingOrgs] = useState<OrganizationDto[]>([]);
  const [allOrgs, setAllOrgs] = useState<OrganizationDto[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [loadingOrgs, setLoadingOrgs] = useState(false);
  const [loadingAllOrgs, setLoadingAllOrgs] = useState(false);
  const [processingOrgId, setProcessingOrgId] = useState<string | null>(null);
  const [actionSuccess, setActionSuccess] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Applications Filter & Review Modal State
  const [orgStatusFilter, setOrgStatusFilter] = useState<'ALL' | 'PENDING' | 'VERIFIED' | 'REJECTED'>('ALL');
  const [orgSearch, setOrgSearch] = useState('');
  const [selectedOrgForDetails, setSelectedOrgForDetails] = useState<OrganizationDto | null>(null);
  const [approveConfirmOrg, setApproveConfirmOrg] = useState<OrganizationDto | null>(null);
  const [rejectModalOrg, setRejectModalOrg] = useState<OrganizationDto | null>(null);
  const [rejectReasonInput, setRejectReasonInput] = useState('');
  const [rejectError, setRejectError] = useState<string | null>(null);

  // Events Management State
  const [eventsList, setEventsList] = useState<EventItem[]>([]);
  const [loadingEvents, setLoadingEvents] = useState(false);
  const [eventSearch, setEventSearch] = useState('');
  const [eventCategoryFilter, setEventCategoryFilter] = useState('ALL');
  const [editingEvent, setEditingEvent] = useState<EditEventFormData | null>(null);
  const [savingEvent, setSavingEvent] = useState(false);
  const [deletingEventId, setDeletingEventId] = useState<string | null>(null);
  const [deleteConfirmEvent, setDeleteConfirmEvent] = useState<EventItem | null>(null);

  // Users Management State
  const [usersList, setUsersList] = useState<AdminUser[]>([]);
  const [loadingUsers, setLoadingUsers] = useState(false);
  const [userSearch, setUserSearch] = useState('');
  const [userRoleFilter, setUserRoleFilter] = useState('ALL');
  const [togglingUserId, setTogglingUserId] = useState<string | null>(null);
  const [removingUserId, setRemovingUserId] = useState<string | null>(null);
  const [deleteConfirmUser, setDeleteConfirmUser] = useState<AdminUser | null>(null);

  const fetchStats = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const res = await apiClient.get<AdminStats>('/admin/dashboard/stats');
      setStats(res.data);
    } catch (err: unknown) {
      if (err instanceof Error) {
        setError(err.message);
      } else {
        setError('Failed to load platform administration metrics');
      }
    } finally {
      setIsLoading(false);
    }
  };

  const fetchAllOrgs = async () => {
    setLoadingAllOrgs(true);
    try {
      const res = await apiClient.get<OrganizationDto[]>('/admin/organizations');
      const list = res.data || [];
      setAllOrgs(list);
      setPendingOrgs(list.filter((o) => o.verificationStatus === 'PENDING'));
    } catch (err) {
      console.warn('Failed to load organizer applications:', err);
    } finally {
      setLoadingAllOrgs(false);
    }
  };

  const fetchPendingOrgs = async () => {
    setLoadingOrgs(true);
    try {
      const res = await apiClient.get<OrganizationDto[]>('/admin/organizations/pending');
      setPendingOrgs(res.data || []);
    } catch (err) {
      console.warn('Failed to load pending organizations');
    } finally {
      setLoadingOrgs(false);
    }
  };

  const fetchEvents = async () => {
    setLoadingEvents(true);
    try {
      const res = await apiClient.get<EventItem[]>('/admin/events');
      setEventsList(res.data || []);
    } catch (err: unknown) {
      console.warn('Failed to fetch admin events:', err);
    } finally {
      setLoadingEvents(false);
    }
  };

  const fetchUsers = async () => {
    setLoadingUsers(true);
    try {
      const res = await apiClient.get<AdminUser[]>('/admin/users');
      setUsersList(res.data || []);
    } catch (err: unknown) {
      console.warn('Failed to fetch admin users:', err);
    } finally {
      setLoadingUsers(false);
    }
  };

  useEffect(() => {
    fetchStats();
    fetchAllOrgs();
    fetchEvents();
    fetchUsers();
  }, []);

  const handleApproveOrg = async (id: string, name: string) => {
    setProcessingOrgId(id);
    setActionSuccess(null);
    setError(null);
    try {
      await apiClient.post(`/admin/organizations/${id}/verify`);
      setActionSuccess(`Organization "${name}" approved successfully! Owner promoted to ORGANIZER and studio access enabled.`);
      await fetchAllOrgs();
      setApproveConfirmOrg(null);
      if (selectedOrgForDetails?.id === id) {
        setSelectedOrgForDetails((prev) => (prev ? { ...prev, verificationStatus: 'VERIFIED' } : null));
      }
    } catch (err: unknown) {
      if (err instanceof Error) {
        setError(err.message);
      } else {
        setError('Failed to verify organization.');
      }
    } finally {
      setProcessingOrgId(null);
    }
  };

  const handleConfirmReject = async () => {
    if (!rejectModalOrg) return;
    if (!rejectReasonInput.trim()) {
      setRejectError('A meaningful rejection reason is required.');
      return;
    }

    setProcessingOrgId(rejectModalOrg.id);
    setActionSuccess(null);
    setError(null);
    setRejectError(null);
    try {
      await apiClient.post(`/admin/organizations/${rejectModalOrg.id}/reject`, { reason: rejectReasonInput.trim() });
      setActionSuccess(`Application for "${rejectModalOrg.name}" rejected.`);
      await fetchAllOrgs();
      setRejectModalOrg(null);
      setRejectReasonInput('');
      if (selectedOrgForDetails?.id === rejectModalOrg.id) {
        setSelectedOrgForDetails((prev) =>
          prev ? { ...prev, verificationStatus: 'REJECTED', rejectionReason: rejectReasonInput.trim() } : null
        );
      }
    } catch (err: unknown) {
      if (err instanceof Error) {
        setRejectError(err.message);
      } else {
        setRejectError('Failed to reject organization application.');
      }
    } finally {
      setProcessingOrgId(null);
    }
  };

  // --- Event Management Handlers ---

  const handleOpenEditEvent = async (ev: EventItem) => {
    try {
      const res = await apiClient.get<any>(`/admin/events/${ev.id}`);
      const detail = res.data;
      setEditingEvent({
        id: ev.id,
        title: detail.title || ev.title,
        shortSummary: detail.shortSummary || ev.shortSummary || '',
        description: detail.description || '',
        category: detail.category || ev.category || 'CONCERT',
        bannerUrl: detail.bannerUrl || ev.bannerUrl || '',
        thumbnailUrl: detail.thumbnailUrl || ev.thumbnailUrl || '',
        maxTicketsPerUser: detail.maxTicketsPerUser || 6,
        isFeatured: detail.isFeatured || false,
        requiresVirtualQueue: detail.requiresVirtualQueue || false,
        ageRestriction: detail.ageRestriction || 'None',
        officialInfoUrl: detail.officialInfoUrl || '',
        officialBookingUrl: detail.officialBookingUrl || '',
      });
    } catch (err) {
      // Fallback with summary data
      setEditingEvent({
        id: ev.id,
        title: ev.title,
        shortSummary: ev.shortSummary || '',
        description: ev.shortSummary || '',
        category: ev.category || 'CONCERT',
        bannerUrl: ev.bannerUrl || '',
        thumbnailUrl: ev.thumbnailUrl || '',
        maxTicketsPerUser: 6,
        isFeatured: ev.isFeatured || false,
        requiresVirtualQueue: ev.requiresVirtualQueue || false,
        ageRestriction: 'None',
        officialInfoUrl: ev.officialInfoUrl || '',
        officialBookingUrl: ev.officialBookingUrl || '',
      });
    }
  };

  const handleSaveEvent = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingEvent) return;

    setSavingEvent(true);
    setActionSuccess(null);
    setError(null);

    try {
      const payload = {
        title: editingEvent.title.trim(),
        shortSummary: editingEvent.shortSummary.trim(),
        description: editingEvent.description.trim(),
        category: editingEvent.category,
        bannerUrl: editingEvent.bannerUrl.trim(),
        thumbnailUrl: (editingEvent.thumbnailUrl || editingEvent.bannerUrl).trim(),
        isFeatured: editingEvent.isFeatured,
        requiresVirtualQueue: editingEvent.requiresVirtualQueue,
        maxTicketsPerUser: editingEvent.maxTicketsPerUser,
        ageRestriction: editingEvent.ageRestriction,
        officialInfoUrl: editingEvent.officialInfoUrl ? editingEvent.officialInfoUrl.trim() : null,
        officialBookingUrl: editingEvent.officialBookingUrl ? editingEvent.officialBookingUrl.trim() : null,
      };

      await apiClient.put(`/admin/events/${editingEvent.id}`, payload);
      setActionSuccess(`Event "${editingEvent.title}" updated successfully!`);
      setEditingEvent(null);
      fetchEvents();
      fetchStats();
    } catch (err: unknown) {
      if (err instanceof Error) {
        setError(err.message);
      } else {
        setError('Failed to update event.');
      }
    } finally {
      setSavingEvent(false);
    }
  };

  const handleDeleteEvent = async (ev: EventItem) => {
    setDeletingEventId(ev.id);
    setActionSuccess(null);
    setError(null);
    try {
      await apiClient.delete(`/admin/events/${ev.id}`);
      setActionSuccess(`Event "${ev.title}" deleted successfully!`);
      setDeleteConfirmEvent(null);
      fetchEvents();
      fetchStats();
    } catch (err: unknown) {
      if (err instanceof Error) {
        setError(err.message);
      } else {
        setError('Failed to delete event. If tickets are issued, cancel the event instead.');
      }
    } finally {
      setDeletingEventId(null);
    }
  };

  // --- User Management Handlers ---

  const handleToggleUserStatus = async (userToToggle: AdminUser) => {
    setTogglingUserId(userToToggle.id);
    setActionSuccess(null);
    setError(null);
    try {
      const res = await apiClient.put<any>(`/admin/users/${userToToggle.id}/toggle-status`);
      setActionSuccess(res.message || `User ${userToToggle.username} status updated.`);
      fetchUsers();
    } catch (err: unknown) {
      if (err instanceof Error) {
        setError(err.message);
      } else {
        setError('Failed to toggle user status.');
      }
    } finally {
      setTogglingUserId(null);
    }
  };

  const handleRemoveUser = async (userToRemove: AdminUser) => {
    setRemovingUserId(userToRemove.id);
    setActionSuccess(null);
    setError(null);
    try {
      const res = await apiClient.delete<any>(`/admin/users/${userToRemove.id}`);
      setActionSuccess(res.message || `User ${userToRemove.fullName || userToRemove.username} removed successfully.`);
      setDeleteConfirmUser(null);
      fetchUsers();
      fetchStats();
    } catch (err: unknown) {
      if (err instanceof Error) {
        setError(err.message);
      } else {
        setError('Failed to remove user.');
      }
    } finally {
      setRemovingUserId(null);
    }
  };

  const isAdmin = user?.role === 'PLATFORM_ADMIN';

  if (!isAdmin) {
    return (
      <div className="container" style={{ paddingTop: '4rem', textAlign: 'center' }}>
        <Card style={{ maxWidth: '540px', margin: '0 auto', padding: '3rem' }}>
          <ShieldAlert size={48} color="var(--brand-accent)" style={{ margin: '0 auto 1.5rem' }} />
          <h2 style={{ fontSize: '1.5rem', fontWeight: 700, marginBottom: '0.75rem' }}>
            Platform Admin Access Required
          </h2>
          <p style={{ color: 'var(--text-secondary)', marginBottom: '1.5rem', fontSize: '0.95rem' }}>
            This portal is restricted to authorized platform administrators. Please sign in with an account having
            <strong> PLATFORM_ADMIN</strong> privileges.
          </p>
          <div style={{ display: 'inline-block' }}>
            <Badge variant="warning">Access Restriction: ROLE_PLATFORM_ADMIN</Badge>
          </div>
        </Card>
      </div>
    );
  }

  // Filtered Events
  const filteredEvents = eventsList.filter((e) => {
    const matchesCategory = eventCategoryFilter === 'ALL' || e.category === eventCategoryFilter;
    const matchesSearch = !eventSearch || 
      e.title.toLowerCase().includes(eventSearch.toLowerCase()) ||
      (e.shortSummary && e.shortSummary.toLowerCase().includes(eventSearch.toLowerCase())) ||
      (e.venueName && e.venueName.toLowerCase().includes(eventSearch.toLowerCase())) ||
      (e.city && e.city.toLowerCase().includes(eventSearch.toLowerCase()));
    return matchesCategory && matchesSearch;
  });

  // Filtered Users
  const filteredUsers = usersList.filter((u) => {
    const matchesRole = userRoleFilter === 'ALL' || u.role === userRoleFilter;
    const matchesSearch = !userSearch ||
      (u.fullName && u.fullName.toLowerCase().includes(userSearch.toLowerCase())) ||
      (u.username && u.username.toLowerCase().includes(userSearch.toLowerCase())) ||
      (u.email && u.email.toLowerCase().includes(userSearch.toLowerCase()));
    return matchesRole && matchesSearch;
  });

  return (
    <div className="container" style={{ paddingTop: '2.5rem', paddingBottom: '4rem' }}>
      {/* Platform Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.75rem', flexWrap: 'wrap', gap: '1rem' }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '0.25rem' }}>
            <h1 style={{ fontSize: '2.1rem', fontWeight: 800, letterSpacing: '-0.02em', fontFamily: 'var(--font-display)' }}>
              Platform Operations &amp; Administration
            </h1>
            <Badge variant="info">Global Oversight</Badge>
          </div>
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.95rem' }}>
            Administrative command center for event moderation, attendee user accounts, and system governance.
          </p>
        </div>

        <div style={{ display: 'flex', gap: '0.6rem', flexWrap: 'wrap' }}>
          <Button
            variant="secondary"
            size="sm"
            onClick={() => {
              const token = localStorage.getItem('eventpulse_token');
              fetch('/api/v1/admin/reports/export/orders', {
                headers: { Authorization: token ? `Bearer ${token}` : '' },
              })
                .then((r) => r.blob())
                .then((blob) => {
                  const url = window.URL.createObjectURL(blob);
                  const a = document.createElement('a');
                  a.href = url;
                  a.download = `platform_orders_${Date.now()}.csv`;
                  document.body.appendChild(a);
                  a.click();
                  a.remove();
                  window.URL.revokeObjectURL(url);
                })
                .catch((err) => alert('CSV Export failed: ' + err.message));
            }}
          >
            <Download size={14} style={{ marginRight: '6px' }} /> Export Orders CSV
          </Button>

          <Button
            variant="secondary"
            size="sm"
            onClick={() => {
              const token = localStorage.getItem('eventpulse_token');
              fetch('/api/v1/admin/reports/export/users', {
                headers: { Authorization: token ? `Bearer ${token}` : '' },
              })
                .then((r) => r.blob())
                .then((blob) => {
                  const url = window.URL.createObjectURL(blob);
                  const a = document.createElement('a');
                  a.href = url;
                  a.download = `platform_users_${Date.now()}.csv`;
                  document.body.appendChild(a);
                  a.click();
                  a.remove();
                  window.URL.revokeObjectURL(url);
                })
                .catch((err) => alert('CSV Export failed: ' + err.message));
            }}
          >
            <Download size={14} style={{ marginRight: '6px' }} /> Export Users CSV
          </Button>

          <Button
            variant="secondary"
            size="sm"
            onClick={() => {
              fetchStats();
              fetchEvents();
              fetchUsers();
              fetchPendingOrgs();
            }}
            isLoading={isLoading || loadingEvents || loadingUsers}
          >
            <RefreshCw size={14} style={{ marginRight: '6px' }} /> Refresh All
          </Button>

          <Link to="/telemetry">
            <Button variant="primary" size="sm">
              <Activity size={14} style={{ marginRight: '6px' }} /> Health Probes
            </Button>
          </Link>
        </div>
      </div>

      {/* Global Action Notifications */}
      {actionSuccess && (
        <div
          style={{
            padding: '1rem 1.25rem',
            backgroundColor: 'var(--status-success-bg)',
            color: 'var(--status-success)',
            borderRadius: 'var(--radius-md)',
            marginBottom: '1.5rem',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            border: '1px solid var(--status-success)',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
            <CheckCircle2 size={18} />
            <span style={{ fontSize: '0.92rem', fontWeight: 600 }}>{actionSuccess}</span>
          </div>
          <button
            onClick={() => setActionSuccess(null)}
            style={{ background: 'none', border: 'none', color: 'inherit', cursor: 'pointer' }}
          >
            <X size={16} />
          </button>
        </div>
      )}

      {error && <ErrorAlert title="Governance Error" message={error} onRetry={fetchStats} onClose={() => setError(null)} />}

      {/* Navigation Tabs Bar */}
      <div
        style={{
          display: 'flex',
          gap: '0.5rem',
          borderBottom: '1px solid var(--border-medium)',
          marginBottom: '2rem',
          overflowX: 'auto',
        }}
      >
        <button
          onClick={() => setActiveTab('OVERVIEW')}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '0.5rem',
            padding: '0.75rem 1.25rem',
            fontSize: '0.95rem',
            fontWeight: 700,
            border: 'none',
            borderBottom: activeTab === 'OVERVIEW' ? '3px solid var(--brand-primary)' : '3px solid transparent',
            backgroundColor: 'transparent',
            color: activeTab === 'OVERVIEW' ? 'var(--brand-primary)' : 'var(--text-secondary)',
            cursor: 'pointer',
            transition: 'all 0.2s',
          }}
        >
          <TrendingUp size={16} />
          Overview &amp; Telemetry
        </button>

        <button
          onClick={() => {
            setActiveTab('APPLICATIONS');
            fetchAllOrgs();
          }}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '0.5rem',
            padding: '0.75rem 1.25rem',
            fontSize: '0.95rem',
            fontWeight: 700,
            border: 'none',
            borderBottom: activeTab === 'APPLICATIONS' ? '3px solid var(--brand-primary)' : '3px solid transparent',
            backgroundColor: 'transparent',
            color: activeTab === 'APPLICATIONS' ? 'var(--brand-primary)' : 'var(--text-secondary)',
            cursor: 'pointer',
            transition: 'all 0.2s',
          }}
        >
          <Building2 size={16} />
          Organizer Applications ({allOrgs.length})
          {pendingOrgs.length > 0 && (
            <span
              style={{
                backgroundColor: 'rgba(245, 158, 11, 0.15)',
                color: '#D97706',
                border: '1px solid rgba(245, 158, 11, 0.3)',
                borderRadius: '999px',
                padding: '0.1rem 0.5rem',
                fontSize: '0.75rem',
                fontWeight: 700,
              }}
            >
              {pendingOrgs.length} Pending
            </span>
          )}
        </button>

        <button
          onClick={() => {
            setActiveTab('EVENTS');
            fetchEvents();
          }}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '0.5rem',
            padding: '0.75rem 1.25rem',
            fontSize: '0.95rem',
            fontWeight: 700,
            border: 'none',
            borderBottom: activeTab === 'EVENTS' ? '3px solid var(--brand-primary)' : '3px solid transparent',
            backgroundColor: 'transparent',
            color: activeTab === 'EVENTS' ? 'var(--brand-primary)' : 'var(--text-secondary)',
            cursor: 'pointer',
            transition: 'all 0.2s',
          }}
        >
          <Calendar size={16} />
          Manage Events ({eventsList.length})
        </button>

        <button
          onClick={() => {
            setActiveTab('USERS');
            fetchUsers();
          }}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '0.5rem',
            padding: '0.75rem 1.25rem',
            fontSize: '0.95rem',
            fontWeight: 700,
            border: 'none',
            borderBottom: activeTab === 'USERS' ? '3px solid var(--brand-primary)' : '3px solid transparent',
            backgroundColor: 'transparent',
            color: activeTab === 'USERS' ? 'var(--brand-primary)' : 'var(--text-secondary)',
            cursor: 'pointer',
            transition: 'all 0.2s',
          }}
        >
          <Users size={16} />
          Manage Users ({usersList.length})
        </button>
      </div>

      {/* ========================================================= */}
      {/* TAB 1: OVERVIEW & TELEMETRY                                */}
      {/* ========================================================= */}
      {activeTab === 'OVERVIEW' && (
        <>
          {isLoading && !stats && <LoadingSpinner label="Compiling multi-tenant operational records..." />}

          {stats && (
            <>
              {/* Metrics Grid */}
              <div
                style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
                  gap: '1.25rem',
                  marginBottom: '2.5rem',
                }}
              >
                <Card>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.75rem' }}>
                    <span style={{ fontSize: '0.85rem', color: 'var(--text-muted)', fontWeight: 600 }}>GROSS COMMERCE</span>
                    <div style={{ padding: '6px', background: 'var(--status-success-bg)', borderRadius: 'var(--radius-md)' }}>
                      <DollarSign size={18} color="var(--status-success)" />
                    </div>
                  </div>
                  <div style={{ fontSize: '1.85rem', fontWeight: 800, color: 'var(--text-primary)' }}>
                    ₹{(stats.grossTicketVolume ?? stats.platformGrossVolume ?? 0).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </div>
                  <div style={{ fontSize: '0.75rem', color: 'var(--status-success)', marginTop: '4px', display: 'flex', alignItems: 'center', gap: '4px' }}>
                    <TrendingUp size={12} /> Settled &amp; Authorized Volume
                  </div>
                </Card>

                <Card>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.75rem' }}>
                    <span style={{ fontSize: '0.85rem', color: 'var(--text-muted)', fontWeight: 600 }}>CONFIRMED ORDERS</span>
                    <div style={{ padding: '6px', background: 'rgba(99, 102, 241, 0.12)', borderRadius: 'var(--radius-md)' }}>
                      <Layers size={18} color="var(--brand-primary)" />
                    </div>
                  </div>
                  <div style={{ fontSize: '1.85rem', fontWeight: 800, color: 'var(--text-primary)' }}>
                    {stats.totalOrders}
                  </div>
                  <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', marginTop: '4px' }}>
                    Idempotency key validated
                  </div>
                </Card>

                <Card>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.75rem' }}>
                    <span style={{ fontSize: '0.85rem', color: 'var(--text-muted)', fontWeight: 600 }}>TICKETS ISSUED</span>
                    <div style={{ padding: '6px', background: 'rgba(168, 85, 247, 0.12)', borderRadius: 'var(--radius-md)' }}>
                      <Ticket size={18} color="#a855f7" />
                    </div>
                  </div>
                  <div style={{ fontSize: '1.85rem', fontWeight: 800, color: 'var(--text-primary)' }}>
                    {stats.totalTicketsIssued}
                  </div>
                  <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', marginTop: '4px' }}>
                    Asymmetric HMAC/ECDSA signed
                  </div>
                </Card>

                <Card>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.75rem' }}>
                    <span style={{ fontSize: '0.85rem', color: 'var(--text-muted)', fontWeight: 600 }}>REGISTERED USERS</span>
                    <div style={{ padding: '6px', background: 'rgba(236, 72, 153, 0.12)', borderRadius: 'var(--radius-md)' }}>
                      <Users size={18} color="#ec4899" />
                    </div>
                  </div>
                  <div style={{ fontSize: '1.85rem', fontWeight: 800, color: 'var(--text-primary)' }}>
                    {stats.totalUsers}
                  </div>
                  <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', marginTop: '4px' }}>
                    Customers, Organizers, Admins
                  </div>
                </Card>

                <Card>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.75rem' }}>
                    <span style={{ fontSize: '0.85rem', color: 'var(--text-muted)', fontWeight: 600 }}>ACTIVE EVENTS</span>
                    <div style={{ padding: '6px', background: 'rgba(59, 130, 246, 0.12)', borderRadius: 'var(--radius-md)' }}>
                      <Calendar size={18} color="#3b82f6" />
                    </div>
                  </div>
                  <div style={{ fontSize: '1.85rem', fontWeight: 800, color: 'var(--text-primary)' }}>
                    {stats.totalEvents}
                  </div>
                  <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', marginTop: '4px' }}>
                    Scheduled &amp; On-Sale Catalogs
                  </div>
                </Card>
              </div>

              {/* Infrastructure Security Highlights */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '1.5rem', marginBottom: '2.5rem' }}>
                <Card>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '1rem' }}>
                    <Database size={20} color="var(--brand-primary)" />
                    <h3 style={{ fontSize: '1.1rem', fontWeight: 700 }}>Persistence Invariants</h3>
                  </div>
                  <ul style={{ paddingLeft: '1.25rem', fontSize: '0.9rem', color: 'var(--text-secondary)', display: 'flex', flexDirection: 'column', gap: '0.6rem' }}>
                    <li>PostgreSQL 16 ACID transactions with row-level pessimistic write locking on inventory reservations.</li>
                    <li>Zero overselling guarantee enforced by database unique constraints and optimistic lock checking.</li>
                    <li>Audit trail logged with user ID, correlation ID, and high-precision timestamps.</li>
                  </ul>
                </Card>

                <Card>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '1rem' }}>
                    <Lock size={20} color="var(--status-success)" />
                    <h3 style={{ fontSize: '1.1rem', fontWeight: 700 }}>Admission Security Protocol</h3>
                  </div>
                  <ul style={{ paddingLeft: '1.25rem', fontSize: '0.9rem', color: 'var(--text-secondary)', display: 'flex', flexDirection: 'column', gap: '0.6rem' }}>
                    <li>QR codes carry non-guessable HMAC-SHA256 signature tokens tied to physical attendee records.</li>
                    <li>Single-use gate checkin validation with sub-150ms duplicate scan rejection (<code>ALREADY_USED</code>).</li>
                    <li>Organizers and gate personnel operate under strict Role-Based Access Control (RBAC).</li>
                  </ul>
                </Card>
              </div>

              {/* Organizer Verification & Compliance Review Section */}
              <Card style={{ marginBottom: '2.5rem' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem', flexWrap: 'wrap', gap: '0.75rem' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                    <div style={{ padding: '6px', background: 'rgba(99, 102, 241, 0.12)', borderRadius: 'var(--radius-md)', color: 'var(--brand-primary)' }}>
                      <Building2 size={20} />
                    </div>
                    <div>
                      <h3 style={{ fontSize: '1.2rem', fontWeight: 700, margin: 0 }}>
                        Organizer Verification &amp; Compliance Queue
                      </h3>
                      <p style={{ fontSize: '0.82rem', color: 'var(--text-secondary)', margin: '0.2rem 0 0' }}>
                        Publishing is strictly gated until organizations pass administrative identity and business review.
                      </p>
                    </div>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                    <Badge variant={pendingOrgs.length > 0 ? 'warning' : 'success'}>
                      {pendingOrgs.length} Pending Review
                    </Badge>
                    <Button size="sm" variant="outline" onClick={fetchPendingOrgs} disabled={loadingOrgs}>
                      <RefreshCw size={14} className={loadingOrgs ? 'spin' : ''} />
                    </Button>
                  </div>
                </div>

                {pendingOrgs.length === 0 ? (
                  <div style={{ padding: '2rem', textAlign: 'center', backgroundColor: 'var(--bg-elevated)', borderRadius: 'var(--radius-sm)' }}>
                    <CheckCircle2 size={36} color="var(--status-success)" style={{ margin: '0 auto 0.75rem' }} />
                    <div style={{ fontWeight: 700, fontSize: '1rem', color: 'var(--text-primary)' }}>
                      All Organizer Applications Reviewed
                    </div>
                    <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginTop: '0.25rem' }}>
                      No pending onboarding verifications in the administrative review queue.
                    </p>
                  </div>
                ) : (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                    {pendingOrgs.map((org) => (
                      <div
                        key={org.id}
                        style={{
                          padding: '1.25rem',
                          backgroundColor: 'var(--bg-elevated)',
                          borderRadius: 'var(--radius-md)',
                          border: '1px solid var(--border-medium)',
                          display: 'flex',
                          flexDirection: 'column',
                          gap: '0.75rem',
                        }}
                      >
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '0.75rem' }}>
                          <div>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
                              <span style={{ fontSize: '1.1rem', fontWeight: 800, color: 'var(--text-primary)' }}>
                                {org.name}
                              </span>
                              <Badge variant="warning">{org.verificationStatus}</Badge>
                              {org.organizationType && (
                                <Badge variant="info">{org.organizationType}</Badge>
                              )}
                            </div>
                            <div style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', marginTop: '0.35rem' }}>
                              Primary Contact: <strong>{org.contactEmail}</strong> {org.contactPhone ? `• ${org.contactPhone}` : ''}
                            </div>
                          </div>

                          <div style={{ display: 'flex', gap: '0.5rem' }}>
                            <Button
                              size="sm"
                              isLoading={processingOrgId === org.id}
                              onClick={() => setApproveConfirmOrg(org)}
                              style={{
                                backgroundColor: 'var(--status-success)',
                                color: '#FFFFFF',
                                borderColor: 'var(--status-success)',
                                fontWeight: 700,
                              }}
                            >
                              <CheckCircle2 size={14} style={{ marginRight: '4px' }} /> Approve &amp; Verify
                            </Button>
                            <Button
                              size="sm"
                              variant="secondary"
                              isLoading={processingOrgId === org.id}
                              onClick={() => {
                                setRejectModalOrg(org);
                                setRejectReasonInput('');
                                setRejectError(null);
                              }}
                              style={{ color: 'var(--status-danger)' }}
                            >
                              <XCircle size={14} style={{ marginRight: '4px' }} /> Reject
                            </Button>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </Card>

              {/* Recent Platform Orders Table */}
              <Card>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem' }}>
                  <h3 style={{ fontSize: '1.15rem', fontWeight: 700 }}>Recent Platform Settlement Feed</h3>
                  <Badge variant="info">Live PostgreSQL Audit</Badge>
                </div>

                {(!stats.recentOrders || stats.recentOrders.length === 0) ? (
                  <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem' }}>No orders have been recorded yet.</p>
                ) : (
                  <div style={{ overflowX: 'auto' }}>
                    <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.9rem' }}>
                      <thead>
                        <tr style={{ borderBottom: '1px solid var(--border-medium)', color: 'var(--text-muted)' }}>
                          <th style={{ padding: '0.75rem 0.5rem' }}>Order Reference</th>
                          <th style={{ padding: '0.75rem 0.5rem' }}>Purchaser</th>
                          <th style={{ padding: '0.75rem 0.5rem' }}>Settled Amount</th>
                          <th style={{ padding: '0.75rem 0.5rem' }}>Status</th>
                          <th style={{ padding: '0.75rem 0.5rem' }}>Timestamp</th>
                        </tr>
                      </thead>
                      <tbody>
                        {stats.recentOrders.map((ord) => (
                          <tr key={ord.id} style={{ borderBottom: '1px solid var(--border-subtle)' }}>
                            <td style={{ padding: '0.75rem 0.5rem', fontWeight: 600, fontFamily: 'monospace' }}>
                              {ord.orderNumber}
                            </td>
                            <td style={{ padding: '0.75rem 0.5rem', color: 'var(--text-secondary)' }}>
                              {ord.customerEmail}
                            </td>
                            <td style={{ padding: '0.75rem 0.5rem', fontWeight: 700 }}>
                              ₹{ord.totalAmount?.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                            </td>
                            <td style={{ padding: '0.75rem 0.5rem' }}>
                              <Badge variant={ord.status === 'CONFIRMED' ? 'success' : ord.status === 'EXPIRED' ? 'danger' : 'warning'}>
                                {ord.status}
                              </Badge>
                            </td>
                            <td style={{ padding: '0.75rem 0.5rem', color: 'var(--text-muted)', fontSize: '0.8rem' }}>
                              {ord.createdAt ? new Date(ord.createdAt).toLocaleString() : 'N/A'}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </Card>
            </>
          )}
        </>
      )}

      {/* ========================================================= */}
      {/* TAB: ORGANIZER APPLICATIONS REVIEW WORKSPACE              */}
      {/* ========================================================= */}
      {activeTab === 'APPLICATIONS' && (
        <div>
          {/* Header & Filter Controls */}
          <div
            style={{
              display: 'flex',
              gap: '1rem',
              alignItems: 'center',
              justifyContent: 'space-between',
              marginBottom: '1.5rem',
              flexWrap: 'wrap',
            }}
          >
            {/* Search Input */}
            <div
              style={{
                position: 'relative',
                flex: 1,
                minWidth: '280px',
                display: 'flex',
                alignItems: 'center',
              }}
            >
              <Search size={16} style={{ position: 'absolute', left: '0.75rem', color: 'var(--text-muted)' }} />
              <input
                type="text"
                placeholder="Search by organization name, email, phone, or tax ID..."
                value={orgSearch}
                onChange={(e) => setOrgSearch(e.target.value)}
                style={{
                  width: '100%',
                  padding: '0.65rem 0.75rem 0.65rem 2.25rem',
                  borderRadius: 'var(--radius-md)',
                  border: '1px solid var(--border-medium)',
                  backgroundColor: 'var(--bg-elevated)',
                  color: 'var(--text-primary)',
                  fontSize: '0.9rem',
                }}
              />
            </div>

            {/* Status Filter Pills */}
            <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap', alignItems: 'center' }}>
              {(['ALL', 'PENDING', 'VERIFIED', 'REJECTED'] as const).map((st) => {
                const count = st === 'ALL'
                  ? allOrgs.length
                  : allOrgs.filter((o) => o.verificationStatus === st).length;
                const isSelected = orgStatusFilter === st;

                return (
                  <button
                    key={st}
                    onClick={() => setOrgStatusFilter(st)}
                    style={{
                      padding: '0.45rem 0.85rem',
                      borderRadius: 'var(--radius-sm)',
                      fontSize: '0.82rem',
                      fontWeight: 700,
                      border: isSelected ? '1px solid var(--brand-primary)' : '1px solid var(--border-medium)',
                      backgroundColor: isSelected ? 'var(--brand-primary)' : 'var(--bg-elevated)',
                      color: isSelected ? '#FFFFFF' : 'var(--text-secondary)',
                      cursor: 'pointer',
                      transition: 'all 0.15s ease',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '0.35rem',
                    }}
                  >
                    <span>{st === 'ALL' ? 'All Applications' : st === 'PENDING' ? 'Pending Review' : st === 'VERIFIED' ? 'Approved' : 'Rejected'}</span>
                    <span
                      style={{
                        backgroundColor: isSelected ? 'rgba(255, 255, 255, 0.25)' : 'var(--border-subtle)',
                        borderRadius: '999px',
                        padding: '0.1rem 0.4rem',
                        fontSize: '0.75rem',
                      }}
                    >
                      {count}
                    </span>
                  </button>
                );
              })}

              <Button size="sm" variant="outline" onClick={fetchAllOrgs} disabled={loadingAllOrgs}>
                <RefreshCw size={14} className={loadingAllOrgs ? 'spin' : ''} />
              </Button>
            </div>
          </div>

          {/* Applications List */}
          {loadingAllOrgs && allOrgs.length === 0 ? (
            <LoadingSpinner label="Loading organizer applications from database..." />
          ) : (
            (() => {
              const filtered = allOrgs.filter((org) => {
                const matchesStatus = orgStatusFilter === 'ALL' || org.verificationStatus === orgStatusFilter;
                const q = orgSearch.toLowerCase().trim();
                const matchesSearch = !q ||
                  org.name?.toLowerCase().includes(q) ||
                  org.billingEmail?.toLowerCase().includes(q) ||
                  org.contactPhone?.toLowerCase().includes(q) ||
                  org.taxIdentifier?.toLowerCase().includes(q) ||
                  org.ownerName?.toLowerCase().includes(q);
                return matchesStatus && matchesSearch;
              });

              if (filtered.length === 0) {
                return (
                  <Card style={{ padding: '3.5rem 1.5rem', textAlign: 'center' }}>
                    <Building2 size={44} color="var(--text-muted)" style={{ margin: '0 auto 1rem' }} />
                    <h3 style={{ fontSize: '1.15rem', fontWeight: 700, marginBottom: '0.4rem' }}>
                      No Organizer Applications Found
                    </h3>
                    <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', maxWidth: '420px', margin: '0 auto' }}>
                      {orgSearch || orgStatusFilter !== 'ALL'
                        ? 'No applications match your selected filters. Try clearing search or selecting a different status filter.'
                        : 'No organizer applications have been submitted to the platform yet.'}
                    </p>
                  </Card>
                );
              }

              return (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                  {filtered.map((org) => {
                    const isPending = org.verificationStatus === 'PENDING';
                    const isVerified = org.verificationStatus === 'VERIFIED';
                    const isRejected = org.verificationStatus === 'REJECTED';

                    return (
                      <Card
                        key={org.id}
                        style={{
                          padding: '1.5rem',
                          borderLeft: isPending
                            ? '4px solid #F59E0B'
                            : isVerified
                            ? '4px solid var(--status-success)'
                            : '4px solid var(--status-danger)',
                        }}
                      >
                        <div
                          style={{
                            display: 'flex',
                            justifyContent: 'space-between',
                            alignItems: 'flex-start',
                            flexWrap: 'wrap',
                            gap: '1rem',
                          }}
                        >
                          {/* Left: Organization & Applicant Info */}
                          <div style={{ flex: 1, minWidth: '280px' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem', flexWrap: 'wrap' }}>
                              <h3 style={{ fontSize: '1.2rem', fontWeight: 800, margin: 0, color: 'var(--text-primary)' }}>
                                {org.name}
                              </h3>
                              <Badge
                                variant={isPending ? 'warning' : isVerified ? 'success' : 'danger'}
                                style={{ fontWeight: 700 }}
                              >
                                {isPending ? 'Pending Review' : isVerified ? 'Approved' : 'Rejected'}
                              </Badge>
                              {org.organizationType && (
                                <Badge variant="info">{org.organizationType}</Badge>
                              )}
                            </div>

                            <div
                              style={{
                                display: 'grid',
                                gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
                                gap: '0.6rem',
                                marginTop: '0.75rem',
                                fontSize: '0.86rem',
                                color: 'var(--text-secondary)',
                              }}
                            >
                              <div>
                                <span style={{ color: 'var(--text-muted)' }}>Applicant / Owner:</span>{' '}
                                <strong style={{ color: 'var(--text-primary)' }}>
                                  {org.ownerName || 'Registered User'} ({org.ownerEmail || org.billingEmail})
                                </strong>
                              </div>
                              <div>
                                <span style={{ color: 'var(--text-muted)' }}>Business Email:</span>{' '}
                                <strong style={{ color: 'var(--text-primary)' }}>{org.billingEmail}</strong>
                              </div>
                              <div>
                                <span style={{ color: 'var(--text-muted)' }}>Phone:</span>{' '}
                                <strong style={{ color: 'var(--text-primary)' }}>{org.contactPhone || '—'}</strong>
                              </div>
                              <div>
                                <span style={{ color: 'var(--text-muted)' }}>Tax ID / GSTIN:</span>{' '}
                                <strong style={{ color: 'var(--text-primary)' }}>{org.taxIdentifier || '—'}</strong>
                              </div>
                              <div>
                                <span style={{ color: 'var(--text-muted)' }}>Submitted:</span>{' '}
                                <strong style={{ color: 'var(--text-primary)' }}>
                                  {org.createdAt
                                    ? new Date(org.createdAt).toLocaleDateString(undefined, {
                                        month: 'short',
                                        day: 'numeric',
                                        year: 'numeric',
                                        hour: '2-digit',
                                        minute: '2-digit',
                                      })
                                    : '—'}
                                </strong>
                              </div>
                              {org.reviewedAt && (
                                <div>
                                  <span style={{ color: 'var(--text-muted)' }}>Reviewed:</span>{' '}
                                  <strong style={{ color: 'var(--text-primary)' }}>
                                    {new Date(org.reviewedAt).toLocaleDateString()}
                                  </strong>{' '}
                                  {org.reviewedByEmail && `by ${org.reviewedByEmail}`}
                                </div>
                              )}
                            </div>

                            {/* Rejection Reason Notice if rejected */}
                            {isRejected && org.rejectionReason && (
                              <div
                                style={{
                                  marginTop: '0.85rem',
                                  padding: '0.6rem 0.85rem',
                                  backgroundColor: 'rgba(239, 68, 68, 0.08)',
                                  borderRadius: 'var(--radius-sm)',
                                  border: '1px solid rgba(239, 68, 68, 0.2)',
                                  fontSize: '0.85rem',
                                  color: 'var(--status-danger)',
                                }}
                              >
                                <strong>Rejection Reason:</strong> &ldquo;{org.rejectionReason}&rdquo;
                              </div>
                            )}
                          </div>

                          {/* Right: Actions */}
                          <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center', flexWrap: 'wrap' }}>
                            <Button
                              size="sm"
                              variant="secondary"
                              onClick={() => setSelectedOrgForDetails(org)}
                            >
                              <Eye size={14} style={{ marginRight: '4px' }} />
                              <span>View Details</span>
                            </Button>

                            {isPending && (
                              <>
                                <Button
                                  size="sm"
                                  onClick={() => setApproveConfirmOrg(org)}
                                  isLoading={processingOrgId === org.id}
                                  style={{
                                    backgroundColor: 'var(--status-success)',
                                    color: '#FFFFFF',
                                    fontWeight: 700,
                                    borderColor: 'var(--status-success)',
                                  }}
                                >
                                  <CheckCircle2 size={14} style={{ marginRight: '4px' }} />
                                  <span>Approve</span>
                                </Button>

                                <Button
                                  size="sm"
                                  variant="secondary"
                                  onClick={() => {
                                    setRejectModalOrg(org);
                                    setRejectReasonInput('');
                                    setRejectError(null);
                                  }}
                                  isLoading={processingOrgId === org.id}
                                  style={{ color: 'var(--status-danger)' }}
                                >
                                  <XCircle size={14} style={{ marginRight: '4px' }} />
                                  <span>Reject</span>
                                </Button>
                              </>
                            )}

                            {isRejected && (
                              <Button
                                size="sm"
                                onClick={() => setApproveConfirmOrg(org)}
                                isLoading={processingOrgId === org.id}
                                style={{
                                  backgroundColor: 'var(--brand-primary)',
                                  color: '#FFFFFF',
                                  fontWeight: 700,
                                }}
                              >
                                <CheckCircle2 size={14} style={{ marginRight: '4px' }} />
                                <span>Re-evaluate &amp; Approve</span>
                              </Button>
                            )}
                          </div>
                        </div>
                      </Card>
                    );
                  })}
                </div>
              );
            })()
          )}
        </div>
      )}

      {/* ========================================================= */}
      {/* TAB 2: MANAGE EVENTS (EDIT / DELETE)                      */}
      {/* ========================================================= */}
      {activeTab === 'EVENTS' && (
        <div>
          {/* Search & Filter Bar */}
          <div
            style={{
              display: 'flex',
              gap: '1rem',
              alignItems: 'center',
              justifyContent: 'space-between',
              marginBottom: '1.5rem',
              flexWrap: 'wrap',
            }}
          >
            <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center', flex: 1, minWidth: '280px' }}>
              <div
                style={{
                  position: 'relative',
                  flex: 1,
                  display: 'flex',
                  alignItems: 'center',
                }}
              >
                <Search size={16} style={{ position: 'absolute', left: '0.75rem', color: 'var(--text-muted)' }} />
                <input
                  type="text"
                  placeholder="Search events by title, venue, city..."
                  value={eventSearch}
                  onChange={(e) => setEventSearch(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '0.65rem 0.75rem 0.65rem 2.25rem',
                    borderRadius: 'var(--radius-md)',
                    border: '1px solid var(--border-medium)',
                    backgroundColor: 'var(--bg-elevated)',
                    color: 'var(--text-primary)',
                    fontSize: '0.9rem',
                  }}
                />
              </div>

              <select
                value={eventCategoryFilter}
                onChange={(e) => setEventCategoryFilter(e.target.value)}
                style={{
                  padding: '0.65rem 1rem',
                  borderRadius: 'var(--radius-md)',
                  border: '1px solid var(--border-medium)',
                  backgroundColor: 'var(--bg-elevated)',
                  color: 'var(--text-primary)',
                  fontSize: '0.9rem',
                }}
              >
                <option value="ALL">All Categories</option>
                <option value="CONCERT">Concerts</option>
                <option value="COMEDY">Comedy</option>
                <option value="THEATRE">Theatre</option>
                <option value="FESTIVAL">Festivals</option>
                <option value="TECH">Tech / Conferences</option>
                <option value="SPORTS">Sports</option>
              </select>
            </div>

            <Button size="sm" variant="outline" onClick={fetchEvents} isLoading={loadingEvents}>
              <RefreshCw size={14} style={{ marginRight: '6px' }} /> Refresh Events
            </Button>
          </div>

          {loadingEvents ? (
            <LoadingSpinner label="Fetching platform event catalog..." />
          ) : filteredEvents.length === 0 ? (
            <Card style={{ textAlign: 'center', padding: '3rem' }}>
              <Calendar size={40} color="var(--text-muted)" style={{ margin: '0 auto 0.75rem' }} />
              <div style={{ fontWeight: 700, fontSize: '1.1rem' }}>No Events Match Filter</div>
              <p style={{ color: 'var(--text-secondary)', fontSize: '0.88rem', marginTop: '0.25rem' }}>
                Try adjusting your search terms or category filter.
              </p>
            </Card>
          ) : (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(340px, 1fr))', gap: '1.5rem' }}>
              {filteredEvents.map((ev) => (
                <Card
                  key={ev.id}
                  style={{
                    padding: 0,
                    overflow: 'hidden',
                    display: 'flex',
                    flexDirection: 'column',
                    justifyContent: 'space-between',
                    boxShadow: 'var(--shadow-sm)',
                    border: '1px solid var(--border-medium)',
                  }}
                >
                  <div>
                    {/* Event Banner */}
                    <div style={{ position: 'relative', height: '160px', backgroundColor: '#0f172a' }}>
                      {ev.bannerUrl ? (
                        <img
                          src={ev.bannerUrl}
                          alt={ev.title}
                          style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                        />
                      ) : (
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%', color: 'var(--text-muted)' }}>
                          <ImageIcon size={32} />
                        </div>
                      )}
                      <div style={{ position: 'absolute', top: '0.75rem', left: '0.75rem' }}>
                        <Badge variant="info">{ev.category}</Badge>
                      </div>
                      <div style={{ position: 'absolute', top: '0.75rem', right: '0.75rem' }}>
                        <Badge variant={ev.status === 'PUBLISHED' ? 'success' : 'neutral'}>
                          {ev.status}
                        </Badge>
                      </div>
                    </div>

                    {/* Content */}
                    <div style={{ padding: '1.25rem' }}>
                      <h3
                        style={{
                          fontSize: '1.15rem',
                          fontWeight: 800,
                          marginBottom: '0.4rem',
                          fontFamily: 'var(--font-display)',
                          lineHeight: 1.3,
                        }}
                      >
                        {ev.title}
                      </h3>

                      <p
                        style={{
                          fontSize: '0.85rem',
                          color: 'var(--text-secondary)',
                          lineHeight: 1.45,
                          marginBottom: '0.85rem',
                          display: '-webkit-box',
                          WebkitLineClamp: 2,
                          WebkitBoxOrient: 'vertical',
                          overflow: 'hidden',
                        }}
                      >
                        {ev.shortSummary || 'No summary provided.'}
                      </p>

                      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.35rem', fontSize: '0.82rem', color: 'var(--text-muted)' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                          <MapPin size={14} color="var(--brand-primary)" />
                          <span>{ev.venueName || 'Venue TBA'} • {ev.city || 'City TBA'}</span>
                        </div>
                        {ev.startingPrice != null && (
                          <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', fontWeight: 600, color: 'var(--text-primary)' }}>
                            <Ticket size={14} color="var(--status-success)" />
                            <span>Starting at ₹{ev.startingPrice.toLocaleString('en-IN')}</span>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Actions Footer */}
                  <div
                    style={{
                      padding: '0.85rem 1.25rem',
                      backgroundColor: 'var(--bg-elevated)',
                      borderTop: '1px solid var(--border-subtle)',
                      display: 'flex',
                      gap: '0.6rem',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                    }}
                  >
                    <Link
                      to={`/events/${ev.slug || ev.id}`}
                      target="_blank"
                      style={{
                        fontSize: '0.82rem',
                        color: 'var(--brand-primary)',
                        fontWeight: 600,
                        display: 'flex',
                        alignItems: 'center',
                        gap: '0.25rem',
                      }}
                    >
                      <ExternalLink size={13} /> View Live
                    </Link>

                    <div style={{ display: 'flex', gap: '0.5rem' }}>
                      <Button
                        size="sm"
                        variant="secondary"
                        onClick={() => handleOpenEditEvent(ev)}
                        style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', fontSize: '0.82rem' }}
                      >
                        <Edit3 size={13} /> Edit
                      </Button>
                      <Button
                        size="sm"
                        variant="secondary"
                        onClick={() => setDeleteConfirmEvent(ev)}
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: '0.35rem',
                          fontSize: '0.82rem',
                          color: 'var(--status-danger)',
                        }}
                      >
                        <Trash2 size={13} /> Delete
                      </Button>
                    </div>
                  </div>
                </Card>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ========================================================= */}
      {/* TAB 3: MANAGE USERS (TOGGLE / REMOVE)                      */}
      {/* ========================================================= */}
      {activeTab === 'USERS' && (
        <div>
          {/* User Filter Controls */}
          <div
            style={{
              display: 'flex',
              gap: '1rem',
              alignItems: 'center',
              justifyContent: 'space-between',
              marginBottom: '1.5rem',
              flexWrap: 'wrap',
            }}
          >
            <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center', flex: 1, minWidth: '280px' }}>
              <div style={{ position: 'relative', flex: 1, display: 'flex', alignItems: 'center' }}>
                <Search size={16} style={{ position: 'absolute', left: '0.75rem', color: 'var(--text-muted)' }} />
                <input
                  type="text"
                  placeholder="Search users by name, username, or email..."
                  value={userSearch}
                  onChange={(e) => setUserSearch(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '0.65rem 0.75rem 0.65rem 2.25rem',
                    borderRadius: 'var(--radius-md)',
                    border: '1px solid var(--border-medium)',
                    backgroundColor: 'var(--bg-elevated)',
                    color: 'var(--text-primary)',
                    fontSize: '0.9rem',
                  }}
                />
              </div>

              <select
                value={userRoleFilter}
                onChange={(e) => setUserRoleFilter(e.target.value)}
                style={{
                  padding: '0.65rem 1rem',
                  borderRadius: 'var(--radius-md)',
                  border: '1px solid var(--border-medium)',
                  backgroundColor: 'var(--bg-elevated)',
                  color: 'var(--text-primary)',
                  fontSize: '0.9rem',
                }}
              >
                <option value="ALL">All Roles</option>
                <option value="CUSTOMER">Customer</option>
                <option value="ORGANIZER">Organizer</option>
                <option value="GATE_STAFF">Gate Staff</option>
                <option value="PLATFORM_ADMIN">Platform Admin</option>
              </select>
            </div>

            <Button size="sm" variant="outline" onClick={fetchUsers} isLoading={loadingUsers}>
              <RefreshCw size={14} style={{ marginRight: '6px' }} /> Refresh Users
            </Button>
          </div>

          {loadingUsers ? (
            <LoadingSpinner label="Retrieving registered platform user directory..." />
          ) : filteredUsers.length === 0 ? (
            <Card style={{ textAlign: 'center', padding: '3rem' }}>
              <Users size={40} color="var(--text-muted)" style={{ margin: '0 auto 0.75rem' }} />
              <div style={{ fontWeight: 700, fontSize: '1.1rem' }}>No Users Match Search</div>
              <p style={{ color: 'var(--text-secondary)', fontSize: '0.88rem', marginTop: '0.25rem' }}>
                Try adjusting your search criteria or role filter.
              </p>
            </Card>
          ) : (
            <Card style={{ padding: 0, overflow: 'hidden' }}>
              <div style={{ overflowX: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.88rem' }}>
                  <thead>
                    <tr style={{ backgroundColor: 'var(--bg-elevated)', borderBottom: '1px solid var(--border-medium)', color: 'var(--text-muted)' }}>
                      <th style={{ padding: '0.85rem 1rem' }}>User Profile</th>
                      <th style={{ padding: '0.85rem 1rem' }}>Contact Info</th>
                      <th style={{ padding: '0.85rem 1rem' }}>Role</th>
                      <th style={{ padding: '0.85rem 1rem' }}>Status</th>
                      <th style={{ padding: '0.85rem 1rem' }}>Joined Date</th>
                      <th style={{ padding: '0.85rem 1rem', textAlign: 'right' }}>Administrative Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredUsers.map((u) => {
                      const isSelf = user?.id === u.id;
                      return (
                        <tr key={u.id} style={{ borderBottom: '1px solid var(--border-subtle)', transition: 'background 0.15s' }}>
                          <td style={{ padding: '0.85rem 1rem' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                              <div
                                style={{
                                  width: '36px',
                                  height: '36px',
                                  borderRadius: '50%',
                                  backgroundColor: u.role === 'PLATFORM_ADMIN' ? '#ede9fe' : u.role === 'ORGANIZER' ? '#e0f2fe' : '#f1f5f9',
                                  color: u.role === 'PLATFORM_ADMIN' ? '#7c3aed' : u.role === 'ORGANIZER' ? '#0284c7' : 'var(--text-primary)',
                                  display: 'flex',
                                  alignItems: 'center',
                                  justifyContent: 'center',
                                  fontWeight: 700,
                                  fontSize: '0.9rem',
                                }}
                              >
                                {u.fullName ? u.fullName.charAt(0).toUpperCase() : u.username ? u.username.charAt(0).toUpperCase() : 'U'}
                              </div>
                              <div>
                                <div style={{ fontWeight: 700, color: 'var(--text-primary)' }}>
                                  {u.fullName || 'No display name'}
                                  {isSelf && <span style={{ marginLeft: '6px', fontSize: '0.72rem', color: 'var(--brand-primary)', fontWeight: 600 }}>(You)</span>}
                                </div>
                                <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)', fontFamily: 'monospace' }}>
                                  @{u.username || 'n/a'}
                                </div>
                              </div>
                            </div>
                          </td>

                          <td style={{ padding: '0.85rem 1rem' }}>
                            <div style={{ color: 'var(--text-primary)', fontWeight: 500 }}>{u.email}</div>
                            {u.phoneNumber && (
                              <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>{u.phoneNumber}</div>
                            )}
                          </td>

                          <td style={{ padding: '0.85rem 1rem' }}>
                            <Badge
                              variant={
                                u.role === 'PLATFORM_ADMIN'
                                  ? 'warning'
                                  : u.role === 'ORGANIZER'
                                  ? 'info'
                                  : u.role === 'GATE_STAFF'
                                  ? 'warning'
                                  : 'neutral'
                              }
                            >
                              {u.role}
                            </Badge>
                          </td>

                          <td style={{ padding: '0.85rem 1rem' }}>
                            {u.isActive ? (
                              <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', color: 'var(--status-success)', fontSize: '0.82rem', fontWeight: 600 }}>
                                <Check size={14} /> Active
                              </span>
                            ) : (
                              <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', color: 'var(--status-danger)', fontSize: '0.82rem', fontWeight: 600 }}>
                                <X size={14} /> Deactivated
                              </span>
                            )}
                          </td>

                          <td style={{ padding: '0.85rem 1rem', color: 'var(--text-secondary)', fontSize: '0.82rem' }}>
                            {u.createdAt ? new Date(u.createdAt).toLocaleDateString() : 'N/A'}
                          </td>

                          <td style={{ padding: '0.85rem 1rem', textAlign: 'right' }}>
                            <div style={{ display: 'inline-flex', gap: '0.5rem', alignItems: 'center' }}>
                              {!isSelf && (
                                <>
                                  <Button
                                    size="sm"
                                    variant="outline"
                                    isLoading={togglingUserId === u.id}
                                    onClick={() => handleToggleUserStatus(u)}
                                    style={{ fontSize: '0.78rem', padding: '0.35rem 0.65rem' }}
                                  >
                                    {u.isActive ? 'Deactivate' : 'Activate'}
                                  </Button>

                                  <Button
                                    size="sm"
                                    variant="secondary"
                                    onClick={() => setDeleteConfirmUser(u)}
                                    style={{
                                      fontSize: '0.78rem',
                                      padding: '0.35rem 0.65rem',
                                      color: 'var(--status-danger)',
                                      borderColor: 'rgba(239, 68, 68, 0.3)',
                                    }}
                                  >
                                    <Trash2 size={13} style={{ marginRight: '4px' }} /> Remove
                                  </Button>
                                </>
                              )}
                              {isSelf && (
                                <span style={{ fontSize: '0.78rem', color: 'var(--text-muted)', fontStyle: 'italic' }}>
                                  Root Admin
                                </span>
                              )}
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </Card>
          )}
        </div>
      )}

      {/* ========================================================= */}
      {/* MODAL 1: EDIT EVENT MODAL                                  */}
      {/* ========================================================= */}
      {editingEvent && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            backgroundColor: 'rgba(15, 23, 42, 0.7)',
            backdropFilter: 'blur(8px)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 120,
            padding: '1.5rem',
          }}
        >
          <Card
            style={{
              maxWidth: '680px',
              width: '100%',
              maxHeight: '90vh',
              overflowY: 'auto',
              padding: '2rem',
              position: 'relative',
              backgroundColor: 'var(--bg-card)',
              boxShadow: 'var(--shadow-xl)',
            }}
          >
            <button
              onClick={() => setEditingEvent(null)}
              style={{ position: 'absolute', top: '1.25rem', right: '1.25rem', color: 'var(--text-muted)', cursor: 'pointer', background: 'none', border: 'none' }}
            >
              <X size={20} />
            </button>

            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.5rem' }}>
              <Edit3 size={22} color="var(--brand-primary)" />
              <h2 style={{ fontSize: '1.35rem', fontWeight: 800, margin: 0, fontFamily: 'var(--font-display)' }}>
                Edit Event: {editingEvent.title}
              </h2>
            </div>
            <p style={{ color: 'var(--text-secondary)', fontSize: '0.85rem', marginBottom: '1.5rem' }}>
              Update event title, promotional banners, description, category, and access parameters.
            </p>

            <form onSubmit={handleSaveEvent} style={{ display: 'flex', flexDirection: 'column', gap: '1.1rem' }}>
              {/* Event Title */}
              <div>
                <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 700, marginBottom: '0.35rem' }}>
                  Event Name / Title *
                </label>
                <input
                  type="text"
                  required
                  value={editingEvent.title}
                  onChange={(e) => setEditingEvent({ ...editingEvent, title: e.target.value })}
                  style={{
                    width: '100%',
                    padding: '0.65rem 0.75rem',
                    borderRadius: 'var(--radius-sm)',
                    border: '1px solid var(--border-medium)',
                    backgroundColor: 'var(--bg-elevated)',
                    color: 'var(--text-primary)',
                    fontSize: '0.95rem',
                  }}
                />
              </div>

              {/* Category & Max Tickets Grid */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 700, marginBottom: '0.35rem' }}>
                    Category *
                  </label>
                  <select
                    value={editingEvent.category}
                    onChange={(e) => setEditingEvent({ ...editingEvent, category: e.target.value })}
                    style={{
                      width: '100%',
                      padding: '0.65rem 0.75rem',
                      borderRadius: 'var(--radius-sm)',
                      border: '1px solid var(--border-medium)',
                      backgroundColor: 'var(--bg-elevated)',
                      color: 'var(--text-primary)',
                      fontSize: '0.95rem',
                    }}
                  >
                    <option value="CONCERT">Concert</option>
                    <option value="COMEDY">Comedy</option>
                    <option value="THEATRE">Theatre</option>
                    <option value="FESTIVAL">Festival</option>
                    <option value="TECH">Tech / Conference</option>
                    <option value="SPORTS">Sports</option>
                  </select>
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 700, marginBottom: '0.35rem' }}>
                    Max Tickets / Order
                  </label>
                  <input
                    type="number"
                    min="1"
                    max="20"
                    value={editingEvent.maxTicketsPerUser}
                    onChange={(e) => setEditingEvent({ ...editingEvent, maxTicketsPerUser: parseInt(e.target.value) || 6 })}
                    style={{
                      width: '100%',
                      padding: '0.65rem 0.75rem',
                      borderRadius: 'var(--radius-sm)',
                      border: '1px solid var(--border-medium)',
                      backgroundColor: 'var(--bg-elevated)',
                      color: 'var(--text-primary)',
                      fontSize: '0.95rem',
                    }}
                  />
                </div>
              </div>

              {/* Banner Image URL & Live Preview */}
              <div>
                <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 700, marginBottom: '0.35rem' }}>
                  Banner Image URL
                </label>
                <input
                  type="url"
                  placeholder="https://example.com/banner.jpg"
                  value={editingEvent.bannerUrl}
                  onChange={(e) => setEditingEvent({ ...editingEvent, bannerUrl: e.target.value })}
                  style={{
                    width: '100%',
                    padding: '0.65rem 0.75rem',
                    borderRadius: 'var(--radius-sm)',
                    border: '1px solid var(--border-medium)',
                    backgroundColor: 'var(--bg-elevated)',
                    color: 'var(--text-primary)',
                    fontSize: '0.9rem',
                    marginBottom: '0.5rem',
                  }}
                />
                {editingEvent.bannerUrl && (
                  <div style={{ position: 'relative', height: '140px', borderRadius: '6px', overflow: 'hidden', border: '1px solid var(--border-medium)' }}>
                    <img
                      src={editingEvent.bannerUrl}
                      alt="Banner Preview"
                      style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                      onError={(e) => {
                        (e.target as HTMLElement).style.display = 'none';
                      }}
                    />
                    <div style={{ position: 'absolute', bottom: '6px', left: '8px', background: 'rgba(0,0,0,0.6)', padding: '2px 8px', borderRadius: '4px', fontSize: '0.72rem', color: '#fff' }}>
                      Live Banner Preview
                    </div>
                  </div>
                )}
              </div>

              {/* Thumbnail URL */}
              <div>
                <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 700, marginBottom: '0.35rem' }}>
                  Thumbnail Image URL (Optional)
                </label>
                <input
                  type="url"
                  placeholder="Defaults to banner if blank"
                  value={editingEvent.thumbnailUrl}
                  onChange={(e) => setEditingEvent({ ...editingEvent, thumbnailUrl: e.target.value })}
                  style={{
                    width: '100%',
                    padding: '0.65rem 0.75rem',
                    borderRadius: 'var(--radius-sm)',
                    border: '1px solid var(--border-medium)',
                    backgroundColor: 'var(--bg-elevated)',
                    color: 'var(--text-primary)',
                    fontSize: '0.9rem',
                  }}
                />
              </div>

              {/* Short Summary */}
              <div>
                <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 700, marginBottom: '0.35rem' }}>
                  Short Summary (Shown on Cards) *
                </label>
                <input
                  type="text"
                  required
                  value={editingEvent.shortSummary}
                  onChange={(e) => setEditingEvent({ ...editingEvent, shortSummary: e.target.value })}
                  style={{
                    width: '100%',
                    padding: '0.65rem 0.75rem',
                    borderRadius: 'var(--radius-sm)',
                    border: '1px solid var(--border-medium)',
                    backgroundColor: 'var(--bg-elevated)',
                    color: 'var(--text-primary)',
                    fontSize: '0.95rem',
                  }}
                />
              </div>

              {/* Description */}
              <div>
                <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 700, marginBottom: '0.35rem' }}>
                  Detailed Description *
                </label>
                <textarea
                  required
                  rows={4}
                  value={editingEvent.description}
                  onChange={(e) => setEditingEvent({ ...editingEvent, description: e.target.value })}
                  style={{
                    width: '100%',
                    padding: '0.65rem 0.75rem',
                    borderRadius: 'var(--radius-sm)',
                    border: '1px solid var(--border-medium)',
                    backgroundColor: 'var(--bg-elevated)',
                    color: 'var(--text-primary)',
                    fontSize: '0.9rem',
                    resize: 'vertical',
                    fontFamily: 'inherit',
                  }}
                />
              </div>

              {/* Feature Toggles */}
              <div style={{ display: 'flex', gap: '1.5rem', padding: '0.75rem', backgroundColor: 'var(--bg-elevated)', borderRadius: '6px' }}>
                <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer', fontSize: '0.88rem', fontWeight: 600 }}>
                  <input
                    type="checkbox"
                    checked={editingEvent.isFeatured}
                    onChange={(e) => setEditingEvent({ ...editingEvent, isFeatured: e.target.checked })}
                  />
                  Featured Showcase
                </label>

                <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer', fontSize: '0.88rem', fontWeight: 600 }}>
                  <input
                    type="checkbox"
                    checked={editingEvent.requiresVirtualQueue}
                    onChange={(e) => setEditingEvent({ ...editingEvent, requiresVirtualQueue: e.target.checked })}
                  />
                  Virtual Queue Protection
                </label>
              </div>

              {/* Buttons */}
              <div style={{ display: 'flex', gap: '0.75rem', marginTop: '0.5rem' }}>
                <Button type="button" variant="secondary" onClick={() => setEditingEvent(null)} style={{ flex: 1 }}>
                  Cancel
                </Button>
                <Button type="submit" variant="primary" isLoading={savingEvent} style={{ flex: 1, fontWeight: 700 }}>
                  Save Event Changes
                </Button>
              </div>
            </form>
          </Card>
        </div>
      )}

      {/* ========================================================= */}
      {/* MODAL 2: CONFIRM DELETE EVENT                             */}
      {/* ========================================================= */}
      {deleteConfirmEvent && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            backgroundColor: 'rgba(15, 23, 42, 0.7)',
            backdropFilter: 'blur(8px)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 130,
            padding: '1.5rem',
          }}
        >
          <Card
            style={{
              maxWidth: '460px',
              width: '100%',
              padding: '2rem',
              textAlign: 'center',
              backgroundColor: 'var(--bg-card)',
              border: '1px solid rgba(239, 68, 68, 0.4)',
              boxShadow: 'var(--shadow-xl)',
            }}
          >
            <div
              style={{
                width: '56px',
                height: '56px',
                borderRadius: '50%',
                backgroundColor: 'rgba(239, 68, 68, 0.1)',
                color: 'var(--status-danger)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                margin: '0 auto 1.25rem',
              }}
            >
              <AlertTriangle size={28} />
            </div>

            <h3 style={{ fontSize: '1.25rem', fontWeight: 800, marginBottom: '0.5rem' }}>
              Delete Event?
            </h3>
            <p style={{ color: 'var(--text-secondary)', fontSize: '0.88rem', lineHeight: 1.5, marginBottom: '1.5rem' }}>
              Are you sure you want to delete <strong>&quot;{deleteConfirmEvent.title}&quot;</strong>? This action cannot be undone. If tickets have already been booked, the event will remain locked for legal/financial integrity.
            </p>

            <div style={{ display: 'flex', gap: '0.75rem' }}>
              <Button variant="secondary" onClick={() => setDeleteConfirmEvent(null)} style={{ flex: 1 }}>
                Cancel
              </Button>
              <Button
                variant="primary"
                isLoading={deletingEventId === deleteConfirmEvent.id}
                onClick={() => handleDeleteEvent(deleteConfirmEvent)}
                style={{ flex: 1, backgroundColor: 'var(--status-danger)', borderColor: 'var(--status-danger)', color: '#fff', fontWeight: 700 }}
              >
                Confirm Delete
              </Button>
            </div>
          </Card>
        </div>
      )}

      {/* ========================================================= */}
      {/* MODAL 3: CONFIRM REMOVE USER                              */}
      {/* ========================================================= */}
      {deleteConfirmUser && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            backgroundColor: 'rgba(15, 23, 42, 0.7)',
            backdropFilter: 'blur(8px)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 130,
            padding: '1.5rem',
          }}
        >
          <Card
            style={{
              maxWidth: '460px',
              width: '100%',
              padding: '2rem',
              textAlign: 'center',
              backgroundColor: 'var(--bg-card)',
              border: '1px solid rgba(239, 68, 68, 0.4)',
              boxShadow: 'var(--shadow-xl)',
            }}
          >
            <div
              style={{
                width: '56px',
                height: '56px',
                borderRadius: '50%',
                backgroundColor: 'rgba(239, 68, 68, 0.1)',
                color: 'var(--status-danger)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                margin: '0 auto 1.25rem',
              }}
            >
              <UserX size={28} />
            </div>

            <h3 style={{ fontSize: '1.25rem', fontWeight: 800, marginBottom: '0.5rem' }}>
              Remove User Account?
            </h3>
            <p style={{ color: 'var(--text-secondary)', fontSize: '0.88rem', lineHeight: 1.5, marginBottom: '1.5rem' }}>
              Are you sure you want to remove user <strong>{deleteConfirmUser.fullName || deleteConfirmUser.username}</strong> ({deleteConfirmUser.email})?
              <br />
              <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)', display: 'block', marginTop: '0.5rem' }}>
                If this user has historical paid ticket orders, personal credentials will be scrubbed and the account deactivated to maintain transaction ledger integrity.
              </span>
            </p>

            <div style={{ display: 'flex', gap: '0.75rem' }}>
              <Button variant="secondary" onClick={() => setDeleteConfirmUser(null)} style={{ flex: 1 }}>
                Cancel
              </Button>
              <Button
                variant="primary"
                isLoading={removingUserId === deleteConfirmUser.id}
                onClick={() => handleRemoveUser(deleteConfirmUser)}
                style={{ flex: 1, backgroundColor: 'var(--status-danger)', borderColor: 'var(--status-danger)', color: '#fff', fontWeight: 700 }}
              >
                Confirm Remove
              </Button>
            </div>
          </Card>
        </div>
      )}
      {/* ========================================================= */}
      {/* MODAL 1: ORGANIZER APPLICATION FULL DETAILS               */}
      {/* ========================================================= */}
      {selectedOrgForDetails && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            backgroundColor: 'rgba(15, 23, 42, 0.6)',
            backdropFilter: 'blur(4px)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 100,
            padding: '1.5rem',
            overflowY: 'auto',
          }}
        >
          <Card
            style={{
              maxWidth: '680px',
              width: '100%',
              maxHeight: '90vh',
              overflowY: 'auto',
              padding: '2rem',
              backgroundColor: 'var(--bg-card)',
              boxShadow: 'var(--shadow-xl)',
            }}
          >
            {/* Modal Header */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '1.5rem' }}>
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem' }}>
                  <h3 style={{ fontSize: '1.35rem', fontWeight: 800, margin: 0 }}>
                    {selectedOrgForDetails.name}
                  </h3>
                  <Badge
                    variant={
                      selectedOrgForDetails.verificationStatus === 'PENDING'
                        ? 'warning'
                        : selectedOrgForDetails.verificationStatus === 'VERIFIED'
                        ? 'success'
                        : 'danger'
                    }
                  >
                    {selectedOrgForDetails.verificationStatus}
                  </Badge>
                </div>
                <div style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', marginTop: '0.25rem' }}>
                  Application ID: <code style={{ fontSize: '0.8rem' }}>{selectedOrgForDetails.id}</code>
                </div>
              </div>

              <button
                onClick={() => setSelectedOrgForDetails(null)}
                style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', padding: '4px' }}
              >
                <X size={20} />
              </button>
            </div>

            {/* Details Grid */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem', fontSize: '0.9rem' }}>
              {/* Section 1: Business Identity */}
              <div style={{ padding: '1rem', backgroundColor: 'var(--bg-elevated)', borderRadius: 'var(--radius-md)' }}>
                <h4 style={{ fontSize: '0.82rem', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', marginBottom: '0.75rem' }}>
                  Business Identity &amp; Applicant
                </h4>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '0.75rem' }}>
                  <div>
                    <span style={{ color: 'var(--text-muted)', fontSize: '0.8rem', display: 'block' }}>Applicant Name</span>
                    <strong>{selectedOrgForDetails.ownerName || 'Registered Account'}</strong>
                  </div>
                  <div>
                    <span style={{ color: 'var(--text-muted)', fontSize: '0.8rem', display: 'block' }}>Account Email</span>
                    <strong>{selectedOrgForDetails.ownerEmail || selectedOrgForDetails.billingEmail}</strong>
                  </div>
                  <div>
                    <span style={{ color: 'var(--text-muted)', fontSize: '0.8rem', display: 'block' }}>Organization Type</span>
                    <strong>{selectedOrgForDetails.organizationType || 'ENTERPRISE'}</strong>
                  </div>
                  <div>
                    <span style={{ color: 'var(--text-muted)', fontSize: '0.8rem', display: 'block' }}>Tax Identifier / GSTIN</span>
                    <strong style={{ fontFamily: 'monospace' }}>{selectedOrgForDetails.taxIdentifier || 'Not provided'}</strong>
                  </div>
                </div>
              </div>

              {/* Section 2: Contact Information */}
              <div style={{ padding: '1rem', backgroundColor: 'var(--bg-elevated)', borderRadius: 'var(--radius-md)' }}>
                <h4 style={{ fontSize: '0.82rem', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', marginBottom: '0.75rem' }}>
                  Contact &amp; Physical Address
                </h4>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '0.75rem' }}>
                  <div>
                    <span style={{ color: 'var(--text-muted)', fontSize: '0.8rem', display: 'block' }}>Business Email</span>
                    <strong>{selectedOrgForDetails.billingEmail}</strong>
                  </div>
                  <div>
                    <span style={{ color: 'var(--text-muted)', fontSize: '0.8rem', display: 'block' }}>Contact Phone</span>
                    <strong>{selectedOrgForDetails.contactPhone || '—'}</strong>
                  </div>
                  <div style={{ gridColumn: '1 / -1' }}>
                    <span style={{ color: 'var(--text-muted)', fontSize: '0.8rem', display: 'block' }}>Registered Address</span>
                    <strong>{selectedOrgForDetails.businessAddress || 'Not provided'}</strong>
                  </div>
                  {selectedOrgForDetails.website && (
                    <div style={{ gridColumn: '1 / -1' }}>
                      <span style={{ color: 'var(--text-muted)', fontSize: '0.8rem', display: 'block' }}>Website / Social</span>
                      <a
                        href={selectedOrgForDetails.website}
                        target="_blank"
                        rel="noreferrer"
                        style={{ color: 'var(--brand-primary)', wordBreak: 'break-all' }}
                      >
                        {selectedOrgForDetails.website}
                      </a>
                    </div>
                  )}
                </div>
              </div>

              {/* Section 3: Portfolio Description */}
              {selectedOrgForDetails.description && (
                <div style={{ padding: '1rem', backgroundColor: 'var(--bg-elevated)', borderRadius: 'var(--radius-md)' }}>
                  <h4 style={{ fontSize: '0.82rem', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', marginBottom: '0.5rem' }}>
                    Event Portfolio Description
                  </h4>
                  <p style={{ color: 'var(--text-secondary)', lineHeight: 1.6, margin: 0 }}>
                    {selectedOrgForDetails.description}
                  </p>
                </div>
              )}

              {/* Section 4: Review Audit Status */}
              <div style={{ padding: '1rem', backgroundColor: 'var(--bg-elevated)', borderRadius: 'var(--radius-md)' }}>
                <h4 style={{ fontSize: '0.82rem', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', marginBottom: '0.75rem' }}>
                  Review &amp; Audit Trail
                </h4>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '0.75rem' }}>
                  <div>
                    <span style={{ color: 'var(--text-muted)', fontSize: '0.8rem', display: 'block' }}>Submitted Timestamp</span>
                    <strong>
                      {selectedOrgForDetails.createdAt
                        ? new Date(selectedOrgForDetails.createdAt).toLocaleString()
                        : '—'}
                    </strong>
                  </div>
                  <div>
                    <span style={{ color: 'var(--text-muted)', fontSize: '0.8rem', display: 'block' }}>Reviewed Timestamp</span>
                    <strong>
                      {selectedOrgForDetails.reviewedAt
                        ? new Date(selectedOrgForDetails.reviewedAt).toLocaleString()
                        : 'Awaiting Review'}
                    </strong>
                  </div>
                  {selectedOrgForDetails.reviewedByEmail && (
                    <div>
                      <span style={{ color: 'var(--text-muted)', fontSize: '0.8rem', display: 'block' }}>Reviewed By Admin</span>
                      <strong>{selectedOrgForDetails.reviewedByEmail}</strong>
                    </div>
                  )}
                </div>

                {selectedOrgForDetails.rejectionReason && (
                  <div
                    style={{
                      marginTop: '0.75rem',
                      padding: '0.75rem',
                      backgroundColor: 'rgba(239, 68, 68, 0.08)',
                      border: '1px solid rgba(239, 68, 68, 0.25)',
                      borderRadius: 'var(--radius-sm)',
                    }}
                  >
                    <span style={{ color: 'var(--status-danger)', fontSize: '0.8rem', fontWeight: 700, display: 'block' }}>
                      Rejection Reason:
                    </span>
                    <div style={{ color: 'var(--text-primary)', marginTop: '0.2rem' }}>
                      {selectedOrgForDetails.rejectionReason}
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Modal Actions */}
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem', marginTop: '1.75rem', borderTop: '1px solid var(--border-subtle)', paddingTop: '1.25rem' }}>
              <Button variant="secondary" onClick={() => setSelectedOrgForDetails(null)}>
                Close
              </Button>

              {selectedOrgForDetails.verificationStatus === 'PENDING' && (
                <>
                  <Button
                    variant="secondary"
                    onClick={() => {
                      setRejectModalOrg(selectedOrgForDetails);
                      setRejectReasonInput('');
                      setRejectError(null);
                    }}
                    style={{ color: 'var(--status-danger)' }}
                  >
                    <XCircle size={15} style={{ marginRight: '4px' }} />
                    Reject Application
                  </Button>

                  <Button
                    onClick={() => setApproveConfirmOrg(selectedOrgForDetails)}
                    style={{ backgroundColor: 'var(--status-success)', color: '#FFFFFF', fontWeight: 700 }}
                  >
                    <CheckCircle2 size={15} style={{ marginRight: '4px' }} />
                    Approve Application
                  </Button>
                </>
              )}

              {selectedOrgForDetails.verificationStatus === 'REJECTED' && (
                <Button
                  onClick={() => setApproveConfirmOrg(selectedOrgForDetails)}
                  style={{ backgroundColor: 'var(--brand-primary)', color: '#FFFFFF', fontWeight: 700 }}
                >
                  <CheckCircle2 size={15} style={{ marginRight: '4px' }} />
                  Re-evaluate &amp; Approve
                </Button>
              )}
            </div>
          </Card>
        </div>
      )}

      {/* ========================================================= */}
      {/* MODAL 2: APPROVE CONFIRMATION MODAL                       */}
      {/* ========================================================= */}
      {approveConfirmOrg && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            backgroundColor: 'rgba(15, 23, 42, 0.65)',
            backdropFilter: 'blur(4px)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 110,
            padding: '1.5rem',
          }}
        >
          <Card
            style={{
              maxWidth: '480px',
              width: '100%',
              padding: '2rem',
              textAlign: 'center',
              backgroundColor: 'var(--bg-card)',
              boxShadow: 'var(--shadow-xl)',
            }}
          >
            <div
              style={{
                width: '56px',
                height: '56px',
                borderRadius: '50%',
                backgroundColor: 'var(--status-success-bg, rgba(16, 185, 129, 0.12))',
                color: 'var(--status-success, #10B981)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                margin: '0 auto 1.25rem',
              }}
            >
              <CheckCircle2 size={30} />
            </div>

            <h3 style={{ fontSize: '1.25rem', fontWeight: 800, marginBottom: '0.5rem' }}>
              Approve Organizer Application?
            </h3>

            <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', lineHeight: 1.6, marginBottom: '1.5rem' }}>
              Are you sure you want to approve <strong>{approveConfirmOrg.name}</strong>?
              <br />
              This will officially grant the applicant (<strong style={{ color: 'var(--text-primary)' }}>{approveConfirmOrg.billingEmail}</strong>)
              the <strong>ORGANIZER</strong> authority in the database and unlock the Organizer Studio workspace for publishing events.
            </p>

            <div style={{ display: 'flex', gap: '0.75rem' }}>
              <Button
                variant="secondary"
                onClick={() => setApproveConfirmOrg(null)}
                style={{ flex: 1 }}
                disabled={processingOrgId === approveConfirmOrg.id}
              >
                Cancel
              </Button>
              <Button
                variant="primary"
                isLoading={processingOrgId === approveConfirmOrg.id}
                onClick={() => handleApproveOrg(approveConfirmOrg.id, approveConfirmOrg.name)}
                style={{ flex: 1, backgroundColor: 'var(--status-success)', borderColor: 'var(--status-success)', color: '#FFFFFF', fontWeight: 700 }}
              >
                Confirm Approval
              </Button>
            </div>
          </Card>
        </div>
      )}

      {/* ========================================================= */}
      {/* MODAL 3: REJECT WITH MANDATORY REASON MODAL               */}
      {/* ========================================================= */}
      {rejectModalOrg && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            backgroundColor: 'rgba(15, 23, 42, 0.65)',
            backdropFilter: 'blur(4px)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 110,
            padding: '1.5rem',
          }}
        >
          <Card
            style={{
              maxWidth: '520px',
              width: '100%',
              padding: '2rem',
              backgroundColor: 'var(--bg-card)',
              boxShadow: 'var(--shadow-xl)',
            }}
          >
            <div style={{ textAlign: 'center', marginBottom: '1.25rem' }}>
              <div
                style={{
                  width: '56px',
                  height: '56px',
                  borderRadius: '50%',
                  backgroundColor: 'rgba(239, 68, 68, 0.1)',
                  color: 'var(--status-danger, #EF4444)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  margin: '0 auto 1rem',
                }}
              >
                <XCircle size={30} />
              </div>

              <h3 style={{ fontSize: '1.25rem', fontWeight: 800, marginBottom: '0.35rem' }}>
                Reject Organizer Application
              </h3>

              <p style={{ color: 'var(--text-secondary)', fontSize: '0.88rem', margin: 0 }}>
                Rejecting application for <strong>{rejectModalOrg.name}</strong>. The applicant will remain a standard customer and can see your reason to make corrections.
              </p>
            </div>

            {rejectError && (
              <div
                style={{
                  padding: '0.65rem 0.85rem',
                  backgroundColor: 'rgba(239, 68, 68, 0.08)',
                  border: '1px solid rgba(239, 68, 68, 0.25)',
                  borderRadius: 'var(--radius-sm)',
                  color: 'var(--status-danger)',
                  fontSize: '0.85rem',
                  marginBottom: '1rem',
                }}
              >
                {rejectError}
              </div>
            )}

            <div style={{ marginBottom: '1.5rem' }}>
              <label
                htmlFor="reject-reason"
                style={{ display: 'block', fontSize: '0.85rem', fontWeight: 700, color: 'var(--text-primary)', marginBottom: '0.35rem' }}
              >
                Rejection Reason (Required) <span style={{ color: 'var(--status-danger)' }}>*</span>
              </label>
              <textarea
                id="reject-reason"
                rows={3}
                placeholder="State clearly why this application is not approved (e.g. Invalid GSTIN, unverified business website, missing promoter credentials)..."
                value={rejectReasonInput}
                onChange={(e) => {
                  setRejectReasonInput(e.target.value);
                  if (rejectError) setRejectError(null);
                }}
                style={{
                  width: '100%',
                  padding: '0.65rem 0.75rem',
                  borderRadius: 'var(--radius-md)',
                  border: rejectError ? '1px solid var(--status-danger)' : '1px solid var(--border-medium)',
                  backgroundColor: 'var(--bg-elevated)',
                  color: 'var(--text-primary)',
                  fontSize: '0.9rem',
                  fontFamily: 'inherit',
                  boxSizing: 'border-box',
                  resize: 'vertical',
                }}
              />
            </div>

            <div style={{ display: 'flex', gap: '0.75rem' }}>
              <Button
                variant="secondary"
                onClick={() => {
                  setRejectModalOrg(null);
                  setRejectReasonInput('');
                  setRejectError(null);
                }}
                style={{ flex: 1 }}
                disabled={processingOrgId === rejectModalOrg.id}
              >
                Cancel
              </Button>
              <Button
                variant="primary"
                isLoading={processingOrgId === rejectModalOrg.id}
                onClick={handleConfirmReject}
                style={{ flex: 1, backgroundColor: 'var(--status-danger)', borderColor: 'var(--status-danger)', color: '#FFFFFF', fontWeight: 700 }}
              >
                Confirm Rejection
              </Button>
            </div>
          </Card>
        </div>
      )}
    </div>
  );
};
