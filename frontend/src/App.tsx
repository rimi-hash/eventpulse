import React from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import { AppLayout } from './components/layout/AppLayout';
import { ExploreEventsPage } from './pages/ExploreEventsPage';
import { EventDetailPage } from './pages/EventDetailPage';
import { CheckoutPage } from './pages/CheckoutPage';
import { OrderConfirmationPage } from './pages/OrderConfirmationPage';
import { MyTicketsPage } from './pages/MyTicketsPage';
import { MyOrdersPage } from './pages/MyOrdersPage';
import { GateScannerPage } from './pages/GateScannerPage';
import { OrganizerDashboardPage } from './pages/OrganizerDashboardPage';
import { AdminDashboardPage } from './pages/AdminDashboardPage';
import { SystemTelemetryPage } from './pages/SystemTelemetryPage';
import { ResaleMarketplacePage } from './pages/ResaleMarketplacePage';
import { OrganizerApplyPage } from './pages/OrganizerApplyPage';
import { VenueStudioPage } from './pages/VenueStudioPage';
import { LoginPage } from './pages/LoginPage';
import { NotFoundPage } from './pages/NotFoundPage';
import { ProtectedRoute } from './components/auth/ProtectedRoute';
import { ScrollToTop } from './components/common/ScrollToTop';

export const App: React.FC = () => {
  return (
    <BrowserRouter>
      <ScrollToTop />
      <AuthProvider>
        <Routes>
          <Route path="/" element={<AppLayout />}>
            <Route index element={<ExploreEventsPage />} />
            <Route path="events" element={<ExploreEventsPage />} />
            <Route path="events/:idOrSlug" element={<EventDetailPage />} />
            <Route path="login" element={<LoginPage />} />
            <Route path="organizer/apply" element={<OrganizerApplyPage />} />
            <Route path="organize" element={<OrganizerApplyPage />} />
            <Route path="resale" element={<ResaleMarketplacePage />} />
            <Route
              path="checkout/:orderId"
              element={
                <ProtectedRoute allowedRoles={['CUSTOMER', 'ORGANIZER', 'GATE_STAFF', 'PLATFORM_ADMIN']}>
                  <CheckoutPage />
                </ProtectedRoute>
              }
            />
            <Route path="orders/:orderId/confirmation" element={<OrderConfirmationPage />} />

            {/* Customer & Ticket Owner Routes */}
            <Route
              path="my-tickets"
              element={
                <ProtectedRoute allowedRoles={['CUSTOMER', 'ORGANIZER', 'GATE_STAFF', 'PLATFORM_ADMIN']}>
                  <MyTicketsPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="my-orders"
              element={
                <ProtectedRoute allowedRoles={['CUSTOMER', 'ORGANIZER', 'GATE_STAFF', 'PLATFORM_ADMIN']}>
                  <MyOrdersPage />
                </ProtectedRoute>
              }
            />

            {/* Operations & Staff Workspaces */}
            <Route
              path="scanner"
              element={
                <ProtectedRoute allowedRoles={['GATE_STAFF', 'ORGANIZER', 'PLATFORM_ADMIN']}>
                  <GateScannerPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="organizer"
              element={
                <ProtectedRoute allowedRoles={['ORGANIZER', 'PLATFORM_ADMIN']}>
                  <OrganizerDashboardPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="venue-studio"
              element={
                <ProtectedRoute allowedRoles={['ORGANIZER', 'PLATFORM_ADMIN']}>
                  <VenueStudioPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="admin"
              element={
                <ProtectedRoute allowedRoles={['PLATFORM_ADMIN']}>
                  <AdminDashboardPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="telemetry"
              element={
                <ProtectedRoute allowedRoles={['PLATFORM_ADMIN']}>
                  <SystemTelemetryPage />
                </ProtectedRoute>
              }
            />
            <Route path="*" element={<NotFoundPage />} />
          </Route>
        </Routes>
      </AuthProvider>
    </BrowserRouter>
  );
};

export default App;

