import React, { useEffect, useRef } from 'react';
import { useWebSocketStore } from '../../store/useWebSocketStore';

export interface NeuralTelemetryCanvasProps {
  cameraId: string;
  width: number;
  height: number;
}

export const NeuralTelemetryCanvas: React.FC<NeuralTelemetryCanvasProps> = ({ cameraId, width, height }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let animationFrameId: number;
    let isActive = true;

    // We pull colors from computed styles so they align with HSL variables
    const getThemeColor = (cssVar: string) => {
       const raw = getComputedStyle(document.documentElement).getPropertyValue(cssVar).trim();
       if (raw) return `hsl(${raw})`;
       return '#ff6600'; // fallback
    };

    const renderLoop = () => {
      if (!isActive) return;

      // Access state directly to bypass React reconciling
      const state = useWebSocketStore.getState();
      const telemetry = state.latestTelemetry[cameraId];

      // Clear context for new frame
      ctx.clearRect(0, 0, width, height);

      if (telemetry && Array.isArray(telemetry.detections)) {
        const primaryColor = getThemeColor('--color-primary');
        const bgColor = getThemeColor('--color-bg');

        telemetry.detections.forEach(det => {
          const [x, y, w, h] = det.bbox;
          // Assuming bbox values are normalized (0 to 1) for flexibility
          const absX = x * width;
          const absY = y * height;
          const absW = w * width;
          const absH = h * height;

          const boxColor = det.color || primaryColor;

          // 1. Draw geometric bounding box
          ctx.strokeStyle = boxColor;
          ctx.lineWidth = 2;
          ctx.strokeRect(absX, absY, absW, absH);

          // 2. Prepare text and label background
          const labelText = `${det.label} ${(det.confidence * 100).toFixed(0)}%`;
          ctx.font = '600 12px Inter, sans-serif';
          const textWidth = ctx.measureText(labelText).width;
          
          ctx.fillStyle = boxColor;
          ctx.fillRect(absX, absY - 22, textWidth + 8, 22);

          // 3. Draw high-contrast text
          ctx.fillStyle = bgColor;
          ctx.fillText(labelText, absX + 4, absY - 6);
        });
      }

      animationFrameId = requestAnimationFrame(renderLoop);
    };

    renderLoop();

    return () => {
      isActive = false;
      cancelAnimationFrame(animationFrameId);
    };
  }, [cameraId, width, height]);

  // Use Tailwind for absolute positioning on top of the video feed
  return (
    <canvas
      ref={canvasRef}
      width={width}
      height={height}
      className="absolute top-0 left-0 w-full h-full pointer-events-none z-10"
      aria-hidden="true"
    />
  );
};
