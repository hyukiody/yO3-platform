import { test, expect, describe, beforeEach, afterEach, vi } from 'vitest';
import detectionEventService, { DetectionEventDTO } from '../services/DetectionEventService';

describe('DetectionEventService - End-to-End Integration', () => {
  let mockWebSocket: any;
  let mockEventSource: any;

  beforeEach(() => {
    // Reset singleton state
    detectionEventService.disconnect();
    
    // Mock WebSocket
    mockWebSocket = {
      send: vi.fn(),
      close: vi.fn(),
      readyState: WebSocket.OPEN,
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
    };

    // Mock EventSource
    mockEventSource = {
      close: vi.fn(),
      readyState: EventSource.OPEN,
      addEventListener: vi.fn(),
    };

    global.WebSocket = vi.fn(() => mockWebSocket) as any;
    global.EventSource = vi.fn(() => mockEventSource) as any;
  });

  afterEach(() => {
    detectionEventService.disconnect();
    vi.clearAllMocks();
  });

  describe('WebSocket Connection', () => {
    test('should establish WebSocket connection with correct URL', () => {
      // Act
      detectionEventService.connect({ cameraId: 'camera-001' });

      // Assert
      expect(WebSocket).toHaveBeenCalledTimes(1);
      const wsUrl = (WebSocket as any).mock.calls[0][0];
      expect(wsUrl).toContain('/ws/detections');
      expect(wsUrl).toContain('cameraId=camera-001');
    });

    test('should send authentication token on connection', () => {
      // Arrange
      localStorage.setItem('token', 'test-jwt-token');

      // Act
      detectionEventService.connect();
      
      // Simulate WebSocket open event
      const onOpenHandler = mockWebSocket.addEventListener.mock.calls.find(
        (call: any) => call[0] === 'open'
      )?.[1];
      onOpenHandler?.();

      // Assert
      expect(mockWebSocket.send).toHaveBeenCalledWith(
        JSON.stringify({ type: 'AUTH', token: 'test-jwt-token' })
      );
    });

    test('should subscribe with filters', () => {
      // Act
      detectionEventService.connect({
        cameraId: 'camera-001',
        minConfidence: 0.8,
      });

      // Simulate WebSocket open event
      const onOpenHandler = mockWebSocket.addEventListener.mock.calls.find(
        (call: any) => call[0] === 'open'
      )?.[1];
      onOpenHandler?.();

      // Assert
      const subscribeCall = mockWebSocket.send.mock.calls.find((call: any) => {
        const data = JSON.parse(call[0]);
        return data.type === 'SUBSCRIBE';
      });

      expect(subscribeCall).toBeDefined();
      const subscribeData = JSON.parse(subscribeCall[0]);
      expect(subscribeData.filters.cameraId).toBe('camera-001');
      expect(subscribeData.filters.minConfidence).toBe(0.8);
    });
  });

  describe('Event Reception', () => {
    test('should receive and parse detection events', () => {
      return new Promise<void>((resolve) => {
        // Arrange
        const mockEvent: DetectionEventDTO = {
          id: '1',
          eventId: 'evt-001',
          cameraId: 'camera-001',
          deviceId: 'camera-001',
          eventType: 'person',
          objectType: 'person',
          confidence: 0.95,
          timestamp: Date.now(),
          status: 'PROCESSED',
        };

        // Act
        detectionEventService.connect();
        detectionEventService.subscribe('test-subscriber', (event) => {
          // Assert
          expect(event.eventId).toBe('evt-001');
          expect(event.objectType).toBe('person');
          expect(event.confidence).toBe(0.95);
          resolve();
        });

        // Simulate incoming WebSocket message
        const onMessageHandler = mockWebSocket.addEventListener.mock.calls.find(
          (call: any) => call[0] === 'message'
        )?.[1];

        onMessageHandler?.({
          data: JSON.stringify({
            type: 'DETECTION_EVENT',
            payload: mockEvent,
          }),
        });
      });
    });

    test('should normalize bounding box coordinates', () => {
      return new Promise<void>((resolve) => {
        // Arrange
        const mockBackendEvent = {
          id: 1,
          eventId: 'evt-002',
          eventType: 'car',
          confidence: 0.88,
          bboxX: 150,
          bboxY: 200,
          bboxWidth: 300,
          bboxHeight: 400,
          timestamp: new Date().toISOString(),
          source: { deviceId: 'camera-002' },
          status: 'PROCESSED',
        };

        // Act
        detectionEventService.connect();
        detectionEventService.subscribe('test-subscriber', (event) => {
          // Assert
          expect(event.bbox).toBeDefined();
          expect(event.bbox!.x).toBe(0.15); // 150/1000
          expect(event.bbox!.y).toBe(0.2);  // 200/1000
          expect(event.bbox!.width).toBe(0.3);  // 300/1000
          expect(event.bbox!.height).toBe(0.4); // 400/1000
          resolve();
        });

        // Simulate incoming message
        const onMessageHandler = mockWebSocket.addEventListener.mock.calls.find(
          (call: any) => call[0] === 'message'
        )?.[1];

        onMessageHandler?.({
          data: JSON.stringify({
            type: 'DETECTION_EVENT',
            payload: mockBackendEvent,
          }),
        });
      });
    });
  });

  describe('Error Handling', () => {
    test('should handle WebSocket errors', () => {
      // Arrange
      const errorHandler = vi.fn();

      // Act
      detectionEventService.connect();
      detectionEventService.onError(errorHandler);

      // Simulate WebSocket error
      const onErrorHandler = mockWebSocket.addEventListener.mock.calls.find(
        (call: any) => call[0] === 'error'
      )?.[1];
      onErrorHandler?.({ message: 'Connection failed' });

      // Assert
      expect(errorHandler).toHaveBeenCalled();
    });

    test('should attempt reconnection on connection close', () => {
      vi.useFakeTimers();

      // Act
      detectionEventService.connect();

      // Simulate WebSocket close
      const onCloseHandler = mockWebSocket.addEventListener.mock.calls.find(
        (call: any) => call[0] === 'close'
      )?.[1];
      onCloseHandler?.();

      // Fast-forward timers
      vi.advanceTimersByTime(1000);

      // Assert - Should attempt to reconnect
      expect(WebSocket).toHaveBeenCalledTimes(2);

      vi.useRealTimers();
    });

    test('should stop reconnection after max attempts', () => {
      vi.useFakeTimers();

      // Act
      detectionEventService.connect();

      // Simulate 5 failed connections
      for (let i = 0; i < 5; i++) {
        const onCloseHandler = mockWebSocket.addEventListener.mock.calls.find(
          (call: any) => call[0] === 'close'
        )?.[1];
        onCloseHandler?.();
        vi.advanceTimersByTime(Math.pow(2, i) * 1000);
      }

      // Assert - Should stop after 5 attempts
      expect(WebSocket).toHaveBeenCalledTimes(6); // 1 initial + 5 retries

      vi.useRealTimers();
    });
  });

  describe('Subscription Management', () => {
    test('should manage multiple subscribers', () => {
      const subscriber1 = vi.fn();
      const subscriber2 = vi.fn();

      // Act
      detectionEventService.connect();
      detectionEventService.subscribe('sub1', subscriber1);
      detectionEventService.subscribe('sub2', subscriber2);

      // Simulate incoming event
      const onMessageHandler = mockWebSocket.addEventListener.mock.calls.find(
        (call: any) => call[0] === 'message'
      )?.[1];

      onMessageHandler?.({
        data: JSON.stringify({
          type: 'DETECTION_EVENT',
          payload: {
            eventId: 'evt-003',
            eventType: 'dog',
            confidence: 0.92,
            timestamp: Date.now(),
            source: { deviceId: 'camera-003' },
            status: 'PROCESSED',
          },
        }),
      });

      // Assert
      expect(subscriber1).toHaveBeenCalledTimes(1);
      expect(subscriber2).toHaveBeenCalledTimes(1);
    });

    test('should unsubscribe correctly', () => {
      const subscriber = vi.fn();

      // Act
      detectionEventService.connect();
      detectionEventService.subscribe('sub1', subscriber);
      detectionEventService.unsubscribe('sub1');

      // Simulate incoming event
      const onMessageHandler = mockWebSocket.addEventListener.mock.calls.find(
        (call: any) => call[0] === 'message'
      )?.[1];

      onMessageHandler?.({
        data: JSON.stringify({
          type: 'DETECTION_EVENT',
          payload: { eventId: 'evt-004' },
        }),
      });

      // Assert
      expect(subscriber).not.toHaveBeenCalled();
    });
  });

  describe('SSE Fallback', () => {
    test('should fallback to SSE if WebSocket fails', () => {
      // Arrange - Make WebSocket fail
      global.WebSocket = vi.fn(() => {
        throw new Error('WebSocket not supported');
      }) as any;

      // Act
      detectionEventService.connect();

      // Assert
      expect(EventSource).toHaveBeenCalledTimes(1);
      const sseUrl = (EventSource as any).mock.calls[0][0];
      expect(sseUrl).toContain('/api/detections/stream');
    });

    test('should receive events via SSE', () => {
      return new Promise<void>((resolve) => {
        // Arrange - Force SSE mode
        global.WebSocket = vi.fn(() => {
          throw new Error('WebSocket not supported');
        }) as any;

        const mockEvent = {
          eventId: 'evt-005',
          eventType: 'bicycle',
          confidence: 0.87,
          timestamp: Date.now(),
          source: { deviceId: 'camera-004' },
          status: 'PROCESSED',
        };

        // Act
        detectionEventService.connect();
        detectionEventService.subscribe('sse-test', (event) => {
          // Assert
          expect(event.eventId).toBe('evt-005');
          expect(event.objectType).toBe('bicycle');
          resolve();
        });

        // Simulate SSE event
        const detectionListener = mockEventSource.addEventListener.mock.calls.find(
          (call: any) => call[0] === 'detection'
        )?.[1];

        detectionListener?.({
          data: JSON.stringify(mockEvent),
        });
      });
    });
  });

  describe('Cleanup', () => {
    test('should cleanup on disconnect', () => {
      // Act
      detectionEventService.connect();
      detectionEventService.subscribe('sub1', vi.fn());
      detectionEventService.subscribe('sub2', vi.fn());
      detectionEventService.disconnect();

      // Assert
      expect(mockWebSocket.close).toHaveBeenCalled();
      expect(detectionEventService.isConnected()).toBe(false);
    });
  });
});
