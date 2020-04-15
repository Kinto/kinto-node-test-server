import fetch from "node-fetch";
import assert from "assert";
import KintoServerProxy from "../src/server";

describe("Kinto server proxy", () => {
  let proxy: KintoServerProxy;

  before(async () => {
    proxy = new KintoServerProxy();
    await proxy.startServer();
  });

  after(async () => {
    await proxy.stopServer();
  });

  it("sets the config path on /config", async function () {
    const defaultConfigPath =
      proxy["kintoServer"]["options"]["kintoConfigPath"];
    await fetch("http://0.0.0.0:8899/config", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ pathToConfig: "test-path" }),
    });
    assert.equal(
      proxy["kintoServer"]["options"]["kintoConfigPath"],
      "test-path"
    );

    // set config back to default for the rest of the tests
    proxy["kintoServer"]["options"]["kintoConfigPath"] = defaultConfigPath;
  });

  it("launches a Kinto server on /start", async () => {
    const res = await fetch("http://0.0.0.0:8899/start", { method: "POST" });
    const http_api_version = await res.text();
    assert.equal(typeof http_api_version, "string");
  });

  it("should flush server on /flush", async () => {
    const res = await fetch("http://0.0.0.0:8899/flush", { method: "POST" });
    const body = await res.json();
    assert.equal(body.status, 202);
  });

  it("should get logs on /logs", async () => {
    const res = await fetch("http://0.0.0.0:8899/logs");
    const body = await res.json();
    assert(body.hasOwnProperty("logs"));
    assert(typeof body.logs, "string");
  });

  it("should stop on /stop", async () => {
    await fetch("http://0.0.0.0:8899/stop", { method: "POST" });
    assert.equal(proxy["kintoServer"]["process"], null);
  });
});
