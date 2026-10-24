# Issue workflow

Every issue moves through these statuses:

```
Open → In Progress → RFT → In Testing → UAT Tested → Closed
                ▲                 │
                └── QA fail ──────┘   (also: UAT reject, dev pulls back from RFT)
```

| Status | Meaning | Who moves it here |
|---|---|---|
| **Open** | Issue created with requirements and acceptance criteria | Automatic on creation |
| **In Progress** | Developer is working on it | Assigning a developer, opening a PR (`Refs #N`), or `/start` |
| **RFT** | Ready for testing, handed to QA | Developer: `/rft @qa-user` (needs a linked PR) |
| **In Testing** | QA is testing | QA: `/qa start` |
| **UAT Tested** | QA passed and UAT approved | UAT approver: `/uat approve` (only after `/qa pass`) |
| **Closed** | Deployed to production and verified | Only the **Deploy to production** workflow |

The `status: …` label is the source of truth. A GitHub Project's **Status** field mirrors it (see setup).

## Commands

Comment these on the issue. The first line of the comment is the command; anything after it, including more lines, is saved as notes.

| Command | Who | Effect |
|---|---|---|
| `/start` | Developer | → In Progress, assigns you |
| `/rft @qa-user` | Developer | → RFT, assigns QA. Rejected if no PR references the issue |
| `/qa start` | QA | → In Testing |
| `/qa pass <notes>` | QA | Records the pass (`qa: passed`). Stays In Testing until UAT approves |
| `/qa fail <reason>` | QA | Records the failure (`qa: failed`) and returns the issue to **In Progress**. A reason is required |
| `/uat approve <notes>` | UAT approver | → UAT Tested. Rejected unless QA passed |
| `/uat reject <reason>` | UAT approver | Returns the issue to **In Progress** |
| `/status` or `/help` | Anyone | Shows the current status and these commands |

The workflow reacts 👍 to accepted commands and replies explaining any rejected one. Every QA and UAT result is posted as a comment, so the issue keeps a full test history.

## Rules it enforces

- **A failed issue can't reach UAT.** `/qa fail` sends it back to In Progress. `/uat approve` needs a `qa: passed` label, and `qa: passed` is cleared on every new `/rft`, so each round of fixes must pass QA again.
- **No skipping steps.** If someone changes a `status:` label by hand, the change stays only when it's an allowed move. Anything else (e.g. RFT → UAT Tested) is reverted, with a comment explaining why.
- **Issues close only after production.** If an issue is closed any other way, including by merging a PR that says `Fixes #N`, it's reopened. Closing as *Not planned* or *Duplicate* is still allowed.
- **A reopened closed issue** goes back to In Progress.

## Typical flow

1. Create an issue from the **Bug report** or **Feature request** template. It starts as **Open**.
2. Assign a developer → **In Progress**. They open a PR with `Refs #N` in the description (the PR template includes this).
3. When the change is ready to test, the developer comments `/rft @qa-user` → **RFT**.
4. QA comments `/qa start` → **In Testing**, then either:
   - `/qa pass Tested on web + Android, all criteria met`, or
   - `/qa fail Advance > 10 digits still shows no error on step 3` → back to **In Progress**. The developer fixes it and runs `/rft` again.
5. The UAT approver comments `/uat approve` → **UAT Tested**.
6. Run **Actions → Deploy to production**. Once the deployment is approved, deployed and passes its `/health` check, every UAT Tested issue (or just the ones you list) is commented on and moved to **Closed**.

## One-time setup (repo admin)

1. **Labels:** Actions → **Issue workflow setup** → *Run workflow*. This creates the `status: *`, `qa: passed` and `qa: failed` labels.
2. **Roles** (Settings → Secrets and variables → Actions → *Variables*):
   - `QA_USERS`: comma-separated GitHub usernames allowed to run `/qa`. Also the default QA for `/rft` with no @mention.
   - `UAT_USERS`: usernames allowed to run `/uat`.
   - If either is unset, any collaborator with write access can run those commands.
3. **Project board** (optional, recommended):
   1. Create a GitHub Project (Board view). Set its **Status** field options to exactly: `Open`, `In Progress`, `RFT`, `In Testing`, `UAT Tested`, `Closed`.
   2. In the project's **Workflows**, turn off the built-in *Item closed*, *Pull request merged* and *Item reopened* automations. This workflow sets Status itself, and the built-ins would fight it.
   3. Add the variable `PROJECT_URL`, e.g. `https://github.com/users/Sarthak2845/projects/1`.
   4. Add the secret `PROJECT_TOKEN`: a personal access token with the **project** scope (classic) or *Projects: read & write* (fine-grained). The default `GITHUB_TOKEN` can't edit user-owned Projects.
4. **Production deploy:**
   - Settings → Environments → **production**: add *Required reviewers* (this is the manual approval before go-live).
   - Add the secret `DEPLOY_HOOK_URL` (your host's deploy hook), or replace the *Deploy* step in `.github/workflows/deploy-production.yml` with your deploy commands.
   - Add the variable `PRODUCTION_URL`: the backend base URL, checked at `/health` before anything is closed.

> PRs from forks get a read-only token, so the workflow can't comment on their linked issues. Use branches in this repo.
