import { getLogger } from './logger';
import { router } from './router';
import { validatePayload, parsePayload } from './utils';
import Koa from 'koa'

let app = new Koa();
let logger = getLogger();

// Log requests
app.use(async (ctx, next) => {
  logger.info(`Handling ${ctx.url}`);
  try {
    await next();
    ctx.body = 'OK';
  } catch (err) {
    ctx.status = err.status || 500;
    ctx.body = err.message;
  }
  logger.info(`Responding with ${ctx.response.status}`);
});

// Keep track of the GitHub event & PayLoad
app.use(async (ctx, next) => {
  let event = ctx.req.headers['x-github-event'] ? `${ctx.req.headers['x-github-event']}` : '';
  ctx.req.triager = { event: event };
  if (ctx.req.triager.event) {
    logger.info(`Handling event: ${ctx.req.triager.event}`);
    await parsePayload(ctx);
  }
  await next();
})

// Validate payload if it's a GitHub event
app.use(async (ctx, next) => {
  if (ctx.req.triager.event && !validatePayload(ctx)) {
    logger.error(`Couldn't validate payload`);
    ctx.throw('Unauthorized', 401);
  }
  logger.info('Validated payload');
  await next();
})

app.use(router.routes());

export { app }
