extends CharacterBody3D

@onready var agent: NavigationAgent3D = $NavigationAgent3D
@onready var camera: Camera3D = get_viewport().get_camera_3d()
var navigating := false
var goal := Vector3.ZERO

func walk_to(point: Vector3) -> void:
	goal = point
	agent.target_position = point
	navigating = true

func _unhandled_input(event: InputEvent) -> void:
	if event is InputEventMouseButton and event.pressed and event.button_index == MOUSE_BUTTON_LEFT:
		var origin := camera.project_ray_origin(event.position)
		var query := PhysicsRayQueryParameters3D.create(origin, origin + camera.project_ray_normal(event.position)*200.0, 1)
		var hit := get_world_3d().direct_space_state.intersect_ray(query)
		if not hit.is_empty() and hit.normal.y > 0.7 and hit.collider.is_in_group("walkable"):
			walk_to(hit.position)

func _physics_process(delta: float) -> void:
	var axis := Vector2(float(Input.is_physical_key_pressed(KEY_D))-float(Input.is_physical_key_pressed(KEY_A)), float(Input.is_physical_key_pressed(KEY_W))-float(Input.is_physical_key_pressed(KEY_S)))
	var direction := Vector3.ZERO
	if axis.length() > 0.0:
		navigating = false
		var right := camera.global_basis.x; right.y = 0
		var forward := -camera.global_basis.z; forward.y = 0
		direction = (right.normalized()*axis.x + forward.normalized()*axis.y).normalized()
	elif navigating and not agent.is_navigation_finished():
		direction = agent.get_next_path_position() - global_position
		direction.y = 0
		direction = direction.normalized()
	else:
		navigating = false
	var speed := 4.2 if Input.is_physical_key_pressed(KEY_SHIFT) else 2.6
	velocity.x = direction.x*speed
	velocity.z = direction.z*speed
	if not is_on_floor(): velocity.y -= 18.0*delta
	else: velocity.y = -0.2
	move_and_slide()
