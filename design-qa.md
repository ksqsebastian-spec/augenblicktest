# Design and workflow QA — 2026-09-14

Reference: https://app.augenblick-control.de/dashboard and its authenticated object, building, equipment, inspection, report and settings screens. Implementation: http://127.0.0.1:8787. Reference was inspected read-only; no original production inspection was submitted.

## Visual comparison

Paired browser captures at 1440×900 and 390×844 compared the dashboard. The desktop sidebar, header, welcome panel, quick actions, card geometry and pale blue/lavender palette were reproduced. Mobile comparison verified the compact header, two-column actions, stacked cards and bottom navigation. Corrections included Flutter icon codepoints, regular-weight typography, card spacing and mobile grid overflow. Original interface font/logo assets are bundled locally; see THIRD_PARTY.md.

Synthetic local records necessarily differ from the reference data. The account indicator says Team rather than Premium. Visual fidelity of all deeper screens has not been established as pixel-identical. This is a functional first release, not a claim of complete 1:1 feature parity.

## Verified workflows

- Existing synthetic account login, dashboard and equipment navigation.
- Six-point monthly inspection, all answers, notes, completion and persisted report.
- XLSX selection, preview and successful equipment import.
- Server stopped, cached application reloaded, inspection completed offline, server restarted, manual sync completed and authoritative report loaded.
- API tests for role enforcement, invitation reuse, conflicts, immutable evidence, private attachments and deactivation.
- Domain tests ensure a monthly pass cannot conceal annual defects or missing annual evidence; archived evidence remains in due-date calculations.

## Remaining release boundaries

Cloudflare Worker deployed on 2026-09-14. Live setup status responds successfully and anonymous record requests return HTTP 401. Browser verification caught and resolved double compression in the API packaging helper. First-administrator setup is left for the owner. Source data migration, actual production account onboarding, camera scanning across device types, floor-plan manipulation and print pagination across long reports require further acceptance testing. Automated email, password recovery and SLA escalation are absent. No claim is made that these templates or reports establish regulatory compliance.
