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

## 🔧 Хитрощі: як витиснути з проекту максимум

Відсортовано за співвідношенням «ефект / зусилля».

### Швидкість / вартість (найлегші перемоги)
- **FlashBoot** — увімкнути на Serverless-ендпоінті. Безкоштовно, холодний старт з ~20с до
  **0.5–2с**, вартість −до 80% на нерегулярному навантаженні. Прибирає затики `IN_QUEUE`.
- **Lightning/Turbo-версія Juggernaut** (4–8 кроків) — швидкі/дешеві прев'ю; фінал — повною
  моделлю. Ставити CFG ~1.5–2, кроки 4–8.
- **Batch 4** (вже в UI) — один холодний старт на кілька картинок.

### Якість
- **FreeU_V2** — ✅ вже додано в воркфлоу (тумблер «FreeU»). Безкоштовний буст деталей.
- **RescaleCFG** — ✅ підтримується (`options.rescale_cfg` 0.5–0.8) проти «випаленої» текстури.
- **FaceDetailer / ADetailer** — головний фікс рук/облич (ноди Impact-Pack у цьому образі +
  детектори `face_yolov8m`/`hand_yolov8s`). Додати прохід перед фінальним VAEDecode.
- **4x-UltraSharp** (у образі) — модельний апскейл на Hi-Res замість латент-bislerp → різкіша шкіра.
- **Негативні embeddings** (FastNegativeV2/BadDream) — короткий негатив, чистіша анатомія.
- **Фото-лексика в промпті**: `shot on Fujifilm, 50mm f/1.8, Kodak Portra 400, film grain,
  subsurface scattering, skin pores, skin imperfections`.
- **Pony→Juggernaut refiner** — ✅ вже реалізовано (анатомія Pony + шкіра Juggernaut).

### Контроль
- **ControlNet Union SDXL** (у образі) + `comfyui_controlnet_aux` — точна поза (OpenPose/Depth):
  подаєте скелет/depth → та сама поза.
- **InstantID / IP-Adapter FaceID** (у образі) — обличчя персонажа з одного фото.

### Джерела досліджень
- FlashBoot / cold-start: https://www.runpod.io/blog/introducing-flashboot-serverless-cold-start
- SDXL Lightning: https://ucstrategies.com/news/sdxl-lightning-speed-benchmarks-4-step-setup-lora-guide-2026/
- FreeU у ComfyUI: https://learn.runcomfy.com/revolutionize-image-quality-with-freeU-in-comfyui
- Реалізм у ComfyUI: https://www.promptingpixels.com/tutorial/how-to-make-ai-images-look-more-realistic-in-comfyui
- Гайд по SDXL-фотореалізму: https://sandner.art/ultimate-guide-to-sdxl-mastering-photorealism-in-generative-art-for-begginers-and-advanced/

## Корисні посилання

- worker-comfyui customization (офіційна дока): https://github.com/runpod-workers/worker-comfyui/blob/main/docs/customization.md
- ComfyUI InstantID (cubiq): https://github.com/cubiq/ComfyUI_InstantID
- ComfyUI IPAdapter plus (cubiq): https://github.com/cubiq/ComfyUI_IPAdapter_plus
- ComfyUI Impact Pack (FaceDetailer): https://github.com/ltdrdata/ComfyUI-Impact-Pack
- ADetailer детектори (face/hand yolov8): https://huggingface.co/Bingsu/adetailer
- Comfy Registry (імена нод): https://registry.comfy.org
