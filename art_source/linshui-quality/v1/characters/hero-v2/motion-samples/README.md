# Whole-sheet motion feasibility sample

2026-09-24: user removed the per-frame-generation restriction and chose method-neutral,
quality-first production. This is one 8-frame S walk sheet plus two targeted edits,
all made with the built-in image_gen skill/tool, not a CLI/API fallback.

- v1 reference: `../idle-s-style-target-v2.png` (identity/style).
- v2 references: v1 edit target and `../generated-frames/s/walk/05.png` (opposite contact pose).
- v3 reference: v2 edit target; requested only passing/contact leg corrections.
- Exact prompts: `walk-s-sheet-v1-prompt.txt`, `walk-s-sheet-v2-prompt.txt`, `walk-s-sheet-v3-prompt.txt`.
- Outputs saved beside those prompts. All are rejected production candidates.
- `walk-s-motion-sample-v3.json` records source hash, fixed grid/resize/paste and alpha bounds.
- `walk-s-motion-sample-v3.gif` is an offline diagnostic, not engine footage or performance evidence.

The row-to-row registration defect remains. No individual frame has been recentered or resized
to hide it. The compiler is `scripts/godot-quality/compile_motion_sample.py`.
All three source versions remain available for failure comparison. No final animation master,
48-frame P2 set, or full 192-frame character has been accepted. No public license review is asserted.
