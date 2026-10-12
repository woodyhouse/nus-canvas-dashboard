---
name: canvas-dashboard-setup
description: Set up and maintain a user's self-hosted Canvas dashboard from this repository, using institution-approved OAuth and source-verified course facts. Use for onboarding, read-only sync, changed-course reviews, and private deployment.
---

# Canvas dashboard setup

Work from the user's clone; do not assume operating system, course IDs or hosting provider. Read its README and AGENTS.md. The demo is fictional; the user's personal state is ignored by Git.

## Onboarding

1. Verify Node 22.13+ and npm. Run npm ci, npm test and npm run build. Show demo on desktop and mobile; no Canvas connection is needed for this phase.
2. Check for an institution-approved OAuth Developer Key registered to this individual deployment. For hosted Canvas the administrator supplies it. Login alone is insufficient. If absent, stop live integration, keep a functional demo, and explain the prerequisite. Do not ask classmates to paste personal API tokens into this distributed app or harvest session cookies.
3. Run npm run setup. Have the user securely configure .env.local or an equivalent private environment. Do not print secrets, read them into model context, or place them in prompts. Client secrets must not be shared across untrusted student installs.
4. Run npm run canvas:login; give the user the authorization URL. They complete login, MFA and permission approval. Do not create credentials or grant broad permissions on their behalf.
5. Run npm run canvas:sync. Check .local/last-check.json, including unavailable sections. Verify source-backed deadlines and preserve null dates. Do not equate has_submitted_submissions with this student's submission.
6. Ask only for material missing configuration: timetable/term boundaries and hosting destination. Add verified course-specific facts to ignored data/overrides.local.json; use stable IDs, exact source filename/page or URL, and retain contradictions.

## Incremental monitoring

Run the read-only API sync first. Read the changes receipt; reuse unchanged sources. The current script tracks Files and Modules metadata but does not OCR or interpret PDF-only exam rules automatically.
For changed assessment descriptions, relevant slides or course outlines, use an authorized read-only download method. Keep downloads, SHA-256 hashes and extracted text in .local/; never commit them. Run `python scripts/extract_pdf_text.py .local/downloads/FILE.pdf` when pypdf is available; OCR is optional via pdftoppm/tesseract. Alternatively use the agent's installed PDF skill. Prefer a PDF text layer; render/OCR pages with missing text. Cache by content hash and retain page numbers. If extraction fails, mark that evidence unverified instead of claiming no changes.
Submission dates/methods prefer Canvas Assignment/Quiz detail; explicit current slides govern exam rules; user timetable governs fixed sessions; official calendar governs holidays. Present conflicting facts together. Refresh the same private deployment only after a verified pass. Never send coursework, create comments or submit assignments during monitoring.

## Deployment

Run tests/build, check tracked files with npm run privacy:check, and inspect screenshots visually. Publish the demo source to public Git only; real data stays private. Use the user's authorized provider and account. Do not create a new site if an existing instance is selected. Require authentication before exposing real snapshots online. Verify the actual deployment response and URL.
Do not infer authorization to install a schedule, buy hosting or disclose private data. If requested, configure a local scheduler or supported agent automation for sync then private build/deploy. Surface disabled or failed checks honestly; do not advance successful-monitor timestamps for a failed run.

Report concrete outcomes, remaining prerequisites and failed verification. A running demo does not prove live OAuth integration or scheduled deployment works.
