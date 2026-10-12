---
name: canvas-dashboard-setup
description: Set up and maintain a user's local Canvas dashboard, including browser-assisted onboarding, hidden terminal credential entry for personal testing, institution-approved OAuth, read-only sync, and private deployment.
---

# Canvas dashboard setup

Repository: https://github.com/woodyhouse/nus-canvas-dashboard.git. If no checkout exists, clone it into a dedicated directory in the current workspace; do not ask the user for a repository path already provided here. Reuse an existing clone; pull only when the tree is clean. Do not assume operating system or course IDs. Read README and AGENTS.md. The demo is fictional; personal state is ignored by Git. Use skill-appropriate browser tools, never inspect browser cookies or hidden app state.

## Onboarding

1. Verify Node 22.13+ and npm. Run npm ci, npm test and npm run build. Show demo on desktop and mobile; no Canvas connection is needed for this phase.
2. Select the authorized connection mode. For the user's own local personal testing, follow the [personal terminal flow](references/personal-setup.md); no OAuth Developer Key is needed for that mode. Explain its policy/permission caveat once. Do not present it as the default onboarding for a distributed multi-user service: Canvas requires OAuth there. For institutional/multi-user use, obtain an administrator-approved Developer Key registered to that deployment; if absent, report the blocker.
3. Run npm run setup. For OAuth, have the user privately configure .env.local or an equivalent secure environment; never print secrets or place them in model context. Shared client secrets must not be distributed to untrusted student installs. For local personal testing, the terminal helper handles credential storage; do not tell the user to edit token values into .env.local.
4. For OAuth run npm run canvas:login; the user completes login/MFA/approval. For personal testing prefer the [standalone script](references/standalone-setup.md): install its browser and launch npm run canvas:auto. The user logs in and confirms generation in the local browser/terminal; the script privately handles the token. The agent must not attach to that browser, enter confirmation, inspect process memory, enable traces/debugging, or read credentials. Use the older side-panel + hidden paste flow only when the user chooses it or standalone tooling is unavailable.
5. Run npm run canvas:sync. Check .local/last-check.json, including unavailable sections. Verify source-backed deadlines and preserve null dates. Do not equate has_submitted_submissions with this student's submission.
6. Default to local loopback hosting when the user requested local setup; do not repeatedly ask about hosting. Ask only for material missing timetable/term boundaries or a genuinely unspecified destination. Add verified course facts to ignored data/overrides.local.json; use stable IDs, exact sources, and retain contradictions. After credentials are verified, continue sync, build, launch on 127.0.0.1, and open the dashboard without asking the user to run each command. If a user action is outstanding, monitor the supported receipt/wait mechanism or end with the single required action; never claim completion while a receipt says waiting.

## Incremental monitoring

Run the read-only API sync first. Read the changes receipt; reuse unchanged sources. The current script tracks Files and Modules metadata but does not OCR or interpret PDF-only exam rules automatically.
For changed assessment descriptions, relevant slides or course outlines, use an authorized read-only download method. Keep downloads, SHA-256 hashes and extracted text in .local/; never commit them. Run `python scripts/extract_pdf_text.py .local/downloads/FILE.pdf` when pypdf is available; OCR is optional via pdftoppm/tesseract. Alternatively use the agent's installed PDF skill. Prefer a PDF text layer; render/OCR pages with missing text. Cache by content hash and retain page numbers. If extraction fails, mark that evidence unverified instead of claiming no changes.
Submission dates/methods prefer Canvas Assignment/Quiz detail; explicit current slides govern exam rules; user timetable governs fixed sessions; official calendar governs holidays. Present conflicting facts together. Refresh the same private deployment only after a verified pass. Never send coursework, create comments or submit assignments during monitoring.

## Deployment

Run tests/build, check tracked files with npm run privacy:check, and inspect screenshots visually. Publish the demo source to public Git only; real data stays private. Use the user's authorized provider and account. Do not create a new site if an existing instance is selected. Require authentication before exposing real snapshots online. Verify the actual deployment response and URL.
Do not infer authorization to install a schedule, buy hosting or disclose private data. If requested, configure a local scheduler or supported agent automation for sync then private build/deploy. Surface disabled or failed checks honestly; do not advance successful-monitor timestamps for a failed run.

Report concrete outcomes, remaining prerequisites and failed verification. A running demo does not prove live OAuth integration or scheduled deployment works.
