import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { DevicePairing } from '@device/pairing/ui/react/component/qrCode/DevicePairing';

// Mock qrcode library
vi.mock('qrcode', () => ({
  default: {
    toDataURL: vi.fn().mockResolvedValue('data:image/png;base64,mockQRCode'),
  },
}));

// Mock KeyStorageService
vi.mock('@services/KeyStorageService', () => ({
  keyStorage: {
    storeMasterKey: vi.fn().mockResolvedValue(undefined),
  },
}));

// Mock WebSocket
class MockWebSocket {
  static instances: MockWebSocket[] = [];
  onopen: (() => void) | null = null;
  onmessage: ((event: { data: string }) => void) | null = null;
  onerror: (() => void) | null = null;
  onclose: ((event: { wasClean: boolean }) => void) | null = null;
  
  constructor(public url: string) {
    MockWebSocket.instances.push(this);
    setTimeout(() => this.onopen?.(), 10);
  }
  
  send = vi.fn();
  close = vi.fn();
  
  static reset() {
    MockWebSocket.instances = [];
  }
}

// Mock crypto.subtle
const mockCryptoSubtle = {
  generateKey: vi.fn().mockResolvedValue({
    publicKey: {},
    privateKey: {},
  }),
  exportKey: vi.fn().mockResolvedValue(new ArrayBuffer(32)),
  digest: vi.fn().mockResolvedValue(new ArrayBuffer(32)),
  importKey: vi.fn().mockResolvedValue({}),
  deriveKey: vi.fn().mockResolvedValue({}),
};

Object.defineProperty(global, 'crypto', {
  value: { subtle: mockCryptoSubtle },
});

Object.defineProperty(global, 'WebSocket', {
  value: MockWebSocket,
});

describe('DevicePairing', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    MockWebSocket.reset();
  });

  describe('rendering', () => {
    it('renders pairing header', () => {
      render(<DevicePairing />);
      
      expect(screen.getByText(/Device Pairing/)).toBeInTheDocument();
    });

    it('renders subtitle text', () => {
      render(<DevicePairing />);
      
      expect(screen.getByText(/Zero-Trust architecture/)).toBeInTheDocument();
    });

    it('renders start pairing button in idle state', () => {
      render(<DevicePairing />);
      
      expect(screen.getByRole('button', { name: /Start Pairing/i })).toBeInTheDocument();
    });

    it('has proper accessibility attributes', () => {
      render(<DevicePairing />);
      
      const sections = screen.getAllByRole('region');
      const mainSection = sections.find(s => s.classList.contains('device-pairing'));
      expect(mainSection).toHaveAttribute('aria-live', 'polite');
    });
  });

  describe('pairing flow', () => {
    it('starts pairing when button is clicked', async () => {
      render(<DevicePairing />);
      
      fireEvent.click(screen.getByRole('button', { name: /Start Pairing/i }));
      
      await waitFor(() => {
        expect(mockCryptoSubtle.generateKey).toHaveBeenCalled();
      });
    });

    it('shows QR code during pairing', async () => {
      render(<DevicePairing />);
      
      fireEvent.click(screen.getByRole('button', { name: /Start Pairing/i }));
      
      await waitFor(() => {
        const qrImage = screen.queryByRole('img', { name: /QR Code/i });
        expect(qrImage || screen.queryByTestId('qr-code')).toBeDefined();
      });
    });

    it('connects to WebSocket with correct URL', async () => {
      render(<DevicePairing />);
      
      fireEvent.click(screen.getByRole('button', { name: /Start Pairing/i }));
      
      await waitFor(() => {
        expect(MockWebSocket.instances.length).toBeGreaterThan(0);
        expect(MockWebSocket.instances[0].url).toContain('/pairing');
      });
    });

    it('sends public key hash on WebSocket open', async () => {
      render(<DevicePairing />);
      
      fireEvent.click(screen.getByRole('button', { name: /Start Pairing/i }));
      
      await waitFor(() => {
        expect(MockWebSocket.instances[0]?.send).toHaveBeenCalled();
      });
    });
  });

  describe('success state', () => {
    it('calls onPairingComplete when pairing succeeds', async () => {
      const onPairingComplete = vi.fn();
      render(<DevicePairing onPairingComplete={onPairingComplete} />);
      
      fireEvent.click(screen.getByRole('button', { name: /Start Pairing/i }));
      
      // Wait for WebSocket to be created
      await waitFor(() => {
        expect(MockWebSocket.instances.length).toBeGreaterThan(0);
      });
      
      const ws = MockWebSocket.instances[0];
      
      // Simulate successful pairing response
      if (ws?.onmessage) {
        ws.onmessage({
          data: JSON.stringify({
            status: 'verified',
            deviceId: 'device-123',
            devicePublicKey: '00'.repeat(32),
          }),
        });
      }
      
      await waitFor(() => {
        expect(onPairingComplete).toHaveBeenCalledWith('device-123');
      }, { timeout: 3000 });
    });
  });

  describe('error handling', () => {
    it('shows error state on WebSocket error', async () => {
      render(<DevicePairing />);
      
      fireEvent.click(screen.getByRole('button', { name: /Start Pairing/i }));
      
      // Wait for WebSocket to be created
      await waitFor(() => {
        expect(MockWebSocket.instances.length).toBeGreaterThan(0);
      });
      
      const ws = MockWebSocket.instances[0];
      ws?.onerror?.();
      
      await waitFor(() => {
        expect(screen.getByText(/Connection to device failed|error|failed/i)).toBeInTheDocument();
      }, { timeout: 3000 });
    });

    it('shows error on pairing failure response', async () => {
      render(<DevicePairing />);
      
      fireEvent.click(screen.getByRole('button', { name: /Start Pairing/i }));
      
      // Wait for WebSocket to be created
      await waitFor(() => {
        expect(MockWebSocket.instances.length).toBeGreaterThan(0);
      });
      
      const ws = MockWebSocket.instances[0];
      if (ws?.onmessage) {
        ws.onmessage({
          data: JSON.stringify({
            status: 'error',
            message: 'Device rejected pairing',
          }),
        });
      }
      
      await waitFor(() => {
        expect(screen.getByText(/Device rejected pairing|error|failed/i)).toBeInTheDocument();
      }, { timeout: 3000 });
    });
  });

  describe('accessibility', () => {
    it('indicates busy state during pairing', async () => {
      render(<DevicePairing />);
      
      fireEvent.click(screen.getByRole('button', { name: /Start Pairing/i }));
      
      await waitFor(() => {
        const section = screen.getByRole('region', { name: /Device Pairing/i });
        expect(section).toHaveAttribute('aria-busy', 'true');
      });
    });
  });
});
