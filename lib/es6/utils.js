import crypto from 'crypto';
import Q from 'q';
import getRawBody from 'raw-body'

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
  ctx.request.body = await getRawBody(ctx.req, {
    length: ctx.req.headers['content-length'],
    limit: '1mb'
  });
  ctx.request.json = JSON.parse(ctx.request.body.toString());
}

function validatePayload (ctx) {
  // More info: https://developer.github.com/webhooks/securing/
  let githubSignature = ctx.req.headers['x-hub-signature'];
  let ourSignature = 'sha1=' + crypto.createHmac('sha1', process.env.WEBHOOK_SECRET)
                                     .update(ctx.request.body)
                                     .digest('hex');
  return ourSignature === githubSignature;
}

function repoForIssue (issue, repos) {
  let user = issue.repository.owner.login;
  let repo = issue.repository.name;
  for (let ourRepo of repos) {
    if (user === ourRepo.user && repo === ourRepo.repo) {
      return [ourRepo, user, repo];
    }
  }
  return [null, user, repo];
}

export { mapToObject, parsePayload, validatePayload, repoForIssue };
