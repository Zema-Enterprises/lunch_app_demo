import { describe, it, expect, vi, beforeEach } from 'vitest';
import { screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import '@testing-library/jest-dom';
import { render } from '../../utils/test-utils';
import Login from '@/pages/Login';
import { server } from '../../mocks/server';
import { http, HttpResponse } from 'msw';

const API_URL = 'http://localhost:5000/api';

// Mock react-router-dom navigation
const mockNavigate = vi.fn();
vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom');
  return {
    ...actual,
    useNavigate: () => mockNavigate,
  };
});

describe('Login Component', () => {
  beforeEach(() => {
    mockNavigate.mockClear();
    localStorage.clear();
  });

  describe('Rendering & Structure', () => {
    it('should render login form with all required elements', () => {
      render(<Login />);

      // Heading and description
      expect(screen.getByRole('heading', { name: /welcome to lunchsync/i })).toBeInTheDocument();
      expect(screen.getByText(/sign in to your account/i)).toBeInTheDocument();

      // Form elements with proper labels
      expect(screen.getByLabelText(/email/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/password/i)).toBeInTheDocument();

      // Submit button
      expect(screen.getByRole('button', { name: /sign in/i })).toBeInTheDocument();

      // Link to register
      expect(screen.getByRole('link', { name: /register/i })).toBeInTheDocument();
    });

    it('should have proper form accessibility attributes', () => {
      render(<Login />);

      const form = screen.getByRole('form', { name: /login form/i });
      expect(form).toBeInTheDocument();

      const emailInput = screen.getByLabelText(/email/i);
      expect(emailInput).toHaveAttribute('type', 'text'); // Changed to 'text' to allow Zod validation
      expect(emailInput).toHaveAttribute('autocomplete', 'email');
      expect(emailInput).toHaveAttribute('aria-required', 'true');

      const passwordInput = screen.getByLabelText(/password/i);
      expect(passwordInput).toHaveAttribute('type', 'password');
      expect(passwordInput).toHaveAttribute('autocomplete', 'current-password');
      expect(passwordInput).toHaveAttribute('aria-required', 'true');
    });

    it('should have register link pointing to /register', () => {
      render(<Login />);

      const registerLink = screen.getByRole('link', { name: /register/i });
      expect(registerLink).toHaveAttribute('href', '/register');
    });

    it('should not show error message initially', () => {
      render(<Login />);

      expect(screen.queryByRole('alert')).not.toBeInTheDocument();
    });

    it('should not disable submit button initially', () => {
      render(<Login />);

      const submitButton = screen.getByRole('button', { name: /sign in/i });
      expect(submitButton).not.toBeDisabled();
    });
  });

  describe('Form Validation', () => {
    it('should validate empty email field', async () => {
      const user = userEvent.setup();
      render(<Login />);

      const submitButton = screen.getByRole('button', { name: /sign in/i });
      await user.click(submitButton);

      // Should show validation error for email
      await waitFor(() => {
        expect(screen.getByText(/invalid email address/i)).toBeInTheDocument();
      });
    });

    it('should validate invalid email format', async () => {
      const user = userEvent.setup();
      render(<Login />);

      const emailInput = screen.getByLabelText(/email/i);
      const passwordInput = screen.getByLabelText(/password/i);
      const submitButton = screen.getByRole('button', { name: /sign in/i });

      // Type clearly invalid email (no @ symbol)
      await user.type(emailInput, 'notanemail');
      await user.type(passwordInput, 'password123'); // Add password to pass password validation
      await user.click(submitButton);

      await waitFor(() => {
        expect(screen.getByText(/invalid email address/i)).toBeInTheDocument();
      });
    });

    it('should validate empty password field', async () => {
      const user = userEvent.setup();
      render(<Login />);

      const emailInput = screen.getByLabelText(/email/i);
      const submitButton = screen.getByRole('button', { name: /sign in/i });

      await user.type(emailInput, 'test@example.com');
      await user.click(submitButton);

      await waitFor(() => {
        expect(screen.getByText(/password must be at least 6 characters/i)).toBeInTheDocument();
      });
    });

    it('should validate password minimum length', async () => {
      const user = userEvent.setup();
      render(<Login />);

      const emailInput = screen.getByLabelText(/email/i);
      const passwordInput = screen.getByLabelText(/password/i);
      const submitButton = screen.getByRole('button', { name: /sign in/i });

      await user.type(emailInput, 'test@example.com');
      await user.type(passwordInput, '12345'); // Only 5 characters
      await user.click(submitButton);

      await waitFor(() => {
        expect(screen.getByText(/password must be at least 6 characters/i)).toBeInTheDocument();
      });
    });

    it('should mark invalid fields with aria-invalid', async () => {
      const user = userEvent.setup();
      render(<Login />);

      const submitButton = screen.getByRole('button', { name: /sign in/i });
      await user.click(submitButton);

      await waitFor(() => {
        const emailInput = screen.getByLabelText(/email/i);
        const passwordInput = screen.getByLabelText(/password/i);
        
        expect(emailInput).toHaveAttribute('aria-invalid', 'true');
        expect(passwordInput).toHaveAttribute('aria-invalid', 'true');
      });
    });

    it('should link error messages to fields with aria-describedby', async () => {
      const user = userEvent.setup();
      render(<Login />);

      const submitButton = screen.getByRole('button', { name: /sign in/i });
      await user.click(submitButton);

      await waitFor(() => {
        const emailInput = screen.getByLabelText(/email/i);
        const emailError = screen.getByText(/invalid email address/i);
        
        expect(emailInput).toHaveAttribute('aria-describedby');
        expect(emailError).toHaveAttribute('id');
        expect(emailInput.getAttribute('aria-describedby')).toBe(emailError.id);
      });
    });
  });

  describe('Successful Login Flow', () => {
    it('should submit login form with valid credentials', async () => {
      const user = userEvent.setup();
      
      // Mock successful login response
      server.use(
        http.post(`${API_URL}/auth/login`, async ({ request }) => {
          const body = await request.json();
          expect(body).toEqual({
            email: 'test@example.com',
            password: 'Password123!',
          });
          
          return HttpResponse.json({
            data: {
              token: 'mock-jwt-token',
              user: {
                id: 'user-1',
                email: 'test@example.com',
                name: 'Test User',
                role: 'USER',
                companyId: 'company-1',
              },
            },
          });
        })
      );

      render(<Login />);

      const emailInput = screen.getByLabelText(/email/i);
      const passwordInput = screen.getByLabelText(/password/i);
      const submitButton = screen.getByRole('button', { name: /sign in/i });

      await user.type(emailInput, 'test@example.com');
      await user.type(passwordInput, 'Password123!');
      await user.click(submitButton);

      // Should navigate to dashboard after successful login
      await waitFor(() => {
        expect(mockNavigate).toHaveBeenCalledWith('/dashboard');
      });

      // Should store token in localStorage
      expect(localStorage.getItem('token')).toBe('mock-jwt-token');
    });

    it('should show loading state during login', async () => {
      const user = userEvent.setup();
      
      // Mock delayed response
      server.use(
        http.post(`${API_URL}/auth/login`, async () => {
          await new Promise((resolve) => setTimeout(resolve, 100));
          return HttpResponse.json({
            data: {
              token: 'mock-jwt-token',
              user: {
                id: 'user-1',
                email: 'test@example.com',
                name: 'Test User',
                role: 'USER',
                companyId: 'company-1',
              },
            },
          });
        })
      );

      render(<Login />);

      const emailInput = screen.getByLabelText(/email/i);
      const passwordInput = screen.getByLabelText(/password/i);
      const submitButton = screen.getByRole('button', { name: /sign in/i });

      await user.type(emailInput, 'test@example.com');
      await user.type(passwordInput, 'Password123!');
      await user.click(submitButton);

      // Should show loading state
      expect(screen.getByRole('button', { name: /signing in/i })).toBeDisabled();
      expect(screen.getByRole('button', { name: /signing in/i })).toHaveAttribute('aria-busy', 'true');

      // Wait for login to complete
      await waitFor(() => {
        expect(mockNavigate).toHaveBeenCalledWith('/dashboard');
      });
    });

    it('should disable submit button during loading', async () => {
      const user = userEvent.setup();
      
      server.use(
        http.post(`${API_URL}/auth/login`, async () => {
          await new Promise((resolve) => setTimeout(resolve, 100));
          return HttpResponse.json({
            data: {
              token: 'mock-jwt-token',
              user: {
                id: 'user-1',
                email: 'test@example.com',
                name: 'Test User',
                role: 'USER',
                companyId: 'company-1',
              },
            },
          });
        })
      );

      render(<Login />);

      const emailInput = screen.getByLabelText(/email/i);
      const passwordInput = screen.getByLabelText(/password/i);
      const submitButton = screen.getByRole('button', { name: /sign in/i });

      await user.type(emailInput, 'test@example.com');
      await user.type(passwordInput, 'Password123!');
      
      expect(submitButton).not.toBeDisabled();
      
      await user.click(submitButton);

      // Button should be disabled during loading
      expect(submitButton).toBeDisabled();

      await waitFor(() => {
        expect(mockNavigate).toHaveBeenCalledWith('/dashboard');
      });
    });
  });

  describe('Error Handling', () => {
    it('should display error message for invalid credentials', async () => {
      const user = userEvent.setup();
      
      server.use(
        http.post(`${API_URL}/auth/login`, () => {
          return HttpResponse.json(
            { message: 'Invalid email or password' },
            { status: 401 }
          );
        })
      );

      render(<Login />);

      const emailInput = screen.getByLabelText(/email/i);
      const passwordInput = screen.getByLabelText(/password/i);
      const submitButton = screen.getByRole('button', { name: /sign in/i });

      await user.type(emailInput, 'test@example.com');
      await user.type(passwordInput, 'WrongPassword');
      await user.click(submitButton);

      // Should display error message
      await waitFor(() => {
        const errorAlert = screen.getByRole('alert');
        expect(errorAlert).toBeInTheDocument();
        expect(errorAlert).toHaveTextContent(/invalid email or password/i);
      });

      // Should not navigate
      expect(mockNavigate).not.toHaveBeenCalled();

      // Should not store token
      expect(localStorage.getItem('token')).toBeNull();
    });

    it('should display generic error for network failures', async () => {
      const user = userEvent.setup();
      
      server.use(
        http.post(`${API_URL}/auth/login`, () => {
          return HttpResponse.error();
        })
      );

      render(<Login />);

      const emailInput = screen.getByLabelText(/email/i);
      const passwordInput = screen.getByLabelText(/password/i);
      const submitButton = screen.getByRole('button', { name: /sign in/i });

      await user.type(emailInput, 'test@example.com');
      await user.type(passwordInput, 'Password123!');
      await user.click(submitButton);

      await waitFor(() => {
        const errorAlert = screen.getByRole('alert');
        expect(errorAlert).toBeInTheDocument();
        expect(errorAlert).toHaveTextContent(/login failed/i);
      });
    });

    it('should display error for server errors', async () => {
      const user = userEvent.setup();
      
      server.use(
        http.post(`${API_URL}/auth/login`, () => {
          return HttpResponse.json(
            { message: 'Internal server error' },
            { status: 500 }
          );
        })
      );

      render(<Login />);

      const emailInput = screen.getByLabelText(/email/i);
      const passwordInput = screen.getByLabelText(/password/i);
      const submitButton = screen.getByRole('button', { name: /sign in/i });

      await user.type(emailInput, 'test@example.com');
      await user.type(passwordInput, 'Password123!');
      await user.click(submitButton);

      await waitFor(() => {
        const errorAlert = screen.getByRole('alert');
        expect(errorAlert).toBeInTheDocument();
        expect(errorAlert).toHaveTextContent(/internal server error/i);
      });
    });

    it('should make error message accessible with role="alert" and aria-live', async () => {
      const user = userEvent.setup();
      
      server.use(
        http.post(`${API_URL}/auth/login`, () => {
          return HttpResponse.json(
            { message: 'Invalid credentials' },
            { status: 401 }
          );
        })
      );

      render(<Login />);

      const emailInput = screen.getByLabelText(/email/i);
      const passwordInput = screen.getByLabelText(/password/i);
      const submitButton = screen.getByRole('button', { name: /sign in/i });

      await user.type(emailInput, 'test@example.com');
      await user.type(passwordInput, 'WrongPassword');
      await user.click(submitButton);

      await waitFor(() => {
        const errorAlert = screen.getByRole('alert');
        expect(errorAlert).toHaveAttribute('aria-live', 'polite');
      });
    });

    it('should clear previous errors when submitting again', async () => {
      const user = userEvent.setup();
      
      // First attempt: error
      server.use(
        http.post(`${API_URL}/auth/login`, () => {
          return HttpResponse.json(
            { message: 'Invalid credentials' },
            { status: 401 }
          );
        })
      );

      render(<Login />);

      const emailInput = screen.getByLabelText(/email/i);
      const passwordInput = screen.getByLabelText(/password/i);
      const submitButton = screen.getByRole('button', { name: /sign in/i });

      await user.type(emailInput, 'test@example.com');
      await user.type(passwordInput, 'WrongPassword');
      await user.click(submitButton);

      await waitFor(() => {
        expect(screen.getByRole('alert')).toHaveTextContent(/invalid credentials/i);
      });

      // Second attempt: success
      server.use(
        http.post(`${API_URL}/auth/login`, () => {
          return HttpResponse.json({
            data: {
              token: 'mock-jwt-token',
              user: {
                id: 'user-1',
                email: 'test@example.com',
                name: 'Test User',
                role: 'USER',
                companyId: 'company-1',
              },
            },
          });
        })
      );

      await user.clear(passwordInput);
      await user.type(passwordInput, 'CorrectPassword123!');
      await user.click(submitButton);

      // Error should be cleared and navigation should occur
      await waitFor(() => {
        expect(mockNavigate).toHaveBeenCalledWith('/dashboard');
      });
    });
  });

  describe('User Experience', () => {
    it('should have proper input placeholders', () => {
      render(<Login />);

      const emailInput = screen.getByLabelText(/email/i);
      const passwordInput = screen.getByLabelText(/password/i);

      expect(emailInput).toHaveAttribute('placeholder', 'you@company.com');
      expect(passwordInput).toHaveAttribute('placeholder', '••••••••');
    });

    it('should allow typing in email field', async () => {
      const user = userEvent.setup();
      render(<Login />);

      const emailInput = screen.getByLabelText(/email/i) as HTMLInputElement;
      await user.type(emailInput, 'test@example.com');

      expect(emailInput.value).toBe('test@example.com');
    });

    it('should allow typing in password field', async () => {
      const user = userEvent.setup();
      render(<Login />);

      const passwordInput = screen.getByLabelText(/password/i) as HTMLInputElement;
      await user.type(passwordInput, 'MyPassword123');

      expect(passwordInput.value).toBe('MyPassword123');
    });

    it('should mask password input', () => {
      render(<Login />);

      const passwordInput = screen.getByLabelText(/password/i);
      expect(passwordInput).toHaveAttribute('type', 'password');
    });

    it('should support form submission with Enter key', async () => {
      const user = userEvent.setup();
      
      server.use(
        http.post(`${API_URL}/auth/login`, () => {
          return HttpResponse.json({
            data: {
              token: 'mock-jwt-token',
              user: {
                id: 'user-1',
                email: 'test@example.com',
                name: 'Test User',
                role: 'USER',
                companyId: 'company-1',
              },
            },
          });
        })
      );

      render(<Login />);

      const emailInput = screen.getByLabelText(/email/i);
      const passwordInput = screen.getByLabelText(/password/i);

      await user.type(emailInput, 'test@example.com');
      await user.type(passwordInput, 'Password123!{Enter}');

      // Should navigate after Enter key submission
      await waitFor(() => {
        expect(mockNavigate).toHaveBeenCalledWith('/dashboard');
      });
    });
  });

  describe('Accessibility', () => {
    it('should have semantic HTML structure', () => {
      render(<Login />);

      // Should have a form element
      expect(screen.getByRole('form', { name: /login form/i })).toBeInTheDocument();

      // Should have heading
      expect(screen.getByRole('heading', { name: /welcome to lunchsync/i })).toBeInTheDocument();

      // Should have labeled inputs
      expect(screen.getByLabelText(/email/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/password/i)).toBeInTheDocument();

      // Should have button
      expect(screen.getByRole('button', { name: /sign in/i })).toBeInTheDocument();
    });

    it('should have proper label associations', () => {
      render(<Login />);

      const emailInput = screen.getByLabelText(/email/i);
      const passwordInput = screen.getByLabelText(/password/i);

      expect(emailInput).toHaveAttribute('id');
      expect(passwordInput).toHaveAttribute('id');

      const emailLabel = document.querySelector(`label[for="${emailInput.id}"]`);
      const passwordLabel = document.querySelector(`label[for="${passwordInput.id}"]`);

      expect(emailLabel).toBeInTheDocument();
      expect(passwordLabel).toBeInTheDocument();
    });

    it('should have proper button type', () => {
      render(<Login />);

      const submitButton = screen.getByRole('button', { name: /sign in/i });
      expect(submitButton).toHaveAttribute('type', 'submit');
    });
  });
});
