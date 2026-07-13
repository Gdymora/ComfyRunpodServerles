# Власний воркер: InstantID + IP-Adapter FaceID + FaceDetailer

Кастомний RunPod ComfyUI-образ поверх `worker-comfyui`, який додає:
- **InstantID / IP-Adapter FaceID** — збереження обличчя персонажа з одного фото;
- **FaceDetailer (Impact Pack + Subpack)** — автоматично різкі обличчя й виправлені руки;
- детектори облич/рук (ADetailer) та потрібні допоміжні моделі.

Великі чекпоінти/лори лишаються на **Network Volume** (`5ym9rin1jf`) — образ їх не містить.

## Збірка / пуш / деплой

```bash
cd worker
# 1. Збірка (потрібен Docker + ~15–20 хв на завантаження нод/моделей)
docker build -t <твій_dockerhub>/comfyui-nsfw-face:v1 .

# 2. Пуш у Docker Hub
docker login
docker push <твій_dockerhub>/comfyui-nsfw-face:v1

# 3. RunPod → Serverless → ваш ендпоінт → Edit:
#    - Container Image: <твій_dockerhub>/comfyui-nsfw-face:v1
#    - Network Volume: nsfw-models (5ym9rin1jf)   ← щоб бачити чекпоінти
#    - Save. Потім Min Workers 1→0 + Clear Queue (примусовий рестарт).
```

## Що з рісерчу варто знати (офіційні best practices)

- Робити образ **FROM `runpod/worker-comfyui:X-base`** (чистий, з `comfy-cli`, без вшитих
  моделей) і додавати ноди через `comfy-node-install <registry-name>`, моделі — через
  `comfy model download --url … --relative-path models/<folder> --filename …`.
  Це офіційний спосіб — не треба форкати репозиторій воркера.
- **Не обовʼязково** пекти чекпоінти в образ, якщо є Network Volume: воркер бачить
  `/runpod-volume/models`. Тому образ маленький (лише ноди + FaceID/детектор-моделі).
- Підтримувані теки моделей: `checkpoints, loras, controlnet, ipadapter, clip_vision,
  insightface, instantid, ultralytics, facerestore_models, facedetection, sams, …`.
- Є вебтул **ComfyUI-to-API** (docs.runpod.io) — аналізує ваш ComfyUI-воркфлоу і
  автогенерує Dockerfile + репозиторій із потрібними нодами/моделями. Корисно, якщо
  збирати граф у самому ComfyUI, а не руками в коді.

## Наступний крок після збірки образу (у застосунку)

Коли образ живий, доробити в `client/`:
1. **Воркфлоу** (`promptUtils.ts`): додати гілку InstantID — вхід референс-фото обличчя →
   `InstantIDModelLoader` + `ApplyInstantID` перед KSampler; та **FaceDetailer**-прохід
   перед фінальним `VAEDecode` (авто-різкі обличчя/руки).
2. **UI**: завантаження **фото персонажа** (референс для InstantID) + тумблери
   «Зберігати обличчя» та «FaceDetailer».
3. Надсилати референс-фото у воркер як ще одне base64-зображення (`face.png`).

## Корисні посилання

- worker-comfyui customization (офіційна дока): https://github.com/runpod-workers/worker-comfyui/blob/main/docs/customization.md
- ComfyUI InstantID (cubiq): https://github.com/cubiq/ComfyUI_InstantID
- ComfyUI IPAdapter plus (cubiq): https://github.com/cubiq/ComfyUI_IPAdapter_plus
- ComfyUI Impact Pack (FaceDetailer): https://github.com/ltdrdata/ComfyUI-Impact-Pack
- ADetailer детектори (face/hand yolov8): https://huggingface.co/Bingsu/adetailer
- Comfy Registry (імена нод): https://registry.comfy.org
