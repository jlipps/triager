import octonode from 'octonode';
import Q from 'q';
import _ from 'lodash';
import { getLogger } from './logger';
import { repoForIssue } from './utils';

let closerSingleton;

class IssueCloser {
  constructor (repoConfig:Object):void {
    this.bot = repoConfig.bot;
    this.repos = repoConfig.repos;
    this.logger = getLogger();
  }

  repoStr (repo:Object):string {
    return `${repo.user}/${repo.repo}`;
  }

  async closeIssue (data:Object):void {
    let [ourRepo, theirUser, theirRepo] = repoForIssue(data, this.repos);
    let sender = data.sender.login;

    if (!this.shouldCloseIssue(ourRepo, data)) {
      this.logger.info(`${ourRepo.repo} [#${data.issue.number}] No close request.`);
      return;
    }
    this.logger.info(`${ourRepo.repo} [#${data.issue.number}] @${sender} wants to close issue.`);

    if (_.contains(ourRepo.triagers, sender)) {
      this.logger.info(`${ourRepo.repo} [#${data.issue.number}] Permission granted.`);
      await this.performClosure(ourRepo, data.issue.number);
    } else {
      this.logger.info(`${ourRepo.repo} [#${data.issue.number}] Permission denied.`);
    }
  }

  shouldCloseIssue (ourRepo:Object, data:Object):boolean {
    let needle = `@${this.bot} please close`;
    return _.contains(data.comment.body, needle);
  }

  async performClosure (ourRepo:Object, issueNum:number):void {
    let client = octonode.client(process.env.TRIAGER_TOKEN);
    let issue = client.issue(this.repoStr(ourRepo), issueNum);
    let updateObj = {};
    updateObj.state = 'closed';
    let [updated, res] = await Q.ninvoke(issue, "update", updateObj);
    if (res.status !== "200 OK") {
      this.logger.error(`${ourRepo.repo} [#${issueNum}] ${res}`);
      throw new Error("Github said things didn't go well");
    }
    this.logger.info(`${ourRepo.repo} [#${issueNum}] Issue closed!`);
  }
}

function instantiateCloser (...args):void {
  closerSingleton = new IssueCloser(...args);
}

function getCloser ():IssueCloser {
  return closerSingleton;
}

export { instantiateCloser, IssueCloser, getCloser };
