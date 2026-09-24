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
var style_source := ""
@export var character_2d_scene_source := ""
var character_2d_source := ""
var character_2d: AnimatedSprite3D
var motion_review := false
var batch_review := false
var batch_walk_preview := false

func _ready() -> void:
	evidence_prefix = "p2-refined"
	report.stage = "P2-environment-and-motion-candidate"
	report.character = "unapproved 8-frame S walk sample; SE and attacks absent"
	sample = AtlasTexture.new()
	sample.atlas = load("res://assets/review/walk-s-motion-sample-v3.png")
	sample.region = Rect2(0,0,160,128)
	character_2d_source = character_2d_scene_source
	for arg in OS.get_cmdline_user_args():
		if arg.begins_with("--controlled-source="):
			controlled_source = arg.trim_prefix("--controlled-source=")
		if arg.begins_with("--style-source="):
			style_source = arg.trim_prefix("--style-source=")
		if arg.begins_with("--character-2d-source="):
			character_2d_source = arg.trim_prefix("--character-2d-source=")
	if not character_2d_source.is_empty():
		style_source = character_2d_source
		batch_review = character_2d_source.contains("2d-batch-v1")
		motion_review = batch_review or character_2d_source.contains("2d-motion-review-v1")
		build_character_2d()
	if not style_source.is_empty():
		if not character_2d_source.is_empty():
			evidence_prefix = "p2-character-2d-batch-v1" if batch_review else ("p2-character-2d-motion-v1" if motion_review else ("p2-character-2d-256-v1" if character_2d_source.contains("2d-png-256-v1") else "p2-character-2d-v1"))
		else:
			evidence_prefix = "p2-style-gate-v2"
		report.stage = "P2-static-style-gate"
		report.character = "S/SE complete 2D character illustrations; animation NOT accepted" if not character_2d_source.is_empty() else "S/SE static 3D master styling sample; NOT visually accepted"
		load_style("s")
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
	if not style_source.is_empty():
		$ReviewUI/Title.text = "临水茶铺 · 人物造型关卡 / NOT ACCEPTED"
		$ReviewUI/Note.text = "完整二维人物 S / SE 静止试片；动作尚未验收" if not character_2d_source.is_empty() else "同一三维母版的 S / SE 静止试片；按正常游戏尺寸评审"
		$ReviewUI/Controls.text = "F4 切换 S / SE 静止造型    WASD / 点击移动    Esc 暂停"
	if motion_review:
		report.stage = "P2-2D-batch-art-candidate" if batch_review else "P2-incomplete-2D-motion-diagnostic"
		report.character = "complete 2D S walk 8 and SE thrust 12; NOT ACCEPTED" if batch_review else "complete 2D S walk 5/8; SE thrust key 1/12; NOT ACCEPTED"
		$ReviewUI/Title.text = "临水茶铺 · 二维动作整组诊断 / NOT ACCEPTED" if batch_review else "临水茶铺 · 二维动作诊断 / INCOMPLETE"
		$ReviewUI/Note.text = "S步行8帧 + SE直刺12帧：整组候选，画面与动作未验收" if batch_review else "S 步行仅有 5/8 帧；SE 直刺仅有一张关键姿势；非正式动画"
		$ReviewUI/Controls.text = "WASD / 点击移动播放步行    F3 原地步行    空格 直刺一次    F4 静止 S / SE    Esc 暂停" if batch_review else "F3 播放 / 停止 5 帧步行试片    F4 静止 S / SE    WASD / 点击移动    Esc 暂停"
	for arg in OS.get_cmdline_user_args():
		if arg.begins_with("--motion-2d-capture="):
			await capture_motion_2d(arg.trim_prefix("--motion-2d-capture="))
			return
		if arg.begins_with("--style-capture="):
			await capture_style(arg.trim_prefix("--style-capture="))
			return
		if arg.begins_with("--motion-evidence="):
			await capture_motion(arg.trim_prefix("--motion-evidence="))
			return
	super._ready()

func _process(delta: float) -> void:
	if batch_review and character_2d != null and not manual_frame and not paused:
		if sample_action == "attack":
			return
		var moving := Vector2(hero.velocity.x,hero.velocity.z).length() > 0.05
		if batch_walk_preview or moving:
			if character_2d.animation != "s-walk" or not character_2d.is_playing():
				character_2d.play("s-walk")
			sample_action = "s"
		elif character_2d.animation == "s-walk":
			load_style("s")
		return
	if sample == null or manual_frame or paused or not style_source.is_empty():
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

func load_style(direction: String) -> void:
	sample_action = direction
	if character_2d != null:
		character_2d.stop()
		character_2d.animation = direction + "-idle" if motion_review else direction
		character_2d.frame = 0
		return
	var source_image := Image.load_from_file(style_source.path_join(direction + "-idle.png"))
	assert(source_image != null and not source_image.is_empty(), "Missing static style sample")
	sample.atlas = ImageTexture.create_from_image(source_image)
	sample.region = Rect2(0,0,160,128)
	sample_count = 1

