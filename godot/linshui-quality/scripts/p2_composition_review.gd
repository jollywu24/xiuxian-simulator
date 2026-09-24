extends "res://scripts/composition_review.gd"
## P2 environment + rejected motion sample inspection, not a release/default scene.
var sample: AtlasTexture
var frame_clock := 0.0
var loop_preview := true
var manual_frame := false
var controlled_source := ""
var sample_count := 8
var sample_rate := 8.0
var sample_action := "walk"

func _ready() -> void:
	evidence_prefix = "p2-refined"
	report.stage = "P2-environment-and-motion-candidate"
	report.character = "unapproved 8-frame S walk sample; SE and attacks absent"
	sample = AtlasTexture.new()
	sample.atlas = load("res://assets/review/walk-s-motion-sample-v3.png")
	sample.region = Rect2(0,0,160,128)
	for arg in OS.get_cmdline_user_args():
		if arg.begins_with("--controlled-source="):
			controlled_source = arg.trim_prefix("--controlled-source=")
	if not controlled_source.is_empty():
		evidence_prefix = "p2-controlled-rig"
		report.character = "controlled 3D rig offline 2D sample; NOT visually accepted"
		load_controlled("walk")
	$Hero/StaticIdentitySample.texture = sample
	$ReviewUI/Title.text = "临水茶铺 · P2 资产实机检查 / NOT ACCEPTED"
	$ReviewUI/Note.text = "檐棚 / 石路 / 河岸候选｜8帧步行仍待修整；其它体块未精制"
	$ReviewUI/Controls.text = "WASD / 点击移动    F3 步行原地循环开关    Esc 暂停    R 回到起点"
	if not controlled_source.is_empty():
		$ReviewUI/Note.text = "可控骨骼预渲染小样｜造型、步态与直刺未验收，不是正式角色"
		$ReviewUI/Controls.text = "F3 循环开关    F4 步行 / 直刺样本切换    Esc 暂停"
	for arg in OS.get_cmdline_user_args():
		if arg.begins_with("--motion-evidence="):
			await capture_motion(arg.trim_prefix("--motion-evidence="))
			return
	super._ready()

func _process(delta: float) -> void:
	if sample == null or manual_frame or paused:
		return
	if loop_preview or Vector2(hero.velocity.x,hero.velocity.z).length() > 0.05:
		frame_clock += delta
		sample.region = Rect2((int(frame_clock*sample_rate)%sample_count)*160,0,160,128)

func load_controlled(action: String) -> void:
	sample_action = action
	var filename := "s-walk-atlas.png" if action == "walk" else "se-thrust-atlas.png"
	var source_image := Image.load_from_file(controlled_source.path_join(filename))
	assert(source_image != null and not source_image.is_empty(), "Missing controlled sample")
	sample.atlas = ImageTexture.create_from_image(source_image)
	sample_count = 8 if action == "walk" else 12
	sample_rate = 8.0 if action == "walk" else 12.0
	frame_clock = 0.0

func _unhandled_input(event: InputEvent) -> void:
	if event is InputEventKey and event.pressed and not event.echo and event.keycode == KEY_F4 and not controlled_source.is_empty():
		load_controlled("thrust" if sample_action == "walk" else "walk")
	if event is InputEventKey and event.pressed and not event.echo and event.keycode == KEY_F3:
		loop_preview = not loop_preview
	super._unhandled_input(event)
	if event is InputEventKey and event.pressed and event.keycode == KEY_ESCAPE and not paused:
		$ReviewUI/Note.text = "檐棚 / 石路 / 河岸候选｜8帧步行仍待修整；其它体块未精制"

func capture_motion(folder: String) -> void:
	hero.automated = true
	manual_frame = true
	await get_tree().create_timer(1.0).timeout
	var frames: Array = []
	for index in range(8):
		sample.region = Rect2(index*160,0,160,128)
		await get_tree().process_frame
		await RenderingServer.frame_post_draw
		get_viewport().get_texture().get_image().save_png(folder.path_join("p2-walk-s-v3-frame-%02d.png" % index))
		frames.append({"frame":index,"actor_position":str(hero.position),"pixel_size":$Hero/StaticIdentitySample.pixel_size,"offset":str($Hero/StaticIdentitySample.offset)})
	var output := FileAccess.open(folder.path_join("p2-walk-s-v3-engine.json"),FileAccess.WRITE)
	output.store_string(JSON.stringify({"frames":frames,"visual_approved":false,"method":"real Forward+ frames, fixed actor transform; no per-frame compensation"},"\t"))
	output.close()
	get_tree().quit()
