# ComfyUI RunPod Serverless — AI Image Generator

Веб-клієнт для генерації зображень та 3D-моделей через ComfyUI, розгорнутий на RunPod Serverless. Не потребує власного GPU — обчислення виконуються у хмарі RunPod і оплачуються лише за фактичний час використання.

## Що це і навіщо

**Проблема:** ComfyUI — потужний інструмент для AI-генерації, але вимагає потужної відеокарти (VRAM 16+ GB для Flux), яка є не у всіх. Тримати постійно увімкнений сервер дорого.

**Рішення:** Розгорнути ComfyUI як serverless endpoint на RunPod. Воркери запускаються автоматично при запиті і вимикаються після виконання. Цей проект — веб-інтерфейс для такого endpoint.

**Коли використовувати:**
- Потрібна генерація зображень/3D, але немає власного GPU
- Хочеш готовий UI замість роботи напряму з ComfyUI
- Потрібно приховати API-ключ від клієнта (проксі-сервер)

---

## Можливості

| Функція | Опис |
|---|---|
| Text-to-Image | Генерація зображень з текстового промпту (Flux Dev FP8) |
| Image Upload | Завантаження зображення для img2img |
| Image + Text | Комбінована генерація |
| 3D з фото | Перетворення фото у 3D-модель GLB (Hunyuan3D-2) |
| Mask Editor | Малювання маски для inpainting |
| Progress Tracker | Відстеження прогресу через WebSocket |

---

## Архітектура

```
Браузер (React)
    ↓  POST /api/runpod/{endpointId}/runsync
Node.js Proxy (порт 3012)
    ↓  Authorization: Bearer <API_KEY>
RunPod API → ComfyUI Serverless
    ↓  { status: COMPLETED, output: { images: [{ data, type: base64 }] } }
Браузер показує зображення
```

Проксі-сервер потрібен тому, що RunPod API-ключ не можна тримати у браузерному коді — він буде видний у DevTools. Проксі приймає запити від клієнта і підставляє ключ зі змінних середовища.

### Структура проекту

```
ComfyRunpodServerles/
├── client/                    # React + TypeScript + Vite
│   ├── src/
│   │   ├── App.tsx            # Головна сторінка генерації
│   │   ├── components/
│   │   │   ├── ImageGenerator.tsx    # Генератор 3D-моделей
│   │   │   ├── editor/              # Mask editor (canvas-based)
│   │   │   ├── navigation/          # Навігація
│   │   │   └── ui/                  # Кнопки, картки, прогрес
│   │   ├── services/
│   │   │   ├── runpodService.ts     # HTTP-клієнт для RunPod через проксі
│   │   │   └── websocketService.ts  # WebSocket для прогресу ComfyUI
│   │   ├── utils/
│   │   │   └── promptUtils.ts       # Flux workflow у форматі ComfyUI JSON
│   │   └── config/env.ts            # Конфіг із .env змінних
│   └── .env                   # VITE_RUNPOD_ENDPOINT_ID, VITE_RUNPOD_PROXY_URL
│
└── runpod-proxy/              # Node.js Express проксі
    ├── proxy-server.js        # Єдиний файл сервера
    └── .env                   # RUNPOD_API_KEY, PORT
```

---

## Швидкий старт

### Вимоги
- Node.js 14+
- RunPod акаунт з налаштованим ComfyUI Serverless endpoint
- Модель `flux1-dev-fp8.safetensors` у контейнері RunPod

### 1. Встановлення залежностей

```bash
# Проксі
cd runpod-proxy
npm install

# Клієнт
cd ../client
npm install
```

### 2. Налаштування змінних середовища

**`runpod-proxy/.env`**
```env
RUNPOD_API_KEY=rpa_ваш_ключ_тут
PORT=3012
```

**`client/.env`**
```env
VITE_RUNPOD_ENDPOINT_ID=ваш_endpoint_id
VITE_RUNPOD_PROXY_URL=http://localhost:3012
VITE_VIEW_URL=/api/view
VITE_DEBUG=false
```

Endpoint ID знаходиться в RunPod → Serverless → ваш endpoint → ID (рядок типу `404u30nf6dtk1f`).

### 3. Запуск

**Термінал 1 — проксі:**
```bash
cd runpod-proxy
node proxy-server.js
# або з автоперезавантаженням: npm run dev
```

**Термінал 2 — клієнт:**
```bash
cd client
npm run dev
# Відкрити http://localhost:5173
```

### 4. Перевірка підключення

```bash
# Статус проксі
curl http://localhost:3012/api/health

# Статус RunPod endpoint (воркери, черга)
curl -X POST http://localhost:3012/api/runpod/ВАШ_ENDPOINT_ID/health
```

