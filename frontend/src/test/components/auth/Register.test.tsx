import { describe, it, expect, vi, beforeEach } from 'vitest';
import { screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { render } from '../../utils/test-utils';
import Register from '@/pages/Register';
import { server } from '../../mocks/server';
import { http, HttpResponse } from 'msw';
import { useAuthStore } from '@/store/authStore';

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

describe('Register Component', () => {
  beforeEach(() => {
    mockNavigate.mockClear();
    useAuthStore.setState({
      user: null,
      company: null,
      token: null,
      isAuthenticated: false,
      isLoading: false,
    });
  });

  describe('Rendering & Structure', () => {
    it('should render registration form with all required elements', () => {
      render(<Register />);

      // Heading and description
      expect(screen.getByRole('heading', { name: /create account/i })).toBeInTheDocument();
      expect(screen.getByText(/register your company/i)).toBeInTheDocument();

      // Personal information fields
      expect(screen.getByLabelText(/your name/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/^email$/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/^password$/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/confirm password/i)).toBeInTheDocument();

      // Company information section
      expect(screen.getByText(/company information/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/company name/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/company domain/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/company slug/i)).toBeInTheDocument();

      // Submit button
      expect(screen.getByRole('button', { name: /create account/i })).toBeInTheDocument();

      // Link to login
      expect(screen.getByRole('link', { name: /sign in/i })).toBeInTheDocument();
    });

    it('should have proper form accessibility attributes', () => {
      render(<Register />);

      // All inputs should have proper labels
      const nameInput = screen.getByLabelText(/your name/i);
      const emailInput = screen.getByLabelText(/^email$/i);
      const passwordInput = screen.getByLabelText(/^password$/i);
      const confirmPasswordInput = screen.getByLabelText(/confirm password/i);
      const companyNameInput = screen.getByLabelText(/company name/i);
      const companyDomainInput = screen.getByLabelText(/company domain/i);
      const companySlugInput = screen.getByLabelText(/company slug/i);

      // Check all inputs exist and have proper IDs for label association
      [nameInput, emailInput, passwordInput, confirmPasswordInput, companyNameInput, companyDomainInput, companySlugInput].forEach(input => {
        expect(input).toHaveAttribute('id');
        expect(input).toBeInTheDocument();
      });
    });

    it('should have login link pointing to /login', () => {
      render(<Register />);

      const loginLink = screen.getByRole('link', { name: /sign in/i });
      expect(loginLink).toHaveAttribute('href', '/login');
    });

    it('should not show error message initially', () => {
      render(<Register />);

      expect(screen.queryByRole('alert')).not.toBeInTheDocument();
    });

    it('should not disable submit button initially', () => {
      render(<Register />);

      const submitButton = screen.getByRole('button', { name: /create account/i });
      expect(submitButton).not.toBeDisabled();
    });

    it('should display helpful text for company slug field', () => {
      render(<Register />);

      expect(screen.getByText(/only lowercase letters, numbers, and hyphens/i)).toBeInTheDocument();
    });
  });

  describe('Form Validation', () => {
    it('should validate empty name field', async () => {
      const user = userEvent.setup();
      render(<Register />);

      const submitButton = screen.getByRole('button', { name: /create account/i });
      await user.click(submitButton);

      await waitFor(() => {
        // Query by ID to avoid ambiguity with "Company name is required"
        const nameError = document.getElementById('name-error');
        expect(nameError).toBeInTheDocument();
        expect(nameError).toHaveTextContent('Name is required');
      });
    });

    it('should validate empty email field', async () => {
      const user = userEvent.setup();
      render(<Register />);

      const nameInput = screen.getByLabelText(/your name/i);
      const submitButton = screen.getByRole('button', { name: /create account/i });

      await user.type(nameInput, 'John Doe');
      await user.click(submitButton);

      await waitFor(() => {
        expect(screen.getByText(/invalid email address/i)).toBeInTheDocument();
      });
    });

    it('should validate invalid email format', async () => {
      const user = userEvent.setup();

      const registerHandler = vi.fn(() =>
        HttpResponse.json({
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
        })
      );
      server.use(http.post(`${API_URL}/auth/register`, registerHandler));
      render(<Register />);

      const nameInput = screen.getByLabelText(/your name/i);
      const emailInput = screen.getByLabelText(/^email$/i);
      const submitButton = screen.getByRole('button', { name: /create account/i });

      await user.type(nameInput, 'John Doe');
      await user.type(emailInput, 'notanemail');
      await user.click(submitButton);

      expect(registerHandler).not.toHaveBeenCalled();
      expect(mockNavigate).not.toHaveBeenCalled();
      expect(useAuthStore.getState().token).toBeNull();
    });

    it('should validate empty password field', async () => {
      const user = userEvent.setup();
      render(<Register />);

      const nameInput = screen.getByLabelText(/your name/i);
      const emailInput = screen.getByLabelText(/^email$/i);
      const submitButton = screen.getByRole('button', { name: /create account/i });

      await user.type(nameInput, 'John Doe');
      await user.type(emailInput, 'john@example.com');
      await user.click(submitButton);

      await waitFor(() => {
        expect(
          screen.getByText(/password must be at least 8 characters and include uppercase, lowercase, number, and special character/i)
        ).toBeInTheDocument();
      });
    });

    it('should validate password minimum length', async () => {
      const user = userEvent.setup();
      render(<Register />);

      const nameInput = screen.getByLabelText(/your name/i);
      const emailInput = screen.getByLabelText(/^email$/i);
      const passwordInput = screen.getByLabelText(/^password$/i);
      const submitButton = screen.getByRole('button', { name: /create account/i });

      await user.type(nameInput, 'John Doe');
      await user.type(emailInput, 'john@example.com');
      await user.type(passwordInput, '12345');
      await user.click(submitButton);

      await waitFor(() => {
        expect(
          screen.getByText(/password must be at least 8 characters and include uppercase, lowercase, number, and special character/i)
        ).toBeInTheDocument();
      });
    });

    it('should validate password confirmation match', async () => {
      const user = userEvent.setup();
      render(<Register />);

      const nameInput = screen.getByLabelText(/your name/i);
      const emailInput = screen.getByLabelText(/^email$/i);
      const passwordInput = screen.getByLabelText(/^password$/i);
      const confirmPasswordInput = screen.getByLabelText(/confirm password/i);
      const submitButton = screen.getByRole('button', { name: /create account/i });

      await user.type(nameInput, 'John Doe');
      await user.type(emailInput, 'john@example.com');
      await user.type(passwordInput, 'Password123!');
      await user.type(confirmPasswordInput, 'DifferentPassword');
      await user.click(submitButton);

      await waitFor(() => {
        expect(screen.getByText(/passwords don't match/i)).toBeInTheDocument();
      });
    });

    it('should validate empty company name', async () => {
      const user = userEvent.setup();
      render(<Register />);

      const nameInput = screen.getByLabelText(/your name/i);
      const emailInput = screen.getByLabelText(/^email$/i);
      const passwordInput = screen.getByLabelText(/^password$/i);
      const confirmPasswordInput = screen.getByLabelText(/confirm password/i);
      const submitButton = screen.getByRole('button', { name: /create account/i });

      await user.type(nameInput, 'John Doe');
      await user.type(emailInput, 'john@example.com');
      await user.type(passwordInput, 'Password123!');
      await user.type(confirmPasswordInput, 'Password123!');
      await user.click(submitButton);

      await waitFor(() => {
        expect(screen.getByText(/company name is required/i)).toBeInTheDocument();
      });
    });

    it('should validate empty company domain', async () => {
      const user = userEvent.setup();
      render(<Register />);

      const nameInput = screen.getByLabelText(/your name/i);
      const emailInput = screen.getByLabelText(/^email$/i);
      const passwordInput = screen.getByLabelText(/^password$/i);
      const confirmPasswordInput = screen.getByLabelText(/confirm password/i);
      const companyNameInput = screen.getByLabelText(/company name/i);
      const submitButton = screen.getByRole('button', { name: /create account/i });

      await user.type(nameInput, 'John Doe');
      await user.type(emailInput, 'john@example.com');
      await user.type(passwordInput, 'Password123!');
      await user.type(confirmPasswordInput, 'Password123!');
      await user.type(companyNameInput, 'Acme Inc');
      await user.click(submitButton);

      await waitFor(() => {
        expect(screen.getByText(/company domain is required/i)).toBeInTheDocument();
      });
    });

    it('should validate company slug format', async () => {
      const user = userEvent.setup();
      render(<Register />);

      const nameInput = screen.getByLabelText(/your name/i);
      const emailInput = screen.getByLabelText(/^email$/i);
      const passwordInput = screen.getByLabelText(/^password$/i);
      const confirmPasswordInput = screen.getByLabelText(/confirm password/i);
      const companyNameInput = screen.getByLabelText(/company name/i);
      const companyDomainInput = screen.getByLabelText(/company domain/i);
      const companySlugInput = screen.getByLabelText(/company slug/i);
      const submitButton = screen.getByRole('button', { name: /create account/i });

      await user.type(nameInput, 'John Doe');
      await user.type(emailInput, 'john@example.com');
      await user.type(passwordInput, 'Password123!');
      await user.type(confirmPasswordInput, 'Password123!');
      await user.type(companyNameInput, 'Acme Inc');
      await user.type(companyDomainInput, 'acme.com');
      await user.type(companySlugInput, 'Acme Inc!'); // Invalid: uppercase and special chars
      await user.click(submitButton);

      await waitFor(() => {
        expect(screen.getByText(/only lowercase letters, numbers, and hyphens allowed/i)).toBeInTheDocument();
      });
    });
  });

  describe('Successful Registration Flow', () => {
    it('should submit registration form with valid data', async () => {
      const user = userEvent.setup();

      // Mock successful registration response
      server.use(
        http.post(`${API_URL}/auth/register`, async ({ request }) => {
          const body = await request.json();
          // API should NOT receive confirmPassword (client-side only validation)
          expect(body).toEqual({
            name: 'John Doe',
            email: 'john@acme.com',
            password: 'Password123!',
            companyName: 'Acme Inc',
            companyDomain: 'acme.com',
            companySlug: 'acme-inc',
          });

          return HttpResponse.json({
            data: {
              token: 'mock-jwt-token',
              user: {
                id: 'user-1',
                email: 'john@acme.com',
                name: 'John Doe',
                role: 'ADMIN',
                companyId: 'company-1',
              },
            },
          });
        })
      );

      render(<Register />);

      const nameInput = screen.getByLabelText(/your name/i);
      const emailInput = screen.getByLabelText(/^email$/i);
      const passwordInput = screen.getByLabelText(/^password$/i);
      const confirmPasswordInput = screen.getByLabelText(/confirm password/i);
      const companyNameInput = screen.getByLabelText(/company name/i);
      const companyDomainInput = screen.getByLabelText(/company domain/i);
      const companySlugInput = screen.getByLabelText(/company slug/i);
      const submitButton = screen.getByRole('button', { name: /create account/i });

      await user.type(nameInput, 'John Doe');
      await user.type(emailInput, 'john@acme.com');
      await user.type(passwordInput, 'Password123!');
      await user.type(confirmPasswordInput, 'Password123!');
      await user.type(companyNameInput, 'Acme Inc');
      await user.type(companyDomainInput, 'acme.com');
      await user.type(companySlugInput, 'acme-inc');
      await user.click(submitButton);

      // Should navigate to dashboard after successful registration
      await waitFor(() => {
        expect(mockNavigate).toHaveBeenCalledWith('/dashboard');
      });

      // Should update auth store with new token
      expect(useAuthStore.getState().token).toBe('mock-jwt-token');
    });

    it('should show loading state during registration', async () => {
      const user = userEvent.setup();

      // Mock delayed response
      server.use(
        http.post(`${API_URL}/auth/register`, async () => {
          await new Promise((resolve) => setTimeout(resolve, 100));
          return HttpResponse.json({
            data: {
              token: 'mock-jwt-token',
              user: {
                id: 'user-1',
                email: 'john@acme.com',
                name: 'John Doe',
                role: 'ADMIN',
                companyId: 'company-1',
              },
            },
          });
        })
      );

      render(<Register />);

      const nameInput = screen.getByLabelText(/your name/i);
      const emailInput = screen.getByLabelText(/^email$/i);
      const passwordInput = screen.getByLabelText(/^password$/i);
      const confirmPasswordInput = screen.getByLabelText(/confirm password/i);
      const companyNameInput = screen.getByLabelText(/company name/i);
      const companyDomainInput = screen.getByLabelText(/company domain/i);
      const companySlugInput = screen.getByLabelText(/company slug/i);
      const submitButton = screen.getByRole('button', { name: /create account/i });

      await user.type(nameInput, 'John Doe');
      await user.type(emailInput, 'john@acme.com');
      await user.type(passwordInput, 'Password123!');
      await user.type(confirmPasswordInput, 'Password123!');
      await user.type(companyNameInput, 'Acme Inc');
      await user.type(companyDomainInput, 'acme.com');
      await user.type(companySlugInput, 'acme-inc');
      await user.click(submitButton);

      // Should show loading state
      expect(screen.getByRole('button', { name: /creating account/i })).toBeDisabled();

      // Wait for registration to complete
      await waitFor(() => {
        expect(mockNavigate).toHaveBeenCalledWith('/dashboard');
      });
    });

    it('should disable submit button during loading', async () => {
      const user = userEvent.setup();

      server.use(
        http.post(`${API_URL}/auth/register`, async () => {
          await new Promise((resolve) => setTimeout(resolve, 100));
          return HttpResponse.json({
            data: {
              token: 'mock-jwt-token',
              user: {
                id: 'user-1',
                email: 'john@acme.com',
                name: 'John Doe',
                role: 'ADMIN',
                companyId: 'company-1',
              },
            },
          });
        })
      );

      render(<Register />);

      const nameInput = screen.getByLabelText(/your name/i);
      const emailInput = screen.getByLabelText(/^email$/i);
      const passwordInput = screen.getByLabelText(/^password$/i);
      const confirmPasswordInput = screen.getByLabelText(/confirm password/i);
      const companyNameInput = screen.getByLabelText(/company name/i);
      const companyDomainInput = screen.getByLabelText(/company domain/i);
      const companySlugInput = screen.getByLabelText(/company slug/i);
      const submitButton = screen.getByRole('button', { name: /create account/i });

      await user.type(nameInput, 'John Doe');
      await user.type(emailInput, 'john@acme.com');
      await user.type(passwordInput, 'Password123!');
      await user.type(confirmPasswordInput, 'Password123!');
      await user.type(companyNameInput, 'Acme Inc');
      await user.type(companyDomainInput, 'acme.com');
      await user.type(companySlugInput, 'acme-inc');

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
    it('should display error message for duplicate email', async () => {
      const user = userEvent.setup();

      server.use(
        http.post(`${API_URL}/auth/register`, () => {
          return HttpResponse.json(
            { message: 'Email already exists' },
            { status: 400 }
          );
        })
      );

      render(<Register />);

      const nameInput = screen.getByLabelText(/your name/i);
      const emailInput = screen.getByLabelText(/^email$/i);
      const passwordInput = screen.getByLabelText(/^password$/i);
      const confirmPasswordInput = screen.getByLabelText(/confirm password/i);
      const companyNameInput = screen.getByLabelText(/company name/i);
      const companyDomainInput = screen.getByLabelText(/company domain/i);
      const companySlugInput = screen.getByLabelText(/company slug/i);
      const submitButton = screen.getByRole('button', { name: /create account/i });

      await user.type(nameInput, 'John Doe');
      await user.type(emailInput, 'john@acme.com');
      await user.type(passwordInput, 'Password123!');
      await user.type(confirmPasswordInput, 'Password123!');
      await user.type(companyNameInput, 'Acme Inc');
      await user.type(companyDomainInput, 'acme.com');
      await user.type(companySlugInput, 'acme-inc');
      await user.click(submitButton);

      // Should display error message
      await waitFor(() => {
        const errorAlert = screen.getByRole('alert');
        expect(errorAlert).toBeInTheDocument();
        expect(errorAlert).toHaveTextContent(/email already exists/i);
      });

      // Should not navigate
      expect(mockNavigate).not.toHaveBeenCalled();

      // Should not store token
      expect(useAuthStore.getState().token).toBeNull();
    });

    it('should display error for duplicate company slug', async () => {
      const user = userEvent.setup();

      server.use(
        http.post(`${API_URL}/auth/register`, () => {
          return HttpResponse.json(
            { message: 'Company slug already taken' },
            { status: 400 }
          );
        })
      );

      render(<Register />);

      const nameInput = screen.getByLabelText(/your name/i);
      const emailInput = screen.getByLabelText(/^email$/i);
      const passwordInput = screen.getByLabelText(/^password$/i);
      const confirmPasswordInput = screen.getByLabelText(/confirm password/i);
      const companyNameInput = screen.getByLabelText(/company name/i);
      const companyDomainInput = screen.getByLabelText(/company domain/i);
      const companySlugInput = screen.getByLabelText(/company slug/i);
      const submitButton = screen.getByRole('button', { name: /create account/i });

      await user.type(nameInput, 'John Doe');
      await user.type(emailInput, 'john@acme.com');
      await user.type(passwordInput, 'Password123!');
      await user.type(confirmPasswordInput, 'Password123!');
      await user.type(companyNameInput, 'Acme Inc');
      await user.type(companyDomainInput, 'acme.com');
      await user.type(companySlugInput, 'acme-inc');
      await user.click(submitButton);

      await waitFor(() => {
        const errorAlert = screen.getByRole('alert');
        expect(errorAlert).toBeInTheDocument();
        expect(errorAlert).toHaveTextContent(/company slug already taken/i);
      });
    });

    it('should display generic error for network failures', async () => {
      const user = userEvent.setup();

      server.use(
        http.post(`${API_URL}/auth/register`, () => {
          return HttpResponse.error();
        })
      );

      render(<Register />);

      const nameInput = screen.getByLabelText(/your name/i);
      const emailInput = screen.getByLabelText(/^email$/i);
      const passwordInput = screen.getByLabelText(/^password$/i);
      const confirmPasswordInput = screen.getByLabelText(/confirm password/i);
      const companyNameInput = screen.getByLabelText(/company name/i);
      const companyDomainInput = screen.getByLabelText(/company domain/i);
      const companySlugInput = screen.getByLabelText(/company slug/i);
      const submitButton = screen.getByRole('button', { name: /create account/i });

      await user.type(nameInput, 'John Doe');
      await user.type(emailInput, 'john@acme.com');
      await user.type(passwordInput, 'Password123!');
      await user.type(confirmPasswordInput, 'Password123!');
      await user.type(companyNameInput, 'Acme Inc');
      await user.type(companyDomainInput, 'acme.com');
      await user.type(companySlugInput, 'acme-inc');
      await user.click(submitButton);

      await waitFor(() => {
        const errorAlert = screen.getByRole('alert');
        expect(errorAlert).toBeInTheDocument();
        expect(errorAlert).toHaveTextContent(/registration failed/i);
      });
    });

    it('should make error message accessible with role="alert"', async () => {
      const user = userEvent.setup();

      server.use(
        http.post(`${API_URL}/auth/register`, () => {
          return HttpResponse.json(
            { message: 'Registration failed' },
            { status: 500 }
          );
        })
      );

      render(<Register />);

      const nameInput = screen.getByLabelText(/your name/i);
      const emailInput = screen.getByLabelText(/^email$/i);
      const passwordInput = screen.getByLabelText(/^password$/i);
      const confirmPasswordInput = screen.getByLabelText(/confirm password/i);
      const companyNameInput = screen.getByLabelText(/company name/i);
      const companyDomainInput = screen.getByLabelText(/company domain/i);
      const companySlugInput = screen.getByLabelText(/company slug/i);
      const submitButton = screen.getByRole('button', { name: /create account/i });

      await user.type(nameInput, 'John Doe');
      await user.type(emailInput, 'john@acme.com');
      await user.type(passwordInput, 'Password123!');
      await user.type(confirmPasswordInput, 'Password123!');
      await user.type(companyNameInput, 'Acme Inc');
      await user.type(companyDomainInput, 'acme.com');
      await user.type(companySlugInput, 'acme-inc');
      await user.click(submitButton);

      await waitFor(() => {
        const errorAlert = screen.getByRole('alert');
        expect(errorAlert).toBeInTheDocument();
      });
    });
  });

  describe('User Experience', () => {
    it('should have proper input placeholders', () => {
      render(<Register />);

      const nameInput = screen.getByLabelText(/your name/i);
      const emailInput = screen.getByLabelText(/^email$/i);
      const passwordInput = screen.getByLabelText(/^password$/i);
      const confirmPasswordInput = screen.getByLabelText(/confirm password/i);
      const companyNameInput = screen.getByLabelText(/company name/i);
      const companyDomainInput = screen.getByLabelText(/company domain/i);
      const companySlugInput = screen.getByLabelText(/company slug/i);

      expect(nameInput).toHaveAttribute('placeholder', 'John Doe');
      expect(emailInput).toHaveAttribute('placeholder', 'john@company.com');
      expect(passwordInput).toHaveAttribute('placeholder', '••••••••');
      expect(confirmPasswordInput).toHaveAttribute('placeholder', '••••••••');
      expect(companyNameInput).toHaveAttribute('placeholder', 'Acme Inc');
      expect(companyDomainInput).toHaveAttribute('placeholder', 'acme.com');
      expect(companySlugInput).toHaveAttribute('placeholder', 'acme-inc');
    });

    it('should mask password fields', () => {
      render(<Register />);

      const passwordInput = screen.getByLabelText(/^password$/i);
      const confirmPasswordInput = screen.getByLabelText(/confirm password/i);

      expect(passwordInput).toHaveAttribute('type', 'password');
      expect(confirmPasswordInput).toHaveAttribute('type', 'password');
    });

    it('should allow typing in all fields', async () => {
      const user = userEvent.setup();
      render(<Register />);

      const nameInput = screen.getByLabelText(/your name/i) as HTMLInputElement;
      await user.type(nameInput, 'John Doe');
      expect(nameInput.value).toBe('John Doe');

      const emailInput = screen.getByLabelText(/^email$/i) as HTMLInputElement;
      await user.type(emailInput, 'john@example.com');
      expect(emailInput.value).toBe('john@example.com');

      const companySlugInput = screen.getByLabelText(/company slug/i) as HTMLInputElement;
      await user.type(companySlugInput, 'acme-inc');
      expect(companySlugInput.value).toBe('acme-inc');
    });
  });

  describe('Accessibility', () => {
    it('should have semantic HTML structure', () => {
      render(<Register />);

      // Should have heading
      expect(screen.getByRole('heading', { name: /create account/i })).toBeInTheDocument();

      // Should have labeled inputs
      expect(screen.getByLabelText(/your name/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/^email$/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/^password$/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/confirm password/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/company name/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/company domain/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/company slug/i)).toBeInTheDocument();

      // Should have button
      expect(screen.getByRole('button', { name: /create account/i })).toBeInTheDocument();
    });

    it('should have proper label associations', () => {
      render(<Register />);

      const inputs = [
        screen.getByLabelText(/your name/i),
        screen.getByLabelText(/^email$/i),
        screen.getByLabelText(/^password$/i),
        screen.getByLabelText(/confirm password/i),
        screen.getByLabelText(/company name/i),
        screen.getByLabelText(/company domain/i),
        screen.getByLabelText(/company slug/i),
      ];

      inputs.forEach(input => {
        expect(input).toHaveAttribute('id');
        const label = document.querySelector(`label[for="${input.id}"]`);
        expect(label).toBeInTheDocument();
      });
    });

    it('should have proper button type', () => {
      render(<Register />);

      const submitButton = screen.getByRole('button', { name: /create account/i });
      expect(submitButton).toHaveAttribute('type', 'submit');
    });
  });
});
