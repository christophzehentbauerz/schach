# Persönlicher Schachcoach

Eigenständiger Schachcoach mit Computergegner, Stockfish-Analyse, Partienarchiv und Freundschaftspartien. Jedes Profil hat einen persönlichen Zugangslink und getrennte Ergebnisse.

## Lokal

Node 24, `npm ci --workspaces=false`, anschließend `npm run dev`. Auf http://127.0.0.1:5173 ein Testprofil anlegen. SQLite liegt in `.data/coach.sqlite`; der Entwicklungsserver bindet ausschließlich an Loopback.

## Vercel

Projektverzeichnis `apps/personal`, Framework Other, Build `npm run build`, Ausgabe `public`, Installation `npm ci --workspaces=false`.

- Neon/Postgres über `DATABASE_URL` verbinden und `npm run db:migrate` mit gesetzter Variable ausführen.
- `SESSION_SECRET` muss ein zufälliges Geheimnis mit mindestens 32 Zeichen sein.
- API und statische Dateien zusammen deployen. Ohne Konfiguration sind private APIs geschlossen.
- Für die Migration des ursprünglichen Besitzers einen Spieler mit ID `personal` erstellen. Die gleichnamige vorhandene `coach_state`-Zeile bleibt unverändert. Alte signierte Sitzungen bleiben gültig; neue Zugänge verwenden persönliche Links. Kein Passwort nötig.

## Zugang und Speicherung

Persönliche Links enthalten 256 Bit Zufall; in Postgres liegt nur ihr SHA-256-Hash. Der Token im URL-Fragment wird beim Öffnen entfernt und gegen ein HttpOnly/Secure/SameSite-Cookie getauscht. Sitzung: ein Jahr. Ersatzlinks machen alte Links ungültig, bestehende Sitzungen bleiben angemeldet. Ein verlorener Link ist ohne bestehende Sitzung nur durch den Betreiber wiederherstellbar. Persönliche Links privat aufbewahren, zum Spielen nur den Partielink teilen.

Profile können selbst angelegt werden (20 pro IP und Tag). Zugangsversuche und Spielaktionen sind ebenfalls begrenzt. Gleichnamige Profile bleiben getrennt. Profilwechsel in anderen Tabs können keine alten Solo-Spielstände in das neue Profil schreiben. Solo-Spielstände/Analysen werden pro Profil mit Versionsvergleich gespeichert; ungesendete Änderungen liegen in einer lokalen Warteschlange. Bei Konflikten zuerst Sicherung exportieren. JSON-Import ergänzt fehlende Partien. Grenze: 3 MB je Solo-Snapshot.

## Miteinander spielen

Unter Miteinander eine Einladung erzeugen, Farbe und Bedenkzeit wählen, Partielink teilen. Nur eine zweite Person kann beitreten. Beide sehen anschließend dieselbe dauerhaft gespeicherte Partie; das Brett aktualisiert sich etwa alle drei Sekunden. Die Uhr startet beim Beitritt:

- 30 oder 60 Minuten Gesamtbedenkzeit je Person.
- 1 oder 3 Tage je Zug; mit jedem Zug beginnt die nächste Frist.

Der Server prüft Identität, Zugrecht, Legalität und Version. Parallele veraltete Änderungen werden abgelehnt. Uhren laufen auch offline weiter; Zeitüberschreitung wird bei der nächsten Serverabfrage dauerhaft festgestellt. Aufgabe, Remisangebote, automatische Spielenden, PGN und Analyse abgeschlossener Partien sind enthalten. Die Liste zeigt die letzten 100 Partien; ältere bleiben in der Datenbank. Keine Push-Benachrichtigungen oder automatische Spielersuche.

Computer und Stockfish laufen in Browser-Workern. Lern-Elo ist eine persönliche, unkalibrierte Orientierung für Computerpartien; Freundschaftsergebnisse werden separat gezählt. Der gemeinsame Spielstart fragt zuerst Computer/Freund, danach Stärke/Farbe bzw. Bedenkzeit ab. Computerpartien beginnen erst nach Start; eine laufende Partie lässt sich separat fortsetzen. Stockfish ersetzt die frühere JavaScript-Suche: 400–1200 sind Trainingsstufen mit begrenzten Bewertungsverlusten unter MultiPV-Kandidaten, 1400–2400 nutzen UCI_LimitStrength/UCI_Elo. Vorauswahl 1400. Keine Kalibrierung gegen Chess.com; niedrige Stufen sind keine gemessenen Elo-Werte. Der vollständige Zugverlauf wird an Stockfish übergeben, damit Wiederholungen berücksichtigt werden. Vorhandene Daten der alten chatgpt.site können wegen des anderen Ursprungs per PGN importiert werden.

## Prüfung

`npm test`: Profiltrennung, Linkwechsel, Signaturen, Migration, Versionen, Beitrittsrennen, Zugrecht/Legalität, Schachmatt, Remis, Aufgabe und Uhren. `npm run build`: JavaScript-Syntax. Browserprüfung: Profil anlegen, Einladung, Zug, Reload und mobile Darstellung.

Lizenz-/Quellcodehinweise für Stockfish und Figuren in der Website und `public/vendor` bleiben erhalten.

## Ausführliche Zugerklärungen

Jeder Zug wird in sieben Schritten erklärt: Ausgangslage, konkrete Veränderungen, legale gegnerische Antworten, Bewertungsvergleich, vollständige berechnete Folge, Lernübung und Aussagegrenzen. Die Erklärung nennt Felder, Linienöffnungen, Schläge, Rochade, en passant, Umwandlung, Bauernstruktur und Materialbilanz. Alle angezeigten PV-Halbzüge sind einzeln erläutert und am Brett anwählbar. Angriffslinien sind ausdrücklich von legalen Schlägen und nachgewiesenen Gewinnen getrennt. Bewertungen bei Matt werden nicht als fingierter Bauernverlust angezeigt. Widersprüchliche Suchstände werden offengelegt.

Analysen nutzen den vollständigen bisherigen Zugverlauf, 700 ms je Standardsuche und 3500 ms bei genauer Prüfung des ausgewählten Zuges. Versionierte Analyse-Caches ersetzen ältere Berechnungen; Partie- und Ergebnisdaten bleiben erhalten. Die Texte basieren auf geprüften Brettfakten und Engine-Varianten, nicht auf einem Sprachmodell. Sie behaupten keine vollständige Widerlegung aller anderen möglichen Züge.

## Handy und großes Brett

Über „Brett vergrößern“ wechseln Computer-, Analyse- und Freundesbretter in eine bildschirmfüllende Ansicht. Wenn der Browser die Fullscreen API unterstützt, wird zusätzlich der native Vollbildmodus angefordert; andernfalls bleibt die Seitenansicht ohne störende Oberfläche verfügbar. Hochformat nutzt die Bildschirmbreite, Querformat ordnet Bedienelemente neben dem Brett an. Safe-Area-Abstände, dynamische Bildschirmhöhe, erreichbare Beenden-Schaltfläche und Escape werden berücksichtigt. Figuren werden durch erneutes Antippen abgewählt. Hintergrundelemente sind im Brettmodus nicht fokussierbar; beim Beenden werden Fokus und Scrollposition wiederhergestellt.

Browserprüfung: 390×844 und 844×390, Zug im vergrößerten Computerbrett, Auswahl/Abwahl, Freundesbrett mit Uhren und Status sowie Rückkehr ohne Verlust des Spielstands. Native Browserleisten können nur dort ausgeblendet werden, wo der Browser dies unterstützt.
