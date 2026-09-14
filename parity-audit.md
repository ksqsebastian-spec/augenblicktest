# Funktionsabgleich mit dem Original

Stand: 14.09.2026. **Gesamtstatus: noch keine vollständig bestätigte 1:1-Kopie.**

Der Abgleich erfolgt anhand der angemeldeten Original-App unter app.augenblick-control.de. Der ursprüngliche Bestand enthält ein Objekt, ein Gebäude und eine Brandschutztür mit Feststellanlage. Mit ausdrücklicher Freigabe wurde am 14.09. ein separates „FUNKTIONSTEST – KEINE ECHTE PRÜFUNG“-Objekt mit fiktivem Gebäude/Gerät, einem Testprotokoll und einer gezeichneten TEST-Signatur angelegt. Der echte Bestand wurde nicht verändert. Nicht zugängliche externe Workspaces und fremde Serverlogik sind weiterhin nicht vollständig verifiziert.

| Bereich | Stand im Nachbau | Nachweis / Grenze |
|---|---|---|
| Dashboard / Navigation | umgesetzt | Desktop und mobile Ansicht geprüft; andere Testdaten |
| Objekte / Gebäude | Anlegen, Bearbeiten, Übersicht und Verknüpfungen | Löschen einschließlich abhängiger Datensätze und wiederherstellbarer Papierkorb ergänzt; API-Test |
| Geräte | Kategorien, Stammdaten, Such-, Objekt-, Gebäude- und Statusfilter | FLS/BST/BSK/RWM/BSB/CPR-Anlageformulare geprüft; Typen, Rauchschutz, Türart und zusätzliche Klappen-/Melderfelder ergänzt. UUID-Übernahme und echte QR-Erkennung aus einer Bilddatei im Browser getestet; Kamera geräteabhängig noch zu prüfen. |
| FSA-Jahreswartung | 27 Prüfpunkte einschließlich 9 FSA-Zusatzpunkten | Browser: vollständige Prüfung gespeichert und Bericht gelesen |
| Prüfungsart / Wartungsarbeiten | Auswahl und unveränderliche Dokumentation | Jahreswartung im Browser getestet |
| Monatsprüfung | 6 Prüfpunkte | Online und offline inkl. anschließendem Sync getestet |
| Eigene Prüfprotokolle | Felder, Prüfpunkte, Reihenfolge, Prüfungsarten, Wartung, Objektauswahl, Norm, Intervalle | Browser: Vorlage → CPR-Gerät → abgeschlossener Bericht |
| Stammdaten während der Prüfung | feldweiser Editor mit Speichern/Abbrechen und Ja/Nein; Typ/FSA-Auswahl | Browser: geänderte Angaben in abgeschlossener Prüfung; API: Snapshot unveränderlich, Gerät bleibt unverändert |
| Standardvorlagen | editierbare Listen für Kategorien | Prüfpunkte erfasst; keine fachliche Zertifizierung |
| Labels | Name, 14 Farben, Vorschau, Bearbeiten, Archivieren, Aufgabenzuordnung | Browser-Speicherung und API-Validierung |
| SLA-Richtlinien | Reaktions-/Lösungszeiten pro Priorität; serverseitige Fristen und Eskalationsprotokoll | API-Test inkl. einmaligem Ereignis; Hintergrundlauf alle 5 Minuten |
| Aufgabenübersicht | 7/30/90 Tage, Gesamt, Status, Priorität, Auslastung, Lösungszeit und SLA | Berechnet aus gespeicherten Aufgaben; leere Originaldaten als Referenz |
| Subunternehmer | befristete Einladungen, Objekt-/Gebäudefreigaben, Erstellen-Rechte, Widerruf | Serverseitige Isolation von Daten und Dateien getestet; Einladung über Link |
| Externe Workspaces | getrennte Firmenarbeitsbereiche, Wechsel, bestehendes Konto per Einladungslink beitreten, Widerruf | API-Test: gleiche Datensatz-IDs in zwei Arbeitsbereichen isoliert; fremde Gebäude/Dateien verweigert; Rollen pro Firma; Widerruf betrifft nur die jeweilige Firma. Browser: zweiten leeren Testarbeitsbereich erstellt und erfolgreich zurück zum Bestand gewechselt. |
| Firmenprofil | Adresse, PLZ, Ort, Kontakt, Webseite, USt-ID, Logo, Speicherverbrauch | Profil erscheint als Snapshot in neuen Prüfungen |
| Profil / Passwort | eigenes Passwort ändern; andere Sitzungen werden beendet | API-Tests; kein Produktionspasswort durch Agent gesetzt |
| UUID-/QR-Generator | UUIDs, Typfilter, Suchfeld, Kopieren, QR-Labels, Firmen-Webseiten-QR | Browser: Erstellen und gerenderte QR-Labels |
| PDF-Dateiname | Segmente je Kategorie, Feld/Text, Trenner, Vorschau, Reihenfolge | Konfiguration wird für Druck-Dateinamen verwendet; Funktionstest |
| Berichte / Archiv | 5 Berichtskategorien, Filter, Druckansicht, CSV, Archiv und Wiederherstellung | Native PDF-Erstellung ergänzt; 120 Prüfpunkte, Umlaute und Seitenzahlen automatisiert geprüft. Exaktes Original-Layout offen. PDF-Vorschau im eingebauten Browser durch dessen Sicherheitssperre nicht prüfbar. |
| Grundrisse | private Bild-/PDF-Dateien, Name/Ebene, Zoom, seitenbezogene Pins | Browser: PDF auf Seite 2 markiert, nach Reload erhalten. API: Koordinaten, Gebäudezuordnung und Dateifreigabe geprüft. Original-Bildplan: Auswahl → Position → Bestätigen überprüft und im Nachbau ergänzt, einschließlich Suche/Kategorie/Zoom/Einpassen. Original-PDF-Konvertierung meldete einen Fehler und hinterließ dennoch einen leeren Planeintrag. |
| Import | CSV/XLSX, Vorschau, Wiederaufnahme nach Fehler | echter XLSX-Import im Browser |
| Offline | Stammdaten, Entwürfe, Prüfungswarteschlange, manueller Sync, gebäudeweise Datei-Vorbereitung | echter Serverausfall getestet; Offline-Fotoaufnahme, Neuladen und anschließender Upload getestet; vorbereiteter PDF-Grundriss mit Pin nach Offline-Reload sichtbar; PDF aus gespeichertem Foto ohne Server erzeugt |
| Erinnerungen | Servercode, Empfängerwahl, Vorlauf, tägliche Zusammenfassung | Versand mit Mock getestet; Absenderdomain noch nicht eingerichtet; verbundenes Cloudflare-Konto enthält keine Domain |
| Einladungs-E-Mails | Versandcode vorhanden, manueller Link bleibt verfügbar | Absenderdomain noch nicht eingerichtet; verbundenes Cloudflare-Konto enthält keine Domain |
| Passwort vergessen | 30-Minuten-Link, einmalige Nutzung, Sitzungswiderruf | Mock-Versand und API-Tests; live vom Absender abhängig |
| Original-Verträge / Abo | nicht übernommen | Verträge, Zahlungen und Abonnement des fremden Anbieters gehören nicht zu dieser eigenen Installation |
| Unterschriften / Prüfabschluss | Ergebnisdialog, offener Entwurf, spätere Unterschrift, Nicht prüfbar mit Pflichtgrund, Wiederholung | Original-Testprotokoll mit TEST-Signatur abgeschlossen. Nachbau: offener Entwurf → Unterschrift → Reload geprüft; unveränderliche Signatur, Serverzeit und Grund im PDF/Aktivitätsprotokoll; automatisierte Tests. Original-PDF-Download ausgelöst, Datei im eingebauten Browser nicht als zugängliche Referenz zurückgegeben. |
| Bestandsdatenübernahme | sichtbarer Originalbestand übernommen | Objekt Test, Flügel A, BST-B16A einschließlich Hersteller/Modell/Standort/UUID sowie Firmenname Seehafer Elemente in Cloudflare gespeichert und nach Reload geprüft. Original enthält keine abgeschlossenen Prüfungen und keine Dateien. |

