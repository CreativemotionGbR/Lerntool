# Vendor-Dateien für lokalen .apkg Import

Die Anwendung lädt optionale lokale Bibliotheken aus diesem Ordner, damit Anki `.apkg` Dateien direkt im Browser verarbeitet werden können.

Benötigte Dateien:

```txt
vendor/jszip.min.js
vendor/sql-wasm.js
vendor/sql-wasm.wasm
```

Für neuere Anki-Dateien mit komprimierter `collection.anki21b` wird zusätzlich ein lokaler Zstandard-Decoder benötigt, z. B.:

```txt
vendor/zstddec.js
```

Die Bibliotheken werden nicht aus einem CDN geladen. Lege sie manuell lokal in diesem Ordner ab.
