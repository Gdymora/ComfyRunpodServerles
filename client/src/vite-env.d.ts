// src/vite-env.d.ts - Типи для Vite environment variables
/// <reference types="vite/client" />

interface ImportMetaEnv {
  // Існуючі налаштування API
  readonly VITE_PROXY_API_URL: string
  readonly VITE_VIEW_URL: string
  readonly VITE_UPLOAD_URL: string
  readonly VITE_API_BASE_URL: string
  
  // RunPod ендпоїнти
  readonly VITE_RUNPOD_TEXT_TO_IMAGE_ENDPOINT: string
  readonly VITE_RUNPOD_IMAGE_TO_IMAGE_ENDPOINT: string
  readonly VITE_RUNPOD_TEXT_TO_3D_ENDPOINT: string
  readonly VITE_RUNPOD_IMAGE_TO_3D_ENDPOINT: string
  
  // UI налаштування
  readonly VITE_MAX_RESULTS: string
  readonly VITE_AUTO_SAVE_SETTINGS: string
  readonly VITE_DEFAULT_LANGUAGE: string
  readonly VITE_DEBUG: string
  
  // Vite вбудовані
  readonly MODE: string
  readonly BASE_URL: string
  readonly PROD: boolean
  readonly DEV: boolean
  readonly SSR: boolean
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}