func build_character_2d() -> void:
	var old: Sprite3D = $Hero/StaticIdentitySample
	var frames := SpriteFrames.new()
	var canvas_size := Vector2i.ZERO
	var contract: Dictionary = {}
	var contract_path := character_2d_source.path_join("frame-contract.json")
	if FileAccess.file_exists(contract_path):
		contract = JSON.parse_string(FileAccess.get_file_as_string(contract_path))
	var sequences: Array = contract.sequences.keys() if motion_review else ["s", "se"]
	for sequence in sequences:
		frames.add_animation(sequence)
		var count := int(contract.sequences[sequence]) if motion_review else 1
		for index in range(1, count + 1):
			var source_file := character_2d_source.path_join(sequence + "-idle.png")
			if motion_review:
				source_file = character_2d_source.path_join("frames").path_join("%s-%03d.png" % [sequence,index])
			elif FileAccess.file_exists(character_2d_source.path_join("frames").path_join(sequence + "-idle-001.png")):
				source_file = character_2d_source.path_join("frames").path_join(sequence + "-idle-001.png")
			var source_image := Image.load_from_file(source_file)
			assert(source_image != null and not source_image.is_empty(), "Missing 2D frame: " + source_file)
			if canvas_size == Vector2i.ZERO:
				canvas_size = source_image.get_size()
			assert(source_image.get_size() == canvas_size, "2D frames have different canvas")
			frames.add_frame(sequence,ImageTexture.create_from_image(source_image))
		if sequence == "s-walk":
			frames.set_animation_speed(sequence,8.0)
			frames.set_animation_loop(sequence,true)
		if sequence == "se-thrust":
			frames.set_animation_speed(sequence,12.0)
			frames.set_animation_loop(sequence,false)
	var foot_pivot := Vector2(80,112)
	if not contract.is_empty():
		foot_pivot = Vector2(contract.foot_pivot[0],contract.foot_pivot[1])
	character_2d = AnimatedSprite3D.new()
	character_2d.name = "Complete2DCharacterReview"
	character_2d.sprite_frames = frames
	character_2d.transform = old.transform
	character_2d.pixel_size = old.pixel_size
	character_2d.offset = foot_pivot - Vector2(canvas_size) * 0.5
	character_2d.texture_filter = old.texture_filter
	character_2d.alpha_cut = old.alpha_cut
	character_2d.shaded = old.shaded
	character_2d.cast_shadow = old.cast_shadow
	$Hero.add_child(character_2d)
	if batch_review:
		character_2d.animation_finished.connect(_on_character_animation_finished)
	old.visible = false

func _on_character_animation_finished() -> void:
	if batch_review and character_2d.animation == "se-thrust":
		hero.input_locked = false
		load_style("se")

func capture_style(folder: String) -> void:
	hero.automated = true
	manual_frame = true
	await get_tree().create_timer(1.0).timeout
	var frames: Array = []
	var height := int(get_viewport().get_visible_rect().size.y)
	for direction in ["s", "se"]:
		load_style(direction)
		await get_tree().process_frame
		await RenderingServer.frame_post_draw
		var filename: String = evidence_prefix + "-" + direction + "-" + str(height) + ".png"
		var saved := get_viewport().get_texture().get_image().save_png(folder.path_join(filename))
		var active_sprite: SpriteBase3D = character_2d if character_2d != null else $Hero/StaticIdentitySample
		frames.append({"direction":direction,"file":filename,"saved":saved == OK,
			"actor_position":str(hero.position),"pixel_size":active_sprite.pixel_size,
			"offset":str(active_sprite.offset),"node_type":active_sprite.get_class()})
	var report_path := folder.path_join(evidence_prefix + "-report-" + str(height) + ".json")
	var output := FileAccess.open(report_path,FileAccess.WRITE)
	output.store_string(JSON.stringify({"stage":"P2-static-style-gate", "renderer":RenderingServer.get_current_rendering_method(),
		"adapter":RenderingServer.get_video_adapter_name(),"visual_approved":false,
		"frames":frames,"method":"real Forward+ captures; fixed actor transform and camera"},"\t"))
	output.close()
	get_tree().quit(0 if frames.all(func(f): return f.saved) else 1)

