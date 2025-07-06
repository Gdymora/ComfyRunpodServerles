import { useCallback, useRef } from 'react';
import { BrushSettings, Point } from '../components/editor/types';

export const useBrush = (settings: BrushSettings) => {
  const lastPoint = useRef<Point | null>(null);

  const drawBrush = useCallback((
    ctx: CanvasRenderingContext2D,
    point: Point,
    settings: BrushSettings
  ) => {
    ctx.beginPath();
    ctx.arc(point.x, point.y, settings.size, 0, Math.PI * 2);
    ctx.fillStyle = settings.isPositiveMode ? 'rgba(0, 0, 255, 0.5)' : 'rgba(255, 0, 0, 0.5)';
    ctx.fill();
  }, []);

  const drawLine = useCallback((
    ctx: CanvasRenderingContext2D,
    start: Point,
    end: Point,
    settings: BrushSettings
  ) => {
    const dist = Math.sqrt(Math.pow(end.x - start.x, 2) + Math.pow(end.y - start.y, 2));
    const angle = Math.atan2(end.y - start.y, end.x - start.x);
    
    for (let i = 0; i < dist; i += settings.size / 2) {
      const x = start.x + (Math.cos(angle) * i);
      const y = start.y + (Math.sin(angle) * i);
      drawBrush(ctx, { x, y }, settings);
    }
  }, [drawBrush]);

  const handleDrawing = useCallback((
    ctx: CanvasRenderingContext2D,
    point: Point
  ) => {
    if (lastPoint.current) {
      drawLine(ctx, lastPoint.current, point, settings);
    } else {
      drawBrush(ctx, point, settings);
    }
    lastPoint.current = point;
  }, [drawBrush, drawLine, settings]);

  const startDrawing = useCallback((point: Point) => {
    lastPoint.current = point;
  }, []);

  const stopDrawing = useCallback(() => {
    lastPoint.current = null;
  }, []);

  return {
    handleDrawing,
    startDrawing,
    stopDrawing
  };
};