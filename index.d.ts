export interface KintoServerOptions {
  maxAttempts?: number;
  pservePath?: string;
  kintoConfigPath?: string;
}

declare class KintoServer {
  private url;
  private process;
  logs: Buffer[];
  http_api_version: string | null;
  private options;
  constructor(url: string, options?: KintoServerOptions);
  private _retryRequest;
  start(env: Record<string, string>): Promise<void>;
  ping(): Promise<void>;
  flush(): Promise<void>;
  stop(): Promise<void>;
  killAll(): Promise<void>;
}

export default KintoServer;
