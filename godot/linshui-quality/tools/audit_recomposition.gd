extends SceneTree

func _initialize() -> void:
	var failures: Array = []
	var a := (load("res://scenes/validation/composition-review.tscn") as PackedScene).instantiate()
	var b := (load("res://scenes/validation/composition-refined.tscn") as PackedScene).instantiate()
	var ca: Camera3D = a.get_node("Camera3D")
	var cb: Camera3D = b.get_node("Camera3D")
	if not ca.transform.is_equal_approx(cb.transform) or not is_equal_approx(ca.size,cb.size):
		failures.append("P2 changed approved P1 camera")
	if not is_equal_approx(cb.size,18.8):
		failures.append("Wrong orthographic size")
	for target in [a,b]:
		var sprite: Sprite3D = target.get_node("Hero/StaticIdentitySample")
		if not is_equal_approx(sprite.pixel_size,0.022) or sprite.offset != Vector2(0,48):
			failures.append("Actor scale/anchor mismatch")
		if target.get_node("NavigationRegion3D").navigation_mesh.get_polygon_count() == 0:
			failures.append("Missing baked navigation")
	if ProjectSettings.get_setting("application/run/main_scene") != "res://scenes/main.tscn":
		failures.append("Default entry changed without final gate")
	for path: String in ["res://assets/review/hero-scale-sample-v1.png.import","res://assets/review/walk-s-motion-sample-v3.png.import"]:
		var config := ConfigFile.new()
		if config.load(path) != OK or config.get_value("params","compress/mode",-1) != 0 or config.get_value("params","detect_3d/compress_to",-1) != 0:
			failures.append("Sprite import must be lossless and automatic 3D conversion disabled: " + path)
	var report := {"camera_and_actor_contract_pass":failures.is_empty(),"failures":failures,"visual_pass":false,"note":"Static packed-scene audit, not art acceptance"}
	for arg in OS.get_cmdline_user_args():
		if arg.begins_with("--report="):
			var output := FileAccess.open(arg.trim_prefix("--report="),FileAccess.WRITE)
			output.store_string(JSON.stringify(report,"\t"))
			output.close()
	print(JSON.stringify(report))
	a.free()
	b.free()
	quit(0 if failures.is_empty() else 1)
