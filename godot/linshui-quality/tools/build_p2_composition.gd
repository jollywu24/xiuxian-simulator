extends SceneTree

func _initialize() -> void:
	call_deferred("build")

func build() -> void:
	var scene := (load("res://scenes/validation/composition-review.tscn") as PackedScene).instantiate()
	scene.set_script(null)
	root.add_child(scene)
	scene.name = "LinshuiP2Candidate"
	var geometry := scene.get_node("GrayboxGeometry")
	for name: String in ["RoadToBridge","TeaForecourt","RoadToDock","River","VerandaCanopy"]:
		geometry.get_node(name + "/GrayboxMesh").visible = false
	for child in geometry.get_children():
		if str(child.name).begins_with("VerandaPost"):
			child.get_node("GrayboxMesh").visible = false
	for entry: Array in [["tea-veranda-p2-v2",Vector3(-6,0,-3.8)],["paving-layout-p2-v2",Vector3.ZERO],["bank-layout-p2-v2",Vector3.ZERO]]:
		var mesh := (load("res://assets/environment/%s.glb" % entry[0]) as PackedScene).instantiate()
		mesh.name = entry[0].replace("-","_")
		scene.add_child(mesh)
		mesh.owner = scene
		mesh.position = entry[1]
	var water := MeshInstance3D.new()
	water.name = "RiverSurfaceP2"
	var plane := PlaneMesh.new()
	plane.size = Vector2(4,70)
	plane.subdivide_width = 24
	plane.subdivide_depth = 140
	water.mesh = plane
	water.cast_shadow = GeometryInstance3D.SHADOW_CASTING_SETTING_OFF
	water.position = Vector3(3,-0.85,0)
	var material := ShaderMaterial.new()
	material.shader = load("res://assets/materials/river-p2-v2.gdshader")
	water.material_override = material
	scene.add_child(water)
	water.owner = scene
	scene.set_script(load("res://scripts/p2_composition_review.gd"))
	var packed := PackedScene.new()
	var err := packed.pack(scene)
	if err == OK:
		err = ResourceSaver.save(packed,"res://scenes/validation/composition-refined.tscn")
	print(JSON.stringify({"p2_scene_saved":err==OK,"visual_approved":false,"camera":"P1 unchanged"}))
	quit(0 if err == OK else 1)
