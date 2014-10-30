Triager
=======

A server that automatically assigns team members to new issues to triage

Configure
-----

Need to configure a json file with the repos you want to listen to and then
which people you want in the triage rotation, e.g.:

```json
{"repos": [
  {
    "user": "appium",
    "repo": "appium",
    "triagers": ["jlipps", "imurchie", "jonahss", "sebv", "0x1mason"],
    "labels": ["NeedsTriage"]
  },
  {
    "user": "appium",
    "repo": "appium-uiauto",
    "triagers": ["jlipps", "penguinho"],
    "labels": ["AutoAssigned"]
  }
]}
```

Then you need to configure your OAuth token, just export it in your env as
`TRIAGER_TOKEN`.

Run
-------

```
gulp && node . --port=<port> --host=<host> --config=</path/to/config>
```

(We use a bunch of ES6/7 features, so a Traceur transpilation is involved)

GitHub
-------

Now you can set up your host and port as a webhook on GitHub. It should only
receive the issue hooks.

Old Issues
-------

You can have Triager assign all currently open and un-milestoned issues too!
Just run `gulp` then:

```
TRIAGER_TOKEN=<github token> node lib/es5/retro.js --config=</path/to/config>
```

This doesn't require a server, and it should be idempotent, so this is nice if
you just want to run a cron script or a one-time retroactive assignment.
