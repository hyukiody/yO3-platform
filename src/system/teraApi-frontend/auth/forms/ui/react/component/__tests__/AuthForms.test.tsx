/**
 * AuthForms.test.tsx - Tests for Login and Register Form Components
 * 
 * Tests cover:
 * - LoginForm: rendering, validation, submission, success/error handling
 * - RegisterForm: rendering, validation, password matching, submission
 * - Loading states and disabled inputs
 * - API client integration
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { LoginForm, RegisterForm } from '../AuthForms';
import apiClient from '@lib/apiClient';

// Mock apiClient
vi.mock('@lib/apiClient', () => ({
  default: {
    login: vi.fn(),
    register: vi.fn(),
  },
}));

// Mock CSS
vi.mock('../styles/Auth.css', () => ({}));

describe('LoginForm Component', () => {
  const mockOnSuccess = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.resetAllMocks();
  });

  describe('Rendering', () => {
    it('renders login form with title', () => {
      render(<LoginForm />);
      
      expect(screen.getByRole('heading', { name: /Login/i })).toBeInTheDocument();
    });

    it('renders email input field', () => {
      render(<LoginForm />);
      
      expect(screen.getByPlaceholderText('Email')).toBeInTheDocument();
      expect(screen.getByPlaceholderText('Email')).toHaveAttribute('type', 'email');
    });

    it('renders password input field', () => {
      render(<LoginForm />);
      
      expect(screen.getByPlaceholderText('Password')).toBeInTheDocument();
      expect(screen.getByPlaceholderText('Password')).toHaveAttribute('type', 'password');
    });

    it('renders submit button', () => {
      render(<LoginForm />);
      
      expect(screen.getByRole('button', { name: /Login/i })).toBeInTheDocument();
    });

    it('does not display error message initially', () => {
      render(<LoginForm />);
      
      expect(screen.queryByText(/Email and password required/i)).not.toBeInTheDocument();
    });
  });

  describe('Validation', () => {
    it('shows error when submitting empty form', async () => {
      const user = userEvent.setup();
      render(<LoginForm />);
      
      const submitButton = screen.getByRole('button', { name: /Login/i });
      await user.click(submitButton);
      
      expect(screen.getByText('Email and password required')).toBeInTheDocument();
    });

    it('shows error when only email is provided', async () => {
      const user = userEvent.setup();
      render(<LoginForm />);
      
      await user.type(screen.getByPlaceholderText('Email'), 'test@example.com');
      await user.click(screen.getByRole('button', { name: /Login/i }));
      
      expect(screen.getByText('Email and password required')).toBeInTheDocument();
    });

    it('shows error when only password is provided', async () => {
      const user = userEvent.setup();
      render(<LoginForm />);
      
      await user.type(screen.getByPlaceholderText('Password'), 'password123');
      await user.click(screen.getByRole('button', { name: /Login/i }));
      
      expect(screen.getByText('Email and password required')).toBeInTheDocument();
    });

    it('does not call API when validation fails', async () => {
      const user = userEvent.setup();
      render(<LoginForm />);
      
      await user.click(screen.getByRole('button', { name: /Login/i }));
      
      expect(apiClient.login).not.toHaveBeenCalled();
    });
  });

  describe('Successful Login', () => {
    it('calls apiClient.login with credentials', async () => {
      const user = userEvent.setup();
      (apiClient.login as ReturnType<typeof vi.fn>).mockResolvedValue({
        status: 200,
        data: { token: 'mock-token-123' },
      });

      render(<LoginForm onSuccess={mockOnSuccess} />);
      
      await user.type(screen.getByPlaceholderText('Email'), 'test@example.com');
      await user.type(screen.getByPlaceholderText('Password'), 'password123');
      await user.click(screen.getByRole('button', { name: /Login/i }));
      
      await waitFor(() => {
        expect(apiClient.login).toHaveBeenCalledWith('test@example.com', 'password123');
      });
    });

    it('calls onSuccess callback with token on successful login', async () => {
      const user = userEvent.setup();
      (apiClient.login as ReturnType<typeof vi.fn>).mockResolvedValue({
        status: 200,
        data: { token: 'mock-token-123' },
      });

      render(<LoginForm onSuccess={mockOnSuccess} />);
      
      await user.type(screen.getByPlaceholderText('Email'), 'test@example.com');
      await user.type(screen.getByPlaceholderText('Password'), 'password123');
      await user.click(screen.getByRole('button', { name: /Login/i }));
      
      await waitFor(() => {
        expect(mockOnSuccess).toHaveBeenCalledWith('mock-token-123');
      });
    });

    it('clears error message on successful login', async () => {
      const user = userEvent.setup();
      (apiClient.login as ReturnType<typeof vi.fn>)
        .mockResolvedValueOnce({ status: 401, error: 'Invalid credentials' })
        .mockResolvedValueOnce({ status: 200, data: { token: 'token' } });

      render(<LoginForm onSuccess={mockOnSuccess} />);
      
      // First attempt - fails
      await user.type(screen.getByPlaceholderText('Email'), 'test@example.com');
      await user.type(screen.getByPlaceholderText('Password'), 'wrong');
      await user.click(screen.getByRole('button', { name: /Login/i }));
      
      await waitFor(() => {
        expect(screen.getByText('Invalid credentials')).toBeInTheDocument();
      });

      // Second attempt - succeeds
      await user.clear(screen.getByPlaceholderText('Password'));
      await user.type(screen.getByPlaceholderText('Password'), 'correct');
      await user.click(screen.getByRole('button', { name: /Login/i }));
      
      await waitFor(() => {
        expect(screen.queryByText('Invalid credentials')).not.toBeInTheDocument();
      });
    });
  });

  describe('Failed Login', () => {
    it('displays error message from API on failed login', async () => {
      const user = userEvent.setup();
      (apiClient.login as ReturnType<typeof vi.fn>).mockResolvedValue({
        status: 401,
        error: 'Invalid credentials',
      });

      render(<LoginForm />);
      
      await user.type(screen.getByPlaceholderText('Email'), 'test@example.com');
      await user.type(screen.getByPlaceholderText('Password'), 'wrongpassword');
      await user.click(screen.getByRole('button', { name: /Login/i }));
      
      await waitFor(() => {
        expect(screen.getByText('Invalid credentials')).toBeInTheDocument();
      });
    });

    it('displays default error when no error message from API', async () => {
      const user = userEvent.setup();
      (apiClient.login as ReturnType<typeof vi.fn>).mockResolvedValue({
        status: 500,
      });

      render(<LoginForm />);
      
      await user.type(screen.getByPlaceholderText('Email'), 'test@example.com');
      await user.type(screen.getByPlaceholderText('Password'), 'password123');
      await user.click(screen.getByRole('button', { name: /Login/i }));
      
      await waitFor(() => {
        expect(screen.getByText('Login failed')).toBeInTheDocument();
      });
    });

    it('does not call onSuccess on failed login', async () => {
      const user = userEvent.setup();
      (apiClient.login as ReturnType<typeof vi.fn>).mockResolvedValue({
        status: 401,
        error: 'Invalid credentials',
      });

      render(<LoginForm onSuccess={mockOnSuccess} />);
      
      await user.type(screen.getByPlaceholderText('Email'), 'test@example.com');
      await user.type(screen.getByPlaceholderText('Password'), 'wrongpassword');
      await user.click(screen.getByRole('button', { name: /Login/i }));
      
      await waitFor(() => {
        expect(screen.getByText('Invalid credentials')).toBeInTheDocument();
      });
      
      expect(mockOnSuccess).not.toHaveBeenCalled();
    });
  });

  describe('Loading State', () => {
    it('shows loading text in button while submitting', async () => {
      const user = userEvent.setup();
      (apiClient.login as ReturnType<typeof vi.fn>).mockImplementation(
        () => new Promise(resolve => setTimeout(() => resolve({ status: 200, data: { token: 'token' } }), 100))
      );

      render(<LoginForm />);
      
      await user.type(screen.getByPlaceholderText('Email'), 'test@example.com');
      await user.type(screen.getByPlaceholderText('Password'), 'password123');
      await user.click(screen.getByRole('button', { name: /Login/i }));
      
      expect(screen.getByRole('button', { name: /Logging in.../i })).toBeInTheDocument();
    });

    it('disables inputs while loading', async () => {
      const user = userEvent.setup();
      (apiClient.login as ReturnType<typeof vi.fn>).mockImplementation(
        () => new Promise(resolve => setTimeout(() => resolve({ status: 200, data: { token: 'token' } }), 100))
      );

      render(<LoginForm />);
      
      await user.type(screen.getByPlaceholderText('Email'), 'test@example.com');
      await user.type(screen.getByPlaceholderText('Password'), 'password123');
      await user.click(screen.getByRole('button', { name: /Login/i }));
      
      expect(screen.getByPlaceholderText('Email')).toBeDisabled();
      expect(screen.getByPlaceholderText('Password')).toBeDisabled();
    });

    it('disables submit button while loading', async () => {
      const user = userEvent.setup();
      (apiClient.login as ReturnType<typeof vi.fn>).mockImplementation(
        () => new Promise(resolve => setTimeout(() => resolve({ status: 200, data: { token: 'token' } }), 100))
      );

      render(<LoginForm />);
      
      await user.type(screen.getByPlaceholderText('Email'), 'test@example.com');
      await user.type(screen.getByPlaceholderText('Password'), 'password123');
      await user.click(screen.getByRole('button', { name: /Login/i }));
      
      expect(screen.getByRole('button', { name: /Logging in.../i })).toBeDisabled();
    });

    it('re-enables inputs after loading completes', async () => {
      const user = userEvent.setup();
      (apiClient.login as ReturnType<typeof vi.fn>).mockResolvedValue({
        status: 401,
        error: 'Error',
      });

      render(<LoginForm />);
      
      await user.type(screen.getByPlaceholderText('Email'), 'test@example.com');
      await user.type(screen.getByPlaceholderText('Password'), 'password123');
      await user.click(screen.getByRole('button', { name: /Login/i }));
      
      await waitFor(() => {
        expect(screen.getByPlaceholderText('Email')).not.toBeDisabled();
        expect(screen.getByPlaceholderText('Password')).not.toBeDisabled();
      });
    });
  });

  describe('Edge Cases', () => {
    it('handles onSuccess being undefined', async () => {
      const user = userEvent.setup();
      (apiClient.login as ReturnType<typeof vi.fn>).mockResolvedValue({
        status: 200,
        data: { token: 'mock-token' },
      });

      // Should not throw when onSuccess is not provided
      render(<LoginForm />);
      
      await user.type(screen.getByPlaceholderText('Email'), 'test@example.com');
      await user.type(screen.getByPlaceholderText('Password'), 'password123');
      await user.click(screen.getByRole('button', { name: /Login/i }));
      
      await waitFor(() => {
        expect(apiClient.login).toHaveBeenCalled();
      });
    });
  });
});

describe('RegisterForm Component', () => {
  const mockOnSuccess = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.resetAllMocks();
  });

  describe('Rendering', () => {
    it('renders register form with title', () => {
      render(<RegisterForm />);
      
      expect(screen.getByRole('heading', { name: /Register/i })).toBeInTheDocument();
    });

    it('renders email input field', () => {
      render(<RegisterForm />);
      
      expect(screen.getByPlaceholderText('Email')).toBeInTheDocument();
    });

    it('renders password input field', () => {
      render(<RegisterForm />);
      
      expect(screen.getByPlaceholderText('Password')).toBeInTheDocument();
    });

    it('renders confirm password input field', () => {
      render(<RegisterForm />);
      
      expect(screen.getByPlaceholderText('Confirm Password')).toBeInTheDocument();
    });

    it('renders submit button', () => {
      render(<RegisterForm />);
      
      expect(screen.getByRole('button', { name: /Register/i })).toBeInTheDocument();
    });
  });

  describe('Validation', () => {
    it('shows error when submitting empty form', async () => {
      const user = userEvent.setup();
      render(<RegisterForm />);
      
      await user.click(screen.getByRole('button', { name: /Register/i }));
      
      expect(screen.getByText('All fields required')).toBeInTheDocument();
    });

    it('shows error when passwords do not match', async () => {
      const user = userEvent.setup();
      render(<RegisterForm />);
      
      await user.type(screen.getByPlaceholderText('Email'), 'new@example.com');
      await user.type(screen.getByPlaceholderText('Password'), 'password123');
      await user.type(screen.getByPlaceholderText('Confirm Password'), 'different');
      await user.click(screen.getByRole('button', { name: /Register/i }));
      
      expect(screen.getByText('Passwords do not match')).toBeInTheDocument();
    });

    it('does not call API when passwords do not match', async () => {
      const user = userEvent.setup();
      render(<RegisterForm />);
      
      await user.type(screen.getByPlaceholderText('Email'), 'new@example.com');
      await user.type(screen.getByPlaceholderText('Password'), 'password123');
      await user.type(screen.getByPlaceholderText('Confirm Password'), 'different');
      await user.click(screen.getByRole('button', { name: /Register/i }));
      
      expect(apiClient.register).not.toHaveBeenCalled();
    });

    it('does not call API when validation fails', async () => {
      const user = userEvent.setup();
      render(<RegisterForm />);
      
      await user.click(screen.getByRole('button', { name: /Register/i }));
      
      expect(apiClient.register).not.toHaveBeenCalled();
    });
  });

  describe('Successful Registration', () => {
    it('calls apiClient.register with credentials', async () => {
      const user = userEvent.setup();
      (apiClient.register as ReturnType<typeof vi.fn>).mockResolvedValue({
        status: 201,
        data: { token: 'new-user-token' },
      });

      render(<RegisterForm onSuccess={mockOnSuccess} />);
      
      await user.type(screen.getByPlaceholderText('Email'), 'new@example.com');
      await user.type(screen.getByPlaceholderText('Password'), 'password123');
      await user.type(screen.getByPlaceholderText('Confirm Password'), 'password123');
      await user.click(screen.getByRole('button', { name: /Register/i }));
      
      await waitFor(() => {
        expect(apiClient.register).toHaveBeenCalledWith('new@example.com', 'password123');
      });
    });

    it('calls onSuccess callback with token on successful registration', async () => {
      const user = userEvent.setup();
      (apiClient.register as ReturnType<typeof vi.fn>).mockResolvedValue({
        status: 201,
        data: { token: 'new-user-token' },
      });

      render(<RegisterForm onSuccess={mockOnSuccess} />);
      
      await user.type(screen.getByPlaceholderText('Email'), 'new@example.com');
      await user.type(screen.getByPlaceholderText('Password'), 'password123');
      await user.type(screen.getByPlaceholderText('Confirm Password'), 'password123');
      await user.click(screen.getByRole('button', { name: /Register/i }));
      
      await waitFor(() => {
        expect(mockOnSuccess).toHaveBeenCalledWith('new-user-token');
      });
    });
  });

  describe('Failed Registration', () => {
    it('displays error message from API on failed registration', async () => {
      const user = userEvent.setup();
      (apiClient.register as ReturnType<typeof vi.fn>).mockResolvedValue({
        status: 409,
        error: 'Email already exists',
      });

      render(<RegisterForm />);
      
      await user.type(screen.getByPlaceholderText('Email'), 'existing@example.com');
      await user.type(screen.getByPlaceholderText('Password'), 'password123');
      await user.type(screen.getByPlaceholderText('Confirm Password'), 'password123');
      await user.click(screen.getByRole('button', { name: /Register/i }));
      
      await waitFor(() => {
        expect(screen.getByText('Email already exists')).toBeInTheDocument();
      });
    });

    it('displays default error when no error message from API', async () => {
      const user = userEvent.setup();
      (apiClient.register as ReturnType<typeof vi.fn>).mockResolvedValue({
        status: 500,
      });

      render(<RegisterForm />);
      
      await user.type(screen.getByPlaceholderText('Email'), 'new@example.com');
      await user.type(screen.getByPlaceholderText('Password'), 'password123');
      await user.type(screen.getByPlaceholderText('Confirm Password'), 'password123');
      await user.click(screen.getByRole('button', { name: /Register/i }));
      
      await waitFor(() => {
        expect(screen.getByText('Registration failed')).toBeInTheDocument();
      });
    });

    it('does not call onSuccess on failed registration', async () => {
      const user = userEvent.setup();
      (apiClient.register as ReturnType<typeof vi.fn>).mockResolvedValue({
        status: 409,
        error: 'Email already exists',
      });

      render(<RegisterForm onSuccess={mockOnSuccess} />);
      
      await user.type(screen.getByPlaceholderText('Email'), 'existing@example.com');
      await user.type(screen.getByPlaceholderText('Password'), 'password123');
      await user.type(screen.getByPlaceholderText('Confirm Password'), 'password123');
      await user.click(screen.getByRole('button', { name: /Register/i }));
      
      await waitFor(() => {
        expect(screen.getByText('Email already exists')).toBeInTheDocument();
      });
      
      expect(mockOnSuccess).not.toHaveBeenCalled();
    });
  });

  describe('Loading State', () => {
    it('shows loading text in button while submitting', async () => {
      const user = userEvent.setup();
      (apiClient.register as ReturnType<typeof vi.fn>).mockImplementation(
        () => new Promise(resolve => setTimeout(() => resolve({ status: 201, data: { token: 'token' } }), 100))
      );

      render(<RegisterForm />);
      
      await user.type(screen.getByPlaceholderText('Email'), 'new@example.com');
      await user.type(screen.getByPlaceholderText('Password'), 'password123');
      await user.type(screen.getByPlaceholderText('Confirm Password'), 'password123');
      await user.click(screen.getByRole('button', { name: /Register/i }));
      
      expect(screen.getByRole('button', { name: /Creating account.../i })).toBeInTheDocument();
    });

    it('disables all inputs while loading', async () => {
      const user = userEvent.setup();
      (apiClient.register as ReturnType<typeof vi.fn>).mockImplementation(
        () => new Promise(resolve => setTimeout(() => resolve({ status: 201, data: { token: 'token' } }), 100))
      );

      render(<RegisterForm />);
      
      await user.type(screen.getByPlaceholderText('Email'), 'new@example.com');
      await user.type(screen.getByPlaceholderText('Password'), 'password123');
      await user.type(screen.getByPlaceholderText('Confirm Password'), 'password123');
      await user.click(screen.getByRole('button', { name: /Register/i }));
      
      expect(screen.getByPlaceholderText('Email')).toBeDisabled();
      expect(screen.getByPlaceholderText('Password')).toBeDisabled();
      expect(screen.getByPlaceholderText('Confirm Password')).toBeDisabled();
    });

    it('disables submit button while loading', async () => {
      const user = userEvent.setup();
      (apiClient.register as ReturnType<typeof vi.fn>).mockImplementation(
        () => new Promise(resolve => setTimeout(() => resolve({ status: 201, data: { token: 'token' } }), 100))
      );

      render(<RegisterForm />);
      
      await user.type(screen.getByPlaceholderText('Email'), 'new@example.com');
      await user.type(screen.getByPlaceholderText('Password'), 'password123');
      await user.type(screen.getByPlaceholderText('Confirm Password'), 'password123');
      await user.click(screen.getByRole('button', { name: /Register/i }));
      
      expect(screen.getByRole('button', { name: /Creating account.../i })).toBeDisabled();
    });

    it('re-enables inputs after loading completes', async () => {
      const user = userEvent.setup();
      (apiClient.register as ReturnType<typeof vi.fn>).mockResolvedValue({
        status: 409,
        error: 'Error',
      });

      render(<RegisterForm />);
      
      await user.type(screen.getByPlaceholderText('Email'), 'new@example.com');
      await user.type(screen.getByPlaceholderText('Password'), 'password123');
      await user.type(screen.getByPlaceholderText('Confirm Password'), 'password123');
      await user.click(screen.getByRole('button', { name: /Register/i }));
      
      await waitFor(() => {
        expect(screen.getByPlaceholderText('Email')).not.toBeDisabled();
        expect(screen.getByPlaceholderText('Password')).not.toBeDisabled();
        expect(screen.getByPlaceholderText('Confirm Password')).not.toBeDisabled();
      });
    });
  });

  describe('Edge Cases', () => {
    it('handles onSuccess being undefined', async () => {
      const user = userEvent.setup();
      (apiClient.register as ReturnType<typeof vi.fn>).mockResolvedValue({
        status: 201,
        data: { token: 'new-token' },
      });

      // Should not throw when onSuccess is not provided
      render(<RegisterForm />);
      
      await user.type(screen.getByPlaceholderText('Email'), 'new@example.com');
      await user.type(screen.getByPlaceholderText('Password'), 'password123');
      await user.type(screen.getByPlaceholderText('Confirm Password'), 'password123');
      await user.click(screen.getByRole('button', { name: /Register/i }));
      
      await waitFor(() => {
        expect(apiClient.register).toHaveBeenCalled();
      });
    });

    it('handles empty string passwords matching', async () => {
      const user = userEvent.setup();
      render(<RegisterForm />);
      
      await user.type(screen.getByPlaceholderText('Email'), 'new@example.com');
      // Leave password fields empty
      await user.click(screen.getByRole('button', { name: /Register/i }));
      
      // Should fail on "All fields required" before password matching check
      expect(screen.getByText('All fields required')).toBeInTheDocument();
    });
  });
});
