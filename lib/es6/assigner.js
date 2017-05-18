import assrt from 'assert';
import octonode from 'octonode';
import Q from 'q';
import _ from 'lodash';
import path from 'path';
import fs from 'fs';
import { getLogger } from './logger';
import { ASSIGNMENT_CACHE_FILE } from './config';
import { mapToObject, repoForIssue } from './utils';

let assignerSingleton;

class IssueAssigner {
  constructor (repoConfig:Object, cachedAssignments:Object = null):void {
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

  repoStr (repo:Object):string {
    return `${repo.user}/${repo.repo}`;
  }

  unfreezeCache (cacheData:Object):void {
    this.assignmentHistory = new Map();
    for (let repo in cacheData) {
      this.assignmentHistory.set(repo, new Map());
      for (let user in cacheData[repo]) {
        this.assignmentHistory.get(repo).set(user, cacheData[repo][user]);
      }
    }
  }

  getNextTriager (ourRepo:Object):string {
    let repoStr:string = this.repoStr(ourRepo);
    this.logger.info(`Valid triagers for ${repoStr} are: ${ourRepo.triagers.join(", ")}`,
        ourRepo.repo);
    let repoHist:Map = this.assignmentHistory.get(repoStr);
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

  getRepoForAssignment(data:Object):Object {
    let [ourRepo, theirUser, theirRepo] = repoForIssue(data, this.repos);
    this.logger.info(`${ourRepo.repo} [#${data.issue.number}] Examining issue (${data.issue.url})`);
    if (ourRepo === null) {
      this.logger.debug(`${ourRepo.repo} Got an issue for a repo we don't care about, doing nothing`);
      return null;
    }
    if (data.issue.pull_request) {
      this.logger.debug(`${ourRepo.repo} Issue is a pull request, ignoring`);
      return null;
    }
    if (data.action !== 'opened') {
      this.logger.debug(`${ourRepo.repo} [#${data.issue.number}] Issue is not new, ignoring`);
      return null;
    }
    if (data.issue.assigne === null) {
      this.logger.debug(`${ourRepo.repo} [#${data.issue.number}] Issue already has someone ` +
                       `assigned, ignoring`);
      return null;
    }
    return ourRepo;
  }

  async assignIssue(data:Object):void {
    let ourRepo:Object = this.getRepoForAssignment(data);
    if (ourRepo === null) {
      return;
    }
    await this.performAssignment(ourRepo, data.issue.number,
        data.issue.user.login);
    await this.writeAssignmentCache(ourRepo);
  }

  async performAssignment(ourRepo:Object, issueNum:number, reporter:string):void {
    let repoStr:string = this.repoStr(ourRepo);
    let randTriager:string = "";
    this.logger.info(`${ourRepo.repo} [#${issueNum}] Issue was reported by ${reporter}`);
    if (ourRepo.autoAssign && ourRepo.triagers.length) {
      if (_.contains(ourRepo.triagers, reporter)) {
        randTriager = reporter;
      } else {
        randTriager = this.getNextTriager(ourRepo);
      }
      this.logger.info(`${ourRepo.repo} [#${issueNum}] Assigning issue to ${randTriager}`);
      this.assignmentHistory.get(repoStr).get(randTriager).push(issueNum);
    }
    await this.assignOnGithub(ourRepo, issueNum, randTriager, ourRepo.autoLabels);
    if (randTriager) {
      this.logger.info(`${ourRepo.repo} [#${issueNum}] Successfully assigned ${randTriager} as the triager`);
    }
  }

  async assignOnGithub (ourRepo:Object, issueNum:number, triager:string,
      labels:Array):void {
    let repoStr:string = this.repoStr(ourRepo);
    this.logger.info(`${ourRepo.repo} [#${issueNum}] Updating issue assignment on github`);
    let client = octonode.client(process.env.TRIAGER_TOKEN);
    let issue = client.issue(repoStr, issueNum);
    let updateObj = {};
    if (triager !== "") {
      updateObj.assignee = triager;
    }
    if (labels) {
      let curIssueData = await Q.ninvoke(issue, "info");
      assrt(curIssueData.length === 2);
      let curLabels = _.pluck(curIssueData[0].labels, 'name');
      updateObj.labels = _.uniq(curLabels.concat(labels));
      this.logger.info(`${ourRepo.repo} [#${issueNum}] Setting labels: ${updateObj.labels.join(', ')}`);
    }
    let [updated, res] = await Q.ninvoke(issue, "update", updateObj);
    if (res.status !== "200 OK") {
      this.logger.error(`${ourRepo.repo} [#${issueNum}] ${res}`);
      throw new Error("Github said things didn't go well");
    }

    if (triager !== "" && updated.assignee.login !== triager) {
      this.logger.warn(`${ourRepo.repo} [#${issueNum}] Github replied OK but triager wasn't set yet`);
    }
  }

  async writeAssignmentCache (ourRepo:Object):void {
    let cacheFile:string = path.resolve(__dirname, "..", "..",
        ASSIGNMENT_CACHE_FILE);
    try {
      this.logger.info(`${ourRepo.repo} Writing assignment cache to ${cacheFile}`);
      await Q.nfcall(fs.writeFile, cacheFile, JSON.stringify(this.history));
    } catch (e) {
      this.logger.warn(`Unable to write cache (error ${e.message}), continuing`);
    }
  }

  get desc ():string {
    let desc = "Assigning issues for: ";
    let repos = [];
    for (let repo of this.repos) {
      repos.push(`${repo.user}/${repo.repo} (${repo.triagers.join(', ')})`);
    }
    desc += repos.join(", ");
    return desc;
  }

  get history ():Object {
    return mapToObject(this.assignmentHistory);
  }
}

class OldIssueAssigner extends IssueAssigner {

  async issuesWithoutMilestones (repo:Object):Array {
    let repoStr = this.repoStr(repo);
    this.logger.info(`${ourRepo.repo} Getting all open, unassigned, unmilestoned issues `
                     `from github for the repo: ${repoStr}`);
    let client = octonode.client(process.env.TRIAGER_TOKEN);
    let ghRepo = client.repo(repoStr);
    let pageSize = 100;
    let curPage = 1;
    let doneWithPages = false;
    let allIssues = [];
    while (!doneWithPages) {
      this.logger.debug(`${repo.repo} Getting page: ${curPage}`);
      let resp = await Q.ninvoke(ghRepo, 'issues', {
        milestone: 'none',
        state: 'open',
        assignee: 'none',
        page: curPage,
        per_page: pageSize
      });
      assrt(resp.length === 2);
      let statusObj = resp[1];
      if (statusObj.status !== '200 OK') {
        this.logger.error(`${ourRepo.repo} ${statusObj}`);
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

  async assignOldIssues ():void {
    this.logger.info("Assigning old issues for all configured repos");
    for (let repo of this.repos) {
      this.logger.info(`Assigning old issues for repo: ${this.repoStr(repo)}`);
      let issues = await this.issuesWithoutMilestones(repo);
      // github doesn't really obey the params so we need to double-filter
      issues = _.filter(issues, i => i.assignee === null && i.milestone === null);
      if (issues.length === 0) {
        this.logger.info("There were no issues to assign");
        continue;
      }
      this.logger.info(`Assigning ${issues.length} old issues`);
      for (let issue of issues) {
        this.logger.info(`Assigning old issue #${issue.number}`);
        await this.performAssignment(repo, issue.number);
      }
    }
  }
}

function instantiateAssigner (...args):void {
  assignerSingleton = new IssueAssigner(...args);
  getLogger().info(assignerSingleton.desc);
}

function getAssigner ():IssueAssigner {
  return assignerSingleton;
}

export { instantiateAssigner, OldIssueAssigner, IssueAssigner, getAssigner };
