extends Node3D

var report := {"stage":"P1", "art_status":"graybox_only", "route":[], "failures":[]}
var report_dir := ""

func _ready() -> void:
	var args := OS.get_cmdline_user_args()
	for arg in args:
		if arg.begins_with("--evidence="): report_dir = arg.trim_prefix("--evidence=")
	if report_dir.is_empty(): return
	await get_tree().create_timer(3.0).timeout
	report["renderer"] = RenderingServer.get_current_rendering_method()
	report["adapter"] = RenderingServer.get_video_adapter_name()
	report["viewport"] = str(get_viewport().get_visible_rect().size)
	if report.renderer != "forward_plus": report.failures.append("Forward+ not active")
	await RenderingServer.frame_post_draw
	get_viewport().get_texture().get_image().save_png(report_dir.path_join("p1-graybox.png"))
	var hero := $Hero
	var camera:Camera3D=$Camera3D
	var screen:=camera.unproject_position(Vector3(3.5,.35,0))
	var ray_start:=camera.project_ray_origin(screen)
	var hit:=get_world_3d().direct_space_state.intersect_ray(PhysicsRayQueryParameters3D.create(ray_start,ray_start+camera.project_ray_normal(screen)*200,1))
	var bridge_pick_ok:bool=not hit.is_empty() and hit.collider.is_in_group("walkable") and absf(hit.position.y-.35)<.05
	report["bridge_screen_pick"]={"screen":str(screen),"hit":str(hit.get("position",Vector3.ZERO)),"pass":bridge_pick_ok}
	if not bridge_pick_ok:report.failures.append("Bridge screen pick must hit elevated collision")
	var points := [Vector3(-4,0,1), Vector3(0,0,0), Vector3(7,0,0), Vector3(0,0,0), Vector3(2,-0.35,5), Vector3(-2,0,7), Vector3(-3,0,3)]
	for target in points:
		hero.walk_to(target)
		var start := Time.get_ticks_msec()
		var crossed_water := false
		while Time.get_ticks_msec()-start < 18000:
			await get_tree().physics_frame
			var p: Vector3 = hero.global_position
			if p.x > 1.1 and p.x < 5.9 and abs(p.z) > 1.2 and not (p.x < 3.2 and p.z > 3.7 and p.z < 6.3): crossed_water = true
			if p.distance_to(target) < 0.5: break
		var reached: bool = hero.global_position.distance_to(target) < 0.5
		report.route.append({"target":str(target),"actual":str(hero.global_position),"reached":reached,"crossed_water":crossed_water,"path":str(hero.agent.get_current_navigation_path()),"path_index":hero.agent.get_current_navigation_path_index()})
		if not reached or crossed_water: report.failures.append("Route failed: "+str(target))
	var f := FileAccess.open(report_dir.path_join("p1-route.json"), FileAccess.WRITE)
	f.store_string(JSON.stringify(report,"\t")); f.close()
	get_tree().quit(0 if report.failures.is_empty() else 1)
