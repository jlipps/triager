import octonode from 'octonode';
import Q from 'q';
import _ from 'lodash';
import { getLogger } from 'appium-logger';
import { repoForIssue } from './utils';

let labelerSingleton;

class IssueLabeler {
  constructor (repoConfig:Object):void {
    this.bot = repoConfig.bot;
    this.repos = repoConfig.repos;
    this.logger = getLogger();
  }

  repoStr (repo:Object):string {
    return `${repo.user}/${repo.repo}`;
  }

  async labelIssue (data) {
    let [ourRepo, theirUser, theirRepo] = repoForIssue(data, this.repos);
    let sender = data.sender.login;
    this.labels = [];

    if (!this.shouldLabelIssue(ourRepo, data)) {
      this.logger.info("No label request. Doing nothing.");
      return;
    }
    this.logger.info(`@${sender} wants to label #${data.issue.url}`);

    if (this.canLabelIssue(ourRepo, sender)) {
      this.logger.info('Permission granted.');
      await this.performLabeling(this.repoStr(ourRepo), data.issue.number);
    } else {
      this.logger.info('Permission denied.');
    }
  }

  shouldLabelIssue (ourRepo:Object, data:Object):boolean {
    let needle = `@${this.bot} please label`;
    this.labels = [];
    let matches = /@scottdixon please label:{0,1}(.*)./gi.exec(data.comment.body);
    if (matches){
      this.logger.info(`Labeling: ${matches[1]}`)
      this.labels = matches[1].split(",");
      return true;
    }
    return false;
  }

  canLabelIssue (ourRepo:Object, sender:string):boolean {
    return _.contains(ourRepo.triagers, sender);
  }

  async performLabeling (repoStr:string, issueNum:number):void {
    this.logger.info("Labeling issue on github");
    let client = octonode.client(process.env.TRIAGER_TOKEN);
    let issue = client.issue(repoStr, issueNum);
    let updateObj = {};
    updateObj.labels = this.labels;
    let [updated, res] = await Q.ninvoke(issue, "update", updateObj);
    if (res.status !== "200 OK") {
      this.logger.error(res);
      throw new Error("Github said things didn't go well");
    }
    this.logger.info("Issue labeled!");
  }
}

function instantiateLabeler (...args):void {
  labelerSingleton = new IssueLabeler(...args);
  let logger = getLogger();
}

function getLabeler ():IssueLabeler {
  return labelerSingleton;
}

export { instantiateLabeler, IssueLabeler, getLabeler };