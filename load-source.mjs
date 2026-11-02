export async function loadSource(path, mode = 'json') {
  const controller = new AbortController();
  let timer = setTimeout(() => controller.abort(), 30000);
  const deadline = setTimeout(() => controller.abort(), 120000);
  try {
    const response = await fetch(path, {signal: controller.signal});
    if (!response.ok) throw new Error(`Source unavailable: ${path} (${response.status})`);
    clearTimeout(timer);
    timer = setTimeout(() => controller.abort(), 30000);
    const stream = response.body?.pipeThrough(new TransformStream({
      transform(chunk, output) {
        if (chunk.byteLength) {
          clearTimeout(timer);
          timer = setTimeout(() => controller.abort(), 30000);
        }
        output.enqueue(chunk);
      },
    }));
    const source = stream ? new Response(stream) : response;
    if (mode === 'gzip') {
      if (!stream) throw new Error(`Source body unavailable: ${path}`);
      return await new Response(stream.pipeThrough(new DecompressionStream('gzip'))).arrayBuffer();
    }
    return await source[mode]();
  } finally { clearTimeout(timer); clearTimeout(deadline); }
}
