import React, { useEffect, useState } from 'react';
import { Lock, Shield, CheckCircle, Fingerprint } from 'lucide-react';
import '../../../styles/themes/fresh.css';

/**
 * FreshGuardOverlay - Green/White "Fresh Sensation" Overlay
 * 
 * DESIGN SPEC: SPEC-001_EXTENDED_ANALYSIS.md
 * USE CASE: Personal Safe, Vault Access, System Health displays
 * 
 * GDAI ASSERTION:
 * - MUST only render when Encryption Integrity Check PASSES
 * - MUST only be used for Local Storage Access contexts
 * - All Threat contexts remain in Orange/Dark theme
 */

interface FreshGuardOverlayProps {
  isLocked: boolean;
  encryptionVerified: boolean;
  onUnlock?: () => void;
  vaultName?: string;
  children?: React.ReactNode;
}

export const FreshGuardOverlay: React.FC<FreshGuardOverlayProps> = ({
  isLocked,
  encryptionVerified,
  onUnlock,
  vaultName = 'Personal Safe',
  children
}) => {
  const [ambientLight, setAmbientLight] = useState<'normal' | 'low'>('normal');

  // Ambient Light Sensor Detection (if available)
  useEffect(() => {
    if ('AmbientLightSensor' in window) {
      try {
        // @ts-ignore - AmbientLightSensor is experimental
        const sensor = new AmbientLightSensor();
        sensor.addEventListener('reading', () => {
          // Below 50 lux = low light environment
          setAmbientLight(sensor.illuminance < 50 ? 'low' : 'normal');
        });
        sensor.start();
        return () => sensor.stop();
      } catch (e) {
        // Sensor not available, use prefers-color-scheme fallback
        const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
        setAmbientLight(mediaQuery.matches ? 'low' : 'normal');
      }
    }
  }, []);

  // GDAI Assertion: Only render Fresh mode when encryption is verified
  if (!encryptionVerified) {
    return null; // Fallback to default theme
  }

  return (
    <div 
      className={`fresh-overlay ${ambientLight === 'low' ? 'fresh-overlay--ambient' : ''}`}
      data-theme="fresh"
    >
      <div className="fresh-guard-container fresh-animate-in">
        {/* Status Badge */}
        <div className="mb-6">
          <span className={`fresh-status-badge ${isLocked ? 'fresh-status-badge--locked' : 'fresh-status-badge--verified'}`}>
            <span className="fresh-status-dot" />
            {isLocked ? 'Vault Locked' : 'Encryption Active'}
          </span>
        </div>

        {/* Icon Ring */}
        <div className="fresh-guard-icon-ring">
          {isLocked ? (
            <Lock className="fresh-guard-icon" />
          ) : (
            <Shield className="fresh-guard-icon" />
          )}
        </div>

        {/* Title */}
        <h2 className="fresh-guard-title">
          {vaultName.split(' ').map((word, i) => 
            i === vaultName.split(' ').length - 1 ? (
              <span key={i} className="fresh-guard-title-accent"> {word}</span>
            ) : word
          )}
        </h2>

        {/* Subtitle */}
        <p className="fresh-guard-subtitle">
          {isLocked ? (
            <>
              Environment is secure. Encryption is active.
              <br />
              Enter credential to access local vault.
            </>
          ) : (
            <>
              Vault unlocked. Data integrity verified.
              <br />
              Your secured assets are accessible.
            </>
          )}
        </p>

        {/* Verification Indicators */}
        <div className="flex items-center justify-center gap-4 mt-6">
          <VerificationChip icon={<CheckCircle size={16} />} label="Encrypted" />
          <VerificationChip icon={<Shield size={16} />} label="Integrity OK" />
          <VerificationChip icon={<Fingerprint size={16} />} label="Local Only" />
        </div>

        {/* Action Button */}
        {isLocked && onUnlock && (
          <button 
            className="fresh-btn fresh-btn--primary mt-8"
            onClick={onUnlock}
          >
            <Fingerprint size={20} />
            Unlock Vault
          </button>
        )}

        {/* Child Content (when unlocked) */}
        {!isLocked && children && (
          <div className="mt-8 w-full">
            {children}
          </div>
        )}
      </div>
    </div>
  );
};

// Sub-component: Verification Chip
const VerificationChip: React.FC<{ icon: React.ReactNode; label: string }> = ({ icon, label }) => (
  <div className="flex items-center gap-1.5 text-sm" style={{ color: 'var(--primary-color-dark)' }}>
    {icon}
    <span>{label}</span>
  </div>
);

export default FreshGuardOverlay;
