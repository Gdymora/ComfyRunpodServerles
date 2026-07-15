# Власний воркер: InstantID + IP-Adapter FaceID + FaceDetailer

Кастомний RunPod ComfyUI-образ поверх `runpod/worker-comfyui:5.0.0-base`.

**Навіщо взагалі свій образ, якщо є Network Volume?** Вони закривають різні дірки:

| | Образ (Docker) | Network Volume |
|---|---|---|
| Що тримає | **код нод** + pip-залежності + допоміжні моделі | чекпоінти й лори |
| Чому саме там | ComfyUI вантажить `custom_nodes` зі своєї теки; `insightface`/`onnxruntime-gpu` мусять бути в контейнері | десятки ГБ, які міняються часто — інакше кожна заміна моделі = перезбірка й багатогодинний пуш |

Без свого образу воркфлоу падає з «node not found». Волюм коду не дає — тому потрібні обидва.

## Поточний стан

- Образ: **`alexpetroff1978/comfyui-nsfw-face:v1`** — 31.5 GB
- Ендпоінт: **`nsfw-photo`** (`12qoor9ivy4n5o`), регіон EU-RO-1 — його ж використовує клієнт
- Другий ендпоінт `404u30nf6dtk1f` («ComfyUI 5.2.0») — без волюма, спадок

## Що всередині образу

| Шар | Розмір |
|---|---|
| база `runpod/worker-comfyui:5.0.0-base` | 13.6 GB |
| ноди: impact-pack, impact-subpack, instantid, ipadapter_plus | 4.87 GB |
| InstantID (ip-adapter + controlnet) | 4.19 GB |
| IP-Adapter FaceID SDXL + CLIP vision | 3.97 GB |
| ControlNet Union SDXL (promax) | 2.51 GB |
| `comfyui_controlnet_aux` (препроцесори) | 678 MB |
| insightface antelopev2 | 428 MB |
| ADetailer: face/hand/person yolov8 | 129 MB |
| pip: insightface + onnxruntime-gpu | 1.09 GB |
| 4x-UltraSharp | 67 MB |

`sd_xl_base_1.0.safetensors` вшитий у базовий образ (цензурований, лише для перевірки живості).

> **Образ роздутий.** Обов'язкові в ньому лише ноди й pip (~6 GB) плюс база (13.6 GB).
> Моделі InstantID / FaceID / ControlNet (~11 GB) могли б жити на волюмі. Це відомий
> технічний борг — чіпати варто окремим заходом, не ламаючи робочу конфігурацію.

## Збірка / пуш / деплой

```bash
cd worker

# 1. Збірка (~2 години: важкі завантаження з HuggingFace)
#    ОБОВ'ЯЗКОВО з логом у файл — інакше при обриві сесії діагностика втрачена.
docker build --progress=plain -t alexpetroff1978/comfyui-nsfw-face:v1 . 2>&1 | tee build.log

# 2. Пуш (docker login — тільки в справжньому терміналі, він інтерактивний)
docker push alexpetroff1978/comfyui-nsfw-face:v1 2>&1 | tee push.log

# 3. RunPod → Serverless → nsfw-photo → Edit:
#    - Container Image: alexpetroff1978/comfyui-nsfw-face:v1
#    - Network Volume:  <новий волюм>
#    - Max Workers:     1   ← інакше запит вічно висить у черзі
#    - Save → Clear Queue
#    Після тестів Max Workers → 0, щоб не платити за простій.
```

### Граблі

- **`comfy-cli` вимагає `--skip-prompt`.** Інтерактивні промпти блокують неінтерактивний
  build. Єдиний правильний синтаксис: `comfy --skip-prompt node install …` і
  `comfy --skip-prompt model download …`. Без прапорця білд зависає намертво.
- **`docker login` не працює з-під Claude Code / не-TTY.** Робити в окремому терміналі
  або `docker login -u USER --password-stdin < token.txt`. Потрібен Access Token з
  правами **Read & Write**.
- **Max Workers = 0** — це не поломка, а свідома економія. Але перед тестом підняти до 1.
- `docker history` показує шар як **0 B**, якщо він прийшов з кешу. Це не означає, що
  файлу немає — перевіряти треба всередині контейнера:
  `docker run --rm --entrypoint sh IMAGE -c 'ls -la /comfyui/models/…'`

## Network Volume: що на ньому мусить бути

Воркер бачить волюм як `/runpod-volume/models` (у Pod той самий диск — `/workspace/models`).

Актуальний склад за `client/src/config/models.ts` — **лише те, що реально використовується**:

