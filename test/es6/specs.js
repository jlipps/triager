/* global describe:true, it:true */

import 'traceur/bin/traceur-runtime';
import 'mochawait';
import { IssueAssigner, OldIssueAssigner } from '../../lib/es5/assigner.js';
import 'should';
import path from 'path';

function getIssueAssigner (fixturePath, mocks = []) {
  let c1 = getFixture(fixturePath);
  let ia = new IssueAssigner(c1);
  for (let mock of mocks) {
    mock(ia);
  }
  return ia;
}

function getFixture (fixturePath) {
  return require(path.resolve(__dirname, '..', 'fixtures', fixturePath));
}

function assertInitialBasicConfig (ia) {
  let hist = ia.assignmentHistory;
  [for (x of hist.keys()) x].should.eql(["jlipps/triager"]);
  let repo = hist.get("jlipps/triager");
  [for (x of repo.keys()) x].should.eql(["jlipps"]);
  repo.get("jlipps").should.eql([]);
}

function mockSuccessfulGithubAssign (ia) {
  ia._assignCalls = 0;
  ia.assignOnGithub = async function (repoStr, issueNum, triager, labels) {
    ia._assignCalls++;
    return [{assignee: {login: 'jlipps'}}, {status: '200 OK'}];
  }.bind(ia);
};

describe("IssueAssigner", () => {
  describe('#constructor', () => {
    it('should register repo config', () => {
      let ia = getIssueAssigner('config1.json');
      assertInitialBasicConfig(ia);
    });
  });

  describe('#assignIssue', () => {
    it('should update history when issue is assigned', async function () {
      let ia = getIssueAssigner('config1.json', [
        mockSuccessfulGithubAssign]);
      assertInitialBasicConfig(ia);
      ia._assignCalls.should.equal(0);
      let issue = getFixture('issue1.json');
      await ia.assignIssue(issue);
      ia._assignCalls.should.equal(1);
    });
  });
});
