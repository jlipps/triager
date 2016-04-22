import { getAssigner } from './assigner';
import { getCloser } from './closer';

function status (ctx) {
  ctx.body = getAssigner().history;
}

async function issue (ctx) {
  if (ctx.req.triager.event == 'issues') {
    let assigner = getAssigner();
    await assigner.assignIssue(ctx.req.triager.payload);
  } else if (ctx.req.triager.event == 'issue_comment') {
    let closer = getCloser();
    await closer.closeIssue(ctx.req.triager.payload);
  } else {
    ctx.throw('Not Found', 404);
  }
}

export { status, issue }
