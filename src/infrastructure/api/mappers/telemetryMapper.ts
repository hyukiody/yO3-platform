import { TelemetryDetection } from '../../../store/useWebSocketStore';

/**
 * Anti-Corruption Layer (ACL) - Telemetry Structural Mapper
 * Isolated from raw backend DTOs. Projects JSONB bounding boxes 
 * into mathematically continuous tuples.
 */

export interface BackendTelemetryDTO {
  id?: string;
  eventId: string;
  cameraId: string;
  eventType: string; // Used as label
  confidence: number;
  // Raw backend JSONB projection
  bbox?: {
    x: number;
    y: number;
    width: number;
    height: number;
  };
  // Alternative raw fields if coming from a different DTO version
  bboxX?: number;
  bboxY?: number;
  bboxWidth?: number;
  bboxHeight?: number;
}

/**
 * Maps raw backend detection DTOs to the React domain's normalized tuple [x, y, w, h].
 * Ensures the <canvas> renderer remains decoupled from backend schema drift.
 */
export const mapTelemetryDTOtoDomain = (dto: any): TelemetryDetection => {
  // Support both nested bbox objects and flat bboxX/Y properties
  const rawX = dto.bbox?.x ?? dto.bboxX ?? 0;
  const rawY = dto.bbox?.y ?? dto.bboxY ?? 0;
  const rawW = dto.bbox?.width ?? dto.bboxWidth ?? 0;
  const rawH = dto.bbox?.height ?? dto.bboxHeight ?? 0;

  // The backend uses 0-1000 for precision in some versions, 
  // or 0-1 for normalization. We'll ensure normalization here as per Directive 3.
  const normalize = (val: number) => (val > 1 ? val / 1000 : val);

  return {
    id: dto.id || dto.eventId,
    label: dto.eventType || dto.objectType || 'unknown',
    confidence: dto.confidence,
    // Directive 3: Project to mathematically continuous tuple [x, y, w, h]
    bbox: [
      normalize(rawX),
      normalize(rawY),
      normalize(rawW),
      normalize(rawH),
    ],
  };
};

export const mapDetectionEventPayload = (payload: any[]): TelemetryDetection[] => {
  if (!Array.isArray(payload)) return [];
  return payload.map(mapTelemetryDTOtoDomain);
};
