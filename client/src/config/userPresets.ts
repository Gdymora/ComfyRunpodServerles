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

// Експорт усіх пресетів у JSON-рядок (для бекапу у файл)
export const exportUserPresets = (): string =>
  JSON.stringify(loadUserPresets(), null, 2);

// Імпорт пресетів із JSON: додає нові до наявних (за id не дублює)
export const importUserPresets = (json: string): GenerationExample[] => {
  let incoming: GenerationExample[];
  try {
    const parsed = JSON.parse(json);
    if (!Array.isArray(parsed)) throw new Error("not an array");
    incoming = parsed as GenerationExample[];
  } catch {
    throw new Error("Некоректний файл пресетів (очікується JSON-масив)");
  }
  const existing = loadUserPresets();
  const byId = new Map(existing.map((p) => [p.id, p]));
  for (const p of incoming) {
    if (p && typeof p.id === "string" && typeof p.modelId === "string") {
      byId.set(p.id, p);
    }
  }
  return persist(Array.from(byId.values()));
};
