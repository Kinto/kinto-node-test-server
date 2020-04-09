import assert from "assert";
import path from "path";
import sinon from "sinon";
import KintoServer from "../src";

function wait(ms: number) {
  return new Promise(resolve => {
    setTimeout(() => resolve(), ms);
  });
}

describe("Test Kinto server", function() {
  let server: KintoServer;

  before(function() {
    let kintoConfigPath = path.resolve(path.join(__dirname, "../kinto.ini"));
    if (process.env.SERVER && process.env.SERVER !== "master") {
      kintoConfigPath = `${__dirname}/kinto-${process.env.SERVER}.ini`;
    }
    server = new KintoServer("http://0.0.0.0:8888/v1", { kintoConfigPath });
  });

  after(function() {
    server.killAll();
  });

  describe("Default test server", function() {
    beforeEach(function() {
      this.timeout(5000);
      return server.start({});
    });

    afterEach(function() {
      return server.stop();
    });

    it("should ping a server", async function() {
      const r = await server.ping();
      assert.equal(typeof r, "string");
    });

    it("should flush a server", async function() {
      const r = await server.flush();
      assert.equal(r.status, 202);
    });

    it("should throw an error if already started", function() {
      assert.throws(() => {
        server.start({});
      }, /^Error: Server is already started/);
    });
  });

  describe("with invalid config", function() {
    it("should call console.error", async function() {
      const consoleErrorStub = sinon.stub(console, "error");
      const serverWithInvalidConfig = new KintoServer(
        "http://0.0.0.0:8888/v1",
        { kintoConfigPath: "config-that-doesnt-exist" }
      );

      sinon.stub(serverWithInvalidConfig, "ping").resolves("");

      await serverWithInvalidConfig.start({});

      while (consoleErrorStub.callCount === 0) {
        await wait(500);
      }

      assert(consoleErrorStub.callCount > 0);
      assert(consoleErrorStub.getCall(0).args[0] instanceof Error);
      assert.ok(
        /Server errors encountered/.test(
          consoleErrorStub.getCall(0).args[0].message
        )
      );
    });
  });

  describe("with non-existent pserve", function() {
    it("should throw an error", async function() {
      const serverWithInvalidPserve = new KintoServer(
        "http://0.0.0.0:8888/v1",
        { pservePath: "pserve-that-doesnt-exist" }
      );

      assert.rejects(
        () => serverWithInvalidPserve.start({}),
        /^Error: Unable to find or execute pserve-that-doesnt-exist.$/
      );
    });
  });
});
