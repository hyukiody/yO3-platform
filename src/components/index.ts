/**
 * @fileoverview Central barrel export for all UI components.
 * 
 * This module re-exports components from domain-specific modules,
 * providing a single entry point for importing UI components.
 * 
 * @example
 * // Import from domain-specific modules (preferred)
 * import { AgentInsightPanel } from '@components/agent';
 * import { DevicePairing } from '@components/device';
 * 
 * // Or import directly from central barrel
 * import { AgentInsightPanel, DevicePairing } from '@components';
 * 
 * @module components
 */

// ============================================================================
// Agent Components - AI-powered insight and monitoring
// ============================================================================
export {
  AgentInsightPanel,
  getProtocolColor,
  getProtocolLabel,
  ProtocolTimeline,
  VisionEngineStatus,
} from './agent';

export type {
  AgentInsight,
  ProtocolEvent,
  VisionEngineHealth,
} from './agent';

// ============================================================================
// Device Components - Hardware management and pairing
// ============================================================================
export {
  DevicePairing,
  DeviceList,
  CameraManager,
} from './device';

// ============================================================================
// Video Components - Streaming and playback
// ============================================================================
export {
  VideoPlayer,
  VideoFeedPlayer,
  SecureVideoPlayer,
  UniversalSecurePlayer,
} from './video';

// ============================================================================
// Re-export domain modules for selective imports
// ============================================================================
export * as agent from './agent';
export * as device from './device';
export * as video from './video';
