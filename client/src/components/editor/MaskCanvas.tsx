// src/components/editor/MaskCanvas.tsx
import  { useEffect } from 'react';
import { ImageInfo } from '../../types/image';
import { getImageUrl, loadImage } from '../../utils/maskEditorUtils';

interface MaskCanvasProps {
  initialImage: ImageInfo;
  canvasWidth: number;
  canvasHeight: number;
  disabled: boolean;
  imageCanvasRef: React.RefObject<HTMLCanvasElement>;
  maskCanvasRef: React.RefObject<HTMLCanvasElement>;
  brushPreviewRef: React.RefObject<HTMLDivElement>;
  containerRef: React.RefObject<HTMLDivElement>;
  containerSize: { width: number, height: number };
  brushSize: number;
  eraserSize: number;
  activeTool: string;
  isDrawing: boolean;
  onImageLoaded: (loaded: boolean) => void;
  onPointerDown: (e: React.PointerEvent) => void;
  onPointerMove: (e: React.PointerEvent) => void;
  onPointerUp: () => void;
}

const MaskCanvas: React.FC<MaskCanvasProps> = ({
  initialImage,
  canvasWidth,
  canvasHeight,
  disabled,
  imageCanvasRef,
  maskCanvasRef,
  brushPreviewRef,
  containerRef,
  containerSize,
  brushSize,
  eraserSize,
  activeTool,
  isDrawing,
  onImageLoaded,
  onPointerDown,
  onPointerMove,
  onPointerUp
}) => {
  // Ефект для завантаження зображення
  useEffect(() => {
    const loadInitialImage = async () => {
      if (!imageCanvasRef.current || !initialImage) return;

      const ctx = imageCanvasRef.current.getContext('2d');
      if (!ctx) return;

      try {
        onImageLoaded(false);
        
        const imageUrl = getImageUrl(initialImage);
        console.log("Завантаження зображення за URL:", imageUrl);
        
        const img = await loadImage(imageUrl);
        console.log("Зображення успішно завантажено, розміри:", img.width, img.height);

        // Очищаємо canvas
        ctx.clearRect(0, 0, canvasWidth, canvasHeight);

        // Малюємо зображення зі збереженням пропорцій
        let drawWidth = canvasWidth;
        let drawHeight = canvasHeight;
        let offsetX = 0;
        let offsetY = 0;

        // Збереження пропорцій
        const aspectRatio = img.height / img.width;

        if (img.width > img.height) {
          // Більш широке зображення
          drawHeight = canvasWidth * aspectRatio;
          offsetY = (canvasHeight - drawHeight) / 2;
        } else if (img.height > img.width) {
          // Більш високе зображення
          drawWidth = canvasHeight / aspectRatio;
          offsetX = (canvasWidth - drawWidth) / 2;
        }

        // Спочатку заповнюємо canvas чорним кольором
        ctx.fillStyle = "#000000";
        ctx.fillRect(0, 0, canvasWidth, canvasHeight);

        // Малюємо зображення з центруванням
        ctx.drawImage(img, offsetX, offsetY, drawWidth, drawHeight);
        
        // Ініціалізуємо canvas маски
        if (maskCanvasRef.current) {
          const maskCtx = maskCanvasRef.current.getContext('2d');
          if (maskCtx) {
            maskCanvasRef.current.width = canvasWidth;
            maskCanvasRef.current.height = canvasHeight;
            maskCtx.clearRect(0, 0, canvasWidth, canvasHeight);
          }
        }

        onImageLoaded(true);
      } catch (error) {
        console.error("Помилка завантаження зображення:", error);
        onImageLoaded(false);
      }
    };

    loadInitialImage();
  }, [initialImage, canvasWidth, canvasHeight, imageCanvasRef, maskCanvasRef, onImageLoaded]);

  return (
    <div
      ref={containerRef}
      className="relative mx-auto"
      style={{
        width: `${containerSize.width}px`,
        height: `${containerSize.height}px`,
        border: "1px solid #444",
        overflow: "hidden",
      }}
    >
      <canvas
        ref={imageCanvasRef}
        width={canvasWidth}
        height={canvasHeight}
        className="absolute top-0 left-0"
        style={{ width: "100%", height: "100%" }}
      />
      <canvas
        ref={maskCanvasRef}
        width={canvasWidth}
        height={canvasHeight}
        className="absolute top-0 left-0"
        style={{ 
          width: "100%", 
          height: "100%",
          cursor: disabled ? "not-allowed" : "crosshair" 
        }}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onPointerLeave={onPointerUp}
      />
      {/* Превью кисті */}
      <div
        ref={brushPreviewRef}
        className="fixed pointer-events-none z-50"
        style={{
          width: `${
            activeTool === "eraser"
              ? eraserSize * 2
              : brushSize * 2
          }px`,
          height: `${
            activeTool === "eraser"
              ? eraserSize * 2
              : brushSize * 2
          }px`,
          borderRadius: "50%",
          border: `2px solid ${
            activeTool === "eraser" ? "skyblue" : "pink"
          }`,
          backgroundColor:
            activeTool === "eraser"
              ? "rgba(0, 0, 255, 0.2)"
              : "rgba(255, 0, 0, 0.2)",
          display: disabled ? "none" : "flex", // Приховуємо при блокуванні
          justifyContent: "center",
          alignItems: "center",
        }}
      ></div>
    </div>
  );
};

export default MaskCanvas;