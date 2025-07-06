import { BrushSettings, DrawingHistory } from "../components/editor/types";

export interface CanvasContextProps {
    imageCanvas: HTMLCanvasElement | null;
    maskCanvas: HTMLCanvasElement | null;
    drawingCanvas: HTMLCanvasElement | null;
    brushPreview: HTMLDivElement | null;
    setImageCanvas: (canvas: HTMLCanvasElement | null) => void;
    setMaskCanvas: (canvas: HTMLCanvasElement | null) => void;
    setDrawingCanvas: (canvas: HTMLCanvasElement | null) => void;
    setBrushPreview: (element: HTMLDivElement | null) => void;
  }
  
  export interface DrawingContextProps {
    isDrawing: boolean;
    brushSettings: BrushSettings;
    canvasState: CanvasState;
    drawingHistory: DrawingHistory[];
    setIsDrawing: (isDrawing: boolean) => void;
    setBrushSettings: (settings: BrushSettings) => void;
    setCanvasState: (state: CanvasState) => void;
    addToHistory: (imageData: ImageData) => void;
    undo: () => void;
  }