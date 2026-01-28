/*
 * YO3 PLATFORM COMMERCIAL LICENSE
 * Copyright (c) 2026 YO3 Platform. All Rights Reserved.
 */

import React, { createContext, useContext, useState, useCallback, ReactNode } from 'react';
import { 
  LicenseStatus, 
  LicenseTierType, 
  LicenseFeature,
  LICENSE_PRICING 
} from '../types';

// ═══════════════════════════════════════════════════════════════════════════════
// TYPES
// ═══════════════════════════════════════════════════════════════════════════════

interface FeatureUpsellInfo {
  code: LicenseFeature;
  name: string;
  price: number;
  priceLabel: string;
  description: string;
  tier: LicenseTierType;
}

interface UpgradeModalState {
  isOpen: boolean;
  feature?: FeatureUpsellInfo;
  title?: string;
  reason?: string;
}

interface LicenseContextValue {
  // License state
  license: LicenseStatus | null;
  isLoading: boolean;
  error: string | null;
  
  // License actions
  activateLicense: (licenseKey: string) => Promise<boolean>;
  clearLicense: () => void;
  
  // Feature checking
  hasFeature: (feature: LicenseFeature) => boolean;
  canUseCameras: (count: number) => boolean;
  isMaintenanceActive: () => boolean;
  
  // Upsell modal
  upgradeModal: UpgradeModalState;
  showUpgradeModal: (feature: LicenseFeature, reason?: string) => void;
  hideUpgradeModal: () => void;
  
  // Feature gating HOC helper
  requireFeature: (feature: LicenseFeature, callback: () => void) => void;
}

// ═══════════════════════════════════════════════════════════════════════════════
// FEATURE CATALOG (for upsell display)
// ═══════════════════════════════════════════════════════════════════════════════

const FEATURE_CATALOG: Record<LicenseFeature, Omit<FeatureUpsellInfo, 'code'>> = {
  CORE_ANALYTICS: { 
    name: 'Core Analytics', 
    price: 0, 
    priceLabel: 'Included',
    description: 'Basic video analytics and recording',
    tier: 'SOLO'
  },
  BASIC_ALERTS: { 
    name: 'Basic Alerts', 
    price: 0, 
    priceLabel: 'Included',
    description: 'Simple motion detection alerts',
    tier: 'SOLO'
  },
  SINGLE_DEPLOYMENT: { 
    name: 'Single Deployment', 
    price: 0, 
    priceLabel: 'Included',
    description: 'Deploy on one server',
    tier: 'SOLO'
  },
  MULTI_DEPLOYMENT: { 
    name: 'Multi-Deployment', 
    price: 5000, 
    priceLabel: '$5,000',
    description: 'Deploy across multiple servers and locations',
    tier: 'ENTERPRISE'
  },
  FORENSIC_ANALYSIS: { 
    name: 'Forensic Deep Dive', 
    price: 999, 
    priceLabel: '$999',
    description: 'Frame-by-frame incident investigation with timeline export',
    tier: 'PRO'
  },
  HEATMAPS: { 
    name: 'Heatmap Intelligence', 
    price: 499, 
    priceLabel: '$499',
    description: 'Visualize traffic patterns with our ISO-certified analysis engine',
    tier: 'PRO'
  },
  SOURCE_CODE: { 
    name: 'Source Code Access', 
    price: 2000, 
    priceLabel: '$2,000',
    description: 'Full source code for audit and customization',
    tier: 'PRO'
  },
  PRIORITY_SUPPORT: { 
    name: 'Priority Support', 
    price: 500, 
    priceLabel: '$500/year',
    description: '24/7 technical support with 4-hour response SLA',
    tier: 'PRO'
  },
  WHITELABEL: { 
    name: 'Whitelabel Rights', 
    price: 10000, 
    priceLabel: '$10,000',
    description: 'Rebrand and resell under your company name',
    tier: 'ENTERPRISE'
  },
  OEM_RIGHTS: { 
    name: 'OEM License', 
    price: 15000, 
    priceLabel: '$15,000+',
    description: 'Embed in your hardware products',
    tier: 'ENTERPRISE'
  },
  SPEC_001: { 
    name: 'SPEC-001 Protocol', 
    price: 4999, 
    priceLabel: '$4,999',
    description: 'Enterprise surveillance specification compliance module',
    tier: 'ENTERPRISE'
  },
  AGENTIC_VISION: { 
    name: 'Agentic Vision AI', 
    price: 1999, 
    priceLabel: '$1,999',
    description: 'Advanced behavioral analysis with autonomous alert generation',
    tier: 'ENTERPRISE'
  },
};

// ═══════════════════════════════════════════════════════════════════════════════
// CONTEXT
// ═══════════════════════════════════════════════════════════════════════════════

const LicenseContext = createContext<LicenseContextValue | undefined>(undefined);

// ═══════════════════════════════════════════════════════════════════════════════
// PROVIDER
// ═══════════════════════════════════════════════════════════════════════════════

interface LicenseProviderProps {
  children: ReactNode;
}

