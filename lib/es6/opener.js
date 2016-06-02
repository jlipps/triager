import octonode from 'octonode';
import Q from 'q';
import _ from 'lodash';
import { getLogger } from './logger';
import { repoForIssue } from './utils';

let openerSingleton;

class IssueOpener {
  constructor (repoConfig:Object):void {
    this.bot = repoConfig.bot;
    this.repos = repoConfig.repos;
    this.logger = getLogger();
  }

  repoStr (repo:Object):string {
    return `${repo.user}/${repo.repo}`;
  }

  async openIssue (data:Object):void {
    let [ourRepo, theirUser, theirRepo] = repoForIssue(data, this.repos);
    let sender = data.sender.login;

    if (!this.shouldOpenIssue(ourRepo, data)) return;
    
    this.logger.info(`${ourRepo.repo} [#${data.issue.number}] @${sender} wants to reopen issue.`);

    if (_.contains(ourRepo.triagers, sender)) {
      this.logger.info(`${ourRepo.repo} [#${data.issue.number}] Permission granted.`);
      await this.performOpening(ourRepo, data.issue.number);
    } else {
      this.logger.info(`${ourRepo.repo} [#${data.issue.number}] Permission denied.`);
    }
  }

  shouldOpenIssue (ourRepo:Object, data:Object):boolean {
    let needle = `@${this.bot} please open`;
    return _.contains(data.comment.body, needle);
  }

  async performOpening (ourRepo:Object, issueNum:number):void {
    let client = octonode.client(process.env.TRIAGER_TOKEN);
    let issue = client.issue(this.repoStr(ourRepo), issueNum);
    let updateObj = {};
    updateObj.state = 'open';
    let [updated, res] = await Q.ninvoke(issue, "update", updateObj);
    if (res.status !== "200 OK") {
      this.logger.error(`${ourRepo.repo} [#${issueNum}] ${res}`);
      throw new Error("Github said things didn't go well");
    }
    this.logger.info(`${ourRepo.repo} [#${issueNum}] Issue closed!`);
  }
}

function instantiateOpener (...args):void {
  openerSingleton = new IssueOpener(...args);
}

function getOpener ():IssueOpener {
  return openerSingleton;
}

export { instantiateOpener, IssueOpener, getOpener };
