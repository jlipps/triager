import { getAssigner } from './assigner';
import { getCloser } from './closer';
import { getOpener } from './opener';
import { getLabeler } from './labeler';

function status (ctx) {
  ctx.body = getAssigner().history;
}

async function issue (ctx) {
  if (ctx.req.triager.event == 'issues') {
    let assigner = getAssigner();
    await assigner.assignIssue(ctx.request.json);
  } else if (ctx.req.triager.event == 'issue_comment') {
    let closer = getCloser();
    await closer.closeIssue(ctx.request.json);
    let opener = getOpener();
    await opener.openIssue(ctx.request.json);
    let labeler = getLabeler();
    await labeler.labelIssue(ctx.request.json);
  } else {
    ctx.throw('Not Found', 404);
  }
}

export { status, issue }
