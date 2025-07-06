// src/types/api.ts - Оновлені типи для RunPod інтеграції
export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
  statusCode?: number;
}

export interface UploadResponse {
  filename: string;
  path: string;
  subfolder: string;
  type: string;
}

// Розширені типи для RunPod
export interface RunPodImageGenerationRequest {
  input: {
    prompt: string;
    negative_prompt?: string;
    width?: number;
    height?: number;
    steps?: number;
    cfg_scale?: number;
    seed?: number;
    sampler_name?: string;
    scheduler?: string;
    batch_size?: number;
    // Для image-to-image
    image?: string; // base64 або URL
    strength?: number;
    // Додаткові параметри
    [key: string]: any;
  };
}

export interface RunPod3DGenerationRequest {
  input: {
    prompt?: string;
    image?: string; // base64 або URL для image-to-3d
    output_format?: 'glb' | 'obj' | 'ply';
    texture_resolution?: number;
    mesh_quality?: 'low' | 'medium' | 'high';
    seed?: number;
    [key: string]: any;
  };
}

export interface RunPodGenerationResponse {
  id: string;
  status: 'IN_QUEUE' | 'IN_PROGRESS' | 'COMPLETED' | 'FAILED' | 'CANCELLED';
  output?: {
    images?: Array<{
      filename: string;
      url?: string;
      subfolder?: string;
      type?: string;
      width?: number;
      height?: number;
      seed?: number;
    }>;
    models_3d?: Array<{
      filename: string;
      url?: string;
      subfolder?: string;
      type?: string;
      format?: string;
      vertices?: number;
      faces?: number;
    }>;
    metadata?: {
      generation_time?: number;
      parameters?: any;
      model_info?: {
        name: string;
        version: string;
      };
    };
    error?: string;
  };
  executionTime?: number;
}

// Залишаємо для зворотної сумісності
export interface ImageGenerationRequest extends RunPodImageGenerationRequest {}
export interface ImageGenerationResponse extends RunPodGenerationResponse {}

// src/types/image.ts - Розширені типи зображень
export interface ImageInfo {
  filename: string;
  subfolder: string;
  type: string;
  width?: number;
  height?: number;
  size?: number; // розмір файлу в байтах
  format?: string; // 'jpg', 'png', 'webp', etc.
  created?: Date;
}

export interface ImageProcessingOptions {
  resize?: {
    width: number;
    height: number;
    maintain_aspect_ratio?: boolean;
  };
  format?: 'jpg' | 'png' | 'webp';
  quality?: number; // 1-100
  filters?: {
    brightness?: number; // -100 to 100
    contrast?: number; // -100 to 100
    saturation?: number; // -100 to 100
    blur?: number; // 0 to 10
  };
}

// src/types/generation.ts - Типи для генерації
export interface GenerationJob {
  id: string;
  type: 'text-to-image' | 'image-to-image' | 'text-to-3d' | 'image-to-3d';
  status: 'pending' | 'running' | 'completed' | 'failed' | 'cancelled';
  progress: number; // 0-100
  created: Date;
  updated: Date;
  completed?: Date;
  
  // Вхідні дані
  input: {
    prompt?: string;
    negative_prompt?: string;
    image?: ImageInfo;
    parameters?: Record<string, any>;
  };
  
  // Результати
  output?: {
    images?: ImageInfo[];
    models_3d?: Array<{
      filename: string;
      url: string;
      format: string;
      size: number;
      metadata?: Record<string, any>;
    }>;
    error?: string;
  };
  
  // Метадані
  metadata?: {
    execution_time?: number;
    cost?: number;
    model_version?: string;
    endpoint_id?: string;
  };
}

export interface GenerationQueue {
  jobs: GenerationJob[];
  active_count: number;
  completed_count: number;
  failed_count: number;
}

// src/types/ui.ts - Типи для UI компонентів
export interface TabConfig {
  id: string;
  label: string;
  description: string;
  icon?: string;
  enabled: boolean;
  estimated_time?: string;
}

export interface ProgressInfo {
  percentage: number;
  stage: string;
  message: string;
  eta?: number; // секунди до завершення
  details?: Record<string, any>;
}

export interface NotificationMessage {
  id: string;
  type: 'success' | 'error' | 'warning' | 'info';
  title: string;
  message: string;
  timestamp: Date;
  duration?: number; // автоматичне приховування через N мс
  actions?: Array<{
    label: string;
    action: () => void;
  }>;
}

// src/types/settings.ts - Типи налаштувань
export interface UserSettings {
  runpod: {
    api_key: string;
    default_endpoints: Record<string, string>;
    preferences: {
      auto_download: boolean;
      save_parameters: boolean;
      show_advanced_options: boolean;
    };
  };
  
  ui: {
    theme: 'dark' | 'light';
    language: 'uk' | 'en' | 'ru';
    compact_mode: boolean;
    show_tooltips: boolean;
  };
  
  generation: {
    default_parameters: {
      'text-to-image': Record<string, any>;
      'image-to-image': Record<string, any>;
      'text-to-3d': Record<string, any>;
      'image-to-3d': Record<string, any>;
    };
    quality_preset: 'speed' | 'balanced' | 'quality';
    auto_seed: boolean;
  };
  
  storage: {
    auto_cleanup: boolean;
    max_results: number;
    export_format: 'json' | 'csv';
  };
}

// src/types/errors.ts - Типи помилок
export interface AppError {
  code: string;
  message: string;
  details?: any;
  timestamp: Date;
  recoverable: boolean;
  suggestions?: string[];
}

export class RunPodAPIError extends Error {
  constructor(
    public statusCode: number,
    message: string,
    public details?: any
  ) {
    super(message);
    this.name = 'RunPodAPIError';
  }
}

export class ValidationError extends Error {
  constructor(
    message: string,
    public field: string,
    public value?: any
  ) {
    super(message);
    this.name = 'ValidationError';
  }
}

export class NetworkError extends Error {
  constructor(
    message: string,
    public url?: string,
    public method?: string
  ) {
    super(message);
    this.name = 'NetworkError';
  }
}

// src/types/analytics.ts - Типи для аналітики (опціонально)
export interface UsageStatistics {
  period: 'day' | 'week' | 'month';
  generations: {
    total: number;
    by_type: Record<string, number>;
    successful: number;
    failed: number;
  };
  
  performance: {
    average_time: number;
    fastest_time: number;
    slowest_time: number;
  };
  
  costs: {
    total: number;
    by_endpoint: Record<string, number>;
    average_per_generation: number;
  };
  
  usage_patterns: {
    peak_hours: number[];
    favorite_parameters: Record<string, any>;
    most_used_prompts: string[];
  };
}

// src/types/export.ts - Типи для експорту
export interface ExportOptions {
  format: 'json' | 'csv' | 'zip';
  include_images: boolean;
  include_metadata: boolean;
  date_range?: {
    start: Date;
    end: Date;
  };
  filters?: {
    types?: string[];
    status?: string[];
    min_rating?: number;
  };
}

export interface ExportResult {
  success: boolean;
  file_url?: string;
  file_size?: number;
  items_count: number;
  error?: string;
}