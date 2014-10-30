var http = require('http')
  , Q = require('q')
  , assert = require('assert');
import { Router } from './router';

class WebServer {
  constructor (router) {
    assert(router instanceof Router);
    this.server = http.createServer(router.serverHandler.bind(router));
  }

  async listen (port, host) {
    await Q.ninvoke(this.server, 'listen', port, host);
  }
}

export { WebServer };
