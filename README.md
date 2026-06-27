# Lerntool

Ein vollständig lokal laufendes Browser-Lerntool für einfache Karteikarten-Stapel. Die App wird ohne Build-Schritt direkt über `index.html` geöffnet und speichert Lernkarten, Stapel und Review-Daten im Browser-`localStorage`.

## Funktionen

- Stapel und Lernkarten lokal erstellen
- Karten wiederholen und Review-Ergebnisse speichern
- Daten als JSON-Datei exportieren
- Optionale manuelle GitHub-Synchronisierung als Backup

## GitHub-Synchronisierung

Die Synchronisierung ist optional und läuft nur, wenn du sie manuell startest. Es gibt keinen automatischen Hintergrund-Sync und kein Backend. Die App nutzt ausschließlich die GitHub REST API.

Standardpfad der Backup-Datei im Repository:

```txt
learning-tool-data/data.json
```

### Einrichtung

1. Erstelle in GitHub ein Repository oder nutze ein bestehendes Repository.
2. Erstelle einen GitHub Personal Access Token mit Schreibzugriff auf Repository-Inhalte.
3. Öffne `index.html` im Browser.
4. Trage Repository-Besitzer, Repository-Name, Branch, Dateipfad und Token im Abschnitt „GitHub-Synchronisierung“ ein.
5. Speichere die Einstellungen.

### Token-Sicherheit

Der Token ist nicht im Code hinterlegt. Standardmäßig wird er nur in `sessionStorage` gespeichert und verschwindet nach dem Schließen des Browsers.

Optional kann „Token dauerhaft lokal speichern“ aktiviert werden. Dann wird der Token in `localStorage` gespeichert. Nutze diese Option nur auf deinem eigenen PC.

### Manuelle Aktionen

- **Lokale Daten zu GitHub hochladen** schreibt die aktuellen Browser-Daten in die JSON-Datei im Repository.
- **Daten von GitHub herunterladen** lädt die JSON-Datei zunächst nur in den Speicher der App.
- **Lokale Daten mit GitHub-Daten ersetzen** ersetzt anschließend die lokalen Browser-Daten durch den zuletzt geladenen GitHub-Stand.
