var assert = require('assert')
  , octonode = require('octonode')
  , Q = require('q')
  , _ = require('lodash');

class IssueAssigner {
  constructor (repoConfig) {
    this.repos = repoConfig.repos;
    this.assignmentHistory = new Map();
    for (let repo of this.repos) {
      let repoStr = `${repo.user}/${repo.repo}`;
      this.assignmentHistory.set(repoStr, new Map());
      for (let triager of repo.triagers) {
        this.assignmentHistory.get(repoStr).set(triager, []);
      }
    }
  }

  validateIssueFormat (data) {
    assert.ok(data.action);
    assert.ok(data.issue);
    assert.ok(data.issue.url);
    assert.ok(data.issue.id);
    assert.ok(data.issue.number);
    assert(typeof data.issue.assignee !== 'undefined');
    assert.ok(data.repository);
    assert.ok(data.repository.name);
    assert.ok(data.repository.owner);
    assert.ok(data.repository.owner.login);
  }

  repoForIssue (issue) {
    let user = issue.repository.owner.login;
    let repo = issue.repository.name;
    for (let ourRepo of this.repos) {
      if (user === ourRepo.user && repo === ourRepo.repo) {
        return [ourRepo, user, repo];
      }
    }
    return [null, user, repo];
  }

  getNextTriager (ourRepo) {
    let repoStr = `${ourRepo.user}/${ourRepo.repo}`;
    console.log("Valid triagers for " + repoStr + " are: " +
                ourRepo.triagers.join(", "));
    let repoHist = this.assignmentHistory.get(repoStr);
    let histCounts = [];
    for (let hist of repoHist.values()) {
      histCounts.push(hist.length);
    }
    let minHistory = _.min(histCounts);
    let leastTriagers = [];
    for (let [triager, hist] of repoHist.entries()) {
      if (hist.length === minHistory) {
        leastTriagers.push(triager);
      }
    }
    return leastTriagers[_.random(leastTriagers.length - 1)];
  }

  async assignIssue(data) {
    this.validateIssueFormat(data);
    let [ourRepo, theirUser, theirRepo] = this.repoForIssue(data);
    console.log("Examining issue " + theirUser + "/" + theirRepo + "#" +
        data.issue.number + " (" + data.issue.url + ")");
    if (ourRepo === null) {
      console.log("Got an issue for a repo we don't care about, doing " +
                  "nothing");
      return;
    }
    if (data.action !== 'opened') {
      console.log("Issue is not new, ignoring");
      return;
    }
    if (data.issue.assigne === null) {
      console.log("Issue already has someone assigned, ignoring");
      return;
    }
    let repoStr = `${ourRepo.user}/${ourRepo.repo}`;
    let randTriager = this.getNextTriager(ourRepo);
    console.log("Assigning issue to " + randTriager);
    this.assignmentHistory.get(repoStr).get(randTriager).push(data.issue.number);
    await this.assignOnGithub(repoStr, data.issue.number, randTriager);
  }

  async assignOnGithub (repoStr, issueNum, triager) {
    console.log("Updating issue assignment on github");
    let client = octonode.client(process.env.TRIAGER_TOKEN);
    let issue = client.issue(repoStr, issueNum);
    let [updated, res] = await Q.ninvoke(issue, "update", {assignee: triager});
    if (res.status !== "200 OK") {
      console.log(res);
      throw new Error("Github said things didn't go well");
    }

    if (updated.assignee.login !== triager) {
      throw new Error("Github replied OK but triager wasn't set correctly");
    }
  }

  get desc () {
    let desc = "Assigning issues for: ";
    let repos = [];
    for (let repo of this.repos) {
      repos.push(`${repo.user}/${repo.repo} (${repo.triagers.join(', ')})`);
    }
    desc += repos.join(", ");
    return desc;
  }
}

export { IssueAssigner };
