import { Router } from './router';
import { getAssigner } from './assigner';
import { getCloser } from './closer';
import { JSONHandler } from './handler';

async function triager (data) {
  let assigner = getAssigner();
  await assigner.assignIssue(data);
  return 'OK';
}

async function closer (data) {
  let closer = getCloser();
  await closer.closeIssue(data);
  return 'OK';
}

async function getStatus (data, res) {
  let assigner = getAssigner();
  return [assigner.history, {type: 'application/json'}];
}

function triagerRoutes () {
  let r = new Router();
  r.route(new RegExp('^/triager/issues'), triager, null, JSONHandler);
  r.route(new RegExp('^/triager/issue_comment'), closer, null, JSONHandler);
  r.route(new RegExp('^/triager/status/?'), getStatus);
  return r;
}

export { triagerRoutes };
