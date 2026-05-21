# Automated PR Review SOP

This SOP describes the automated pull request review pipeline to use when setting up new repositories. Solo-maintainer mode is the default.

## Goals

- Keep `main` protected from direct, untested changes.
- Run deterministic CI before merge.
- Use CodeRabbit and Claude as automated reviewers, not as the only merge authority.
- Avoid security footguns with forked PRs, GitHub Actions secrets, and deployment tokens.
- Choose branch protection that matches the actual maintainer model.

## Default Pipeline: Solo Maintainer

Use this mode when one person owns the repository and no other maintainer can approve PRs.

### Required Behavior

- Pull requests are required before merging to `main`.
- Backend and frontend tests must pass.
- Branches must be up to date with `main` before merging.
- Conversations must be resolved before merge.
- Force pushes and branch deletion are blocked on `main`.
- Required human approvals are disabled because GitHub does not let PR authors approve their own PRs.
- CodeRabbit and Claude review comments are advisory unless their GitHub checks are known to post reliably for the repository.

### GitHub Branch Protection

Apply this with the GitHub CLI after replacing `OWNER` and `REPO`:

```bash
gh api --method PUT repos/OWNER/REPO/branches/main/protection \
  -H "Accept: application/vnd.github+json" \
  --input - <<'JSON'
{
  "required_status_checks": {
    "strict": true,
    "contexts": ["Backend Tests", "Frontend Tests"]
  },
  "enforce_admins": true,
  "required_pull_request_reviews": {
    "dismiss_stale_reviews": false,
    "require_code_owner_reviews": false,
    "required_approving_review_count": 0,
    "require_last_push_approval": false
  },
  "restrictions": null,
  "allow_force_pushes": false,
  "allow_deletions": false,
  "block_creations": false,
  "required_conversation_resolution": true,
  "lock_branch": false,
  "allow_fork_syncing": true
}
JSON
```

### Production Environment Protection

If the repository deploys from GitHub Actions, create a protected environment for production secrets:

```bash
USER_ID="$(gh api user --jq '.id')"

gh api --method PUT repos/OWNER/REPO/environments/production \
  -H "Accept: application/vnd.github+json" \
  --input - <<JSON
{
  "wait_timer": 0,
  "reviewers": [
    {"type": "User", "id": ${USER_ID}}
  ],
  "deployment_branch_policy": {
    "protected_branches": true,
    "custom_branch_policies": false
  }
}
JSON
```

Then set deployment jobs to use the environment:

```yaml
permissions:
  contents: read

jobs:
  deploy:
    runs-on: ubuntu-latest
    environment: production
```

## CODEOWNERS / Multi-Maintainer Pipeline

Use this mode only when at least two maintainers have write access and someone other than the PR author can approve.

### Required Behavior

- Pull requests are required before merging to `main`.
- Backend and frontend tests must pass.
- Branches must be up to date with `main`.
- Conversations must be resolved before merge.
- Force pushes and branch deletion are blocked.
- At least one approval is required.
- CODEOWNERS review is required for security-sensitive paths.
- Stale approvals are dismissed after new pushes.
- Last-pusher approval is required so the person who most recently pushed cannot self-approve.

### GitHub Branch Protection

```bash
gh api --method PUT repos/OWNER/REPO/branches/main/protection \
  -H "Accept: application/vnd.github+json" \
  --input - <<'JSON'
{
  "required_status_checks": {
    "strict": true,
    "contexts": ["Backend Tests", "Frontend Tests"]
  },
  "enforce_admins": true,
  "required_pull_request_reviews": {
    "dismiss_stale_reviews": true,
    "require_code_owner_reviews": true,
    "required_approving_review_count": 1,
    "require_last_push_approval": true
  },
  "restrictions": null,
  "allow_force_pushes": false,
  "allow_deletions": false,
  "block_creations": false,
  "required_conversation_resolution": true,
  "lock_branch": false,
  "allow_fork_syncing": true
}
JSON
```

### CODEOWNERS Template

Create `.github/CODEOWNERS`:

```txt
# Security-sensitive repository controls
.github/ @OWNER
.coderabbit.yaml @OWNER
CLAUDE.md @OWNER
REVIEW.md @OWNER
SECURITY.md @OWNER

# Dependency manifests
requirements*.txt @OWNER
client/package*.json @OWNER

# Core application areas
core/ @OWNER
client/src/ @OWNER
```

For multi-maintainer teams, replace `@OWNER` with the responsible team, for example `@org/security-reviewers`.

## CodeRabbit Setup

Install the CodeRabbit GitHub App on the repository, then add `.coderabbit.yaml`.

Use this baseline:

