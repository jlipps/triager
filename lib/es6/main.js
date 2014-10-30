// imports
require('traceur/bin/traceur-runtime');
import { configure } from './config';
import { JSONHandler } from './handler';
import { IssueAssigner } from './triage';
import { setupLogger, getLogger } from './logger.js';
var http = require('http');

// config
var config = configure();
var logger = getLogger(config);

// let's go!
var assigner = new IssueAssigner(config.repoConfig);
logger.info(assigner.desc);

var h = new JSONHandler(async function (data, res) {
  try {
    await assigner.assignIssue(data);
    res.writeHead(200, {'Content-Type': 'text/plain'});
    res.end("OK");
  } catch (e) {
    logger.error("Got error triaging issue!");
    logger.error(e);
    logger.error(e.stack);
    res.writeHead(500);
    res.end(e.message);
  }
});

var server = http.createServer(h.handle.bind(h));
server.listen(config.port, config.host, () => {
  logger.debug(`Triage server started on ${config.host}:${config.port}`);
  logger.info(`Using config file from ${config.config}`);
});
