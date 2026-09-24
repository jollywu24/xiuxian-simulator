"""Structural evidence only; exits nonzero if required P2 quality evidence is missing."""
import argparse,json,hashlib,struct
from pathlib import Path
from PIL import Image
ROOT=Path(__file__).resolve().parents[2];OUT=ROOT/'godot/linshui-quality/assets';SRC=ROOT/'art_source/linshui-quality/v1'
def main():
    ap=argparse.ArgumentParser();ap.add_argument('--stage',choices=['p2'],required=True);ap.parse_args()
    checks=[];failures=[]
    meta=json.loads((OUT/'characters/hero/atlas.json').read_text(encoding='utf-8'))
    for action,count in [('idle',4),('walk',8),('thrust',12)]:
        p=OUT/f'characters/hero/{action}-p2-v1.png';im=Image.open(p)
        ok=im.size==(160*count,256) and im.mode=='RGBA';hashes=[]
        for d in range(2):
            row=[]
            for i in range(count):
                frame=im.crop((160*i,128*d,160*(i+1),128*(d+1)))
                row.append(hashlib.sha256(frame.tobytes()).hexdigest())
                if frame.getchannel('A').getbbox() is None:failures.append(f'{action}:{d}:{i} empty')
            hashes.append(row)
        distinct=hashes[0]!=hashes[1]
        checks.append({'asset':'CHR-01','action':action,'size':im.size,'frame_count':count*2,'dimensions_pass':ok,'directions_distinct':distinct})
        if not ok or not distinct:failures.append(f'{action}: structural failure')
    for p in sorted((OUT/'environment').glob('*.glb')):
        data=p.read_bytes();magic,version,size=struct.unpack_from('<III',data)
        ok=magic==0x46546c67 and version==2 and size==len(data)
        length,kind=struct.unpack_from('<II',data,12);gltf=json.loads(data[20:20+length])
        checks.append({'asset':p.name,'glb_header_pass':ok,'bytes':len(data),'mesh_count':len(gltf.get('meshes',[])),'sha256':hashlib.sha256(data).hexdigest()})
        if not ok:failures.append(str(p))
    missing_tips=sum(f['weapon_tip'] is None for a in meta['animations'].values() for f in a['frames'])
    if missing_tips:failures.append(f'CHR-01 weapon tip anchors missing for {missing_tips} frames')
    patches=json.loads((SRC/'characters/hero/pixel-patches.json').read_text(encoding='utf-8'))
    if patches['status']!='reviewed_pass':failures.append('CHR-01 pixel-cluster refinement not accepted')
    review=ROOT/'docs/godot-quality/review/p2-review.json'
    if not review.exists() or json.loads(review.read_text(encoding='utf-8'))['gate']!='pass':failures.append('G2 visual review not passed')
    report={'stage':'p2','checks':checks,'failures':failures,'structural_checks_are_not_visual_acceptance':True,'gate_pass':not failures}
    (ROOT/'docs/godot-quality/reports/asset-validation-p2.json').write_text(json.dumps(report,indent=2))
    print(json.dumps(report,indent=2));raise SystemExit(0 if not failures else 1)
if __name__=='__main__':main()
