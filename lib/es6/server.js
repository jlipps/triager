import http from 'http';
import Q from 'q';
import assrt from 'assert';
import { Router } from './router';

class WebServer {
  constructor (router) {
    assrt(router instanceof Router);
    this.server = http.createServer(router.serverHandler.bind(router));
  }

  async listen (port, host) {
    await Q.ninvoke(this.server, 'listen', port, host);
  }
}

export { WebServer };
