import { IssueAssigner } from '../../lib/es5/assigner';
import { getEmptyLogger } from '../../lib/es5/logger';

class MockIssueAssigner extends IssueAssigner {
  constructor (...args):void {
    this._calls = {
      'assignOnGithub': 0,
      'assignIssue': 0
    };
    super(...args);
    this.logger = getEmptyLogger();
  }

  async assignOnGithub ():void {
    this._calls.assignOnGithub++;
  }

  async assignIssue (...args):void {
    this._calls.assignIssue++;
    return await super(...args);
  }
}

export { MockIssueAssigner };
