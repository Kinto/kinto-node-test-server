const fetch = require("node-fetch");
const { spawn } = require("child_process");

const DEFAULT_OPTIONS = {
  maxAttempts: 50,
  kintoConfigPath: __dirname + "/kinto.ini",
  pservePath: process.env.KINTO_PSERVE_EXECUTABLE || "pserve",
};

function copyExisting(obj, keys) {
  const ret = {};
  for (const key of keys) {
    if (obj.hasOwnProperty(key)) {
      ret[key] = obj[key];
    }
  }
  return ret;
}

class KintoServer {
  constructor(url, options = {}) {
    this.url = url;
    this.process = null;
    this.logs = [];
    this.http_api_version = null;
    this.options = Object.assign({}, DEFAULT_OPTIONS, options);
  }

  _retryRequest(url, options, attempt = 1) {
    const { maxAttempts } = this.options;
    return fetch(url, options)
      .then(res => {
        if ([200, 202, 410].indexOf(res.status) === -1) {
          throw new Error("Unable to start server, HTTP " + res.status);
        }
        return res;
      })
      .catch(err => {
        if (attempt < maxAttempts) {
          return new Promise(resolve => {
            setTimeout(() => {
              resolve(this._retryRequest(url, options, attempt + 1));
            }, 100);
          });
        }
        throw new Error(`Max attempts number reached (${maxAttempts}); ${err}`);
      });
  }

  start(env) {
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
    this.process = spawn(
      this.options.pservePath,
      [this.options.kintoConfigPath],
      { env, detached: true }
    );
    this.process.stderr.on("data", data => {
      this.logs.push(data);
    });
    this.process.on("close", code => {
      if (code && code > 0) {
        throw new Error(
          "Server errors encountered:\n" +
            this.logs.map(line => line.toString()).join("")
        );
      }
    });
    return this.ping();
  }

  ping() {
    const endpoint = `${this.url}/`;
    return this._retryRequest(endpoint, {}, 1)
      .then(res => res.json())
      .then(json => (this.http_api_version = json.http_api_version));
  }

  flush(attempt = 1) {
    const endpoint = `${this.url}/__flush__`;
    return this._retryRequest(endpoint, { method: "POST" }, 1);
  }

  stop() {
    this.process.kill();
    this.process = null;
    return new Promise(resolve => {
      setTimeout(() => resolve(), 500);
    });
  }

  killAll() {
    return new Promise(resolve => {
      if (process.platform === "win32") {
        spawn("taskkill", ["/im", "pserve.exe"]).on("close", () => resolve());
      } else {
        spawn("killall", ["pserve"]).on("close", () => resolve());
      }
    });
  }
}

module.exports = KintoServer;
