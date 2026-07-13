// src/components/MaskCanvas.tsx
// Легкий редактор маски для inpaint. Малюємо білим по чорному (біле = зона перемальовування).
// Експортує маску як base64 PNG у натуральній роздільній здатності зображення.
import React, { useEffect, useRef, useState } from "react";

interface MaskCanvasProps {
  /** data: URL вхідного зображення */
  imageUrl: string;
  disabled?: boolean;
  /** Викликається при зміні маски: чистий base64 (без data:) або null, якщо порожньо */
  onMaskChange: (maskBase64: string | null) => void;
}

export const MaskCanvas: React.FC<MaskCanvasProps> = ({
  imageUrl,
  disabled,
  onMaskChange,
}) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const drawing = useRef(false);
  const painted = useRef(false);
  const [brush, setBrush] = useState(60);
  const [dims, setDims] = useState<{ w: number; h: number } | null>(null);

  // Ініціалізація канви під натуральний розмір зображення (чорний фон)
  useEffect(() => {
    const img = new Image();
    img.onload = () => {
      setDims({ w: img.naturalWidth, h: img.naturalHeight });
      const c = canvasRef.current;
      if (!c) return;
      c.width = img.naturalWidth;
      c.height = img.naturalHeight;
      const ctx = c.getContext("2d");
      if (ctx) {
        ctx.fillStyle = "black";
        ctx.fillRect(0, 0, c.width, c.height);
      }
      painted.current = false;
      onMaskChange(null);
    };
    img.src = imageUrl;
    // onMaskChange стабільний з App; imageUrl — тригер
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [imageUrl]);

  const toCanvasCoords = (e: React.PointerEvent) => {
    const c = canvasRef.current!;
    const rect = c.getBoundingClientRect();
    return {
      x: ((e.clientX - rect.left) / rect.width) * c.width,
      y: ((e.clientY - rect.top) / rect.height) * c.height,
    };
  };

  const paintAt = (x: number, y: number) => {
    const ctx = canvasRef.current?.getContext("2d");
    if (!ctx) return;
    ctx.fillStyle = "white";
    ctx.beginPath();
    ctx.arc(x, y, brush / 2, 0, Math.PI * 2);
    ctx.fill();
    painted.current = true;
  };

  const emit = () => {
    const c = canvasRef.current;
    if (!c) return;
    if (!painted.current) return onMaskChange(null);
    onMaskChange(c.toDataURL("image/png").split(",")[1]);
  };

  const onDown = (e: React.PointerEvent) => {
    if (disabled) return;
    drawing.current = true;
    const { x, y } = toCanvasCoords(e);
    paintAt(x, y);
    (e.target as Element).setPointerCapture?.(e.pointerId);
  };
  const onMove = (e: React.PointerEvent) => {
    if (!drawing.current) return;
    const { x, y } = toCanvasCoords(e);
    paintAt(x, y);
  };
  const onUp = () => {
    if (!drawing.current) return;
    drawing.current = false;
    emit();
  };

  const clear = () => {
    const c = canvasRef.current;
    const ctx = c?.getContext("2d");
    if (c && ctx) {
      ctx.fillStyle = "black";
      ctx.fillRect(0, 0, c.width, c.height);
    }
    painted.current = false;
    onMaskChange(null);
  };

  return (
    <div className="space-y-2">
      <div
        className="relative w-full max-w-[480px] mx-auto rounded-lg overflow-hidden border border-gray-600 select-none"
        style={{ aspectRatio: dims ? `${dims.w} / ${dims.h}` : "3 / 4" }}
      >
        <img src={imageUrl} alt="джерело" className="absolute inset-0 w-full h-full object-contain pointer-events-none" />
        <canvas
          ref={canvasRef}
          onPointerDown={onDown}
          onPointerMove={onMove}
          onPointerUp={onUp}
          onPointerLeave={onUp}
          className="absolute inset-0 w-full h-full touch-none cursor-crosshair"
          style={{ opacity: 0.45 }}
        />
      </div>
      <div className="flex items-center gap-3 max-w-[480px] mx-auto">
        <span className="text-gray-300 text-sm">Пензель</span>
        <input
          type="range"
          min="10"
          max="200"
          value={brush}
          onChange={(e) => setBrush(Number(e.target.value))}
          disabled={disabled}
          className="flex-1 accent-purple-600"
        />
        <span className="text-gray-400 text-xs w-10">{brush}px</span>
        <button
          type="button"
          onClick={clear}
          disabled={disabled}
          className="bg-gray-600 hover:bg-gray-500 text-white text-sm px-3 py-1 rounded"
        >
          Очистити
        </button>
      </div>
      <p className="text-gray-500 text-xs text-center">
        Замалюйте білим ділянку, яку треба перемалювати (напр. руку/обличчя).
      </p>
    </div>
  );
};
