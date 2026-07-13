// src/App.tsx - Фінальна версія з стандартними RunPod ендпоїнтами
import React, { useState, useEffect } from "react";
import { Navigation } from "./components/navigation/Navigation";
import { ImageLoader } from "./components/editor/ImageLoader";
import { ImageInfo } from "./types/image";
import { createRunPodService, RunPodResponse } from "./services/runpodService";
import { config, initializeConfig } from "./config/env";
import {
  ProcessedRunPodResponse,
  ProcessedImage,
} from "./services/runpodService";
import {
  MODEL_PRESETS,
  DEFAULT_MODEL_ID,
  getModelPreset,
} from "./config/models";
import { Gallery } from "./components/Gallery";
import { MaskCanvas } from "./components/MaskCanvas";
import { GenerationExample } from "./config/examples";
import {
  loadUserPresets,
  saveUserPreset,
  deleteUserPreset,
} from "./config/userPresets";

type InputType = "text" | "image" | "both";

interface LoraSetting {
  name: string;
  label: string;
  strength: number;
  enabled: boolean;
  warn?: string;
}

// Чистий (SFW) префікс: прибирає nude/rating_explicit, лишає якість.
// Для Pony зберігаємо score-теги (без них у Pony падає якість).
const cleanPrefixFor = (architecture: string): string =>
  architecture === "pony"
    ? "score_9, score_8_up, score_7_up, realistic, photorealistic, raw photo, highly detailed, "
    : "photorealistic, realistic, raw photo, high quality, highly detailed, ";

const buildLoraSettings = (id: string): LoraSetting[] =>
  getModelPreset(id).availableLoras.map((l) => ({
    name: l.name,
    label: l.label,
    strength: l.strength,
    enabled: l.defaultOn,
    warn: l.warn,
  }));

// Зменшена JPEG-мініатюра з готового зображення (щоб прев'ю не забило localStorage).
const makeThumbnail = (url: string, max = 320): Promise<string | undefined> =>
  new Promise((resolve) => {
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => {
      const scale = Math.min(1, max / Math.max(img.width, img.height));
      const w = Math.round(img.width * scale);
      const h = Math.round(img.height * scale);
      const canvas = document.createElement("canvas");
      canvas.width = w;
      canvas.height = h;
      const ctx = canvas.getContext("2d");
      if (!ctx) return resolve(undefined);
      ctx.drawImage(img, 0, 0, w, h);
      try {
        resolve(canvas.toDataURL("image/jpeg", 0.8));
      } catch {
        resolve(undefined); // tainted canvas (напр. cross-origin s3)
      }
    };
    img.onerror = () => resolve(undefined);
    img.src = url;
  });

