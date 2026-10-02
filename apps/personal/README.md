# Persönlicher Schachcoach

Eigenständige Website aus dem bestehenden Sites-Schachcoach. Gegen den Computer (Weiß oder Schwarz), Stockfish-Analyse, PGN-Import/-Export, Partienarchiv, eigener Lernwert und Wiederholung fehlerhafter Stellungen. Keine Onlinegegner.

## Lokal starten

Node 22.13+ (empfohlen 24), dann in diesem Ordner:

```sh
npm ci --workspaces=false
npm run dev
```

http://127.0.0.1:5173 – lokale SQLite-Datenbank in `.data/coach.sqlite`. Der Entwicklungsserver bindet nur an die Loopback-Adresse und benötigt dort kein Passwort. **Nicht als öffentlichen Server verwenden.**

## Vercel

Projektverzeichnis `apps/personal`, Framework „Other“, Build `npm run build`, Ausgabe `public`, Installation `npm ci --workspaces=false`, Node 24.

1. Neon/Postgres verbinden (`DATABASE_URL`), Migration einmal mit `npm run db:migrate` und gesetzter Datenbankvariable ausführen.
2. `SESSION_SECRET` als zufälliges Geheimnis (mind. 32 Zeichen) und `PASSWORD_HASH` als `salt:scrypt-hex` setzen. `scripts/password.js` erzeugt den Hash; das Klartextpasswort nie committen.
3. API und statische Dateien gemeinsam deployen. Ohne Speicherdaten/Zugangskonfiguration bleiben die privaten API-Endpunkte geschlossen (503), kein flüchtiger Ersatzspeicher.

## Datensicherung und Grenzen

- Autoritativer Speicher: Postgres online, SQLite ausschließlich in der lokalen Entwicklung.
- Browserdaten sind nur eine Warteschlange für noch nicht bestätigte Änderungen. Speicherstatus unterscheidet bestätigt/ausstehend/Fehler.
- Optimistischer Versionsvergleich verhindert stilles Überschreiben zwischen Geräten. Bei Konflikt lokale Sicherung exportieren, danach Serverstand laden. Ein JSON-Import ergänzt fehlende Partien; bestehende werden nicht überschrieben. Rating wird beim Import nicht rückwirkend verändert.
- Aktuelle Partie, Archiv und Analysen werden gemeinsam versioniert. Maximale Übertragung 3 MB; große Archive regelmäßig als JSON/PGN sichern. Ein späterer Ausbau sollte einzelne Partien als Datenbankzeilen speichern.
- Zugang über ein persönliches Passwort und HttpOnly/Secure/SameSite-Cookie. Nach 30 Tagen neu anmelden. Login-Limit: 20 Versuche je 15 Minuten pro persönlichem Konto.
- Lern-Elo ist eine unkalibrierte persönliche Orientierung. Tipps, Rücknahmen und Analyse laufender Partien schließen die Partie von der Wertung aus. Computerstufen 400–1600 sind Näherungswerte.
- Computer und Stockfish laufen in separaten Browser-Workern mit Zeitlimits; keine Engine-Arbeit in Vercel-Funktionen. Analyse wird bei ausgeblendetem Tab pausiert.
- Die alte `chatgpt.site` hat einen anderen Browser-Ursprung; dortige LocalStorage-Daten sind nicht automatisch auf Vercel lesbar. Vorhandene Partien per PGN exportieren und hier importieren.

## Prüfung

`npm test` prüft Speicher-Roundtrip/konkurrierende Schreibzugriffe, Login, Farben/Wertung und spezielle Startstellungen. `npm run build` prüft JavaScript-Syntax. Browserprüfung: Computerzug, Reload, Analyse, Archiv und mobile Darstellung.

Stockfish und Figuren: Lizenz-/Quellcodehinweise in der Website und unter `public/vendor` bleiben erhalten.
