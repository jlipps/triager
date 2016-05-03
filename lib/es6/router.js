import Router from 'koa-router';
import { status, issue } from './routes';

let router = new Router({prefix: '/triager'});

router.get('/status', (ctx) => {
  status(ctx);
});

router.post('/', async (ctx) => {
  await issue(ctx);
});

export { router }
