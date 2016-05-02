import octonode from 'octonode';
import Q from 'q';
import _ from 'lodash';
import { getLogger } from 'appium-logger';
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

  async closeIssue (data) {
    let [ourRepo, theirUser, theirRepo] = repoForIssue(data, this.repos);
    let sender = data.sender.login;

    if (!this.shouldCloseIssue(ourRepo, data)) {
      this.logger.info("No close request. Doing nothing.");
      return;
    }
    this.logger.info(`@${sender} wants to close #${data.issue.number}`);

    if (_.contains(ourRepo.triagers, sender)) {
      this.logger.info('Permission granted.');
      await this.performClosure(this.repoStr(ourRepo), data.issue.number);
    } else {
      this.logger.info('Permission denied.');
    }
  }

  shouldCloseIssue (ourRepo:Object, data:Object):boolean {
    let needle = `@${this.bot} please close`;
    return _.contains(data.comment.body, needle);
  }

  async performClosure (repoStr:string, issueNum:number):void {
    this.logger.info("Closing issue on github");
    let client = octonode.client(process.env.TRIAGER_TOKEN);
    let issue = client.issue(repoStr, issueNum);
    let updateObj = {};
    updateObj.state = 'closed';
    let [updated, res] = await Q.ninvoke(issue, "update", updateObj);
    if (res.status !== "200 OK") {
      this.logger.error(res);
      throw new Error("Github said things didn't go well");
    }
    this.logger.info("Issue closed!");
  }
}

function instantiateCloser (...args):void {
  closerSingleton = new IssueCloser(...args);
  let logger = getLogger();
}

function getCloser ():IssueCloser {
  return closerSingleton;
}

export { instantiateCloser, IssueCloser, getCloser };
