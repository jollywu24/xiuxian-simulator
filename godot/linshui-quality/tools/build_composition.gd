extends SceneTree
## Offline P1 graybox authoring. Saves editable nodes; no geometry generation on game launch.
var scene := Node3D.new()
var geometry := Node3D.new()
var palette := {"ground":Color("73766a"), "stone":Color("aaa799"), "bank":Color("656e69"), "wood":Color("80705c"), "water":Color("456c72"), "leaf":Color("64705d"), "wall":Color("bdb8a3")}

func _initialize() -> void:
	call_deferred("build")

func add(parent: Node, child: Node, label: String) -> Node:
	child.name = label
	parent.add_child(child)
	child.owner = scene
	return child

func block(label: String, at: Vector3, size: Vector3, color: Color, collision := true, walkable := false, visible_mesh := true) -> Node3D:
	var body: Node3D = StaticBody3D.new() if collision else Node3D.new()
	add(geometry, body, label)
	body.position = at
	if collision:
		body.collision_layer = 1
		body.collision_mask = 2
		var shape := CollisionShape3D.new()
		var box := BoxShape3D.new()
		box.size = size
		shape.shape = box
		add(body, shape, "Collision")
	if walkable:
		body.add_to_group("walkable", true)
	if visible_mesh:
		var mesh := MeshInstance3D.new()
		var cube := BoxMesh.new()
		cube.size = size
		var mat := StandardMaterial3D.new()
		mat.albedo_color = color
		mat.roughness = 0.9
		cube.material = mat
		mesh.mesh = cube
		add(body, mesh, "GrayboxMesh")
	return body

func cylinder(label: String, at: Vector3, radius: float, height: float, color: Color) -> void:
	var body := block(label, at, Vector3(radius*1.7, height, radius*1.7), color, true, false, false)
	var mesh := MeshInstance3D.new()
	var shape := CylinderMesh.new()
	shape.top_radius = radius
	shape.bottom_radius = radius
	shape.height = height
	var mat := StandardMaterial3D.new()
	mat.albedo_color = color
	shape.material = mat
	mesh.mesh = shape
	add(body, mesh, "GrayboxMesh")

