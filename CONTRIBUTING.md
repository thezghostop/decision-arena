# Contributing to Decision Arena

Thank you for your interest in contributing! This document explains how to get started.

## Getting Started

1. Fork the repository on [code.swecha.org](https://code.swecha.org)
2. Clone your fork: `git clone https://code.swecha.org/<your-username>/decision-arena.git`
3. Create a feature branch: `git checkout -b feat/your-feature-name`

## Development Setup

### Backend (FastAPI)
```bash
cd backend
python -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
cp .env.example .env  # fill in your keys
uvicorn app.main:app --reload
```

### Frontend (Next.js)
```bash
cd frontend
npm install
cp .env.local.example .env.local  # fill in your keys
npm run dev
```

## Code Style

- **Python**: We use `ruff` for linting and formatting. Run `ruff check .` and `ruff format .` before committing.
- **TypeScript**: We use ESLint + Prettier. Run `npm run lint` before committing.
- Pre-commit hooks enforce these automatically â install them with `pre-commit install`.

## Commit Messages

Follow [Conventional Commits](https://www.conventionalcommits.org/):

```
feat: add multi-round debate support
fix: resolve doubled token streaming bug
docs: update API documentation
chore: bump dependencies
```

## Submitting a Merge Request

1. Ensure all tests pass: `pytest backend/tests/`
2. Ensure no lint errors: `ruff check backend/`
3. Push your branch and open an MR against `main`
4. Fill in the MR template â describe what changed and why
5. Request a review from a maintainer

## Reporting Issues

Open an issue on the GitLab project. Include:
- Steps to reproduce
- Expected vs actual behaviour
- Environment (OS, Python version, Node version)

## Code of Conduct

All contributors must follow our [Code of Conduct](CODE_OF_CONDUCT.md).
