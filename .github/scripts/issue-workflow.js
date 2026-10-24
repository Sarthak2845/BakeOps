// Issue lifecycle: Open → In Progress → RFT → In Testing → UAT Tested → Closed
//
// The `status: *` label on each issue is the source of truth. This script moves
// issues between statuses (via slash-command comments, PR events and the
// production deploy), rejects transitions the workflow doesn't allow, and
// mirrors the status into the GitHub Project's "Status" field when configured.
//
// Called from actions/github-script — see .github/workflows/issue-workflow.yml
// and .github/workflows/deploy-production.yml. Docs: .github/ISSUE_WORKFLOW.md

const STATUSES = {
  open: { label: 'status: open', project: 'Open', color: 'ededed', description: 'New issue, waiting for a developer' },
  'in-progress': { label: 'status: in-progress', project: 'In Progress', color: '1d76db', description: 'Developer is working on it' },
  rft: { label: 'status: rft', project: 'RFT', color: 'fbca04', description: 'Ready for testing — assigned to QA' },
  'in-testing': { label: 'status: in-testing', project: 'In Testing', color: 'f9a03f', description: 'QA is testing' },
  'uat-tested': { label: 'status: uat-tested', project: 'UAT Tested', color: '0e8a16', description: 'UAT approved — ready for production' },
  closed: { label: 'status: closed', project: 'Closed', color: '5319e7', description: 'Deployed to production and verified' },
};

const QA_PASSED = { label: 'qa: passed', color: 'c2e0c6', description: 'QA testing passed' };
const QA_FAILED = { label: 'qa: failed', color: 'e99695', description: 'QA testing failed — returned to development' };

// Allowed status changes. Anything else (e.g. RFT → UAT Tested, or a QA-failed
// issue jumping to UAT) is rejected.
const TRANSITIONS = {
  open: ['in-progress'],
  'in-progress': ['rft'],
  rft: ['in-testing', 'in-progress'],
  'in-testing': ['uat-tested', 'in-progress'],
  'uat-tested': ['closed', 'in-progress'],
  closed: ['in-progress'],
};

const BOT_LOGINS = new Set(['github-actions[bot]']);

const HELP = [
  '| Command | Who | Moves to |',
  '|---|---|---|',
  '| `/start` | Developer | In Progress |',
  '| `/rft @qa-user` | Developer (needs a linked PR) | RFT, assigned to QA |',
  '| `/qa start` | QA | In Testing |',
  '| `/qa pass <notes>` | QA | stays In Testing, marked `qa: passed`, waiting for UAT |',
  '| `/qa fail <reason>` | QA | **back to In Progress**, marked `qa: failed` |',
  '| `/uat approve <notes>` | UAT approver (needs `qa: passed`) | UAT Tested |',
  '| `/uat reject <reason>` | UAT approver | back to In Progress |',
  '',
  'Closing happens only through the **Deploy to production** workflow, after the deployment is verified.',
].join('\n');

// ---------------------------------------------------------------------------
// Helpers

function statusKeyOf(issue) {
  const names = (issue.labels || []).map((l) => (typeof l === 'string' ? l : l.name));
  return Object.keys(STATUSES).find((k) => names.includes(STATUSES[k].label)) || null;
}

function hasLabel(issue, label) {
  return (issue.labels || []).some((l) => (typeof l === 'string' ? l : l.name) === label);
}

function csvVar(name) {
  return (process.env[name] || '')
    .split(',')
    .map((s) => s.trim().replace(/^@/, '').toLowerCase())
    .filter(Boolean);
}

function makeCtx({ github, context, core }) {
  const { owner, repo } = context.repo;
  return { github, context, core, owner, repo };
}

async function comment(ctx, number, body) {
  await ctx.github.rest.issues.createComment({ owner: ctx.owner, repo: ctx.repo, issue_number: number, body });
}

async function react(ctx, commentId, content) {
  try {
    await ctx.github.rest.reactions.createForIssueComment({ owner: ctx.owner, repo: ctx.repo, comment_id: commentId, content });
  } catch (e) {
    ctx.core.info(`reaction failed: ${e.message}`);
  }
}

async function addLabels(ctx, number, labels) {
  if (labels.length) await ctx.github.rest.issues.addLabels({ owner: ctx.owner, repo: ctx.repo, issue_number: number, labels });
}

