const canvases = [...document.querySelectorAll('.planet-sprite')];
const reduced = matchMedia('(prefers-reduced-motion: reduce)');
const size = 96, count = 32, frames = [];
const image = new Image();
image.src = './assets/textures/earth_color_2048.webp';
try {
  await image.decode();
  const map = document.createElement('canvas');
  map.width = 512; map.height = 256;
  const context = map.getContext('2d', {willReadFrequently:true});
  context.drawImage(image, 0, 0, 512, 256);
  const pixels = context.getImageData(0, 0, 512, 256).data;
  for (let frame = 0; frame < count; frame++) {
    const sprite = document.createElement('canvas');
    sprite.width = sprite.height = size;
    const pen = sprite.getContext('2d');
    for (let y = 8; y < 88; y += 2) for (let x = 8; x < 88; x += 2) {
      const nx = (x - 48) / 39, ny = (48 - y) / 39, radius = nx * nx + ny * ny;
      if (radius >= 1) continue;
      const z = Math.sqrt(1 - radius), longitude = Math.atan2(nx, z) + frame / count * Math.PI * 2;
      const u = ((longitude / (Math.PI * 2) + .5) % 1 + 1) % 1;
      const v = .5 - Math.asin(ny) / Math.PI;
      const offset = (Math.floor(v * 255) * 512 + Math.floor(u * 511)) * 4;
      const land = pixels[offset + 1] > pixels[offset + 2] * .82 && pixels[offset] > 24;
      const light = Math.max(.08, -.4 * nx + .25 * ny + .8 * z);
      const density = ((x * 13 + y * 7) % 19) / 19;
      if (density > (land ? .92 : .18) * light) continue;
      pen.fillStyle = `rgba(220,220,214,${(land ? .85 : .32) * light})`;
      pen.fillRect(x, y, 1.25, 1.25);
    }
    frames.push(sprite);
  }
  const timer = setInterval(() => {
    if (document.hidden) return;
    const frame = reduced.matches ? 5 : Math.floor(performance.now() / 100) % count;
    for (const canvas of canvases) {
      if (!(canvas.checkVisibility ? canvas.checkVisibility() : canvas.getClientRects().length)) continue;
      const pen = canvas.getContext('2d');
      pen.clearRect(0, 0, size, size); pen.drawImage(frames[frame], 0, 0);
    }
  }, 100);
  window.addEventListener('pagehide', () => clearInterval(timer), {once:true});
} catch {
  for (const canvas of canvases) canvas.hidden = true;
}
