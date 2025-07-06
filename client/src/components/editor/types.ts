// src/components/editor/types.ts
import { RefObject } from 'react';
import { ImageInfo } from '../../types/image';

// Пропси для ImageLoader
export interface ImageLoaderProps {
  onImageLoad: (imageInfo: ImageInfo) => void;
  className?: string;
}

// Пропси для базового MaskEditor
export interface MaskEditorProps {
  initialImage: ImageInfo;
  onSave: (result: {
    maskBlob: Blob;
    originalRef: ImageInfo;
  }) => void;
  onCancel: () => void;
  defaultBrushSize?: number;
  defaultBlurRadius?: number;
  canvasWidth?: number;
  canvasHeight?: number;
  disabled?: boolean; 
  drawingMode?: string; 
}

// Пропси для MaskEditor з референціями
export interface ExtendedMaskEditorProps extends MaskEditorProps {
  maskCanvasRef: RefObject<HTMLCanvasElement>;
}

// Пропси для IntegratedMaskEditor
export interface IntegratedMaskEditorProps {
  onClose: () => void;
  onSave: (maskData: {
    maskBlob: Blob;
    originalRef: ImageInfo;
  }) => void;
  imageInfo: ImageInfo;
}

export interface BrushSettings {
  size: number;
  isPositiveMode: boolean;
  blurRadius: number;
  shape?: 'circle' | 'square'; // Добавляем опциональный параметр формы кисти
}

export interface MaskEditorRef {
  clear: () => void;
  undo: () => void;
  getCurrentMask: () => Promise<Blob | null>;
  setMode: (mode: DrawingMode) => void;
}

export type DrawingMode = 'brush' | 'eraser';