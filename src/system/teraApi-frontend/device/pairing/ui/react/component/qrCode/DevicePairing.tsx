import React, { useState } from 'react';
import QRCode from 'qrcode';
import { keyStorage } from '@services/KeyStorageService';

interface DevicePairingProps {
  onPairingComplete?: (deviceId: string) => void;
}

type PairingStatus = 'idle' | 'pairing' | 'paired' | 'error';

/**
 * Device pairing component - Seeing-Is-Believing implementation
 * Establishes trust via visual QR code verification
 */
export const DevicePairing: React.FC<DevicePairingProps> = ({ onPairingComplete }) => {
  const [qrCodeImage, setQrCodeImage] = useState<string>('');
  const [status, setStatus] = useState<PairingStatus>('idle');
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
        setStatus((currentStatus) => {
          if (currentStatus === 'pairing' && !event.wasClean) {
            setError('Connection closed unexpectedly');
            return 'error';
          }

          return currentStatus;
        });
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
    <section
      className="device-pairing"
      aria-labelledby="device-pairing-heading"
      aria-live="polite"
      aria-busy={status === 'pairing'}
    >
      <header className="pairing-header">
        <h2 id="device-pairing-heading">📱 Device Pairing</h2>
        <p className="subtitle">Secure your video surveillance with Zero-Trust architecture</p>
      </header>

      {status === 'idle' && (
        <section className="pairing-idle" aria-label="Start device pairing">
          <button type="button" onClick={startPairing} className="btn-primary">
            Start Pairing
          </button>
          <p className="help-text">
            Pair a camera to establish secure end-to-end encryption
          </p>
        </section>
      )}

      {status === 'pairing' && (
        <section className="pairing-in-progress" aria-label="Pairing in progress" role="status">
          <p>Show this QR code to your camera:</p>
          {qrCodeImage && (
            <figure className="qr-container">
              <img src={qrCodeImage} alt="Pairing QR Code" />
              <figcaption className="help-text">
                Point your camera at this screen to establish secure connection
              </figcaption>
            </figure>
          )}
          <div className="spinner-small" aria-hidden="true" />
        </section>
      )}

      {status === 'paired' && (
        <section className="pairing-success" role="status" aria-label="Device paired">
          <div className="success-icon" aria-hidden="true">✅</div>
          <p>Device paired successfully!</p>
          <dl className="device-id">
            <dt>Device ID</dt>
            <dd>{deviceId}</dd>
          </dl>
          <p className="help-text">
            Your master key is stored securely in this browser only.
          </p>
        </section>
      )}

      {status === 'error' && (
        <section className="pairing-error" role="alert" aria-label="Pairing error">
          <div className="error-icon" aria-hidden="true">❌</div>
          <p>{error || 'Pairing failed. Please try again.'}</p>
          <button type="button" onClick={startPairing} className="btn-secondary">
            Retry
          </button>
        </section>
      )}
    </section>
  );
};
