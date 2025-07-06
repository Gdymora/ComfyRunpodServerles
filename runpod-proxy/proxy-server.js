// proxy-server.js - Проксі сервер для RunPod з детальним логуванням
const express = require('express');
const cors = require('cors');
const fetch = require('node-fetch');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 3001;

// Middleware
app.use(cors());
app.use(express.json({ limit: '50mb' }));

// RunPod конфігурація
const RUNPOD_API_KEY = process.env.RUNPOD_API_KEY;
const RUNPOD_BASE_URL = 'https://api.runpod.ai/v2';

if (!RUNPOD_API_KEY) {
  console.error('❌ RUNPOD_API_KEY не встановлений в .env файлі');
  process.exit(1);
}

// Функція для детального логування
function logRequest(method, url, headers, body) {
  console.log('\n=== RUNPOD REQUEST ===');
  console.log(`🔄 ${method} ${url}`);
  console.log('📋 Headers:', JSON.stringify(headers, null, 2));
  console.log('📤 Body:', method === 'GET' ? 'No body' : JSON.stringify(body, null, 2));
}

function logResponse(status, data) {
  console.log('\n=== RUNPOD RESPONSE ===');
  console.log('📥 Status:', status);
  console.log('📥 Data:', JSON.stringify(data, null, 2));
  console.log('========================\n');
}

// Проксі маршрут для RunPod
app.post('/api/runpod/:endpointId/:operation', async (req, res) => {
  const { endpointId, operation } = req.params;
  const { body } = req;

  console.log(`\n🎯 Received request: ${operation} for endpoint ${endpointId}`);

  // Валідація операції
  const validOperations = ['run', 'runsync', 'status', 'cancel', 'health'];
  if (!validOperations.includes(operation)) {
    return res.status(400).json({ 
      error: `Invalid operation: ${operation}. Valid operations: ${validOperations.join(', ')}` 
    });
  }

  try {
    let url = `${RUNPOD_BASE_URL}/${endpointId}`;
    let method = 'POST';

    // Налаштовуємо URL та метод залежно від операції
    switch (operation) {
      case 'run':
        url += '/run';
        method = 'POST';
        break;
      case 'runsync':
        url += '/runsync';
        method = 'POST';
        break;
      case 'status':
        const jobId = body.jobId || req.query.jobId;
        if (!jobId) {
          return res.status(400).json({ error: 'jobId is required for status operation' });
        }
        url += `/status/${jobId}`;
        method = 'GET';
        break;
      case 'cancel':
        const cancelJobId = body.jobId || req.query.jobId;
        if (!cancelJobId) {
          return res.status(400).json({ error: 'jobId is required for cancel operation' });
        }
        url += `/cancel/${cancelJobId}`;
        method = 'POST';
        break;
      case 'health':
        url += '/health';
        method = 'GET';
        break;
    }

    // Формуємо заголовки
    const headers = {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${RUNPOD_API_KEY}`,
    };

    // Логуємо запит
    logRequest(method, url, headers, body);

    // Формуємо запит до RunPod
    const options = {
      method,
      headers,
    };

    // Додаємо body тільки для POST запитів
    if (method === 'POST' && body) {
      options.body = JSON.stringify(body);
    }

    const response = await fetch(url, options);
    
    // Перевіряємо чи response є JSON
    let responseData;
    const contentType = response.headers.get('content-type');
    
    if (contentType && contentType.includes('application/json')) {
      responseData = await response.json();
    } else {
      const textResponse = await response.text();
      responseData = {
        error: 'Non-JSON response',
        content: textResponse,
        contentType: contentType
      };
    }

    // Логуємо відповідь
    logResponse(response.status, responseData);

    // Якщо 403, додаємо додаткову діагностику
    if (response.status === 403) {
      console.log('\n🚨 403 ERROR DIAGNOSIS:');
      console.log('🔑 API Key (перші 10 символів):', RUNPOD_API_KEY.substring(0, 10) + '...');
      console.log('🎯 Endpoint ID:', endpointId);
      console.log('⚡ Operation:', operation);
      console.log('🌐 Full URL:', url);
      console.log('📋 Authorization header:', headers.Authorization.substring(0, 20) + '...');
    }

    // Повертаємо відповідь клієнту
    res.status(response.status).json(responseData);

  } catch (error) {
    console.error('❌ Proxy error:', error);
    res.status(500).json({ 
      error: 'Proxy server error', 
      details: error.message 
    });
  }
});

// Маршрут для отримання статусу завдання (GET версія)
app.get('/api/runpod/:endpointId/status/:jobId', async (req, res) => {
  const { endpointId, jobId } = req.params;

  try {
    const url = `${RUNPOD_BASE_URL}/${endpointId}/status/${jobId}`;
    const headers = {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${RUNPOD_API_KEY}`,
    };

    logRequest('GET', url, headers, null);

    const response = await fetch(url, {
      method: 'GET',
      headers,
    });

    const responseData = await response.json();
    logResponse(response.status, responseData);

    res.status(response.status).json(responseData);

  } catch (error) {
    console.error('❌ Status check error:', error);
    res.status(500).json({ 
      error: 'Status check error', 
      details: error.message 
    });
  }
});

// Health check для проксі сервера
app.get('/api/health', (req, res) => {
  res.json({ 
    status: 'OK', 
    timestamp: new Date().toISOString(),
    runpodApiKey: RUNPOD_API_KEY ? 'Configured' : 'Missing',
    apiKeyPrefix: RUNPOD_API_KEY ? RUNPOD_API_KEY.substring(0, 10) + '...' : 'N/A'
  });
});

// Додаємо тестовий endpoint для перевірки доступу до RunPod
app.get('/api/test-runpod-access', async (req, res) => {
  try {
    console.log('\n🧪 Testing RunPod API access...');
    
    // Тестуємо доступ до RunPod API
    const response = await fetch(`${RUNPOD_BASE_URL}`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${RUNPOD_API_KEY}`,
      },
    });

    const data = await response.json();
    
    console.log('🧪 Test response status:', response.status);
    console.log('🧪 Test response data:', JSON.stringify(data, null, 2));

    res.json({
      success: response.ok,
      status: response.status,
      data: data
    });

  } catch (error) {
    console.error('❌ Test error:', error);
    res.status(500).json({ 
      error: 'Test failed', 
      details: error.message 
    });
  }
});

// Запуск сервера
app.listen(PORT, () => {
  console.log(`🚀 RunPod Proxy Server running on port ${PORT}`);
  console.log(`🔑 RunPod API Key: ${RUNPOD_API_KEY ? 'Configured' : 'Missing'}`);
  console.log(`🔑 API Key prefix: ${RUNPOD_API_KEY ? RUNPOD_API_KEY.substring(0, 10) + '...' : 'N/A'}`);
  console.log(`📋 Available endpoints:`);
  console.log(`   POST /api/runpod/{endpointId}/run`);
  console.log(`   POST /api/runpod/{endpointId}/runsync`);
  console.log(`   GET  /api/runpod/{endpointId}/status/{jobId}`);
  console.log(`   POST /api/runpod/{endpointId}/status (with jobId in body)`);
  console.log(`   POST /api/runpod/{endpointId}/cancel`);
  console.log(`   GET  /api/runpod/{endpointId}/health`);
  console.log(`   GET  /api/health (proxy health)`);
  console.log(`   GET  /api/test-runpod-access (test API access)`);
});

module.exports = app;