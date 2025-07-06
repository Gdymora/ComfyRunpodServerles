// src/config/env.ts - Конфіг з проксі сервером
export const config = {
  // Існуючі налаштування (залишаємо для сумісності)
  PROXY_API_URL: import.meta.env.VITE_PROXY_API_URL || '/api',
  VIEW_URL: import.meta.env.VITE_VIEW_URL || '/api/view',
  UPLOAD_URL: import.meta.env.VITE_UPLOAD_URL || '/api/upload',
  API_BASE_URL: import.meta.env.VITE_API_BASE_URL || '/api',

  // RunPod налаштування через проксі
  RUNPOD: {
    // URL вашого проксі сервера
    PROXY_URL: import.meta.env.VITE_RUNPOD_PROXY_URL || 'http://localhost:3001',
    
    // Ваш ендпоїнт ID
    ENDPOINT_ID: import.meta.env.VITE_RUNPOD_ENDPOINT_ID || '404u30nf6dtk1f',
  },
  
  // Налаштування UI
  UI: {
    MAX_RESULTS_HISTORY: parseInt(import.meta.env.VITE_MAX_RESULTS || '50'),
    AUTO_SAVE_SETTINGS: import.meta.env.VITE_AUTO_SAVE_SETTINGS !== 'false',
    DEFAULT_LANGUAGE: import.meta.env.VITE_DEFAULT_LANGUAGE || 'uk',
    SHOW_DEBUG_INFO: import.meta.env.VITE_DEBUG === 'true',
  },
}; 

// Валідація конфігурації
export const validateConfig = (): { isValid: boolean; warnings: string[] } => {
  const warnings: string[] = [];
  
  if (!config.RUNPOD.ENDPOINT_ID) {
    warnings.push('VITE_RUNPOD_ENDPOINT_ID is not set, using default');
  }
  
  if (config.RUNPOD.PROXY_URL.includes('localhost') && import.meta.env.PROD) {
    warnings.push('Using localhost proxy URL in production build');
  }
  
  return {
    isValid: true,
    warnings
  };
};

// Ініціалізація конфігурації
export const initializeConfig = (): void => {
  const validation = validateConfig();
  
  if (validation.warnings.length > 0) {
    console.warn('⚠️ Config warnings:');
    validation.warnings.forEach(warning => console.warn(`  - ${warning}`));
  }
  
  console.log('✅ RunPod proxy configured:');
  console.log(`   Endpoint: ${config.RUNPOD.ENDPOINT_ID}`);
  console.log(`   Proxy URL: ${config.RUNPOD.PROXY_URL}`);
  
  if (config.UI.SHOW_DEBUG_INFO) {
    console.log('🌍 Vite mode:', import.meta.env.MODE);
    console.log('🔧 Full proxy URL:', `${config.RUNPOD.PROXY_URL}/api/runpod/${config.RUNPOD.ENDPOINT_ID}`);
  }
};

export default config;