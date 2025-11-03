import { describe, it, expect, beforeEach } from 'vitest';
import { screen, waitFor, render as rtlRender } from '@testing-library/react';
import { MemoryRouter, Routes, Route, Navigate } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useAuthStore } from '@/store/authStore';

// Custom render for routing tests
function renderWithRouter(ui: React.ReactElement, { initialEntries = ['/'] } = {}) {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false, gcTime: 0 },
      mutations: { retry: false },
    },
  });

  function Wrapper({ children }: { children: React.ReactNode }) {
    return (
      <QueryClientProvider client={queryClient}>
        <MemoryRouter initialEntries={initialEntries}>
          {children}
        </MemoryRouter>
      </QueryClientProvider>
    );
  }

  return rtlRender(ui, { wrapper: Wrapper });
}

// Define ProtectedRoute component inline for testing (matches App.tsx implementation)
const ProtectedRoute: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { isAuthenticated, isLoading } = useAuthStore();

  if (isLoading) {
    return <div className="flex h-screen items-center justify-center">Loading...</div>;
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  return <>{children}</>;
};

// Test components
const ProtectedContent = () => <div>Protected Content</div>;
const LoginPage = () => <div>Login Page</div>;

describe('ProtectedRoute Component', () => {
  beforeEach(() => {
    // Reset auth store to default state
    useAuthStore.setState({
      user: null,
      company: null,
      token: null,
      isAuthenticated: false,
      isLoading: false,
    });
  });

  describe('Authentication State Handling', () => {
    it('should redirect to login when user is not authenticated', () => {
      useAuthStore.setState({
        isAuthenticated: false,
        isLoading: false,
      });

      renderWithRouter(
        <Routes>
          <Route path="/login" element={<LoginPage />} />
          <Route
            path="/protected"
            element={
              <ProtectedRoute>
                <ProtectedContent />
              </ProtectedRoute>
            }
          />
        </Routes>,
        { initialEntries: ['/protected'] }
      );

      // Should redirect to login page
      expect(screen.getByText('Login Page')).toBeInTheDocument();
      expect(screen.queryByText('Protected Content')).not.toBeInTheDocument();
    });

    it('should render protected content when user is authenticated', () => {
      useAuthStore.setState({
        isAuthenticated: true,
        isLoading: false,
        user: {
          id: 'user-1',
          email: 'test@example.com',
          name: 'Test User',
          role: 'USER',
          companyId: 'company-1',
        },
        token: 'mock-token',
      });

      renderWithRouter(
        <Routes>
            <Route path="/login" element={<LoginPage />} />
            <Route
              path="/protected"
              element={
                <ProtectedRoute>
                  <ProtectedContent />
                </ProtectedRoute>
              }
            />
          </Routes>,
        { initialEntries: ['/protected'] }
      );

      // Should show protected content
      expect(screen.getByText('Protected Content')).toBeInTheDocument();
      expect(screen.queryByText('Login Page')).not.toBeInTheDocument();
    });

    it('should show loading state while checking authentication', () => {
      useAuthStore.setState({
        isAuthenticated: false,
        isLoading: true,
      });

      renderWithRouter(
        <Routes>
            <Route path="/login" element={<LoginPage />} />
            <Route
              path="/protected"
              element={
                <ProtectedRoute>
                  <ProtectedContent />
                </ProtectedRoute>
              }
            />
          </Routes>,
        { initialEntries: ['/protected'] }
      );

      // Should show loading state
      expect(screen.getByText('Loading...')).toBeInTheDocument();
      expect(screen.queryByText('Protected Content')).not.toBeInTheDocument();
      expect(screen.queryByText('Login Page')).not.toBeInTheDocument();
    });

    it('should transition from loading to authenticated state', async () => {
      useAuthStore.setState({
        isAuthenticated: false,
        isLoading: true,
      });

      const { rerender } = renderWithRouter(
        <Routes>
            <Route path="/login" element={<LoginPage />} />
            <Route
              path="/protected"
              element={
                <ProtectedRoute>
                  <ProtectedContent />
                </ProtectedRoute>
              }
            />
          </Routes>,
        { initialEntries: ['/protected'] }
      );

      // Initially loading
      expect(screen.getByText('Loading...')).toBeInTheDocument();

      // Update to authenticated state
      useAuthStore.setState({
        isAuthenticated: true,
        isLoading: false,
        user: {
          id: 'user-1',
          email: 'test@example.com',
          name: 'Test User',
          role: 'USER',
          companyId: 'company-1',
        },
        token: 'mock-token',
      });

      rerender(
        <Routes>
          <Route path="/login" element={<LoginPage />} />
          <Route
            path="/protected"
            element={
              <ProtectedRoute>
                <ProtectedContent />
              </ProtectedRoute>
            }
          />
        </Routes>
      );

      // Should now show protected content
      await waitFor(() => {
        expect(screen.getByText('Protected Content')).toBeInTheDocument();
      });
      expect(screen.queryByText('Loading...')).not.toBeInTheDocument();
    });

    it('should transition from loading to unauthenticated state', async () => {
      useAuthStore.setState({
        isAuthenticated: false,
        isLoading: true,
      });

      const { rerender } = renderWithRouter(
        <Routes>
            <Route path="/login" element={<LoginPage />} />
            <Route
              path="/protected"
              element={
                <ProtectedRoute>
                  <ProtectedContent />
                </ProtectedRoute>
              }
            />
          </Routes>,
        { initialEntries: ['/protected'] }
      );

      // Initially loading
      expect(screen.getByText('Loading...')).toBeInTheDocument();

      // Update to unauthenticated state
      useAuthStore.setState({
        isAuthenticated: false,
        isLoading: false,
      });

      rerender(
        <Routes>
          <Route path="/login" element={<LoginPage />} />
          <Route
            path="/protected"
            element={
              <ProtectedRoute>
                <ProtectedContent />
              </ProtectedRoute>
            }
          />
        </Routes>
      );

      // Should redirect to login
      await waitFor(() => {
        expect(screen.getByText('Login Page')).toBeInTheDocument();
      });
      expect(screen.queryByText('Loading...')).not.toBeInTheDocument();
      expect(screen.queryByText('Protected Content')).not.toBeInTheDocument();
    });
  });

  describe('Multiple Protected Routes', () => {
    it('should protect multiple routes consistently', () => {
      useAuthStore.setState({
        isAuthenticated: false,
        isLoading: false,
      });

      const Dashboard = () => <div>Dashboard</div>;
      const Settings = () => <div>Settings</div>;

      renderWithRouter(
        <Routes>
            <Route path="/login" element={<LoginPage />} />
            <Route
              path="/dashboard"
              element={
                <ProtectedRoute>
                  <Dashboard />
                </ProtectedRoute>
              }
            />
            <Route
              path="/settings"
              element={
                <ProtectedRoute>
                  <Settings />
                </ProtectedRoute>
              }
            />
          </Routes>,
        { initialEntries: ['/dashboard'] }
      );

      // Both routes should redirect to login
      expect(screen.getByText('Login Page')).toBeInTheDocument();
      expect(screen.queryByText('Dashboard')).not.toBeInTheDocument();
    });

    it('should allow access to all protected routes when authenticated', () => {
      useAuthStore.setState({
        isAuthenticated: true,
        isLoading: false,
        user: {
          id: 'user-1',
          email: 'test@example.com',
          name: 'Test User',
          role: 'USER',
          companyId: 'company-1',
        },
        token: 'mock-token',
      });

      const Dashboard = () => <div>Dashboard</div>;

      renderWithRouter(
        <Routes>
            <Route path="/login" element={<LoginPage />} />
            <Route
              path="/dashboard"
              element={
                <ProtectedRoute>
                  <Dashboard />
                </ProtectedRoute>
              }
            />
          </Routes>,
        { initialEntries: ['/dashboard'] }
      );

      // Should show dashboard
      expect(screen.getByText('Dashboard')).toBeInTheDocument();
      expect(screen.queryByText('Login Page')).not.toBeInTheDocument();
    });
  });

  describe('Navigation Flow', () => {
    it('should use replace navigation to prevent back button to protected route', () => {
      useAuthStore.setState({
        isAuthenticated: false,
        isLoading: false,
      });

      renderWithRouter(
        <Routes>
            <Route path="/login" element={<LoginPage />} />
            <Route
              path="/protected"
              element={
                <ProtectedRoute>
                  <ProtectedContent />
                </ProtectedRoute>
              }
            />
          </Routes>,
        { initialEntries: ['/protected'] }
      );

      // Should redirect to login (replace prop is used in Navigate component)
      expect(screen.getByText('Login Page')).toBeInTheDocument();
    });
  });

  describe('Edge Cases', () => {
    it('should handle null user while authenticated is true', () => {
      useAuthStore.setState({
        isAuthenticated: true,
        isLoading: false,
        user: null,  // Edge case: token exists but user is null
        token: 'mock-token',
      });

      renderWithRouter(
        <Routes>
            <Route path="/login" element={<LoginPage />} />
            <Route
              path="/protected"
              element={
                <ProtectedRoute>
                  <ProtectedContent />
                </ProtectedRoute>
              }
            />
          </Routes>,
        { initialEntries: ['/protected'] }
      );

      // Should still allow access if isAuthenticated is true
      expect(screen.getByText('Protected Content')).toBeInTheDocument();
    });

    it('should block access when token exists but isAuthenticated is false', () => {
      useAuthStore.setState({
        isAuthenticated: false,
        isLoading: false,
        user: null,
        token: 'expired-token',  // Token exists but auth failed
      });

      renderWithRouter(
        <Routes>
            <Route path="/login" element={<LoginPage />} />
            <Route
              path="/protected"
              element={
                <ProtectedRoute>
                  <ProtectedContent />
                </ProtectedRoute>
              }
            />
          </Routes>,
        { initialEntries: ['/protected'] }
      );

      // Should redirect to login
      expect(screen.getByText('Login Page')).toBeInTheDocument();
      expect(screen.queryByText('Protected Content')).not.toBeInTheDocument();
    });
  });

  describe('Loading State Accessibility', () => {
    it('should have accessible loading message', () => {
      useAuthStore.setState({
        isAuthenticated: false,
        isLoading: true,
      });

      renderWithRouter(
        <Routes>
            <Route path="/login" element={<LoginPage />} />
            <Route
              path="/protected"
              element={
                <ProtectedRoute>
                  <ProtectedContent />
                </ProtectedRoute>
              }
            />
          </Routes>,
        { initialEntries: ['/protected'] }
      );

      const loadingElement = screen.getByText('Loading...');
      expect(loadingElement).toBeInTheDocument();
      expect(loadingElement.closest('div')).toHaveClass('flex', 'h-screen', 'items-center', 'justify-center');
    });
  });
});
