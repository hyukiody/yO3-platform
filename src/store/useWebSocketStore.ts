import { create } from 'zustand'

export interface TelemetryDetection {
  label: string;
  confidence: number;
  bbox: [number, number, number, number]; // [x, y, width, height] as normalized coordinates 0-1
  id?: string;
  color?: string;
}

export interface TelemetryData {
  id: string;
  timestamp: number;
  cameraId: string;
  detections: TelemetryDetection[];
  fps?: number;
}

interface WebSocketState {
  isConnected: boolean;
  activeStreams: number;
  latestTelemetry: Record<string, TelemetryData>; // Keyed by cameraId
  setConnectionStatus: (status: boolean) => void;
  updateTelemetry: (cameraId: string, data: TelemetryData) => void;
  incrementStreams: () => void;
  decrementStreams: () => void;
}

export const useWebSocketStore = create<WebSocketState>((set) => ({
  isConnected: false,
  activeStreams: 0,
  latestTelemetry: {},
  setConnectionStatus: (status) => set({ isConnected: status }),
  updateTelemetry: (cameraId, data) => set((state) => ({
    latestTelemetry: {
      ...state.latestTelemetry,
      [cameraId]: data
    }
  })),
  incrementStreams: () => set((state) => ({ activeStreams: state.activeStreams + 1 })),
  decrementStreams: () => set((state) => ({ 
    activeStreams: Math.max(0, state.activeStreams - 1) 
  })),
}))
