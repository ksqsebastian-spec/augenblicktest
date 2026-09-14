# Funktionsabgleich mit dem Original

Stand: 14.09.2026. **Gesamtstatus: noch keine vollständig bestätigte 1:1-Kopie.**

Der Abgleich erfolgt anhand der angemeldeten Original-App unter app.augenblick-control.de. Das Konto enthält ein Objekt, ein Gebäude und eine Brandschutztür mit Feststellanlage, aber keine abgeschlossenen Prüfungen. Fremde Serverlogik, gesperrte Zustände und nicht vorhandene Beispielberichte können damit nicht vollständig verifiziert werden. Im Original wurden keine Datensätze, Zugänge oder Prüfungen gespeichert.

| Bereich | Stand im Nachbau | Nachweis / Grenze |
|---|---|---|
| Dashboard / Navigation | umgesetzt | Desktop und mobile Ansicht geprüft; andere Testdaten |
| Objekte / Gebäude | Anlegen, Bearbeiten, Übersicht und Verknüpfungen | Löschen einschließlich abhängiger Datensätze und wiederherstellbarer Papierkorb ergänzt; API-Test |
| Geräte | Kategorien, Stammdaten, Such-, Objekt-, Gebäude- und Statusfilter | Einzelne kategoriespezifische Eingabevarianten noch nicht vollständig abgeglichen |
| FSA-Jahreswartung | 27 Prüfpunkte einschließlich 9 FSA-Zusatzpunkten | Browser: vollständige Prüfung gespeichert und Bericht gelesen |
| Prüfungsart / Wartungsarbeiten | Auswahl und unveränderliche Dokumentation | Jahreswartung im Browser getestet |
| Monatsprüfung | 6 Prüfpunkte | Online und offline inkl. anschließendem Sync getestet |
| Eigene Prüfprotokolle | Felder, Prüfpunkte, Reihenfolge, Prüfungsarten, Wartung, Objektauswahl, Norm, Intervalle | Browser: Vorlage → CPR-Gerät → abgeschlossener Bericht |
| Standardvorlagen | editierbare Listen für Kategorien | Prüfpunkte erfasst; keine fachliche Zertifizierung |
| Labels | Name, 14 Farben, Vorschau, Bearbeiten, Archivieren, Aufgabenzuordnung | Browser-Speicherung und API-Validierung |
| SLA-Richtlinien | Reaktions-/Lösungszeiten pro Priorität; serverseitige Fristen und Eskalationsprotokoll | API-Test inkl. einmaligem Ereignis; Hintergrundlauf alle 5 Minuten |
| Aufgabenübersicht | 7/30/90 Tage, Gesamt, Status, Priorität, Auslastung, Lösungszeit und SLA | Berechnet aus gespeicherten Aufgaben; leere Originaldaten als Referenz |
| Subunternehmer | befristete Einladungen, Objekt-/Gebäudefreigaben, Erstellen-Rechte, Widerruf | Serverseitige Isolation von Daten und Dateien getestet; Einladung über Link |
| Externe Workspaces | eigener externer Zugang im Nachbau | Workspace-Wechsel zwischen mehreren unabhängigen Firmen noch nicht umgesetzt |
| Firmenprofil | Adresse, PLZ, Ort, Kontakt, Webseite, USt-ID, Logo, Speicherverbrauch | Profil erscheint als Snapshot in neuen Prüfungen |
| Profil / Passwort | eigenes Passwort ändern; andere Sitzungen werden beendet | API-Tests; kein Produktionspasswort durch Agent gesetzt |
| UUID-/QR-Generator | UUIDs, Typfilter, Suchfeld, Kopieren, QR-Labels, Firmen-Webseiten-QR | Browser: Erstellen und gerenderte QR-Labels |
| PDF-Dateiname | Segmente je Kategorie, Feld/Text, Trenner, Vorschau, Reihenfolge | Konfiguration wird für Druck-Dateinamen verwendet; Funktionstest |
| Berichte / Archiv | 5 Berichtskategorien, Filter, Druckansicht, CSV, Archiv und Wiederherstellung | Native, zum Original identische PDF-Dateien und Langbericht-Seitenumbrüche noch offen |
| Grundrisse | private Bild-/PDF-Dateien, Bild-Pins | Dateizugriff getestet; PDF-Pins/Original-Gesten noch nicht vollständig geprüft |
| Import | CSV/XLSX, Vorschau, Wiederaufnahme nach Fehler | echter XLSX-Import im Browser |
| Offline | Stammdaten, Entwürfe, Prüfungswarteschlange, manueller Sync | echter Serverausfall getestet; Offline-Fotoaufnahme, Neuladen und anschließender Upload im Browser getestet |
| Erinnerungen | Servercode, Empfängerwahl, Vorlauf, tägliche Zusammenfassung | Versand mit Mock getestet; Absenderdomain noch nicht eingerichtet |
| Einladungs-E-Mails | Versandcode vorhanden, manueller Link bleibt verfügbar | Absenderdomain noch nicht eingerichtet |
| Passwort vergessen | 30-Minuten-Link, einmalige Nutzung, Sitzungswiderruf | Mock-Versand und API-Tests; live vom Absender abhängig |
| Original-Verträge / Abo | nicht übernommen | Verträge, Zahlungen und Abonnement des fremden Anbieters gehören nicht zu dieser eigenen Installation |
| Unterschriften / fertige Original-PDFs | noch nicht bestätigt | Im Originalkonto sind keine abgeschlossenen Protokolle als Referenz vorhanden |
| Bestandsdatenübernahme | noch nicht durchgeführt | Nachbau enthält keine aus dem Original migrierten Produktionsdaten |

## Wichtigste noch offene Schritte

1. Absenderadresse und verifizierte Versanddomain einrichten; dann realen E-Mail-Versand prüfen.
2. Ein vorhandenes abgeschlossenes Originalprotokoll/Export als Referenz verwenden, um PDF-Inhalt, Unterschriften, Layout und Archivaktionen vollständig abzugleichen.
3. PDF-Grundrissinteraktionen und firmenübergreifenden Workspace-Wechsel vervollständigen.
4. Vollständigen Desktop-/Mobilvergleich sämtlicher Detailzustände abschließen. Eine vollständige 1:1-Freigabe ist bis dahin ausdrücklich nicht erteilt.
