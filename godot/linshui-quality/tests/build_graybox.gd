extends SceneTree

var main: Node3D
var nav: NavigationRegion3D

func own(node: Node, parent: Node) -> void:
	parent.add_child(node)
	node.owner = main

func box(label: String, pos: Vector3, size: Vector3, color: Color, walkable: bool = false, solid: bool = true, tilt: float = 0.0) -> void:
	var body := StaticBody3D.new(); body.name = label
	own(body, nav); body.position = pos; body.rotation.z = tilt
	if walkable: body.add_to_group("walkable", true)
	var mesh := MeshInstance3D.new(); mesh.name = "GrayboxMesh"
	var shape := BoxMesh.new(); shape.size = size
	var mat := StandardMaterial3D.new(); mat.albedo_color = color; mat.roughness = 0.85
	shape.material = mat; mesh.mesh = shape; own(mesh,body)
	if solid:
		var collision := CollisionShape3D.new(); var bs := BoxShape3D.new(); bs.size = size
		collision.shape = bs; own(collision,body)

func _initialize() -> void:
	call_deferred("build")

func build() -> void:
	main = Node3D.new(); main.name = "LinshuiGraybox"
	root.add_child(main)
	main.set_script(load("res://scripts/graybox_qa.gd"))
	nav = NavigationRegion3D.new(); nav.name = "NavigationRegion3D"; own(nav,main)
	var nm := NavigationMesh.new()
	nm.geometry_parsed_geometry_type = NavigationMesh.PARSED_GEOMETRY_STATIC_COLLIDERS
	nm.agent_radius = 0.3; nm.agent_height = 1.7; nm.agent_max_climb = 0.3
	nm.cell_size = 0.15; nm.cell_height = 0.1
	nav.navigation_mesh = nm
	box("WestBankNorth",Vector3(-5,-0.25,-2.5),Vector3(12,0.5,13),Color("aaa99c"),true)
	box("WestBankSouth",Vector3(-5,-0.25,7.5),Vector3(12,0.5,3),Color("aaa99c"),true)
	box("WestBankStairNotch",Vector3(-5.75,-0.25,5),Vector3(10.5,0.5,2),Color("aaa99c"),true)
	box("EastBank",Vector3(8,-0.25,0),Vector3(4,0.5,8),Color("aaa99c"),true)
	box("TeaHouse",Vector3(-8,1.75,-2),Vector3(6,3.5,6),Color("88877f"))
	box("TeaTable",Vector3(-4,0.45,-1.8),Vector3(1.2,0.9,1.0),Color("726b62"))
	box("River",Vector3(3.5,-0.7,0),Vector3(5,0.1,22),Color("688d91"),false,false)
	box("BridgeWestRamp",Vector3(1.5,0.075,0),Vector3(1.35,0.2,2.2),Color("aaa085"),true,true,0.27)
	box("BridgeDeck",Vector3(3.5,0.25,0),Vector3(3,0.2,2.2),Color("aaa085"),true)
	box("BridgeEastRamp",Vector3(5.5,0.075,0),Vector3(1.35,0.2,2.2),Color("aaa085"),true,true,-0.27)
	for z in [-1.1,1.1]:
		box("Rail",Vector3(3.5,0.85,z),Vector3(5,0.2,0.12),Color("706c62"))
	box("Dock",Vector3(2,-0.45,5),Vector3(2,0.2,2.5),Color("8f8979"),true)
	box("DockRamp",Vector3(0.5,-0.275,5),Vector3(2.08,0.2,2),Color("979082"),true,true,-0.1732)
	box("PracticePost",Vector3(-1,0.7,7),Vector3(0.4,1.4,0.4),Color("716c63"))
	var env := WorldEnvironment.new(); env.name = "WorldEnvironment"; own(env,main)
	var e := Environment.new(); e.background_mode = Environment.BG_COLOR; e.background_color = Color("b7c5cd")
	e.ambient_light_source = Environment.AMBIENT_SOURCE_COLOR; e.ambient_light_color = Color("bfd0dd"); e.ambient_light_energy = 0.5
	e.tonemap_mode = Environment.TONE_MAPPER_FILMIC; e.glow_enabled = false; env.environment = e
	var sun := DirectionalLight3D.new(); sun.name = "Sun"; own(sun,main)
	sun.rotation_degrees = Vector3(-50,-30,0); sun.light_energy = 1.25; sun.shadow_enabled = true
	var cam := Camera3D.new(); cam.name = "Camera3D"; own(cam,main)
	cam.position = Vector3(14,25,28); cam.look_at(Vector3(-1,0,0)); cam.fov = 28; cam.current = true
	var hero := CharacterBody3D.new(); hero.name = "Hero"; own(hero,main)
	hero.position = Vector3(-3,0.1,3); hero.floor_snap_length = 0.4
	hero.set_script(load("res://scripts/player_controller.gd"))
	var capsule := CapsuleShape3D.new(); capsule.radius = 0.28; capsule.height = 1.7
	var cs := CollisionShape3D.new(); cs.shape = capsule; cs.position.y = 0.85; own(cs,hero)
	var hm := MeshInstance3D.new(); var cm := CapsuleMesh.new(); cm.radius = 0.28; cm.height = 1.7
	var mat := StandardMaterial3D.new(); mat.albedo_color = Color("45596b"); cm.material = mat
	hm.mesh = cm; hm.position.y = 0.85; own(hm,hero)
	var agent := NavigationAgent3D.new(); agent.name = "NavigationAgent3D"
	agent.path_desired_distance = 0.4; agent.target_desired_distance = 0.35; own(agent,hero)
	var ui := CanvasLayer.new(); own(ui,main)
	var label := Label.new(); label.text = "P1 GRAYBOX / NOT FINAL ART    |    WASD · Shift · Click to walk"; label.position = Vector2(28,24)
	label.add_theme_font_size_override("font_size",24); own(label,ui)
	nav.bake_navigation_mesh(false)
	print("Baked polygons: ",nm.get_polygon_count())
	DirAccess.make_dir_recursive_absolute("res://scenes/validation")
	var packed := PackedScene.new(); packed.pack(main)
	var err := ResourceSaver.save(packed,"res://scenes/validation/graybox.tscn")
	print("Graybox save: ",err)
	quit(err)
