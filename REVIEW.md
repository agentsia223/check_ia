# PR Review Guidance

Use this repository guidance for automated and human PR reviews.

## Review Priorities

- Flag production bugs, security issues, regressions, missing validation, broken accessibility, and missing tests for changed behavior.
- Prefer high-signal comments over style nits. Do not block on formatting unless it hides a real issue.
- Verify that PRs address their linked issue and call out gaps in acceptance criteria.
- Require focused tests for changed behavior unless the PR clearly explains why tests are not practical.
- Treat generated files, build artifacts, coverage output, and minified assets as low priority unless they are unexpectedly edited.

## Frontend

- Check React components for accessible names, alt text, keyboard behavior, loading states, error states, and mobile layout regressions.
- UI text in existing French-language flows should remain in French unless the surrounding page is intentionally English.
- For upload flows, screen readers should distinguish controls by page context and preview images should have concise, useful alt text.

## Backend

- Check Django views, serializers, tasks, and integrations for authorization, input validation, error handling, and external API failure modes.
- Flag database query changes that introduce N+1 behavior, unsafe filtering, or unnecessary broad reads.
- Require pytest coverage for new backend behavior and regression tests for bug fixes.

## Security-Sensitive Changes

- Treat changes to `.github/workflows/**`, deployment files, dependency manifests, authentication, authorization, secrets, and external API integrations as security-sensitive.
- Flag broad `GITHUB_TOKEN` permissions, `pull_request_target` workflows that check out or execute untrusted PR code, secrets exposed to forked PRs, and deployment jobs without appropriate environment protection.
- Do not suggest running untrusted contributor code with write tokens or production secrets.
