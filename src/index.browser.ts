import { KintoServerOptions, KintoTestServer } from "./types";

const DEFAULT_OPTIONS = { maxAttempts: 50 };

export default class KintoServer implements KintoTestServer {
  private url: string;
  public http_api_version: string | null;
  private options: KintoServerOptions;

  constructor(url: string, options: KintoServerOptions = {}) {
    this.url = url;
    this.http_api_version = null;
    this.options = { ...DEFAULT_OPTIONS, ...options };
  }

  private async _retryRequest(
    url: string,
    options: RequestInit & { maxAttempts?: number },
    attempt = 1
  ): Promise<Response> {
    const { maxAttempts } = this.options;
    try {
      const res = await fetch(url, options);
      if ([200, 202, 410].indexOf(res.status) === -1) {
        throw new Error("Unable to start server, HTTP " + res.status);
      }
      return res;
    } catch (err) {
      if (maxAttempts && attempt < maxAttempts) {
        return new Promise(resolve => {
          setTimeout(() => {
            resolve(this._retryRequest(url, options, attempt + 1));
          }, 100);
        });
      }
      throw new Error(`Max attempts number reached (${maxAttempts}); ${err}`);
    }
  }

  async loadConfig(pathToConfig: string): Promise<void> {
    const endpoint = `${this.url}/config`;
    await this._retryRequest(
      endpoint,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ pathToConfig }),
      },
      1
    );
  }

  async start(env: Record<string, string>): Promise<string> {
    const endpoint = `${this.url}/start`;
    await this._retryRequest(
      endpoint,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(env),
      },
      1
    );
    return this.ping();
  }

  async ping(): Promise<string> {
    const endpoint = `${this.url}/ping`;
    const res = await this._retryRequest(endpoint, {}, 1);
    const json = await res.json();
    this.http_api_version = json.http_api_version;
    return this.http_api_version!;
  }

  async flush(): Promise<{ status: number }> {
    const endpoint = `${this.url}/flush`;
    const res = await this._retryRequest(endpoint, { method: "POST" }, 1);
    return { status: res.status };
  }

  async stop(): Promise<void> {
    const endpoint = `${this.url}/stop`;
    await this._retryRequest(endpoint, { method: "POST" }, 1);
  }

  async killAll(): Promise<void> {
    const endpoint = `${this.url}/killAll`;
    await this._retryRequest(endpoint, { method: "POST" }, 1);
  }

  async logs(): Promise<string> {
    const endpoint = `${this.url}/logs`;
    const res = await this._retryRequest(endpoint, {}, 1);
    const json = await res.json();
    return json.logs;
  }
}
