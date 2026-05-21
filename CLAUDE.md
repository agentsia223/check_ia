# Repository Standards for Claude

This is a Django and React application. Reviews should prioritize correctness, security, accessibility, and regression risk.

## General Rules

- Keep changes scoped to the issue or PR description.
- Preserve existing project structure and style unless the PR explicitly refactors it.
- Add or update tests for changed behavior.
- Prefer clear, actionable review comments with file and line context.
- Do not request cosmetic-only changes unless they affect maintainability, accessibility, or user behavior.

## Frontend Rules

- React UI changes must preserve accessible labels, useful alt text, keyboard behavior, and loading/error states.
- Existing French-language pages should keep user-facing copy in French.
- Upload controls must be distinguishable to screen readers by page context.

## Backend Rules

- Django changes must validate inputs, enforce authorization, handle external API failures, and avoid leaking secrets or sensitive data.
- New backend behavior should include focused pytest coverage.
- Dependency changes should be justified by the PR and reflected in lockfiles when applicable.

## Workflow Rules

- GitHub Actions should use least-privilege permissions.
- Do not run untrusted pull request code under privileged `pull_request_target` workflows.
- Deployment jobs should use protected environments for production secrets.
