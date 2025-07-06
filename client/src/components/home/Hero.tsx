import React from 'react';
import { HeroProps } from './types';

export const Hero: React.FC<HeroProps> = () => {
  return (
    <section 
      className="relative h-screen flex items-center justify-center text-center"
      style={{
        background: `linear-gradient(rgba(26, 16, 36, 0.1), rgba(26, 16, 36, 0.2)),
                    url('/assets/images/bg_block_1.png') center/cover`
      }}
    >
      <div className="relative z-10 max-w-3xl px-8">
        <h1 className="text-5xl md:text-6xl font-medium mb-4 text-white font-pacifico">
          Создай 3D модель
        </h1>
        <p className="text-xl text-white/90 mb-8">
          из любого фото за пару минут
        </p>
        <div className="flex flex-col md:flex-row items-center justify-center space-y-4 md:space-y-0 md:space-x-8 text-white/80">
          <div className="flex items-center space-x-2">
            <span className="text-2xl">📸</span>
            <span>Загрузите фото</span>
          </div>
          <div className="flex items-center space-x-2">
            <span className="text-2xl">⚡</span>
            <span>Автоматическая генерация</span>
          </div>
          <div className="flex items-center space-x-2">
            <span className="text-2xl">🎭</span>
            <span>Скачайте GLB модель</span>
          </div>
        </div>
      </div>
      <div className="absolute inset-0 bg-gradient-to-b from-transparent via-[#1a1024]/80 to-[#1a1024]" />
    </section>
  );
};