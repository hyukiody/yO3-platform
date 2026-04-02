/*
 * YO3 PLATFORM COMMERCIAL LICENSE
 * Copyright (c) 2026 YO3 Platform. All Rights Reserved.
 */

import React from 'react';
import { useLicense, FEATURE_CATALOG } from '@contexts/LicenseContext';
import { LicenseFeature, LICENSE_PRICING } from '@types';

/**
 * UpgradeModal - The "Money Modal"
 * 
 * Displays when user clicks on a locked feature, showing:
 * - Feature name and description
 * - Price and benefits
 * - Upgrade CTA
 */
export const UpgradeModal: React.FC = () => {
  const { upgradeModal, hideUpgradeModal, license } = useLicense();
  
  if (!upgradeModal.isOpen || !upgradeModal.feature) {
    return null;
  }
  
  const { feature } = upgradeModal;
  const currentTier = (license?.tier || 'NONE') as keyof typeof LICENSE_PRICING;
  
  // Find the minimum tier that includes this feature
  const requiredTier = feature.tier as keyof typeof LICENSE_PRICING;
  const tierPricing = LICENSE_PRICING[requiredTier] || LICENSE_PRICING['SOLO'];
  
  return (
    <div 
      className="upgrade-modal-overlay"
      onClick={hideUpgradeModal}
      style={{
        position: 'fixed',
        inset: 0,
        backgroundColor: 'rgba(0, 0, 0, 0.8)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 9999,
        animation: 'fadeIn 0.2s ease-out',
      }}
    >
      <div 
        className="upgrade-modal"
        onClick={(e) => e.stopPropagation()}
        style={{
          background: 'linear-gradient(145deg, #1a1a2e 0%, #16213e 100%)',
          borderRadius: '16px',
          padding: '32px',
          maxWidth: '480px',
          width: '90%',
          boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.5)',
          border: '1px solid rgba(255, 255, 255, 0.1)',
          color: '#fff',
        }}
      >
        {/* Header */}
        <div style={{ textAlign: 'center', marginBottom: '24px' }}>
          <div style={{ fontSize: '48px', marginBottom: '16px' }}>🔐</div>
          <h2 style={{ 
            fontSize: '24px', 
            fontWeight: 700, 
            marginBottom: '8px',
            background: 'linear-gradient(90deg, #00d4ff, #7c3aed)',
            WebkitBackgroundClip: 'text',
            WebkitTextFillColor: 'transparent',
          }}>
            {upgradeModal.title || `Unlock ${feature.name}`}
          </h2>
          <p style={{ color: 'rgba(255,255,255,0.7)', fontSize: '14px' }}>
            {upgradeModal.reason || feature.description}
          </p>
        </div>

        {/* Feature Details */}
        <div style={{
          background: 'rgba(255,255,255,0.05)',
          borderRadius: '12px',
          padding: '20px',
          marginBottom: '24px',
        }}>
          <div style={{ 
            display: 'flex', 
            justifyContent: 'space-between', 
            alignItems: 'center',
            marginBottom: '16px',
          }}>
            <span style={{ fontWeight: 600 }}>{feature.name}</span>
            <span style={{ 
              fontSize: '24px', 
              fontWeight: 700,
              color: '#00d4ff',
            }}>
              {feature.priceLabel}
            </span>
          </div>
          
          {/* Benefits list */}
          <ul style={{ 
            listStyle: 'none', 
            padding: 0, 
            margin: 0,
            fontSize: '14px',
            color: 'rgba(255,255,255,0.8)',
          }}>
            <li style={{ marginBottom: '8px', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span style={{ color: '#10b981' }}>✓</span>
              {feature.description}
            </li>
            <li style={{ marginBottom: '8px', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span style={{ color: '#10b981' }}>✓</span>
              ISO-27001 compliant implementation
            </li>
            <li style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span style={{ color: '#10b981' }}>✓</span>
              Perpetual license - use forever
            </li>
          </ul>
        </div>

        {/* Upgrade Options */}
        <div style={{ marginBottom: '24px' }}>
          <p style={{ 
            fontSize: '12px', 
            color: 'rgba(255,255,255,0.5)', 
            marginBottom: '12px',
            textAlign: 'center',
          }}>
            Or upgrade to a higher tier for more features:
          </p>
          
          <div style={{ display: 'flex', gap: '8px' }}>
            {(['SOLO', 'PRO', 'ENTERPRISE'] as const).map((tier) => {
              const pricing = LICENSE_PRICING[tier];
              const isCurrentTier = tier === currentTier;
              const hasFeature = tier === requiredTier || 
                (tier === 'ENTERPRISE') ||
                (tier === 'PRO' && requiredTier === 'SOLO');
              
              return (
                <button
                  key={tier}
                  disabled={isCurrentTier}
                  style={{
                    flex: 1,
                    padding: '12px 8px',
                    borderRadius: '8px',
                    border: isCurrentTier 
                      ? '2px solid #7c3aed' 
                      : '1px solid rgba(255,255,255,0.2)',
                    background: isCurrentTier 
                      ? 'rgba(124, 58, 237, 0.2)' 
                      : 'transparent',
                    color: '#fff',
                    cursor: isCurrentTier ? 'default' : 'pointer',
                    transition: 'all 0.2s',
                  }}
                >
                  <div style={{ fontWeight: 600, fontSize: '12px' }}>{tier}</div>
                  <div style={{ fontSize: '10px', color: 'rgba(255,255,255,0.6)' }}>
                    {pricing.priceLabel}
                  </div>
                  {hasFeature && (
                    <div style={{ fontSize: '10px', color: '#10b981', marginTop: '4px' }}>
                      ✓ Includes
                    </div>
                  )}
                </button>
              );
            })}
          </div>
        </div>

        {/* Action Buttons */}
        <div style={{ display: 'flex', gap: '12px' }}>
          <button
            onClick={hideUpgradeModal}
            style={{
              flex: 1,
              padding: '14px 24px',
              borderRadius: '8px',
              border: '1px solid rgba(255,255,255,0.2)',
              background: 'transparent',
              color: '#fff',
              cursor: 'pointer',
              fontWeight: 500,
            }}
          >
            Maybe Later
          </button>
          <button
            onClick={() => {
              // Open purchase page
              window.open('https://yo3platform.com/pricing', '_blank');
            }}
            style={{
              flex: 2,
              padding: '14px 24px',
              borderRadius: '8px',
              border: 'none',
              background: 'linear-gradient(90deg, #7c3aed, #00d4ff)',
              color: '#fff',
              cursor: 'pointer',
              fontWeight: 600,
              fontSize: '16px',
            }}
          >
            Upgrade Now →
          </button>
        </div>

        {/* Footer */}
        <p style={{ 
          textAlign: 'center', 
          fontSize: '11px', 
          color: 'rgba(255,255,255,0.4)',
          marginTop: '16px',
        }}>
          🔒 Secure payment via Stripe • 30-day money-back guarantee
        </p>
      </div>

      <style>{`
        @keyframes fadeIn {
          from { opacity: 0; }
          to { opacity: 1; }
        }
        .upgrade-modal {
          animation: slideUp 0.3s ease-out;
        }
        @keyframes slideUp {
          from { transform: translateY(20px); opacity: 0; }
          to { transform: translateY(0); opacity: 1; }
        }
      `}</style>
    </div>
  );
};

/**
 * LockedFeatureButton - A button that shows upgrade modal when clicked if feature is locked
 */
interface LockedFeatureButtonProps {
  feature: LicenseFeature;
  onClick: () => void;
  children: React.ReactNode;
  className?: string;
  style?: React.CSSProperties;
}

export const LockedFeatureButton: React.FC<LockedFeatureButtonProps> = ({
  feature,
  onClick,
  children,
  className,
  style,
}) => {
  const { hasFeature, showUpgradeModal } = useLicense();
  const isLocked = !hasFeature(feature);
  
  const handleClick = () => {
    if (isLocked) {
      showUpgradeModal(feature);
    } else {
      onClick();
    }
  };
  
  return (
    <button
      onClick={handleClick}
      className={className}
      style={{
        ...style,
        position: 'relative',
        opacity: isLocked ? 0.7 : 1,
      }}
    >
      {children}
      {isLocked && (
        <span style={{
          position: 'absolute',
          top: '-4px',
          right: '-4px',
          fontSize: '12px',
        }}>
          🔒
        </span>
      )}
    </button>
  );
};

/**
 * MaintenanceWarning - Shows when maintenance is expiring soon or expired
 */
export const MaintenanceWarning: React.FC = () => {
  const { license } = useLicense();
  
  // This would check actual maintenance expiry from license
  // For now, showing as example
  const maintenanceDaysRemaining = 30; // From license info
  const showWarning = maintenanceDaysRemaining <= 30;
  
  if (!showWarning) return null;
  
  return (
    <div style={{
      background: maintenanceDaysRemaining <= 7 
        ? 'linear-gradient(90deg, #dc2626, #f97316)' 
        : 'linear-gradient(90deg, #f97316, #eab308)',
      color: '#fff',
      padding: '8px 16px',
      fontSize: '13px',
      textAlign: 'center',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      gap: '8px',
    }}>
      <span>⚠️</span>
      <span>
        {maintenanceDaysRemaining <= 0 
          ? 'Maintenance expired. Software updates are disabled.'
          : `Maintenance expires in ${maintenanceDaysRemaining} days. Renew to keep receiving updates.`
        }
      </span>
      <button
        onClick={() => window.open('https://yo3platform.com/renew', '_blank')}
        style={{
          background: 'rgba(255,255,255,0.2)',
          border: 'none',
          borderRadius: '4px',
          padding: '4px 12px',
          color: '#fff',
          cursor: 'pointer',
          fontWeight: 500,
        }}
      >
        Renew ($500/year)
      </button>
    </div>
  );
};

export default UpgradeModal;
