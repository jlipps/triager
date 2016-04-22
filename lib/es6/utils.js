import crypto from 'crypto';
import Q from 'q';
import { getLogger } from 'appium-logger';

let logger = getLogger();

function mapToObject (map) {
  let obj = {};
  for (let [k, v] of map) {
    if (v instanceof Map) {
      obj[k] = mapToObject(v);
    } else {
      obj[k] = v;
    }
  }
  return obj;
};

async function parsePayload (ctx) {
  let data = "";
  let parsed;
  ctx.req.on('data', chunk => { data += chunk; });
  await Q.ninvoke(ctx.req, 'on', 'end');
  try {
    return JSON.parse(data);
  } catch (err) {
    logger.info(`Couldn't parse payload.`);
  }
}

function validatePayload (ctx) {
  // More info: https://developer.github.com/webhooks/securing/    
  let data = JSON.stringify(ctx.req.triager.payload);
  let githubSignature = ctx.req.headers['x-hub-signature'];
  let ourSignature = 'sha1=' + crypto.createHmac('sha1', process.env.WEBHOOK_SECRET)
                                     .update(data)
                                     .digest('hex');
  return ourSignature === githubSignature;
}

export { mapToObject, parsePayload, validatePayload };
