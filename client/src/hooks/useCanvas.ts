import { useCallback, useState } from 'react';
import { CanvasState, Point } from '../components/editor/types';

export const useCanvas = (initialWidth: number = 512, initialHeight: number = 512) => {
  const [canvasState, setCanvasState] = useState<CanvasState>({
    width: initialWidth,
    height: initialHeight,
    scale: 1
  });

  const calculateScale = useCallback((containerWidth: number, containerHeight: number) => {
    const scaleX = (containerWidth - 40) / initialWidth;
    const scaleY = (containerHeight - 100) / initialHeight;
    return Math.min(scaleX, scaleY, 1);
  }, [initialWidth, initialHeight]);

  const resizeCanvas = useCallback((containerWidth: number, containerHeight: number) => {
    const scale = calculateScale(containerWidth, containerHeight);
    setCanvasState({
      width: Math.floor(initialWidth * scale),
      height: Math.floor(initialHeight * scale),
      scale
    });
  }, [calculateScale, initialWidth, initialHeight]);

  const convertToCanvasCoords = useCallback((point: Point, canvas: HTMLCanvasElement): Point => {
    const rect = canvas.getBoundingClientRect();
    return {
      x: (point.x - rect.left) / canvasState.scale,
      y: (point.y - rect.top) / canvasState.scale
    };
  }, [canvasState.scale]);

  return {
    canvasState,
    resizeCanvas,
    convertToCanvasCoords
  };
};