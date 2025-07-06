// src/components/ui/ProgressTracker.tsx
import React, { useState, useEffect } from 'react';
import { ComfyUIExecutionProgress } from '../../services/websocketService';
import { config } from '../../config/env';

interface ProgressTrackerProps {
  progress: ComfyUIExecutionProgress | null;
  onClose?: () => void;
  onViewResults?: (images: Array<{filename: string, subfolder: string, type: string}>) => void;
}

export const ProgressTracker: React.FC<ProgressTrackerProps> = ({ 
  progress, 
  onClose,
  onViewResults
}) => {
  const [currentImage, setCurrentImage] = useState<string | null>(null);
  
  // Оновлюємо зображення, коли з'являються результати
  useEffect(() => {
    console.log("Progress update:", progress); // Для відлагодження

    if (progress?.status === 'completed' && progress.output?.images?.length) {
      // Відображаємо перше згенероване зображення
      if (progress.output.images.length > 0) {
        const image = progress.output.images[0];
        const imageUrl = `${config.VIEW_URL}?filename=${image.filename}&subfolder=${image.subfolder || ''}&type=${image.type}`;
        console.log("Setting image URL:", imageUrl);
        setCurrentImage(imageUrl);
        
        // Автоматично переходимо до відображення результатів
        if (onViewResults) {
          console.log("Calling onViewResults with images:", progress.output.images);
          onViewResults(progress.output.images);
        }
      }
    }
  }, [progress, onViewResults]);

  if (!progress) {
    console.log("ProgressTracker: No progress data");
    return null;
  }

  // Визначення відсотка прогресу
  const progressPercent = progress.progress !== undefined ? progress.progress : 
    progress.status === 'completed' ? 100 : 
    progress.status === 'starting' ? 0 : 50;
  
  // Визначення кольору відповідно до статусу
  const getStatusColor = () => {
    switch (progress.status) {
      case 'starting': return 'bg-blue-500';
      case 'processing': return 'bg-indigo-500';
      case 'completed': return 'bg-green-500';
      case 'error': return 'bg-red-500';
      default: return 'bg-gray-500';
    }
  };

  // Визначення тексту статусу
  const getStatusText = () => {
    switch (progress.status) {
      case 'starting': return 'Запуск...';
      case 'processing': 
        return progress.node ? `Обробка: ${progress.nodeTitle || progress.node}` : 'Обробка...';
      case 'completed': return 'Завершено';
      case 'error': return `Помилка: ${progress.error || 'Невідома помилка'}`;
      default: return 'Невідомий статус';
    }
  };

  console.log("Rendering ProgressTracker, status:", progress.status, "percent:", progressPercent);

  return (
    <div className="rounded-lg shadow-lg p-4 w-full bg-[#1f1536] border border-purple-700/50">
      <div className="flex items-center justify-between mb-2">
        <h3 className="text-white font-medium">Прогрес створення</h3>
        {onClose && (
          <button 
            onClick={onClose}
            className="text-gray-400 hover:text-white transition-colors"
          >
            ✕
          </button>
        )}
      </div>
      
      <div className="mb-3">
        <div className="flex justify-between mb-1">
          <span className="text-sm text-gray-300">{getStatusText()}</span>
          <span className="text-sm text-gray-300">{Math.round(progressPercent)}%</span>
        </div>
        <div className="w-full bg-gray-700 rounded-full h-2.5">
          <div 
            className={`h-2.5 rounded-full ${getStatusColor()}`} 
            style={{ width: `${progressPercent}%` }}
          ></div>
        </div>
      </div>
      
      {progress.status === 'error' && (
        <div className="bg-red-900/20 border border-red-800 p-3 rounded text-red-400 text-sm mb-3">
          {progress.error || 'Помилка при виконанні завдання'}
        </div>
      )}
      
      {/* Додаткова інформація про прогрес для відлагодження */}
      <div className="text-xs text-gray-500 mt-2">
        <div>node: {progress.node || 'N/A'}</div>
        <div>nodeTitle: {progress.nodeTitle || 'N/A'}</div>
        {progress.output?.images && (
          <div>Images: {progress.output.images.length} available</div>
        )}
      </div>
    </div>
  );
};