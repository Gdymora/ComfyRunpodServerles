import React from 'react';
import { CardProps } from './types';

export const Card: React.FC<CardProps> = ({ children, className = '' }) => {
  return (
    <div className={`bg-[#2a1b3d] rounded-lg shadow-lg ${className}`}>
      {children}
    </div>
  );
};
