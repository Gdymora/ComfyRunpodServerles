import { config } from "../config/env";

export interface ComfyUIExecutionProgress {
  status: "starting" | "processing" | "completed" | "error";
  progress?: number;
  node?: string;
  nodeTitle?: string;
  error?: string;
  output?: {
    images?: Array<{
      filename: string;
      subfolder: string;
      type: string;
    }>;
    [key: string]: any;
  };
}

export interface ComfyUIHistoryOutput {
  [nodeId: string]: {
    images?: Array<{
      filename: string;
      subfolder: string;
      type: string;
    }>;
    [key: string]: any;
  };
}

export interface QueueStatus {
  queue_running: boolean;
  queue_remaining: number;
  queue_pending: string[];
  running_workflow_id?: string;
}

export type ProgressCallback = (progress: ComfyUIExecutionProgress) => void;

export class WebSocketService {
  private ws: WebSocket | null = null;
  private clientId: string;
  private connected: boolean = false;
  private progressCallbacks: Map<string, ProgressCallback> = new Map();
  private reconnectAttempts: number = 0;
  private maxReconnectAttempts: number = 5;
  private reconnectDelay: number = 2000;
  private queueCheckInterval: any = null;
  private historyCheckInterval: any = null;
  private currentExecutionId: string | null = null;
  private executionCompleted: Map<string, boolean> = new Map();

  constructor() {
    // Generate a unique clientId for connection identification
    this.clientId = this.generateUUID();
  }

  /**
   * Returns the client ID for use in requests
   */
  public getClientId(): string {
    return this.clientId;
  }

  /**
   * Checks if the WebSocket connection is currently active
   */
  public isConnected(): boolean {
    return this.connected && this.ws?.readyState === WebSocket.OPEN;
  }

  /**
   * Connect to the ComfyUI WebSocket server
   */
  public connect(): Promise<boolean> {
    return new Promise((resolve) => {
      if (this.connected && this.ws?.readyState === WebSocket.OPEN) {
        resolve(true);
        return;
      }

      // Close previous connection if it exists
      if (this.ws) {
        this.ws.close();
      }

      // Create a new WebSocket connection
      const wsUrl = `${config.WS_URL || "ws://localhost:8188/ws"}?clientId=${
        this.clientId
      }`;
      console.log("Connecting to WebSocket:", wsUrl);

      this.ws = new WebSocket(wsUrl);

      this.ws.onopen = () => {
        console.log("WebSocket connection established");
        this.connected = true;
        this.reconnectAttempts = 0;

        // Start periodic checks
        this.startPolling();

        resolve(true);
      };

      this.ws.onclose = (event) => {
        this.connected = false;
        console.log(
          `WebSocket connection closed: ${event.code} ${event.reason}`
        );

        // Stop periodic checks
        this.stopPolling();

        // Try to reconnect if it wasn't closed intentionally
        if (this.reconnectAttempts < this.maxReconnectAttempts) {
          this.reconnectAttempts++;
          setTimeout(() => this.connect(), this.reconnectDelay);
        }
      };

      this.ws.onerror = (error) => {
        console.error("WebSocket error:", error);
        resolve(false);
      };

      this.ws.onmessage = (event) => {
        this.handleWebSocketMessage(event);
      };
    });
  }

  /**
   * Starts periodic queue and history checks
   */
  private startPolling() {
    this.stopPolling(); // Зупиняємо попередні інтервали

    let isQueueTurn = true; // Флаг для чергування

    this.queueCheckInterval = setInterval(() => {
      if (
        this.currentExecutionId &&
        !this.executionCompleted.get(this.currentExecutionId)
      ) {
        if (isQueueTurn) {
          this.pollQueueStatus();
          // Додаємо паузу перед наступним викликом
          setTimeout(() => this.pollHistory(), 1000);
        }
        isQueueTurn = !isQueueTurn; // Перемикаємося
      }
    }, 5000); // Інтервал між циклами 3 секунди
  }

  /**
   * Stops periodic checks
   */
  private stopPolling() {
    if (this.queueCheckInterval) {
      clearInterval(this.queueCheckInterval);
      this.queueCheckInterval = null;
    }

    if (this.historyCheckInterval) {
      clearInterval(this.historyCheckInterval);
      this.historyCheckInterval = null;
    }
  }

