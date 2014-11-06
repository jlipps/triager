import { IssueAssigner } from '../../lib/es5/assigner';
import { getEmptyLogger } from '../../lib/es5/logger';

class MockIssueAssigner extends IssueAssigner {
  constructor (...args) {
    this._calls = {
      'assignOnGithub': 0
    };
    super(...args);
    this.logger = getEmptyLogger();
  }

  async assignOnGithub () {
    this._calls.assignOnGithub++;
    return [{assignee: {login: 'jlipps'}}, {status: '200 OK'}];
  }
}

export { MockIssueAssigner };
