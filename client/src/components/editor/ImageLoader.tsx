// src/components/editor/ImageLoader.tsx
import React, { useState, useCallback, useRef } from 'react';
import { ImageInfo } from '../../types/image';
import { ImageLoaderProps } from './types';
import { getImageDimensions } from '../../utils/imageUtils';
import { SUPPORTED_IMAGE_TYPES, MAX_IMAGE_SIZE } from '../../utils/const';

// Читаємо файл як data:URL (для прев'ю) + чистий base64 (для воркера RunPod).
const readAsDataUrl = (file: File): Promise<string> =>
  new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => resolve(reader.result as string);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });

export const ImageLoader: React.FC<ImageLoaderProps> = ({ 
  onImageLoad,
  className = ''
}) => {
  const [, setImagePath] = useState<string>('');
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState<boolean>(false);
  const [, setIsDragging] = useState<boolean>(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const validateFile = (file: File): string | null => {
    if (!SUPPORTED_IMAGE_TYPES.includes(file.type as any)) {
      return `Непідтримуваний тип файлу. Підтримувані типи: ${SUPPORTED_IMAGE_TYPES.join(', ')}`;
    }

    if (file.size > MAX_IMAGE_SIZE) {
      return `Розмір файлу завеликий. Максимальний розмір: ${MAX_IMAGE_SIZE / (1024 * 1024)}МБ`;
    }

    return null;
  }; 

  const handleFileSelect = async (file: File) => {
    try {
      const validationError = validateFile(file);
      if (validationError) {
        throw new Error(validationError);
      }

      setLoading(true);

      // Клієнтський флоу: без проміжного сервера-аплоуду. Воркер RunPod приймає
      // зображення напряму як base64 у полі input.images.
      const dataUrl = await readAsDataUrl(file);
      const base64 = dataUrl.split(',')[1];
      const dimensions = await getImageDimensions(dataUrl);

      const imageInfo: ImageInfo = {
        filename: file.name,
        subfolder: '',
        type: 'input',
        width: dimensions.width,
        height: dimensions.height,
        url: dataUrl,
        base64,
        metadata: {
          originalName: file.name,
          timestamp: Date.now()
        }
      };

      setPreviewUrl(dataUrl);
      setImagePath(`${imageInfo.filename} [input]`);
      onImageLoad(imageInfo);
    } catch (error) {
      setError(error instanceof Error ? error.message : 'Не вдалося завантажити зображення');
    } finally {
      setLoading(false);
    }
  };

  const handleFileInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      handleFileSelect(file);
    }
  }; 

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer.files?.[0];
    if (file) {
      handleFileSelect(file);
    }
  }, []); 
return (
  <div className={`w-full ${className}`}>
    <div className="flex flex-col items-center gap-3">
      {/* Контейнер для завантаження з фоновим зображенням */}
      <div 
        className="w-full max-w-[480px] h-[300px] md:h-[560px] bg-[#1f1536] rounded-lg overflow-hidden cursor-pointer relative border border-blue-400"
        style={{
          backgroundImage: 'url(/assets/images/upload-background.jpg)',
          backgroundSize: 'cover',
          backgroundPosition: 'center',
          backgroundBlendMode: 'overlay'
        }}
        onClick={() => fileInputRef.current?.click()}
        onDragOver={(e) => e.preventDefault()}
        onDragEnter={(e) => { e.preventDefault(); setIsDragging(true); }}
        onDragLeave={() => setIsDragging(false)}
        onDrop={handleDrop}
      >
        {loading ? (
          <div className="absolute inset-0 flex justify-center items-center">
            <div className="w-4 h-4 bg-purple-600 rounded-full animate-pulse"></div>
          </div>
        ) : previewUrl ? (
          <img 
            src={previewUrl} 
            alt="Preview" 
            className="w-full h-full object-cover"
          />
        ) : (
          <div className="absolute inset-0 flex flex-col items-center justify-center">
            <div className="text-gray-300 text-center mb-6 px-4">
              Перетяни или выбери файл
            </div>
            
            {/* SVG-кнопка для вибору файлу */}
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                fileInputRef.current?.click();
              }}
              className="text-purple-500 hover:text-purple-400 transition-colors"
            >
                <img src="assets/svg/add_circle_24px.svg" alt="Іконка" width="40" height="40" />
            {/*   <svg width="30" height="30" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M12 5V19M5 12H19" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
              </svg> */}
            </button>
            
            <input
              ref={fileInputRef}
              type="file"
              accept={SUPPORTED_IMAGE_TYPES.join(',')}
              onChange={handleFileInput}
              className="hidden"
            />
          </div>
        )}
      </div>
      
      {/* Розмір під контейнером - показується тільки на десктопі */}
      <div className="hidden md:block bg-blue-500 text-white px-4 py-1 rounded-md text-sm">
        480 × 560
      </div>
      
      {error && (
        <div className="text-red-500 text-sm p-2 bg-red-900/20 rounded mt-2">
          {error}
        </div>
      )}
    </div>
  </div>
);
};