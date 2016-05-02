import octonode from 'octonode';
import Q from 'q';

  // cleanLabels (dirtyLabels) {
  //   // Convert to array & remove white spaces
  //   var cleanLabels = [];
  //   dirtyLabels.split(',');
  //   _.each(dirtyLabels, function (label) {
  //     cleanLabels.push(label.trim())
  //   });
  // }

class Issue {

  async constructor () {
    // let client = octonode.client(process.env.TRIAGER_TOKEN);
    // this.issue = await client.issue('wkwebview', 53);
    // console.log(this.issue);
    // this.issue = await Q.ninvoke(issue, "info");
    this.client = octonode.client(process.env.TRIAGER_TOKEN);
    // console.log('getting')
  }

  async get(issueNumber){
    let issue = await this.client.issue('scottdixon/wkwebview', 53);
    this.issue = await Q.ninvoke(issue, "info");
  }

  assign (assignee) {
    this.issue.assignee = assignee;
  }

  addLabels (labels) {
    // this.issue.labels = _.unique(this.issue.labels.concat(this.cleanLabels(labels)));
  }

  removeLabels (labels) {
    // this.issue.labels = _.without(this.issue.labels, labels);
  }

  async save () {
    let updateObj = { assignee: 'scottdixon' }
    await Q.ninvoke(issue, "update", updateObj);
  }

}

export { Issue }