async function removeLabel(ctx, number, name) {
  try {
    await ctx.github.rest.issues.removeLabel({ owner: ctx.owner, repo: ctx.repo, issue_number: number, name });
  } catch (e) {
    if (e.status !== 404) throw e;
  }
}

async function hasWriteAccess(ctx, login) {
  try {
    const { data } = await ctx.github.rest.repos.getCollaboratorPermissionLevel({ owner: ctx.owner, repo: ctx.repo, username: login });
    return ['admin', 'maintain', 'write'].includes(data.permission) || ['admin', 'maintain', 'write'].includes(data.role_name);
  } catch {
    return false;
  }
}

/** QA_USERS / UAT_USERS repo variables restrict who can run those commands; unset means any collaborator with write access. */
async function isInRole(ctx, login, varName) {
  const allowed = csvVar(varName);
  if (allowed.length) return allowed.includes(login.toLowerCase());
  return hasWriteAccess(ctx, login);
}

async function linkedPullRequests(ctx, number) {
  const events = await ctx.github.paginate(ctx.github.rest.issues.listEventsForTimeline, {
    owner: ctx.owner,
    repo: ctx.repo,
    issue_number: number,
    per_page: 100,
  });
  const prs = new Map();
  for (const ev of events) {
    const src = ev.event === 'cross-referenced' ? ev.source && ev.source.issue : null;
    if (src && src.pull_request && src.repository && src.repository.full_name === `${ctx.owner}/${ctx.repo}`) {
      prs.set(src.number, src);
    }
  }
  return [...prs.values()];
}

/** Issue numbers a PR says it works on: "Refs #12", "Issue: #12", "Fixes #12", etc. */
function issuesReferencedBy(text) {
  const re = /\b(?:refs?|issue|fix(?:es|ed)?|close[sd]?|resolve[sd]?|part of)\s*:?\s*#(\d+)/gi;
  const out = new Set();
  let m;
  while ((m = re.exec(text || ''))) out.add(Number(m[1]));
  return [...out];
}

// ---------------------------------------------------------------------------
// GitHub Project (v2) sync — optional, needs PROJECT_URL var + PROJECT_TOKEN secret.

let projectCache = null;

async function loadProject(ctx) {
  if (projectCache !== null) return projectCache;
  const url = process.env.PROJECT_URL;
  const token = process.env.PROJECT_TOKEN;
  if (!url || !token) {
    projectCache = false;
    return false;
  }
  const m = /github\.com\/(users|orgs)\/([^/]+)\/projects\/(\d+)/.exec(url);
  if (!m) {
    ctx.core.warning(`PROJECT_URL "${url}" is not a GitHub Project URL; skipping project sync.`);
    projectCache = false;
    return false;
  }
  const ownerType = m[1] === 'orgs' ? 'organization' : 'user';
  const data = await ctx.github.graphql(
    `query($login: String!, $number: Int!) {
      owner: ${ownerType}(login: $login) {
        projectV2(number: $number) {
          id
          field(name: "Status") { ... on ProjectV2SingleSelectField { id options { id name } } }
        }
      }
    }`,
    { login: m[2], number: Number(m[3]), headers: { authorization: `bearer ${token}` } }
  );
  const project = data.owner && data.owner.projectV2;
  if (!project || !project.field) {
    ctx.core.warning('Project or its "Status" field not found; skipping project sync.');
    projectCache = false;
    return false;
  }
  projectCache = { id: project.id, fieldId: project.field.id, options: project.field.options, token };
  return projectCache;
}

async function syncProject(ctx, issue, key) {
  try {
    const project = await loadProject(ctx);
    if (!project) return;
    const option = project.options.find((o) => o.name.toLowerCase() === STATUSES[key].project.toLowerCase());
    if (!option) {
      ctx.core.warning(`Project Status has no "${STATUSES[key].project}" option; add it to keep the board in sync.`);
      return;
    }
    const headers = { authorization: `bearer ${project.token}` };
    const added = await ctx.github.graphql(
      `mutation($project: ID!, $content: ID!) { addProjectV2ItemById(input: { projectId: $project, contentId: $content }) { item { id } } }`,
      { project: project.id, content: issue.node_id, headers }
    );
    await ctx.github.graphql(
      `mutation($project: ID!, $item: ID!, $field: ID!, $option: String!) {
        updateProjectV2ItemFieldValue(input: { projectId: $project, itemId: $item, fieldId: $field, value: { singleSelectOptionId: $option } }) { projectV2Item { id } }
      }`,
      { project: project.id, item: added.addProjectV2ItemById.item.id, field: project.fieldId, option: option.id, headers }
    );
  } catch (e) {
    // The label is authoritative; a board sync failure must not block the workflow.
    ctx.core.warning(`Project sync failed for #${issue.number}: ${e.message}`);
  }
}

