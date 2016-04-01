import Q from 'q';
import { getLogger } from './logger';
import crypto from 'crypto';

class Handler {
  constructor(method, onErr, validate) {
    this.logger = getLogger();
    this.method = method;
    this.validate = validate;
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

  validatePayload(data, githubSignature) {
    // More info: https://developer.github.com/webhooks/securing/
    let ourSignature = 'sha1=' + crypto.createHmac('sha1', process.env.WEBHOOK_SECRET)
                                 .update(data)
                                 .digest('hex');
    return ourSignature === githubSignature;
  }

  async handle(req, res) {
    let data = "";
    req.on('data', chunk => { data += chunk; });
    await Q.ninvoke(req, 'on', 'end');
    if (this.validate && !this.validatePayload(data, req.headers['x-hub-signature'])) {
      this.logger.error("Can't validate payload!");
      return;
    }
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
