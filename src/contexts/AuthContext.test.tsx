/**
 * AuthContext.test.tsx - Tests for Authentication Context Provider
 *
 * Tests the AuthProvider component and useAuth hook that manage
 * user authentication state, login, registration, and logout.
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { AuthProvider, useAuth } from './AuthContext';

// Mock localStorage
const localStorageMock = (() => {
  let store: Record<string, string> = {};
  return {
    getItem: vi.fn((key: string) => store[key] || null),
    setItem: vi.fn((key: string, value: string) => {
      store[key] = value;
    }),
    removeItem: vi.fn((key: string) => {
      delete store[key];
    }),
    clear: vi.fn(() => {
      store = {};
    }),
  };
})();
vi.stubGlobal('localStorage', localStorageMock);

// Mock navigator.userAgent
Object.defineProperty(navigator, 'userAgent', {
  value: 'test-user-agent',
  writable: true,
});

// Mock apiService
vi.mock('../services/api', () => ({
  apiService: {
    login: vi.fn(),
    register: vi.fn(),
    logout: vi.fn(),
    getCurrentUser: vi.fn(),
  },
}));

import { apiService } from '../services/api';

// Test component that uses useAuth
function TestConsumer() {
  const { user, token, isAuthenticated, isLoading, error, login, logout, register } = useAuth();
  
  const handleLogin = async () => {
    try {
      await login('testuser', 'password123', 'seedkey');
    } catch {
      // Error is handled by context
    }
  };

  const handleRegister = async () => {
    try {
      await register('newuser', 'new@test.com', 'password123', 'seedkey');
    } catch {
      // Error is handled by context
    }
  };
  
  return (
    <div>
      <div data-testid="loading">{isLoading ? 'loading' : 'ready'}</div>
      <div data-testid="authenticated">{isAuthenticated ? 'yes' : 'no'}</div>
      <div data-testid="user">{user ? user.username : 'none'}</div>
      <div data-testid="token">{token || 'none'}</div>
      <div data-testid="error">{error || 'none'}</div>
      <button onClick={handleLogin}>Login</button>
      <button onClick={handleRegister}>Register</button>
      <button onClick={logout}>Logout</button>
    </div>
  );
}

// Component that tests useAuth outside provider
function OutsideProviderTest() {
  try {
    useAuth();
    return <div>No error</div>;
  } catch (e) {
    return <div data-testid="error-message">{(e as Error).message}</div>;
  }
}

describe('AuthContext', () => {
  beforeEach(() => {
    localStorageMock.clear();
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe('AuthProvider Initialization', () => {
    it('initializes with loading state', async () => {
      vi.mocked(apiService.getCurrentUser).mockResolvedValue({
        id: 1,
        username: 'user',
        email: 'user@test.com',
        role: 'USER',
        licenseTier: 'BASIC',
        storageQuotaGb: 5,
        apiRateLimit: 100,
        subscriptionStatus: 'ACTIVE',
        isActive: true,
      });

      render(
        <AuthProvider>
          <TestConsumer />
        </AuthProvider>
      );

      // Wait for initialization to complete
      await waitFor(() => {
        expect(screen.getByTestId('loading')).toHaveTextContent('ready');
      });
    });

    it('loads existing token from localStorage on mount', async () => {
      localStorageMock.getItem.mockReturnValue('existing-token');
      
      vi.mocked(apiService.getCurrentUser).mockResolvedValue({
        id: 1,
        username: 'storeduser',
        email: 'stored@test.com',
        role: 'USER',
        licenseTier: 'BASIC',
        storageQuotaGb: 5,
        apiRateLimit: 100,
        subscriptionStatus: 'ACTIVE',
        isActive: true,
      });

      render(
        <AuthProvider>
          <TestConsumer />
        </AuthProvider>
      );

      await waitFor(() => {
        expect(screen.getByTestId('user')).toHaveTextContent('storeduser');
      });
      
      expect(localStorageMock.getItem).toHaveBeenCalledWith('yo3_token');
    });

    it('handles failed user fetch on initialization', async () => {
      localStorageMock.getItem.mockReturnValue('invalid-token');
      vi.mocked(apiService.getCurrentUser).mockRejectedValue(new Error('Invalid token'));

      render(
        <AuthProvider>
          <TestConsumer />
        </AuthProvider>
      );

      await waitFor(() => {
        expect(screen.getByTestId('loading')).toHaveTextContent('ready');
      });

      expect(apiService.logout).toHaveBeenCalled();
    });

    it('starts as not authenticated without stored token', async () => {
      localStorageMock.getItem.mockReturnValue(null);

      render(
        <AuthProvider>
          <TestConsumer />
        </AuthProvider>
      );

      await waitFor(() => {
        expect(screen.getByTestId('loading')).toHaveTextContent('ready');
      });

      expect(screen.getByTestId('authenticated')).toHaveTextContent('no');
      expect(screen.getByTestId('user')).toHaveTextContent('none');
    });
  });

  describe('Login', () => {
    it('logs in successfully and updates state', async () => {
      const user = userEvent.setup();
      
      vi.mocked(apiService.login).mockResolvedValue({
        accessToken: 'new-token',
        tokenType: 'Bearer',
        expiresIn: 3600,
        username: 'testuser',
        role: 'USER',
        message: undefined,
      });
      
      vi.mocked(apiService.getCurrentUser).mockResolvedValue({
        id: 1,
        username: 'testuser',
        email: 'test@test.com',
        role: 'USER',
        licenseTier: 'BASIC',
        storageQuotaGb: 5,
        apiRateLimit: 100,
        subscriptionStatus: 'ACTIVE',
        isActive: true,
      });

      render(
        <AuthProvider>
          <TestConsumer />
        </AuthProvider>
      );

      await waitFor(() => {
        expect(screen.getByTestId('loading')).toHaveTextContent('ready');
      });

      await user.click(screen.getByText('Login'));

      await waitFor(() => {
        expect(screen.getByTestId('authenticated')).toHaveTextContent('yes');
      });

      expect(screen.getByTestId('user')).toHaveTextContent('testuser');
      expect(apiService.login).toHaveBeenCalledWith({
        username: 'testuser',
        password: 'password123',
        seedKey: 'seedkey',
        deviceId: 'test-user-agent',
      });
    });

    it('handles login failure with error', async () => {
      const user = userEvent.setup();
      
      vi.mocked(apiService.login).mockRejectedValue(new Error('Invalid credentials'));

      render(
        <AuthProvider>
          <TestConsumer />
        </AuthProvider>
      );

      await waitFor(() => {
        expect(screen.getByTestId('loading')).toHaveTextContent('ready');
      });

      await user.click(screen.getByText('Login'));

      await waitFor(() => {
        expect(screen.getByTestId('error')).toHaveTextContent('Invalid credentials');
      });

      expect(screen.getByTestId('authenticated')).toHaveTextContent('no');
    });

    it('uses demo mode fallback for admin credentials when backend fails', async () => {
      const user = userEvent.setup();
      
      vi.mocked(apiService.login).mockRejectedValue(new Error('Backend unavailable'));

      // Create a custom test consumer that uses admin credentials
      function AdminTestConsumer() {
        const { user, isAuthenticated, isLoading, login } = useAuth();
        return (
          <div>
            <div data-testid="loading">{isLoading ? 'loading' : 'ready'}</div>
            <div data-testid="authenticated">{isAuthenticated ? 'yes' : 'no'}</div>
            <div data-testid="user">{user ? user.username : 'none'}</div>
            <button onClick={() => login('admin', 'admin123', 'seedkey')}>Login</button>
          </div>
        );
      }

      render(
        <AuthProvider>
          <AdminTestConsumer />
        </AuthProvider>
      );

      await waitFor(() => {
        expect(screen.getByTestId('loading')).toHaveTextContent('ready');
      });

      await user.click(screen.getByText('Login'));

      await waitFor(() => {
        expect(screen.getByTestId('authenticated')).toHaveTextContent('yes');
      });

      expect(screen.getByTestId('user')).toHaveTextContent('admin');
      expect(localStorageMock.setItem).toHaveBeenCalledWith('yo3_token', expect.stringContaining('demo-token-'));
    });

    it('displays warning message from login response', async () => {
      const user = userEvent.setup();
      const consoleSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
      
      vi.mocked(apiService.login).mockResolvedValue({
        accessToken: 'token',
        tokenType: 'Bearer',
        expiresIn: 3600,
        username: 'user',
        role: 'USER',
        message: 'Trial period ending soon',
      });
      
      vi.mocked(apiService.getCurrentUser).mockResolvedValue({
        id: 1,
        username: 'user',
        email: 'user@test.com',
        role: 'USER',
        licenseTier: 'TRIAL',
        storageQuotaGb: 1,
        apiRateLimit: 10,
        subscriptionStatus: 'TRIAL',
        isActive: true,
      });

      render(
        <AuthProvider>
          <TestConsumer />
        </AuthProvider>
      );

      await waitFor(() => {
        expect(screen.getByTestId('loading')).toHaveTextContent('ready');
      });

      await user.click(screen.getByText('Login'));

      await waitFor(() => {
        expect(consoleSpy).toHaveBeenCalledWith('Auth message:', 'Trial period ending soon');
      });

      consoleSpy.mockRestore();
    });
  });

  describe('Register', () => {
    it('registers successfully and updates state', async () => {
      const user = userEvent.setup();
      
      vi.mocked(apiService.register).mockResolvedValue({
        accessToken: 'new-user-token',
        tokenType: 'Bearer',
        expiresIn: 3600,
        username: 'newuser',
        role: 'USER',
        message: 'Welcome!',
      });
      
      vi.mocked(apiService.getCurrentUser).mockResolvedValue({
        id: 2,
        username: 'newuser',
        email: 'new@test.com',
        role: 'USER',
        licenseTier: 'BASIC',
        storageQuotaGb: 5,
        apiRateLimit: 100,
        subscriptionStatus: 'ACTIVE',
        isActive: true,
      });

      render(
        <AuthProvider>
          <TestConsumer />
        </AuthProvider>
      );

      await waitFor(() => {
        expect(screen.getByTestId('loading')).toHaveTextContent('ready');
      });

      await user.click(screen.getByText('Register'));

      await waitFor(() => {
        expect(screen.getByTestId('authenticated')).toHaveTextContent('yes');
      });

      expect(screen.getByTestId('user')).toHaveTextContent('newuser');
      expect(apiService.register).toHaveBeenCalledWith({
        username: 'newuser',
        password: 'password123',
        seedKey: 'seedkey',
        deviceId: 'test-user-agent',
      });
    });

    it('handles registration failure with error', async () => {
      const user = userEvent.setup();
      
      vi.mocked(apiService.register).mockRejectedValue(new Error('Email already exists'));

      render(
        <AuthProvider>
          <TestConsumer />
        </AuthProvider>
      );

      await waitFor(() => {
        expect(screen.getByTestId('loading')).toHaveTextContent('ready');
      });

      await user.click(screen.getByText('Register'));

      await waitFor(() => {
        expect(screen.getByTestId('error')).toHaveTextContent('Email already exists');
      });

      expect(screen.getByTestId('authenticated')).toHaveTextContent('no');
    });
  });

  describe('Logout', () => {
    it('logs out and clears state', async () => {
      const user = userEvent.setup();
      
      // First login
      vi.mocked(apiService.login).mockResolvedValue({
        accessToken: 'token',
        tokenType: 'Bearer',
        expiresIn: 3600,
        username: 'testuser',
        role: 'USER',
        message: undefined,
      });
      
      vi.mocked(apiService.getCurrentUser).mockResolvedValue({
        id: 1,
        username: 'testuser',
        email: 'test@test.com',
        role: 'USER',
        licenseTier: 'BASIC',
        storageQuotaGb: 5,
        apiRateLimit: 100,
        subscriptionStatus: 'ACTIVE',
        isActive: true,
      });

      render(
        <AuthProvider>
          <TestConsumer />
        </AuthProvider>
      );

      await waitFor(() => {
        expect(screen.getByTestId('loading')).toHaveTextContent('ready');
      });

      await user.click(screen.getByText('Login'));

      await waitFor(() => {
        expect(screen.getByTestId('authenticated')).toHaveTextContent('yes');
      });

      // Now logout
      await user.click(screen.getByText('Logout'));

      expect(screen.getByTestId('authenticated')).toHaveTextContent('no');
      expect(screen.getByTestId('user')).toHaveTextContent('none');
      expect(screen.getByTestId('token')).toHaveTextContent('none');
      expect(apiService.logout).toHaveBeenCalled();
    });
  });

  describe('useAuth Hook', () => {
    it('throws error when used outside AuthProvider', () => {
      // React catches the error in an error boundary, so we need to test differently
      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
      
      // The OutsideProviderTest component catches the error internally
      // So we verify the error message is displayed
      render(<OutsideProviderTest />);
      
      expect(screen.getByTestId('error-message')).toHaveTextContent('useAuth must be used within AuthProvider');
      
      consoleSpy.mockRestore();
    });

    it('provides all expected context values', async () => {
      vi.mocked(apiService.getCurrentUser).mockResolvedValue({
        id: 1,
        username: 'user',
        email: 'user@test.com',
        role: 'USER',
        licenseTier: 'BASIC',
        storageQuotaGb: 5,
        apiRateLimit: 100,
        subscriptionStatus: 'ACTIVE',
        isActive: true,
      });

      function ContextChecker() {
        const context = useAuth();
        return (
          <div>
            <div data-testid="has-user">{context.user !== undefined ? 'yes' : 'no'}</div>
            <div data-testid="has-token">{context.token !== undefined ? 'yes' : 'no'}</div>
            <div data-testid="has-login">{typeof context.login === 'function' ? 'yes' : 'no'}</div>
            <div data-testid="has-register">{typeof context.register === 'function' ? 'yes' : 'no'}</div>
            <div data-testid="has-logout">{typeof context.logout === 'function' ? 'yes' : 'no'}</div>
            <div data-testid="has-isAuthenticated">{typeof context.isAuthenticated === 'boolean' ? 'yes' : 'no'}</div>
            <div data-testid="has-isLoading">{typeof context.isLoading === 'boolean' ? 'yes' : 'no'}</div>
            <div data-testid="has-error">{context.error !== undefined ? 'yes' : 'no'}</div>
          </div>
        );
      }

      render(
        <AuthProvider>
          <ContextChecker />
        </AuthProvider>
      );

      await waitFor(() => {
        expect(screen.getByTestId('has-login')).toHaveTextContent('yes');
      });

      expect(screen.getByTestId('has-user')).toHaveTextContent('yes');
      expect(screen.getByTestId('has-token')).toHaveTextContent('yes');
      expect(screen.getByTestId('has-register')).toHaveTextContent('yes');
      expect(screen.getByTestId('has-logout')).toHaveTextContent('yes');
      expect(screen.getByTestId('has-isAuthenticated')).toHaveTextContent('yes');
      expect(screen.getByTestId('has-isLoading')).toHaveTextContent('yes');
      expect(screen.getByTestId('has-error')).toHaveTextContent('yes');
    });
  });

  describe('Authentication State', () => {
    it('isAuthenticated is true when token exists', async () => {
      localStorageMock.getItem.mockReturnValue('valid-token');
      
      vi.mocked(apiService.getCurrentUser).mockResolvedValue({
        id: 1,
        username: 'user',
        email: 'user@test.com',
        role: 'USER',
        licenseTier: 'BASIC',
        storageQuotaGb: 5,
        apiRateLimit: 100,
        subscriptionStatus: 'ACTIVE',
        isActive: true,
      });

      render(
        <AuthProvider>
          <TestConsumer />
        </AuthProvider>
      );

      await waitFor(() => {
        expect(screen.getByTestId('authenticated')).toHaveTextContent('yes');
      });
    });

    it('isAuthenticated is false when token is null', async () => {
      localStorageMock.getItem.mockReturnValue(null);

      render(
        <AuthProvider>
          <TestConsumer />
        </AuthProvider>
      );

      await waitFor(() => {
        expect(screen.getByTestId('loading')).toHaveTextContent('ready');
      });

      expect(screen.getByTestId('authenticated')).toHaveTextContent('no');
    });
  });
});
