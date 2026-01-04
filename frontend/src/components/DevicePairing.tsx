import React, { useState } from 'react';
import QRCode from 'qrcode';
import { keyStorage } from '../services/KeyStorageService';

interface DevicePairingProps {
  onPairingComplete?: (deviceId: string) => void;
}

/**
 * Device pairing component - Seeing-Is-Believing implementation
 * Establishes trust via visual QR code verification
 */
export const DevicePairing: React.FC<DevicePairingProps> = ({ onPairingComplete }) => {
  const [qrCodeImage, setQrCodeImage] = useState<string>('');
  const [status, setStatus] = useState<'idle' | 'pairing' | 'paired' | 'error'>('idle');
  const [deviceId, setDeviceId] = useState<string>('');
  const [error, setError] = useState<string>('');

  const startPairing = async () => {
    try {
      setStatus('pairing');
      setError('');

      // 1. Generate device key pair
      const keyPair = await crypto.subtle.generateKey(
        {
          name: 'ECDH',
          namedCurve: 'P-256',
        },
        true,
        ['deriveKey']
      );

      // 2. Export and hash public key
      const publicKey = await crypto.subtle.exportKey('raw', keyPair.publicKey);
      const hash = await crypto.subtle.digest('SHA-256', publicKey);
      const hashHex = Array.from(new Uint8Array(hash))
        .map(b => b.toString(16).padStart(2, '0'))
        .join('');

      // 3. Generate QR code
      const qrData = JSON.stringify({
        type: 'YO3_DEVICE',
        hash: hashHex,
        timestamp: Date.now(),
      });
      
      const qrImage = await QRCode.toDataURL(qrData);
      setQrCodeImage(qrImage);

      // 4. Wait for device confirmation via WebSocket
      const edgeUrl = import.meta.env.VITE_EDGE_URL || 'http://localhost:8080';
      const wsUrl = edgeUrl.replace('http', 'ws') + '/pairing';
      const ws = new WebSocket(wsUrl);

      ws.onopen = () => {
        ws.send(JSON.stringify({ publicKey: hashHex }));
      };

      ws.onmessage = async (event) => {
        const response = JSON.parse(event.data);

        if (response.status === 'verified' && response.deviceId) {
          // 5. Derive master key and store locally
          const masterKey = await deriveMasterKey(
            keyPair.privateKey, 
            response.devicePublicKey
          );
          
          await keyStorage.storeMasterKey(masterKey, response.deviceId);

          setDeviceId(response.deviceId);
          setStatus('paired');
          onPairingComplete?.(response.deviceId); // Notify parent component
          ws.close();
        } else if (response.status === 'error') {
          setError(response.message || 'Pairing failed');
          setStatus('error');
          ws.close();
        }
      };

      ws.onerror = () => {
        setError('Connection to device failed');
        setStatus('error');
        ws.close();
      };

      ws.onclose = (event) => {
        if (status === 'pairing' && !event.wasClean) {
          setError('Connection closed unexpectedly');
          setStatus('error');
        }
      };

    } catch (err) {
      console.error('Pairing failed:', err);
      setError(err instanceof Error ? err.message : 'Unknown error');
      setStatus('error');
    }
  };

  const deriveMasterKey = async (
    privateKey: CryptoKey,
    devicePublicKeyData: string
  ): Promise<ArrayBuffer> => {
    // Convert hex string to ArrayBuffer
    const keyBytes = new Uint8Array(
      devicePublicKeyData.match(/.{1,2}/g)!.map(byte => parseInt(byte, 16))
    );

    const devicePublicKey = await crypto.subtle.importKey(
      'raw',
      keyBytes,
      { name: 'ECDH', namedCurve: 'P-256' },
      false,
      []
    );

    const derivedKey = await crypto.subtle.deriveKey(
      { name: 'ECDH', public: devicePublicKey },
      privateKey,
      { name: 'AES-GCM', length: 256 },
      true,
      ['encrypt', 'decrypt']
    );

    return await crypto.subtle.exportKey('raw', derivedKey);
  };

  return (
    <div className="device-pairing">
      <h2>📱 Device Pairing</h2>
      <p className="subtitle">Secure your video surveillance with Zero-Trust architecture</p>

      {status === 'idle' && (
        <div className="pairing-idle">
          <button onClick={startPairing} className="btn-primary">
            Start Pairing
          </button>
          <p className="help-text">
            Pair a camera to establish secure end-to-end encryption
          </p>
        </div>
      )}

      {status === 'pairing' && (
        <div className="pairing-in-progress">
          <p>Show this QR code to your camera:</p>
          {qrCodeImage && (
            <div className="qr-container">
              <img src={qrCodeImage} alt="Pairing QR Code" />
            </div>
          )}
          <p className="help-text">
            Point your camera at this screen to establish secure connection
          </p>
          <div className="spinner-small" />
        </div>
      )}

      {status === 'paired' && (
        <div className="pairing-success">
          <div className="success-icon">✅</div>
          <p>Device paired successfully!</p>
          <p className="device-id">Device ID: {deviceId}</p>
          <p className="help-text">
            Your master key is stored securely in this browser only.
          </p>
        </div>
      )}

      {status === 'error' && (
        <div className="pairing-error">
          <div className="error-icon">❌</div>
          <p>{error || 'Pairing failed. Please try again.'}</p>
          <button onClick={startPairing} className="btn-secondary">
            Retry
          </button>
        </div>
      )}
    </div>
  );
};
