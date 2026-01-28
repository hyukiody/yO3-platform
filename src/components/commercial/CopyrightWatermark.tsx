import React, { useEffect, useState } from 'react';

/**
 * CopyrightWatermark Component
 * 
 * Displays a non-removable copyright assertion watermark across the entire application
 * when running in SHOWCASE_MODE. This serves as:
 * 1. Visual copyright assertion (legal protection)
 * 2. Evaluation copy indicator (user awareness)
 * 3. Brand presence (prevents unauthorized resale)
 * 4. Demo limitation indicator
 */
export const CopyrightWatermark: React.FC = () => {
  const [isShowcaseMode, setIsShowcaseMode] = useState(false);

  useEffect(() => {
    // Check if we're in showcase mode from environment
    const showcaseMode = import.meta.env.VITE_SHOWCASE_MODE === 'true';
    setIsShowcaseMode(showcaseMode);
  }, []);

  if (!isShowcaseMode) {
    return null;
  }

  return (
    <>
      {/* Diagonal Watermark Background */}
      <div 
        className="fixed top-0 left-0 w-full h-full pointer-events-none z-[9999] opacity-20 flex items-center justify-center overflow-hidden"
        style={{
          backgroundImage: `repeating-linear-gradient(
            -45deg,
            transparent,
            transparent 500px,
            rgba(128, 128, 128, 0.15) 500px,
            rgba(128, 128, 128, 0.15) 700px
          )`
        }}
      >
        <div className="absolute inset-0 flex items-center justify-center">
          <div className="transform -rotate-45 text-center whitespace-nowrap">
            <div className="text-6xl font-black text-gray-400" style={{ textShadow: '2px 2px 4px rgba(0,0,0,0.1)' }}>
              EVALUATION COPY
            </div>
            <div className="text-2xl font-bold text-gray-400 mt-4">
              © 2026 yO3 PLATFORM
            </div>
            <div className="text-lg text-gray-400 mt-2">
              NOT FOR RESALE • FOR REVIEW ONLY
            </div>
          </div>
        </div>
      </div>

      {/* Top Banner - Evaluation Notice */}
      <div className="fixed top-0 left-0 right-0 bg-gradient-to-r from-orange-500 to-red-500 text-white px-4 py-2 text-center text-sm font-semibold z-[10000] pointer-events-auto">
        <div className="flex items-center justify-center gap-2">
          <span>⚠️</span>
          <span>
            EVALUATION MODE - This is a public showcase. 
            <strong className="ml-1 cursor-pointer hover:underline" onClick={() => window.location.href = '/pricing'}>
              Purchase a license
            </strong>
            {' '}to unlock all features.
          </span>
          <span>⚠️</span>
        </div>
      </div>

      {/* Bottom Footer - Data Retention Warning */}
      <div className="fixed bottom-0 left-0 right-0 bg-gray-900 text-gray-300 px-4 py-2 text-center text-xs z-[10000]">
        <div className="flex items-center justify-center gap-4">
          <span>🔄 Session is ephemeral - data resets hourly</span>
          <span className="text-gray-600">•</span>
          <span>📊 Export disabled in evaluation mode</span>
          <span className="text-gray-600">•</span>
          <span>🔐 For commercial use, see licensing terms</span>
        </div>
      </div>

      {/* Corner Badge - Watermark Indicator */}
      <div className="fixed top-12 right-4 bg-orange-100 border-2 border-orange-500 text-orange-800 rounded-lg px-3 py-2 text-xs font-bold z-[9999] pointer-events-auto">
        <div className="flex flex-col items-center gap-1">
          <span className="text-lg">🎭</span>
          <span>SHOWCASE</span>
          <span className="text-2xs">EVALUATION</span>
        </div>
      </div>

      {/* Restricted Features Overlay - Shows on Premium Feature Access Attempts */}
      <FeatureRestrictionNotice />
    </>
  );
};

/**
 * FeatureRestrictionNotice
 * Displays when user tries to access premium features in evaluation mode
 */
const FeatureRestrictionNotice: React.FC = () => {
  const [isVisible, setIsVisible] = useState(false);
  const [featureName, setFeatureName] = useState('');

  useEffect(() => {
    // Listen for feature restriction events
    const handleFeatureRestricted = (event: CustomEvent) => {
      setFeatureName(event.detail?.featureName || 'Premium Feature');
      setIsVisible(true);
      setTimeout(() => setIsVisible(false), 5000);
    };

    window.addEventListener('featureRestricted', handleFeatureRestricted as EventListener);
    return () => window.removeEventListener('featureRestricted', handleFeatureRestricted as EventListener);
  }, []);

  if (!isVisible) return null;

  return (
    <div className="fixed top-32 left-1/2 transform -translate-x-1/2 bg-white border-l-4 border-orange-500 shadow-lg rounded-lg p-4 z-[11000] max-w-md">
      <div className="flex items-start gap-3">
        <div className="text-2xl">🔒</div>
        <div className="flex-1">
          <h3 className="font-bold text-gray-800 mb-1">{featureName} is Restricted</h3>
          <p className="text-sm text-gray-600 mb-3">
            This feature is only available with a paid license.
          </p>
          <div className="flex gap-2">
            <button 
              onClick={() => window.location.href = '/pricing'}
              className="bg-orange-500 hover:bg-orange-600 text-white px-4 py-2 rounded text-sm font-semibold"
            >
              View Pricing
            </button>
            <button 
              onClick={() => setIsVisible(false)}
              className="bg-gray-200 hover:bg-gray-300 text-gray-800 px-4 py-2 rounded text-sm"
            >
              Dismiss
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

/**
 * Hook to trigger feature restriction notification
 */
export const useFeatureRestriction = () => {
  return (featureName: string) => {
    const event = new CustomEvent('featureRestricted', {
      detail: { featureName },
    });
    window.dispatchEvent(event);
  };
};

export default CopyrightWatermark;
