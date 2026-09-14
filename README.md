# Augenblick

A self-hosted German fire-safety inspection workspace, recreated from the visible Augenblick Control interface. React frontend, Cloudflare Worker API, D1 shared database and private R2 uploads. This is an independent implementation, not the original application's source or a certified replacement for professional inspection procedures.

## Included

- Responsive dashboard, objects, buildings, equipment and inspection history.
- Annual/category checklists and monthly FSA inspections; defects, actions, photographs, next dates and printable reports.
- Team accounts, administrator/team-lead/inspector roles, expiring invitation links and activity log.
- Tasks, contractor contacts, image/PDF floor plans and equipment pins on images.
- CSV/XLSX equipment import, CSV exports, JSON record backup and editable checklists.
- Offline cached records and inspection drafts/completion queue with explicit synchronization and conflict detection.

The server is authoritative for shared records. Each installation is one team workspace with scoped external accounts; cross-company workspace switching is not implemented. File downloads require an authenticated session. Completed inspection evidence is immutable; administrators can archive it.

## Known boundaries

This release covers the core observed workflows, not every feature of the original service. Labels, QR labels, custom protocols, scoped and expiring subcontractor access, password changes and server-side SLA escalation are implemented. Reminder, invitation and password-reset email code is tested with a mock sender; production sending remains disabled until EMAIL, EMAIL_FROM and APP_URL are configured with a verified sender domain. Reports use browser printing/save-as-PDF, not certified document generation. CPR equipment can use administrator-created custom protocols. Review all templates and due-date rules against your operational requirements before relying on them.

Offline mode caches records on the current device. Photos and plans are not guaranteed available offline, and inspection photos can be captured offline and uploaded on synchronization. Sign out after synchronizing on shared devices; signing out clears the app cache. JSON backup contains file references rather than binary attachments. Existing production records have not been migrated from the original service.

## Local development

Use Node.js 24 or newer (the local adapter uses node:sqlite).

```sh
npm ci
npm run build
npm test
npm start
```

Open http://127.0.0.1:8787. First administrator setup uses the local-only key `local-development-setup-only` unless SETUP_TOKEN is set. The local database and uploads live in ignored `.local/`. `npm run dev` is the Vite frontend development server; the combined production preview above is the tested full-stack route.

## Cloudflare deployment

`wrangler.jsonc` identifies the intended account, D1 database and private R2 bucket. For a different account, replace those resource identifiers first. With an authenticated Wrangler CLI:

```sh
npm run build
npx wrangler d1 migrations apply augenblick --remote
npx wrangler secret put SETUP_TOKEN
npx wrangler deploy
```

Generate a long random SETUP_TOKEN outside source control. Open the deployed URL with `/#setup=YOUR_SETUP_TOKEN`, create the administrator with your own password, and keep that link private. Setup closes permanently after the first administrator is created. Never commit credentials or `.local/`.

The API deployment helper `node scripts/package-worker.mjs` creates an ignored, single-module bundle with compressed static assets for connector-based upload. When deploying that bundle through the API, supply DB, FILES and SETUP_TOKEN bindings, enable the workers.dev route, and configure the five-minute `*/5 * * * *` maintenance schedule separately.

GitHub CI validates tests and build; it does not deploy or contain Cloudflare credentials. Live deployment: https://augenblick.ksqsebastian.workers.dev . D1, private R2, the setup secret and five-minute maintenance schedule are configured. The owner must complete first-administrator setup using the private setup link.

## Validation

Automated tests exercise authorization, setup, invitations, session invalidation, record relationships, optimistic concurrency, immutable inspection snapshots, synchronization idempotency, uploads and annual/monthly status rules. Browser checks covered desktop/mobile rendering, inspection creation, import and actual server-offline reload and synchronization. See [design-qa.md](design-qa.md) for scope and limitations.

## Parity audit

See [parity-audit.md](parity-audit.md) for the detailed German feature matrix and unresolved gaps. Full feature and pixel parity is not claimed. For native Cloudflare email, use a `send_email` binding named EMAIL, a verified EMAIL_FROM address and APP_URL set to the public origin. Do not enable reminders before verifying delivery. Email builder reference: https://developers.cloudflare.com/email-service/api/send-emails/workers-api/ .

## Mehrere Arbeitsbereiche

Migration 0004 vor dem aktualisierten Worker anwenden. Bestehende Daten bleiben im Hauptarbeitsbereich erhalten. Die Anmeldung liegt anschließend in den `identity_`-Tabellen; neue Firmen haben eigene Tabellen mit einem validierten Workspace-Präfix. Arbeitsbereiche können unter Einstellungen erstellt, gewechselt oder per Einladungslink betreten werden. Ein Konto besitzt pro Arbeitsbereich eigene Rechte. Die API erwartet `X-Workspace`; Dateilinks können den Arbeitsbereich zusätzlich als `workspace`-Parameter enthalten. Die gemeinsame Anmeldung wird bei jedem Zugriff geprüft, auch wenn ein Workspace noch eine gespiegelte Sitzung enthält.

E-Mail-Versand ist in dieser Installation auf Wunsch deaktiviert. Es wurden keine Domains oder weiteren kostenpflichtigen Leistungen gekauft. Mitglieder und externe Nutzer können weiterhin mit Einladungslinks hinzugefügt werden.
