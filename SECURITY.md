# Security Policy

## Reporting a Vulnerability

If you discover a security vulnerability in Ensemble, please report it
privately rather than opening a public issue.

- Email **romain.luyten@gmail.com** with a description of the issue, steps to
  reproduce, and any relevant logs or proof-of-concept code.
- You should receive an acknowledgment within a few days.
- Please allow time for a fix to be released before disclosing the issue
  publicly.

## Supported Versions

This project does not yet maintain multiple release lines — security fixes are
applied to the `develop` branch and promoted to `main` as part of the normal
release process described in [CLAUDE.md](./CLAUDE.md).

## Scope

This covers the code in this repository (`apps/web`, `apps/api`,
`packages/db`) and its deployment configuration. It does not cover
third-party services the app integrates with (Neon, Cloudflare, Resend,
Mailpit), which have their own security reporting channels.
