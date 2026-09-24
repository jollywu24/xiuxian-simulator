"""P2 sprite compilation from one rig; fixed canvas, no per-frame recentering."""
from PIL import Image
import json, hashlib
from pathlib import Path
ROOT=Path(__file__).resolve().parents[2];SRC=ROOT/'art_source/linshui-quality/v1/characters/hero'
OUT=ROOT/'godot/linshui-quality/assets/characters/hero';OUT.mkdir(parents=True,exist_ok=True)
frames={};samples=[]
anchors=json.loads((SRC/'weapon-anchors.json').read_text()) if (SRC/'weapon-anchors.json').exists() else {}
for action,count in [('idle',4),('walk',8),('thrust',12)]:
    for direction in ['s','se']:
        for i in range(count):
            f=SRC/'renders'/action/direction/f'{i:02}.png'
            im=Image.open(f).convert('RGBA').resize((160,128),Image.Resampling.LANCZOS)
            frames[action,direction,i]=im
            # Transparent padding must not consume the shared palette budget.
            samples.extend((r,g,b) for r,g,b,a in im.getdata() if a>=128)
contact=Image.new('RGB',(len(samples),1));contact.putdata(samples)
palette=contact.quantize(colors=40,method=Image.Quantize.MEDIANCUT).getpalette()
pal=Image.new('P',(1,1));pal.putpalette(palette)
meta={'stage':'P2','status':'exported_not_visual_pass','frame_size':[160,128],'foot_anchor':[80,112], 'directions':['s','se'], 'missing_directions':['e','ne','n','nw','w','sw'], 'palette_colors':40,'animations':{}}
review=Image.new('RGB',(12*160,6*128),(100,100,100))
compiled={}
patch_file=SRC/'pixel-patches.json'
patch_data=json.loads(patch_file.read_text(encoding='utf-8')) if patch_file.exists() else {'status':'pending_manual_cluster_review','patches':[],'note':'Quantization is not evidence of pixel-art acceptance.'}
for row,(action,count) in enumerate([('idle',4),('walk',8),('thrust',12)]):
    atlas=Image.new('RGBA',(160*count,256))
    entries=[]
    for d,direction in enumerate(['s','se']):
        for i in range(count):
            im=frames[action,direction,i]
            rgb=im.convert('RGB').quantize(palette=pal,dither=Image.Dither.NONE).convert('RGBA')
            alpha=im.getchannel('A').point(lambda a:255 if a>=128 else 0);rgb.putalpha(alpha)
            # Sparse editable corrections are replayed after quantization; never reset them.
            for patch in patch_data['patches']:
                if (patch['action'],patch['direction'],patch['frame'])==(action,direction,i):
                    for x,y,r,g,b,a in patch['pixels']:
                        if not (0<=x<160 and 0<=y<128 and a in (0,255)):
                            raise ValueError('Invalid pixel correction')
                        rgb.putpixel((x,y),(r,g,b,a))
            alpha=rgb.getchannel('A')
            compiled[action,direction,i]=rgb
            atlas.paste(rgb,(i*160,d*128))
            review.paste(rgb,(i*160,(row*2+d)*128),rgb)
            entries.append({'direction':direction,'index':i,'rect':[i*160,d*128,160,128],'duration':1/12,'foot_anchor':[80,112], 'alpha_bbox':alpha.getbbox(),'sha256':hashlib.sha256(rgb.tobytes()).hexdigest(), 'foot_contact': i in ([0,4] if action=='walk' else []),'strike_contact':action=='thrust' and i==5,'weapon_tip':anchors.get(f'{action}/{direction}/{i}')})
    atlas.save(OUT/f'{action}-p2-v1.png')
    meta['animations'][action]={'frames':entries,'loop':action!='thrust','count_per_direction':count,'fps':12}
(OUT/'atlas.json').write_text(json.dumps(meta,indent=2),encoding='utf-8')
(SRC/'palette.json').write_text(json.dumps([palette[i:i+3] for i in range(0,120,3)]),encoding='utf-8')
if not patch_file.exists():patch_file.write_text(json.dumps(patch_data,indent=2),encoding='utf-8')
review.save(SRC/'p2-contact-sheet.png')
# Native-size looping review, not engine footage and not realtime performance evidence.
preview=[]
for i in range(8):
    bg=Image.new('RGBA',(320,256),(100,100,100,255));im=compiled['walk','se',i]
    bg.alpha_composite(im,(80,64));preview.append(bg.convert('RGB'))
preview[0].save(SRC/'walk-offline-review.gif',save_all=True,append_images=preview[1:],duration=83,loop=0)
print('Exported 48 frame slots from shared rig; visual acceptance pending')
