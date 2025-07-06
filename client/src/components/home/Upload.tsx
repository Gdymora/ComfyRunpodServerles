// src/components/home/Upload.tsx
import React from 'react';
import { ImageLoader } from '../editor/ImageLoader';
import { ImageInfo } from '../../types/image';

interface UploadProps {
  onImageSelect: (imageInfo: ImageInfo) => void;
}

export const Upload: React.FC<UploadProps> = ({ onImageSelect }) => {
  return (
    <div className="w-[300px] h-[400px] bg-[#2a1b3d] rounded-lg overflow-hidden shadow-lg">
      <ImageLoader 
        onImageLoad={onImageSelect} 
        className="h-full flex flex-col justify-center" 
      />
    </div>
  );
};