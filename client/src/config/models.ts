// src/config/models.ts
// Реєстр моделей — лише ті файли, що ПЕРЕВІРЕНО валідні на диску /workspace/models
// (serverless-воркер бачить те саме як /runpod-volume).
//
// Стан диску на 2026-07-13 (перекачано з civitai.com + перевірено заголовки safetensors):
//   ✅ checkpoints/intorealism_ultra_sdxl.safetensors 7.1G  SDXL realism (ver 3058932) — ДЕФОЛТ
//   ✅ checkpoints/skinny-18-sdxl.safetensors          6.5G  Pony XL
//   ✅ checkpoints/absolutereality_inpaint.safetensors 4.0G  SD 1.5 (фотошкіра)
//   ✅ checkpoints/oiled_skin_sd15.safetensors         4.0G  SD 1.5 (врятований)
//   ✅ sd_xl_base_1.0                                  вшитий у образ воркера (цензурований)
//   ✅ SDXL-loras: pornmaster_krea2, reverse_cowgirl_sdxl, pussy_of_queens_pony,
//                  ski_slope_breasts_sdxl, Skinny_(18+)_SDXL_v2.0, model_addon_v3
//   ✅ SD1.5-lora: oiled_skin_sd15_lora
//   Биті/порожні файли (realistic_base_ultra, sexgod, specialized, стара intorealism 325M) — видалено.
//
// Додаючи модель — вписуйте ТОЧНУ назву файлу і спершу перевіряйте, що файл валідний
// (не 0 байт, ~6.5G для SDXL / ~2-4G для SD1.5). Інакше воркер падає (conv_in.weight / 400).

export type ModelArchitecture = "pony" | "sdxl" | "illustrious" | "sd15";

export interface LoraConfig {
  name: string;
  strength: number;
}

export interface LoraOption {
  name: string;
  label: string;
  strength: number;
  defaultOn: boolean;
  warn?: string;
}

export interface HiresConfig {
  enabled: boolean;
  factor: number;
  denoise: number;
  method: "bislerp" | "bicubic" | "bilinear" | "nearest-exact";
}

export interface ModelPreset {
  id: string;
  label: string;
  checkpoint: string;
  architecture: ModelArchitecture;
  clipSkip: number;
  qualityPrefix: string;
  defaultNegative: string;
  vae?: string;
  availableLoras: LoraOption[];
  recommended: {
    cfg: number;
    steps: number;
    sampler: string;
    scheduler: string;
    width: number;
    height: number;
  };
  hires: HiresConfig;
  /**
   * Realism-refiner: чекпоінт для фінального Hi-Res проходу (перешкірення).
   * Для Pony тут ставимо Juggernaut → анатомія від Pony + фотореалізм від Juggernaut.
   */
  refiner?: string;
  note?: string;
}

const BAD_HANDS_NEGATIVE =
  "bad hands, deformed hands, malformed hands, poorly drawn hands, mutated hands, " +
  "extra fingers, fused fingers, missing fingers, too many fingers, long fingers, " +
  "extra arms, extra limbs, disfigured, bad anatomy";

const REALISM_NEGATIVE =
  "anime, cartoon, 3d, render, cgi, illustration, painting, drawing, sketch, " +
  "doll, plastic skin, airbrushed, smooth skin, waxy, " +
  BAD_HANDS_NEGATIVE +
  ", worst quality, low quality, jpeg artifacts, blurry, watermark, text, logo, censored";

const PONY_REALISM_NEGATIVE = "score_6, score_5, score_4, " + REALISM_NEGATIVE;

// Валідні SDXL-LoRA на диску (218M кожна). defaultOn:false — вмикайте за потреби.
const SDXL_LORAS: LoraOption[] = [
  { name: "pornmaster_krea2.safetensors", label: "PornMaster Krea2 — реалізм/чіткість, прибирає мультяшність", strength: 0.9, defaultOn: false },
  { name: "reverse_cowgirl_sdxl.safetensors", label: "Reverse Cowgirl — поза", strength: 0.8, defaultOn: false },
  { name: "pussy_of_queens_pony.safetensors", label: "Pussy of Queens — анатомія вульви (Pony)", strength: 0.7, defaultOn: false },
  { name: "ski_slope_breasts_sdxl.safetensors", label: "Ski Slope Breasts — форма грудей", strength: 0.6, defaultOn: false },
  { name: "Skinny_(18+)_SDXL_v2.0.safetensors", label: "Skinny 18+ — худорлява анатомія", strength: 0.6, defaultOn: false },
  { name: "model_addon_v3.safetensors", label: "Model Addon v3", strength: 0.6, defaultOn: false },
  // Свою натреновану character-LoRA додайте сюди (defaultOn:false).
];

