// src/components/editor/MaskEditor.tsx
import React, { useRef, useState, useCallback, useEffect } from "react";
import { ExtendedMaskEditorProps } from "./types";
import { useDrawingHistory } from "../../hooks/useDrawingHistory";
import { createMask, getCanvasCoordinates, calculateContainerSize } from "../../utils/maskEditorUtils";
import { Icons } from "../ui/Icons";
import BrushSettings from "./BrushSettings";
import DrawingControls from "./DrawingControls";
import MaskCanvas from "./MaskCanvas";

export const MaskEditor: React.FC<ExtendedMaskEditorProps> = ({
  initialImage,
  onSave,
  onCancel,
  defaultBrushSize = 5,
  defaultBlurRadius = 0,
  canvasWidth = 512,
  canvasHeight = 512,
  maskCanvasRef,
  disabled = false,
  drawingMode = 'normal',  
}) => {
  // Refs
  const imageCanvasRef = useRef<HTMLCanvasElement>(null);
  const brushPreviewRef = useRef<HTMLDivElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  // Стани
  const [brushSize, setBrushSize] = useState(defaultBrushSize);
  const [eraserSize, setEraserSize] = useState(10);
  const [activeTool, setActiveTool] = useState("brush");
  const [isDrawing, setIsDrawing] = useState(false);
  const [imageLoaded, setImageLoaded] = useState(false);
  const [isMobile, setIsMobile] = useState(false);
  const [containerSize, setContainerSize] = useState({ width: 512, height: 512 });
  const [forwardHistory, setForwardHistory] = useState<ImageData[]>([]);
  const [undoAvailable, setUndoAvailable] = useState(false);
  const [redoAvailable, setRedoAvailable] = useState(false);

  // Хуки
  const { addToHistory, undo, clear: clearHistory, canUndo } = useDrawingHistory();

  // Визначення мобільного пристрою
  useEffect(() => {
    const checkMobile = () => {
      const isMobileDevice = window.innerWidth < 768;
      setIsMobile(isMobileDevice);
      setContainerSize(calculateContainerSize(containerRef.current, isMobileDevice));
    };

    checkMobile();
    window.addEventListener("resize", checkMobile);
    return () => window.removeEventListener("resize", checkMobile);
  }, []);

  // Обробники малювання
  const handlePointerDown = useCallback(
    (e: React.PointerEvent) => {
      if (disabled || !maskCanvasRef.current || !imageLoaded) return;

      setIsDrawing(true);
      const ctx = maskCanvasRef.current.getContext("2d");
      if (!ctx) return;

      // Зберігаємо поточний стан маски (для undo)
      const imageData = ctx.getImageData(0, 0, canvasWidth, canvasHeight);
      addToHistory(imageData);
      setForwardHistory([]);
      
      // Оновлюємо стан доступності кнопок
      setUndoAvailable(true);
      setRedoAvailable(false);

      const { canvasX, canvasY } = getCanvasCoordinates(e, maskCanvasRef.current);

      // Вибираємо режим: "brush" або "eraser"
      if (activeTool === "eraser") {
        ctx.globalCompositeOperation = "destination-out"; // Стирання
      } else {
        ctx.globalCompositeOperation = "source-over"; // Малювання
        ctx.strokeStyle = "white"; // Білий колір для маски
      }

      ctx.lineWidth = activeTool === "eraser" ? eraserSize : brushSize;
      ctx.lineCap = "round";
      ctx.lineJoin = "round";

      // Починаємо шлях малювання
      ctx.beginPath();
      ctx.moveTo(canvasX, canvasY);
    },
    [imageLoaded, addToHistory, brushSize, eraserSize, activeTool, disabled, canvasWidth, canvasHeight]
  );

  const handlePointerMove = useCallback(
    (e: React.PointerEvent) => {
      if (disabled || !isDrawing || !maskCanvasRef.current || !imageLoaded) return;

      const ctx = maskCanvasRef.current.getContext("2d");
      if (!ctx) return;

      // Отримуємо координати
      const { canvasX, canvasY } = getCanvasCoordinates(e, maskCanvasRef.current);

      // Для плавного малювання створюємо лінію від попередньої точки до поточної
      ctx.lineWidth = activeTool === "eraser" ? eraserSize * 2 : brushSize * 2;
      ctx.lineCap = "round";
      ctx.lineJoin = "round";

      // Якщо є попередня точка, малюємо лінію
      if ((ctx as any).lastX !== undefined) {
        ctx.beginPath();
        ctx.moveTo((ctx as any).lastX, (ctx as any).lastY);
        ctx.lineTo(canvasX, canvasY);
        ctx.stroke();
      }

      // Оновлюємо останню позицію
      (ctx as any).lastX = canvasX;
      (ctx as any).lastY = canvasY;
    },
    [isDrawing, imageLoaded, brushSize, eraserSize, activeTool, disabled]
  );

  const handlePointerUp = useCallback(() => {
    setIsDrawing(false);
    // Скидаємо останню позицію
    if (maskCanvasRef.current) {
      const ctx = maskCanvasRef.current.getContext("2d");
      if (ctx) {
        (ctx as any).lastX = undefined;
        (ctx as any).lastY = undefined;
      }
    }
  }, []);

  // Функція скасування
  const handleUndo = useCallback(() => {
    console.log("handleUndo called");
    if (disabled) return;
    
    const lastState = undo();
    if (lastState && maskCanvasRef.current) {
      const ctx = maskCanvasRef.current.getContext("2d");
      if (ctx) {
        // Зберігаємо поточний стан для можливості повторення
        const currentState = ctx.getImageData(0, 0, canvasWidth, canvasHeight);
        setForwardHistory((prev) => [...prev, currentState]);
        setRedoAvailable(true);

        // Застосовуємо попередній стан
        ctx.putImageData(lastState, 0, 0);
        
        // Оновлюємо стан доступності кнопки undo
        // Це буде true тільки якщо в історії ще є елементи
        setTimeout(() => {
          setUndoAvailable(canUndo);
        }, 0);
      }
    } else {
      console.log("No last state or no canvas ref");
    }
  }, [disabled, undo, canvasWidth, canvasHeight, canUndo]);

  // Функція повторення
  const handleRedo = useCallback(() => {
    console.log("handleRedo called");
    if (disabled || forwardHistory.length === 0 || !maskCanvasRef.current) {
      console.log("Redo disabled, no forward history, or no canvas");
      return;
    }

    const ctx = maskCanvasRef.current.getContext("2d");
    if (!ctx) {
      console.log("No canvas context");
      return;
    }

    // Зберігаємо поточний стан для скасування
    const currentState = ctx.getImageData(0, 0, canvasWidth, canvasHeight);
    addToHistory(currentState);
    setUndoAvailable(true);

    // Беремо останній стан з історії "вперед"
    const nextState = forwardHistory[forwardHistory.length - 1];
    ctx.putImageData(nextState, 0, 0);

    // Оновлюємо історію "вперед"
    const newForwardHistory = forwardHistory.slice(0, forwardHistory.length - 1);
    setForwardHistory(newForwardHistory);
    setRedoAvailable(newForwardHistory.length > 0);
  }, [disabled, forwardHistory, addToHistory, canvasWidth, canvasHeight]);

  // Функція очищення маски
  const handleClear = useCallback(() => {
    console.log("handleClear called");
    if (disabled || !maskCanvasRef.current) return;
    
    const ctx = maskCanvasRef.current.getContext("2d");
    if (ctx) {
      // Зберігаємо поточний стан перед очищенням
      const currentState = ctx.getImageData(0, 0, canvasWidth, canvasHeight);
      addToHistory(currentState);
      setUndoAvailable(true);
      
      // Очищуємо canvas
      ctx.clearRect(0, 0, canvasWidth, canvasHeight);
      
      // Скидаємо історію "вперед"
      setForwardHistory([]);
      setRedoAvailable(false);
    }
  }, [disabled, addToHistory, canvasWidth, canvasHeight]);

  // Оновлюємо стан кнопок при зміні канвасу
  useEffect(() => {
    setUndoAvailable(canUndo);
    setRedoAvailable(forwardHistory.length > 0);
  }, [canUndo, forwardHistory.length]);

  // Обробник збереження маски
  const handleSave = async () => {
    if (disabled || !maskCanvasRef.current || !initialImage) return;

    try {
      // Створення маски
      const maskBlob = await createMask(maskCanvasRef.current, initialImage);
      
      // Передаємо результат
      onSave({
        maskBlob,
        originalRef: initialImage,
      });
    } catch (error) {
      console.error("Помилка створення маски:", error);
      alert(
        "Помилка при створенні маски: " +
          (error instanceof Error ? error.message : "Невідома помилка")
      );
    }
  };

  return (
    <>
      <div className="flex flex-col rounded-lg p-2 md:p-4">
        <div className="flex flex-col md:flex-row gap-4">
          {/* Лівий блок з іконками */}
          <div className="w-full md:w-1/4 rounded-lg p-4">
            <div className="grid grid-cols-3 gap-4">
              <Icons.Grid />
            </div>
          </div>
          
          {/* Центральний блок з канвасом */}
          <div className="w-full md:w-2/4">
            <MaskCanvas
              initialImage={initialImage}
              canvasWidth={canvasWidth}
              canvasHeight={canvasHeight}
              disabled={disabled}
              imageCanvasRef={imageCanvasRef}
              maskCanvasRef={maskCanvasRef}
              brushPreviewRef={brushPreviewRef}
              containerRef={containerRef}
              containerSize={containerSize}
              brushSize={brushSize}
              eraserSize={eraserSize}
              activeTool={activeTool}
              isDrawing={isDrawing}
              onImageLoaded={setImageLoaded}
              onPointerDown={handlePointerDown}
              onPointerMove={handlePointerMove}
              onPointerUp={handlePointerUp}
            />
          </div>

          {/* Правий блок з інструментами */}
          <div className="w-full md:w-1/4 flex flex-col gap-4 rounded-lg p-4">
            {/* Налаштування пензля та гумки з повзунками */}
            <BrushSettings
              brushSize={brushSize}
              eraserSize={eraserSize}
              activeTool={activeTool}
              disabled={disabled}
              onBrushSizeChange={setBrushSize}
              onEraserSizeChange={setEraserSize}
              onToolChange={setActiveTool}
            />
            
            {/* Кнопки керування вертикально */}
            <DrawingControls
              imageLoaded={imageLoaded}
              disabled={disabled}
              canUndo={undoAvailable}
              canRedo={redoAvailable}
              onUndo={handleUndo}
              onRedo={handleRedo}
              onClear={handleClear}
            />
          </div>
        </div>

        {/* Кнопка збереження */}
        <div className="mt-6">
          <div className="flex justify-center mb-4">
            <button
              onClick={handleSave}
              disabled={!imageLoaded || disabled}
              className={`bg-purple-700 text-white py-2 px-8 rounded-full text-center ${
                !disabled && imageLoaded ? "hover:bg-purple-600" : "opacity-50 cursor-not-allowed"
              }`}
            >
              Создать
            </button>
          </div>
        </div>
      </div>
    </>
  );
};