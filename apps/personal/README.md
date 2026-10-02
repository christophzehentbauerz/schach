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

Computer und Stockfish laufen in Browser-Workern. Lern-Elo ist eine persönliche, unkalibrierte Orientierung für Computerpartien; Freundschaftsergebnisse werden separat gezählt. Computerstufen 400–1600 sind Näherungswerte. Vorhandene Daten der alten chatgpt.site können wegen des anderen Ursprungs per PGN importiert werden.

## Prüfung

`npm test`: Profiltrennung, Linkwechsel, Signaturen, Migration, Versionen, Beitrittsrennen, Zugrecht/Legalität, Schachmatt, Remis, Aufgabe und Uhren. `npm run build`: JavaScript-Syntax. Browserprüfung: Profil anlegen, Einladung, Zug, Reload und mobile Darstellung.

Lizenz-/Quellcodehinweise für Stockfish und Figuren in der Website und `public/vendor` bleiben erhalten.
