import json
import re
import shutil
import sys
from pathlib import Path

source = Path(sys.argv[1]).resolve()
destination = Path(sys.argv[2]).resolve()
release = "https://github.com/roluron/terra-2050/releases/download/presskit-2026-10-08/"
library = json.loads((source / "media.json").read_text())
paths = {
    "press.css", "press.mjs", "press-copy.json", "press-copy-fr.json",
    "press-language.css", "press-language.mjs", "logo-preview.css", "logo-preview.mjs", "media.json",
    "logos/live/thermal-logo.mjs", "logos/live/earth-loop.mjs",
    "fonts/TWKLausanne-300.woff2", "fonts/TWKLausanne-600.woff2",
    "downloads/fromearth-press-sheet.pdf", "downloads/fromearth-press-text.txt",
}
for asset in library["assets"]:
    paths.add(asset["path"])
    if asset.get("poster"):
        paths.add(asset["poster"])
    paths.update(extra["path"] for extra in asset.get("extras", []))
html = (source / "press.html").read_text()
for path in re.findall(r'(?:src|href)="([^"]+)"', html):
    if not path.startswith(("#", "https:", "http:")) and not path.endswith(".zip"):
        paths.add(path)
for relative in sorted(paths):
    origin = (source / relative).resolve()
    assert origin.is_relative_to(source) and origin.is_file(), relative
    target = destination / relative
    target.parent.mkdir(parents=True, exist_ok=True)
    shutil.copy2(origin, target)
html = re.sub(r'href="downloads/([^"/]+\.zip)"', lambda m: f'href="{release}{m[1]}"', html)
html = html.replace('<link rel="stylesheet" href="press.css">', '<link rel="canonical" href="https://fromearth.love/presskit/"><link rel="stylesheet" href="press.css">')
(destination / "index.html").write_text(html)
module = destination / "press.mjs"
text = module.read_text()
assert "'downloads/'+archives[group]" in text
module.write_text(text.replace("'downloads/'+archives[group]", repr(release) + "+archives[group]"))
preview = destination / "logo-preview.mjs"
preview.write_text(preview.read_text().replace("downloads/fromearth-current-thermal-logo.zip", release + "fromearth-current-thermal-logo.zip"))
for path in destination.rglob("*"):
    if path.is_file():
        assert path.stat().st_size < 100_000_000, path
print(json.dumps({"assets": len(library["assets"]), "files": len(paths) + 1, "mediaBytes": sum((source / p).stat().st_size for p in paths), "release": release}))
