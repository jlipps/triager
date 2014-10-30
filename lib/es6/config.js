import { getLogger } from './logger.js';

var minimist = require('minimist')
  , path = require('path')
  , Q = require('q')
  , fs = require('fs')
  , logger
  , assert = require('assert');

const ASSIGNMENT_CACHE_FILE = ".assignmentcache.json";

function validateConfig (config) {
  try {
    assert.ok(config.repos);
    assert(config.repos.length > 0);
    for (let repo of config.repos) {
      assert.ok(repo.user);
      assert.ok(repo.repo);
      assert.ok(repo.triagers);
      assert(repo.triagers.length > 0);
    }
    assert.ok(process.env.TRIAGER_TOKEN);
  } catch (e) {
    throw new Error("Invalid config: " + e.message);
  }
}

async function getCachedAssignments (config) {
  let cacheFile = path.resolve(__dirname, "..", "..",
      ASSIGNMENT_CACHE_FILE);
  let cacheData = null;
  let exists = true;
  try {
    await Q.nfcall(fs.stat, cacheFile)
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
};

async function configure () {
  let args = minimist(process.argv.slice(2));
  logger = getLogger(args);
  if (!args.config) {
    throw new Error("Config file is required");
  }
  args.repoConfig = require(args.config);
  validateConfig(args.repoConfig);
  args.port = args.port || 4567;
  args.host = args.host || '0.0.0.0';
  args.cachedAssignments = await getCachedAssignments(args);
  return args;
}

export { configure, ASSIGNMENT_CACHE_FILE };
