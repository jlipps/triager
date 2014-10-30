import { Router } from './router.js';
import { getAssigner } from './triage.js';
import { JSONHandler } from './handler.js';

async function triager (data) {
  let assigner = getAssigner();
  await assigner.assignIssue(data);
  return 'OK';
}

async function getStatus (data, res) {
  let assigner = getAssigner();
  return [assigner.history, {type: 'application/json'}];
}

function triagerRoutes () {
  let r = new Router();
  r.route(new RegExp('^/triager/?$'), triager, null, JSONHandler);
  r.route(new RegExp('^/triager/status/?'), getStatus);
  return r;
}

export { triagerRoutes };
