/**
 * Glass Box Architecture - Type Definitions
 * Real-time telemetry and system visualization types
 */

export interface ServiceHealth {
  name: string;
  status: 'online' | 'degraded' | 'offline';
  endpoint: string;
  latency: number;
  message: string;
}

export interface HealthData {
  timestamp: string;
  overallStatus: 'healthy' | 'degraded' | 'partial';
  services: ServiceHealth[];
}

export interface ApiRequestLog {
  timestamp: number;
  method: 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH';
  url: string;
  source: string;
  target: string;
  status: number;
  duration: number;
}

export interface DataFlowEvent {
  from: string;
  to: string;
  active: boolean;
  type: 'detection' | 'encryption' | 'storage' | 'query';
  timestamp: number;
}

export interface KeyTreeStatus {
  depth: number;
  epochDuration: number;
  currentEpoch: number;
  totalCapacity: number;
  lifespanYears: number;
  nextRotation: number;
  erasedEpochs: number[];
}

export interface DetectionFrame {
  timestamp: number;
  cameraId: string;
  detections: Array<{
    class: string;
    confidence: number;
    x: number;
    y: number;
    width: number;
    height: number;
  }>;
  frameData: string; // base64 encoded
}

export interface EncryptedBlob {
  timestamp: number;
  size: number;
  hexDump: string; // First 512 bytes as hex
  algorithm: string;
}
