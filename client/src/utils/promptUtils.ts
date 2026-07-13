// Model-aware SDXL/Pony workflow factory for RunPod ComfyUI.
//
// Ключові принципи якості (чому раніше картинки були гірші за приклади Civitai):
//  1. Базова генерація йде на НАТИВНОМУ розмірі SDXL (~1 Мп), а не на 512.
//  2. Для Pony/Illustrious додається CLIPSetLastLayer (clip skip 2).
//  3. Hi-Res Fix використовує bislerp (а не nearest-exact) з керованим denoise.
//  4. Quality-префікс (score-теги) береться з пресета моделі, а не зашитий.

import type { HiresConfig, LoraConfig } from "../config/models";

export interface WorkflowOptions {
  width?: number;
  height?: number;
  seed?: number;
  steps?: number;
  cfg_scale?: number;
  negative_prompt?: string;
  denoise?: number;
  sampler_name?: string;
  scheduler?: string;

  // --- model-aware поля (заповнюються з ModelPreset) ---
  /** Назва .safetensors чекпоінта на Volume */
  checkpoint?: string;
  /** CLIP skip; для Pony/Illustrious = 2 */
  clip_skip?: number;
  /** Префікс, що додається на початок позитивного промпта (score-теги) */
  positive_prefix?: string;
  /** LoRA, що застосовуються до моделі */
  loras?: LoraConfig[];
  /** Окремий VAE (назва файлу); undefined = VAE з чекпоінта */
  vae?: string;
  /** Налаштування Hi-Res Fix */
  hires?: HiresConfig;
  /** Скільки варіантів згенерувати за один запуск (batch_size) */
  batch_size?: number;
  /**
   * Realism-refiner: назва іншого чекпоінта, який виконує фінальний Hi-Res прохід.
   * Напр. Pony малює позу/анатомію, а Juggernaut «перешкірює» результат у фотореалізм.
   * Діє лише коли hires увімкнено.
   */
  refiner?: string;
  /** Denoise рефайнера (скільки «перешкірити», типово 0.5) */
  refiner_denoise?: number;
  /** Назва файлу маски (inpaint). Якщо задано — перемальовується лише замаскована зона. */
  mask_image?: string;
  /** FreeU_V2 — безкоштовний буст деталей (вбудована нода ComfyUI) */
  freeu?: boolean;
  /** RescaleCFG multiplier (0.5–0.8) — проти «випаленої» текстури при вищому CFG */
  rescale_cfg?: number;
}

export interface ComfyNode {
  inputs: Record<string, unknown>;
  class_type: string;
  _meta?: { title?: string };
}

export interface RunPodInputImage {
  name: string;
  image: string;
}

export interface RunPodWorkflowRequest {
  input: {
    workflow: Record<string, ComfyNode>;
    images?: RunPodInputImage[];
  };
}

export type ComfyWorkflowRequest = RunPodWorkflowRequest;

const DEFAULT_CHECKPOINT = "skinny-18-sdxl.safetensors";
const INPUT_IMAGE_NAME = "input.png";

const createSeed = (seed?: number): number => {
  if (typeof seed === "number" && Number.isFinite(seed) && seed >= 0) {
    return Math.floor(seed);
  }
  return Math.floor(Math.random() * 1_000_000_000);
};

// Округлення до кратного 8 (вимога латент-простору SDXL)
const snap8 = (value: number, fallback: number): number => {
  if (typeof value !== "number" || !Number.isFinite(value) || value < 128) {
    return fallback;
  }
  return Math.max(128, Math.round(value / 8) * 8);
};

type ComfyRef = [string, number];

