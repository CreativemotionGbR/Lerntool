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
```

- `index.html` enthält die Ansichten und Navigation.
- `style.css` enthält das schlichte, helle Layout.
- `script.js` enthält Datenhaltung, Rendering, Validierung, Lernlogik und Import/Export.
- `README.md` erklärt Start, Funktionen und Tests.
- `AGENTS.md` enthält Projektregeln für weitere Codex-Arbeit.

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
- kein vollständig implementierter `.apkg` Import
- kein intelligenter Modus
- keine KI-Funktion

Die Oberfläche zeigt nur vorbereitete Hinweise für `.apkg` Import und intelligenten Modus.

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
