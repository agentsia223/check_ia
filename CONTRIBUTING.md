# Contributing to Check-IA

Thank you for your interest in contributing to Check-IA! This document explains our development process and how to submit contributions.

## Table of Contents

- [Code of Conduct](#code-of-conduct)
- [Getting Started](#getting-started)
- [Branching Strategy](#branching-strategy)
- [Making Changes](#making-changes)
- [Pull Request Process](#pull-request-process)
- [Code Style](#code-style)
- [Testing](#testing)
- [Code Review Process](#code-review-process)

## Code of Conduct

This project follows the [Contributor Covenant Code of Conduct](CODE_OF_CONDUCT.md). By participating, you agree to uphold its standards.

## Getting Started

1. Fork the repository on GitHub
2. Clone your fork locally:
   ```bash
   git clone https://github.com/<your-username>/check_ia.git
   cd check_ia
   ```
3. Set up the development environment following the [Getting Started guide](https://agentsia223.github.io/check_ia/getting-started/)
4. Create a branch for your work (see [Branching Strategy](#branching-strategy))

## Branching Strategy

All work is done in feature branches created from `main`:

| Prefix | Purpose | Example |
|--------|---------|---------|
| `feature/` | New features | `feature/add-audio-verification` |
| `fix/` | Bug fixes | `fix/login-redirect-error` |
| `docs/` | Documentation changes | `docs/update-api-reference` |

```bash
git checkout -b feature/your-feature main
```

## Making Changes

1. Make your changes in small, focused commits
2. Write clear commit messages describing what changed and why
3. Add or update tests for any new functionality
4. Ensure all tests pass before submitting
5. Update documentation if your changes affect the public API or user-facing behavior

## Pull Request Process

1. Push your branch to your fork:
   ```bash
   git push origin feature/your-feature
   ```

2. Open a Pull Request against the `main` branch of the upstream repository

3. Fill in the PR template completely:
   - Describe what the PR does
   - Link related issues
   - Check the appropriate type of change
   - Complete the checklist

4. Ensure CI checks pass (backend tests, frontend tests)

5. Request review from a maintainer

6. Address any review feedback by pushing additional commits

7. Once approved, a maintainer will merge the PR

## Code Style

### Python (Backend)

- Follow [PEP 8](https://peps.python.org/pep-0008/)
- Use type hints where practical
- Keep functions focused and small
- Use descriptive variable and function names

### JavaScript (Frontend)

- Follow the ESLint configuration (react-app preset from Create React App)
- Use functional components with hooks
- Use Material-UI components consistently with the existing design
- Prefer named exports for components

## Testing

### Backend

Run the test suite with:

```bash
DJANGO_SETTINGS_MODULE=config.settings_test pytest -v
```

Or simply (since `pyproject.toml` configures the settings module):

```bash
pytest -v
```

With coverage:

```bash
pytest --cov=core --cov-report=term-missing -v
```

### Frontend

```bash
cd client
npm test -- --watchAll=false
```

### Guidelines

- Write tests for all new functionality
- Mock external services (Supabase, AI APIs) in tests
- Aim for meaningful test coverage, not just line coverage
- Tests should be fast and independent of each other

## Code Review Process

- All pull requests require at least one approving review before merge
- Maintainers may request changes — please be responsive to feedback
- Reviews focus on correctness, readability, test coverage, and alignment with the project's goals
- Be constructive and respectful in code review discussions

## Branch Protection

The `main` branch has the following protections:

- Pull request reviews are required before merging
- CI status checks (backend tests, frontend tests) must pass
- Branches must be up to date with `main` before merging
- Force pushes are not allowed

## Questions?

If you're unsure about anything, open an issue or reach out at hello@check-ia.app. We're happy to help!
