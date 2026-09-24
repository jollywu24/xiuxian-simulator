extends SceneTree

func _initialize() -> void:
	# Refresh the serialized uploaded atlas without loading the obsolete P2 comparison
	# fixture, whose old generated atlases may not be present in this workspace.
	var fixture: Node = load("res://scenes/validation/uploaded-hero-review.tscn").instantiate()
	var controller: Script = load("res://scripts/uploaded_hero_review.gd")
	if fixture == null or controller == null or not controller.can_instantiate():
		quit(1)
		return
	var sprite: AnimatedSprite3D = fixture.get_node("Hero/VisualPivot/AnimatedSprite3D")
	sprite.sprite_frames = controller.make_frames()
	sprite.animation = "idle_s"
	sprite.frame = 0
	var packed := PackedScene.new()
	var result := packed.pack(fixture)
	if result == OK:
		result = ResourceSaver.save(packed, "res://scenes/validation/uploaded-hero-review.tscn")
	fixture.free()
	quit(result)
