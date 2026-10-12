# Standalone personal local testing

Use when the user wants token acquisition/transfer handled by a local script without agent participation. Explain the personal-testing/OAuth and broad-permission caveat once. This is not unattended credential replacement or a multi-user OAuth substitute.

1. Clone/reuse the checkout; npm ci; npm run canvas:browser:install. Chromium is obtained through the official Playwright package. Report missing OS libraries/permissions without bypassing them.
2. Run npm run canvas:auto. It creates private configuration and launches a visible native terminal. Its ephemeral browser has independent login state from Codex's side panel. The user performs login/MFA; no cookies are exported or saved.
3. The script navigates to settings after login and fills/verifies purpose and 30-day Singapore-time expiry. It displays the site, purpose, expiry and permission/storage warning in the user's terminal, requiring the user to type YES. Never answer through an agent tool, attach to that browser or observe its secret UI; read only .local/token-input-status.json.
4. It generates once, reads the visible_token DOM field locally in process memory, validates via same-origin GET, and encrypts the credential. No clipboard, echo, screenshots, traces or network/body logging. The browser closes before sync/build/start. Raw credentials never enter the agent context.
5. Monitor waiting-login → awaiting-confirmation → verified → syncing → building → starting → ready. User handoffs are not completed deployment. Wait/request input using supported mechanisms; on ready open its URL and verify the dashboard. Do not launch duplicate work. Check .local/last-check.json for unavailable sections.
6. Existing encrypted credentials are reused. Invalid credentials are not silently replaced. Only on explicit user replacement request use npm run canvas:auto -- --replace, retaining local confirmation. Cancel closes without generating. Generation/verification failures never retry: a token may already exist; ask the user to check/revoke any unused credential themselves.

Native terminal fallback: the user runs node scripts/auto-connect.mjs --worker in their own real terminal. Never answer its prompts in an agent-controlled PTY. macOS/Linux launch behavior needs target-machine validation. npm run test:browser uses a fictional routed Canvas DOM and temporary encrypted storage; it does not prove live NUS SSO/token creation on every device.

The older manual-paste flow remains in personal-setup.md. Do not read credential files, clipboard, passwords or process memory while troubleshooting. Never auto-generate personal tokens during scheduled monitoring.