const buildSdxlWorkflow = (
  prompt: string,
  options: WorkflowOptions = {},
  useInputImage = false
): Record<string, ComfyNode> => {
  const checkpoint = options.checkpoint ?? DEFAULT_CHECKPOINT;

  // Базовий розмір = нативний SDXL (те, що приходить з UI). Раніше тут ділили на 1.5,
  // через що SDXL працювала на 512 і давала "мило". Тепер базою є сам вибраний розмір.
  const baseWidth = snap8(options.width ?? 832, 832);
  const baseHeight = snap8(options.height ?? 1216, 1216);

  const seed = createSeed(options.seed);
  const totalSteps = options.steps ?? 30;
  const cfg = options.cfg_scale ?? 6;
  const sampler = options.sampler_name ?? "dpmpp_2m_sde";
  const scheduler = options.scheduler ?? "karras";
  const clipSkip = options.clip_skip ?? 1;
  const prefix = options.positive_prefix ?? "";

  // Inpaint: перемальовуємо лише замасковану зону (Hi-Res тоді вимкнено).
  const isInpaint = useInputImage && !!options.mask_image;

  const hires = options.hires;
  const hiresEnabled = Boolean(hires?.enabled) && !isInpaint;
  const finalWidth = hiresEnabled ? snap8(baseWidth * (hires!.factor || 1.5), baseWidth) : baseWidth;
  const finalHeight = hiresEnabled ? snap8(baseHeight * (hires!.factor || 1.5), baseHeight) : baseHeight;

  const defaultNegative =
    "score_6, score_5, score_4, worst quality, low quality, blurry, bad anatomy, " +
    "bad hands, deformed, extra limbs, extra fingers, mutated hands, disfigured, " +
    "watermark, text, logo, censored";

  const workflow: Record<string, ComfyNode> = {};

  // 4 — завантаження чекпоінта → MODEL[4,0], CLIP[4,1], VAE[4,2]
  workflow["4"] = {
    inputs: { ckpt_name: checkpoint },
    class_type: "CheckpointLoaderSimple",
    _meta: { title: "Load Checkpoint" },
  };

  // Джерела MODEL / CLIP — можуть зміщуватись через LoRA та CLIPSetLastLayer
  let modelRef: ComfyRef = ["4", 0];
  let clipRef: ComfyRef = ["4", 1];

  // 40+ — ланцюжок LoRA (кожна бере вихід попередньої)
  const loras = options.loras ?? [];
  loras.forEach((lora, index) => {
    const nodeId = String(40 + index);
    workflow[nodeId] = {
      inputs: {
        lora_name: lora.name,
        strength_model: lora.strength,
        strength_clip: lora.strength,
        model: modelRef,
        clip: clipRef,
      },
      class_type: "LoraLoader",
      _meta: { title: `LoRA: ${lora.name}` },
    };
    modelRef = [nodeId, 0];
    clipRef = [nodeId, 1];
  });

  // 60 — CLIP skip (для Pony/Illustrious обов'язково -2)
  if (clipSkip > 1) {
    workflow["60"] = {
      inputs: { stop_at_clip_layer: -clipSkip, clip: clipRef },
      class_type: "CLIPSetLastLayer",
      _meta: { title: `CLIP Skip ${clipSkip}` },
    };
    clipRef = ["60", 0];
  }

  // 50/51 — FreeU_V2 (безкоштовний буст деталей) та RescaleCFG (проти «випаленої» текстури).
  // Вбудовані ноди ComfyUI — працюють і на базовому воркері.
  if (options.freeu) {
    workflow["50"] = {
      inputs: { b1: 1.3, b2: 1.4, s1: 0.9, s2: 0.2, model: modelRef },
      class_type: "FreeU_V2",
      _meta: { title: "FreeU V2" },
    };
    modelRef = ["50", 0];
  }
  if (typeof options.rescale_cfg === "number" && options.rescale_cfg > 0) {
    workflow["51"] = {
      inputs: { multiplier: options.rescale_cfg, model: modelRef },
      class_type: "RescaleCFG",
      _meta: { title: "Rescale CFG" },
    };
    modelRef = ["51", 0];
  }

  // 6 / 7 — енкодинг промптів. Префікс (score-теги) додається автоматично.
  workflow["6"] = {
    inputs: { text: `${prefix}${prompt}`, clip: clipRef },
    class_type: "CLIPTextEncode",
    _meta: { title: "Positive Prompt" },
  };
  workflow["7"] = {
    inputs: { text: options.negative_prompt ?? defaultNegative, clip: clipRef },
    class_type: "CLIPTextEncode",
    _meta: { title: "Negative Prompt" },
  };

  // VAE — з чекпоінта або окремий файл
  let vaeRef: ComfyRef = ["4", 2];
  if (options.vae) {
    workflow["70"] = {
      inputs: { vae_name: options.vae },
      class_type: "VAELoader",
      _meta: { title: "Load VAE" },
    };
    vaeRef = ["70", 0];
  }

  // Стартовий латент: EmptyLatentImage (text2img) або VAEEncode вхідного зображення (img2img)
  let baseLatent: ComfyRef;
  if (useInputImage) {
    workflow["10"] = {
      inputs: { image: INPUT_IMAGE_NAME },
      class_type: "LoadImage",
      _meta: { title: "Load Input Image" },
    };
    if (isInpaint) {
      // Маска: біле = зона перемальовування. LoadImage → ImageToMask(red) → VAEEncodeForInpaint
      workflow["20"] = {
        inputs: { image: options.mask_image },
        class_type: "LoadImage",
        _meta: { title: "Load Mask" },
      };
      workflow["21"] = {
        inputs: { image: ["20", 0], channel: "red" },
        class_type: "ImageToMask",
        _meta: { title: "Image To Mask" },
      };
      workflow["11"] = {
        inputs: { pixels: ["10", 0], vae: vaeRef, mask: ["21", 0], grow_mask_by: 6 },
        class_type: "VAEEncodeForInpaint",
        _meta: { title: "VAE Encode (Inpaint)" },
      };
    } else {
      workflow["11"] = {
        inputs: { pixels: ["10", 0], vae: vaeRef },
        class_type: "VAEEncode",
        _meta: { title: "VAE Encode" },
      };
    }
    baseLatent = ["11", 0];
  } else {
    const batchSize = Math.min(8, Math.max(1, Math.floor(options.batch_size ?? 1)));
    workflow["5"] = {
      inputs: { width: baseWidth, height: baseHeight, batch_size: batchSize },
      class_type: "EmptyLatentImage",
      _meta: { title: "Base Latent" },
    };
    baseLatent = ["5", 0];
  }

  // 3 — базовий KSampler. Для img2img denoise < 1 (щоб зберегти вхідне фото).
  const baseDenoise = isInpaint
    ? options.denoise ?? 1.0 // inpaint: повністю перемальовуємо замасковану зону
    : useInputImage
    ? options.denoise ?? 0.65
    : 1.0;
  workflow["3"] = {
    inputs: {
      seed,
      steps: totalSteps,
      cfg,
      sampler_name: sampler,
      scheduler,
      denoise: baseDenoise,
      model: modelRef,
      positive: ["6", 0],
      negative: ["7", 0],
      latent_image: baseLatent,
    },
    class_type: "KSampler",
    _meta: { title: "Base KSampler" },
  };

  // Джерело латента для декодування (з hires або без)
  let latentForDecode: ComfyRef = ["3", 0];

  if (hiresEnabled) {
    // 15 — латент-апскейл нормальним методом (bislerp), а не nearest-exact
    workflow["15"] = {
      inputs: {
        samples: ["3", 0],
        upscale_method: hires!.method || "bislerp",
        width: finalWidth,
        height: finalHeight,
        crop: "disabled",
      },
      class_type: "LatentUpscale",
      _meta: { title: "Hi-Res Upscale" },
    };
    if (options.refiner) {
      // Фінальний прохід іншим (реалістичним) чекпоінтом: Pony малює анатомію,
      // refiner (напр. Juggernaut) «перешкірює» у фотореалізм. Свій CLIP/VAE.
      workflow["80"] = {
        inputs: { ckpt_name: options.refiner },
        class_type: "CheckpointLoaderSimple",
        _meta: { title: "Refiner Checkpoint" },
      };
      const refinerPrefix =
        "photorealistic, realistic, raw photo, professional photography, " +
        "highly detailed skin texture, visible skin pores, natural skin, ";
      workflow["81"] = {
        inputs: { text: `${refinerPrefix}${prompt}`, clip: ["80", 1] },
        class_type: "CLIPTextEncode",
        _meta: { title: "Refiner Positive" },
      };
      workflow["82"] = {
        inputs: { text: options.negative_prompt ?? defaultNegative, clip: ["80", 1] },
        class_type: "CLIPTextEncode",
        _meta: { title: "Refiner Negative" },
      };
      workflow["16"] = {
        inputs: {
          seed,
          steps: Math.max(12, Math.floor(totalSteps * 0.5)),
          cfg,
          sampler_name: sampler,
          scheduler,
          denoise: options.refiner_denoise ?? 0.5,
          model: ["80", 0],
          positive: ["81", 0],
          negative: ["82", 0],
          latent_image: ["15", 0],
        },
        class_type: "KSampler",
        _meta: { title: "Refiner KSampler (realism)" },
      };
      vaeRef = ["80", 2]; // декодуємо VAE рефайнера
    } else {
      // 16 — звичайне фінальне шліфування тим самим чекпоінтом
      workflow["16"] = {
        inputs: {
          seed,
          steps: Math.max(12, Math.floor(totalSteps * 0.5)),
          cfg,
          sampler_name: sampler,
          scheduler,
          denoise: hires!.denoise ?? 0.4,
          model: modelRef,
          positive: ["6", 0],
          negative: ["7", 0],
          latent_image: ["15", 0],
        },
        class_type: "KSampler",
        _meta: { title: "Hi-Res KSampler" },
      };
    }
    latentForDecode = ["16", 0];
  }

  workflow["8"] = {
    inputs: { samples: latentForDecode, vae: vaeRef },
    class_type: "VAEDecode",
    _meta: { title: "VAE Decode" },
  };
  workflow["9"] = {
    inputs: { filename_prefix: "RunPod", images: ["8", 0] },
    class_type: "SaveImage",
    _meta: { title: "Save Image" },
  };

  return workflow;
};

