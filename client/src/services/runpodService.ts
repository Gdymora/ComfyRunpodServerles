// src/services/runpodService.ts - Сервіс для роботи через проксі
import { createFluxWorkflow } from "../utils/promptUtils";

export interface RunPodRequest {
  input: {
    prompt?: string;
    image?: string; // base64
    negative_prompt?: string;
    width?: number;
    height?: number;
    steps?: number;
    cfg_scale?: number;
    seed?: number;
    [key: string]: any;
  };
}

export interface RunPodResponse {
  id?: string;
  status?: "IN_QUEUE" | "IN_PROGRESS" | "COMPLETED" | "FAILED" | "CANCELLED";
  output?: any;
  error?: string;
  executionTime?: number;
}

export interface ProcessedImage {
  data: string; // base64 data
  filename: string;
  type: string;
  url: string; // готовий data URL
}

export interface ProcessedRunPodResponse extends RunPodResponse {
  processedImages?: ProcessedImage[];
}

export class RunPodService {
  private proxyBaseUrl: string;
  private endpointId: string;

  constructor(endpointId: string, proxyUrl: string = "http://localhost:3001") {
    this.endpointId = endpointId;
    this.proxyBaseUrl = `${proxyUrl}/api/runpod/${endpointId}`;
  }

  private async makeRequest(
    operation: string,
    data?: any,
    jobId?: string
  ): Promise<any> {
    let url = `${this.proxyBaseUrl}/${operation}`;
    let method = "POST";

    // Для статусу використовуємо GET з jobId в URL
    if (operation === "status" && jobId) {
      url = `${this.proxyBaseUrl}/status/${jobId}`;
      method = "GET";
      data = undefined; // Не передаємо body для GET
    }

    const options: RequestInit = {
      method,
      headers: {
        "Content-Type": "application/json",
      },
    };

    if (method === "POST" && data) {
      options.body = JSON.stringify(data);
    }

    console.log(`🔄 ${method} ${url}`);
    if (data) console.log("📤 Request data:", data);

    const response = await fetch(url, options);

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Proxy error: ${response.status} - ${errorText}`);
    }

    const responseData = await response.json();
    console.log("📥 Response:", responseData);

    return responseData;
  }

  // POST /run - Асинхронне виконання
  async run(request: RunPodRequest): Promise<{ id: string }> {
    try {
      const data = await this.makeRequest("run", request);

      if (!data.id) {
        throw new Error("No job ID returned from RunPod");
      }

      return { id: data.id };
    } catch (error) {
      console.error("RunPod /run failed:", error);
      throw error;
    }
  }

  // POST /runsync - Синхронне виконання
  async runsync(
    request: RunPodRequest,
    timeout: number = 90
  ): Promise<RunPodResponse> {
    try {
      return await this.makeRequest("runsync", request);
    } catch (error) {
      console.error("RunPod /runsync failed:", error);
      throw error;
    }
  }

  // GET /status/{job_id} - Перевірка статусу
  async status(jobId: string): Promise<RunPodResponse> {
    try {
      return await this.makeRequest("status", undefined, jobId);
    } catch (error) {
      console.error("RunPod /status failed:", error);
      throw error;
    }
  }

  // GET /health - Перевірка здоров'я ендпоїнту
  async health(): Promise<any> {
    try {
      return await this.makeRequest("health");
    } catch (error) {
      console.error("RunPod /health failed:", error);
      throw error;
    }
  }

  // POST /cancel/{job_id} - Скасування завдання
  async cancel(jobId: string): Promise<boolean> {
    try {
      await this.makeRequest("cancel", { jobId });
      return true;
    } catch (error) {
      console.error("RunPod /cancel failed:", error);
      return false;
    }
  }

  // Polling для очікування завершення асинхронного завдання
  async waitForCompletion(
    jobId: string,
    onProgress?: (status: RunPodResponse) => void,
    maxWaitTime: number = 300000, // 5 хвилин
    pollInterval: number = 3000 // 3 секунди
  ): Promise<RunPodResponse> {
    const startTime = Date.now();

    while (Date.now() - startTime < maxWaitTime) {
      const statusResponse = await this.status(jobId);

      if (onProgress) {
        onProgress(statusResponse);
      }

      if (
        statusResponse.status === "COMPLETED" ||
        statusResponse.status === "FAILED"
      ) {
        return statusResponse;
      }

      if (statusResponse.status === "CANCELLED") {
        throw new Error("Job was cancelled");
      }

      // Чекаємо перед наступною перевіркою
      await new Promise((resolve) => setTimeout(resolve, pollInterval));
    }

    throw new Error("Job timeout - max wait time exceeded");
  }

  // Зручні методи для різних типів генерації

  processImages(output: any): ProcessedImage[] {
    if (!output?.images || !Array.isArray(output.images)) {
      return [];
    }

    return output.images
      .filter((img: any) => img && img.data && img.type === "base64")
      .map((img: any, index: number) => ({
        data: img.data,
        filename: img.filename || `generated_${index + 1}.png`,
        type: img.type,
        url: `data:image/png;base64,${img.data}`,
      }));
  }

  // Генерація з тексту
  async generateFromText(
    prompt: string,
    options?: {
      width?: number;
      height?: number;
      seed?: number;
    }
  ): Promise<ProcessedRunPodResponse> {
    const request = createFluxWorkflow(
      prompt,
      options?.seed,
      options?.width || 512,
      options?.height || 512
    );

    try {
      const response = await this.runsync(request, 90);

      // Обробляємо зображення
      const processedImages = response.output
        ? this.processImages(response.output)
        : [];

      return {
        ...response,
        processedImages,
      };
    } catch (syncError) {
      console.log("Sync failed, trying async:", syncError);
      const { id } = await this.run(request);
      const response = await this.waitForCompletion(id);

      const processedImages = response.output
        ? this.processImages(response.output)
        : [];

      return {
        ...response,
        processedImages,
      };
    }
  }

  // Генерація з зображення
  async generateFromImage(
    imageBase64: string,
    options?: Partial<RunPodRequest["input"]>
  ): Promise<RunPodResponse> {
    const request: RunPodRequest = {
      input: {
        image: imageBase64,
        ...options,
      },
    };

    // Спочатку пробуємо синхронно
    try {
      return await this.runsync(request, 120);
    } catch (syncError) {
      console.log("Sync failed, trying async:", syncError);

      // Fallback на асинхронний режим
      const { id } = await this.run(request);
      return await this.waitForCompletion(id);
    }
  }

  // Комбінована генерація
  async generateFromImageAndText(
    imageBase64: string,
    prompt: string,
    options?: Partial<RunPodRequest["input"]>
  ): Promise<RunPodResponse> {
    const request: RunPodRequest = {
      input: {
        image: imageBase64,
        prompt,
        ...options,
      },
    };

    // Спочатку пробуємо синхронно
    try {
      return await this.runsync(request, 120);
    } catch (syncError) {
      console.log("Sync failed, trying async:", syncError);

      // Fallback на асинхронний режим
      const { id } = await this.run(request);
      return await this.waitForCompletion(id);
    }
  }
}

// Експорт функції для створення сервісу
export const createRunPodService = (
  endpointId: string,
  proxyUrl?: string
): RunPodService => {
  return new RunPodService(endpointId, proxyUrl);
};
