// src/services/runpodService.ts
import { config } from "../config/env";
import { ImageInfo } from "../types/image";

export interface RunPodJobRequest {
  input: {
    prompt?: string;
    image?: string | ImageInfo;
    negative_prompt?: string;
    width?: number;
    height?: number;
    steps?: number;
    cfg_scale?: number;
    seed?: number;
    sampler_name?: string;
    scheduler?: string;
    // Додаткові параметри для різних моделей
    [key: string]: any;
  };
}

export interface RunPodJobResponse {
  id: string;
  status: 'IN_QUEUE' | 'IN_PROGRESS' | 'COMPLETED' | 'FAILED' | 'CANCELLED';
  output?: {
    images?: Array<{
      filename: string;
      url: string;
      subfolder?: string;
      type?: string;
    }>;
    models_3d?: Array<{
      filename: string;
      url: string;
      subfolder?: string;
      type?: string;
    }>;
    error?: string;
    [key: string]: any;
  };
  executionTime?: number;
}

export interface RunPodConfig {
  apiKey: string;
  endpointId: string;
  baseUrl?: string;
}

class RunPodService {
  private config: RunPodConfig;
  private baseUrl: string;

  constructor(config: RunPodConfig) {
    this.config = config;
    this.baseUrl = config.baseUrl || 'https://api.runpod.ai/v2';
  }

  private getHeaders(): HeadersInit {
    return {
      'Authorization': `Bearer ${this.config.apiKey}`,
      'Content-Type': 'application/json',
    };
  }

  // Конвертує ImageInfo у base64 або URL для RunPod
  private async prepareImageInput(imageInfo: ImageInfo): Promise<string> {
    try {
      // Спочатку пробуємо отримати зображення через наявний API
      const imageUrl = `${config.PROXY_API_URL}/view?${new URLSearchParams({
        filename: imageInfo.filename,
        subfolder: imageInfo.subfolder || "",
        type: imageInfo.type,
      })}`;

      const response = await fetch(imageUrl);
      if (response.ok) {
        const blob = await response.blob();
        return new Promise((resolve) => {
          const reader = new FileReader();
          reader.onloadend = () => resolve(reader.result as string);
          reader.readAsDataURL(blob);
        });
      }
      
      // Fallback - повертаємо URL
      return imageUrl;
    } catch (error) {
      console.error('Error preparing image input:', error);
      throw new Error('Failed to prepare image for RunPod');
    }
  }

  // Асинхронне виконання завдання
  async runAsync(request: RunPodJobRequest): Promise<{ jobId: string }> {
    try {
      // Підготовуємо вхідні дані
      const input = { ...request.input };
      
      // Якщо є зображення як ImageInfo, конвертуємо його
      if (input.image && typeof input.image === 'object' && 'filename' in input.image) {
        input.image = await this.prepareImageInput(input.image as ImageInfo);
      }

      const response = await fetch(`${this.baseUrl}/${this.config.endpointId}/run`, {
        method: 'POST',
        headers: this.getHeaders(),
        body: JSON.stringify({ input }),
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`RunPod API error: ${response.status} - ${errorText}`);
      }

      const data = await response.json();
      return { jobId: data.id };
    } catch (error) {
      console.error('RunPod async execution error:', error);
      throw error;
    }
  }

  // Синхронне виконання завдання (для швидких операцій)
  async runSync(request: RunPodJobRequest, timeout: number = 90): Promise<RunPodJobResponse> {
    try {
      const input = { ...request.input };
      
      if (input.image && typeof input.image === 'object' && 'filename' in input.image) {
        input.image = await this.prepareImageInput(input.image as ImageInfo);
      }

      const response = await fetch(`${this.baseUrl}/${this.config.endpointId}/runsync`, {
        method: 'POST',
        headers: this.getHeaders(),
        body: JSON.stringify({ 
          input,
          timeout 
        }),
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`RunPod API error: ${response.status} - ${errorText}`);
      }

      const data = await response.json();
      return data;
    } catch (error) {
      console.error('RunPod sync execution error:', error);
      throw error;
    }
  }

