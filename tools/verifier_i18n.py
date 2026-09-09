import subprocess
import sys
from pathlib import Path

script = Path(__file__).with_name('verify-locales.mjs')
sys.exit(subprocess.run(['node', str(script), *sys.argv[1:]]).returncode)
