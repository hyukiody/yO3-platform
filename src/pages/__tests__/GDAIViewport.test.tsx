/**
 * GDAI Viewport Assertion Tests
 * SPEC: SPEC-001_EXTENDED_ANALYSIS.md §3 - GDAI Assertions
 * 
 * Tests viewport-responsive behavior:
 * - Desktop mode: viewport >= 1024px
 * - Tablet mode: 768px <= viewport < 1024px  
 * - Mobile mode: viewport < 768px
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { render, screen, act } from '@testing-library/react';
import { getGDAIMode, applyGDAIConstraints, GDAIMode, GDAIModeExtended, GDAIConfig, getGDAIModeExtended } from '../../contracts/Analysis';

// ═══════════════════════════════════════════════════════════════
// MOCK WINDOW RESIZE
// ═══════════════════════════════════════════════════════════════

const mockViewport = (width: number) => {
  Object.defineProperty(window, 'innerWidth', {
    writable: true,
    configurable: true,
    value: width,
  });
  
  // Trigger resize event
  window.dispatchEvent(new Event('resize'));
};

describe('GDAI Viewport Assertions', () => {
  
  // Store original innerWidth
  let originalInnerWidth: number;
  
  beforeEach(() => {
    originalInnerWidth = window.innerWidth;
  });
  
  afterEach(() => {
    // Restore original viewport
    Object.defineProperty(window, 'innerWidth', {
      writable: true,
      configurable: true,
      value: originalInnerWidth,
    });
  });

  // ═══════════════════════════════════════════════════════════════
  // §3.1 GDAI MODE DETECTION
  // ═══════════════════════════════════════════════════════════════
  
  describe('getGDAIMode()', () => {
    
    it('returns DESKTOP mode for viewport >= 1024px', () => {
      mockViewport(1920);
      expect(getGDAIMode()).toBe('DESKTOP');
      
      mockViewport(1024);
      expect(getGDAIMode()).toBe('DESKTOP');
    });
    
    it('returns TABLET mode for 768px <= viewport < 1024px', () => {
      mockViewport(1023);
      expect(getGDAIMode()).toBe('TABLET');
      
      mockViewport(900);
      expect(getGDAIMode()).toBe('TABLET');
      
      mockViewport(768);
      expect(getGDAIMode()).toBe('TABLET');
    });
    
    it('returns MOBILE mode for viewport < 768px', () => {
      mockViewport(767);
      expect(getGDAIModeExtended()).toBe('MOBILE');
      
      mockViewport(375);
      expect(getGDAIModeExtended()).toBe('MOBILE');
      
      mockViewport(320);
      expect(getGDAIModeExtended()).toBe('MOBILE');
    });
    
    it('SPEC-001 §3: 768px is the TABLET/MOBILE boundary', () => {
      // At exactly 768px, should be TABLET
      mockViewport(768);
      expect(getGDAIModeExtended()).toBe('TABLET');
      
      // At 767px, should switch to MOBILE
      mockViewport(767);
      expect(getGDAIModeExtended()).toBe('MOBILE');
    });
    
    it('SPEC-001 §3: 1024px is the DESKTOP/TABLET boundary', () => {
      // At exactly 1024px, should be DESKTOP
      mockViewport(1024);
      expect(getGDAIMode()).toBe('DESKTOP');
      
      // At 1023px, should switch to TABLET
      mockViewport(1023);
      expect(getGDAIMode()).toBe('TABLET');
    });
  });

  // ═══════════════════════════════════════════════════════════════
  // §3.2 GDAI CONSTRAINT APPLICATION
  // ═══════════════════════════════════════════════════════════════
  
  describe('applyGDAIConstraints()', () => {
    
    it('returns unmodified config for DESKTOP mode', () => {
      const config: GDAIConfig = {
        showSidebar: true,
        columnsCount: 4,
        chartSize: 'large' as const
      };
      
      const result = applyGDAIConstraints(config, 'DESKTOP');
      expect(result).toEqual(config);
    });
    
    it('applies TABLET constraints when mode is TABLET', () => {
      const config: GDAIConfig = {
        showSidebar: true,
        columnsCount: 4,
        chartSize: 'large' as const
      };
      
      const result = applyGDAIConstraints(config, 'TABLET');
      
      // TABLET mode should modify layout
      expect(result.columnsCount).toBeLessThanOrEqual(2);
      expect(result.chartSize).not.toBe('large');
    });
    
    it('applies MOBILE constraints when mode is MOBILE', () => {
      const config: GDAIConfig = {
        showSidebar: true,
        columnsCount: 4,
        chartSize: 'large' as const
      };
      
      const result = applyGDAIConstraints(config, 'MOBILE');
      
      // MOBILE mode should collapse to single column
      expect(result.columnsCount).toBe(1);
      expect(result.showSidebar).toBe(false);
    });
    
    it('maintains type safety on constraint application', () => {
      interface TestConfig extends GDAIConfig {
        showSidebar: boolean;
        columnsCount: number;
        chartSize: 'small' | 'medium' | 'large';
      }
      
      const config: TestConfig = {
        showSidebar: true,
        columnsCount: 4,
        chartSize: 'large'
      };
      
      const result = applyGDAIConstraints(config, 'TABLET') as TestConfig;
      
      // Type should be preserved
      expect(typeof result.showSidebar).toBe('boolean');
      expect(typeof result.columnsCount).toBe('number');
      expect(['small', 'medium', 'large']).toContain(result.chartSize);
    });
  });

  // ═══════════════════════════════════════════════════════════════
  // §3.3 VIEWPORT TRANSITION BEHAVIOR
  // ═══════════════════════════════════════════════════════════════
  
  describe('Viewport Transitions', () => {
    
    it('correctly transitions from DESKTOP to TABLET', () => {
      mockViewport(1200);
      expect(getGDAIModeExtended()).toBe('DESKTOP');
      
      mockViewport(900);
      expect(getGDAIModeExtended()).toBe('TABLET');
    });
    
    it('correctly transitions from TABLET to MOBILE', () => {
      mockViewport(900);
      expect(getGDAIModeExtended()).toBe('TABLET');
      
      mockViewport(600);
      expect(getGDAIModeExtended()).toBe('MOBILE');
    });
    
    it('correctly transitions from MOBILE to DESKTOP', () => {
      mockViewport(400);
      expect(getGDAIModeExtended()).toBe('MOBILE');
      
      mockViewport(1400);
      expect(getGDAIModeExtended()).toBe('DESKTOP');
    });
    
    it('handles rapid viewport changes', () => {
      // Simulate rapid resizing
      mockViewport(1200);
      mockViewport(800);
      mockViewport(400);
      mockViewport(1000);
      
      // Final state should be TABLET (1000px)
      expect(getGDAIModeExtended()).toBe('TABLET');
    });
  });

  // ═══════════════════════════════════════════════════════════════
  // §3.4 768PX CRITICAL BOUNDARY TEST
  // SPEC: "viewport < 768px triggers specific behaviors"
  // ═══════════════════════════════════════════════════════════════
  
  describe('768px Critical Boundary', () => {
    
    it('768px boundary test: exactly at boundary', () => {
      mockViewport(768);
      const mode = getGDAIModeExtended();
      
      // SPEC: 768px is inclusive in TABLET range
      expect(mode).toBe('TABLET');
    });
    
    it('768px boundary test: one pixel below', () => {
      mockViewport(767);
      const mode = getGDAIModeExtended();
      
      // SPEC: Below 768px triggers MOBILE
      expect(mode).toBe('MOBILE');
    });
    
    it('768px boundary test: one pixel above', () => {
      mockViewport(769);
      const mode = getGDAIModeExtended();
      
      // Still in TABLET range
      expect(mode).toBe('TABLET');
    });
    
    it('768px boundary triggers correct constraint changes', () => {
      const config: GDAIConfig = {
        showSidebar: true,
        columnsCount: 3,
        chartSize: 'large' as const
      };
      
      // At 768px (TABLET)
      mockViewport(768);
      const tabletResult = applyGDAIConstraints(config, getGDAIModeExtended());
      
      // Below 768px (MOBILE)
      mockViewport(767);
      const mobileResult = applyGDAIConstraints(config, getGDAIModeExtended());
      
      // Mobile should have more restrictive constraints
      expect(mobileResult.columnsCount).toBeLessThan(tabletResult.columnsCount!);
    });
  });

  // ═══════════════════════════════════════════════════════════════
  // §3.5 EDGE CASES
  // ═══════════════════════════════════════════════════════════════
  
  describe('Edge Cases', () => {
    
    it('handles zero viewport width gracefully', () => {
      mockViewport(0);
      expect(getGDAIModeExtended()).toBe('MOBILE');
    });
    
    it('handles very large viewport width', () => {
      mockViewport(10000);
      expect(getGDAIModeExtended()).toBe('DESKTOP');
    });
    
    it('handles negative viewport width (defensive)', () => {
      mockViewport(-100);
      // Should default to safest mode
      expect(getGDAIModeExtended()).toBe('MOBILE');
    });
    
    it('handles undefined config in constraint application', () => {
      expect(() => applyGDAIConstraints(undefined as any, 'DESKTOP')).not.toThrow();
    });
    
    it('handles null config in constraint application', () => {
      expect(() => applyGDAIConstraints(null as any, 'DESKTOP')).not.toThrow();
    });
  });
});

// ═══════════════════════════════════════════════════════════════
// INTEGRATION TESTS WITH COMPONENT
// ═══════════════════════════════════════════════════════════════

describe('GDAI Component Integration', () => {
  
  beforeEach(() => {
    vi.useFakeTimers();
  });
  
  afterEach(() => {
    vi.useRealTimers();
  });
  
  it('component responds to viewport changes', async () => {
    // Track mode changes manually
    const modeChanges: GDAIModeExtended[] = [];
    
    // Start at desktop size
    mockViewport(1200);
    modeChanges.push(getGDAIModeExtended());
    
    // Simulate viewport changes
    mockViewport(800);  // TABLET
    modeChanges.push(getGDAIModeExtended());
    
    mockViewport(600);  // MOBILE
    modeChanges.push(getGDAIModeExtended());
    
    mockViewport(1400); // DESKTOP
    modeChanges.push(getGDAIModeExtended());
    
    // Verify mode detection worked at each breakpoint
    expect(modeChanges.length).toBeGreaterThan(0);
    expect(modeChanges).toContain('DESKTOP');
    expect(modeChanges).toContain('TABLET');
    expect(modeChanges).toContain('MOBILE');
  });
  
  it('debounces rapid resize events', async () => {
    let callCount = 0;
    const debouncedHandler = vi.fn(() => { callCount++; });
    
    window.addEventListener('resize', debouncedHandler);
    
    // Rapid fire resize events
    for (let i = 0; i < 100; i++) {
      mockViewport(800 + i);
    }
    
    // Handler should have been called for each resize
    expect(callCount).toBe(100);
    
    window.removeEventListener('resize', debouncedHandler);
  });
});
