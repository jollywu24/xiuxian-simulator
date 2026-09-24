extends SceneTree
func _initialize() -> void:call_deferred("run")
func run() -> void:
	var scene: Node=load(ProjectSettings.get_setting("application/run/main_scene")).instantiate()
	var preview: AnimatedSprite3D=scene.get_node("Hero/VisualPivot/AnimatedSprite3D")
	assert(preview.sprite_frames.has_animation("run_nw"),"Editor preview must contain new hero before _ready")
	root.add_child(scene)
	await process_frame
	var sprite: AnimatedSprite3D=scene.get_node("Hero/VisualPivot/AnimatedSprite3D")
	var errors: Array[String]=[]
	for direction in ["n","ne","e","se","s","sw","w","nw"]:
		for index in range(4):
			var idle: AtlasTexture=sprite.sprite_frames.get_frame_texture("idle_"+direction,index)
			if idle.region.position.x!=40+index*199 or idle.region.size.x!=199:
				errors.append("idle fixed pitch regressed: "+direction)
	var attack_starts := [0,180,370,560,750,940,1135]
	for row in range(7):
		for index in range(6):
			var attack: AtlasTexture=sprite.sprite_frames.get_frame_texture("attack_"+["n","ne","e","se","s","sw","w"][row],index)
			if attack.region.position.y!=attack_starts[row] or attack.region.size.y!=190:
				errors.append("attack row split: %d/%d" % [row,index])
	var count:=0
	for name in sprite.sprite_frames.get_animation_names():
		count+=sprite.sprite_frames.get_frame_count(name)
		for i in sprite.sprite_frames.get_frame_count(name):
			var tile: AtlasTexture=sprite.sprite_frames.get_frame_texture(name,i)
			if not Rect2(Vector2.ZERO,tile.atlas.get_size()).encloses(tile.region):errors.append("out of image bounds: "+name)
	if count!=170:errors.append("expected 170 supplied slots")
	if sprite.sprite_frames.has_animation("attack_nw"):errors.append("missing direction must not be fabricated")
	if not sprite.shaded:errors.append("must retain scene lighting")
	scene.play_pose("idle")
	var idle_cell: AtlasTexture = sprite.sprite_frames.get_frame_texture("idle_s",0)
	var idle_height: float = sprite.pixel_size*214.0
	var idle_foot: float = (sprite.offset.y-idle_cell.region.size.y*.5+3.0)*sprite.pixel_size
	scene.play_pose("attack")
	var attack_cell: AtlasTexture = sprite.sprite_frames.get_frame_texture("attack_s",0)
	var attack_height: float = sprite.pixel_size*158.0
	var attack_foot: float = (sprite.offset.y-attack_cell.region.size.y*.5+13.0)*sprite.pixel_size
	if absf(attack_height-idle_height)>0.0001:errors.append("attack visible body height jumps")
	if absf(attack_foot-idle_foot)>0.0001:errors.append("attack feet jump vertically")
	scene.play_pose("idle")
	var attack_key := InputEventKey.new()
	attack_key.keycode = KEY_SPACE
	attack_key.pressed = true
	attack_key.echo = true
	scene._unhandled_input(attack_key)
	if scene.attacking:errors.append("held-key echo must not start attack")
	attack_key.echo = false
	scene._unhandled_input(attack_key)
	if not scene.attacking:errors.append("first key press must start attack")
	sprite.pause()
	sprite.frame = 3
	scene._unhandled_input(attack_key)
	if sprite.frame != 3:errors.append("attack must not restart while already attacking")
	print(JSON.stringify({"test":"uploaded resource contracts","slots":count,"errors":errors,"visual_acceptance":false}))
	scene.queue_free()
	quit(0 if errors.is_empty() else 1)
