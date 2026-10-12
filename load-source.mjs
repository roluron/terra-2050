export async function loadSource(path, mode = 'json') {
  const controller = new AbortController(), timer = setTimeout(() => controller.abort(), 30000);
  try {
    const response = await fetch(path, {signal: controller.signal});
    if (!response.ok) throw new Error(`Source unavailable: ${path} (${response.status})`);
    if (mode === 'gzip') {
      if (!response.body) throw new Error(`Source body unavailable: ${path}`);
      return await new Response(response.body.pipeThrough(new DecompressionStream('gzip'))).arrayBuffer();
    }
    return await response[mode]();
  } finally { clearTimeout(timer); }
}
