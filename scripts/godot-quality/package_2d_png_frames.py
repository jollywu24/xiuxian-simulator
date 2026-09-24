"""Pad complete 2D art to one candidate cell/pivot without resizing its pixels."""
import json
from pathlib import Path
from PIL import Image

ROOT=Path(__file__).resolve().parents[2]
SOURCE=ROOT/'art_source/linshui-quality/v1/characters/hero-v2/review-normalized'
DEST=ROOT/'art_source/linshui-quality/v1/characters/hero-v2/2d-png-256-v1'
FRAMES=DEST/'frames'
FRAMES.mkdir(parents=True,exist_ok=True)
source_canvas=(160,128)
source_pivot=(80,112)
canvas=(256,256)
pivot=(128,220)
shift=(pivot[0]-source_pivot[0],pivot[1]-source_pivot[1])
entries=[]
for direction,action,index in [('s','idle',1),('se','idle',1),('se','thrust',7)]:
    src=SOURCE/direction/action/f'{index:02}.png'
    with Image.open(src) as im:
        if im.size!=source_canvas:
            raise ValueError(f'Wrong source canvas: {src}')
        frame=im.convert('RGBA')
    padded=Image.new('RGBA',canvas)
    padded.alpha_composite(frame,shift)
    bbox=padded.getchannel('A').point(lambda alpha:255 if alpha>=128 else 0).getbbox()
    safe=bool(bbox and bbox[0]>=4 and bbox[1]>=4 and bbox[2]<=252 and bbox[3]<=252)
    out=FRAMES/f'{direction}-{action}-{index:03}.png'
    padded.save(out)
    entries.append(dict(direction=direction,action=action,frame=index,
                        source=src.relative_to(ROOT).as_posix(),
                        output=out.relative_to(ROOT).as_posix(),
                        bbox=bbox,safe=safe))
report=dict(status='2d_static_and_attack_key_candidate_not_animation_pass',
            runtime_format='independent_complete_2d_png',
            production_method='fixed padding of existing complete 2D artwork; no new generation, per-frame scaling, or body-part compositing',
            source_provenance='OpenAI image_gen artwork in generated-frames; some exact historical prompts missing',
            canvas=canvas,foot_pivot=pivot,source_canvas=source_canvas,
            source_pivot=source_pivot,fixed_translation=shift,
            uniform_pixel_scale=1.0,per_frame_bbox_alignment=False,
            frames=entries,all_safe=all(e['safe'] for e in entries),
            limitations=['Only S/SE static and one SE thrust key are present',
                         'Existing AI source frame prompts are incomplete',
                         'Foot contact and animation continuity remain unverified'])
(DEST/'frame-contract.json').write_text(json.dumps(report,ensure_ascii=False,indent=2),encoding='utf-8')
print(json.dumps(dict(frames=len(entries),all_safe=report['all_safe'],bbox=[e['bbox'] for e in entries])))
if not report['all_safe']:
    raise SystemExit(1)
