import { getLogger } from './logger.js';
var Q = require('q');

class Handler {
  constructor(method, onErr) {
    this.logger = getLogger();
    this.method = method;
    this.onErr = onErr || this.defOnErr;
  }

  convertData(data) {
    return data;
  }

  defOnErr(err, res) {
    this.logger.error("Error! " + err.message);
    this.logger.error(err.stack);
    res.writeHead(500);
    res.end("Could not parse request: " + err.message);
  }

  async handle(req, res) {
    let data = "";
    req.on('data', chunk => { data += chunk; });
    await Q.ninvoke(req, 'on', 'end');
    try {
      data = this.convertData(data);
    } catch (e) {
      return this.onErr(e, res);
    }
    return await this.method(data, res);
  }
}

class JSONHandler extends Handler {
  convertData(data) {
    return JSON.parse(data);
  }
}

export { JSONHandler, Handler };
