// src/components/editor/DrawingControls.tsx
import React from 'react';

interface DrawingControlsProps {
  imageLoaded: boolean;
  disabled: boolean;
  canUndo: boolean;
  canRedo: boolean;
  onUndo: () => void;
  onRedo: () => void;
  onClear: () => void;
}

const DrawingControls: React.FC<DrawingControlsProps> = ({
  imageLoaded,
  disabled,
  canUndo,
  canRedo,
  onUndo,
  onRedo,
  onClear
}) => {
  // Додано логування для відлагодження
  console.log("DrawingControls props:", { 
    imageLoaded, 
    disabled, 
    canUndo, 
    canRedo,
    onUndo: !!onUndo,
    onRedo: !!onRedo,
    onClear: !!onClear
  });

  // Створюємо обробники з додатковим логуванням
  const handleUndo = () => {
    console.log("Undo button clicked");
    if (onUndo) onUndo();
  };

  const handleRedo = () => {
    console.log("Redo button clicked");
    if (onRedo) onRedo();
  };

  const handleClear = () => {
    console.log("Clear button clicked");
    if (onClear) onClear();
  };

  return (
    <div className="flex flex-col gap-3 mt-4">
      {/* Кнопка Undo */}
      <button
        type="button"
        onClick={handleUndo}
        className={`flex items-center justify-center w-8 h-8 ${
          imageLoaded ? "colortulstext hover:bg-gray-800" : "text-gray-600"
        }`}
        disabled={false} // Видалено всі обмеження для тестування
        aria-label="Undo"
      >
        <img src="assets/svg/undo.svg" alt="Іконка" width="16" height="16" />
      {/*   <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" 
          stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M3 7v6h6" />
          <path d="M21 17a9 9 0 0 0-9-9 9 9 0 0 0-6 2.3L3 13" />
        </svg> */}
      </button>
      
      {/* Кнопка Redo */}
      <button
        type="button"
        onClick={handleRedo}
        className={`flex items-center justify-center w-8 h-8 ${
          imageLoaded ? "colortulstext hover:bg-gray-800" : "text-gray-600"
        }`}
        disabled={false} // Видалено всі обмеження для тестування
        aria-label="Redo"
      >
           <img src="assets/svg/next.svg" alt="Іконка" width="16" height="16" />
     
      {/*   <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" 
          stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M21 7v6h-6" />
          <path d="M3 17a9 9 0 0 1 9-9 9 9 0 0 1 6 2.3L21 13" />
        </svg> */}
      </button>
      
      {/* Кнопка Clear */}
      <button
        type="button"
        onClick={handleClear}
        className={`flex items-center justify-center w-8 h-8 ${
          imageLoaded ? "colortulstext hover:bg-gray-800" : "text-gray-600"
        }`}
        disabled={false} // Видалено всі обмеження для тестування
        aria-label="Clear"
      >
  {/*       <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" 
          stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M18 6 6 18" />
          <path d="m6 6 12 12" />
        </svg> */}
         <img src="assets/svg/close_mask.svg" alt="Іконка" width="16" height="16" />
      </button>
    </div>
  );
};

export default DrawingControls;