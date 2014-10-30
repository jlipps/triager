// imports
require('traceur/bin/traceur-runtime');
import { configure } from './config';
import { JSONHandler } from './handler';
import { instantiateAssigner } from './triage';
import { setupLogger, getLogger } from './logger.js';
import { WebServer } from './server.js';
import { triagerRoutes } from './routes.js';
var logger;

async function main () {
  var config = await configure();
  logger = getLogger();

  // let's go!
  instantiateAssigner(config.repoConfig, config.cachedAssignments);
  let server = new WebServer(triagerRoutes());
  await server.listen(config.port, config.host);
  logger.debug(`Triage server started on ${config.host}:${config.port}`);
  logger.info(`Using config file from ${config.config}`);
};

if (require.main === module) {
  main().then(function () {}, function (err) {
    console.log(err);
    console.log(err.stack);
    process.exit(1);
  });
}