func _unhandled_input(event: InputEvent) -> void:
	if event is InputEventKey and event.pressed and not event.echo and event.keycode == KEY_F4 and not style_source.is_empty():
		if batch_review and sample_action == "attack" and character_2d.is_playing():
			return
		load_style("se" if sample_action == "s" else "s")
		return
	if event is InputEventKey and event.pressed and not event.echo and event.keycode == KEY_SPACE and batch_review and not paused:
		if sample_action != "attack" or not character_2d.is_playing():
			hero.stop()
			hero.input_locked = true
			batch_walk_preview = false
			sample_action = "attack"
			character_2d.play("se-thrust")
		return
	if event is InputEventKey and event.pressed and not event.echo and event.keycode == KEY_F4 and not controlled_source.is_empty():
		load_controlled("thrust" if sample_action == "walk" else "walk")
	if event is InputEventKey and event.pressed and not event.echo and event.keycode == KEY_F3:
		if motion_review and not paused:
			if batch_review and sample_action == "attack" and character_2d.is_playing():
				return
			if batch_review:
				batch_walk_preview = not batch_walk_preview
				if batch_walk_preview:
					character_2d.play("s-walk")
				elif Vector2(hero.velocity.x,hero.velocity.z).length() <= 0.05:
					load_style("s")
			elif character_2d.is_playing():
				load_style("s")
			else:
				character_2d.play("s-walk")
			sample_action = "s"
		else:
			loop_preview = not loop_preview
	super._unhandled_input(event)
	if event is InputEventKey and event.pressed and event.keycode == KEY_ESCAPE and not paused:
		if motion_review:
			$ReviewUI/Note.text = "S步行8帧 + SE直刺12帧：整组候选，画面与动作未验收" if batch_review else "S 步行仅有 5/8 帧；SE 直刺仅有一张关键姿势；非正式动画"
		elif not style_source.is_empty():
			$ReviewUI/Note.text = "完整二维人物 S / SE 静止试片；动作尚未验收" if not character_2d_source.is_empty() else "同一三维母版的 S / SE 静止试片；按正常游戏尺寸评审"
		else:
			$ReviewUI/Note.text = "檐棚 / 石路 / 河岸候选｜8帧步行仍待修整；其它体块未精制"

func capture_motion_2d(folder: String) -> void:
	assert(motion_review and character_2d != null)
	hero.automated = true
	manual_frame = true
	await get_tree().create_timer(1.0).timeout
	var captured: Array = []
	var playback: Dictionary = {}
	var height := int(get_viewport().get_visible_rect().size.y)
	var walk_count := character_2d.sprite_frames.get_frame_count("s-walk")
	for sequence in (["s-walk", "se-thrust"] if batch_review else ["s-walk"]):
		character_2d.play(sequence)
		character_2d.frame = 0
		var frame_count := character_2d.sprite_frames.get_frame_count(sequence)
		var observed: Array = [character_2d.frame]
		for index in range(1, frame_count):
			await character_2d.frame_changed
			observed.append(character_2d.frame)
		playback[sequence] = observed
		character_2d.stop()
		character_2d.animation = sequence
		for index in range(frame_count):
			character_2d.frame = index
			await get_tree().process_frame
			await RenderingServer.frame_post_draw
			var filename := "%s-%s-%02d-%d.png" % [evidence_prefix,sequence,index + 1,height] if batch_review else "p2-character-2d-motion-v1-walk-%02d-%d.png" % [index + 1,height]
			var saved := get_viewport().get_texture().get_image().save_png(folder.path_join(filename))
			captured.append({"sequence":sequence,"index":index + 1,"actual_frame":character_2d.frame,"file":filename,"saved":saved == OK,
				"actor_position":str(hero.position),"pixel_size":character_2d.pixel_size,
				"offset":str(character_2d.offset),"sprite_scale":str(character_2d.scale),
				"playing":character_2d.is_playing()})
	var attack_input: Dictionary = {}
	if batch_review:
		load_style("se")
		var key := InputEventKey.new()
		key.keycode = KEY_SPACE
		key.pressed = true
		Input.parse_input_event(key)
		await get_tree().process_frame
		attack_input["started"] = character_2d.animation == "se-thrust" and character_2d.is_playing()
		attack_input["locked"] = hero.input_locked
		for index in range(3):
			await character_2d.frame_changed
		Input.parse_input_event(key)
		await get_tree().process_frame
		attack_input["repeat_did_not_restart"] = character_2d.animation == "se-thrust" and character_2d.frame > 0
		await character_2d.animation_finished
		await get_tree().process_frame
		attack_input["unlocked"] = not hero.input_locked and character_2d.animation == "se-idle"
	var report_path := folder.path_join("%s-report-%d.json" % [evidence_prefix,height])
	var output := FileAccess.open(report_path,FileAccess.WRITE)
	output.store_string(JSON.stringify({"stage":"P2-2D-batch-candidate" if batch_review else "P2-incomplete-motion-diagnostic", "renderer":RenderingServer.get_current_rendering_method(),
		"adapter":RenderingServer.get_video_adapter_name(),"visual_approved":false,
		"required_walk_frames":8,"candidate_walk_frames":walk_count,"required_thrust_frames":12,"candidate_thrust_frames":12 if batch_review else 1,
		"frames":captured,"playback_observed":playback,"attack_input":attack_input,
		"method":"AnimatedSprite3D timed playback checked separately, then each independent PNG captured from real Forward+ viewport with sprite stopped and fixed actor transform"},"\t"))
	output.close()
	var playback_ok := true
	for sequence in playback:
		var observed: Array = playback[sequence]
		for index in range(observed.size()):
			if observed[index] != index:
				playback_ok = false
	var input_ok := not batch_review or attack_input.values().all(func(value): return value)
	get_tree().quit(0 if playback_ok and input_ok and captured.all(func(f): return f.saved and f.actual_frame == f.index - 1) else 1)

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
