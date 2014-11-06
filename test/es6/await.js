import assert from 'assert';
import 'traceur/bin/traceur-runtime';
let num = 0;

async function foo () {
  num++;
}

async function run () {
  await foo();
  await foo();
  await foo();
  console.log(num);
  assert(num === 3);
}

async function run2 () {
  for (let i = 0; i < 3; i++) {
    await foo();
  }
  console.log(num);
  assert(num === 3);
}

//run().then(() => {}, (err) => { throw err; });
run2().then(() => {}, (err) => { throw err; });

