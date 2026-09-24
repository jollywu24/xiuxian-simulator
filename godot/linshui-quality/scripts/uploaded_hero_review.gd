extends Node3D
## User-provided sheets in an isolated fixture. Not a G2 approval or rig provenance.
const DIRECTIONS := ["n", "ne", "e", "se", "s", "sw", "w", "nw"]
const SHEETS := {"idle": [2,4,8], "walk": [3,6,8], "run": [4,6,8], "attack": [5,6,7]}
# Fixed sheet-level layout, including transparent outer margins. Not frame-wise offsets.
const X_LAYOUT := {"idle": [40,199,199], "walk": [30,173,173], "run": [10,177,177], "attack": [0,181,181]}
const ATTACK_ROW_START := [0,180,370,560,750,940,1135]
const ATTACK_FRAME_HEIGHT := 190
const IDLE_FRAME_HEIGHT := 1774.0/8.0
const IDLE_BODY_HEIGHT := 214.0 # S key pose: opaque y=5..219.
const ATTACK_BODY_HEIGHT := 158.0 # S ready pose: opaque y=19..177.
const IDLE_FOOT_MARGIN := 3.0
const ATTACK_FOOT_MARGIN := 13.0
const IDLE_PIXEL_SIZE := 1.48/IDLE_FRAME_HEIGHT
const IDLE_S_CELL_HEIGHT := 221.0 # floor(5*1774/8)-floor(4*1774/8).
const IDLE_FOOT_WORLD := (IDLE_FRAME_HEIGHT*.47-IDLE_S_CELL_HEIGHT*.5+IDLE_FOOT_MARGIN)*IDLE_PIXEL_SIZE
@onready var actor: AnimatedSprite3D = $Hero/VisualPivot/AnimatedSprite3D
@onready var hero: CharacterBody3D = $Hero
@onready var camera: Camera3D = $Camera3D
var facing := "s"
var attacking := false
var capturing := false
var evidence := ""

static func make_frames(attack_texture: Texture2D = null) -> SpriteFrames:
	var frames := SpriteFrames.new()
	frames.remove_animation("default")
	for action: String in SHEETS:
		var spec: Array = SHEETS[action]
		var texture: Texture2D = attack_texture if action == "attack" and attack_texture != null else load("res://assets/characters/hero/character%d.png" % spec[0]) as Texture2D
		for row in range(spec[2]):
			var name: String = action+"_"+DIRECTIONS[row]
			frames.add_animation(name)
			frames.set_animation_loop(name, action != "attack")
			frames.set_animation_speed(name, {"idle":5.0,"walk":8.0,"run":12.0,"attack":10.0}[action])
			for col in range(spec[1]):
				var tile := AtlasTexture.new()
				tile.atlas = texture
				# Preserve the sheet grid; do not individually recenter feet each frame.
				var layout: Array = X_LAYOUT[action]
				var x0: int = layout[0]+col*layout[1]
				var x1: int = x0+layout[2]
				var y0: int = ATTACK_ROW_START[row] if action=="attack" else floori(float(row)*texture.get_height()/spec[2])
				var y1: int = y0+ATTACK_FRAME_HEIGHT if action=="attack" else floori(float(row+1)*texture.get_height()/spec[2])
				tile.region = Rect2(x0,y0,x1-x0,y1-y0)
				frames.add_frame(name,tile)
	return frames

func _ready() -> void:
	actor.texture_filter = BaseMaterial3D.TEXTURE_FILTER_NEAREST
	for arg in OS.get_cmdline_user_args():
		if arg.begins_with("--attack-review-source="):
			var review_path: String = arg.trim_prefix("--attack-review-source=")
			var review_image := Image.load_from_file(review_path)
			if review_image == null or review_image.is_empty():
				push_error("Cannot load attack review image: " + review_path)
				get_tree().quit(1)
				return
			actor.sprite_frames = make_frames(ImageTexture.create_from_image(review_image))
	play_pose("idle")
	$CanvasLayer.get_child(0).text = "UPLOADED HERO REVIEW — NOT ACCEPTED | WASD / Shift run / Space attack | NW attack missing"
	for arg in OS.get_cmdline_user_args():
		if arg.begins_with("--attack-evidence="):
			evidence = arg.trim_prefix("--attack-evidence=")
			attack_check()
		if arg.begins_with("--idle-evidence="):
			evidence = arg.trim_prefix("--idle-evidence=")
			idle_check()
		if arg.begins_with("--motion-evidence="):
			evidence = arg.trim_prefix("--motion-evidence=")
			motion_check()
		if arg.begins_with("--evidence="):
			evidence = arg.trim_prefix("--evidence=")
			capture()
		if arg.begins_with("--upload-evidence="):
			evidence = arg.trim_prefix("--upload-evidence=")
			capture()

