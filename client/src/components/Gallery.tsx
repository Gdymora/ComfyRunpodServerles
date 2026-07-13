// src/components/Gallery.tsx
// Галерея пресетів: вбудовані приклади + персональні пресети користувача (localStorage).
// Клік по картці → onSelect(example) підставляє все в генератор.
import React from "react";
import { EXAMPLES, GenerationExample } from "../config/examples";

interface GalleryProps {
  activeId: string | null;
  disabled?: boolean;
  userPresets?: GenerationExample[];
  onSelect: (example: GenerationExample) => void;
  onDeletePreset?: (id: string) => void;
}

const Card: React.FC<{
  ex: GenerationExample;
  active: boolean;
  disabled?: boolean;
  onSelect: (ex: GenerationExample) => void;
  onDelete?: (id: string) => void;
}> = ({ ex, active, disabled, onSelect, onDelete }) => (
  <div
    className={`group relative bg-gray-800 rounded-lg overflow-hidden border transition-all ${
      active ? "border-purple-500 ring-2 ring-purple-500" : "border-gray-700 hover:border-purple-400"
    }`}
  >
    <button
      type="button"
      disabled={disabled}
      onClick={() => onSelect(ex)}
      title={ex.description}
      className="block w-full text-left disabled:opacity-50"
    >
      <div className="aspect-[3/4] bg-gradient-to-br from-purple-900/40 to-gray-900 relative">
        {ex.thumbnail ? (
          <img src={ex.thumbnail} alt={ex.title} loading="lazy" className="w-full h-full object-cover" />
        ) : (
          <div className="w-full h-full flex items-center justify-center text-gray-500 text-xs px-2 text-center">
            {ex.title}
          </div>
        )}
        {active && (
          <span className="absolute top-1 right-1 bg-purple-600 text-white text-[10px] px-1.5 py-0.5 rounded">
            обрано
          </span>
        )}
      </div>
      <div className="p-2">
        <p className="text-white text-sm font-medium truncate">{ex.title}</p>
        {ex.description && (
          <p className="text-gray-400 text-[11px] mt-0.5 line-clamp-2">{ex.description}</p>
        )}
        <div className="flex flex-wrap gap-1 mt-1.5">
          {ex.tags?.map((t) => (
            <span key={t} className="bg-gray-700 text-gray-300 text-[10px] px-1.5 py-0.5 rounded">
              {t}
            </span>
          ))}
        </div>
      </div>
    </button>
    {onDelete && (
      <button
        type="button"
        disabled={disabled}
        onClick={() => onDelete(ex.id)}
        title="Видалити пресет"
        className="absolute top-1 left-1 bg-black/60 hover:bg-red-600 text-white text-xs w-6 h-6 rounded flex items-center justify-center"
      >
        ✕
      </button>
    )}
  </div>
);

export const Gallery: React.FC<GalleryProps> = ({
  activeId,
  disabled,
  userPresets = [],
  onSelect,
  onDeletePreset,
}) => (
  <div className="space-y-5">
    {userPresets.length > 0 && (
      <div>
        <p className="text-white text-sm font-medium mb-2">💾 Мої пресети</p>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {userPresets.map((ex) => (
            <Card
              key={ex.id}
              ex={ex}
              active={ex.id === activeId}
              disabled={disabled}
              onSelect={onSelect}
              onDelete={onDeletePreset}
            />
          ))}
        </div>
      </div>
    )}
    <div>
      {userPresets.length > 0 && (
        <p className="text-white text-sm font-medium mb-2">Вбудовані приклади</p>
      )}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {EXAMPLES.map((ex) => (
          <Card
            key={ex.id}
            ex={ex}
            active={ex.id === activeId}
            disabled={disabled}
            onSelect={onSelect}
          />
        ))}
      </div>
    </div>
  </div>
);
