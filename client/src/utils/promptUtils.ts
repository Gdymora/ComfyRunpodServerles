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

// Image-to-image workflow (Flux img2img via RunPod worker-comfyui images upload)
export const createFluxImg2ImgWorkflow = (
  imageBase64: string,        // base64 без data URL префіксу
  prompt: string = "",
  seed?: number,
  denoise: number = 0.75
) => {
  const imageName = "input_image.png";

  const workflow = {
    "1": {
      "inputs": { "image": imageName },
      "class_type": "LoadImage",
      "_meta": { "title": "Load Input Image" }
    },
    "2": {
      "inputs": { "ckpt_name": "flux1-dev-fp8.safetensors" },
      "class_type": "CheckpointLoaderSimple",
      "_meta": { "title": "Load Checkpoint" }
    },
    "3": {
      "inputs": { "pixels": ["1", 0], "vae": ["2", 2] },
      "class_type": "VAEEncode",
      "_meta": { "title": "VAE Encode" }
    },
    "4": {
      "inputs": { "text": prompt, "clip": ["2", 1] },
      "class_type": "CLIPTextEncode",
      "_meta": { "title": "Positive Prompt" }
    },
    "5": {
      "inputs": { "text": "", "clip": ["2", 1] },
      "class_type": "CLIPTextEncode",
      "_meta": { "title": "Negative Prompt" }
    },
    "6": {
      "inputs": { "guidance": 3.5, "conditioning": ["4", 0] },
      "class_type": "FluxGuidance",
      "_meta": { "title": "FluxGuidance" }
    },
    "7": {
      "inputs": {
        "seed": seed ?? Math.floor(Math.random() * 1000000000),
        "steps": 20,
        "cfg": 1,
        "sampler_name": "euler",
        "scheduler": "simple",
        "denoise": denoise,
        "model": ["2", 0],
        "positive": ["6", 0],
        "negative": ["5", 0],
        "latent_image": ["3", 0]
      },
      "class_type": "KSampler",
      "_meta": { "title": "KSampler" }
    },
    "8": {
      "inputs": { "samples": ["7", 0], "vae": ["2", 2] },
      "class_type": "VAEDecode",
      "_meta": { "title": "VAE Decode" }
    },
    "9": {
      "inputs": { "filename_prefix": "ComfyUI", "images": ["8", 0] },
      "class_type": "SaveImage",
      "_meta": { "title": "Save Image" }
    }
  };

  return {
    input: {
      workflow,
      // RunPod worker-comfyui uploads these to ComfyUI input folder before running workflow
      images: [{ name: imageName, image: imageBase64 }]
    }
  };
};