# Security Policy

## Supported Versions

| Version | Supported |
|---------|-----------|
| 0.1.x   | â Yes    |

## Reporting a Vulnerability

**Please do not open public GitLab issues for security vulnerabilities.**

Report security issues by emailing:
- **Email**: chaitanyachalithoff@gmail.com
- **Subject line**: `[SECURITY] Decision Arena â <brief description>`

We will acknowledge your report within **48 hours** and release a patch within **7 days** for critical issues.

## Security Practices

- All secrets are stored as environment variables
- Clerk JWT validation on every request
- Dependency audits on every CI run
- Secret scanning via Gitleaks
- Static analysis via Bandit