## Wichtigste noch offene Schritte

1. E-Mail-Versand ist auf ausdrücklichen Wunsch vorerst ausgenommen. Kein Kauf, keine Domainregistrierung.
2. Ein vorhandenes abgeschlossenes Originalprotokoll/Export als Referenz verwenden, um PDF-Inhalt, Unterschriften, Layout und Archivaktionen vollständig abzugleichen.
3. Grundrissplatzierung und firmenübergreifender Wechsel sind implementiert und getestet. Original-PDF-Konvertierung scheiterte beim fiktiven Test; exaktes Original-PDF-Layout bleibt daher nicht vollständig abgeglichen.
4. Vollständigen Desktop-/Mobilvergleich sämtlicher Detailzustände abschließen. Eine vollständige 1:1-Freigabe ist bis dahin ausdrücklich nicht erteilt.

## Dritter Durchgang

32 Tests bestanden. PDF-, Grundriss- und Inline-Stammdatenfunktionen ergänzt; externe Dateifreigaben gegen Verweise in frei editierbaren Notizen abgesichert. Originaldaten bleiben während der Erfassung unverändert.

Weitere Prüfung: QR-Bildscan öffnet das richtige Gerät. Erfolgsnachrichten verschwinden automatisch und fangen keine Klicks auf darunterliegende Bedienelemente ab. 34 automatisierte Tests bestanden. Zum damaligen Stand war der Firmenwechsel offen; inzwischen umgesetzt und gegen zwei lokale Arbeitsbereiche getestet. Ein zweiter Original-Arbeitsbereich steht weiterhin nicht als Referenz zur Verfügung.

