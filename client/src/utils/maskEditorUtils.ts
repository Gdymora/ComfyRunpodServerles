// src/utils/maskEditorUtils.ts
import { ImageInfo } from "../types/image";
import { config } from "../config/env";

/**
 * Отримує координати відносно canvas з події pointerEvent
 */
export const getCanvasCoordinates = (
  e: React.PointerEvent,
  canvas: HTMLCanvasElement
) => {
  const rect = canvas.getBoundingClientRect();
  const scaleX = canvas.width / rect.width;
  const scaleY = canvas.height / rect.height;

  return {
    canvasX: (e.clientX - rect.left) * scaleX,
    canvasY: (e.clientY - rect.top) * scaleY,
  };
};

/**
 * Завантажує зображення з URL
 */
export const loadImage = (imageUrl: string): Promise<HTMLImageElement> => {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => resolve(img);
    img.onerror = (error) => reject(error);
    img.src = imageUrl;
  });
};

/**
 * Формує URL зображення для завантаження
 */
export const getImageUrl = (imageInfo: ImageInfo): string => {
  const params = new URLSearchParams({
    filename: imageInfo.filename,
    type: imageInfo.type,
  });

  // Додаємо subfolder тільки якщо він є
  if (imageInfo.subfolder) {
    params.append("subfolder", imageInfo.subfolder);
  }

  // Додаємо випадковий параметр для уникнення кешування
  params.append("rand", Math.random().toString());

  return `${config.VIEW_URL}?${params.toString()}`;
};

/**
 * Створює маску з вихідного canvas та масштабує її до потрібних розмірів
 */
export const createMask = async (
  maskCanvas: HTMLCanvasElement, 
  originalImage: ImageInfo
): Promise<Blob> => {
  // Завантажуємо оригінальне зображення для правильних розмірів
  const imageUrl = getImageUrl(originalImage);
  const img = await loadImage(imageUrl);
  
  // Створюємо canvas з розмірами оригінального зображення
  const canvas = document.createElement("canvas");
  canvas.width = img.width;
  canvas.height = img.height;
  const ctx = canvas.getContext("2d");
  
  if (!ctx) {
    throw new Error("Не вдалося створити контекст canvas");
  }

  // Отримуємо дані маски з редактора
  const maskCtx = maskCanvas.getContext("2d");
  if (!maskCtx) {
    throw new Error("Не вдалося отримати контекст маски");
  }

  const maskData = maskCtx.getImageData(0, 0, maskCanvas.width, maskCanvas.height);
  const finalData = ctx.createImageData(img.width, img.height);

  // Масштабуємо маску до розмірів оригінального зображення і
  // створюємо маску в правильному форматі
  for (let y = 0; y < img.height; y++) {
    for (let x = 0; x < img.width; x++) {
      // Масштабуємо координати до розміру маски
      const srcX = Math.floor((x * maskCanvas.width) / img.width);
      const srcY = Math.floor((y * maskCanvas.height) / img.height);

      // Індекс пікселя в вихідній масці
      const srcIdx = (srcY * maskCanvas.width + srcX) * 4;

      // Індекс пікселя в фінальній масці
      const targetIdx = (y * img.width + x) * 4;

      // Перевіряємо, чи є колір (від пензля)
      const hasColor =
        srcIdx < maskData.data.length &&
        (maskData.data[srcIdx] > 0 ||
          maskData.data[srcIdx + 1] > 0 ||
          maskData.data[srcIdx + 2] > 0);

      // ФОРМАТ МАСКИ ДЛЯ COMFY UI:
      finalData.data[targetIdx] = 0; // R = 0
      finalData.data[targetIdx + 1] = 0; // G = 0
      finalData.data[targetIdx + 2] = 0; // B = 0
      finalData.data[targetIdx + 3] = hasColor ? 0 : 255; // A - інвертований
    }
  }

  ctx.putImageData(finalData, 0, 0);

  // Конвертуємо в PNG blob (з прозорістю/альфа каналом)
  const blob = await new Promise<Blob>((resolve) =>
    canvas.toBlob((blob) => resolve(blob!), "image/png")
  );

  return blob;
};

/**
 * Розраховує розмір контейнера для адаптивності
 */
export const calculateContainerSize = (containerElement: HTMLDivElement | null, isMobile: boolean) => {
  if (!containerElement) {
    return { width: 512, height: 512 };
  }
  
  const parentWidth = containerElement.parentElement?.clientWidth || window.innerWidth;
  const maxWidth = isMobile ? Math.min(parentWidth - 32, 512) : 512;

  return {
    width: maxWidth,
    height: maxWidth,
  };
};