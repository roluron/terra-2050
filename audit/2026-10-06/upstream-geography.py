import hashlib
import importlib.util
import json
from pathlib import Path
import urllib.request

from PIL import Image

ROOT = Path(__file__).resolve().parents[2]
spec = importlib.util.spec_from_file_location('pays_raster', ROOT / 'tools/pays_raster.py')
module = importlib.util.module_from_spec(spec)
spec.loader.exec_module(module)
features = {}
for scale, descriptor in module.SOURCES.items():
    with urllib.request.urlopen(module.SOURCE_BASE + descriptor['file'], timeout=60) as response:
        raw = response.read()
    assert hashlib.sha256(raw).hexdigest() == descriptor['sha256'], scale
    features[scale] = json.loads(raw)['features']
image, codes = module.rasterise(features['50m'], features['10m'])
shipped = Image.open(ROOT / 'data/pays.png')
index = json.loads((ROOT / 'data/pays_index.json').read_text())
assert image.tobytes() == shipped.tobytes()
assert codes == index['iso']
print(json.dumps({'official_hashes': 2, 'exact_raster_cells': module.W * module.H,
                  'differences': 0, **module.verify(image, codes),
                  'limit': 'Reuses shipped rasterizer with freshly downloaded upstream geometries.'}))
