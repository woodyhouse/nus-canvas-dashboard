# Security

Do not file issues containing tokens, secrets, course records or raw logs. Revoke exposed credentials immediately. Use a private channel agreed with the maintainer for sensitive vulnerability reports.

The OAuth helper is single-user and loopback-only. It encrypts tokens, but its key and ciphertext both reside on the user's computer; an attacker with access to that account can decrypt them. Use OS permissions and full-disk encryption. Administrator OAuth scopes should allow only the listed GET endpoints. Shared institutional secrets belong on an approved server, not in classmates' clones.

Real dashboard snapshots are embedded in frontend build output. A public deployment reveals that data even when the source JSON is ignored by Git. Keep deployments and container images private, and use proper access control. This project has no built-in multi-user authentication or tenant isolation.
