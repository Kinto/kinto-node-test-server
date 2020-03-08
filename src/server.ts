import express from "express";
import cors from "cors";
import path from "path";
import { json } from "body-parser";
import { Server } from "http";

import KintoServer from "./index";

const jsonParser = json();

export default class KintoServerProxy {
  private kintoServer: KintoServer;
  private proxyServer?: Server;

  constructor() {
    this.kintoServer = new KintoServer("http://0.0.0.0:8888/v1", {
      kintoConfigPath: path.resolve(path.join(__dirname, "../kinto.ini")),
    });
  }

  async startServer() {
    const app = express();

    app.use(cors());

    app.post("/config", jsonParser, async (req, res) => {
      const { pathToConfig } = req.body as { pathToConfig: string };
      await this.kintoServer.loadConfig(pathToConfig);
      res.send("OK");
    });

    app.post("/start", jsonParser, async (req, res) => {
      const body = req.body as Record<string, string>;
      const http_api_version = await this.kintoServer.start(body);
      res.send(http_api_version);
    });

    app.get("/ping", async (req, res) => {
      const http_api_version = await this.kintoServer.ping();
      res.send(JSON.stringify({ http_api_version }));
    });

    app.post("/flush", async (req, res) => {
      const status = await this.kintoServer.flush();
      res.status(status.status);
      res.send(JSON.stringify(status));
    });

    app.post("/stop", async (req, res) => {
      await this.kintoServer.stop();
      res.send("OK");
    });

    app.post("/killAll", async (req, res) => {
      await this.kintoServer.killAll();
      res.send("OK");
    });

    app.get("/logs", async (req, res) => {
      const logs = await this.kintoServer.logs();
      res.send(JSON.stringify({ logs }));
    });

    this.proxyServer = app.listen(8899);
  }

  async stopServer() {
    await this.kintoServer.stop();
    await this.kintoServer.killAll();
    this.proxyServer?.close();
  }
}
