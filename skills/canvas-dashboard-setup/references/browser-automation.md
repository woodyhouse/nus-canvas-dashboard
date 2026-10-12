# Deterministic browser preparation

`scripts/token-browser.mjs` exports `prepareTokenDialog(page, options)`. It uses semantic Playwright locators, handles an already-open form, verifies the parsed expiry, and returns only non-secret status. It never clicks Generate, reads tokens, changes existing integrations, or exports browser storage. Defaults target NUS English UI, Singapore time and 30 days; other UI languages/control layouts need an observed adapter. Do not blindly guess alternate selectors.

## Existing Codex in-app browser

Prefer the already-authenticated, agent-controllable tab. After reading that browser tool's current documentation, import the helper into its Node REPL and provide the supported locator adapter (absolute path is the actual checkout path):

```js
const helper = await import('file:///ABSOLUTE/CHECKOUT/scripts/token-browser.mjs');
const result = await helper.prepareTokenDialog({
  url: () => tab.url(),
  goto: url => tab.goto(url),
  getByRole: (...args) => tab.playwright.getByRole(...args),
});
nodeRepl.write(result);
```

This is ordinary Node module execution, not page-context evaluate. If imports are unsupported by the tool, read the helper and replay its preparation calls using the documented browser APIs. Observe the current form before interacting. No login-state export or cookie transfer is needed.

## Standard Playwright / CLI

With a standard Playwright Page, call `prepareTokenDialog(page)` directly. A CLI-controlled browser is a separate session from the Codex side panel; an existing side-panel login does not automatically log in a fresh CLI browser. Reuse the controllable side panel when available rather than creating an unnecessary second login.

For a CLI session already open and logged in, inspect its settings page, then run the preparation snippet:

```powershell
$prepareCode = node scripts/token-browser.mjs --print-code
npx --package @playwright/cli playwright-cli -s=canvas run-code $prepareCode
```

CLI sessions must have tracing/video off. Use the CLI only **before generation**: its automatic snapshots or command output may expose a generated token. Do not use a CLI Generate click, network inspection, storage export, or token DOM reads.

## Continue instead of stopping

- `login-required`: ask the user to log in/MFA; resume the helper after the reply.
- `unavailable`: inspect the current page for disabled access/institution restrictions; report that concrete blocker.
- `awaiting-confirmation`: launch `npm run canvas:connect`, verify the receipt becomes `waiting`, then request confirmation of this credential's purpose/expiry/local use. A short, action-time confirmation is needed because a new token grants account access.
- After confirmation, an agent may click the observed Generate button only with tooling that does not automatically return a snapshot, screenshot, trace or generated token. Otherwise the user clicks it. Stop all page observations immediately after that click; user copies and pastes into the visible hidden-input terminal.
- Read only `.local/token-input-status.json` for completion. The native helper continues sync/build/local hosting automatically. Do not end with a configuration recipe when it can still perform the remaining authorized steps. Never claim a ready deployment from `waiting` or `verified` alone.

Local live verification: the NUS English settings form was prepared by this helper, including ISO date input normalized by Canvas into a long English date. Token creation, user entry and live sync are separate checks; a successful preparation does not prove those checks.