func play_pose(action: String) -> void:
	var spec: Array = SHEETS[action]
	var texture := load("res://assets/characters/hero/character%d.png" % spec[0]) as Texture2D
	var cell_height: float = ATTACK_FRAME_HEIGHT if action=="attack" else float(texture.get_height())/spec[2]
	# The attack figure was drawn at fewer pixels than idle; cell height is not
	# character height. Match visible body height, then align the actual feet.
	if action == "attack":
		actor.pixel_size = IDLE_PIXEL_SIZE*IDLE_BODY_HEIGHT/ATTACK_BODY_HEIGHT
		actor.offset = Vector2(0,cell_height*.5-ATTACK_FOOT_MARGIN+IDLE_FOOT_WORLD/actor.pixel_size)
	else:
		actor.pixel_size = 1.48/cell_height
		actor.offset = Vector2(0,cell_height*.47)
	actor.play(action+"_"+facing)

func _unhandled_input(event: InputEvent) -> void:
	if event is InputEventKey and event.pressed and not event.echo and event.keycode == KEY_SPACE and not capturing and not attacking:
		if facing == "nw": return # Never mirror a sword into the other hand.
		attacking = true
		play_pose("attack")

func _process(_delta: float) -> void:
	if capturing:return
	if attacking:
		if actor.is_playing():return
		attacking = false
	var velocity := Vector3(hero.velocity.x,0,hero.velocity.z)
	var action := "idle"
	if velocity.length() > .15:
		var right := camera.global_basis.x;right.y=0;right=right.normalized()
		var forward := -camera.global_basis.z;forward.y=0;forward=forward.normalized()
		var angle := atan2(velocity.dot(right),velocity.dot(forward))
		facing = DIRECTIONS[posmod(roundi(angle/(PI/4)),8)]
		action = "run" if velocity.length()>3.2 else "walk"
	if actor.animation != action+"_"+facing:play_pose(action)

func capture() -> void:
	capturing=true
	await get_tree().create_timer(2).timeout
	$CanvasLayer.visible=false
	await RenderingServer.frame_post_draw
	get_viewport().get_texture().get_image().save_png(evidence.path_join("default-entry-new-hero.png"))
	var samples: Array=[]
	for action: String in SHEETS:
		for direction in ["s","se"]:
			facing=direction;play_pose(action);actor.pause()
			actor.frame=2 if action=="attack" else 0
			await RenderingServer.frame_post_draw
			var file: String = "uploaded-"+action+"-"+direction+".png"
			get_viewport().get_texture().get_image().save_png(evidence.path_join(file))
			samples.append({"file":file,"action":action,"direction":direction,"frame":actor.frame,"pixel_size":actor.pixel_size})
	var result := {"status":"review_only","renderer":RenderingServer.get_current_rendering_method(),"gpu":RenderingServer.get_video_adapter_name(),"samples":samples,"missing":["attack_nw","verified rig provenance","frame-specific contact/weapon anchors","continuous motion acceptance"],"original_uploads_modified":false}
	var out := FileAccess.open(evidence.path_join("uploaded-hero-review.json"),FileAccess.WRITE)
	out.store_string(JSON.stringify(result,"\t"));out.close()
	get_tree().quit()

