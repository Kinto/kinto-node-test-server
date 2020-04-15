import assert from "assert";
import KintoServerProxy from "../src/server";
import KintoServer from "../src/index.browser";

describe("Kinto server in the browser", () => {
  let proxy: KintoServerProxy;
  let server: KintoServer;

  before(async () => {
    proxy = new KintoServerProxy();
    await proxy.startServer();
    server = new KintoServer("http://0.0.0.0:8899");
  });

  after(async () => {
    await proxy.stopServer();
  });

  it("sets the config path on /config", async function () {
    const defaultConfigPath =
      proxy["kintoServer"]["options"]["kintoConfigPath"];
    await server.loadConfig("test-path");
    assert.equal(
      proxy["kintoServer"]["options"]["kintoConfigPath"],
      "test-path"
    );

    // set config back to default for the rest of the tests
    proxy["kintoServer"]["options"]["kintoConfigPath"] = defaultConfigPath;
  });

  it("launches a Kinto server on /start", async function () {
    this.timeout(5000);
    const http_api_version = await server.start({});
    assert.equal(typeof http_api_version, "string");
  });

  it("should flush server on /flush", async () => {
    const body = await server.flush();
    assert.equal(body.status, 202);
  });

  it("should get logs on /logs", async () => {
    const body = await server.logs();
    assert(typeof body, "string");
  });

  it("should stop on /stop", async () => {
    await server.stop();
    assert.equal(proxy["kintoServer"]["process"], null);
  });

  it("should kill all on /killAll", async () => {
    await server.killAll();
  });
});
