# Lokales Lern-Tool

## 1. Was ist die App?

Das lokale Lern-Tool ist eine stark reduzierte Anki-ähnliche Karteikarten-App. Sie läuft vollständig im Browser, speichert alle Daten lokal und sendet keine Lernkarten an externe Dienste.

Die App unterstützt im MVP:

- Stapelübersicht
- Stapel hinzufügen und löschen
- Karten erstellen, bearbeiten und löschen
- Lernen fälliger Karten
- einfache Wiederholungslogik mit `Richtig` und `Falsch`
- Statistiken
- JSON Import und Export
- vorbereitete, aber deaktivierte Hinweise für `.apkg` Import und intelligenten Modus

## 2. Wie starte ich sie?

1. Öffne den Projektordner lokal auf deinem PC.
2. Öffne `index.html` direkt im Browser.
3. Beim ersten Start wird automatisch der Demo-Stapel `IT-Recht` mit drei Demo-Karten angelegt.

Es ist kein Build-Schritt nötig. Es gibt kein Backend, keinen Login, keine Cloud und keine externen APIs.

## 3. Welche Dateien gehören dazu?

```txt
index.html
style.css
script.js
README.md
AGENTS.md
vendor/README.md
```

- `index.html` enthält die Ansichten und Navigation.
- `style.css` enthält das schlichte, helle Layout.
- `script.js` enthält Datenhaltung, Rendering, Validierung, Lernlogik und Import/Export.
- `README.md` erklärt Start, Funktionen und Tests.
- `AGENTS.md` enthält Projektregeln für weitere Codex-Arbeit.
- `vendor/README.md` beschreibt die lokal abzulegenden Bibliotheken für den `.apkg` Import.

## 4. Wie funktioniert die Lernlogik?

Neue Karten starten mit:

```js
interval_minutes = 0
due_at = current_time
correct_count = 0
incorrect_count = 0
last_reviewed_at = null
review_history = []
```

Dadurch sind neue Karten sofort fällig.

### Richtig

```js
new_interval_minutes = old_interval_minutes + 1
due_at = current_time + new_interval_minutes minutes
correct_count = correct_count + 1
last_reviewed_at = current_time
```

Beispiel: Eine neue Karte mit `interval_minutes = 0` kommt nach der ersten richtigen Antwort nach 1 Minute wieder.

### Falsch

```js
new_interval_minutes = Math.max(1, old_interval_minutes - 2)
due_at = current_time + new_interval_minutes minutes
incorrect_count = incorrect_count + 1
last_reviewed_at = current_time
```

Das Intervall fällt nie unter 1 Minute. Eine neue Karte mit `interval_minutes = 0` kommt nach der ersten falschen Antwort ebenfalls nach 1 Minute wieder.

Nach jeder Bewertung wird ein Eintrag in `review_history` gespeichert:

```js
{
  reviewed_at: "2026-06-27T12:30:00.000Z",
  result: "correct",
  old_interval_minutes: 2,
  new_interval_minutes: 3,
  next_due_at: "2026-06-27T12:33:00.000Z"
}
```

## 5. Wie erstelle ich Stapel?

1. Öffne die Ansicht `Hinzufügen`.
2. Gib einen Stapelnamen ein.
3. Klicke auf `Stapel erstellen`.

Validierung:

- leere Stapelnamen sind nicht erlaubt
- doppelte Stapelnamen sind nicht erlaubt
- Leerzeichen am Anfang und Ende werden entfernt

## 6. Wie erstelle ich Karten?

Karten können in `Hinzufügen` oder in `Kartenverwaltung` erstellt werden.

Pflichtfelder:

- Frage
- Antwort

Validierung:

- leere Fragen sind nicht erlaubt
- leere Antworten sind nicht erlaubt
- Leerzeichen am Anfang und Ende werden entfernt

In der `Kartenverwaltung` kannst du Karten außerdem bearbeiten oder löschen.

## 7. Wie funktioniert JSON Import/Export?

### Export

Die Ansicht `Import / Export` enthält den Button `JSON exportieren`. Die App erzeugt eine Datei `learning-tool-backup.json` mit dieser Struktur:

