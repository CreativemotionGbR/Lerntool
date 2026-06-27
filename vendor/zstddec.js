/* Minimal local Zstandard adapter. Uses the browser Compression Streams API when zstd is supported. */
(function(global){
  async function decompress(bytes){
    if (typeof DecompressionStream === 'undefined') throw new Error('kein Zstandard-Decoder ist verfügbar');
    try {
      const stream = new Blob([bytes]).stream().pipeThrough(new DecompressionStream('zstd'));
      return new Uint8Array(await new Response(stream).arrayBuffer());
    } catch (error) {
      throw new Error('kein Zstandard-Decoder ist verfügbar: '+error.message);
    }
  }
  global.zstddec = { decompress };
})(globalThis);
