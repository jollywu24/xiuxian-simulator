extends CharacterBody3D
## P1 movement only. The static identity card is deliberately NOT an animation fallback.
@onready var agent: NavigationAgent3D = $NavigationAgent3D
@onready var camera: Camera3D = get_viewport().get_camera_3d()
var navigating := false
var input_locked := false
var automated := false
var speed := 2.8
var last_pick := "none"

func stop() -> void:
	navigating = false
	velocity.x = 0.0
	velocity.z = 0.0

func walk_to(point: Vector3) -> bool:
	if input_locked:
		return false
	var map := agent.get_navigation_map()
	if NavigationServer3D.map_get_iteration_id(map) == 0:
		return false
	var closest := NavigationServer3D.map_get_closest_point(map, point)
	if closest.distance_to(point) > 0.55:
		return false
	var path := NavigationServer3D.map_get_path(map, global_position, closest, true)
	if path.is_empty() or path[-1].distance_to(closest) > 0.35:
		return false
	agent.target_position = closest
	navigating = true
	return true

func pick(screen: Vector2) -> bool:
	var origin := camera.project_ray_origin(screen)
	var query := PhysicsRayQueryParameters3D.create(origin, origin + camera.project_ray_normal(screen) * 200.0, 1)
	var hit := get_world_3d().direct_space_state.intersect_ray(query)
	if hit.is_empty() or not hit.collider.is_in_group("walkable") or hit.normal.y < 0.7:
		last_pick = "rejected"
		return false
	var accepted := walk_to(hit.position)
	last_pick = "accepted" if accepted else "unreachable"
	return accepted

func _unhandled_input(event: InputEvent) -> void:
	if input_locked or automated:
		return
	if event is InputEventMouseButton and event.pressed and event.button_index == MOUSE_BUTTON_LEFT:
		pick(event.position)

func _physics_process(delta: float) -> void:
	var direction := Vector3.ZERO
	var axis := Vector2.ZERO
	if not input_locked and not automated:
		axis = Vector2(float(Input.is_physical_key_pressed(KEY_D)) - float(Input.is_physical_key_pressed(KEY_A)), float(Input.is_physical_key_pressed(KEY_W)) - float(Input.is_physical_key_pressed(KEY_S)))
	if input_locked:
		stop()
	elif axis.length_squared() > 0:
		navigating = false
		var right := camera.global_basis.x
		var forward := -camera.global_basis.z
		right.y = 0
		forward.y = 0
		direction = (right.normalized() * axis.x + forward.normalized() * axis.y).normalized()
	elif navigating and not agent.is_navigation_finished():
		direction = agent.get_next_path_position() - global_position
		direction.y = 0
		direction = direction.normalized()
	else:
		navigating = false
	velocity.x = direction.x * speed
	velocity.z = direction.z * speed
	velocity.y = -0.3 if is_on_floor() else velocity.y - 18.0 * delta
	move_and_slide()
