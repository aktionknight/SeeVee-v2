# Project-Scoped Agent Rules

## Security Audits
Whenever a security vulnerability or security risk is discussed, discovered, or explained, ALWAYS log it in the `markdowns/security_audits.md` file as a security audit. Include the date, severity, location of the issue, a description, vulnerability vectors, and recommended mitigations.

## Dependency Management
Whenever a new Python package is imported or used in the codebase, you MUST immediately add it to ackend/requirements.txt. Do not leave dependencies implicit or assume they are already installed. Check equirements.txt to verify and append the package name (with a version constraint if applicable) if it is missing.