  // Перевірка статусу завдання
  async checkStatus(jobId: string): Promise<RunPodJobResponse> {
    try {
      const response = await fetch(`${this.baseUrl}/${this.config.endpointId}/status/${jobId}`, {
        method: 'GET',
        headers: this.getHeaders(),
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`RunPod status check error: ${response.status} - ${errorText}`);
      }

      const data = await response.json();
      return data;
    } catch (error) {
      console.error('RunPod status check error:', error);
      throw error;
    }
  }

  // Polling для очікування завершення завдання
  async waitForCompletion(
    jobId: string, 
    onProgress?: (status: RunPodJobResponse) => void,
    maxWaitTime: number = 300000, // 5 хвилин
    pollInterval: number = 2000 // 2 секунди
  ): Promise<RunPodJobResponse> {
    const startTime = Date.now();
    
    while (Date.now() - startTime < maxWaitTime) {
      const status = await this.checkStatus(jobId);
      
      if (onProgress) {
        onProgress(status);
      }
      
      if (status.status === 'COMPLETED' || status.status === 'FAILED') {
        return status;
      }
      
      if (status.status === 'CANCELLED') {
        throw new Error('Job was cancelled');
      }
      
      // Чекаємо перед наступною перевіркою
      await new Promise(resolve => setTimeout(resolve, pollInterval));
    }
    
    throw new Error('Job timeout - max wait time exceeded');
  }

  // Перевірка здоров'я ендпоїнту
  async checkHealth(): Promise<any> {
    try {
      const response = await fetch(`${this.baseUrl}/${this.config.endpointId}/health`, {
        method: 'GET',
        headers: this.getHeaders(),
      });

      if (!response.ok) {
        throw new Error(`Health check failed: ${response.status}`);
      }

      return await response.json();
    } catch (error) {
      console.error('RunPod health check error:', error);
      throw error;
    }
  }

  // Скасування завдання (якщо підтримується)
  async cancelJob(jobId: string): Promise<boolean> {
    try {
      const response = await fetch(`${this.baseUrl}/${this.config.endpointId}/cancel/${jobId}`, {
        method: 'POST',
        headers: this.getHeaders(),
      });

      return response.ok;
    } catch (error) {
      console.error('RunPod job cancellation error:', error);
      return false;
    }
  }
}

// Експортуємо синглтон інстанс
export const createRunPodService = (config: RunPodConfig): RunPodService => {
  return new RunPodService(config);
};

// Помічники для створення різних типів запитів
export const createTextToImageRequest = (
  prompt: string,
  options?: Partial<RunPodJobRequest['input']>
): RunPodJobRequest => ({
  input: {
    prompt,
    negative_prompt: options?.negative_prompt || "",
    width: options?.width || 512,
    height: options?.height || 512,
    steps: options?.steps || 20,
    cfg_scale: options?.cfg_scale || 7.5,
    seed: options?.seed || -1,
    sampler_name: options?.sampler_name || "DPM++ 2M Karras",
    scheduler: options?.scheduler || "karras",
    ...options,
  },
});

export const createImageToImageRequest = (
  image: ImageInfo | string,
  prompt?: string,
  options?: Partial<RunPodJobRequest['input']>
): RunPodJobRequest => ({
  input: {
    image,
    prompt: prompt || "",
    negative_prompt: options?.negative_prompt || "",
    strength: options?.strength || 0.8,
    steps: options?.steps || 20,
    cfg_scale: options?.cfg_scale || 7.5,
    seed: options?.seed || -1,
    ...options,
  },
});

export const createText3DRequest = (
  prompt: string,
  options?: Partial<RunPodJobRequest['input']>
): RunPodJobRequest => ({
  input: {
    prompt,
    output_format: options?.output_format || "glb",
    texture_resolution: options?.texture_resolution || 1024,
    ...options,
  },
});

export const createImage3DRequest = (
  image: ImageInfo | string,
  options?: Partial<RunPodJobRequest['input']>
): RunPodJobRequest => ({
  input: {
    image,
    output_format: options?.output_format || "glb",
    texture_resolution: options?.texture_resolution || 1024,
    ...options,
  },
});