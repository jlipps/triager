// imports
require('traceur/bin/traceur-runtime');
import { configure } from './config';
import { JSONHandler } from './handler';
import { IssueAssigner } from './triage';
var http = require('http');

// config
var config = configure();
var assigner = new IssueAssigner(config.repoConfig);
console.log(assigner.desc);

var h = new JSONHandler(async function (data, res) {
  try {
    await assigner.assignIssue(data);
    console.log("Successfully triaged issue");
    res.writeHead(200, {'Content-Type': 'text/plain'});
    res.end("OK");
  } catch (e) {
    console.log("Got error triaging issue!");
    console.log(e);
    console.log(e.stack);
    res.writeHead(500);
    res.end(e.message);
  }
});

var server = http.createServer(h.handle.bind(h));

server.listen(config.port, config.host, () => {
  console.log(`Triage server started on ${config.host}:${config.port}`);
  console.log(`Using config file from ${config.config}`);
});
