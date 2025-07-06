import { forwardRef, useImperativeHandle, useRef, useState } from 'react';
import { MaskEditor } from './MaskEditor';
import { useDrawingHistory } from '../../hooks/useDrawingHistory';
import type { MaskEditorProps, MaskEditorRef, DrawingMode } from './types';

export const MaskEditorWithRef = forwardRef<MaskEditorRef, MaskEditorProps>(
  (props, ref) => {
    const maskCanvasRef = useRef<HTMLCanvasElement>(null);
    const { undo, clear } = useDrawingHistory();
    const [drawingMode, setDrawingMode] = useState<DrawingMode>('brush');

    useImperativeHandle(ref, () => ({
      clear: () => {
        const ctx = maskCanvasRef.current?.getContext('2d');
        if (ctx) {
          ctx.clearRect(0, 0, ctx.canvas.width, ctx.canvas.height);
          clear();
        }
      },
      undo: () => {
        const lastState = undo();
        if (lastState && maskCanvasRef.current) {
          const ctx = maskCanvasRef.current.getContext('2d');
          ctx?.putImageData(lastState, 0, 0);
        }
      },
      getCurrentMask: async () => {
        if (!maskCanvasRef.current) return null;
        
        // Фіксовані розміри для експорту маски
        const exportCanvas = document.createElement('canvas');
        exportCanvas.width = 512;
        exportCanvas.height = 512;
        const exportCtx = exportCanvas.getContext('2d');
        
        if (!exportCtx) return null;
        
        // Отримуємо дані з canvas маски
        const maskCtx = maskCanvasRef.current.getContext('2d');
        if (!maskCtx) return null;
        
        const maskData = maskCtx.getImageData(0, 0, maskCanvasRef.current.width, maskCanvasRef.current.height);
        
        // Підготовка правильної маски для ComfyUI (масштабування до 512x512)
        const finalData = exportCtx.createImageData(512, 512);
        
        // Масштабуємо маску до 512x512
        for (let y = 0; y < 512; y++) {
          for (let x = 0; x < 512; x++) {
            // Мапуємо координати 512x512 назад до розмірів поточного canvas
            const srcX = Math.floor(x * maskCanvasRef.current.width / 512);
            const srcY = Math.floor(y * maskCanvasRef.current.height / 512);
            
            // Індекс пікселя у вихідній масці
            const srcIdx = (srcY * maskCanvasRef.current.width + srcX) * 4;
            
            // Індекс пікселя у фінальній масці
            const targetIdx = (y * 512 + x) * 4;
            
            // Перевіряємо, чи є колір (від пензля)
            const hasColor = 
              srcIdx < maskData.data.length && 
              (maskData.data[srcIdx] > 0 || 
               maskData.data[srcIdx + 1] > 0 || 
               maskData.data[srcIdx + 2] > 0);
            
            // ComfyUI очікує білий (255,255,255) для замаскованих областей
            finalData.data[targetIdx] = hasColor ? 255 : 0;       // R
            finalData.data[targetIdx + 1] = hasColor ? 255 : 0;   // G
            finalData.data[targetIdx + 2] = hasColor ? 255 : 0;   // B
            finalData.data[targetIdx + 3] = 255;                  // A (завжди повністю непрозорий)
          }
        }
        
        exportCtx.putImageData(finalData, 0, 0);
        
        return new Promise<Blob>((resolve, reject) => {
          try {
            exportCanvas.toBlob((blob) => {
              if (blob) {
                resolve(blob);
              } else {
                reject(new Error('Failed to create blob'));
              }
            }, 'image/png');
          } catch (error) {
            reject(error);
          }
        });
      },
      setMode: (mode: DrawingMode) => {
        setDrawingMode(mode);
        // Тут можемо додати додаткову логіку при зміні режиму
      }
    }));

    // Передаємо всі props і додаємо посилання на canvas маски
    return <MaskEditor 
      {...props} 
      maskCanvasRef={maskCanvasRef} 
      drawingMode={drawingMode}
    />;
  }
);

MaskEditorWithRef.displayName = 'MaskEditorWithRef';