func build() -> void:
	scene.name = "LinshuiCompositionReview"
	root.add_child(scene)
	add(scene, geometry, "GrayboxGeometry")
	# Banks extend beyond the frame. Collision boundaries are inset and non-rendering.
	block("WestLand", Vector3(-17.75, -1, 0), Vector3(34.5,2,70), palette.ground, true, true)
	# Leave a real notch for the descending dock ramp, not a ramp buried in solid land.
	block("WestBankNorth", Vector3(0.25,-1,-15.25), Vector3(1.5,2,39.5),palette.ground,true,true)
	block("WestBankSouth", Vector3(0.25,-1,20.95), Vector3(1.5,2,28.1),palette.ground,true,true)
	block("EastLand", Vector3(23, -1, 0), Vector3(36,2,70), palette.ground, true, true)
	block("FarBankTerraceGraybox", Vector3(8,0.3,-6), Vector3(5.5,0.6,8),palette.bank)
	block("FarBankUpperGraybox", Vector3(12,0.75,-10), Vector3(8,1.5,10),palette.ground)
	block("RearLandformGraybox", Vector3(-8,0.55,-12), Vector3(14,1.1,5),palette.ground)
	block("River", Vector3(3,-0.9,0), Vector3(4,0.1,70), palette.water, true)
	block("RoadToBridge", Vector3(-4.7,0.006,0.6), Vector3(11.4,0.012,2.7), palette.stone, false)
	block("TeaForecourt", Vector3(-6,0.009,1.4), Vector3(8.4,0.018,4.2), palette.stone, false)
	block("RoadToDock", Vector3(-1.7,0.012,3.5), Vector3(2.3,0.024,5.8), palette.stone, false)
	block("EastRoad", Vector3(9,0.006,0.6), Vector3(8,0.012,2.7), palette.stone, false)
	# Existing tea model is an explicitly unapproved scale reference.
	var tea := Node3D.new()
	add(scene, tea, "TeaReferenceUnapproved")
	tea.position = Vector3(-6,0,-3.8)
	for part: String in ["walls", "roof", "facade", "foundation"]:
		var asset := load("res://assets/environment/tea-%s-v1.glb" % part) as PackedScene
		add(tea, asset.instantiate(), part)
	block("TeaSolid", Vector3(-6,1.6,-3.8), Vector3(6.1,3.2,5.1), palette.wall, true, false, false)
	block("RoofPickBlocker", Vector3(-6,3.2,-3.8), Vector3(7,0.3,6.2), palette.wall, true, false, false)
	# Open veranda provides an actual sun-to-shade route instead of an inaccessible facade.
	block("VerandaCanopy", Vector3(-6,2.8,-0.1), Vector3(7.1,0.18,2.2), palette.wood)
	for x: float in [-9.15,-2.85]:
		block("VerandaPost", Vector3(x,1.4,0.85), Vector3(0.16,2.8,0.16), palette.wood)
	block("TeaCounter", Vector3(-7.4,0.45,0.25), Vector3(1.7,0.9,0.65), palette.wood)
	cylinder("VendorGraybox", Vector3(-7.4,0.85,-0.4), 0.25,1.7,Color("899697"))
	# Raised bridge with shallow physical ramps, never teleport links.
	block("BridgeDeck", Vector3(3,0.2,0.6), Vector3(4,0.3,2.4), palette.wood, true, true)
	for side: int in [-1,1]:
		var ramp := block("BridgeRamp", Vector3(3+side*3,0.025,0.6), Vector3(2.05,0.3,2.4), palette.wood, true, true)
		ramp.rotation.z = -side*atan(0.35/2.0)
	for z: float in [-0.65,1.85]:
		block("BridgeRail", Vector3(3,1.0,z), Vector3(4.2,0.12,0.12), palette.wood)
		for x: float in [1.0,3.0,5.0]:
			block("BridgePost", Vector3(x,0.65,z), Vector3(0.13,1.3,0.13), palette.wood)
	for x: float in [1.45,4.55]:
		block("BridgeSupport", Vector3(x,-0.3,0.6), Vector3(0.25,1.2,2.4), palette.bank)
	block("DockDeck", Vector3(1.75,-0.4,5.7), Vector3(2,0.3,2.4), palette.wood, true, true)
	var dock_ramp := block("DockRamp", Vector3(0.25,-0.275,5.7), Vector3(1.65,0.3,2.4), palette.wood, true, true)
	dock_ramp.rotation.z = atan(-0.25/1.5)
	for x: float in [-0.5,2.5]:
		for z: float in [4.6,6.8]:
			block("DockPile", Vector3(x,-0.6,z), Vector3(0.18,1.4,0.18), palette.wood)
	block("BoatGraybox", Vector3(3.8,-0.48,6.0), Vector3(1.25,0.6,3.2), palette.wood)
	cylinder("WillowTrunkGraybox", Vector3(-10,1.55,5.2), 0.3,3.1,palette.wood)
	block("WillowCrownGraybox", Vector3(-10,3.6,5.2), Vector3(3.8,1.5,3.2), palette.leaf, false)
	cylinder("PracticeDummyGraybox", Vector3(-3.5,0.7,4.2),0.24,1.4,palette.wood)
	block("DummyArm", Vector3(-3.5,1.05,4.2), Vector3(1.1,0.13,0.13), palette.wood)
	# Guards are collision only; all are baked so click navigation uses the same boundaries.
	for x: float in [-13,11]:
		block("Boundary", Vector3(x,1,0),Vector3(0.25,2,22),palette.bank,true,false,false)
	for z: float in [-10,9]:
		block("Boundary", Vector3(-1,1,z),Vector3(24,2,0.25),palette.bank,true,false,false)
	for spec: Array in [[1.0,-5.5,8.8],[1.0,3.1,1.9],[1.0,8.3,2.0],[5.0,-5.5,8.8],[5.0,5.6,7.1]]:
		block("RiverSafetyBoundary",Vector3(spec[0],0.5,spec[1]),Vector3(0.15,1.3,spec[2]),palette.bank,true,false,false)
	# Right-hand dock edge and end stop keyboard movement into water.
	block("DockEndBoundary",Vector3(2.75,0.5,5.7),Vector3(0.12,1.5,2.5),palette.bank,true,false,false)
	for z: float in [4.45,6.95]:
		block("DockSideBoundary",Vector3(1.0,0.5,z),Vector3(3.5,1.5,0.1),palette.bank,true,false,false)
	var environment := WorldEnvironment.new()
	environment.environment = Environment.new()
	environment.environment.background_mode = Environment.BG_COLOR
	environment.environment.background_color = Color("7f959b")
	environment.environment.ambient_light_source = Environment.AMBIENT_SOURCE_COLOR
	environment.environment.ambient_light_color = Color("b4cbd9")
	environment.environment.ambient_light_energy = 0.45
	environment.environment.tonemap_mode = Environment.TONE_MAPPER_FILMIC
	environment.environment.ssao_enabled = false
	add(scene, environment,"WorldEnvironment")
	var sun := DirectionalLight3D.new()
	sun.rotation_degrees = Vector3(-42,-35,0)
	sun.light_color = Color("ffe2b9")
	sun.light_energy = 1.1
	sun.shadow_enabled = true
	add(scene,sun,"Sun")
	var camera := Camera3D.new()
	add(scene,camera,"Camera3D")
	camera.projection = Camera3D.PROJECTION_ORTHOGONAL
	camera.size = 18.8
	camera.position = Vector3(5,24,33.5)
	camera.look_at(Vector3(-2,0,0))
	camera.current = true
	var hero := CharacterBody3D.new()
	add(scene,hero,"Hero")
	hero.position = Vector3(-5,0.05,2.6)
	hero.collision_layer = 2
	hero.collision_mask = 1
	hero.floor_snap_length = 0.4
	var capsule := CollisionShape3D.new()
	capsule.shape = CapsuleShape3D.new()
	capsule.shape.radius = 0.23
	capsule.shape.height = 1.7
	capsule.position.y = 0.85
	add(hero,capsule,"Collision")
	var agent := NavigationAgent3D.new()
	agent.path_desired_distance = 0.45
	agent.target_desired_distance = 0.3
	agent.path_height_offset = 0.1
	add(hero,agent,"NavigationAgent3D")
	var sprite := Sprite3D.new()
	sprite.texture = load("res://assets/review/hero-scale-sample-v1.png")
	sprite.pixel_size = 0.022
	sprite.offset = Vector2(0,48)
	sprite.texture_filter = BaseMaterial3D.TEXTURE_FILTER_NEAREST
	sprite.alpha_cut = SpriteBase3D.ALPHA_CUT_DISCARD
	sprite.shaded = true
	sprite.cast_shadow = GeometryInstance3D.SHADOW_CASTING_SETTING_ON
	sprite.basis = camera.basis
	add(hero,sprite,"StaticIdentitySample")
	var nav := NavigationRegion3D.new()
	nav.navigation_mesh = NavigationMesh.new()
	nav.navigation_mesh.cell_size = 0.15
	nav.navigation_mesh.cell_height = 0.1
	nav.navigation_mesh.agent_radius = 0.3
	nav.navigation_mesh.agent_height = 1.7
	nav.navigation_mesh.agent_max_climb = 0.2
	nav.navigation_mesh.geometry_parsed_geometry_type = NavigationMesh.PARSED_GEOMETRY_STATIC_COLLIDERS
	nav.navigation_mesh.geometry_collision_mask = 1
	add(scene,nav,"NavigationRegion3D")
	var source := NavigationMeshSourceGeometryData3D.new()
	NavigationServer3D.parse_source_geometry_data(nav.navigation_mesh,source,geometry)
	NavigationServer3D.bake_from_source_geometry_data(nav.navigation_mesh,source)
	var canvas := CanvasLayer.new()
	add(scene,canvas,"ReviewUI")
	var title := Label.new()
	title.text = "临水茶铺 · 整屏构图验证 / P1 GRAYBOX"
	title.position = Vector2(28,20)
	title.add_theme_font_size_override("font_size",26)
	title.add_theme_color_override("font_shadow_color",Color.BLACK)
	title.add_theme_constant_override("shadow_offset_x",2)
	title.add_theme_constant_override("shadow_offset_y",2)
	add(canvas,title,"Title")
	var note := Label.new()
	note.text = "P1 灰盒｜人物为静态尺寸试片；动作、美术、声音尚未验收"
	note.position = Vector2(28,60)
	note.add_theme_font_size_override("font_size",18)
	add(canvas,note,"Note")
	var controls := Label.new()
	controls.text = "WASD / 点击地面移动    E 查看交互位置    Esc 暂停    R 回到起点"
	controls.position = Vector2(28,91)
	controls.add_theme_font_size_override("font_size",18)
	add(canvas,controls,"Controls")
	# Attach only after construction to avoid executing runtime hooks while authoring.
	hero.set_script(load("res://scripts/composition_player.gd"))
	scene.set_script(load("res://scripts/composition_review.gd"))
	var packed := PackedScene.new()
	var err := packed.pack(scene)
	if err == OK:
		err = ResourceSaver.save(packed,"res://scenes/validation/composition-review.tscn")
	print(JSON.stringify({"saved":err == OK,"navigation_polygons":nav.navigation_mesh.get_polygon_count(),"status":"graybox_not_accepted"}))
	quit(0 if err == OK else 1)
