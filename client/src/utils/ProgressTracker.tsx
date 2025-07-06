// src/components/ui/ProgressTracker.tsx
import React, { useState, useEffect } from 'react';
import { ComfyUIExecutionProgress } from '../services/websocketService';

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
  const [showDetails, setShowDetails] = useState(false);
  
  // Автоматично показати кнопку результатів, коли завдання завершено
  useEffect(() => {
    if (progress?.status === 'completed' && progress.output?.images?.length) {
      setShowDetails(true);
    }
  }, [progress]);

  if (!progress) {
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

  return (
    <div className="bg-gray-800 border border-gray-700 rounded-lg shadow-lg p-4 w-full">
      <div className="flex items-center justify-between mb-2">
        <h3 className="text-white font-medium">Прогрес виконання</h3>
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
      
      {progress.status === 'completed' && progress.output?.images?.length > 0 && (
        <div className="space-y-3">
          <button
            onClick={() => setShowDetails(prev => !prev)}
            className="flex items-center text-blue-400 hover:text-blue-300 transition-colors"
          >
            <span>{showDetails ? 'Приховати результати' : 'Показати результати'}</span>
            <span className="ml-1">{showDetails ? '▲' : '▼'}</span>
          </button>
          
          {showDetails && (
            <div className="space-y-2">
              <p className="text-sm text-gray-300">Згенеровано зображень: {progress.output.images.length}</p>
              
              {onViewResults && (
                <button
                  onClick={() => onViewResults(progress.output!.images!)}
                  className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded transition-colors"
                >
                  Переглянути результати
                </button>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
};