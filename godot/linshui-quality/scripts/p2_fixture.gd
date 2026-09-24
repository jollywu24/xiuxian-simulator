extends Node3D

@onready var actor: AnimatedSprite3D = $Hero/VisualPivot/AnimatedSprite3D
@onready var hero: CharacterBody3D = $Hero
var direction := "s"
var attack := false

func _ready() -> void:
	actor.play("idle_s")
	for arg in OS.get_cmdline_user_args():
		if arg.begins_with("--evidence="):
			capture(arg.trim_prefix("--evidence="))

func _unhandled_input(event: InputEvent) -> void:
	if event is InputEventKey and event.pressed:
		if event.keycode == KEY_SPACE:
			attack = true
			actor.play("thrust_"+direction)
		if event.keycode == KEY_TAB:
			direction = "se" if direction == "s" else "s"
		if event.keycode == KEY_H: $CanvasLayer.visible = not $CanvasLayer.visible

func _process(_delta: float) -> void:
	if attack:
		if not actor.is_playing(): attack = false
		return
	var motion := "walk" if Vector2(hero.velocity.x,hero.velocity.z).length() > 0.15 else "idle"
	var desired := motion+"_"+direction
	if actor.animation != desired: actor.play(desired)

func capture(folder: String) -> void:
	await get_tree().create_timer(3).timeout
	# Identical pose for sampling / lighting A-B captures, not a random idle frame.
	attack = true
	actor.play("idle_s")
	actor.pause()
	actor.frame = 0
	set_process(false)
	await RenderingServer.frame_post_draw
	get_viewport().get_texture().get_image().save_png(folder.path_join("p2-readability.png"))
	$CanvasLayer.visible = false
	await RenderingServer.frame_post_draw
	get_viewport().get_texture().get_image().save_png(folder.path_join("p2-no-hud.png"))
	# Diagnostic only: isolates the second lighting pass; never the shipping setting.
	actor.shaded = false
	await RenderingServer.frame_post_draw
	get_viewport().get_texture().get_image().save_png(folder.path_join("p2-diagnostic-unshaded.png"))
	actor.shaded = true
	await RenderingServer.frame_post_draw
	var report := {"stage":"P2", "status":"visual_review_pending", "renderer":RenderingServer.get_current_rendering_method(), "gpu":RenderingServer.get_video_adapter_name(), "glow":$WorldEnvironment.environment.glow_enabled, "dof":false, "frames":48, "directions":["s","se"], "runtime_character":"AnimatedSprite3D", "draw_calls":Performance.get_monitor(Performance.RENDER_TOTAL_DRAW_CALLS_IN_FRAME), "primitives":Performance.get_monitor(Performance.RENDER_TOTAL_PRIMITIVES_IN_FRAME), "notes":"Instant sample only, not sustained performance evidence"}
	for pose in ["walk_s","walk_se","thrust_se"]:
		attack=true;actor.play(pose)
		await get_tree().create_timer(.45).timeout
		await RenderingServer.frame_post_draw
		get_viewport().get_texture().get_image().save_png(folder.path_join("p2-"+pose+".png"))
	var f := FileAccess.open(folder.path_join("p2-engine.json"),FileAccess.WRITE)
	f.store_string(JSON.stringify(report,"\t"));f.close()
	get_tree().quit()