export const LicenseProvider: React.FC<LicenseProviderProps> = ({ children }) => {
  const [license, setLicense] = useState<LicenseStatus | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [upgradeModal, setUpgradeModal] = useState<UpgradeModalState>({ isOpen: false });

  // Load license from localStorage on mount
  React.useEffect(() => {
    const savedLicense = localStorage.getItem('yo3_license');
    if (savedLicense) {
      try {
        const parsed = JSON.parse(savedLicense);
        setLicense(parsed);
      } catch {
        localStorage.removeItem('yo3_license');
      }
    }
  }, []);

  const activateLicense = useCallback(async (licenseKey: string): Promise<boolean> => {
    setIsLoading(true);
    setError(null);

    try {
      // Call backend to verify license
      const response = await fetch('/api/license/verify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ licenseKey }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.message || 'License verification failed');
      }

      const data = await response.json();
      
      if (data.valid && data.info) {
        setLicense(data.info);
        localStorage.setItem('yo3_license', JSON.stringify(data.info));
        localStorage.setItem('yo3_license_key', licenseKey);
        return true;
      } else {
        throw new Error(data.error || 'Invalid license key');
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : 'License activation failed';
      setError(message);
      return false;
    } finally {
      setIsLoading(false);
    }
  }, []);

  const clearLicense = useCallback(() => {
    setLicense(null);
    localStorage.removeItem('yo3_license');
    localStorage.removeItem('yo3_license_key');
  }, []);

  const hasFeature = useCallback((feature: LicenseFeature): boolean => {
    if (!license?.valid) return false;
    
    // Enterprise has everything
    if (license.tier === 'ENTERPRISE') return true;
    
    // Check explicit features
    return license.features?.includes(feature) ?? false;
  }, [license]);

  const canUseCameras = useCallback((count: number): boolean => {
    if (!license?.valid) return count <= 1; // Demo: 1 camera
    
    const tierFeatures = LICENSE_PRICING[license.tier as keyof typeof LICENSE_PRICING];
    const maxCameras = tierFeatures?.maxCameras ?? 4;
    
    // -1 means unlimited
    if (maxCameras === -1) return true;
    
    return count <= maxCameras;
  }, [license]);

  const isMaintenanceActive = useCallback((): boolean => {
    if (!license) return false;
    
    // Check if maintenanceExpiry exists and is in the future
    // This would come from the backend license info
    return true; // Placeholder - backend enforces this
  }, [license]);

  const showUpgradeModal = useCallback((feature: LicenseFeature, reason?: string) => {
    const featureInfo = FEATURE_CATALOG[feature];
    setUpgradeModal({
      isOpen: true,
      feature: { code: feature, ...featureInfo },
      title: `Unlock ${featureInfo.name}`,
      reason: reason || featureInfo.description,
    });
  }, []);

  const hideUpgradeModal = useCallback(() => {
    setUpgradeModal({ isOpen: false });
  }, []);

  const requireFeature = useCallback((feature: LicenseFeature, callback: () => void) => {
    if (hasFeature(feature)) {
      callback();
    } else {
      showUpgradeModal(feature);
    }
  }, [hasFeature, showUpgradeModal]);

  const value: LicenseContextValue = {
    license,
    isLoading,
    error,
    activateLicense,
    clearLicense,
    hasFeature,
    canUseCameras,
    isMaintenanceActive,
    upgradeModal,
    showUpgradeModal,
    hideUpgradeModal,
    requireFeature,
  };

  return (
    <LicenseContext.Provider value={value}>
      {children}
    </LicenseContext.Provider>
  );
};

// ═══════════════════════════════════════════════════════════════════════════════
// HOOK
// ═══════════════════════════════════════════════════════════════════════════════

export const useLicense = (): LicenseContextValue => {
  const context = useContext(LicenseContext);
  if (!context) {
    throw new Error('useLicense must be used within a LicenseProvider');
  }
  return context;
};

// ═══════════════════════════════════════════════════════════════════════════════
// FEATURE GUARD COMPONENT
// ═══════════════════════════════════════════════════════════════════════════════

interface FeatureGateProps {
  feature: LicenseFeature;
  children: ReactNode;
  fallback?: ReactNode;
  showLock?: boolean;
}

export const FeatureGate: React.FC<FeatureGateProps> = ({ 
  feature, 
  children, 
  fallback,
  showLock = true 
}) => {
  const { hasFeature, showUpgradeModal } = useLicense();
  
  if (hasFeature(feature)) {
    return <>{children}</>;
  }
  
  if (fallback) {
    return <>{fallback}</>;
  }
  
  if (showLock) {
    return (
      <div 
        className="feature-locked"
        onClick={() => showUpgradeModal(feature)}
        style={{
          cursor: 'pointer',
          opacity: 0.5,
          position: 'relative',
        }}
      >
        {children}
        <div 
          className="lock-overlay"
          style={{
            position: 'absolute',
            inset: 0,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            background: 'rgba(0,0,0,0.3)',
            borderRadius: '4px',
          }}
        >
          <span style={{ fontSize: '24px' }}>🔒</span>
        </div>
      </div>
    );
  }
  
  return null;
};

export { FEATURE_CATALOG };
export default LicenseContext;
