# CLAUDE.md

Пам'ятка для Claude Code. Мова спілкування — **українська**.

## Що це за проєкт

Веб-генератор NSFW-фото на власному ComfyUI-воркері в RunPod Serverless.
Воркери піднімаються під запит і гаснуть — щоб не платити за простій.

```
client (React+Vite)  →  runpod-proxy (Node)  →  RunPod Serverless  →  ComfyUI worker
                         ховає RUNPOD_API_KEY    endpoint nsfw-photo    + Network Volume
```

| Каталог | Що це |
|---|---|
| `client/` | UI. `src/config/models.ts` — реєстр пресетів моделей. `src/utils/promptUtils.ts` — збірка ComfyUI-графа JSON |
| `runpod-proxy/` | проксі; тримає `RUNPOD_API_KEY`, щоб ключ не світився в браузері |
| `worker/` | `Dockerfile` власного образу + детальний `README.md` (**читати перед будь-якою роботою з образом/волюмом**) |
| `civitai.red.md` | історія завантаження моделей з civitai + ID версій |

```bash
cd client && npm run dev          # UI
cd runpod-proxy && npm start      # проксі (PORT з runpod-proxy/.env)
```

## Бойові факти (перевірено 2026-07-15)

| | |
|---|---|
| Docker Hub | `alexpetroff1978/comfyui-nsfw-face:v1` — 31.5 GB |
| Ендпоінт (робочий) | `nsfw-photo` = `12qoor9ivy4n5o`, EU-RO-1 — його ж бачить `client/.env` |
| Ендпоінт (спадок) | `404u30nf6dtk1f` «ComfyUI 5.2.0», без волюма |
| Network Volume | `xhvaoqt7v8` / `nsfw-models-euro1` / 50 GB — **власник планує видалити й зробити менший (~30 GB)** |

Стан RunPod зручно читати через API (ключ у `runpod-proxy/.env`):

```bash
KEY=$(grep -E '^RUNPOD_API_KEY=' runpod-proxy/.env | cut -d= -f2-)
curl -s -X POST https://api.runpod.io/graphql -H "Authorization: Bearer $KEY" \
  -H 'Content-Type: application/json' \
  -d '{"query":"query { myself { endpoints { id name workersMin workersMax networkVolumeId } networkVolumes { id name size dataCenterId } } }"}'
```

## Правила, які економлять години

- **Max Workers = 0 — це навмисно**, власник вимикає воркери, щоб не платити.
  Не діагностувати це як поломку. Перед тестом підняти до 1, після — повернути 0.
- **Не плутати роль образу й волюма.** Образ = код нод (InstantID, Impact Pack,
  controlnet_aux) + pip; вони фізично не можуть жити на волюмі. Волюм = чекпоінти й
  лори. Потрібні обидва; образ від оплати волюма не звільняє.
- **`comfy-cli` тільки з `--skip-prompt`**, інакше docker build зависає намертво.
- **Довгі команди — завжди з логом у файл** (`2>&1 | tee build.log`). Білд і пуш
  переживають обрив сесії, а от їхній вивід — ні. Вже наступали: логи 2-годинного
  білду втрачені, стан довелося відновлювати через `ps`.
- **`docker login` не працює з не-TTY** — просити власника зробити в окремому терміналі.
- **`docker history` бреше про 0 B** для кешованих шарів. Перевіряти вміст усередині:
  `docker run --rm --entrypoint sh IMAGE -c 'ls -la /comfyui/models/...'`
- **Биті моделі** (0 байт / кілька сотень КБ замість гігабайтів) валять воркера з
  `conv_in.weight` або HTTP 400. Це HTML-помилка civitai, збережена замість файлу.

## Де стоїмо (2026-07-15)

Зроблено:
- образ зібрано (~2 год) і закомічено фікс `--skip-prompt` у `worker/Dockerfile` (`f8ad5dc`);
- `docker push alexpetroff1978/comfyui-nsfw-face:v1` — **запущений, може ще йти**;
  лог у скретчпаді сесії, перевірка: `docker manifest inspect alexpetroff1978/comfyui-nsfw-face:v1`
- `worker/README.md` переписано: реальні ID, склад образу, план нового волюма.

Далі:
1. Дочекатися пушу.
2. **Зняти інвентар старого волюма до видалення** — дві лори (`Skinny_(18+)_SDXL_v2.0`,
   `model_addon_v3`) не мають записаного джерела на civitai. Порядок — у `worker/README.md`.
3. Створити новий волюм ~30 GB у EU-RO-1, залити лише потрібне (~22 GB, список у
   `worker/README.md`); `absolutereality_inpaint` і `oiled_skin_sd15` не переносити —
   вони вимкнені в пресетах.
4. RunPod → `nsfw-photo` → Edit: Container Image = новий образ, новий волюм,
   Max Workers 1 → тест → назад 0.

## Технічний борг

- Образ роздутий: ~11 GB моделей (InstantID, FaceID, ControlNet) могли б жити на волюмі.
  Обов'язкові в образі лише ноди й pip (~6 GB) + база 13.6 GB.
- `civitai.red.md` містить **робочий civitai-токен відкритим текстом** у git — відкликати
  й перенести в `.env`.
- Кореневий `README.md` подекуди розходиться з реальністю (порти проксі, ID) — звіряти з
  кодом і API, а не вірити на слово.
