import { Router } from './router';
import { getAssigner } from './assigner';
import { JSONHandler } from './handler';

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
