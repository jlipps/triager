/* global describe:true, it:true */

import 'traceur/bin/traceur-runtime';
import 'mochawait';
import 'should';
import path from 'path';
import { MockIssueAssigner } from './mock_assigner';

function getIssueAssigner (fixturePath, mocks = []) {
  let c1 = getFixture(fixturePath);
  let ia = new MockIssueAssigner(c1);
  for (let mock of mocks) {
    mock(ia);
  }
  return ia;
}

function getFixture (fixturePath) {
  return require(path.resolve(__dirname, '..', 'fixtures', fixturePath));
}

function assertInitialBasicConfig (ia, config = "config1") {
  let hist = ia.assignmentHistory;
  if (config === "config1") {
    [for (x of hist.keys()) x].should.eql(["jlipps/triager"]);
    let repo = hist.get("jlipps/triager");
    [for (x of repo.keys()) x].should.eql(["jlipps"]);
    repo.get("jlipps").should.eql([]);
  } else if (config === "config2") {
    [for (x of hist.keys()) x].should.eql(["jlipps/triager"]);
    let repo = hist.get("jlipps/triager");
    [for (x of repo.keys()) x].should.eql(["jlipps", "someone", "someone2"]);
    repo.get("jlipps").should.eql([]);
  } else {
    throw new Error("Unknown config: " + config);
  }
}

describe("IssueAssigner", () => {
  describe('#constructor', () => {
    it('should register repo config', () => {
      let ia = getIssueAssigner('config1.json');
      assertInitialBasicConfig(ia);
    });
  });

  describe('#assignIssue', () => {
    it('should update history when issue is assigned', async () => {
      let ia = getIssueAssigner('config1.json');
      assertInitialBasicConfig(ia);
      ia._calls.assignOnGithub.should.equal(0);
      let issue = getFixture('issue1.json');
      await ia.assignIssue(issue);
      ia._calls.assignOnGithub.should.equal(1);
    });

    it('should assign issues opened by triager to that triager', async () => {
      let ia = getIssueAssigner('config2.json');
      assertInitialBasicConfig(ia, 'config2');
      ia._calls.assignOnGithub.should.equal(0);
      let issue = getFixture('issue1.json');
      let calls = 10;
      let i;
      // this needs to be 'var' and not 'let' or traceur crashes weirdly
      for (i = 0; i < calls; i++) {
        await ia.assignIssue(issue);
      }
      ia._calls.assignOnGithub.should.equal(calls);
      ia.assignmentHistory.get("jlipps/triager").get("jlipps").length.should.equal(calls);
    });

    it('should not assign pull requests', async () => {
      let ia = getIssueAssigner('config1.json');
      assertInitialBasicConfig(ia);
      ia._calls.assignOnGithub.should.equal(0);
      let issue = getFixture('issue2.json');
      await ia.assignIssue(issue);
      ia._calls.assignOnGithub.should.equal(0);
      ia._calls.assignIssue.should.equal(1);
      ia.assignmentHistory.get("jlipps/triager").get("jlipps").length.should.equal(0);
    });
  });
});
