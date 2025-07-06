// src/components/ImageGenerator3D.tsx - Simplified for 3D Generation
import React, { useState, useEffect } from 'react';
import { websocketService, ComfyUIExecutionProgress } from '../services/websocketService';
import { ImageLoader } from './editor/ImageLoader';
import { Button } from './ui/Button';
import { getPromptTemplate, updateImageInPrompt } from '../utils/promptUtils';
import { ImageInfo } from '../types/image';
import { ProgressTracker } from '../utils/ProgressTracker';

interface Generated3DModel {
  filename: string;
  subfolder: string;
  type: string;
}

interface ImageGenerator3DProps {
  onGenerationComplete?: (models: Generated3DModel[]) => void;
  onOpenModal?: (model: Generated3DModel) => void;
}

export const ImageGenerator3D: React.FC<ImageGenerator3DProps> = ({ 
  onGenerationComplete, 
  onOpenModal 
}) => {
  const [imageInfo, setImageInfo] = useState<ImageInfo | null>(null);
  const [isGenerating, setIsGenerating] = useState<boolean>(false);
  const [progress, setProgress] = useState<ComfyUIExecutionProgress | null>(null);
  const [promptId, setPromptId] = useState<string | null>(null);
  const [generated3DModels, setGenerated3DModels] = useState<Generated3DModel[] | null>(null);

  // Підключаємось до WebSocket при монтуванні компонента
  useEffect(() => {
    websocketService.connect();
    
    return () => {
      if (promptId) {
        websocketService.removeProgressCallback(promptId);
      }
      websocketService.disconnect();
    };
  }, []);

  // Обробник завантаження зображення
  const handleImageLoad = (info: ImageInfo) => {
    setImageInfo(info);
    setGenerated3DModels(null);
    setProgress(null);
  };

  // Обробник генерації 3D моделі
  const handleGenerate3D = async () => {
    if (!imageInfo) {
      alert("Спочатку завантажте зображення");
      return;
    }

    setIsGenerating(true);
    setProgress(null);
    setGenerated3DModels(null);

    try {
      // Отримуємо шаблон для 3D генерації (Hunyuan3D)
      const promptTemplate = getPromptTemplate();

      // Оновлюємо шаблон з нашим зображенням
      const updatedPrompt = updateImageInPrompt(
        promptTemplate, 
        imageInfo,
        {
          seed: Math.floor(Math.random() * 1000000000), // випадковий seed
        }
      );

      // Запускаємо виконання через WebSocket сервіс
      const newPromptId = await websocketService.executePrompt(
        updatedPrompt.prompt, 
        (newProgress) => {
          setProgress(newProgress);
          
          // Якщо виконання завершено і є результати
          if (newProgress.status === 'completed' && newProgress.output) {
            // Шукаємо 3D моделі у виході
            const models: Generated3DModel[] = [];
            
            Object.entries(newProgress.output).forEach(([, nodeOutput]) => {
              if (nodeOutput && typeof nodeOutput === 'object') {
                // Перевіряємо наявність 3D моделей (GLB файли)
                if ('3d' in nodeOutput && Array.isArray(nodeOutput['3d'])) {
                  models.push(...(nodeOutput['3d'] as Generated3DModel[]));
                }
                // Також перевіряємо зображення (multiview)
                if ('images' in nodeOutput && Array.isArray(nodeOutput.images)) {
                  models.push(...(nodeOutput.images as Generated3DModel[]));
                }
              }
            });
            
            setGenerated3DModels(models);
            setIsGenerating(false);
            
            // Викликаємо callback, якщо він є
            if (onGenerationComplete) {
              onGenerationComplete(models);
            }
          }
          
          // Якщо сталася помилка
          if (newProgress.status === 'error') {
            setIsGenerating(false);
          }
        }
      );
      
      setPromptId(newPromptId);
    } catch (error) {
      console.error("Помилка 3D генерації:", error);
      setIsGenerating(false);
      setProgress({
        status: 'error',
        error: error instanceof Error ? error.message : 'Невідома помилка'
      });
    }
  };

  // Обробник перегляду результатів
  const handleViewResults = (models: Generated3DModel[]) => {
    setGenerated3DModels(models);
    if (onGenerationComplete) {
      onGenerationComplete(models);
    }
  };

  return (
    <div className="bg-gray-900 rounded-lg shadow-lg p-6 w-full max-w-4xl mx-auto">
      <h2 className="text-2xl font-bold text-white mb-6">Генерація 3D моделі</h2>
      
      {/* Завантаження зображення */}
      {!imageInfo ? (
        <div className="mb-6">
          <h3 className="text-xl text-white mb-3">1. Завантажте зображення</h3>
          <ImageLoader onImageLoad={handleImageLoad} />
          <div className="mt-4 text-sm text-gray-400">
            <p>• Використовуйте чіткі фото з хорошим освітленням</p>
            <p>• Рекомендований розмір: мінімум 512x512 пікселів</p>
            <p>• Підтримувані формати: JPG, PNG, WEBP</p>
          </div>
        </div>
      ) : (
        <div className="mb-6">
          <h3 className="text-xl text-white mb-3">1. Завантажене зображення</h3>
          <div className="flex items-center space-x-4">
            <div className="w-32 h-32 bg-gray-800 rounded overflow-hidden">
              <img
                src={`/api/view?filename=${imageInfo.filename}&subfolder=${imageInfo.subfolder || ''}&type=${imageInfo.type}`}
                alt="Вхідне зображення"
                className="w-full h-full object-cover"
              />
            </div>
            <div>
              <p className="text-gray-300">Назва: {imageInfo.filename}</p>
              <p className="text-gray-400 text-sm">Готово до 3D генерації</p>
              <button
                onClick={() => setImageInfo(null)}
                className="text-blue-400 hover:text-blue-300 transition-colors mt-2"
              >
                Змінити зображення
              </button>
            </div>
          </div>
        </div>
      )}
      
      {/* Кнопка генерації */}
      {imageInfo && !isGenerating && !generated3DModels && (
        <div className="mb-6">
          <Button
            onClick={handleGenerate3D}
            disabled={isGenerating}
            className="w-full py-3 text-lg bg-purple-600 hover:bg-purple-500"
          >
            Створити 3D модель
          </Button>
          <p className="text-gray-400 text-sm text-center mt-2">
            Процес займе приблизно 1-2 хвилини
          </p>
        </div>
      )}
      
      {/* Відображення прогресу */}
      {progress && isGenerating && (
        <div className="mb-6">
          <h3 className="text-xl text-white mb-3">2. Прогрес генерації</h3>
          <ProgressTracker
            progress={progress} 
            onViewResults={handleViewResults}
          />
        </div>
      )}
      
      {/* Відображення результатів */}
      {generated3DModels && generated3DModels.length > 0 && (
        <div>
          <h3 className="text-xl text-white mb-3">3. Результати</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {generated3DModels.map((model, index) => {
              const isGLB = model.filename.toLowerCase().endsWith('.glb');
              const downloadUrl = `/api/view?filename=${model.filename}&subfolder=${model.subfolder || ''}&type=${model.type}`;
              
              return (
                <div key={index} className="bg-gray-800 p-4 rounded-lg">
                  {isGLB ? (
                    // Для GLB файлів показуємо іконку
                    <div className="flex flex-col items-center mb-4">
                      <div className="w-24 h-24 bg-purple-600/20 rounded-lg flex items-center justify-center mb-3">
                        <span className="text-4xl">🎭</span>
                      </div>
                      <p className="text-white font-medium">{model.filename}</p>
                      <p className="text-purple-400 text-sm">3D Model (GLB)</p>
                    </div>
                  ) : (
                    // Для зображень показуємо превью
                    <div className="mb-4">
                      <img
                        src={downloadUrl}
                        alt={`3D View ${index + 1}`}
                        className="w-full h-auto rounded-lg mb-2"
                      />
                      <p className="text-white text-sm">{model.filename}</p>
                    </div>
                  )}
                  
                  <div className="flex justify-center space-x-2">
                    <a
                      href={downloadUrl}
                      download={model.filename}
                      className="bg-blue-600 hover:bg-blue-500 text-white px-4 py-2 rounded-full text-sm transition-colors"
                    >
                      Завантажити
                    </a>
                    <button
                      onClick={() => onOpenModal && onOpenModal(model)}
                      className="bg-purple-600 hover:bg-purple-500 text-white px-4 py-2 rounded-full text-sm transition-colors"
                    >
                      Переглянути
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
          
          <div className="mt-6 text-center">
            <button
              onClick={() => {
                setGenerated3DModels(null);
                setProgress(null);
                setImageInfo(null);
              }}
              className="bg-green-600 hover:bg-green-500 text-white px-6 py-2 rounded-full transition-colors"
            >
              Створити нову модель
            </button>
          </div>
        </div>
      )}
      
      {/* Додаткова інформація */}
      {!imageInfo && (
        <div className="mt-8 bg-gray-800/50 rounded-lg p-4">
          <h4 className="text-white font-medium mb-2">Що ви отримаєте:</h4>
          <ul className="text-gray-300 text-sm space-y-1">
            <li>• GLB файл - готовий для використання в 3D програмах</li>
            <li>• Multiview зображення - різні кути огляду моделі</li>
            <li>• Сумісність з Blender, Unity, Three.js та іншими</li>
            <li>• Можливість перегляду онлайн у браузері</li>
          </ul>
        </div>
      )}
    </div>
  );
};