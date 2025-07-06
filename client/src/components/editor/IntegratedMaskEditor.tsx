// src/components/editor/IntegratedMaskEditor.tsx
import React, { useState, useRef } from 'react';
import { ImageLoader } from './ImageLoader';
import { MaskEditorWithRef } from './MaskEditorWithRef';
import { ImageInfo } from '../../types/image';
import { IntegratedMaskEditorProps, MaskEditorRef } from './types';

export const IntegratedMaskEditor: React.FC<IntegratedMaskEditorProps> = ({
  onClose,
  onSave
}) => {
  const [imageInfo, setImageInfo] = useState<ImageInfo | null>(null);
  const maskEditorRef = useRef<MaskEditorRef>(null);

  const handleImageLoad = (info: ImageInfo) => {
    // Зберігаємо інформацію про завантажене зображення (без зміни subfolder)
    setImageInfo(info);
  };

  const handleSave = (result: { maskBlob: Blob; originalRef: ImageInfo }) => {
    // Передаємо результат без змін - параметр subfolder="clipspace" встановлюється
    // в api.uploadMask() при завантаженні маски на сервер
    onSave(result);
  };

  return (
    <div className="w-full max-w-4xl mx-auto bg-gray-800 rounded-lg shadow-2xl">
      <div className="p-6">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-2xl font-semibold text-white">
            {imageInfo ? 'Редагувати маску' : 'Обрати зображення'}
          </h2>
          <button
            onClick={onClose}
            className="px-4 py-2 bg-gray-700 text-white rounded-lg hover:bg-gray-600 transition-colors"
          >
            Скасувати
          </button>
        </div>

        {!imageInfo ? (
          <div className="space-y-6">
            <ImageLoader onImageLoad={handleImageLoad} />
            <p className="text-gray-400 text-center">
              Завантажте зображення або введіть його шлях, щоб почати редагування
            </p>
          </div>
        ) : (
          <MaskEditorWithRef
            ref={maskEditorRef}
            initialImage={imageInfo}
            onSave={handleSave}
            onCancel={onClose}
            defaultBrushSize={10}
            defaultBlurRadius={0}
            canvasWidth={512}
            canvasHeight={512}
          />
        )}
      </div>
    </div>
  );
};