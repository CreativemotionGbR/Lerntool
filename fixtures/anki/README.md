# Anki Test Fixtures

Dieser Ordner enthält APKG-Testdateien für den lokalen Anki-Import.

## Datei

`IT-Recht.apkg`

## Erwartete Struktur

Die Datei enthält:

- `collection.anki21b`
- `collection.anki2`
- `media`
- `meta`

## Wichtig

`collection.anki21b` ist die relevante neue Anki-Datenbank.

`collection.anki21b` ist Zstandard-komprimiert und beginnt mit den Magic Bytes:

```txt
28 B5 2F FD
