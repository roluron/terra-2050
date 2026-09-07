export function createEarthSurface(mask, camera, toVector) {
  const canvas = document.createElement('canvas');
  canvas.width = 720; canvas.height = 360;
  const context = canvas.getContext('2d', { willReadFrequently: true });
  context.drawImage(mask, 0, 0, 720, 360);
  const pixels = context.getImageData(0, 0, 720, 360).data;
  const vertices = [], points = [];
  for (let latitude = -88; latitude <= 88; latitude += 1.8) {
    const spacing = 1.8 / Math.max(.08, Math.cos(latitude * Math.PI / 180));
    for (let longitude = -180; longitude < 180; longitude += spacing) {
      const x = Math.floor((longitude + 180) * 2), y = Math.floor((90 - latitude) * 2);
      const land = pixels[(y * 720 + x) * 4] < 128;
      if (!land && (Math.round(latitude * 10) + Math.round(longitude * 10)) % 17 !== 0) continue;
      const vector = toVector(latitude, longitude);
      vertices.push({ vector, projected: vector.clone(), land });
      points.push({ x: 0, y: 0, alpha: 0, land });
    }
  }
  return () => {
    camera.updateMatrixWorld();
    for (let i = 0; i < vertices.length; i++) {
      const { vector, projected, land } = vertices[i];
      const facing = vector.dot(camera.position) - 1;
      projected.copy(vector).project(camera);
      const point = points[i];
      point.x = (projected.x + 1) / 2;
      point.y = (1 - projected.y) / 2;
      point.alpha = Math.min(1, Math.max(0, facing / .4)) * (land ? .55 + Math.min(1, Math.max(0, facing / 3)) * .45 : .075);
    }
    return points;
  };
}