```
checkpoints/juggernaut_xl.safetensors            ~7.0G  ← дефолт + refiner для Pony
checkpoints/intorealism_ultra_sdxl.safetensors    7.1G
checkpoints/skinny-18-sdxl.safetensors            6.5G  (Pony XL)
loras/pornmaster_krea2.safetensors                218M
loras/reverse_cowgirl_sdxl.safetensors            218M
loras/pussy_of_queens_pony.safetensors            218M
loras/ski_slope_breasts_sdxl.safetensors          218M
loras/Skinny_(18+)_SDXL_v2.0.safetensors          218M
loras/model_addon_v3.safetensors                  218M
                                          ────────────
                                            разом ≈ 22G  → волюм 30 GB з запасом
```

**Що можна не переносити** (звільняє ~8 GB проти старих 50 GB):
- `absolutereality_inpaint.safetensors` (4.0G) — inpainting-модель з 9-канальним UNet;
  для txt2img дає дірки й уродців. У пресетах вимкнена.
- `oiled_skin_sd15.safetensors` (4.0G) — SD 1.5, гірша за SDXL-realism. У пресетах вимкнена.

### Звідки качалися моделі

Джерело — **civitai.red** (дзеркало civitai). Пряме посилання будується так:

```
https://civitai.red/api/download/models/<VERSION_ID>?token=<CIVITAI_TOKEN>
```

Токен береться на civitai.red → аватар → Account settings → API Keys → Add API Key.

| Файл | VERSION_ID | Звідки відомо |
|---|---|---|
| `skinny-18-sdxl.safetensors` | `290640` | прямий `wget` у `civitai.red.md` |
| `absolutereality_inpaint.safetensors` | `134084` | прямий `wget` |
| `reverse_cowgirl_sdxl.safetensors` | `2416998` | прямий `wget` |
| `pornmaster_krea2.safetensors` | `2847116` | прямий `wget` |
| `intorealism_ultra_sdxl.safetensors` | версія `3058932`, модель `1950841` | `models.ts` + сторінка |
| `juggernaut_xl.safetensors` | версія `1759168` (Ragnarok) | `models.ts` |
| `pussy_of_queens_pony.safetensors` | модель `1200451` | сторінка |
| `ski_slope_breasts_sdxl.safetensors` | модель `942483` | сторінка |
| `oiled_skin_sd15.safetensors` | модель `87685` | сторінка |
| `Skinny_(18+)_SDXL_v2.0.safetensors` | **невідомо** | — |
| `model_addon_v3.safetensors` | **невідомо** | — |

Де вказано «модель», а не «версію» — треба зайти на сторінку моделі й узяти
`modelVersionId` потрібної версії; ID моделі в URL завантаження не працює.

### ⚠️ Перед видаленням старого волюма

Дві лори (`Skinny_(18+)_SDXL_v2.0`, `model_addon_v3`) не мають записаного джерела —
після видалення волюма їх не буде звідки перекачати. Тому порядок такий:

1. Підняти найдешевший Pod (напр. 1x RTX 4000 Ada) **у тому ж дата-центрі**, у полі
   Select Network Volume обрати старий диск.
2. Зняти інвентар і **зберегти його в репозиторій**:
   `ls -laR /workspace/models > inventory.txt`
3. Перекачати потрібне на новий волюм.
4. Terminate Pod (інакше палить гроші), і аж тоді видаляти старий волюм.

### 🔑 Витік токена

`civitai.red.md` містить робочий civitai-токен **відкритим текстом** і вже закомічений
у git (`505cc8b2…`). Його варто відкликати в Account settings і надалі тримати в `.env`,
а не в markdown. Той самий токен розсипаний по base64-рядках у тому ж файлі.

### Перевірка валідності моделі

Битий/недокачаний файл валить воркер з `conv_in.weight` або HTTP 400. Ознаки норми:
~6.5G для SDXL-чекпоінта, ~2–4G для SD 1.5, ~218M для SDXL-лори. Файл на 0 байт або
кілька сотень КБ — це HTML-сторінка помилки замість моделі (типово при качанні з
civitai без токена).

## Корисні посилання

- Кастомізація worker-comfyui: https://github.com/runpod-workers/worker-comfyui/blob/main/docs/customization.md
- Comfy Registry (точні імена нод): https://registry.comfy.org
- FlashBoot / холодний старт: https://www.runpod.io/blog/introducing-flashboot-serverless-cold-start
- ComfyUI-to-API (автогенерація Dockerfile з воркфлоу): https://docs.runpod.io
