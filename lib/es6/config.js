var minimist = require('minimist')
  , assert = require('assert');

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

function configure () {
  let args = minimist(process.argv.slice(2));
  if (!args.config) {
    throw new Error("Config file is required");
  }
  args.repoConfig = require(args.config);
  validateConfig(args.repoConfig);
  args.port = args.port || 4567;
  args.host = args.host || '0.0.0.0';
  return args;
}

export { configure };
