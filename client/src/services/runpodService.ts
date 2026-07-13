// src/services/runpodService.ts - RunPod ComfyUI service via proxy
import {
  ComfyWorkflowRequest,
  WorkflowOptions,
  createFluxImageTextWorkflow,
  createFluxImageWorkflow,
  createFluxWorkflow,
  createInpaintWorkflow,
} from "../utils/promptUtils";

export type RunPodRequest = ComfyWorkflowRequest;

export interface RunPodResponse {
  id?: string;
  status?: "IN_QUEUE" | "IN_PROGRESS" | "COMPLETED" | "FAILED" | "CANCELLED";
  output?: {
    images?: Array<{
      filename?: string;
      type?: string;
      data?: string;
    }>;
    errors?: string[];
    [key: string]: unknown;
  };
  error?: string;
  executionTime?: number;
  delayTime?: number;
  workerId?: string;
}

export interface ProcessedImage {
  data: string;
  filename: string;
  type: string;
  url: string;
}

export interface ProcessedRunPodResponse extends RunPodResponse {
  processedImages?: ProcessedImage[];
}

export class RunPodService {
  private proxyBaseUrl: string;

  constructor(endpointId: string, proxyUrl: string = "http://localhost:3001") {
    this.proxyBaseUrl = `${proxyUrl}/api/runpod/${endpointId}`;
  }

  private async makeRequest(
    operation: string,
    data?: RunPodRequest | { jobId: string },
    jobId?: string
  ): Promise<any> {
    let url = `${this.proxyBaseUrl}/${operation}`;
    let method = "POST";

    if (operation === "status" && jobId) {
      url = `${this.proxyBaseUrl}/status/${jobId}`;
      method = "GET";
      data = undefined;
    }

    const options: RequestInit = {
      method,
      headers: {
        "Content-Type": "application/json",
      },
    };

    if (method === "POST" && data) {
      options.body = JSON.stringify(data);
    }

    console.log(`🔄 ${method} ${url}`);

    if (data) {
      const debugData =
        "input" in data && data.input.images
          ? {
              ...data,
              input: {
                ...data.input,
                images: data.input.images.map((image) => ({
                  ...image,
                  image: `<base64:${image.image.length} chars>`,
                })),
              },
            }
          : data;

      console.log("📤 Request data:", debugData);
    }

    const response = await fetch(url, options);
    const responseText = await response.text();

    let responseData: any;

    try {
      responseData = responseText ? JSON.parse(responseText) : {};
    } catch {
      responseData = {
        error: "Non-JSON proxy response",
        content: responseText,
      };
    }

    if (!response.ok) {
      throw new Error(
        `Proxy error: ${response.status} - ${JSON.stringify(responseData)}`
      );
    }

    console.log("📥 Response:", responseData);

    return responseData;
  }

  private validateWorkflowRequest(request: RunPodRequest): void {
    const workflow = request?.input?.workflow;

    if (!workflow || typeof workflow !== "object") {
      throw new Error(
        "Invalid RunPod request: input.workflow must contain a ComfyUI API workflow"
      );
    }

    if (Object.keys(workflow).length === 0) {
      throw new Error(
        "Invalid RunPod request: input.workflow cannot be empty"
      );
    }
  }

  private withProcessedImages(
    response: RunPodResponse
  ): ProcessedRunPodResponse {
    return {
      ...response,
      processedImages: this.processImages(response.output),
    };
  }

  private async executeWorkflow(
    request: RunPodRequest
  ): Promise<ProcessedRunPodResponse> {
    this.validateWorkflowRequest(request);

    try {
      let response = await this.runsync(request);

      // /runsync може повернути IN_QUEUE/IN_PROGRESS одразу (холодний старт воркера
      // або довга джоба). У такому разі опитуємо статус до завершення, інакше
      // користувач отримує відповідь без зображень.
      if (
        (response.status === "IN_QUEUE" || response.status === "IN_PROGRESS") &&
        response.id
      ) {
        response = await this.waitForCompletion(response.id);
      }

      return this.withProcessedImages(response);
    } catch (syncError) {
      console.log("Sync failed, trying async:", syncError);

      const { id } = await this.run(request);
      const response = await this.waitForCompletion(id);

      return this.withProcessedImages(response);
    }
  }