export const createSdxlWorkflow = (
  prompt: string,
  options: WorkflowOptions = {}
): RunPodWorkflowRequest => ({
  input: { workflow: buildSdxlWorkflow(prompt, options, false) },
});

export const createFluxWorkflow = (
  prompt: string,
  seed?: number,
  width = 832,
  height = 1216,
  options: WorkflowOptions = {}
): RunPodWorkflowRequest =>
  createSdxlWorkflow(prompt, { ...options, seed, width, height });

export const createFluxImageWorkflow = (
  imageBase64: string,
  options: WorkflowOptions = {}
): RunPodWorkflowRequest => ({
  input: {
    workflow: buildSdxlWorkflow(
      "high quality detailed image, preserve the subject and composition",
      options,
      true
    ),
    images: [{ name: INPUT_IMAGE_NAME, image: imageBase64 }],
  },
});

export const createFluxImageTextWorkflow = (
  imageBase64: string,
  prompt: string,
  options: WorkflowOptions = {}
): RunPodWorkflowRequest => ({
  input: {
    workflow: buildSdxlWorkflow(prompt, options, true),
    images: [{ name: INPUT_IMAGE_NAME, image: imageBase64 }],
  },
});

const MASK_IMAGE_NAME = "mask.png";

// Inpaint: перемальовує лише замасковану (білу) зону вхідного фото за промптом.
export const createInpaintWorkflow = (
  imageBase64: string,
  maskBase64: string,
  prompt: string,
  options: WorkflowOptions = {}
): RunPodWorkflowRequest => ({
  input: {
    workflow: buildSdxlWorkflow(
      prompt,
      { ...options, mask_image: MASK_IMAGE_NAME },
      true
    ),
    images: [
      { name: INPUT_IMAGE_NAME, image: imageBase64 },
      { name: MASK_IMAGE_NAME, image: maskBase64 },
    ],
  },
});