```json
{
  "app": "local-learning-tool",
  "version": 1,
  "exported_at": "2026-06-27T12:00:00.000Z",
  "decks": [],
  "cards": []
}
```

Alle Felder und Review-Historien bleiben erhalten.

### Import

Beim Import prüft die App:

- JSON ist parsebar
- Root ist ein Objekt
- `decks` ist ein Array
- `cards` ist ein Array
- jedes Deck hat mindestens `deck_id` und `deck_name`
- jede Karte hat mindestens `card_id`, `deck_id`, `question` und `answer`

Ungültige Dateien überschreiben lokale Daten nicht. Bei gültigen Dateien fragt die App zuerst:

```txt
Lokale Daten wirklich durch importierte Daten ersetzen?
```

Nur bei Bestätigung werden lokale Daten ersetzt.

## 8. Was ist im MVP noch nicht enthalten?

- kein Backend
- kein Login
- keine Cloud
- keine GitHub-Synchronisierung
- keine externen APIs
- kein Tracking
- keine Analytics
- kein vollständiger `.apkg` Import für Image Occlusion, komplexe Medien und komplexe Custom Templates
- kein intelligenter Modus
- keine KI-Funktion

Die Oberfläche enthält einen funktionierenden Textkarten-Import für `.apkg` Dateien und weiterhin nur einen vorbereiteten Hinweis für den intelligenten Modus.

## Anki .apkg Import

Die App kann Anki `.apkg` Dateien importieren. Der Import läuft vollständig im Browser: Die Datei wird bei der Auswahl nur gemerkt, und erst nach Klick auf `Karten importieren` wird sie gelesen, analysiert und importiert. Bestehende lokale Daten werden dabei nicht gelöscht.

Unterstützt im MVP:

- Basic
- Basic and reversed card
- Basic optional reversed card
- Basic type in answer
- einfache Cloze-Karten

Noch nicht vollständig unterstützt:

- Image Occlusion
- komplexe Medien
- komplexe Custom Templates

Technisch benötigt:

- `vendor/jszip.min.js`
- `vendor/sql-wasm.js`
- `vendor/sql-wasm.wasm`
- `vendor/zstd.js` für neue Anki-Dateien mit Zstandard-komprimierter `collection.anki21b`

Die Daten bleiben lokal im Browser. Es gibt keine CDN-Abhängigkeit, keine externen APIs und keine Cloud-Synchronisierung. Wenn `collection.anki21b` vorhanden, aber ohne lokalen Zstandard-Decoder nicht lesbar ist, zeigt die App eine klare Fehlermeldung und importiert nicht blind eine mögliche `collection.anki2`-Fallback-/Platzhalterdatenbank.

## Lokale Vendor-Dateien für Anki Import

Für den APKG-Import werden lokale Bibliotheken benötigt:

- JSZip für APKG als ZIP (`vendor/jszip.min.js`)
- sql.js für SQLite (`vendor/sql-wasm.js` und `vendor/sql-wasm.wasm`) oder der integrierte read-only SQLite-Fallback
- ein Zstandard-Decoder für `collection.anki21b` (`vendor/zstd.js`)

Die App nutzt keine CDN-Dateien und sendet keine Daten an externe Dienste. `vendor/zstd.js` muss vor `script.js` geladen werden.

Wenn der Fehler erscheint:

```txt
collection.anki21b ist Zstandard-komprimiert, aber kein lokaler Zstandard-Decoder wurde geladen
```

dann fehlt ein lokaler Zstandard-Decoder im Vendor-Ordner oder er stellt nicht `globalThis.fzstd.decompress(...)` bereit. Baue `vendor/zstd.js` mit `npm run build:vendor:zstd` neu.

### Test mit `IT-Recht.apkg`

