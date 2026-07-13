// src/config/examples.ts
// Галерея готових пресетів (рецептів). Клік по картці підставляє модель + промпт +
// налаштування + LoRA у генератор і СКИДАЄ всі LoRA-чекбокси до значень рецепта
// (у більшості — без лор, бо чистий чекпоінт дає найкращу анатомію).
//
// prompt — користувацька частина (quality-префікс моделі додається автоматично).
// thumbnail — шлях у public/ (плейсхолдери; замініть на свої кращі кадри).

export interface ExampleLora {
  name: string;
  strength: number;
}

export interface GenerationExample {
  id: string;
  title: string;
  description?: string;
  thumbnail?: string;
  modelId: string;
  prompt: string;
  negativePrompt?: string;
  cfg: number;
  steps: number;
  sampler: string;
  scheduler: string;
  width: number;
  height: number;
  seed?: number;
  hiresEnabled: boolean;
  /** Які LoRA увімкнути. Порожній масив = усі вимкнені (чистий чекпоінт). */
  loras?: ExampleLora[];
  tags?: string[];
}

export const EXAMPLES: GenerationExample[] = [
  {
    id: "pipeline-test",
    title: "🔧 Тест пайплайна (SFW)",
    description: "Vanilla SDXL, простий SFW-промпт, без Hi-Res. Перевірка, що система жива.",
    thumbnail: "/examples/apple-test.png",
    modelId: "sdxl-base",
    prompt: "a photo of a red apple on a wooden table, sharp focus, natural light, high detail",
    negativePrompt: "blurry, low quality, deformed",
    cfg: 6,
    steps: 25,
    sampler: "dpmpp_2m",
    scheduler: "karras",
    width: 1024,
    height: 1024,
    hiresEnabled: false,
    loras: [],
    tags: ["test", "sfw"],
  },
  {
    id: "jugg-portrait",
    title: "Портрет — Juggernaut XL",
    description: "Чистий Juggernaut без лор. Портрет = багато пікселів на обличчя → найкраще лице.",
    thumbnail: "/examples/example-03.png",
    modelId: "juggernaut-xl",
    prompt:
      "portrait of a beautiful young woman, upper body, looking at camera, soft natural window light, " +
      "detailed face, freckles, natural skin, shot on 85mm lens, shallow depth of field",
    cfg: 4,
    steps: 34,
    sampler: "dpmpp_2m",
    scheduler: "karras",
    width: 832,
    height: 1216,
    hiresEnabled: true,
    loras: [],
    tags: ["realism", "portrait"],
  },
  {
    id: "jugg-fullbody",
    title: "Повний зріст — Juggernaut XL",
    description: "Чистий Juggernaut. Для повного зросту раджу batch 4 — руки залежать від seed.",
    thumbnail: "/examples/example-02.png",
    modelId: "juggernaut-xl",
    prompt:
      "full body photo of a fit young woman standing in a sunlit modern apartment, " +
      "natural pose, photorealistic, detailed skin, sharp focus, dslr",
    cfg: 4,
    steps: 34,
    sampler: "dpmpp_2m",
    scheduler: "karras",
    width: 832,
    height: 1216,
    hiresEnabled: true,
    loras: [],
    tags: ["realism", "fullbody"],
  },
  {
    id: "intorealism-nsfw",
    title: "IntoRealism (NSFW realism)",
    description: "NSFW-орієнтована SDXL-realism база, без лор. Додавайте 1 лору за потреби.",
    thumbnail: "/examples/example-bottle.png",
    modelId: "intorealism-sdxl",
    prompt:
      "photorealistic nude photo of a young woman on a bed, natural soft lighting, " +
      "detailed skin texture, candid, dslr",
    cfg: 5,
    steps: 30,
    sampler: "dpmpp_2m",
    scheduler: "karras",
    width: 896,
    height: 1152,
    hiresEnabled: true,
    loras: [],
    tags: ["realism", "nsfw"],
  },
  {
    id: "skin-closeup",
    title: "Крупний план шкіри",
    description: "Макро текстури шкіри на Juggernaut XL — пори, краплі, м'яке світло.",
    thumbnail: "/examples/example-03.png",
    modelId: "juggernaut-xl",
    prompt:
      "extreme close-up of wet glistening skin with visible pores, water droplets, " +
      "soft studio light, macro photography, hyperdetailed",
    cfg: 4,
    steps: 34,
    sampler: "dpmpp_2m",
    scheduler: "karras",
    width: 1024,
    height: 1024,
    hiresEnabled: true,
    loras: [],
    tags: ["skin", "closeup"],
  },
  {
    id: "pony-pose",
    title: "Складна поза (Pony)",
    description: "Pony знає багато поз. LoRA пози можна додати вручну (1 штука).",
    thumbnail: "/examples/example-bottle.png",
    modelId: "skinny-18-pony",
    prompt:
      "a slim young woman, full body, dynamic pose, bedroom, warm lighting, " +
      "photorealistic, detailed skin",
    cfg: 4.5,
    steps: 36,
    sampler: "dpmpp_2m_sde",
    scheduler: "karras",
    width: 832,
    height: 1216,
    hiresEnabled: true,
    loras: [],
    tags: ["pose", "pony"],
  },
];
