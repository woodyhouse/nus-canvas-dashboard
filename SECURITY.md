# Security

Do not file issues containing tokens, secrets, course records or raw logs. Revoke exposed credentials immediately. Use a private channel agreed with the maintainer for sensitive vulnerability reports.

The OAuth helper is single-user and loopback-only. It encrypts tokens, but its key and ciphertext both reside on the user's computer; an attacker with access to that account can decrypt them. Use OS permissions and full-disk encryption. Administrator OAuth scopes should allow only the listed GET endpoints. Shared institutional secrets belong on an approved server, not in classmates' clones.

The optional personal-testing helper opens a visible native terminal and suppresses all token echo. It rejects agent pipes and validates the token before encrypted storage. Credentials never go through agent command arguments or receipts. A personal token may have write permissions; using only GET calls in the code does not narrow those permissions. This mode is for individual local testing; Canvas requires OAuth for applications used by multiple users. New token generation requires explicit confirmation, followed by user-controlled copying and entry. Tokens cannot be refreshed automatically; revoke them in Canvas when no longer needed.

Real dashboard snapshots are embedded in frontend build output. A public deployment reveals that data even when the source JSON is ignored by Git. Keep deployments and container images private, and use proper access control. This project has no built-in multi-user authentication or tenant isolation.
