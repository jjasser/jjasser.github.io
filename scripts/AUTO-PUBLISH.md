# Local-first automatic publishing

Run `install-auto-publish.cmd` once from this folder in your normal Windows account. It registers a hidden scheduled task that checks every two minutes while you are logged in. The first run synchronizes local `main`, commits the workflow files locally, and pushes that commit to `origin/main`.

For future changes, the assistant writes `validation/auto-publish/pending.json` after preparing the files. Example:

```json
{
  "message": "Update the agent memory post",
  "paths": ["content/post/ai-security-series-part4.md"]
}
```

The worker moves the request to `running.json`, fetches the remote, stages only the listed source files, commits locally, pushes, and writes `last-result.json` with both commit IDs and remaining working changes. If a push fails, the request stays in `running.json` for a retry. `validation/` is ignored by Git.

The task also syncs incoming remote commits when there is no pending publish. It preserves other working changes; if Git cannot safely apply them, the result file reports the problem and Git retains the backup stash.

To check the background task, open Windows Task Scheduler and search for `JjasserBlogLocalPublish`. The scheduled worker needs GitHub authentication available to the same Windows account. The task runs when that account is logged in.
