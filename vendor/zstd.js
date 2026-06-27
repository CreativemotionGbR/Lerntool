/*
  Local Zstandard decoder adapter.
  Replace this file with a browser build that exposes one of these APIs:
  - globalThis.fzstd.decompress(bytes)
  - globalThis.ZSTDDecoder
  - globalThis.ZstdCodec
  This adapter intentionally avoids native browser zstd streams.
*/
(function(global){
  global.localZstdAdapterLoaded = true;
})(globalThis);
