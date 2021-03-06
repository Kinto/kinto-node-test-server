# kinto-node-test-server

[![Build Status](https://travis-ci.org/Kinto/kinto-node-test-server.svg?branch=master)](https://travis-ci.org/Kinto/kinto-node-test-server)

A Node and browser API for operating a Kinto test server providing the following features:

- starting a server (optionally with supplementary configuration flags)
- stopping a server
- flushing a server
- killing a running server

**Note that a Python virtualenv must be installed in your project, and the `kinto` pip package installed within that environment.**

## Prerequisites

Node >= v10 is required.

## Installation

```
$ npm install kinto-node-test-server --save-dev
$ virtualenv .venv -p python3
$ .venv/bin/pip install kinto
```

Please make sure to create an appropriately configured [Kinto ini file](http://kinto.readthedocs.io/en/latest/configuration/settings.html).

## Node API

Sample usage using [mocha](https://opencollective.com/mochajs):

```js
import KintoServer from "kinto-node-test-server";

describe("Test Kinto server", function() {
  let server;

  before(function() {
    server = new KintoServer("http://0.0.0.0:8888/v1", {
      kintoConfigPath: __dirname + "/kinto.ini",
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
      return server.flush().then(function() {
        console.log("yay flushed");
      });
    });
  });
});
```

### CommonJS

If you're using the library in a CommonJS environment, you'll need to use the following to import the library:

```js
const KintoServer = require("kinto-node-test-server").default;
```

Note that all `KintoServer` instance methods return [Promises](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Promise).

## Browser API

The browser client follows the same API as the Node client. The browser client requires a proxy server, which you can launch with the following:

```js
import { KintoProxyServer } from "kinto-node-test-server";

const server = new KintoProxyServer();
await server.startServer();
```

You can then connect to to the proxy server and use the same Node API with the following:

```js
import KintoServer from "kinto-node-test-server";
// Note that the proxy server runs on port 8899
const server = new KintoServer("http://0.0.0.0:8899/v1");
```

## Configuration

The `KintoServer` constructor requires the base URL of your kinto server instance and accepts an options object:

- `maxAttempts`: The number of attempts retrying to connect to the server (default: `50`)
- `kintoConfigPath`: The path to your Kinto ini config file (default: `__dirname + "/kinto.ini"`)
- `pservePath`: The path to the .venv `pserve` executable (default: `"pserve"`); if the default value doesn't work, try `".venv/bin/pserve"`.

## License

Apache 2.0