// ---------------------------------------------------------------------------
// Core transition

async function setStatus(ctx, issue, to) {
  const from = statusKeyOf(issue);
  for (const key of Object.keys(STATUSES)) {
    if (key !== to && hasLabel(issue, STATUSES[key].label)) await removeLabel(ctx, issue.number, STATUSES[key].label);
  }
  if (!hasLabel(issue, STATUSES[to].label)) await addLabels(ctx, issue.number, [STATUSES[to].label]);
  issue.labels = [
    ...(issue.labels || []).filter((l) => !Object.values(STATUSES).some((s) => s.label === (typeof l === 'string' ? l : l.name))),
    { name: STATUSES[to].label },
  ];
  await syncProject(ctx, issue, to);
  ctx.core.info(`#${issue.number}: ${from || '(none)'} → ${to}`);
}

function canMove(from, to) {
  return !from ? to === 'open' || to === 'in-progress' : (TRANSITIONS[from] || []).includes(to);
}

function name(key) {
  return key ? `**${STATUSES[key].project}**` : '**(no status)**';
}

// ---------------------------------------------------------------------------
// Event handlers

async function onIssue(ctx) {
  const { action, issue, sender, label } = ctx.context.payload;
  const isBot = BOT_LOGINS.has(sender.login);

  if (action === 'opened') {
    if (!statusKeyOf(issue)) await setStatus(ctx, issue, 'open');
    else await syncProject(ctx, issue, statusKeyOf(issue));
    return;
  }

  if (action === 'assigned') {
    // Assigning a developer to a fresh issue starts development.
    if (statusKeyOf(issue) === 'open') {
      await setStatus(ctx, issue, 'in-progress');
      await comment(ctx, issue.number, `@${ctx.context.payload.assignee.login} is assigned — status moved to ${name('in-progress')}.\n\nWhen the PR is up, comment \`/rft @qa-user\` to hand over to QA.`);
    }
    return;
  }

  if (action === 'closed') {
    if (isBot) return;
    const key = statusKeyOf(issue);
    if (issue.state_reason === 'not_planned' || issue.state_reason === 'duplicate') return; // won't-fix closes are fine
    if (key === 'closed') return;
    // A merged PR with "Fixes #N", or a manual close, must not skip QA/UAT/production.
    await ctx.github.rest.issues.update({ owner: ctx.owner, repo: ctx.repo, issue_number: issue.number, state: 'open' });
    await comment(
      ctx,
      issue.number,
      `Reopened: this issue is at ${name(key)} and can only be closed after it is **UAT Tested** and deployed to production via the **Deploy to production** workflow.\n\n` +
        `To close it without shipping, close it as *Not planned* instead. In PRs, prefer \`Refs #${issue.number}\` over \`Fixes #${issue.number}\`.`
    );
    return;
  }

  if (action === 'reopened') {
    if (isBot) return;
    if (statusKeyOf(issue) === 'closed') {
      await setStatus(ctx, issue, 'in-progress');
      await comment(ctx, issue.number, `Reopened — status moved back to ${name('in-progress')}.`);
    }
    return;
  }

  // Someone edited a status label by hand: allow valid moves, revert the rest.
  if ((action === 'labeled' || action === 'unlabeled') && label && !isBot) {
    const changed = Object.keys(STATUSES).find((k) => STATUSES[k].label === label.name);
    if (!changed) return;

    if (action === 'unlabeled') {
      if (!statusKeyOf(issue)) {
        await addLabels(ctx, issue.number, [label.name]);
        await comment(ctx, issue.number, `Every issue needs a status — restored \`${label.name}\`. Use the workflow commands to change it.\n\n${HELP}`);
      }
      return;
    }

    const others = Object.keys(STATUSES).filter((k) => k !== changed && hasLabel(issue, STATUSES[k].label));
    const from = others[0] || null;
    const qaPassed = hasLabel(issue, QA_PASSED.label);
    const reason =
      changed === 'closed'
        ? 'issues are closed only by the **Deploy to production** workflow'
        : changed === 'uat-tested' && !qaPassed
          ? 'UAT can only be recorded after QA has passed the issue (`/qa pass`)'
          : !canMove(from, changed)
            ? `${name(from)} → ${name(changed)} is not an allowed step`
            : null;

    if (reason) {
      await removeLabel(ctx, issue.number, label.name);
      await comment(ctx, issue.number, `Reverted \`${label.name}\`: ${reason}.\n\n${HELP}`);
      return;
    }
    for (const k of others) await removeLabel(ctx, issue.number, STATUSES[k].label);
    await syncProject(ctx, issue, changed);
  }
}