export const MODEL_PRESETS: ModelPreset[] = [
  // ─────────── Juggernaut XL (дефолт) — еталонний фотореалізм SDXL ───────────
  {
    id: "juggernaut-xl",
    label: "Juggernaut XL — Ragnarok (SDXL фотореалізм) ✅",
    checkpoint: "juggernaut_xl.safetensors",
    architecture: "sdxl",
    clipSkip: 1,
    qualityPrefix:
      "photorealistic, realistic, raw photo, professional photography, sharp focus, " +
      "highly detailed skin texture, visible skin pores, natural lighting, film grain, ",
    defaultNegative: REALISM_NEGATIVE,
    availableLoras: SDXL_LORAS,
    // Juggernaut любить помірний CFG (3–6) і DPM++ 2M Karras.
    recommended: { cfg: 4, steps: 34, sampler: "dpmpp_2m", scheduler: "karras", width: 832, height: 1216 },
    hires: { enabled: true, factor: 1.5, denoise: 0.45, method: "bislerp" },
    note: "Еталонна фотореалістична SDXL-база (ver 1759168 Ragnarok, civitai.com). Універсальна, тримає всі SDXL-лори. Найкраща для реалізму.",
  },
  // ─────────── SDXL-фотореалізм (NSFW-орієнтована) — тримає SDXL-лори ───────────
  {
    id: "intorealism-sdxl",
    label: "IntoRealism Ultra (SDXL, фотореалізм) ✅",
    checkpoint: "intorealism_ultra_sdxl.safetensors",
    architecture: "sdxl",
    clipSkip: 1, // SDXL (НЕ Pony) → clip skip 1, без score-тегів
    qualityPrefix:
      "photorealistic, realistic, raw photo, professional photography, natural lighting, " +
      "highly detailed skin texture, visible skin pores, film grain, ",
    defaultNegative: REALISM_NEGATIVE,
    availableLoras: SDXL_LORAS,
    recommended: { cfg: 5, steps: 30, sampler: "dpmpp_2m", scheduler: "karras", width: 896, height: 1152 },
    hires: { enabled: true, factor: 1.5, denoise: 0.45, method: "bislerp" },
    note: "Справжня SDXL realism-база (ver 3058932, civitai.com). Нативний ~1Мп, тримає всі SDXL-лори. Головна модель для реалізму.",
  },
  // ⚠️ SD 1.5-моделі (absolutereality_inpaint, oiled_skin_sd15) ПРИБРАНО:
  //    absolutereality_inpaint — це INPAINTING-модель (9-канальний UNet), для txt2img
  //    дає дірки/уродців. Файли лишаються на диску, але для генерації не годяться —
  //    використовуйте SDXL-realism (Juggernaut / IntoRealism), вони кращі й стабільні.

  // ─────────── Pony — складні пози (реалізм-тюнінг) ───────────
  {
    id: "skinny-18-pony",
    label: "Skinny 18 — Pony XL (пози) ✅",
    checkpoint: "skinny-18-sdxl.safetensors",
    architecture: "pony",
    clipSkip: 2,
    qualityPrefix:
      "score_9, score_8_up, score_7_up, source_photo, rating_explicit, " +
      "realistic, photorealistic, raw photo, analog film grain, " +
      "highly detailed skin texture, visible skin pores, natural skin, ",
    defaultNegative: PONY_REALISM_NEGATIVE,
    availableLoras: SDXL_LORAS,
    recommended: { cfg: 4.5, steps: 36, sampler: "dpmpp_2m_sde", scheduler: "karras", width: 832, height: 1216 },
    hires: { enabled: true, factor: 1.5, denoise: 0.4, method: "bislerp" },
    // Pony малює позу/анатомію → Juggernaut на Hi-Res «перешкірює» у фотореалізм.
    refiner: "juggernaut_xl.safetensors",
    note: "Pony XL: чудові пози/анатомія, але мультяшне лице/шкіра. Тому увімкнено REFINER — фінальний Hi-Res прохід робить Juggernaut (фотореалізм). Тримайте Hi-Res увімкненим.",
  },
  // ─────────── Vanilla SDXL (вшитий у воркер) — для тестів пайплайна ───────────
  {
    id: "sdxl-base",
    label: "SDXL Base 1.0 (тест пайплайна, цензурована)",
    checkpoint: "sd_xl_base_1.0.safetensors",
    architecture: "sdxl",
    clipSkip: 1,
    qualityPrefix: "photorealistic, detailed, ",
    defaultNegative: REALISM_NEGATIVE,
    availableLoras: [],
    recommended: { cfg: 6, steps: 28, sampler: "dpmpp_2m", scheduler: "karras", width: 1024, height: 1024 },
    hires: { enabled: false, factor: 1.5, denoise: 0.4, method: "bislerp" },
    note: "Вшита у образ воркера. Цензурована — лише для перевірки, що ендпоінт живий.",
  },
];

export const DEFAULT_MODEL_ID = "juggernaut-xl";

export const getModelPreset = (id: string): ModelPreset =>
  MODEL_PRESETS.find((m) => m.id === id) ?? MODEL_PRESETS[0];

export { REALISM_NEGATIVE };
