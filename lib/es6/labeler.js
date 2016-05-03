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
    this.validLabels = ourRepo.validLabels;
    if (!this.shouldLabelIssue(ourRepo, data)) {
      this.logger.info("No label request.");
      return;
    }
    this.logger.info(`@${sender} wants to label #${data.issue.number}`);

    if (_.contains(ourRepo.triagers, sender)) {
      this.logger.info('Permission granted.');
      await this.performLabeling(this.repoStr(ourRepo), data.issue.number);
    } else {
      this.logger.info('Permission denied.');
    }
  }

  shouldLabelIssue (ourRepo:Object, data:Object):boolean {
    this.labels = [];
    let exp = new RegExp(`@${this.bot} please label:{0,1}([^\.\n]*)`, 'i')
    let matches = exp.exec(data.comment.body);
    if (matches) {
      this.logger.info(`Requested labels: ${matches[1]}`)
      this.prepareLabels(matches[1]);
      return true;
    }
    return false;
  }

  prepareLabels (labels) {
    let cleanLabels = [];
    for (let label of labels.split(",")) {
      label = label.trim().toLowerCase();
      if (_.forEach(this.validLabels, function (validLabel) {
        // Ignore casing to search for a match.
        // If we find a match, use the casing from user's config.
        if (label === validLabel.toLowerCase()){
          cleanLabels.push(validLabel);
          return false;
        }
      }));
    }
    this.labels = cleanLabels;
  }

  async performLabeling (repoStr:string, issueNum:number):void {
    this.logger.info(`Labeling issue #${issueNum} with: ${this.labels}`);
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