```yaml
# yaml-language-server: $schema=https://coderabbit.ai/integrations/schema.v2.json
language: en-US
tone_instructions: "Be direct, concise, and prioritize correctness, security, regressions, accessibility, and missing tests."

reviews:
  profile: assertive
  request_changes_workflow: true
  review_status: true
  review_details: true
  commit_status: true
  fail_commit_status: true
  high_level_summary: true
  assess_linked_issues: true
  enable_prompt_for_ai_agents: true
  in_progress_fortune: false
  poem: false
  path_filters:
    - "!client/build/**"
    - "!client/coverage/**"
    - "!coverage/**"
    - "!**/*.min.js"
    - "!**/dist/**"
    - "!**/.next/**"
  path_instructions:
    - path: "client/src/**"
      instructions: "Review React changes for accessibility, state handling, loading and error states, responsive UI regressions, API integration mistakes, and focused frontend test coverage."
    - path: "core/**"
      instructions: "Review Django/backend changes for authorization, input validation, error handling, database query safety, external API failure modes, and focused pytest coverage."
    - path: ".github/workflows/**"
      instructions: "Treat workflow changes as security-sensitive. Flag broad token permissions, unsafe use of secrets, untrusted pull request code running with privileged triggers, missing environment protection for deployments, and unpinned or unexpected third-party actions."
  auto_review:
    enabled: true
    drafts: false
    auto_incremental_review: true
    base_branches:
      - "main"
    ignore_title_keywords:
      - "[skip review]"
      - "[wip]"
    ignore_usernames:
      - "dependabot[bot]"
      - "github-actions[bot]"
  tools:
    semgrep:
      enabled: true
    opengrep:
      enabled: true
    trivy:
      enabled: true
    osvScanner:
      enabled: true
    gitleaks:
      enabled: true
    trufflehog:
      enabled: true
    actionlint:
      enabled: true
    eslint:
      enabled: true
    pylint:
      enabled: true

chat:
  allow_non_org_members: false
  auto_reply: false

knowledge_base:
  web_search:
    enabled: true
  code_guidelines:
    enabled: true
```

Do not require the CodeRabbit status check in branch protection until the GitHub App has posted a successful check at least once. After that, add the exact check name shown by GitHub:

```bash
gh api --method PATCH repos/OWNER/REPO/branches/main/protection/required_status_checks \
  -H "Accept: application/vnd.github+json" \
  --input - <<'JSON'
{
  "strict": true,
  "contexts": ["Backend Tests", "Frontend Tests", "CodeRabbit"]
}
JSON
```

If CodeRabbit does not post a check but does post comments, keep it advisory and leave only deterministic CI as required.

## Claude Setup

Install the Claude GitHub App or Claude Code Review integration for the repository. Add `CLAUDE.md` so Claude has repository-specific review rules:

```md
# Repository Standards for Claude

Reviews should prioritize correctness, security, accessibility, and regression risk.

- Keep changes scoped to the issue or PR description.
- Add or update tests for changed behavior.
- Do not request cosmetic-only changes unless they affect maintainability, accessibility, or user behavior.
- GitHub Actions should use least-privilege permissions.
- Do not run untrusted pull request code under privileged `pull_request_target` workflows.
```

Recommended Claude mode:

- Solo maintainer: advisory review by manual trigger or automatic first-pass comments.
- Multi-maintainer: automatic review can be required only if the integration emits a reliable GitHub check.

As with CodeRabbit, do not require a Claude check in branch protection until the exact check name has appeared and passed on a PR.

## Shared Review Guidance

Add `REVIEW.md` for human reviewers, CodeRabbit, Claude, and coding agents:

```md
# PR Review Guidance

- Flag production bugs, security issues, regressions, missing validation, broken accessibility, and missing tests for changed behavior.
- Prefer high-signal comments over style nits.
- Verify that PRs address linked issues and acceptance criteria.
- Treat `.github/workflows/**`, deployment files, dependency manifests, authentication, authorization, secrets, and external API integrations as security-sensitive.
- Do not suggest running untrusted contributor code with write tokens or production secrets.
```

## GitHub Actions Security Rules

- Use `pull_request` for CI that checks out and runs contributor code.
- Avoid `pull_request_target` unless the workflow does not check out, build, or execute untrusted PR code.
- Set default job permissions to least privilege:

```yaml
permissions:
  contents: read
```

- Keep production secrets in a protected environment.
- Do not expose deployment secrets to forked PRs.
- Prefer pinned or trusted actions.

## Verification Checklist

Run these checks after setup:

```bash
ruby -e 'require "yaml"; Dir[".github/workflows/*.yml", ".github/workflows/*.yaml", ".coderabbit.yaml"].each { |f| YAML.load_file(f) if File.exist?(f) }; puts "yaml ok"'
git diff --check
coderabbit doctor
coderabbit review --agent --base origin/main
gh pr checks <PR_NUMBER> --repo OWNER/REPO
gh api repos/OWNER/REPO/branches/main/protection --jq '{contexts:.required_status_checks.contexts, pr_reviews:.required_pull_request_reviews}'
```

Expected solo-maintainer result:

- Required checks include deterministic CI.
- `required_approving_review_count` is `0`.
- `require_code_owner_reviews` is `false`.
- `required_conversation_resolution` is `true`.
- Force pushes and deletions are disabled.

Expected CODEOWNERS result:

- Required checks include deterministic CI.
- `required_approving_review_count` is `1` or higher.
- `require_code_owner_reviews` is `true`.
- `require_last_push_approval` is `true`.
- `required_conversation_resolution` is `true`.
- Force pushes and deletions are disabled.

## Current Check-IA Configuration

Check-IA currently uses solo-maintainer mode:

- `main` requires pull requests.
- Required checks: `Backend Tests`, `Frontend Tests`.
- Required approvals: `0`.
- CODEOWNERS review: disabled in branch protection because the repository has one maintainer.
- Conversation resolution: required.
- Force pushes and branch deletion: disabled.
- `production` environment: protected and limited to protected branches.

The repository still keeps `.github/CODEOWNERS`, `CLAUDE.md`, `REVIEW.md`, and `.coderabbit.yaml` so it can switch to the CODEOWNERS approach later without rewriting the review policy.
