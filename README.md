triager
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
    "triagers": ["jlipps", "imurchie", "jonahss", "sebv", "0x1mason"]
  },
  {
    "user": "appium",
    "repo": "appium-uiauto",
    "triagers": ["jlipps", "penguinho"]
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
