extends SceneTree

var errors: Array[String]=[]
func check(ok: bool,message: String) -> void:
	if not ok: errors.append(message)
func _initialize() -> void:
	call_deferred("run")
func run() -> void:
	check(ProjectSettings.get_setting("rendering/renderer/rendering_method")=="forward_plus","renderer must be Forward+")
	var gray:Node=load("res://scenes/validation/graybox.tscn").instantiate()
	check(gray.get_node("NavigationRegion3D").navigation_mesh.get_polygon_count()>0,"graybox navigation must be baked")
	check(gray.get_node("Hero") is CharacterBody3D,"hero physics")
	gray.free()
	var p2:Node=load("res://scenes/validation/quality-fixture.tscn").instantiate()
	var sprite:AnimatedSprite3D=p2.get_node("Hero/VisualPivot/AnimatedSprite3D")
	check(sprite.shaded,"sprite must receive lighting")
	check(not sprite.no_depth_test,"sprite depth testing required")
	check(sprite.alpha_cut==SpriteBase3D.ALPHA_CUT_DISCARD,"sprite alpha discard required")
	check(sprite.billboard==BaseMaterial3D.BILLBOARD_DISABLED,"GPU billboard not used")
	check(sprite.offset==Vector2(0,48),"fixed foot anchor mapping")
	for action in ["idle","walk","thrust"]:
		var config := ConfigFile.new()
		check(config.load("res://assets/characters/hero/"+action+"-p2-v1.png.import")==OK,"sprite import settings exist")
		check(config.get_value("params","compress/mode",-1)==0,"sprite must use lossless import: "+action)
		check(config.get_value("params","detect_3d/compress_to",-1)==0,"disable automatic VRAM recompression: "+action)
		check(config.get_value("params","mipmaps/generate",true)==false,"native-scale sprite baseline has no mipmaps")
		for direction in ["s","se"]:
			check(sprite.sprite_frames.has_animation(action+"_"+direction),"missing animation "+action+direction)
	check(p2.get_node("TeaHouse").get_child_count()==4,"four imported tea GLB modules")
	check(not p2.get_node("WorldEnvironment").environment.glow_enabled,"P2 glow disabled")
	p2.free()
	print(JSON.stringify({"suite":"P0-P2 resource contracts only","failures":errors,"pass":errors.is_empty(),"not_covered":["P4 gameplay/state/save","pixel art visual acceptance","sustained performance","Windows export"]}))
	quit(0 if errors.is_empty() else 1)
