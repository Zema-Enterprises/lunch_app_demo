import React, { useEffect, lazy, Suspense } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { useAuthStore } from './store/authStore';
import Layout from './components/layout/Layout';
import { ToastContainer } from './components/ui/toast';
import { ErrorBoundary } from './components/error/ErrorBoundary';

// Lazy load pages for better performance
const Login = lazy(() => import('./pages/Login'));
const Register = lazy(() => import('./pages/Register'));
const Dashboard = lazy(() => import('./pages/Dashboard'));
const Events = lazy(() => import('./pages/Events'));
const EventDetail = lazy(() => import('./pages/EventDetail'));
const Restaurants = lazy(() => import('./pages/Restaurants'));
const RestaurantDetails = lazy(() => import('./pages/RestaurantDetails'));
const MenuManagement = lazy(() => import('./pages/MenuManagement'));
const Orders = lazy(() => import('./pages/Orders'));
const SettingsLayout = lazy(() => import('./pages/SettingsLayout'));
const UserProfile = lazy(() => import('./pages/UserProfile'));
const CompanySettings = lazy(() => import('./pages/CompanySettings'));

// Notification components
const NotificationList = lazy(() => import('./components/notifications/NotificationList'));
const NotificationSettings = lazy(() => import('./components/notifications/NotificationSettings'));

// Loading fallback component
const PageLoader = () => (
  <div className="flex h-screen items-center justify-center">
    <div className="animate-spin h-8 w-8 border-4 border-slate-200 border-t-slate-900 rounded-full" role="status">
      <span className="sr-only">Loading...</span>
    </div>
  </div>
);

const ProtectedRoute: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => {
  const { isAuthenticated, isLoading, hasHydrated } = useAuthStore();

  if (!hasHydrated) {
    return <div className="flex h-screen items-center justify-center">Loading...</div>;
  }

  if (isLoading) {
    return <div className="flex h-screen items-center justify-center">Loading...</div>;
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  return <>{children}</>;
};

function App() {
  const { loadUser } = useAuthStore();

  useEffect(() => {
    loadUser();
  }, [loadUser]);

  return (
    <ErrorBoundary>
      <BrowserRouter>
        <ToastContainer />
        <Suspense fallback={<PageLoader />}>
          <Routes>
            <Route path="/login" element={<Login />} />
            <Route path="/register" element={<Register />} />
            
            <Route
              path="/"
              element={
                <ProtectedRoute>
                  <Layout />
                </ProtectedRoute>
              }
            >
              <Route index element={<Navigate to="/dashboard" replace />} />
              <Route path="dashboard" element={<Dashboard />} />
              <Route path="events" element={<Events />} />
              <Route path="events/:id" element={<EventDetail />} />
              <Route path="restaurants" element={<Restaurants />} />
              <Route path="restaurants/:id" element={<RestaurantDetails />} />
              <Route path="restaurants/:id/menu" element={<MenuManagement />} />
              <Route path="orders" element={<Orders />} />
              <Route path="notifications" element={<NotificationList />} />
              <Route path="settings" element={<SettingsLayout />}>
                <Route index element={<Navigate to="/settings/profile" replace />} />
                <Route path="profile" element={<UserProfile />} />
                <Route path="company" element={<CompanySettings />} />
                <Route path="notifications" element={<NotificationSettings />} />
              </Route>
            </Route>
          </Routes>
        </Suspense>
      </BrowserRouter>
    </ErrorBoundary>
  );
}

export default App;
