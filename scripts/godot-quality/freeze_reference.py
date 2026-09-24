"""Freeze actual protected workspace bytes, including dirty/untracked files."""
import argparse
import hashlib
import json
import subprocess
from pathlib import Path
from datetime import datetime, timezone

ROOT = Path(__file__).resolve().parents[2]
REPORT = ROOT / 'docs/godot-quality/reports'
BASE = REPORT / 'reference-baseline.json'
SCOPES = ['web', 'tests', 'desktop', 'data', 'schemas', 'package.json',
          'pnpm-lock.yaml', '.github', 'AGENTS.md', 'docs/hd2d', 'art_source',
          'scripts', 'PROJECT_CONTEXT.md', 'docs/RELEASE.md', 'docs/TESTING.md',
          '.gitignore', 'GOAL.md', 'wudao-s0.bundle']
EXCEPTIONS = ['art_source/linshui-quality/v1/', 'scripts/godot-quality/']

def snapshot():
    result = {}
    for scope in SCOPES:
        p = ROOT / scope
        paths = p.rglob('*') if p.is_dir() else [p]
        for f in paths:
            rel = f.relative_to(ROOT).as_posix()
            if any(rel.startswith(e) for e in EXCEPTIONS):
                continue
            if f.is_symlink():
                raise RuntimeError(f'Protected symlink requires explicit review: {rel}')
            if f.is_file():
                result[rel] = hashlib.file_digest(f.open('rb'), 'sha256').hexdigest()
    return dict(sorted(result.items()))

def main():
    ap = argparse.ArgumentParser()
    group = ap.add_mutually_exclusive_group(required=True)
    group.add_argument('--create', action='store_true')
    group.add_argument('--check', action='store_true')
    args = ap.parse_args()
    REPORT.mkdir(parents=True, exist_ok=True)
    actual = snapshot()
    if args.create:
        if BASE.exists():
            raise SystemExit('Refusing to overwrite existing protection baseline')
        baseline = {'created_utc': datetime.now(timezone.utc).isoformat(),
                    'head': subprocess.check_output(['git','rev-parse','HEAD'], cwd=ROOT, text=True).strip(),
                    'initial_status': subprocess.check_output(['git','status','--porcelain=v1'], cwd=ROOT, text=True),
                    'scopes': SCOPES, 'exceptions': EXCEPTIONS, 'files': actual}
        BASE.write_text(json.dumps(baseline, indent=2, ensure_ascii=False), encoding='utf-8')
        print(json.dumps({'baseline':str(BASE), 'files':len(actual)}))
    else:
        before = json.loads(BASE.read_text(encoding='utf-8'))['files']
        diff = {'added':sorted(actual.keys()-before.keys()),
                'deleted':sorted(before.keys()-actual.keys()),
                'modified':sorted(k for k in before.keys() & actual.keys() if before[k]!=actual[k])}
        report = {'checked_utc':datetime.now(timezone.utc).isoformat(),
                  'reference_unchanged':not any(diff.values()), 'file_count':len(actual), **diff}
        (REPORT/'reference-check.json').write_text(json.dumps(report,indent=2),encoding='utf-8')
        print(json.dumps(report))
        raise SystemExit(0 if report['reference_unchanged'] else 1)

if __name__ == '__main__':
    main()
