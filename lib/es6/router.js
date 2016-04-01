import _ from 'lodash';
import assrt from 'assert';
import { Handler } from './handler';
import { getLogger } from './logger';

class Router {
  constructor () {
    this.routes = new Map();
    this.logger = getLogger();
  }

  route (url, handler, errHandler, handlerClass = Handler, validatePayload = false) {
    assrt(url instanceof RegExp);
    let wrappedHandler = new handlerClass(handler, errHandler, validatePayload);
    this.routes.set(url, wrappedHandler);
  }

  async handleRoute (handler, req, res) {
    try {
      let opts = {code: 200, type: 'text/plain'};
      let resp = await handler.handle(req, res);
      if (resp instanceof Array) {
        let newOpts = null;
        [resp, newOpts] = resp;
        _.extend(opts, newOpts);
      }
      res.writeHead(opts.code, {'Content-Type': opts.type});
      this.logger.info("OK: " + opts.code);
      this.logger.debug("Replying with: " + resp);
      res.end(resp);
    } catch (e) {
      this.logger.error("Got error handling route:");
      this.logger.error(e);
      this.logger.error(e.stack);
      res.writeHead(500);
      res.end(e.message);
    }
  }

  async serverHandler (req, res) {
    // Watch for specific events, such as: issue, issue_comment, etc
    let event = req.headers['x-github-event'] ? `/${req.headers['x-github-event']}` : '';
    this.logger.info(`Handling ${req.url}${event}`);
    for (let [url, handler, validate] of this.routes) {
      if (url.test(`${req.url}${event}`)) {
        await this.handleRoute(handler, req, res);
        return;
      }
    }
    this.logger.error(`No route to handle url: ${req.url}${event}`);
    res.writeHead(404);
    res.end('Not Found');
  }
}

export { Router };