const App: React.FC = () => {
  const [inputType, setInputType] = useState<InputType>("text");
  const [imageInfo, setImageInfo] = useState<ImageInfo | null>(null);
  const [textPrompt, setTextPrompt] = useState<string>("");
  const [negativePrompt, setNegativePrompt] = useState<string>("");
  const [isLoading, setIsLoading] = useState(false);
  const [result, setResult] = useState<ProcessedRunPodResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [jobId, setJobId] = useState<string | null>(null);

  // Вибрана модель — від неї залежать усі рекомендовані налаштування
  const [modelId, setModelId] = useState<string>(DEFAULT_MODEL_ID);
  const preset = getModelPreset(modelId);

  // Параметри генерації (ініціалізуються з пресета моделі)
  const [width, setWidth] = useState(preset.recommended.width);
  const [height, setHeight] = useState(preset.recommended.height);
  const [steps, setSteps] = useState(preset.recommended.steps);
  const [cfgScale, setCfgScale] = useState(preset.recommended.cfg);
  const [sampler, setSampler] = useState(preset.recommended.sampler);
  const [scheduler, setScheduler] = useState(preset.recommended.scheduler);
  const [seed, setSeed] = useState(-1);
  const [hiresEnabled, setHiresEnabled] = useState(preset.hires.enabled);
  const [batchCount, setBatchCount] = useState(1);
  // SFW-режим: чистий префікс без nude/explicit
  const [cleanPrefix, setCleanPrefix] = useState(false);
  // Сила зміни вхідного фото в режимах image/both (менше = ближче до оригіналу)
  const [denoise, setDenoise] = useState(0.65);
  // Inpaint (маска)
  const [inpaintMode, setInpaintMode] = useState(false);
  const [maskBase64, setMaskBase64] = useState<string | null>(null);
  const [loraSettings, setLoraSettings] = useState<LoraSetting[]>(() =>
    buildLoraSettings(DEFAULT_MODEL_ID)
  );
  const [activeExampleId, setActiveExampleId] = useState<string | null>(null);
  const [userPresets, setUserPresets] = useState<GenerationExample[]>([]);

  useEffect(() => {
    initializeConfig();
    setUserPresets(loadUserPresets());
  }, []);

  // Зберегти поточну конфігурацію (модель + промпт + налаштування + LoRA + прев'ю) як пресет
  const handleSavePreset = async () => {
    const title = window.prompt(
      "Назва пресету:",
      textPrompt.trim().slice(0, 32) || preset.label
    );
    if (!title) return;

    // Обкладинка — з останнього згенерованого зображення (зменшена мініатюра)
    const lastImage = result?.processedImages?.[0]?.url;
    const thumbnail = lastImage ? await makeThumbnail(lastImage) : undefined;

    const ex: GenerationExample = {
      id: "user-" + Date.now(),
      title,
      description: preset.label,
      thumbnail,
      modelId,
      prompt: textPrompt,
      negativePrompt: negativePrompt.trim() || undefined,
      cfg: cfgScale,
      steps,
      sampler,
      scheduler,
      width,
      height,
      seed: seed !== -1 ? seed : undefined,
      hiresEnabled,
      loras: loraSettings
        .filter((l) => l.enabled)
        .map((l) => ({ name: l.name, strength: l.strength })),
      tags: ["мій"],
    };
    setUserPresets(saveUserPreset(ex));
    setActiveExampleId(ex.id);
  };

  const handleDeletePreset = (id: string) => {
    setUserPresets(deleteUserPreset(id));
    if (activeExampleId === id) setActiveExampleId(null);
  };

  // Застосувати приклад із галереї: модель + промпт + усі налаштування + LoRA
  const applyExample = (ex: GenerationExample) => {
    setModelId(ex.modelId);
    setTextPrompt(ex.prompt);
    setNegativePrompt(ex.negativePrompt ?? "");
    setWidth(ex.width);
    setHeight(ex.height);
    setSteps(ex.steps);
    setCfgScale(ex.cfg);
    setSampler(ex.sampler);
    setScheduler(ex.scheduler);
    setHiresEnabled(ex.hiresEnabled);
    setSeed(ex.seed ?? -1);

    const base = buildLoraSettings(ex.modelId);
    setLoraSettings(
      ex.loras
        ? base.map((l) => {
            const o = ex.loras!.find((x) => x.name === l.name);
            return o
              ? { ...l, enabled: true, strength: o.strength }
              : { ...l, enabled: false };
          })
        : base
    );

    setInputType("text");
    setActiveExampleId(ex.id);
    setResult(null);
    setError(null);
  };

  // Зміна моделі підставляє її рекомендовані параметри та сумісні LoRA
  const handleModelChange = (id: string) => {
    const next = getModelPreset(id);
    setModelId(id);
    setWidth(next.recommended.width);
    setHeight(next.recommended.height);
    setSteps(next.recommended.steps);
    setCfgScale(next.recommended.cfg);
    setSampler(next.recommended.sampler);
    setScheduler(next.recommended.scheduler);
    setHiresEnabled(next.hires.enabled);
    setLoraSettings(buildLoraSettings(id));
    setActiveExampleId(null);
    setResult(null);
    setError(null);
  };

  const toggleLora = (name: string) =>
    setLoraSettings((prev) =>
      prev.map((l) => (l.name === name ? { ...l, enabled: !l.enabled } : l))
    );

  const setLoraStrength = (name: string, strength: number) =>
    setLoraSettings((prev) =>
      prev.map((l) => (l.name === name ? { ...l, strength } : l))
    );

  // Створюємо сервіс з проксі URL
  const runpodService = createRunPodService(
    config.RUNPOD.ENDPOINT_ID,
    config.RUNPOD.PROXY_URL
  );

  // base64 приходить прямо з ImageLoader (клієнтський флоу, без сервера-аплоуду)
  const imageToBase64 = (info: ImageInfo): string => {
    if (!info.base64) {
      throw new Error("Зображення не містить base64-даних");
    }
    return info.base64;
  };

  const handleGenerate = async () => {
    if (!canGenerate()) {
      alert("Заповніть необхідні поля");
      return;
    }

    setIsLoading(true);
    setError(null);
    setResult(null);
    setJobId(null);

    try {
      let response: RunPodResponse;
      const currentSeed =
        seed === -1 ? Math.floor(Math.random() * 1000000000) : seed;

      // Налаштування, обов'язкові для конкретної моделі (Pony → clip skip 2, score-теги, і т.д.)
      const baseOptions = {
        width,
        height,
        steps,
        cfg_scale: cfgScale,
        sampler_name: sampler,
        scheduler,
        seed: currentSeed,
        negative_prompt:
          negativePrompt.trim() || preset.defaultNegative || undefined,
        checkpoint: preset.checkpoint,
        clip_skip: preset.clipSkip,
        positive_prefix: cleanPrefix
          ? cleanPrefixFor(preset.architecture)
          : preset.qualityPrefix,
        loras: loraSettings
          .filter((l) => l.enabled)
          .map((l) => ({ name: l.name, strength: l.strength })),
        vae: preset.vae,
        hires: { ...preset.hires, enabled: hiresEnabled },
        batch_size: batchCount,
        denoise,
        refiner: preset.refiner,
      };

      // Для img2img (image/both) Hi-Res вимикаємо — цільовий розмір рахується від
      // параметрів моделі, а не від вхідного фото, тож апскейл спотворював би пропорції.
      const img2imgOptions = {
        ...baseOptions,
        hires: { ...preset.hires, enabled: false },
      };

      const useInpaint =
        (inputType === "image" || inputType === "both") &&
        imageInfo &&
        inpaintMode &&
        !!maskBase64;

      if (useInpaint && imageInfo && maskBase64) {
        // Inpaint: перемальовуємо лише замасковану зону за промптом
        const imageBase64 = imageToBase64(imageInfo);
        response = await runpodService.generateInpaint(
          imageBase64,
          maskBase64,
          textPrompt.trim() || "high quality, detailed, seamless",
          img2imgOptions
        );
      } else if (inputType === "text" && textPrompt.trim()) {
        // Тільки текст
        response = await runpodService.generateFromText(
          textPrompt,
          baseOptions
        );
      } else if (inputType === "image" && imageInfo) {
        // Тільки зображення (img2img)
        const imageBase64 = imageToBase64(imageInfo);
        response = await runpodService.generateFromImage(
          imageBase64,
          img2imgOptions
        );
      } else if (inputType === "both" && imageInfo && textPrompt.trim()) {
        // Зображення + текст (img2img з промптом)
        const imageBase64 = imageToBase64(imageInfo);
        response = await runpodService.generateFromImageAndText(
          imageBase64,
          textPrompt,
          img2imgOptions
        );
      } else {
        throw new Error("Необхідні дані не заповнені");
      }

      setResult(response);
      if (response.id) {
        setJobId(response.id);
      }
    } catch (error) {
      console.error("Generation error:", error);
      setError(error instanceof Error ? error.message : "Невідома помилка");
    } finally {
      setIsLoading(false);
    }
  };

  const canGenerate = () => {
    if (inputType === "text") return textPrompt.trim().length > 0;
    if (inputType === "image") return !!imageInfo;
    if (inputType === "both")
      return !!imageInfo && textPrompt.trim().length > 0;
    return false;
  };

  const handleImageSelect = (info: ImageInfo) => {
    setImageInfo(info);
    setResult(null);
    setError(null);
  };

  const handleInputTypeChange = (type: InputType) => {
    setInputType(type);
    setResult(null);
    setError(null);
  };

  const handleReset = () => {
    setImageInfo(null);
    setTextPrompt("");
    setNegativePrompt("");
    setResult(null);
    setError(null);
    setJobId(null);
    setInpaintMode(false);
    setMaskBase64(null);
  };

  // Використати згенероване фото як вхід для img2img / inpaint
  const handleUseAsInput = async (image: ProcessedImage) => {
    let url = image.url;
    let base64 = image.type === "s3_url" ? undefined : image.data;
    if (!base64) {
      // s3/зовнішнє посилання — тягнемо й конвертуємо в base64
      try {
        const blob = await (await fetch(image.url)).blob();
        const dataUrl: string = await new Promise((res, rej) => {
          const r = new FileReader();
          r.onloadend = () => res(r.result as string);
          r.onerror = rej;
          r.readAsDataURL(blob);
        });
        url = dataUrl;
        base64 = dataUrl.split(",")[1];
      } catch {
        /* якщо не вдалось (CORS) — img2img не спрацює, попередимо */
      }
    }
    setImageInfo({
      filename: image.filename || "input.png",
      subfolder: "",
      type: "input",
      url,
      base64,
    });
    setInputType("both");
    setInpaintMode(false);
    setMaskBase64(null);
    setResult(null);
    setError(null);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  return (
    <div className="min-h-screen bg-background">
      <Navigation />

      <section
        className="min-h-screen flex flex-col items-center justify-center p-4 md:p-8 
                bg-gradient-to-b from-[#1a1024]/95 to-[#1a1024]/98"
        style={{
          background: `linear-gradient(rgba(26, 16, 36, 0.3), rgba(26, 16, 36, 0.8)),
                              url('/assets/images/bg_site.png') center/cover`,
        }}
      >
        <h2 className="text-xl text-white md:text-3xl text-center mt-5 mb-6 md:mb-12">
          AI Generator - RunPod
        </h2>

        <div className="w-full max-w-4xl mx-auto">
          {/* Галерея пресетів */}
          <details className="mb-6 bg-[#1f1536] rounded-lg p-4" open>
            <summary className="text-white font-medium cursor-pointer mb-1">
              🖼️ Галерея пресетів
              <span className="text-gray-400 text-sm font-normal">
                {" "}— оберіть приклад, і промпт + налаштування підставляться
              </span>
            </summary>
            <div className="mt-4">
              <Gallery
                activeId={activeExampleId}
                disabled={isLoading}
                userPresets={userPresets}
                onSelect={applyExample}
                onDeletePreset={handleDeletePreset}
              />
            </div>
          </details>

          {/* Вибір моделі */}
          <div className="mb-6 bg-[#1f1536] rounded-lg p-4">
            <label className="block text-white font-medium mb-2">
              Модель
            </label>
            <select
              value={modelId}
              onChange={(e) => handleModelChange(e.target.value)}
              disabled={isLoading}
              className="w-full bg-gray-800 text-white rounded-lg px-4 py-3 border border-gray-600 focus:border-purple-500 focus:outline-none"
            >
              {MODEL_PRESETS.map((m) => (
                <option key={m.id} value={m.id}>
                  {m.label}
                </option>
              ))}
            </select>
            <div className="flex flex-wrap gap-2 mt-3 text-xs">
              <span className="bg-purple-900/60 text-purple-200 px-2 py-1 rounded">
                {preset.architecture.toUpperCase()}
              </span>
              <span className="bg-gray-700 text-gray-300 px-2 py-1 rounded">
                CLIP skip {preset.clipSkip}
              </span>
              <span className="bg-gray-700 text-gray-300 px-2 py-1 rounded">
                {preset.recommended.width}×{preset.recommended.height}
              </span>
              {preset.qualityPrefix && (
                <span className="bg-gray-700 text-gray-300 px-2 py-1 rounded">
                  prefix: {preset.qualityPrefix.trim()}
                </span>
              )}
            </div>

            {preset.note && (
              <p className="text-gray-400 text-xs mt-3">ℹ️ {preset.note}</p>
            )}

            {/* SFW-тумблер: чистий префікс без nude/explicit */}
            <label className="flex items-center gap-2 mt-3 text-gray-200 text-sm cursor-pointer">
              <input
                type="checkbox"
                checked={cleanPrefix}
                onChange={(e) => setCleanPrefix(e.target.checked)}
                disabled={isLoading}
                className="w-4 h-4 accent-emerald-600"
              />
              SFW / чистий префікс
              <span className="text-gray-500 text-xs">
                (прибирає авто-<code>nude</code>/<code>rating_explicit</code>, лишає якість)
              </span>
            </label>

            {/* LoRA — лише сумісні з обраним чекпоінтом */}
            {loraSettings.length > 0 && (
              <div className="mt-4 border-t border-gray-700 pt-3">
                <p className="text-white text-sm font-medium mb-2">
                  LoRA (модифікатори)
                </p>
                <div className="space-y-2">
                  {loraSettings.map((lora) => (
                    <div
                      key={lora.name}
                      className="flex items-center gap-3 bg-gray-800/60 rounded px-3 py-2"
                    >
                      <label className="flex items-center gap-2 text-gray-200 text-sm cursor-pointer flex-1">
                        <input
                          type="checkbox"
                          checked={lora.enabled}
                          onChange={() => toggleLora(lora.name)}
                          disabled={isLoading}
                          className="w-4 h-4 accent-purple-600"
                        />
                        {lora.label}
                      </label>
                      <input
                        type="number"
                        value={lora.strength}
                        onChange={(e) =>
                          setLoraStrength(lora.name, Number(e.target.value))
                        }
                        min="0"
                        max="1.5"
                        step="0.05"
                        disabled={isLoading || !lora.enabled}
                        title="Сила LoRA"
                        className="w-20 bg-gray-700 text-white rounded px-2 py-1 text-sm disabled:opacity-40"
                      />
                      {lora.warn && (
                        <span
                          title={lora.warn}
                          className="text-yellow-400 text-xs cursor-help"
                        >
                          ⚠️
                        </span>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Вкладки типу введення */}
          <div className="mb-6">
            <div className="flex justify-center gap-2 bg-gray-800 rounded-lg p-2">
              <button
                onClick={() => handleInputTypeChange("text")}
                className={`px-6 py-3 rounded-lg font-medium transition-all ${
                  inputType === "text"
                    ? "bg-purple-600 text-white"
                    : "bg-gray-700 text-gray-300 hover:bg-gray-600"
                }`}
              >
                📝 Тільки текст
              </button>
              <button
                onClick={() => handleInputTypeChange("image")}
                className={`px-6 py-3 rounded-lg font-medium transition-all ${
                  inputType === "image"
                    ? "bg-purple-600 text-white"
                    : "bg-gray-700 text-gray-300 hover:bg-gray-600"
                }`}
              >
                🖼️ Тільки зображення
              </button>
              <button
                onClick={() => handleInputTypeChange("both")}
                className={`px-6 py-3 rounded-lg font-medium transition-all ${
                  inputType === "both"
                    ? "bg-purple-600 text-white"
                    : "bg-gray-700 text-gray-300 hover:bg-gray-600"
                }`}
              >
                📝+🖼️ Текст + Зображення
              </button>
            </div>
          </div>

          {/* Форма */}
          <div className="bg-[#1f1536] rounded-lg p-6 mb-6">
            {/* Текстове поле */}
            {(inputType === "text" || inputType === "both") && (
              <div className="mb-4">
                <label className="block text-white font-medium mb-2">
                  Промпт {inputType === "text" ? "*" : ""}
                </label>
                <textarea
                  value={textPrompt}
                  onChange={(e) => setTextPrompt(e.target.value)}
                  placeholder="Опишіть що ви хочете згенерувати..."
                  className="w-full h-24 bg-gray-800 text-white rounded-lg px-4 py-3 border border-gray-600 focus:border-purple-500 focus:outline-none resize-none"
                  disabled={isLoading}
                />
              </div>
            )}

            {/* Негативний промпт */}
            {(inputType === "text" || inputType === "both") && (
              <div className="mb-4">
                <label className="block text-white font-medium mb-2">
                  Негативний промпт
                </label>
                <textarea
                  value={negativePrompt}
                  onChange={(e) => setNegativePrompt(e.target.value)}
                  placeholder="Що НЕ повинно бути..."
                  className="w-full h-16 bg-gray-800 text-white rounded-lg px-4 py-3 border border-gray-600 focus:border-purple-500 focus:outline-none resize-none"
                  disabled={isLoading}
                />
              </div>
            )}

            {/* Завантаження зображення */}
            {(inputType === "image" || inputType === "both") && (
              <div className="mb-4">
                <label className="block text-white font-medium mb-2">
                  Зображення {inputType === "image" ? "*" : ""}
                </label>
                {!imageInfo ? (
                  <ImageLoader onImageLoad={handleImageSelect} />
                ) : (
                  <div className="flex items-center space-x-4 bg-gray-800 p-4 rounded-lg">
                    <div className="w-20 h-20 bg-gray-700 rounded overflow-hidden">
                      <img
                        src={imageInfo.url}
                        alt="Завантажене зображення"
                        className="w-full h-full object-cover"
                      />
                    </div>
                    <div className="flex-1">
                      <p className="text-white">{imageInfo.filename}</p>
                      <button
                        onClick={() => setImageInfo(null)}
                        className="text-blue-400 hover:text-blue-300 text-sm mt-1"
                        disabled={isLoading}
                      >
                        Змінити зображення
                      </button>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Inpaint — малювання маски (лише коли є зображення) */}
            {(inputType === "image" || inputType === "both") && imageInfo && (
              <div className="bg-gray-800 rounded-lg p-4 mb-4">
                <label className="flex items-center gap-2 text-white font-medium cursor-pointer">
                  <input
                    type="checkbox"
                    checked={inpaintMode}
                    onChange={(e) => {
                      setInpaintMode(e.target.checked);
                      if (!e.target.checked) setMaskBase64(null);
                    }}
                    disabled={isLoading}
                    className="w-4 h-4 accent-purple-600"
                  />
                  🖌 Inpaint — перемалювати лише замасковану зону
                </label>
                {inpaintMode && imageInfo.url && (
                  <div className="mt-3">
                    <MaskCanvas
                      imageUrl={imageInfo.url}
                      disabled={isLoading}
                      onMaskChange={setMaskBase64}
                    />
                    <p className="text-xs mt-2 text-center">
                      {maskBase64 ? (
                        <span className="text-emerald-400">✓ маска намальована</span>
                      ) : (
                        <span className="text-gray-500">
                          маска порожня — замалюйте ділянку
                        </span>
                      )}
                    </p>
                    <p className="text-gray-500 text-xs text-center mt-1">
                      «Сила зміни» нижче = наскільки перемалювати (для повного перегену руки/лиця → 0.8–1.0).
                    </p>
                  </div>
                )}
              </div>
            )}

            {/* Denoise — сила зміни вхідного фото (лише для режимів із зображенням) */}
            {(inputType === "image" || inputType === "both") && (
              <div className="bg-gray-800 rounded-lg p-4 mb-4">
                <label className="block text-white font-medium mb-1">
                  Сила зміни фото (denoise): {denoise.toFixed(2)}
                </label>
                <input
                  type="range"
                  min="0.2"
                  max="1"
                  step="0.05"
                  value={denoise}
                  onChange={(e) => setDenoise(Number(e.target.value))}
                  disabled={isLoading}
                  className="w-full accent-purple-600"
                />
                <div className="flex justify-between text-gray-400 text-xs mt-1">
                  <span>0.2 — майже без змін</span>
                  <span>0.65 — баланс</span>
                  <span>1.0 — нове фото</span>
                </div>
              </div>
            )}

            {/* Додаткові параметри для text режимів */}
            {(inputType === "text" || inputType === "both") && (
              <details className="bg-gray-800 rounded-lg p-4 mb-4">
                <summary className="text-white font-medium cursor-pointer">
                  Додаткові параметри
                </summary>
                <div className="grid grid-cols-2 gap-4 mt-4">
                  <div>
                    <label className="block text-gray-300 text-sm mb-1">
                      Ширина
                    </label>
                    <input
                      type="number"
                      value={width}
                      onChange={(e) => setWidth(Number(e.target.value))}
                      min="128"
                      max="2048"
                      step="64"
                      className="w-full bg-gray-700 text-white rounded px-3 py-2"
                      disabled={isLoading}
                    />
                  </div>
                  <div>
                    <label className="block text-gray-300 text-sm mb-1">
                      Висота
                    </label>
                    <input
                      type="number"
                      value={height}
                      onChange={(e) => setHeight(Number(e.target.value))}
                      min="128"
                      max="2048"
                      step="64"
                      className="w-full bg-gray-700 text-white rounded px-3 py-2"
                      disabled={isLoading}
                    />
                  </div>
                  <div>
                    <label className="block text-gray-300 text-sm mb-1">
                      Кроки
                    </label>
                    <input
                      type="number"
                      value={steps}
                      onChange={(e) => setSteps(Number(e.target.value))}
                      min="1"
                      max="100"
                      className="w-full bg-gray-700 text-white rounded px-3 py-2"
                      disabled={isLoading}
                    />
                  </div>
                  <div>
                    <label className="block text-gray-300 text-sm mb-1">
                      CFG Scale
                    </label>
                    <input
                      type="number"
                      value={cfgScale}
                      onChange={(e) => setCfgScale(Number(e.target.value))}
                      min="1"
                      max="30"
                      step="0.5"
                      className="w-full bg-gray-700 text-white rounded px-3 py-2"
                      disabled={isLoading}
                    />
                  </div>
                  <div>
                    <label className="block text-gray-300 text-sm mb-1">
                      Sampler
                    </label>
                    <select
                      value={sampler}
                      onChange={(e) => setSampler(e.target.value)}
                      className="w-full bg-gray-700 text-white rounded px-3 py-2"
                      disabled={isLoading}
                    >
                      {["dpmpp_2m_sde", "dpmpp_2m", "dpmpp_3m_sde", "euler_ancestral", "euler", "dpmpp_sde"].map(
                        (s) => (
                          <option key={s} value={s}>
                            {s}
                          </option>
                        )
                      )}
                    </select>
                  </div>
                  <div>
                    <label className="block text-gray-300 text-sm mb-1">
                      Scheduler
                    </label>
                    <select
                      value={scheduler}
                      onChange={(e) => setScheduler(e.target.value)}
                      className="w-full bg-gray-700 text-white rounded px-3 py-2"
                      disabled={isLoading}
                    >
                      {["karras", "normal", "exponential", "sgm_uniform", "simple"].map((s) => (
                        <option key={s} value={s}>
                          {s}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div className="col-span-2">
                    <label className="block text-gray-300 text-sm mb-1">
                      Seed (-1 для випадкового)
                    </label>
                    <input
                      type="number"
                      value={seed}
                      onChange={(e) => setSeed(Number(e.target.value))}
                      min="-1"
                      className="w-full bg-gray-700 text-white rounded px-3 py-2"
                      disabled={isLoading}
                    />
                  </div>
                  <div>
                    <label className="block text-gray-300 text-sm mb-1">
                      Варіантів за раз (batch)
                    </label>
                    <input
                      type="number"
                      value={batchCount}
                      onChange={(e) =>
                        setBatchCount(
                          Math.min(8, Math.max(1, Number(e.target.value)))
                        )
                      }
                      min="1"
                      max="8"
                      className="w-full bg-gray-700 text-white rounded px-3 py-2"
                      disabled={isLoading}
                    />
                  </div>
                  <div className="col-span-2">
                    <label className="flex items-center gap-2 text-gray-300 text-sm cursor-pointer">
                      <input
                        type="checkbox"
                        checked={hiresEnabled}
                        onChange={(e) => setHiresEnabled(e.target.checked)}
                        disabled={isLoading}
                        className="w-4 h-4 accent-purple-600"
                      />
                      Hi-Res Fix (×{preset.hires.factor} →{" "}
                      {Math.round((width * preset.hires.factor) / 8) * 8}×
                      {Math.round((height * preset.hires.factor) / 8) * 8},
                      denoise {preset.hires.denoise})
                    </label>
                  </div>
                </div>
              </details>
            )}

            {/* Кнопки */}
            <div className="flex gap-3">
              <button
                onClick={handleGenerate}
                disabled={!canGenerate() || isLoading}
                className="flex-1 bg-purple-600 hover:bg-purple-500 disabled:bg-gray-600 disabled:cursor-not-allowed text-white py-3 px-6 rounded-lg font-medium transition-colors"
              >
                {isLoading ? "Генерація..." : "Генерувати"}
              </button>

              <button
                onClick={handleSavePreset}
                disabled={isLoading}
                title="Зберегти поточні модель + промпт + налаштування як пресет"
                className="bg-emerald-700 hover:bg-emerald-600 disabled:bg-gray-700 text-white py-3 px-4 rounded-lg font-medium transition-colors"
              >
                💾 Пресет
              </button>

              {(imageInfo || textPrompt || result) && (
                <button
                  onClick={handleReset}
                  disabled={isLoading}
                  className="bg-gray-600 hover:bg-gray-500 disabled:bg-gray-700 text-white py-3 px-6 rounded-lg font-medium transition-colors"
                >
                  Скинути
                </button>
              )}
            </div>
          </div>

          {/* Помилка */}
          {error && (
            <div className="bg-red-900/50 border border-red-500 rounded-lg p-4 mb-6">
              <p className="text-red-300">{error}</p>
            </div>
          )}

          {/* Результат - замініть існуючий блок */}
          {result && (
            <div className="bg-[#1f1536] rounded-lg p-6">
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-white text-lg font-medium">Результат:</h3>
                {jobId && (
                  <span className="text-gray-400 text-sm font-mono">
                    Job ID: {jobId}
                  </span>
                )}
              </div>

              {/* Показуємо згенеровані зображення */}
              {result.processedImages && result.processedImages.length > 0 && (
                <div className="mb-6">
                  <h4 className="text-white font-medium mb-3">
                    Згенеровані зображення ({result.processedImages.length}):
                  </h4>
                  <ImageResults
                    images={result.processedImages}
                    onUseAsInput={handleUseAsInput}
                  />
                </div>
              )}

              {/* Статус та час виконання */}
              <div className="bg-gray-800 rounded-lg p-4 mb-4">
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <span className="text-gray-400">Статус:</span>
                    <span
                      className={`ml-2 font-medium ${
                        result.status === "COMPLETED"
                          ? "text-green-400"
                          : result.status === "FAILED"
                          ? "text-red-400"
                          : "text-yellow-400"
                      }`}
                    >
                      {result.status || "Невідомо"}
                    </span>
                  </div>
                  {result.executionTime && (
                    <div>
                      <span className="text-gray-400">Час виконання:</span>
                      <span className="text-white ml-2 font-medium">
                        {Math.round(result.executionTime / 1000)} сек
                      </span>
                    </div>
                  )}
                </div>

                {result.error && (
                  <div className="mt-3 p-3 bg-red-900/50 border border-red-500 rounded">
                    <p className="text-red-300 text-sm">{result.error}</p>
                  </div>
                )}
              </div>

              {/* Розгорнута інформація */}
              <details className="bg-gray-800 rounded-lg">
                <summary className="p-4 cursor-pointer text-gray-300 hover:text-white">
                  Показати повну відповідь API
                </summary>
                <div className="px-4 pb-4">
                  <pre className="text-gray-300 text-xs whitespace-pre-wrap bg-gray-900 rounded p-3 overflow-auto max-h-60">
                    {JSON.stringify(result, null, 2)}
                  </pre>
                </div>
              </details>
            </div>
          )}

          {/* Інструкція */}
          <div className="bg-gray-800/50 rounded-lg p-4">
            <h4 className="text-white font-medium mb-2">RunPod API тест:</h4>
            <ul className="text-gray-300 text-sm space-y-1">
              <li>
                • <strong>Ендпоїнт:</strong> {config.RUNPOD.ENDPOINT_ID}
              </li>
              <li>
                • <strong>URL:</strong> {config.API_BASE_URL}/
                {config.RUNPOD.ENDPOINT_ID}
              </li>
              <li>• Виберіть тип введення та заповніть поля</li>
              <li>• Натисніть "Генерувати" та перевірте результат</li>
              <li>• Спочатку пробується /runsync, потім /run + /status</li>
            </ul>

            {config.UI.SHOW_DEBUG_INFO && (
              <div className="mt-3 pt-3 border-t border-gray-600">
                <p className="text-xs text-gray-500">
                  Debug mode: увімкнено | Vite mode: {import.meta.env.MODE}
                </p>
              </div>
            )}
          </div>
        </div>
      </section>
    </div>
  );
};

const ImageResults: React.FC<{
  images: ProcessedImage[];
  onUseAsInput: (image: ProcessedImage) => void;
}> = ({ images, onUseAsInput }) => {
  const [selectedImage, setSelectedImage] = useState<ProcessedImage | null>(
    null
  );

  return (
    <>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mb-4">
        {images.map((image, index) => (
          <div
            key={index}
            className="bg-gray-700 rounded-lg overflow-hidden cursor-pointer hover:ring-2 hover:ring-purple-500 transition-all"
            onClick={() => setSelectedImage(image)}
          >
            <div className="aspect-square">
              <img
                src={image.url}
                alt={`Generated image ${index + 1}`}
                className="w-full h-full object-cover"
              />
            </div>
            <div className="p-3">
              <p className="text-white text-sm font-medium">{image.filename}</p>
              <div className="flex gap-2 mt-2">
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    // Створюємо blob та завантажуємо
                    const link = document.createElement("a");
                    link.href = image.url;
                    link.download = image.filename;
                    link.click();
                  }}
                  className="bg-blue-600 hover:bg-blue-500 text-white px-3 py-1 rounded text-xs transition-colors"
                >
                  📥 Скачати
                </button>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    setSelectedImage(image);
                  }}
                  className="bg-purple-600 hover:bg-purple-500 text-white px-3 py-1 rounded text-xs transition-colors"
                >
                  🔍 Переглянути
                </button>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    onUseAsInput(image);
                  }}
                  title="Використати це фото як вхід для img2img / inpaint"
                  className="bg-emerald-700 hover:bg-emerald-600 text-white px-3 py-1 rounded text-xs transition-colors"
                >
                  ✏️ Редагувати
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Модальне вікно для перегляду */}
      {selectedImage && (
        <div
          className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4"
          onClick={() => setSelectedImage(null)}
        >
          <div
            className="bg-gray-800 rounded-lg max-w-4xl max-h-[90vh] overflow-auto"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="p-4 border-b border-gray-600 flex justify-between items-center">
              <h3 className="text-white font-medium">
                {selectedImage.filename}
              </h3>
              <button
                onClick={() => setSelectedImage(null)}
                className="text-gray-400 hover:text-white text-xl"
              >
                ✕
              </button>
            </div>
            <div className="p-4">
              <img
                src={selectedImage.url}
                alt={selectedImage.filename}
                className="w-full h-auto rounded"
              />
            </div>
            <div className="p-4 border-t border-gray-600">
              <button
                onClick={() => {
                  const link = document.createElement("a");
                  link.href = selectedImage.url;
                  link.download = selectedImage.filename;
                  link.click();
                }}
                className="bg-blue-600 hover:bg-blue-500 text-white px-4 py-2 rounded transition-colors"
              >
                📥 Завантажити зображення
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default App;