  /**
   * Polls queue status
   */
  private async pollQueueStatus() {
    try {
      if (
        !this.currentExecutionId ||
        this.executionCompleted.get(this.currentExecutionId)
      ) {
        return; // Don't poll if no active execution or if execution is completed
      }

      const queueStatus = await this.getQueueStatus();

      // If there's an active prompt_id we're tracking progress for
      if (
        this.currentExecutionId &&
        this.progressCallbacks.has(this.currentExecutionId)
      ) {
        const callback = this.progressCallbacks.get(this.currentExecutionId)!;

        // If queue is running and there's an active workflow
        if (queueStatus.queue_running && queueStatus.running_workflow_id) {
          // If it's our workflow
          if (queueStatus.running_workflow_id === this.currentExecutionId) {
            // Update progress
            callback({
              status: "processing",
              progress: 50, // approximate progress
              node: "queue",
              nodeTitle: "Execution in progress",
            });
          } else if (
            queueStatus.queue_pending.includes(this.currentExecutionId)
          ) {
            // If our task is in the waiting queue
            callback({
              status: "processing",
              progress: 10,
              node: "queue",
              nodeTitle: "In queue",
            });
          }
        }
        // If queue is empty and there's no active workflow,
        // but we have a current execution_id - the task may have been completed
        else if (
          queueStatus.queue_remaining === 0 &&
          !queueStatus.running_workflow_id &&
          !queueStatus.queue_pending.includes(this.currentExecutionId)
        ) {
          // Check history to make sure our task is complete
          const history = await this.fetchExecutionHistory(
            this.currentExecutionId
          );
          if (history) {
            callback({
              status: "completed",
              progress: 100,
              output: history,
            });

            // Mark as completed to stop polling
            this.executionCompleted.set(this.currentExecutionId, true);
          }
        }
      }
    } catch (error) {
      console.error("Error checking queue:", error);
    }
  }

  /**
   * Polls execution history
   */
  private async pollHistory() {
    try {
      if (
        !this.currentExecutionId ||
        this.executionCompleted.get(this.currentExecutionId)
      ) {
        return; // Don't poll if no active execution or if execution is completed
      }

      // Get overall history (as the original client does)
      await fetch(`${config.API_BASE_URL}/history/max_items=64`);

      // If there's an active prompt_id, also check its history separately
      /*       if (this.currentExecutionId) {
        const history = await this.fetchExecutionHistory(
          this.currentExecutionId
        );

        if (history && this.progressCallbacks.has(this.currentExecutionId)) {
          const callback = this.progressCallbacks.get(this.currentExecutionId)!;

          // If there are results, pass them through callback
          callback({
            status: "processing",
            progress: 80,
            output: history,
          });
        }
      } */
    } catch (error) {
      console.error("Error checking history:", error);
    }
  }

  /**
   * Gets current ComfyUI queue status
   */
  public async getQueueStatus(): Promise<QueueStatus> {
    try {
      const response = await fetch(`${config.API_BASE_URL}/queue`);

      if (!response.ok) {
        throw new Error(`Error getting queue status: ${response.statusText}`);
      }

      return await response.json();
    } catch (error) {
      console.error("Error getting queue status:", error);
      return {
        queue_running: false,
        queue_remaining: 0,
        queue_pending: [],
      };
    }
  }

  /**
   * Handles messages received via WebSocket
   */
  private handleWebSocketMessage(event: MessageEvent) {
    // Check if it's binary data (preview) or text data (execution status)
    if (typeof event.data === "string") {
      try {
        const message = JSON.parse(event.data);

        // Check if it's an execution status message
        if (message.type === "executing") {
          const data = message.data;
          const promptId = data.prompt_id;

          // If there's a callback for this promptId
          if (this.progressCallbacks.has(promptId)) {
            const callback = this.progressCallbacks.get(promptId)!;

            // If node === null, execution is complete
            if (data.node === null) {
              callback({
                status: "completed",
                progress: 100,
                nodeTitle: "Completed",
              });

              // Request execution history
              this.fetchExecutionHistory(promptId).then((history) => {
                if (history) {
                  callback({
                    status: "completed",
                    progress: 100,
                    output: history,
                  });
                }
              });

              // Mark as completed to stop polling
              this.executionCompleted.set(promptId, true);
            } else {
              // Execution still in progress
              callback({
                status: "processing",
                progress: data.progress || undefined,
                node: data.node,
                nodeTitle: data.node_title || undefined,
              });
            }
          }
        } else if (message.type === "execution_start") {
          // Workflow execution start
          const promptId = message.data.prompt_id;

          if (this.progressCallbacks.has(promptId)) {
            const callback = this.progressCallbacks.get(promptId)!;
            callback({
              status: "processing",
              progress: 0,
              nodeTitle: "Execution started",
            });
          }
        } else if (message.type === "execution_cached") {
          // Cached execution
          if (
            this.currentExecutionId &&
            this.progressCallbacks.has(this.currentExecutionId)
          ) {
            const callback = this.progressCallbacks.get(
              this.currentExecutionId
            )!;
            callback({
              status: "processing",
              progress: 30,
              nodeTitle: "Using cache",
            });
          }
        } else if (message.type === "executed") {
          // Node executed
          const data = message.data;

          // If there are output.images, pass them along
          if (data.output && data.output.images && this.currentExecutionId) {
            if (this.progressCallbacks.has(this.currentExecutionId)) {
              const callback = this.progressCallbacks.get(
                this.currentExecutionId
              )!;
              callback({
                status: "processing",
                progress: 90,
                node: data.node,
                nodeTitle: "Images received",
                output: {
                  images: data.output.images,
                },
              });
            }
          }
        } else if (message.type === "progress") {
          // Progress update
          const data = message.data;

          if (
            this.currentExecutionId &&
            this.progressCallbacks.has(this.currentExecutionId)
          ) {
            const callback = this.progressCallbacks.get(
              this.currentExecutionId
            )!;
            callback({
              status: "processing",
              progress: data.value,
              node: data.node,
              nodeTitle: data.title || "Processing",
            });

            // If progress is 100%, mark execution as potentially complete
            if (data.value === 100) {
              // We'll confirm completeness when we receive the "executing" message with node = null
              this.pollQueueStatus();
            }
          }
        }
      } catch (error) {
        console.error("Error processing WebSocket message:", error);
      }
    } else {
      // Binary data (usually previews), process them if needed
      console.log("Binary data received (preview)");
    }
  }

