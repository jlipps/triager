require('traceur/bin/traceur-runtime');
import { configure } from './config';
import { OldIssueAssigner } from './assigner';

async function main () {
  let config = await configure(false);
  let assigner = new OldIssueAssigner(config.repoConfig);
  await assigner.assignOldIssues();
}

if (require.main === module) {
  main().then(function () {}, function (err) {
    console.log(err);
    console.log(err.stack);
    process.exit(1);
  });
}