Очікувана відповідь health:
```json
{
  "workers": { "idle": 3, "ready": 3, "running": 0 },
  "jobs": { "completed": 12, "inQueue": 0 }
}
```

---

## Як це працює

### Text-to-Image

Клієнт формує ComfyUI workflow у JSON і відправляє його на RunPod:

```json
{
  "input": {
    "workflow": {
      "30": { "class_type": "CheckpointLoaderSimple", "inputs": { "ckpt_name": "flux1-dev-fp8.safetensors" } },
      "6":  { "class_type": "CLIPTextEncode", "inputs": { "text": "your prompt", "clip": ["30", 1] } },
      "35": { "class_type": "FluxGuidance", "inputs": { "guidance": 3.5, "conditioning": ["6", 0] } },
      "31": { "class_type": "KSampler", "inputs": { "steps": 10, "cfg": 1, "sampler_name": "euler" } },
      "8":  { "class_type": "VAEDecode" },
      "9":  { "class_type": "SaveImage" }
    }
  }
}
```

RunPod виконує workflow і повертає:

```json
{
  "status": "COMPLETED",
  "output": {
    "images": [{ "filename": "ComfyUI_00001_.png", "data": "<base64>", "type": "base64" }]
  }
}
```

### Image Upload

Зображення **не завантажується на сервер** — конвертується в base64 прямо в браузері через `FileReader`. Це дозволяє:
- Не залежати від окремого файлового сервера
- Уникнути проблем з CORS
- Надсилати зображення напряму в RunPod workflow

### 3D Генерація (Hunyuan3D-2)

Компонент `ImageGenerator.tsx` використовує модель Hunyuan3D-2 для перетворення фото у 3D GLB:
1. Завантаження зображення
2. Запуск ComfyUI workflow (CLIPVisionEncode → KSampler → VAEDecodeHunyuan3D → VoxelToMesh → SaveGLB)
3. Отримання GLB файлу
4. Перегляд у Three.js viewer прямо в браузері

---

## Налаштування RunPod

### Необхідні моделі в контейнері

| Модель | Призначення | VRAM |
|---|---|---|
| `flux1-dev-fp8.safetensors` | Text-to-Image | ~16 GB |
| `model.fp16.safetensors` (Hunyuan3D-2) | 3D генерація | ~8 GB |

### Рекомендовані воркери

- **GPU:** NVIDIA A100 / H100 / RTX 4090 (мінімум 16 GB VRAM)
- **Тип:** Serverless (оплата за секунди роботи)
- **Min Workers:** 0 (зекономить гроші у простої)
- **Max Workers:** 3–5 (паралельна обробка)

### Handler

Проект сумісний з офіційним RunPod ComfyUI handler:
https://github.com/runpod-workers/worker-comfyui/blob/main/handler.py

Handler очікує формат `{ "input": { "workflow": { ... } } }` і повертає base64-закодовані зображення у `output.images`.

---

## API проксі-сервера

| Метод | Шлях | Опис |
|---|---|---|
| `POST` | `/api/runpod/:id/run` | Async запуск (повертає job ID) |
| `POST` | `/api/runpod/:id/runsync` | Sync запуск (чекає результату, до 90 сек) |
| `GET` | `/api/runpod/:id/status/:jobId` | Статус async job |
| `POST` | `/api/runpod/:id/cancel` | Скасування job |
| `POST` | `/api/runpod/:id/health` | Стан endpoint (воркери, черга) |
| `GET` | `/api/health` | Статус самого проксі |

---

## Стек технологій

**Frontend**
- React 19 + TypeScript
- Vite 6
- Tailwind CSS 4
- Three.js (3D viewer для GLB файлів)

**Backend (проксі)**
- Node.js + Express
- node-fetch
- dotenv

**AI / Інфраструктура**
- RunPod Serverless
- ComfyUI
- Flux Dev FP8 (text-to-image)
- Hunyuan3D-2 (image-to-3D)

---

## Змінні середовища

| Змінна | Файл | Опис |
|---|---|---|
| `RUNPOD_API_KEY` | `runpod-proxy/.env` | API ключ RunPod (не публікувати!) |
| `PORT` | `runpod-proxy/.env` | Порт проксі (за замовчуванням 3001) |
| `VITE_RUNPOD_ENDPOINT_ID` | `client/.env` | ID serverless endpoint |
| `VITE_RUNPOD_PROXY_URL` | `client/.env` | URL проксі-сервера |
| `VITE_DEBUG` | `client/.env` | `true` — показувати debug info в UI |