## Vierter Durchgang – freigegebene Originaltests

38 Tests bestanden. Ergänzt: Ergebnis- und Signaturdialog, offene gespeicherte Prüfungen, Entwurfsbearbeitung, Wiederholung, Signatur im Bericht/PDF, Pflichtbegründung und Audit-Ereignis für nicht durchführbare Prüfungen. Offene Protokolle beeinflussen den Prüfstatus nicht. Grundrisspositionen werden erst nach Bestätigung gespeichert. Die Prüfungsliste unterstützt Suche nach UUID/Gerätecode/Prüfer/Kategorie und Objekt-/Kategoriefilter; neue Geräte erhalten automatisch einen Kategoriecode.

Original-Testobjekt: `8Hr9B6bk2SWqI2FLdmOm`, Testgebäude: `3mGFctfKxT6SOqPhVDFn`, Testgerät: `zryAveFsW2JxDIpHqwKL`, Testprotokoll: `aNsY7JiMa8PhcAr2tNV8`. Klar gekennzeichnete fiktive Daten bleiben als Referenz erhalten. Keine Originalbestandsdaten gelöscht.

E-Mail: Cloudflare Registrar und DNS-Zonen enthalten keine eigene Domain. `seehafer-pruefungen.com` war zum Prüfzeitpunkt verfügbar (Registrierung 10,46 USD/Jahr, Verlängerung ebenfalls 10,46 USD). Der Nutzer hat anschließend ausdrücklich jeden Geldausgang untersagt und E-Mail-Funktionen vorerst aus dem Fertigstellungsumfang genommen. Keine Domain registriert, nichts gekauft. Versand bleibt deaktiviert; Einladungslinks stehen zur Verfügung.

## Arbeitsbereiche

39 Tests bestanden. Migration `0004_workspaces.sql` übernimmt bestehende Benutzer/Sitzungen in die kontoweite Anmeldung und ordnet den vorhandenen Bestand dem Hauptarbeitsbereich zu. Jeder weitere Arbeitsbereich verwendet eigene Tabellen für Mitglieder, Datensätze, Dateien, Vorlagen, Audit und Zugangsfreigaben. Jeder API-Aufruf prüft die aktive Mitgliedschaft; Rechte werden pro Arbeitsbereich bestimmt. IndexedDB-Schlüssel werden pro Arbeitsbereich getrennt. Ein Wechsel mit nicht synchronisierten Prüfungen ist gesperrt.

Browsernachweis: „Lokale zweite Testfirma“ erstellt, leerer Bestand, anschließend Rückwechsel zum vorhandenen Testbestand. Gespeicherte Signatur bleibt nach Reload vorhanden.
