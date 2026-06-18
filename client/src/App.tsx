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

type InputType = "text" | "image" | "both";

const App: React.FC = () => {
  const [inputType, setInputType] = useState<InputType>("image");
  const [imageInfo, setImageInfo] = useState<ImageInfo | null>(null);
  const [textPrompt, setTextPrompt] = useState<string>("");
  const [negativePrompt, setNegativePrompt] = useState<string>("");
  const [isLoading, setIsLoading] = useState(false);
  const [result, setResult] = useState<ProcessedRunPodResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [jobId, setJobId] = useState<string | null>(null);

  // Параметри генерації width = 768, height = 1368
  const [width, setWidth] = useState(768);
  const [height, setHeight] = useState(1368);
  const [steps, setSteps] = useState(20);
  const [cfgScale, setCfgScale] = useState(7.5);
  const [seed, setSeed] = useState(-1);

  useEffect(() => {
    initializeConfig();
  }, []);

  // Створюємо сервіс з проксі URL
  const runpodService = createRunPodService(
    config.RUNPOD.ENDPOINT_ID,
    config.RUNPOD.PROXY_URL
  );

  // Конвертація зображення в base64 (без data URL префіксу)
  const imageToBase64 = async (imageInfo: ImageInfo): Promise<string> => {
    if (!imageInfo.url) {
      throw new Error("No image URL available");
    }

    // imageInfo.url is a base64 data URL stored by ImageLoader
    if (imageInfo.url.startsWith("data:")) {
      return imageInfo.url.split(",")[1];
    }

    // Fallback: blob URL or remote URL
    const response = await fetch(imageInfo.url);
    if (!response.ok) throw new Error("Failed to fetch image");
    const blob = await response.blob();

    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onloadend = () => {
        const result = reader.result as string;
        resolve(result.split(",")[1]);
      };
      reader.onerror = reject;
      reader.readAsDataURL(blob);
    });
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

      const baseOptions = {
        width,
        height,
        steps,
        cfg_scale: cfgScale,
        seed: currentSeed,
        negative_prompt: negativePrompt || undefined,
      };

      if (inputType === "text" && textPrompt.trim()) {
        // Тільки текст
        response = await runpodService.generateFromText(
          textPrompt,
          baseOptions
        );
      } else if (inputType === "image" && imageInfo) {
        // Тільки зображення
        const imageBase64 = await imageToBase64(imageInfo);
        response = await runpodService.generateFromImage(imageBase64, {
          seed: currentSeed,
        });
      } else if (inputType === "both" && imageInfo && textPrompt.trim()) {
        // Зображення + текст
        const imageBase64 = await imageToBase64(imageInfo);
        response = await runpodService.generateFromImageAndText(
          imageBase64,
          textPrompt,
          baseOptions
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
                        src={
                          imageInfo.url ||
                          `${config.VIEW_URL}?filename=${encodeURIComponent(
                            imageInfo.filename
                          )}&subfolder=${encodeURIComponent(
                            imageInfo.subfolder || ""
                          )}&type=${encodeURIComponent(imageInfo.type)}`
                        }
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
                  <ImageResults images={result.processedImages} />
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
                • <strong>URL:</strong> {config.RUNPOD.PROXY_URL}/api/
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

const ImageResults: React.FC<{ images: ProcessedImage[] }> = ({ images }) => {
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
