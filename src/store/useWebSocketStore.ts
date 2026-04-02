import { create } from 'zustand';
import { Client } from '@stomp/stompjs';
import SockJS from 'sockjs-client';
import { mapTelemetryDTOtoDomain } from '../infrastructure/api/mappers/telemetryMapper';

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
  client: Client | null;
  
  // Actions
  connect: () => void;
  disconnect: () => void;
  setConnectionStatus: (status: boolean) => void;
  updateTelemetry: (cameraId: string, data: TelemetryData) => void;
  incrementStreams: () => void;
  decrementStreams: () => void;
}

/**
 * High-Performance Telemetry Store
 * Managed using @stomp/stompjs strictly through the API Gateway (Port 8091)
 */
export const useWebSocketStore = create<WebSocketState>((set, get) => ({
  isConnected: false,
  activeStreams: 0,
  latestTelemetry: {},
  client: null,

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

  connect: () => {
    const existingClient = get().client;
    if (existingClient?.active) return;

    // Implementation: Transport Protocol Replacement (Directive 2)
    // Point exclusively to the API Gateway at :8091
    const token = localStorage.getItem('yo3_token');
    const socket = new SockJS(`http://localhost:8091/ws`);

    const client = new Client({
      webSocketFactory: () => socket,
      connectHeaders: {
        Authorization: `Bearer ${token}`
      },
      debug: (str) => {
        if (process.env.NODE_ENV === 'development') console.debug('STOMP: ', str);
      },
      reconnectDelay: 5000,
      heartbeatIncoming: 4000,
      heartbeatOutgoing: 4000,
    });

    client.onConnect = () => {
      set({ isConnected: true, client });
      console.log('✓ STOMP Gateway Connected (Port 8091)');

      // Automatically subscribe to the telemetry topic managed by Directive 2
      client.subscribe('/topic/telemetry', (message) => {
        try {
          const payload = JSON.parse(message.body);
          const cameraId = payload.cameraId;
          
          // Implementation: Anti-Corruption Layer (Directive 3)
          // Map raw backend JSONB telemetry to normalized continuous tuples [x, y, w, h]
          const detections = Array.isArray(payload.detections) 
            ? payload.detections.map(mapTelemetryDTOtoDomain)
            : [];

          get().updateTelemetry(cameraId, {
            id: payload.id,
            timestamp: payload.timestamp,
            cameraId,
            detections
          });
        } catch (err) {
          console.error('Failed to parse STOMP telemetry payload:', err);
        }
      });
    };

    client.onDisconnect = () => {
      set({ isConnected: false });
      console.warn('STOMP Gateway Disconnected');
    };

    client.onStompError = (frame) => {
      console.error('STOMP Protocol Error:', frame.headers['message']);
      console.debug('STOMP Details:', frame.body);
    };

    client.activate();
  },

  disconnect: () => {
    const { client } = get();
    if (client) {
      client.deactivate();
      set({ isConnected: false, client: null });
    }
  }
}));
