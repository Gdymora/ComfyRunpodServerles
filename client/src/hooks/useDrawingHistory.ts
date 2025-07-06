// src/hooks/useDrawingHistory.ts
import { useState, useCallback } from 'react';

/**
 * Хук для керування історією малювання (undo/redo)
 */
export const useDrawingHistory = () => {
  const [history, setHistory] = useState<ImageData[]>([]);
  const [currentIndex, setCurrentIndex] = useState(-1);

  // Додати новий стан до історії
  const addToHistory = useCallback((imageData: ImageData) => {
    console.log('Adding to history. Current index:', currentIndex, 'History length:', history.length);
    
    // Якщо ми знаходимося не в кінці історії (були скасування),
    // обрізаємо історію до поточного індексу
    setHistory(prev => {
      const newHistory = prev.slice(0, currentIndex + 1);
      return [...newHistory, imageData];
    });
    
    setCurrentIndex(prev => prev + 1);
  }, [currentIndex, history.length]);

  // Скасувати останню дію
  const undo = useCallback(() => {
    console.log('Undo requested. Current index:', currentIndex, 'History length:', history.length);
    
    if (currentIndex > 0) {
      setCurrentIndex(prev => prev - 1);
      return history[currentIndex - 1];
    }
    
    return null;
  }, [currentIndex, history]);

  // Повторити скасовану дію
  const redo = useCallback(() => {
    console.log('Redo requested. Current index:', currentIndex, 'History length:', history.length);
    
    if (currentIndex < history.length - 1) {
      setCurrentIndex(prev => prev + 1);
      return history[currentIndex + 1];
    }
    
    return null;
  }, [currentIndex, history]);

  // Очистити всю історію
  const clear = useCallback(() => {
    console.log('Clearing history');
    setHistory([]);
    setCurrentIndex(-1);
  }, []);

  // Чи є в історії попередні стани
  const canUndo = currentIndex > 0;
  
  // Чи є в історії наступні стани
  const canRedo = currentIndex < history.length - 1;

  return {
    history,
    currentIndex,
    addToHistory,
    undo,
    redo,
    clear,
    canUndo,
    canRedo
  };
};