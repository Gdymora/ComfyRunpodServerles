# Власний RunPod ComfyUI-воркер: base worker-comfyui + InstantID + IP-Adapter FaceID
# + FaceDetailer (Impact Pack). Великі чекпоінти/лори лишаються на Network Volume
# (5ym9rin1jf) — тут лише кастомні ноди та їх допоміжні моделі, щоб образ не роздувати.
#
# Офіційний спосіб (docs/customization.md): base-образ + comfy-cli
# (comfy-node-install / comfy model download). Див. worker/README.md.
#
# ⚠️ Імена нод у comfy-node-install звірте в Comfy Registry (registry.comfy.org),
#    якщо якесь не встановиться. URL моделей — стандартні; при 404 поправте рядок.

FROM runpod/worker-comfyui:5.0.0-base

# --- Системні залежності (для розпакування antelopev2) ---
RUN apt-get update && apt-get install -y --no-install-recommends wget unzip && \
    apt-get clean && rm -rf /var/lib/apt/lists/*

# --- 1. Кастомні ноди (через Comfy Registry) ---
RUN comfy-node-install comfyui-impact-pack comfyui-impact-subpack \
    comfyui_instantid comfyui_ipadapter_plus

# insightface потрібен InstantID/IPAdapter-FaceID (на випадок, якщо не підтягнувся вимогами нод)
RUN pip install --no-cache-dir insightface onnxruntime-gpu

# --- 2. InstantID: ip-adapter + controlnet ---
RUN comfy model download \
      --url https://huggingface.co/InstantX/InstantID/resolve/main/ip-adapter.bin \
      --relative-path models/instantid --filename ip-adapter.bin && \
    comfy model download \
      --url https://huggingface.co/InstantX/InstantID/resolve/main/ControlNetModel/diffusion_pytorch_model.safetensors \
      --relative-path models/controlnet/instantid --filename diffusion_pytorch_model.safetensors

# --- 3. InsightFace antelopev2 (zip → розпакувати) ---
RUN mkdir -p /comfyui/models/insightface/models && \
    cd /comfyui/models/insightface/models && \
    wget -q -O antelopev2.zip \
      "https://huggingface.co/MonsterMMORPG/tools/resolve/main/antelopev2.zip" && \
    unzip -o antelopev2.zip && rm antelopev2.zip

# --- 4. FaceDetailer: детектори облич/рук (ADetailer) ---
RUN comfy model download \
      --url https://huggingface.co/Bingsu/adetailer/resolve/main/face_yolov8m.pt \
      --relative-path models/ultralytics/bbox --filename face_yolov8m.pt && \
    comfy model download \
      --url https://huggingface.co/Bingsu/adetailer/resolve/main/hand_yolov8s.pt \
      --relative-path models/ultralytics/bbox --filename hand_yolov8s.pt

# --- 5. IP-Adapter FaceID SDXL + CLIP vision (альтернатива InstantID) ---
RUN comfy model download \
      --url https://huggingface.co/h94/IP-Adapter-FaceID/resolve/main/ip-adapter-faceid_sdxl.bin \
      --relative-path models/ipadapter --filename ip-adapter-faceid_sdxl.bin && \
    comfy model download \
      --url https://huggingface.co/h94/IP-Adapter-FaceID/resolve/main/ip-adapter-faceid_sdxl_lora.safetensors \
      --relative-path models/loras --filename ip-adapter-faceid_sdxl_lora.safetensors && \
    comfy model download \
      --url https://huggingface.co/h94/IP-Adapter/resolve/main/models/image_encoder/model.safetensors \
      --relative-path models/clip_vision --filename CLIP-ViT-H-14-laion2B-s32B-b79K.safetensors
