export function morphPoint(origin, target, progress) {
  const t = Math.min(1, Math.max(0, progress));
  const ease = t * t * t * (t * (t * 6 - 15) + 10);
  return { x: origin.x + (target.x - origin.x) * ease, y: origin.y + (target.y - origin.y) * ease };
}

export function startOrb(canvas, origins, options) {
  const ctx = canvas.getContext('2d');
  let width, height, frame, assembledAt = null, blendAt = null, stopped = false;
  const began = performance.now();
  const symbols = Array.from('·+✳⋮✶⊹');
  const resize = () => {
    width = innerWidth; height = innerHeight;
    const dpr = Math.min(devicePixelRatio || 1, 2);
    canvas.width = width * dpr; canvas.height = height * dpr;
    ctx?.setTransform(dpr, 0, 0, dpr, 0, 0);
  };
  resize();
  const sprites = symbols.map(symbol => {
    const tile = document.createElement('canvas'); tile.width = 32; tile.height = 32;
    const brush = tile.getContext('2d');
    if (!brush) return null;
    brush.fillStyle = '#dae7d6'; brush.font = '22px Georgia,serif';
    brush.textAlign = 'center'; brush.textBaseline = 'middle'; brush.fillText(symbol,16,16);
    return tile;
  });
  const dot = document.createElement('canvas'); dot.width = 32; dot.height = 32;
  const brush = dot.getContext('2d');
  const drawingAvailable = !!ctx && !!brush && sprites.every(Boolean);
  if (brush) {
  const glow = brush.createRadialGradient(16,16,0,16,16,16);
  glow.addColorStop(0,'rgba(225,237,220,1)'); glow.addColorStop(.35,'rgba(225,237,220,.9)'); glow.addColorStop(1,'rgba(225,237,220,0)');
  brush.fillStyle = glow; brush.fillRect(0,0,32,32);
  }
  window.addEventListener('resize', resize);
  function stop() { stopped = true; cancelAnimationFrame(frame); window.removeEventListener('resize', resize); }
  function tick(now) {
    if (stopped) return;
    const points = options.points();
    const simplified = options.reduced || !drawingAvailable || (options.ready() && !points.length);
    if (options.ready() && assembledAt === null) assembledAt = now;
    const time = assembledAt === null ? 0 : (now - assembledAt) / 1000;
    if ((time > 5.4 || simplified) && assembledAt !== null && blendAt === null) {
      blendAt = now;
      options.materialize();
    }
    const blend = blendAt === null ? 0 : Math.min(1, (now - blendAt) / (simplified ? 1 : 3600));
    if (blend === 1) { stop(); options.complete(); return; }
    if (drawingAvailable && !options.reduced) {
      ctx.clearRect(0, 0, width, height);
      const progress = Math.min(1, time / 4.4);
      const opacity = 1 - blend * blend * (3 - 2 * blend);
      const glyphMix = 1 - Math.min(1, Math.max(0, (progress - .35) / .6));
      ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
      const count = points.length || origins.length;
      for (let index = 0; index < count; index++) {
        const origin = origins[index % origins.length] || { x: width / 2, y: height / 2, character: '·' };
        const point = points[index] || { x: origin.x / width, y: origin.y / height, alpha: .5, land: true };
        const target = { x: point.x * width, y: point.y * height };
        const position = morphPoint(origin, target, progress);
        const first = index < origins.length;
        const emission = first ? 1 : Math.min(1, time / 1.8);
        const brightness = point.alpha * opacity * emission;
        const letterOpacity = Math.max(0, 1 - (now - began) / 1000);
        if (first && letterOpacity > 0) {
          ctx.fillStyle = `rgba(215,223,212,${letterOpacity * opacity})`;
          ctx.font = origin.font || 'italic 20px Lausanne, sans-serif';
          ctx.fillText(origin.character, position.x, position.y);
        }
        const alpha = brightness * (1 - (first ? letterOpacity : 0));
        if (alpha <= .002) continue;
        const glyphSize = 11 - progress * 5;
        ctx.globalAlpha = alpha * glyphMix;
        if (glyphMix > 0) ctx.drawImage(sprites[index % sprites.length], position.x - glyphSize/2, position.y - glyphSize/2, glyphSize, glyphSize);
        const dotSize = point.land ? 3.5 : 2;
        ctx.globalAlpha = alpha * (1 - glyphMix);
        if (glyphMix < 1) ctx.drawImage(dot, position.x - dotSize/2, position.y - dotSize/2, dotSize, dotSize);
        ctx.globalAlpha = 1;
      }
    }
    frame = requestAnimationFrame(tick);
  }
  frame = requestAnimationFrame(tick);
  return stop;
}
