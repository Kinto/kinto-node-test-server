const assert = require("assert");
const KintoServer = require("./");

describe("Test Kinto server", function() {
  let server;

  before(function() {
    server = new KintoServer("http://0.0.0.0:8888/v1", {
      kintoConfigPath: __dirname + "/kinto.ini"
    });
  });

  after(function() {
    server.killAll();
  });

  describe("Default test server", function() {
    beforeEach(function() {
      return server.start();
    });

    afterEach(function() {
      return server.stop();
    });

    it("should flush a server", function() {
      return server.flush()
        .then(function(r) {
          assert.equal(r.status, 202);
        });
    });
  });
});
