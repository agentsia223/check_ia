# Contributing to Check-IA

We welcome contributions from everyone. This guide explains how to get involved.

For the full contributing guidelines, see [CONTRIBUTING.md](https://github.com/agentsia223/check_ia/blob/main/CONTRIBUTING.md) in the repository root.

## Quick Start

1. Fork the repository
2. Create a branch from `main` (`feature/your-feature`, `fix/your-fix`, or `docs/your-change`)
3. Make your changes and write tests
4. Ensure all tests pass
5. Submit a pull request

## Branching Strategy

| Prefix | Purpose |
|--------|---------|
| `feature/*` | New features |
| `fix/*` | Bug fixes |
| `docs/*` | Documentation changes |

## Code Style

- **Python**: Follow PEP 8. Use type hints where practical.
- **JavaScript**: Follow the ESLint configuration (react-app preset).
- **Commits**: Write clear, descriptive commit messages.

## Running Tests

### Backend

```bash
DJANGO_SETTINGS_MODULE=config.settings_test pytest -v
```

### Frontend

```bash
cd client
npm test -- --watchAll=false
```

## Pull Request Process

1. Fill in the PR template completely
2. Link any related issues
3. Ensure CI checks pass
4. Address automated review feedback from CI, CodeRabbit, Claude, and maintainers
5. Once required checks pass and conversations are resolved, the PR can be merged

This repository currently uses the solo-maintainer review pipeline. Pull requests must pass required CI and resolve conversations before merge; human approval is not required because GitHub does not allow PR authors to approve their own pull requests. See [Automated PR Review SOP](automated-review-sop.md) for the full setup and the CODEOWNERS/multi-maintainer variant.

## Code of Conduct

This project follows the [Contributor Covenant Code of Conduct](code-of-conduct.md). By participating, you agree to uphold its standards.

## Questions?

Open an issue or reach out at hello@check-ia.app.
