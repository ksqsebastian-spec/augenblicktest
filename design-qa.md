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


## Second audit: 2026-09-14

Final result for the requested complete 1:1 parity: **blocked / incomplete**. See parity-audit.md for the complete inventory. This status does not mean the tested incremental changes failed; it means the whole product is not yet verified as an exact replacement.

New source captures covered SLA list/editor, labels/color picker, custom protocol editor, UUID generator, task statistics/form, full annual FSA checklist, profile/password dialog, company profile, external access restrictions and PDF filename segments.

Incremental browser checks passed: create/save label; save SLA deadlines; generate UUID and render QR labels; create custom protocol, assign it to CPR equipment and complete its inspection; complete the 27-check FSA annual inspection with reason and maintenance in the saved report. Mobile SLA comparison at 566×735 led to corrections to header spacing, card spacing, typography and action styling. The same page was checked at 390×844. Earlier desktop checks used 1280×720 and 1440×900.

No live emails were sent, no original production records changed, and no production credentials were entered. Whole-app visual parity, original completed-report/signature workflows and the remaining source-state gaps remain open.

Additional workflow verification: offline photo captured while local server was stopped, inspection completed, cached app reloaded and Blob photo restored, server restarted, sync uploaded the photo to an authenticated /api/files URL and removed the pending banner. Hierarchical trash and restoration preserve previously archived inspection evidence in API tests.

## Dritter Durchgang

Gesamtstatus weiterhin blocked / incomplete für vollständige 1:1-Abnahme. Zusätzliche Originalzustände: alle sechs Anlagekategorien, BST/BSK-Untertypen, Türart, Grundriss-Upload Name/Ebene, Inline-Prüfungsstammdaten einschließlich Ja/Nein. Browserprüfungen: Gerät mit Typ/Rauchschutz/Türart/UUID gespeichert; Prüfung mit veränderten Stammdaten abgeschlossen; Inline-Editor mobil 390×844 geprüft; mehrseitiger PDF-Plan hochgeladen, Seite 2 markiert, neu geladen und Position erhalten. Native PDFs auf 120 Prüfpunkte, Unicode, Seitenzahlen und fehlende Anhänge geprüft. PDF-Blob-Vorschau im IAB durch Browser-Sicherheitsprüfung blockiert; keine Umgehung versucht. 32 automatisierte Tests bestanden.
