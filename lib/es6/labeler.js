import octonode from 'octonode';
import Q from 'q';
import _ from 'lodash';
import { log } from './logger';
import { repoForIssue } from './utils';

let labelerSingleton;

class IssueLabeler {
  constructor (repoConfig:Object):void {
    this.bot = repoConfig.bot;
    this.repos = repoConfig.repos;
  }

  repoStr (repo:Object):string {
    return `${repo.user}/${repo.repo}`;
  }

  async labelIssue (data) {
    let [ourRepo, theirUser, theirRepo] = repoForIssue(data, this.repos);
    let sender = data.sender.login;
    let newLabels = this.getNewLabels(ourRepo, data);
    if (!newLabels.length) {
      log(`[#${data.issue.number}] No label request.`, ourRepo.repo, "debug");
      return;
    }
    log(`[#${data.issue.number}] @${sender} wants to label ` +
        `with: ${newLabels.join(",")}`, ourRepo.repo);
    if (_.contains(ourRepo.triagers, sender)) {
      log(`[#${data.issue.number}] Permission granted.`, ourRepo.repo);
      await this.performLabeling(ourRepo, data.issue.number, newLabels);
    } else {
      log(`[#${data.issue.number}] Permission denied.`, ourRepo.repo);
    }
  }

  getNewLabels (ourRepo:Object, data:Object):Array {
    this.labels = [];
    let exp = new RegExp(`@${this.bot} please label:{0,1}([^\.\n]*)`, 'i')
    let matches = exp.exec(data.comment.body);
    if (matches) {
      return this.prepareLabels(matches[1], ourRepo);
    }
    return [];
  }

  prepareLabels (labels:string, ourRepo:Object):Array {
    let cleanLabels = [];
    for (let label of labels.split(",")) {
      label = label.trim().toLowerCase();
      if (_.forEach(ourRepo.validLabels, function (validLabel) {
        // Ignore casing to search for a match.
        // If we find a match, use the casing from user's config.
        if (label === validLabel.toLowerCase()){
          cleanLabels.push(validLabel);
          return false;
        }
      }));
    }
    return cleanLabels;
  }

  async performLabeling (ourRepo:Object, issueNum:number, newLabels:Array):void {
    let client = octonode.client(process.env.TRIAGER_TOKEN);
    let issue = client.issue(this.repoStr(ourRepo), issueNum);
    let updateObj = {};
    updateObj.labels = newLabels;
    let [updated, res] = await Q.ninvoke(issue, "update", updateObj);
    if (res.status !== "200 OK") {
      log(`${issueNum} ${res}`, ourRepo.repo, 'error');
      throw new Error("Github said things didn't go well");
    }
    log(`[#${issueNum}] Issue labeled!`, ourRepo.repo);
  }
}

function instantiateLabeler (...args):void {
  labelerSingleton = new IssueLabeler(...args);
}

function getLabeler ():IssueLabeler {
  return labelerSingleton;
}

export { instantiateLabeler, IssueLabeler, getLabeler };
