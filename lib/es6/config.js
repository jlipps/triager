import minimist from 'minimist';
import path from 'path';
import Q from 'q';
import fs from 'fs';
import assrt from 'assert';
import { getLogger } from './logger';
import request from 'request-promise';

let logger;

const ASSIGNMENT_CACHE_FILE = ".assignmentcache.json";

function validateConfig (config) {
  try {
    assrt.ok(config.repos, `config.repos was not valid in ${config}`);
    assrt(config.repos.length > 0);
    for (let repo of config.repos) {
      assrt.ok(repo.user, `repo.user was not set for ${repo}`);
      assrt.ok(repo.repo, `repo.repo was not set for ${repo}`);
      assrt.ok(repo.triagers, `repo.triagers was not set for ${repo}`);
      assrt(repo.triagers.length >= 0, `must have at least one triager for ${repo}`);
      if (repo.autoLabels) {
        assrt(repo.autoLabels instanceof Array, `repo.autoLabels must be an array for ${repo}`);
      }
      if (repo.validLabels) {
        assrt(repo.validLabels instanceof Array, `repo.validLabels must be an array for ${repo}`);
      }
    }
    assrt.ok(process.env.TRIAGER_TOKEN, 'TRIAGER_TOKEN must be set in the environment');
  } catch (e) {
    console.log(e.stack);
    throw new Error("Invalid config: " + e.message);
  }
}

async function getCachedAssignments (config) {
  let cacheFile = path.resolve(__dirname, "..", "..",
      ASSIGNMENT_CACHE_FILE);
  let cacheData = null;
  let exists = true;
  try {
    await Q.nfcall(fs.stat, cacheFile);
  } catch (e) {
    exists = false;
  }
  if (exists) {
    if (config.nocache) {
      logger.info("Assignment cache exists, but ignoring it");
    } else {
      logger.info("Assignment cache exists, loading it");
      cacheData = await Q.nfcall(fs.readFile, cacheFile);
      logger.debug("Cached assignments: " + cacheData.toString('utf8'));
      cacheData = JSON.parse(cacheData.toString('utf8'));
    }
  } else {
    logger.info("No assignment cache present");
  }
  return cacheData;
}

async function configure (loadCachedAssignments = true) {
  let args = minimist(process.argv.slice(2));
  logger = getLogger();
  if (!args.config) {
    throw new Error("Config file is required");
  }
  if (/^http/.test(args.config)) {
    args.repoConfig = JSON.parse(await request(args.config));
  } else {
    args.repoConfig = require(args.config);
  }
  validateConfig(args.repoConfig);
  args.port = args.port || 4567;
  args.host = args.host || '0.0.0.0';
  if (loadCachedAssignments) {
    args.cachedAssignments = await getCachedAssignments(args);
  }
  return args;
}

export { configure, ASSIGNMENT_CACHE_FILE };