  /**
   * Sends promptData to the ComfyUI server and tracks execution progress
   */
  public async executePrompt(
    promptData: any,
    onProgress: ProgressCallback
  ): Promise<string> {
    // Check if connected to WebSocket
    if (!this.connected) {
      await this.connect();
    }

    // Create data structure for ComfyUI API
    const requestData = {
      prompt: promptData.prompt || promptData,
      client_id: this.clientId,
    };

    // Send request to API to start prompt execution
    try {
      onProgress({ status: "starting" });

      const response = await fetch(`${config.API_BASE_URL}/prompt`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(requestData),
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Error starting prompt: ${errorText}`);
      }

      const result = await response.json();
      const promptId = result.prompt_id;

      // Store current execution ID
      this.currentExecutionId = promptId;

      // Mark as not completed
      this.executionCompleted.set(promptId, false);

      // Store callback for progress tracking
      this.progressCallbacks.set(promptId, onProgress);

      return promptId;
    } catch (error) {
      console.error("Error executing prompt:", error);
      onProgress({
        status: "error",
        error: error instanceof Error ? error.message : "Unknown error",
      });
      throw error;
    }
  }

  /**
   * Gets prompt execution history by its ID
   */
  private async fetchExecutionHistory(
    promptId: string
  ): Promise<ComfyUIHistoryOutput | null> {
    try {
      const response = await fetch(
        `${config.API_BASE_URL}/history/${promptId}`
      );

      if (!response.ok) {
        throw new Error(`Error getting history: ${response.statusText}`);
      }

      const historyData = await response.json();

      // History contains data in format { promptId: { outputs: {...} } }
      return historyData[promptId]?.outputs || null;
    } catch (error) {
      console.error("Error getting execution history:", error);
      return null;
    }
  }

  /**
   * Downloads an image by its parameters
   */
  public async getImage(
    filename: string,
    subfolder: string,
    type: string
  ): Promise<Blob> {
    const params = new URLSearchParams({
      filename,
      subfolder: subfolder || "",
      type,
    });

    const response = await fetch(`${config.VIEW_URL}?${params}`);

    if (!response.ok) {
      throw new Error(`Error downloading image: ${response.statusText}`);
    }

    return await response.blob();
  }

  /**
   * Closes WebSocket connection
   */
  public disconnect(): void {
    this.stopPolling();

    if (this.ws) {
      this.ws.close();
      this.connected = false;
      this.progressCallbacks.clear();
      this.currentExecutionId = null;
      this.executionCompleted.clear();
    }
  }

  /**
   * Cancels the current execution if any
   */
  public async cancelExecution(): Promise<boolean> {
    if (!this.currentExecutionId) {
      return false;
    }

    try {
      const response = await fetch(`${config.API_BASE_URL}/queue`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          clear: true,
          delete_only: this.currentExecutionId,
        }),
      });

      if (response.ok) {
        // Mark the execution as completed to stop polling
        if (this.currentExecutionId) {
          this.executionCompleted.set(this.currentExecutionId, true);

          // Notify about cancellation
          if (this.progressCallbacks.has(this.currentExecutionId)) {
            const callback = this.progressCallbacks.get(
              this.currentExecutionId
            )!;
            callback({
              status: "error",
              error: "Execution canceled",
            });
          }
        }

        return true;
      }

      return false;
    } catch (error) {
      console.error("Error canceling execution:", error);
      return false;
    }
  }

  /**
   * Removes progress tracking callback for the specified promptId
   */
  public removeProgressCallback(promptId: string): void {
    this.progressCallbacks.delete(promptId);
    this.executionCompleted.delete(promptId);
  }

  /**
   * Generates UUID for client identification
   */
  private generateUUID(): string {
    return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(
      /[xy]/g,
      function (c) {
        const r = (Math.random() * 16) | 0;
        const v = c === "x" ? r : (r & 0x3) | 0x8;
        return v.toString(16);
      }
    );
  }
}

// Export service instance for use in the application
export const websocketService = new WebSocketService();
