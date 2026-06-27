# Vendor-Dateien für lokalen .apkg Import

Dieser Ordner enthält lokale Browser-Dateien für den Anki `.apkg` Import. Die App lädt sie direkt aus `vendor/` und nutzt keine CDN-Links.

Enthalten:

```txt
vendor/jszip.min.js
vendor/sql-wasm.js
vendor/sql-wasm.wasm
vendor/zstd.js
```

Hinweise:

- `vendor/jszip.min.js` ist ein kleiner lokaler ZIP-Reader für die im Import benötigten `.apkg` Einträge.
- `vendor/sql-wasm.js` / `vendor/sql-wasm.wasm` sind als lokale Ladeziele vorhanden; die App enthält zusätzlich einen read-only SQLite-Fallback für die benötigten Anki-Tabellen.
- `vendor/zstd.js` nutzt einen lokalen Browser-Adapter für Zstandard. Wenn der Browser keine Zstandard-Dekompression anbietet, zeigt die App eine klare Fehlermeldung und importiert keine Fallback-Platzhalterdatenbank.

Wenn du stattdessen vollständige Bibliotheken wie JSZip, sql.js oder einen anderen Zstandard-Decoder verwenden möchtest, ersetze die Dateien in diesem Ordner durch kompatible lokale Browser-Builds mit denselben Dateinamen. Für echte Zstandard-Dekompression muss `vendor/zstd.js` durch einen Decoder-Build ersetzt/ergänzt werden, der eine der dokumentierten globalen APIs bereitstellt.