1. Prüfe, dass der Ordner `vendor/` mit den lokalen Import-Dateien vorhanden ist.
2. Öffne `index.html` direkt im Browser.
3. Öffne `Import / Export`.
4. Wähle `IT-Recht.apkg` aus.
5. Klicke auf `Karten importieren`.
6. Prüfe die Import-Zusammenfassung mit Datenbanktyp, gefundenen Karten, importierten Karten, Duplikaten und Warnungen.
7. Starte danach den importierten Stapel in der Lernansicht. Importierte Karten sind sofort fällig und nutzen die bestehende Richtig/Falsch-Logik.

Bekannte Grenzen des Imports:

- Medien werden im MVP nicht vollständig übernommen; Text wird bevorzugt stabil importiert.
- Image-Occlusion-Karten werden übersprungen.
- Sehr komplexe Custom Templates können übersprungen oder vereinfacht werden.
- Neue `collection.anki21b` Dateien benötigen bei Zstandard-Kompression einen passenden lokalen Decoder.

## Testanleitung

Führe die Tests manuell im Browser aus, indem du `index.html` öffnest. Für einen sauberen Erststart kannst du in den DevTools den LocalStorage-Schlüssel `local-learning-tool-data-v1` löschen und die Seite neu laden.

| Test case | Input | Expected result |
| --- | --- | --- |
| Erster Start | keine lokalen Daten | Demo-Stapel `IT-Recht` wird erstellt |
| Stapel erstellen | Name: `Datenschutz` | Stapel erscheint in Übersicht |
| Leerer Stapelname | leerer Name | Fehlermeldung, kein Stapel |
| Karte erstellen | Frage + Antwort | Karte wird gespeichert |
| Leere Frage | Antwort vorhanden | Fehlermeldung |
| Leere Antwort | Frage vorhanden | Fehlermeldung |
| Lernen starten | fällige Karte vorhanden | Frage wird angezeigt |
| Antwort anzeigen | Klick auf Button | Antwort wird sichtbar |
| Erste richtige Antwort | `interval_minutes = 0` | neues Intervall = 1, `due_at = jetzt + 1 Minute` |
| Zweite richtige Antwort | `interval_minutes = 1` | neues Intervall = 2, `due_at = jetzt + 2 Minuten` |
| Falsche Antwort | `interval_minutes = 5` | neues Intervall = 3 |
| Falsche Antwort bei niedrigem Intervall | `interval_minutes = 1` | neues Intervall = 1 |
| Keine fälligen Karten | alle `due_at` in Zukunft | Meldung und nächste Fälligkeit |
| JSON Export | vorhandene Daten | valide JSON-Datei |
| JSON Import gültig | valide Backup-Datei | Daten werden nach Bestätigung ersetzt |
| JSON Import ungültig | kaputte Datei | lokale Daten bleiben erhalten |
| Sonderzeichen | Umlaute, Anführungszeichen | bleiben nach Export/Import erhalten |
| Neue Anki-Datei | `collection.anki21b` vorhanden | `collection.anki21b` wird bevorzugt oder klarer Fehler angezeigt |
| Fallback-Platzhalter | `collection.anki2` enthält nur Update-Hinweis | Platzhalter wird nicht importiert |
| Cloze einfach | `{{c1::Begriff}}` | Frage mit Lücke und Antwort mit Begriff |
| Scheduler nach Import | importierte Karte richtig | `interval_minutes` wird 1, `due_at = jetzt + 1 Minute` |

## Anki .apkg Import

Die App kann Anki `.apkg` Dateien importieren.

Für den lokalen Import werden Vendor-Dateien benötigt:

- `vendor/jszip.min.js`
- `vendor/sql-wasm.js`
- `vendor/sql-wasm.wasm`
- `vendor/zstd.js`

Neue Anki-Dateien enthalten oft `collection.anki21b`. Diese Datei ist häufig Zstandard-komprimiert. Dafür wird lokal `vendor/zstd.js` benötigt.

Der Import nutzt keine externen APIs und keine CDN-Dateien.

### Test-Fixture

Im Repository liegt:

`fixtures/anki/IT-Recht.apkg`

Zum Prüfen:

```bash
npm run build:vendor:zstd
node scripts/inspect-apkg.mjs
```

Danach `index.html` öffnen und die Datei über `Import / Export` importieren.
