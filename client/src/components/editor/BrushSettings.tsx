// src/components/editor/BrushSettings.tsx
import React from 'react';

interface BrushSettingsProps {
  brushSize: number;
  eraserSize: number;
  activeTool: string;
  disabled: boolean;
  onBrushSizeChange: (size: number) => void;
  onEraserSizeChange: (size: number) => void;
  onToolChange: (tool: string) => void;
}

const BrushSettings: React.FC<BrushSettingsProps> = ({
  brushSize,
  eraserSize,
  activeTool,
  disabled,
  onBrushSizeChange,
  onEraserSizeChange,
  onToolChange
}) => {
  return (
    <div className="space-y-3 w-full">
      {/* Розмір пензля */}
      <div className="flex items-center mb-3">
        <button
          onClick={() => !disabled && onToolChange("brush")}
          className={`p-2 ${
            activeTool === "brush" ? "text-pink-400" : "text-gray-400"
          } ${disabled ? "opacity-50 cursor-not-allowed" : "cursor-pointer"}`}
          disabled={disabled}
        >
          <img src="assets/svg/brush_size.svg" alt="Іконка" width="16" height="16" />
        </button>
        <span className="text-pink-400 text-sm ml-1"> {brushSize}</span>
        <div className="flex-grow ml-2">
          <div className="relative w-full h-2">
            {/* Фон для повзунка */}
            <div className="absolute w-full h-1 top-0.5 bg-gray-700 rounded"></div>
            
            {/* Заповнена частина повзунка */}
            <div 
              className="absolute h-1 top-0.5 bg-pink-400 rounded-l" 
              style={{ width: `${(brushSize / 50) * 100}%` }}
            ></div>
            
            {/* Сам повзунок */}
            <input
              type="range"
              min="1"
              max="50"
              value={brushSize}
              onChange={(e) => !disabled && onBrushSizeChange(parseInt(e.target.value))}
              className="absolute w-full h-2 opacity-0 cursor-pointer"
              disabled={disabled}
            />
            
            {/* Маркер повзунка */}
            <div 
              className="absolute w-4 h-4 bg-pink-400 rounded-full -mt-1 pointer-events-none" 
              style={{ left: `calc(${(brushSize / 50) * 100}% - 8px)` }}
            ></div>
          </div>
        </div> 
      </div>

      {/* Розмір гумки */}
      <div className="flex items-center mb-3">
        <button
          onClick={() => !disabled && onToolChange("eraser")}
          className={`p-2 ${
            activeTool === "eraser" ? "text-pink-400" : "text-gray-400"
          } ${disabled ? "opacity-50 cursor-not-allowed" : "cursor-pointer"}`}
          disabled={disabled}
        >
          <img src="assets/svg/terka_btn.svg" alt="Іконка" width="16" height="16" /> 
        </button>
        <span className="text-pink-400 text-sm ml-1"> {eraserSize}</span>
        <div className="flex-grow ml-2">
          <div className="relative w-full h-2">
            {/* Фон для повзунка */}
            <div className="absolute w-full h-1 top-0.5 bg-gray-700 rounded"></div>
            
            {/* Заповнена частина повзунка */}
            <div 
              className="absolute h-1 top-0.5 bg-pink-400 rounded-l" 
              style={{ width: `${(eraserSize / 50) * 100}%` }}
            ></div>
            
            {/* Сам повзунок */}
            <input
              type="range"
              min="1"
              max="50"
              value={eraserSize}
              onChange={(e) => !disabled && onEraserSizeChange(parseInt(e.target.value))}
              className="absolute w-full h-2 opacity-0 cursor-pointer"
              disabled={disabled}
            />
            
            {/* Маркер повзунка */}
            <div 
              className="absolute w-4 h-4 bg-pink-400 rounded-full -mt-1 pointer-events-none" 
              style={{ left: `calc(${(eraserSize / 50) * 100}% - 8px)` }}
            ></div>
          </div>
        </div> 
      </div>
    </div>
  );
};

export default BrushSettings;