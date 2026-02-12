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
4. Request review from a maintainer
5. Address review feedback

All pull requests require at least one approving review before merge.

## Code of Conduct

This project follows the [Contributor Covenant Code of Conduct](code-of-conduct.md). By participating, you agree to uphold its standards.

## Questions?

Open an issue or reach out at hello@check-ia.app.
