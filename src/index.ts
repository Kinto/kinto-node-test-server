import fetch, { RequestInit, Response } from "node-fetch";
import { spawn, execSync } from "child_process";
import path from "path";
import { KintoServerOptions, KintoTestServer } from "./types";
import KintoProxyServer from "./server";

const DEFAULT_OPTIONS = {
  maxAttempts: 50,
  kintoConfigPath: path.resolve(path.join(__dirname, "../kinto.ini")),
  pservePath: process.env.KINTO_PSERVE_EXECUTABLE || "pserve",
};

function copyExisting(obj: any, keys: string[]) {
  const ret = {};
  for (const key of keys) {
    if (obj.hasOwnProperty(key)) {
      (ret as any)[key] = obj[key];
    }
  }
  return ret;
}

function checkForPserve(pservePath: string) {
  try {
    execSync(`${pservePath} --help`, { stdio: "ignore" });
  } catch (err) {
    throw new Error(
      pservePath === "pserve"
        ? "Unable to find pserve in PATH. Have you installed kinto or activated your virtualenv?"
        : `Unable to find or execute ${pservePath}.`
    );
  }
}

export default class KintoServer implements KintoTestServer {
  private url: string;
  private process: ReturnType<typeof spawn> | null;
  private _logs: Buffer[];
  public http_api_version: string | null;
  private options: KintoServerOptions;

  constructor(url: string, options: KintoServerOptions = {}) {
    this.url = url;
    this.process = null;
    this._logs = [];
    this.http_api_version = null;
    this.options = Object.assign({}, DEFAULT_OPTIONS, options);
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
        return new Promise((resolve) => {
          setTimeout(() => {
            resolve(this._retryRequest(url, options, attempt + 1));
          }, 100);
        });
      }
      throw new Error(`Max attempts number reached (${maxAttempts}); ${err}`);
    }
  }

  async loadConfig(pathToConfig: string): Promise<void> {
    this.options.kintoConfigPath = pathToConfig;
  }

  start(env: Record<string, string>): Promise<string> {
    if (this.process) {
      throw new Error("Server is already started.");
    }
    // Keeping parent's environment is needed so that pserve's executable
    // can be found (with PATH) if KINTO_PSERVE_EXECUTABLE env variable was
    // not provided.
    // However, Kinto's config parsing logic tries to interpolate any
    // %-code in any environment variable, so rather than polluting
    // the environment with everything, just copy the variables we
    // think will be necessary.
    const sanitizedEnv = copyExisting(process.env, [
      "PATH",
      "VIRTUAL_ENV",
      "PYTHONPATH",
    ]);
    // Add the provided environment variables to the child process environment.
    env = Object.assign({}, sanitizedEnv, env);
    checkForPserve(this.options.pservePath!);
    this.process = spawn(
      this.options.pservePath!,
      [this.options.kintoConfigPath!],
      { env, detached: true }
    );
    this.process.stderr!.on("data", (data: Buffer) => {
      this._logs.push(data);
    });
    this.process.on("close", (code) => {
      if (code && code > 0) {
        console.error(
          new Error(
            "Server errors encountered:\n" +
              this._logs.map((line) => line.toString()).join("")
          )
        );
        console.error(new Error().stack);
      }
    });

    return this.ping();
  }

  async ping(): Promise<string> {
    const endpoint = `${this.url}/`;
    const res = await this._retryRequest(endpoint, {}, 1);
    const json = await res.json();
    this.http_api_version = json.http_api_version;
    return this.http_api_version!;
  }

  async flush(): Promise<{ status: number }> {
    const endpoint = `${this.url}/__flush__`;
    const res = await this._retryRequest(endpoint, { method: "POST" }, 1);
    return { status: res.status };
  }

  stop(): Promise<void> {
    if (this.process) this.process.kill();
    this.process = null;
    return new Promise((resolve) => {
      setTimeout(() => resolve(), 500);
    });
  }

  killAll(): Promise<void> {
    return new Promise((resolve) => {
      if (process.platform === "win32") {
        spawn("taskkill", ["/im", "pserve.exe"]).on("close", () => resolve());
      } else {
        spawn("killall", ["pserve"]).on("close", () => resolve());
      }
    });
  }

  logs(): Promise<string> {
    return Promise.resolve(this._logs.map((line) => line.toString()).join(""));
  }
}

export { KintoProxyServer };
