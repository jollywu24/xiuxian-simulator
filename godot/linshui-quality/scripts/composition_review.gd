extends Node3D
## Independent P1 approval scene. Gray geometry and static hero are never a P2 pass.
@onready var hero = $Hero
@onready var camera: Camera3D = $Camera3D
@onready var note: Label = $ReviewUI/Note
var evidence := ""
var route_test := false
var evidence_prefix := "composition"
var paused := false
var report := {"stage":"P1-recomposition", "visual_approved":false, "character":"static unapproved identity/scale sample", "checks":[], "failures":[]}

func _ready() -> void:
	for arg in OS.get_cmdline_user_args():
		if arg.begins_with("--composition-evidence="):
			evidence = arg.trim_prefix("--composition-evidence=")
		if arg == "--route-test":
			route_test = true
	if evidence.is_empty():
		return
	hero.automated = true
	await get_tree().create_timer(1.5).timeout
	report["renderer"] = RenderingServer.get_current_rendering_method()
	report["adapter"] = RenderingServer.get_video_adapter_name()
	report["viewport"] = [get_viewport().get_visible_rect().size.x, get_viewport().get_visible_rect().size.y]
	check("forward_plus", report.renderer == "forward_plus")
	var foot := camera.unproject_position(hero.position)
	var head := camera.unproject_position(hero.position + camera.global_basis.y * 80.0 * 0.022)
	report["projected_hero_body_px"] = foot.distance_to(head)
	var expected_height: float = get_viewport().get_visible_rect().size.y * 1.76 / camera.size
	check("fixed_actor_scale", absf(foot.distance_to(head) - expected_height) < 0.5)
	await capture("overview")
	if route_test:
		await run_routes()
	var suffix := "-routes" if route_test else ""
	var out := FileAccess.open(evidence.path_join("%s-report-%d%s.json" % [evidence_prefix, int(get_viewport().get_visible_rect().size.y), suffix]), FileAccess.WRITE)
	out.store_string(JSON.stringify(report, "\t"))
	out.close()
	get_tree().quit(0 if report.failures.is_empty() else 1)

func _unhandled_input(event: InputEvent) -> void:
	if not event is InputEventKey or not event.pressed or event.echo:
		return
	if event.keycode == KEY_ESCAPE:
		paused = not paused
		hero.input_locked = paused
		note.text = "暂停 — Esc 继续" if paused else "P1 灰盒｜人物为静态尺寸试片；动作、美术、声音尚未验收"
	if event.keycode == KEY_R and not paused:
		hero.stop()
		hero.position = Vector3(-5.0, 0.05, 2.6)
	if event.keycode == KEY_E and not paused:
		if hero.position.distance_to(Vector3(-6.8, 0, 0.4)) < 2.0:
			note.text = "茶铺交互位置已到达｜正式对话与倒茶在 P4 验收"
		elif hero.position.distance_to(Vector3(1.3, -0.25, 5.7)) < 2.0:
			note.text = "码头交互位置已到达｜正式调查与声音尚未制作"
		else:
			note.text = "靠近茶铺柜台或码头查看交互位置（P1 占位提示）"

func check(id: String, passed: bool, details: Dictionary = {}) -> void:
	report.checks.append({"id":id, "pass":passed, "details":details})
	if not passed:
		report.failures.append(id)

func capture(label: String) -> void:
	await RenderingServer.frame_post_draw
	var path := evidence.path_join("%s-%s-%d.png" % [evidence_prefix, label, int(get_viewport().get_visible_rect().size.y)])
	check("capture_" + label, get_viewport().get_texture().get_image().save_png(path) == OK)

func run_routes() -> void:
	var map: RID = hero.agent.get_navigation_map()
	check("navigation_ready", NavigationServer3D.map_get_iteration_id(map) > 0)
	var points := [
		["under_eaves", Vector3(-5.7, 0, 0.4)],
		["bridge", Vector3(3, 0.35, 0.6)],
		["far_bank", Vector3(7.8, 0, 1.2)],
		["return_bridge", Vector3(-1.0, 0, 0.6)],
		["dock", Vector3(1.2, -0.25, 5.7)],
		["dummy", Vector3(-2.8, 0, 3.5)],
		["return_tea", Vector3(-5.7, 0, 0.4)]
	]
	var samples: Array = []
	for entry: Array in points:
		var target: Vector3 = entry[1]
		var accepted: bool = hero.walk_to(target)
		var start := Time.get_ticks_msec()
		var wet := false
		var min_y := 100.0
		var max_y := -100.0
		while accepted and Time.get_ticks_msec() - start < 16000:
			await get_tree().physics_frame
			var p: Vector3 = hero.position
			min_y = minf(min_y, p.y)
			max_y = maxf(max_y, p.y)
			if p.y < -0.6:
				wet = true
			if Engine.get_physics_frames() % 12 == 0:
				samples.append([entry[0], p.x, p.y, p.z])
			if Vector2(p.x-target.x, p.z-target.z).length() < 0.32:
				break
		var reached: bool = hero.position.distance_to(target) < 0.45
		check("route_" + entry[0], accepted and reached and not wet, {"actual":str(hero.position), "target":str(target), "min_y":min_y, "max_y":max_y, "fell":wet, "path":str(hero.agent.get_current_navigation_path()), "path_index":hero.agent.get_current_navigation_path_index()})
		if entry[0] in ["under_eaves", "bridge", "dock"]:
			await capture(entry[0])
	hero.stop()
	for entry: Array in [["water", Vector3(3, -0.8, -3)], ["roof", Vector3(-6, 4.5, -3)]]:
		var result: bool = hero.pick(camera.unproject_position(entry[1]))
		check("reject_" + entry[0], not result, {"pick":hero.last_pick})
	check("bridge_pick", hero.pick(camera.unproject_position(Vector3(3, 0.35, 0.6))))
	hero.stop()
	hero.input_locked = true
	check("locked_input_rejects_target", not hero.walk_to(Vector3(0, 0, 3)))
	hero.input_locked = false
	# Verify keyboard input and river collision independently of navigation.
	var shore := Vector3(-1.2, 0, -2.5)
	var shore_ok: bool = hero.walk_to(shore)
	var shore_start := Time.get_ticks_msec()
	while shore_ok and Time.get_ticks_msec() - shore_start < 12000:
		await get_tree().physics_frame
		if hero.position.distance_to(shore) < 0.4:
			break
	check("keyboard_test_setup", shore_ok and hero.position.distance_to(shore) < 0.4)
	hero.stop()
	hero.automated = false
	var keyboard_start: Vector3 = hero.position
	var key := InputEventKey.new()
	key.physical_keycode = KEY_D
	key.pressed = true
	Input.parse_input_event(key)
	var safe := true
	for tick in range(180):
		await get_tree().physics_frame
		if hero.position.x > 1.0 or hero.position.y < -0.5:
			safe = false
	key = InputEventKey.new()
	key.physical_keycode = KEY_D
	key.pressed = false
	Input.parse_input_event(key)
	hero.automated = true
	check("keyboard_moves", hero.position.distance_to(keyboard_start) > 0.6)
	check("keyboard_river_boundary", safe, {"actual":str(hero.position)})
	hero.stop()
	report["physical_samples"] = samples
	report["method"] = "Real CharacterBody3D movement at physics ticks; no route teleports. Screenshots from Forward+ viewport."
