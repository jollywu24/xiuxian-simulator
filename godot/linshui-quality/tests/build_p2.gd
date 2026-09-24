extends SceneTree

func own(n: Node, p: Node, owner_node: Node) -> void:
	p.add_child(n);n.owner = owner_node

func _initialize() -> void:
	call_deferred("build")

func build() -> void:
	var main := Node3D.new(); main.name="QualityFixture";root.add_child(main)
	main.set_script(load("res://scripts/p2_fixture.gd"))
	var tea := Node3D.new();tea.name="TeaHouse";own(tea,main,main);tea.position=Vector3(-5,0,-2)
	for module in ["walls","roof","facade","foundation"]:
		var instance: Node3D = load("res://assets/environment/tea-"+module+"-v1.glb").instantiate()
		instance.name=module;own(instance,tea,main)
	var floor_body := StaticBody3D.new();floor_body.name="Pavement";own(floor_body,main,main);floor_body.add_to_group("walkable",true)
	for x in [-6,-4]:
		for z in [2,4]:
			var tile:Node3D=load("res://assets/environment/pavement-1-v1.glb").instantiate();tile.position=Vector3(x,0,z);own(tile,floor_body,main)
	var floor_shape := CollisionShape3D.new();var bs:=BoxShape3D.new();bs.size=Vector3(4,.2,4);floor_shape.shape=bs;floor_shape.position=Vector3(-5,-.1,3);own(floor_shape,floor_body,main)
	# Fixture-only safety bounds keep the small art review slab usable; these are
	# explicitly not the final world's navigation/collision implementation.
	for spec in [[Vector3(-7.05,1,3),Vector3(.1,2,4.2)],[Vector3(-2.95,1,3),Vector3(.1,2,4.2)],[Vector3(-5,1,.95),Vector3(4.2,2,.1)],[Vector3(-5,1,5.05),Vector3(4.2,2,.1)]]:
		var boundary:=StaticBody3D.new();boundary.name="FixtureBoundary";own(boundary,main,main)
		var shape:=CollisionShape3D.new();var bounds:=BoxShape3D.new();bounds.size=spec[1];shape.shape=bounds;shape.position=spec[0];own(shape,boundary,main)
	var nav:=NavigationRegion3D.new();nav.name="NavigationRegion3D";own(nav,main,main)
	var nm:=NavigationMesh.new();nm.vertices=PackedVector3Array([Vector3(-6.7,.05,1.3),Vector3(-6.7,.05,4.7),Vector3(-3.3,.05,4.7),Vector3(-3.3,.05,1.3)]);nm.add_polygon(PackedInt32Array([0,1,2,3]));nm.cell_size=.15;nm.cell_height=.1;nav.navigation_mesh=nm
	var env:=WorldEnvironment.new();env.name="WorldEnvironment";own(env,main,main)
	var e:=Environment.new();e.background_mode=Environment.BG_COLOR;e.background_color=Color("a9bdc9");e.ambient_light_source=Environment.AMBIENT_SOURCE_COLOR;e.ambient_light_color=Color("b9c9d4");e.ambient_light_energy=.55;e.tonemap_mode=Environment.TONE_MAPPER_FILMIC;e.glow_enabled=false;env.environment=e
	var sun:=DirectionalLight3D.new();sun.name="Sun";own(sun,main,main);sun.rotation_degrees=Vector3(-50,-30,0);sun.light_energy=1.25;sun.shadow_enabled=true
	var cam:=Camera3D.new();cam.name="Camera3D";own(cam,main,main);cam.position=Vector3(8,17,24);cam.look_at(Vector3(-4,0,0));cam.fov=28;cam.current=true
	var hero:=CharacterBody3D.new();hero.name="Hero";own(hero,main,main);hero.position=Vector3(-4,.05,3);hero.floor_snap_length=.4;hero.set_script(load("res://scripts/player_controller.gd"))
	var cs:=CollisionShape3D.new();var capsule:=CapsuleShape3D.new();capsule.radius=.28;capsule.height=1.7;cs.shape=capsule;cs.position.y=.85;own(cs,hero,main)
	var agent:=NavigationAgent3D.new();agent.name="NavigationAgent3D";own(agent,hero,main)
	agent.path_desired_distance=.4;agent.target_desired_distance=.35
	var pivot:=Node3D.new();pivot.name="VisualPivot";own(pivot,hero,main);pivot.rotation=cam.rotation
	var sprite:=AnimatedSprite3D.new();sprite.name="AnimatedSprite3D";own(sprite,pivot,main)
	sprite.pixel_size=.018;sprite.offset=Vector2(0,48);sprite.shaded=true;sprite.alpha_cut=SpriteBase3D.ALPHA_CUT_DISCARD;sprite.texture_filter=BaseMaterial3D.TEXTURE_FILTER_NEAREST;sprite.billboard=BaseMaterial3D.BILLBOARD_DISABLED
	var sf:=SpriteFrames.new();sf.remove_animation("default")
	for action in ["idle","walk","thrust"]:
		var count:int={"idle":4,"walk":8,"thrust":12}[action]
		var texture:Texture2D=load("res://assets/characters/hero/"+action+"-p2-v1.png")
		for row in range(2):
			var animation:String=action+"_"+["s","se"][row];sf.add_animation(animation);sf.set_animation_speed(animation,12);sf.set_animation_loop(animation,action!="thrust")
			for i in range(count):
				var at:=AtlasTexture.new();at.atlas=texture;at.region=Rect2(i*160,row*128,160,128);sf.add_frame(animation,at)
	sprite.sprite_frames=sf;sprite.animation="idle_s"
	var ui:=CanvasLayer.new();ui.name="CanvasLayer";own(ui,main,main)
	var label:=Label.new();label.text="P2 WORK IN REVIEW — NOT ACCEPTED   |   WASD move · Tab S/SE · Space thrust · H hide UI";label.position=Vector2(25,25);label.add_theme_font_size_override("font_size",22);own(label,ui,main)
	DirAccess.make_dir_recursive_absolute("res://scenes/validation")
	var packed:=PackedScene.new();packed.pack(main);var err:=ResourceSaver.save(packed,"res://scenes/validation/quality-fixture.tscn")
	print("P2 fixture saved: ",err);quit(err)
