export interface KintoServerOptions {
  maxAttempts?: number;
  pservePath?: string;
  kintoConfigPath?: string;
}

export interface KintoTestServer {
  http_api_version: string | null;
  start(env: Record<string, string>): Promise<string>;
  loadConfig(pathToConfig: string): Promise<void>;
  ping(): Promise<string>;
  flush(): Promise<{ status: number }>;
  stop(): Promise<void>;
  killAll(): Promise<void>;
  logs(): Promise<string>;
}