async function onPullRequest(ctx) {
  const { action, pull_request: pr } = ctx.context.payload;
  const numbers = issuesReferencedBy(`${pr.title}\n${pr.body || ''}`);

  for (const number of numbers) {
    let issue;
    try {
      ({ data: issue } = await ctx.github.rest.issues.get({ owner: ctx.owner, repo: ctx.repo, issue_number: number }));
    } catch {
      continue;
    }
    if (issue.pull_request) continue;

    if (['opened', 'reopened', 'ready_for_review'].includes(action)) {
      const key = statusKeyOf(issue);
      if (key === 'open' || !key) {
        await setStatus(ctx, issue, 'in-progress');
        await comment(ctx, number, `PR #${pr.number} opened — status moved to ${name('in-progress')}.`);
      }
    } else if (action === 'closed' && pr.merged) {
      if (statusKeyOf(issue) === 'in-progress') {
        await comment(ctx, number, `PR #${pr.number} merged. When it's ready for testing, comment \`/rft @qa-user\` to hand over to QA.`);
      }
    }
  }
}

async function onComment(ctx) {
  const { issue, comment: c } = ctx.context.payload;
  if (issue.pull_request || BOT_LOGINS.has(c.user.login)) return;

  const firstLine = (c.body || '').trim().split('\n')[0];
  const m = /^\/(start|rft|qa|uat|status|help)\b\s*(.*)$/i.exec(firstLine);
  if (!m) return;

  const cmd = m[1].toLowerCase();
  const rest = m[2].trim();
  const restBody = [rest, ...(c.body || '').trim().split('\n').slice(1)].join('\n').trim();
  const actor = c.user.login;
  const from = statusKeyOf(issue);

  const reject = async (why) => {
    await react(ctx, c.id, '-1');
    await comment(ctx, issue.number, `@${actor} ${why}\n\n<details><summary>Workflow commands</summary>\n\n${HELP}\n</details>`);
  };
  const ok = async (body) => {
    await react(ctx, c.id, '+1');
    if (body) await comment(ctx, issue.number, body);
  };
  const guard = async (to) => {
    if (issue.state === 'closed') {
      await reject('this issue is closed. Reopen it first.');
      return false;
    }
    if (!canMove(from, to)) {
      await reject(`can't move from ${name(from)} to ${name(to)}.`);
      return false;
    }
    return true;
  };

  if (cmd === 'help' || cmd === 'status') {
    return ok(`Current status: ${name(from)}${hasLabel(issue, QA_PASSED.label) ? ' · `qa: passed`' : ''}${hasLabel(issue, QA_FAILED.label) ? ' · `qa: failed`' : ''}\n\n${HELP}`);
  }

  if (cmd === 'start') {
    const isAssignee = (issue.assignees || []).some((a) => a.login === actor);
    if (!isAssignee && !(await hasWriteAccess(ctx, actor))) return reject('only the assignee or a collaborator can start work.');
    if (!(await guard('in-progress'))) return;
    if (!isAssignee) await ctx.github.rest.issues.addAssignees({ owner: ctx.owner, repo: ctx.repo, issue_number: issue.number, assignees: [actor] });
    await setStatus(ctx, issue, 'in-progress');
    return ok(`Status moved to ${name('in-progress')} — @${actor} is developing.`);
  }

  if (cmd === 'rft') {
    const isAssignee = (issue.assignees || []).some((a) => a.login === actor);
    if (!isAssignee && !(await hasWriteAccess(ctx, actor))) return reject('only the developer on this issue can hand it to QA.');
    if (!(await guard('rft'))) return;

    const prs = await linkedPullRequests(ctx, issue.number);
    if (prs.length === 0) return reject(`link a pull request first — add \`Refs #${issue.number}\` to the PR description.`);

    const qa = [...rest.matchAll(/@([A-Za-z0-9-]+)/g)].map((x) => x[1]);
    const qaUsers = qa.length ? qa : csvVar('QA_USERS');
    if (qaUsers.length === 0) return reject('say who should test it: `/rft @qa-user` (or set the `QA_USERS` repository variable).');

    await ctx.github.rest.issues.addAssignees({ owner: ctx.owner, repo: ctx.repo, issue_number: issue.number, assignees: qaUsers });
    await removeLabel(ctx, issue.number, QA_FAILED.label);
    await removeLabel(ctx, issue.number, QA_PASSED.label);
    await setStatus(ctx, issue, 'rft');
    return ok(
      `Status moved to ${name('rft')}. ${qaUsers.map((u) => `@${u}`).join(' ')} — ready for testing.\n\n` +
        `PR${prs.length > 1 ? 's' : ''}: ${prs.map((p) => `#${p.number}`).join(', ')}\n\nComment \`/qa start\` when you begin.`
    );
  }

  if (cmd === 'qa') {
    if (!(await isInRole(ctx, actor, 'QA_USERS'))) return reject('only QA can run `/qa` commands.');
    const sub = (rest.split(/\s+/)[0] || '').toLowerCase();
    const notes = restBody.replace(/^\S+\s*/, '').trim();

    if (sub === 'start') {
      if (!(await guard('in-testing'))) return;
      await setStatus(ctx, issue, 'in-testing');
      return ok(`Status moved to ${name('in-testing')} — @${actor} is testing.`);
    }

    if (sub === 'pass') {
      if (from !== 'in-testing') return reject(`QA results can only be recorded while the issue is ${name('in-testing')} (it is ${name(from)}). Run \`/qa start\` first.`);
      await removeLabel(ctx, issue.number, QA_FAILED.label);
      await addLabels(ctx, issue.number, [QA_PASSED.label]);
      return ok(`### ✅ QA passed\n**Tester:** @${actor}\n${notes ? `\n${notes}\n` : ''}\nWaiting for UAT — an approver can comment \`/uat approve\`.`);
    }

    if (sub === 'fail') {
      if (from !== 'in-testing') return reject(`QA results can only be recorded while the issue is ${name('in-testing')} (it is ${name(from)}). Run \`/qa start\` first.`);
      if (!notes) return reject('describe what failed: `/qa fail <steps, expected vs actual>`.');
      await removeLabel(ctx, issue.number, QA_PASSED.label);
      await addLabels(ctx, issue.number, [QA_FAILED.label]);
      await setStatus(ctx, issue, 'in-progress');
      const devs = (issue.assignees || []).map((a) => a.login).filter((l) => l !== actor);
      return ok(
        `### ❌ QA failed — returned to development\n**Tester:** @${actor}\n\n${notes}\n\n` +
          `Status moved back to ${name('in-progress')}. ${devs.map((d) => `@${d}`).join(' ')} please fix and comment \`/rft @${actor}\` again.`
      );
    }

    return reject('use `/qa start`, `/qa pass <notes>` or `/qa fail <reason>`.');
  }

  if (cmd === 'uat') {
    if (!(await isInRole(ctx, actor, 'UAT_USERS'))) return reject('only UAT approvers can run `/uat` commands.');
    const sub = (rest.split(/\s+/)[0] || '').toLowerCase();
    const notes = restBody.replace(/^\S+\s*/, '').trim();

    if (sub === 'approve') {
      if (!hasLabel(issue, QA_PASSED.label) || hasLabel(issue, QA_FAILED.label)) return reject('UAT needs a QA pass first — QA must comment `/qa pass`.');
      if (!(await guard('uat-tested'))) return;
      await setStatus(ctx, issue, 'uat-tested');
      return ok(`### ✅ UAT approved\n**Approver:** @${actor}\n${notes ? `\n${notes}\n` : ''}\nStatus moved to ${name('uat-tested')}. It will close automatically once the **Deploy to production** workflow ships and verifies it.`);
    }

    if (sub === 'reject') {
      if (!notes) return reject('describe why: `/uat reject <reason>`.');
      if (!(await guard('in-progress'))) return;
      await removeLabel(ctx, issue.number, QA_PASSED.label);
      await setStatus(ctx, issue, 'in-progress');
      return ok(`### ❌ UAT rejected — returned to development\n**Approver:** @${actor}\n\n${notes}\n\nStatus moved back to ${name('in-progress')}.`);
    }

    return reject('use `/uat approve <notes>` or `/uat reject <reason>`.');
  }
}

