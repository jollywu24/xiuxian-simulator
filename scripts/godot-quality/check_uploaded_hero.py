"""Read-only upload integrity/metadata check; no image edits or visual-pass claims."""
import hashlib,json
from pathlib import Path
from PIL import Image
ROOT=Path(__file__).resolve().parents[2]
expected=['53f08a3a12e6c2c9661c9c4c2b99398290d5f326d9d6f368a6d4858eb1b2315d','053db4436293e71dcdaf8d3b2f2527ddbcec95d96556274e1ccc87af729496f2','58324c09c5548159c610dc93ddd47fa3df5f5e369a03d9fcb896d32355499977','017506822455b6f4da2997acf0b58ea71fae2b01a144ea982d277dbab28473b0','baec0522af249c3ab67a5e0a934901e833f94fd3db7c379a0cc8bc56e68d3ab1']
files=[]
for i,digest in enumerate(expected,1):
    path=ROOT/f'godot/linshui-quality/assets/characters/hero/character{i}.png'
    image=Image.open(path)
    actual=hashlib.sha256(path.read_bytes()).hexdigest()
    files.append({'path':path.relative_to(ROOT).as_posix(),'size':image.size,'alpha_extrema':image.getchannel('A').getextrema(),'sha256':actual,'upload_unchanged':actual==digest})
result={'files':files,'all_uploads_unchanged':all(f['upload_unchanged'] for f in files),'visual_pass':False,'generated_repair':'attack-repair-v1 rejected; not installed','provenance':'user supplied PNGs, author/license/rig unverified'}
(ROOT/'docs/godot-quality/reports/uploaded-integrity.json').write_text(json.dumps(result,indent=2),encoding='utf-8')
print(json.dumps(result,indent=2))
raise SystemExit(0 if result['all_uploads_unchanged'] else 1)
