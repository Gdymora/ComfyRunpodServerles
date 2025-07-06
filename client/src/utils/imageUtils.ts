import { ImageInfo, ImageType } from "../types/image";

// Утиліти для роботи з зображеннями
export function parseImagePath(path: string): ImageInfo | null {
  try {
    let pathType: ImageType = "temp";
    let processedPath = path;

    // Визначаємо тип з суфіксу
    if (path.endsWith("[output]")) {
      pathType = "output";
      processedPath = path.slice(0, -9);
    } else if (path.endsWith("[input]")) {
      pathType = "input";
      processedPath = path.slice(0, -8);
    } else if (path.endsWith("[temp]")) {
      pathType = "temp";
      processedPath = path.slice(0, -7);
    }

    // Розділяємо шлях на папку та файл
    const lastSlashIndex = processedPath.lastIndexOf("/");
    const subfolder =
      lastSlashIndex > -1 ? processedPath.substring(0, lastSlashIndex) : "";
    const filename =
      lastSlashIndex > -1
        ? processedPath.substring(lastSlashIndex + 1)
        : processedPath;

    return {
      filename,
      subfolder,
      type: pathType,
      metadata: {
        originalName: filename,
        timestamp: Date.now(),
      },
    };
  } catch (error) {
    console.error("Error parsing image path:", error);
    return null;
  }
}

export function formatImagePath(imageInfo: ImageInfo): string {
  const { filename, subfolder, type } = imageInfo;
  const path = subfolder ? `${subfolder}/${filename}` : filename;
  return `${path} [${type}]`;
}

export function createImageUrl(imageInfo: ImageInfo): string {
  // Правильний порядок параметрів для ComfyUI
  const params = new URLSearchParams({
    filename: imageInfo.filename,
    subfolder: imageInfo.subfolder || '',
    type: imageInfo.type
  });
  return `/api/view?${params.toString()}`;
}

// Функція для отримання розмірів зображення
export function getImageDimensions(url: string): Promise<{width: number, height: number}> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => {
      resolve({
        width: img.naturalWidth,
        height: img.naturalHeight
      });
    };
    img.onerror = () => {
      reject(new Error('Failed to load image'));
    };
    img.src = url;
  });
}