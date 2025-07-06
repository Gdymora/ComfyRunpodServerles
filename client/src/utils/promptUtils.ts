// Додайте цю функцію в кінець вашого оригінального promptUtils.ts
export const createFluxWorkflow = (prompt: string, seed?: number, width = 512, height = 512) => {
  const workflow = {
    "6": {
      "inputs": {
        "text": prompt,
        "clip": ["30", 1]
      },
      "class_type": "CLIPTextEncode",
      "_meta": {
        "title": "CLIP Text Encode (Positive Prompt)"
      }
    },
    "8": {
      "inputs": {
        "samples": ["31", 0],
        "vae": ["30", 2]
      },
      "class_type": "VAEDecode",
      "_meta": {
        "title": "VAE Decode"
      }
    },
    "9": {
      "inputs": {
        "filename_prefix": "ComfyUI",
        "images": ["8", 0]
      },
      "class_type": "SaveImage",
      "_meta": {
        "title": "Save Image"
      }
    },
    "27": {
      "inputs": {
        "width": width,
        "height": height,
        "batch_size": 1
      },
      "class_type": "EmptySD3LatentImage",
      "_meta": {
        "title": "EmptySD3LatentImage"
      }
    },
    "30": {
      "inputs": {
        "ckpt_name": "flux1-dev-fp8.safetensors"
      },
      "class_type": "CheckpointLoaderSimple",
      "_meta": {
        "title": "Load Checkpoint"
      }
    },
    "31": {
      "inputs": {
        "seed": seed || Math.floor(Math.random() * 1000000000),
        "steps": 10,
        "cfg": 1,
        "sampler_name": "euler",
        "scheduler": "simple",
        "denoise": 1,
        "model": ["30", 0],
        "positive": ["35", 0],
        "negative": ["33", 0],
        "latent_image": ["27", 0]
      },
      "class_type": "KSampler",
      "_meta": {
        "title": "KSampler"
      }
    },
    "33": {
      "inputs": {
        "text": "",
        "clip": ["30", 1]
      },
      "class_type": "CLIPTextEncode",
      "_meta": {
        "title": "CLIP Text Encode (Negative Prompt)"
      }
    },
    "35": {
      "inputs": {
        "guidance": 3.5,
        "conditioning": ["6", 0]
      },
      "class_type": "FluxGuidance",
      "_meta": {
        "title": "FluxGuidance"
      }
    },
    "38": {
      "inputs": {
        "images": ["8", 0]
      },
      "class_type": "PreviewImage",
      "_meta": {
        "title": "Preview Image"
      }
    }
  };

  return {
    input: {
      workflow: workflow
    }
  };
};