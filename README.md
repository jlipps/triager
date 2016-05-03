Triager
=======

A server that automatically assigns team members to new issues for them to
address or triage.  Currently, it works with GitHub. It should work regardless
of whether a repo or set of repos is private or public. This project is
currently running for [Appium](https://appium.io) as a way to make sure bug
reports don't slip through the cracks. It's also a sort of Node + ES6/ES7
playground! (See [below](#JS++++))

How it works
------

There are two components to Triager that can be used independently:

1. A Node.js webserver that you can run on your own infrastructure. This can
   then be set up to receive GitHub webhook notifications whenever an issue is
   updated or modified. The server will respond to those notifications by
   automatically assigning a project triager.
2. A Node.js script that you can run on-demand. It does the same thing the
   server does, only it will look at every open issue that's not assigned and
   not in a milestone, and assign it.

The algorithm that Triager uses to assign team members is very simple: it keeps
an in-memory understanding of how many issues each team member has been
assigned and assigns new issues to the one with the fewest assigned issues.
This is also stored as a cache on disk so if the server is restarted it will
pick up where it left off.

Requirements
-----

You need basically two things to make all this work, in addition to setting up
a place to host the server itself:

1. You need to configure a json file with the repos you want to listen to,
   which people you want in the triage rotation and whether triagers should
   be assigned issues automatically, e.g.:

   ```json
   {"repos": [
     {
       "user": "appium",
       "repo": "appium",
       "triagers": ["jlipps", "imurchie", "jonahss", "sebv", "0x1mason"],
       "autoAssign": true,
       "autoLabel": ["AutoAssigned"],
       "validLabels": ["some", "allowed", "labels"]
     },
     {
       "user": "appium",
       "repo": "appium-uiauto",
       "triagers": ["jlipps", "penguinho"],
       "autoAssign": true,
       "autoLabel": ["AutoAssigned"],
       "validLabels": ["some", "allowed", "labels"]
     }
   ],
   "bot": "triager-bot"
   }
   ```

   (Note you can also use labels if you want to designate issues which have been
   assigned with Triager).
2. Then you need to configure a GitHub access token that has write access to
   the repos you want to triage. You can make these with your own user account,
   or you can create a separate GitHub account just to use as a bot in this
   way. Either way, once you've got the token (see instructions for generating
   it [here](https://github.com/blog/1509-personal-api-tokens)), just export it
   in your env as `TRIAGER_TOKEN`. It's much safer for it to be an env variable
   than in your code somewhere.
3. Give your webhook a secret and export it in your env as `WEBHOOK_SECRET`.

Run the server
-------

With all this in place, it's super simple to install and run the server:

```
npm install -g triager
triager --port=<port> --host=<host> --config=</path/to/config>
```

If you want to run from source, it's also easy:

```
npm install -g gulp  # if you don't already have gulp globally
git clone https://github.com/jlipps/triager.git
cd triager
npm install
gulp
node . --port=<port> --host=<host> --config=</path/to/config>
```

The `gulp` command merely does the Traceur transpilation required to get
everything into plain old ES5 JavaScript.

The server exposes two HTTP endpoints:

```
/triager         # endpoint for the GitHub webhook
/triager/status  # get some JSON info about the server's assignment history
```

Set up GitHub webhooks
-------

Now you can set up your webhook on GitHub, under settings for your repo(s).
Make sure to only send information about issues---no need to listen for
anything else. So if our server is running at `http://somplace.com:4567`, then we will want to add the GitHub webhook url of:

```
http://sompleace.com:4567/triager
```

At this point you should be good to go!

Retroactively assigning old Issues
-------

You can also have Triager assign all currently open and un-milestoned issues!
Just run `gulp` (as always), then:

```
TRIAGER_TOKEN=<github token> retro_triager --config=</path/to/config>
```

This doesn't require a server, and it should be idempotent, so this is nice if
you just want to run a cron script or a one-time retroactive assignment.

JS++++
------
I wanted to explore some of the upcoming JS language features, so I went wild
with it. That's the reason we use
[Traceur](https://github.com/google/traceur-compiler) to transpile back to ES5
for running on vanilla Node systems. It goes without saying I'm probably doing
some things wrong and went overboard trying to use as many features as possible
in sometimes inconsistent ways, but this was a lot of fun. I also couldn't
resist making my own mini webserver + routing, which I probably didn't need to
do. Anyway, Some fun ES6/ES7 features you'll see in the codebase:

* `import`/`export`
* `const`/`let` in addition to `var`
* `async`/`await`
* destructured assignment
* JS classes
* rest args and spreads
* inline string templates

Get excited for the future of JS!