  async run(request: RunPodRequest): Promise<{ id: string }> {
    this.validateWorkflowRequest(request);

    const data = await this.makeRequest("run", request);

    if (!data.id) {
      throw new Error("No job ID returned from RunPod");
    }

    return { id: data.id };
  }

  async runsync(request: RunPodRequest): Promise<RunPodResponse> {
    this.validateWorkflowRequest(request);
    return await this.makeRequest("runsync", request);
  }

  async status(jobId: string): Promise<RunPodResponse> {
    return await this.makeRequest("status", undefined, jobId);
  }

  async health(): Promise<any> {
    return await this.makeRequest("health");
  }

  async cancel(jobId: string): Promise<boolean> {
    try {
      await this.makeRequest("cancel", { jobId });
      return true;
    } catch (error) {
      console.error("RunPod /cancel failed:", error);
      return false;
    }
  }

  async waitForCompletion(
    jobId: string,
    onProgress?: (status: RunPodResponse) => void,
    maxWaitTime: number = 300000,
    pollInterval: number = 3000
  ): Promise<RunPodResponse> {
    const startTime = Date.now();

    while (Date.now() - startTime < maxWaitTime) {
      const statusResponse = await this.status(jobId);

      onProgress?.(statusResponse);

      if (
        statusResponse.status === "COMPLETED" ||
        statusResponse.status === "FAILED"
      ) {
        return statusResponse;
      }

      if (statusResponse.status === "CANCELLED") {
        throw new Error("Job was cancelled");
      }

      await new Promise((resolve) => setTimeout(resolve, pollInterval));
    }

    throw new Error("Job timeout - max wait time exceeded");
  }

  processImages(output?: RunPodResponse["output"]): ProcessedImage[] {
    if (!output?.images || !Array.isArray(output.images)) {
      return [];
    }

    return output.images
      .filter(
        (image): image is {
          filename?: string;
          type: string;
          data: string;
        } =>
          Boolean(
            image &&
              typeof image.data === "string" &&
              image.data.length > 0 &&
              typeof image.type === "string"
          )
      )
      .map((image, index) => {
        const filename = image.filename || `generated_${index + 1}.png`;

        if (image.type === "s3_url") {
          return {
            data: image.data,
            filename,
            type: image.type,
            url: image.data,
          };
        }

        return {
          data: image.data,
          filename,
          type: image.type,
          url: `data:image/png;base64,${image.data}`,
        };
      });
  }

  async generateFromText(
    prompt: string,
    options: WorkflowOptions = {}
  ): Promise<ProcessedRunPodResponse> {
    const request = createFluxWorkflow(
      prompt,
      options.seed,
      options.width ?? 832,
      options.height ?? 1216,
      options
    );

    return await this.executeWorkflow(request);
  }

  async generateFromImage(
    imageBase64: string,
    options: WorkflowOptions = {}
  ): Promise<ProcessedRunPodResponse> {
    const request = createFluxImageWorkflow(imageBase64, options);
    return await this.executeWorkflow(request);
  }

  async generateFromImageAndText(
    imageBase64: string,
    prompt: string,
    options: WorkflowOptions = {}
  ): Promise<ProcessedRunPodResponse> {
    const request = createFluxImageTextWorkflow(
      imageBase64,
      prompt,
      options
    );

    return await this.executeWorkflow(request);
  }

  async generateInpaint(
    imageBase64: string,
    maskBase64: string,
    prompt: string,
    options: WorkflowOptions = {}
  ): Promise<ProcessedRunPodResponse> {
    const request = createInpaintWorkflow(
      imageBase64,
      maskBase64,
      prompt,
      options
    );

    return await this.executeWorkflow(request);
  }
}

export const createRunPodService = (
  endpointId: string,
  proxyUrl?: string
): RunPodService => {
  return new RunPodService(endpointId, proxyUrl);
};