func motion_check() -> void:
	# Actual navigation and physics, not pose playback or teleporting screenshots.
	await get_tree().create_timer(2).timeout
	var result: Array=[]
	var failed := false
	hero.agent.target_desired_distance=.08
	hero.agent.path_desired_distance=.08
	for target: Vector3 in [Vector3(-4,.05,1.0),Vector3(-6.3,.05,3.9),Vector3(-4,.05,3)]:
		hero.walk_to(target)
		var start := Time.get_ticks_msec()
		var samples: Array=[]
		while Time.get_ticks_msec()-start<5000:
			await get_tree().create_timer(.1).timeout
			samples.append({"position":[hero.position.x,hero.position.y,hero.position.z],"animation":actor.animation,"frame":actor.frame,"on_floor":hero.is_on_floor()})
			if Vector2(hero.position.x-target.x,hero.position.z-target.z).length()<.12:break
		var reached := Vector2(hero.position.x-target.x,hero.position.z-target.z).length()<.12
		failed=failed or not reached
		result.append({"target":[target.x,target.y,target.z],"reached":reached,"samples":samples})
		await RenderingServer.frame_post_draw
		get_viewport().get_texture().get_image().save_png(evidence.path_join("uploaded-route-%d.png" % result.size()))
	var out := FileAccess.open(evidence.path_join("uploaded-motion.json"),FileAccess.WRITE)
	out.store_string(JSON.stringify({"physical_route_pass":not failed,"segments":result,"visual_gait_pass":false,"not_verified":["continuous sun-to-eave visual acceptance","foot sliding","continuous real recording","120-second performance"]},"\t"));out.close()
	get_tree().quit(1 if failed else 0)

func idle_check() -> void:
	capturing=true
	await get_tree().create_timer(2).timeout
	hero.set_physics_process(false)
	$CanvasLayer.visible=false
	var samples: Array=[]
	for direction in ["s","se"]:
		facing=direction;play_pose("idle");actor.pause()
		for index in range(4):
			actor.frame=index
			await RenderingServer.frame_post_draw
			var file: String="idle-fixed-"+direction+"-%d.png" % index
			get_viewport().get_texture().get_image().save_png(evidence.path_join(file))
			samples.append({"direction":direction,"frame":index,"world_origin":[hero.position.x,hero.position.y,hero.position.z],"sprite_offset":[actor.offset.x,actor.offset.y],"screenshot":file})
	var out:=FileAccess.open(evidence.path_join("idle-fixed-engine.json"),FileAccess.WRITE)
	out.store_string(JSON.stringify({"samples":samples,"method":"same fixed world origin, same offset, four real engine frame captures; no per-frame transform correction"},"\t"));out.close()
	get_tree().quit()

func attack_check() -> void:
	capturing=true
	await get_tree().create_timer(2).timeout
	hero.set_physics_process(false)
	$CanvasLayer.visible=false
	var samples: Array=[]
	for direction in ["s","se"]:
		facing=direction;play_pose("idle");actor.pause();actor.frame=0
		await RenderingServer.frame_post_draw
		var idle_file: String="attack-scale-fixed-"+direction+"-idle.png"
		get_viewport().get_texture().get_image().save_png(evidence.path_join(idle_file))
		samples.append({"direction":direction,"action":"idle","frame":0,"world_origin":[hero.position.x,hero.position.y,hero.position.z],"pixel_size":actor.pixel_size,"sprite_offset":[actor.offset.x,actor.offset.y],"screenshot":idle_file})
		facing=direction;play_pose("attack");actor.pause()
		for index in range(6):
			actor.frame=index
			await RenderingServer.frame_post_draw
			var file: String="attack-row-fixed-"+direction+"-%d.png" % index
			get_viewport().get_texture().get_image().save_png(evidence.path_join(file))
			samples.append({"direction":direction,"action":"attack","frame":index,"world_origin":[hero.position.x,hero.position.y,hero.position.z],"pixel_size":actor.pixel_size,"sprite_offset":[actor.offset.x,actor.offset.y],"screenshot":file})
	var out:=FileAccess.open(evidence.path_join("attack-row-fixed-engine.json"),FileAccess.WRITE)
	out.store_string(JSON.stringify({"samples":samples,"method":"idle and attack viewport screenshots at fixed world origin; pixel densities calibrated by measured body height and feet, not cell height"},"\t"));out.close()
	get_tree().quit()
