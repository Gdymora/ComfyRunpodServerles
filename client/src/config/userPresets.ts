// src/config/userPresets.ts
// Персональні пресети користувача — зберігаються локально (localStorage) у браузері.
// Дозволяють зберегти будь-яку вдалу генерацію (модель + промпт + налаштування + LoRA)
// як картку в галереї й повторно її застосовувати. Промпти нікуди не відправляються.

import { GenerationExample } from "./examples";

const KEY = "user_presets_v1";

export const loadUserPresets = (): GenerationExample[] => {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return [];
    const arr = JSON.parse(raw);
    return Array.isArray(arr) ? (arr as GenerationExample[]) : [];
  } catch {
    return [];
  }
};

const persist = (list: GenerationExample[]): GenerationExample[] => {
  try {
    localStorage.setItem(KEY, JSON.stringify(list));
  } catch {
    /* ignore quota/serialization errors */
  }
  return list;
};

export const saveUserPreset = (preset: GenerationExample): GenerationExample[] => {
  const list = loadUserPresets();
  const idx = list.findIndex((p) => p.id === preset.id);
  if (idx >= 0) list[idx] = preset;
  else list.unshift(preset);
  return persist(list);
};

export const deleteUserPreset = (id: string): GenerationExample[] =>
  persist(loadUserPresets().filter((p) => p.id !== id));
