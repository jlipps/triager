import assert from 'assert';
import octonode from 'octonode';
import Q from 'q';
import _ from 'lodash';
import path from 'path';
import fs from 'fs';
import { getLogger } from './logger';
import { ASSIGNMENT_CACHE_FILE } from './config';
import { mapToObject } from './utils';

let assignerSingleton;

class IssueAssigner {
  constructor (repoConfig, cachedAssignments) {
    this.repos = repoConfig.repos;
    this.logger = getLogger();
    if (cachedAssignments) {
      this.unfreezeCache(cachedAssignments);
    } else {
      this.assignmentHistory = new Map();
      for (let repo of this.repos) {
        let repoStr = this.repoStr(repo);
        this.assignmentHistory.set(repoStr, new Map());
        for (let triager of repo.triagers) {
          this.assignmentHistory.get(repoStr).set(triager, []);
        }
      }
    }
  }

  repoStr (repo) {
    return `${repo.user}/${repo.repo}`
  }

  unfreezeCache (cacheData) {
    this.assignmentHistory = new Map();
    for (let repo in cacheData) {
      this.assignmentHistory.set(repo, new Map());
      for (let user in cacheData[repo]) {
        this.assignmentHistory.get(repo).set(user, cacheData[repo][user]);
      }
    }
  }

  validateCoreIssue (issue) {
    assert.ok(issue.url);
    assert.ok(issue.id);
    assert.ok(issue.number);
    assert.ok(issue.user);
    assert.ok(issue.user.login);
    assert(typeof issue.assignee !== 'undefined');
  }

  validateIssueFormat (data, type) {
    assert.ok(data.action);
    assert.ok(data.issue);
    assert.ok(data.repository);
    assert.ok(data.repository.name);
    assert.ok(data.repository.owner);
    assert.ok(data.repository.owner.login);
    this.validateCoreIssue(data.issue);
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
    let repoStr = this.repoStr(ourRepo);
    this.logger.info("Valid triagers for " + repoStr + " are: " +
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

  shouldAssignIssue(data) {
    let [ourRepo, theirUser, theirRepo] = this.repoForIssue(data);
    this.logger.info("Examining issue " + theirUser + "/" + theirRepo + "#" +
        data.issue.number + " (" + data.issue.url + ")");
    if (ourRepo === null) {
      this.logger.debug("Got an issue for a repo we don't care about, doing " +
                  "nothing");
      return false;
    }
    if (data.action !== 'opened') {
      this.logger.debug("Issue is not new, ignoring");
      return false;
    }
    if (data.issue.assigne === null) {
      this.logger.debug("Issue already has someone assigned, ignoring");
      return false;
    }
    return ourRepo;
  }

  async assignIssue(data) {
    try {
      this.validateIssueFormat(data);
    } catch (e) {
      if (data.zen) {
        this.logger.warn("Got a GitHub message but it wasn't about issues. " +
                         "Doing nothing!");
        return;
      }
      throw e;
    }
    let ourRepo = this.shouldAssignIssue(data);
    if (ourRepo === false) {
      return;
    }
    await this.performAssignment(ourRepo, data.issue.number,
        data.issue.user.login);
    await this.writeAssignmentCache();
  }

  async performAssignment(ourRepo, issueNum, reporter) {
    let repoStr = this.repoStr(ourRepo);
    let randTriager;
    this.logger.info("Issue was reported by " + reporter);
    if (_.contains(ourRepo.triagers, reporter)) {
      randTriager = reporter;
    } else {
      randTriager = this.getNextTriager(ourRepo);
    }
    this.logger.info("Assigning issue to " + randTriager);
    this.assignmentHistory.get(repoStr).get(randTriager).push(issueNum);
    await this.assignOnGithub(repoStr, issueNum, randTriager, ourRepo.labels);
    this.logger.info("Successfully assigned " + randTriager + " as the triager");
  }

  async assignOnGithub (repoStr, issueNum, triager, labels) {
    this.logger.info("Updating issue assignment on github");
    let client = octonode.client(process.env.TRIAGER_TOKEN);
    let issue = client.issue(repoStr, issueNum);
    let updateObj = {assignee: triager};
    if (labels) {
      let curIssueData = await Q.ninvoke(issue, "info");
      assert(curIssueData.length === 2);
      let curLabels = _.pluck(curIssueData[0].labels, 'name');
      updateObj.labels = _.uniq(curLabels.concat(labels));
      this.logger.info("Setting labels: " + updateObj.labels.join(', '));
    }
    let [updated, res] = await Q.ninvoke(issue, "update", updateObj);
    if (res.status !== "200 OK") {
      this.logger.error(res);
      throw new Error("Github said things didn't go well");
    }

    if (updated.assignee.login !== triager) {
      this.logger.warn("Github replied OK but triager wasn't set yet");
    }
  }

  async writeAssignmentCache () {
    let cacheFile = path.resolve(__dirname, "..", "..",
        ASSIGNMENT_CACHE_FILE);
    this.logger.info("Writing assignment cache to " + cacheFile);
    await Q.nfcall(fs.writeFile, cacheFile, this.history);
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

  get history () {
    return JSON.stringify(mapToObject(this.assignmentHistory));
  }
}

class OldIssueAssigner extends IssueAssigner {

  async issuesWithoutMilestones (repo) {
    let repoStr = this.repoStr(repo);
    this.logger.info("Getting all open, unassigned, unmilestoned issues from " +
                     "github for the repo: " + repoStr);
    let client = octonode.client(process.env.TRIAGER_TOKEN);
    let ghRepo = client.repo(repoStr);
    let pageSize = 100;
    let curPage = 1;
    let doneWithPages = false;
    let allIssues = [];
    while (!doneWithPages) {
      this.logger.debug("Getting page: " + curPage);
      let resp = await Q.ninvoke(ghRepo, 'issues', {
        milestone: 'none',
        state: 'open',
        assignee: 'none',
        page: curPage,
        per_page: pageSize
      });
      assert(resp.length === 2);
      let statusObj = resp[1];
      if (statusObj.status !== '200 OK') {
        this.logger.error(statusObj);
        throw new Error("GitHub returned bad status for request");
      }
      if (resp[0].length === 0) {
        doneWithPages = true;
      } else {
        allIssues = allIssues.concat(resp[0]);
        curPage++;
      }
    }
    return allIssues;
  }


  async assignOldIssues () {
    this.logger.info("Assigning old issues for all configured repos");
    for (let repo of this.repos) {
      this.logger.info("Assigning old issues for repo: " +
                       this.repoStr(repo));
      let issues = await this.issuesWithoutMilestones(repo);
      // github doesn't really obey the params so we need to double-filter
      issues = _.filter(issues, i => i.assignee === null && i.milestone === null);
      if (issues.length === 0) {
        this.logger.info("There were no issues to examine");
        continue;
      }
      this.logger.info("Examining " + issues.length + " old issues");
      for (let issue of issues) {
        this.logger.info("Examining old issue #" + issue.number);
        this.validateCoreIssue(issue);
        await this.performAssignment(repo, issue.number);
      }
    }
  }
}

function instantiateAssigner (...args) {
  assignerSingleton = new IssueAssigner(...args);
  let logger = getLogger();
  logger.info(assignerSingleton.desc);
}

function getAssigner () {
  assert(assignerSingleton instanceof IssueAssigner);
  return assignerSingleton;
}

export { instantiateAssigner, OldIssueAssigner, IssueAssigner, getAssigner };
