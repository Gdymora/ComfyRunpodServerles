// src/types/image.ts
export type ImageType = "input" | "output" | "temp";

export interface ImageInfo {
  filename: string;
  subfolder: string;
  type: ImageType;
  width?: number;
  height?: number;
  metadata?: ImageMetadata;
  /** data: URL для прев'ю в браузері */
  url?: string;
  /** Чистий base64 (без префікса data:) — надсилається у воркер RunPod */
  base64?: string;
}

export interface ImageMetadata {
  originalName?: string;
  timestamp?: number;
  processing?: {
    blur?: number;
    modifications?: string[];
  };
}

export interface MaskData {
  maskBlob: Blob;
  originalRef: ImageInfo;
}

export interface ImageValidation {
  isValid: boolean;
  errors?: string[];
  warnings?: string[];
}

export interface MaskData {
  maskBlob: Blob; // Бінарні дані маски
  originalRef: ImageInfo; // Посилання на оригінальне зображення
}

export interface ImageDimensions {
  width: number;
  height: number;
}