// ---------------------------------------------------------------------------
// Entry points

async function run(args) {
  const ctx = makeCtx(args);
  const event = ctx.context.eventName;
  if (event === 'issues') return onIssue(ctx);
  if (event === 'issue_comment') return onComment(ctx);
  if (event === 'pull_request' || event === 'pull_request_target') return onPullRequest(ctx);
  ctx.core.info(`Nothing to do for ${event}`);
}

/** Called by the production deploy after it is verified: closes every UAT-tested issue it shipped. */
async function closeDeployed(args, { issues, environmentUrl }) {
  const ctx = makeCtx(args);
  const runUrl = `${ctx.context.serverUrl}/${ctx.owner}/${ctx.repo}/actions/runs/${ctx.context.runId}`;
  const numbers = (issues || '')
    .split(/[\s,]+/)
    .map((s) => Number(s.replace('#', '')))
    .filter((n) => Number.isInteger(n) && n > 0);

  let targets = numbers;
  if (targets.length === 0) {
    const all = await ctx.github.paginate(ctx.github.rest.issues.listForRepo, {
      owner: ctx.owner,
      repo: ctx.repo,
      state: 'open',
      labels: STATUSES['uat-tested'].label,
      per_page: 100,
    });
    targets = all.filter((i) => !i.pull_request).map((i) => i.number);
  }

  const closed = [];
  const skipped = [];
  for (const number of targets) {
    const { data: issue } = await ctx.github.rest.issues.get({ owner: ctx.owner, repo: ctx.repo, issue_number: number });
    const key = statusKeyOf(issue);
    if (key !== 'uat-tested') {
      skipped.push(`#${number} (${key ? STATUSES[key].project : 'no status'})`);
      continue;
    }
    await setStatus(ctx, issue, 'closed');
    await comment(
      ctx,
      number,
      `### 🚀 Deployed to production\nDeployment verified${environmentUrl ? ` at ${environmentUrl}` : ''} — [workflow run](${runUrl}).\n\nStatus moved to ${name('closed')}.`
    );
    await ctx.github.rest.issues.update({ owner: ctx.owner, repo: ctx.repo, issue_number: number, state: 'closed', state_reason: 'completed' });
    closed.push(`#${number}`);
  }

  await ctx.core.summary
    .addHeading('Production closure')
    .addRaw(`Closed: ${closed.join(', ') || 'none'}\n\n`)
    .addRaw(skipped.length ? `Skipped (not UAT Tested): ${skipped.join(', ')}\n` : '')
    .write();
  if (skipped.length) ctx.core.warning(`Not closed because they are not UAT Tested: ${skipped.join(', ')}`);
}

/** One-time setup: create/update the workflow labels. */
async function ensureLabels(args) {
  const ctx = makeCtx(args);
  const wanted = [...Object.values(STATUSES), QA_PASSED, QA_FAILED];
  for (const l of wanted) {
    try {
      await ctx.github.rest.issues.updateLabel({ owner: ctx.owner, repo: ctx.repo, name: l.label, color: l.color, description: l.description });
      ctx.core.info(`updated ${l.label}`);
    } catch (e) {
      if (e.status !== 404) throw e;
      await ctx.github.rest.issues.createLabel({ owner: ctx.owner, repo: ctx.repo, name: l.label, color: l.color, description: l.description });
      ctx.core.info(`created ${l.label}`);
    }
  }
}

module.exports = { run, closeDeployed, ensureLabels, _test: { issuesReferencedBy, canMove, statusKeyOf, STATUSES, TRANSITIONS } };
