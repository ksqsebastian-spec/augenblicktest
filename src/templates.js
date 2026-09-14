export const categories={FLS:'Feuerlöscher',BST:'Brandschutztür',BSK:'Brandschutzklappe',BSB:'Brandschutzbegehung',RWM:'Rauchwarnmelder',CPR:'Sonstiges'};
const lines=s=>s.trim().split('\n').map(x=>x.trim());
export const defaults={
 BST:lines(`Zulassung / CE-Kennzeichnung vorhanden und lesbar
Typenschild vorhanden und vollständig
Türblatt ohne Beschädigung (Dellen, Risse, Verformung)
Zarge ohne Beschädigung
Dichtungen vorhanden und unbeschädigt
Spaltmaße innerhalb der Toleranz
Drückergarnitur / Beschläge fest und funktionsfähig
Schloss funktionsfähig
Keine unzulässigen Veränderungen
Keine Verkeilung / Blockierung
Kennzeichnung «Brandschutztür» vorhanden
Verglasung intakt (wenn vorhanden)
Tür schließt selbstständig und vollständig
Türschließer schließt aus jeder Position
Schließgeschwindigkeit angemessen
Schließkraft ausreichend
Türblatt rastet in Zarge ein
Verriegelung greift korrekt`),
 monthly:lines(`Feststellvorrichtung frei von sichtbarer Beschädigung
Tür schließt selbsttätig nach Auslösung vollständig
Handauslösung funktionsfähig
Keine mechanischen Behinderungen im Schwenkbereich
Kennzeichnung und Bedienungsanleitung vorhanden und lesbar
Türblatt und Dichtungen ohne sichtbare Schäden`),
 FLS:lines(`Äußerer Zustand
Beschilderung / Kennzeichnung
Plombierung intakt
Druckanzeige / Manometer
Schlauch und Düse
Wandhalterung / Standsicherheit
Zugänglichkeit
Gewichtskontrolle / Füllmenge
Korrosion / Beschädigung
Instandhaltungsnachweis / Prüfplakette
Sicherungsstift
Lesbarkeit Bedienungsanleitung`),
 BSK:lines(`Sichtprüfung Gesamtzustand
Einbaulage korrekt
Befestigung / Verankerung
Gehäuse / Rahmen
Klappenblatt
Dichtungen
Federrücklauf / Federkraft
Endlage geschlossen
Auslösemechanismus
Schmelzlot / thermische Auslösung
Anschlüsse / Leitungen
Revisionsöffnung zugänglich
Beschriftung / Kennzeichnung
Brandschutzverkleidung
Umgebungsfreiheit
Funktionsprüfung komplett`),
 RWM:lines(`Rauchwarnmelder vorhanden und montiert
Montageort korrekt (Deckenmitte, Mindestabstände)
Keine Beschädigungen am Gehäuse
Keine Verschmutzung / Verstaubung
Öffnungen für Raucheintritt frei
Keine Hindernisse im Umkreis von 50 cm
Funktionstest über Prüftaste — Alarm ausgelöst
Akustisches Signal ausreichend laut
LED-Anzeige funktioniert
Batterie-Warnung nicht aktiv
Herstellerangaben / Typenschild lesbar
Herstellungsdatum / Ablaufdatum prüfen (max. 10+6 Mon.)
Wechsel erforderlich`),
 BSB:lines(`Flucht- und Rettungswege sind frei zugänglich (keine Hindernisse, keine Lagerung).
Fluchtwegbreite ausreichend gemäß ASR A2.3 (Mindestbreite je nach Personenzahl).
Rettungsweglänge eingehalten (max. zulässige Länge nach Bauordnung bzw. Brandschutzkonzept).
Brandlastfreiheit der Fluchtwege gewährleistet.
Bodenbelag in Fluchtwegen rutschfest und unbeschädigt.
Allgemeinbeleuchtung der Fluchtwege funktionsfähig.
Sicherheitsbeleuchtung vorhanden und funktionsfähig.
Flucht- und Rettungsplan vorhanden und aktuell.
Flucht- und Rettungsplan an erforderlichen Stellen sichtbar ausgehängt.
Wegeführung im Verlauf erkennbar markiert (Bodenmarkierungen, Wegweiser).
Notausgänge eindeutig mit Rettungszeichen gekennzeichnet.
Notausgänge frei zugänglich, nicht verstellt oder verschlossen.
Türen ohne Hilfsmittel in Fluchtrichtung leicht zu öffnen.
Bei mehr als 20 Personen: Türen öffnen in Fluchtrichtung.
Notausgang führt ins Freie oder in einen gesicherten Bereich.
Panikverschlüsse bzw. Notausgangsverschlüsse funktionsfähig.
Selbstschließende Türen schließen vollständig und ohne Festklemmen.
Brandschutztüren nicht verkeilt, nicht festgestellt.
Brandschutztüren nicht durch Gegenstände blockiert.
Keine sichtbaren Beschädigungen an Brandschutztüren.
Revisionsöffnungen von Brandschutzklappen zugänglich für separate Wartung.
Brandschotts an Wand- und Deckendurchführungen sichtbar intakt.
Brandschutzeinrichtungen entsprechend gekennzeichnet.
Anzahl und Verteilung Feuerlöscher gemäß ermitteltem Löschmittelbedarf nach ASR A2.2.
Feuerlöscher gut sichtbar.
Feuerlöscher frei zugänglich, nicht verstellt.
Feuerlöscher in geeigneter Höhe montiert (Tragegriff in der Regel max. ca. 1,5 m).
Feuerlöscher-Standorte mit Brandschutzzeichen gekennzeichnet.
Prüfplakette der letzten Wartung vorhanden und nicht abgelaufen (visuell).
Wandhydranten zugänglich und ohne sichtbare Schäden (sofern vorhanden).
Löschdecken zugänglich und ohne sichtbare Schäden (sofern vorhanden).
Brandmeldeanlage in Betrieb (Sammelanzeige ohne Störung).
Handfeuermelder zugänglich und nicht verstellt.
Handfeuermelder mit Brandschutzzeichen gekennzeichnet.
Alarmierungseinrichtungen vorhanden und funktionsfähig (Sirene, Hausalarm).
Brandmeldezentrale zugänglich und gekennzeichnet.
Feuerwehr-Schlüsseldepot bzw. Feuerwehr-Informationszentrale ordnungsgemäß gekennzeichnet (sofern vorhanden).
RWA-Anlagen vorhanden gemäß Brandschutzkonzept.
Auslöseeinrichtungen für RWA zugänglich und gekennzeichnet.
RWA-Öffnungen frei (nicht durch Lagerung blockiert).
Rettungszeichen vorschriftsgemäß angebracht und vollständig.
Brandschutzzeichen vorhanden (Feuerlöscher, BMA, Handfeuermelder).
Verbotszeichen vorhanden, sofern erforderlich (z. B. Rauchverbot).
Warnzeichen vorhanden, sofern erforderlich.
Kennzeichnung lesbar, nicht verschmutzt oder beschädigt.
Nachleuchtende Kennzeichnung funktionsfähig.
Brandschutzordnung Teil A vorhanden und ausgehängt.
Brandschutzordnung Teil B vorhanden (für alle Beschäftigten).
Brandschutzordnung Teil C vorhanden (für Personen mit besonderen Aufgaben).
Brandschutzordnung aktuell und regelmäßig überprüft.
Brandschutzbeauftragter gemäß betrieblicher Erfordernis bestellt.
Ausreichende Anzahl Brandschutzhelfer ausgebildet (Empfehlung mind. 5 % der Beschäftigten).
Brandschutzhelfer-Ausbildung dokumentiert.
Räumungsübungen regelmäßig durchgeführt und dokumentiert.
Brandschutzunterweisungen aktuell (mindestens jährlich).
Feuerwehrplan vorhanden, sofern erforderlich.
Alarmplan vorhanden.
Brennbare Flüssigkeiten ordnungsgemäß gelagert.
Druckgasflaschen ordnungsgemäß gelagert (stehend, gesichert, ggf. außenliegend).
Keine unzulässigen Brandlasten in Fluchtwegen, Treppenhäusern oder vor Brandschutztüren.
Ausreichender Abstand brennbarer Materialien zu Zündquellen.
Abfallbehälter mit selbstschließendem Deckel (in brandgefährdeten Bereichen).
Lithium-Ionen-Akkus und Ladestationen mit ausreichendem Abstand zu brennbaren Materialien.
Keine sichtbaren Beschädigungen an Kabeln, Steckdosen, Verteilern.
Keine Mehrfachsteckdosen-Kaskaden (Steckdosenleisten in Reihe).
Elektrische Geräte mit gültiger Prüfplakette nach DGUV V3 (visuell).
Verteilerkästen zugänglich und gekennzeichnet.
Keine Lagerung in oder vor Verteilerkästen.`),
 CPR:[]
};
export const assetFields={FLS:['Baujahr','Seriennummer','Löschmittelart','Füllmenge','Brandklassen'],BST:['Hersteller','Modell','Baujahr','Zulassungs-Nr.','Feuerwiderstandsklasse','Türart (1-/2-flügelig)','Feststellanlage'],BSK:['Hersteller','Modell','Baujahr','Seriennummer'],RWM:['Hersteller','Modell','Baujahr','Seriennummer'],BSB:[],CPR:['Hersteller','Modell','Seriennummer']};
