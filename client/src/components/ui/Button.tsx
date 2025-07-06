import React from 'react';
import { ButtonProps } from './types';

export const Button: React.FC<ButtonProps> = ({ 
  variant = 'primary', 
  children, 
  className = '',
  ...props 
}) => {
  const baseStyles = "px-4 py-2 rounded-full transition-all transform";
  const variantStyles = {
    primary: "bg-purple-700 text-white hover:bg-purple-600 hover:-translate-y-1",
    secondary: "bg-gray-700 text-white hover:bg-gray-600 hover:-translate-y-1"
  };

  return (
    <button 
      className={`${baseStyles} ${variantStyles[variant]} ${className}`}
      {...props}
    >
      {children}
    </button>
  );
};