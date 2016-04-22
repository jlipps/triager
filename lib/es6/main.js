import 'traceur/bin/traceur-runtime';
import { configure } from './config';
import { JSONHandler } from './handler';
import { instantiateAssigner } from './assigner';
import { instantiateCloser } from './closer';
import { getLogger } from 'appium-logger';
import { WebServer } from './server';
import { triagerRoutes } from './routes';

let logger;

async function main () {
  let config = await configure();
  logger = getLogger();

  instantiateAssigner(config.repoConfig, config.cachedAssignments);
  instantiateCloser(config.repoConfig);
  let server = new WebServer(triagerRoutes());
  await server.listen(config.port, config.host);
  logger.debug(`Triage server started on ${config.host}:${config.port}`);
  logger.info(`Using config file from ${config.config}`);
};

if (require.main === module) {
  main().then(() => {}, (err) => {
    console.log(err);
    console.log(err.stack);
    process.exit(1);
  });
}
