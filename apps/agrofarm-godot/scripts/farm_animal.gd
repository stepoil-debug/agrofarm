class_name FarmAnimal
extends Node3D

var species: String = "cow"
var home := Vector3.ZERO
var roam_radius: float = 2.5
var target := Vector3.ZERO
var speed: float = 0.45
var wait_time: float = 0.0
var phase: float = 0.0
var visual_root: Node3D

func setup(kind: String, world_position: Vector3, radius: float = 2.5) -> void:
	species = kind
	home = world_position
	roam_radius = radius
	position = world_position
	phase = randf() * TAU
	visual_root = Node3D.new()
	visual_root.name = "Visual"
	add_child(visual_root)
	match species:
		"cow":
			speed = 0.34
			_build_cow()
		"pig":
			speed = 0.42
			_build_pig()
		_:
			speed = 0.62
			_build_chicken()
	_pick_target()

func _process(delta: float) -> void:
	phase += delta
	if wait_time > 0.0:
		wait_time -= delta
		visual_root.position.y = sin(phase * 2.1) * 0.018
		if wait_time <= 0.0:
			_pick_target()
		return
	var flat_target := Vector3(target.x, position.y, target.z)
	var remaining := position.distance_to(flat_target)
	if remaining < 0.12:
		wait_time = randf_range(1.4, 4.8)
		return
	var direction := (flat_target - position).normalized()
	position += direction * minf(remaining, speed * delta)
	var desired_yaw := atan2(direction.x, direction.z)
	rotation.y = lerp_angle(rotation.y, desired_yaw, minf(1.0, delta * 5.0))
	var bounce := 0.025
	if species == "chicken":
		bounce = 0.05
	elif species == "pig":
		bounce = 0.018
	visual_root.position.y = abs(sin(phase * 7.0)) * bounce

func _pick_target() -> void:
	var angle := randf() * TAU
	var radius := sqrt(randf()) * roam_radius
	target = home + Vector3(cos(angle) * radius, 0.0, sin(angle) * radius)

func _build_cow() -> void:
	var white := Color("f7f1df")
	var dark := Color("2d2927")
	var pink := Color("e5a8a3")
	VisualFactory.capsule(visual_root, "Body", Vector3(0, 0.82, 0), 0.43, 1.55, white, Vector3(0, 0, PI / 2.0))
	VisualFactory.sphere(visual_root, "Chest", Vector3(0, 0.78, 0), 0.46, white, Vector3(1.25, 0.92, 0.92))
	VisualFactory.sphere(visual_root, "Head", Vector3(0, 0.98, 0.72), 0.34, white, Vector3(0.86, 0.88, 1.1))
	VisualFactory.sphere(visual_root, "Muzzle", Vector3(0, 0.85, 1.03), 0.2, pink, Vector3(1.0, 0.62, 0.72))
	for side in [-1.0, 1.0]:
		VisualFactory.sphere(visual_root, "Ear", Vector3(side * 0.31, 1.12, 0.72), 0.14, white, Vector3(1.25, 0.45, 0.7))
		VisualFactory.cylinder(visual_root, "Horn", Vector3(side * 0.22, 1.29, 0.74), 0.035, 0.2, Color("e7d39d"), Vector3(0, 0, side * 0.45), 8)
		VisualFactory.sphere(visual_root, "Eye", Vector3(side * 0.2, 1.05, 1.0), 0.038, dark, Vector3.ONE, false)
	for x in [-0.29, 0.29]:
		for z in [-0.42, 0.42]:
			VisualFactory.cylinder(visual_root, "Leg", Vector3(x, 0.37, z), 0.075, 0.62, white, Vector3.ZERO, 10)
			VisualFactory.cylinder(visual_root, "Hoof", Vector3(x, 0.08, z + 0.015), 0.082, 0.16, dark, Vector3.ZERO, 10)
	VisualFactory.sphere(visual_root, "PatchA", Vector3(-0.36, 0.93, -0.12), 0.25, dark, Vector3(0.28, 0.75, 1.05))
	VisualFactory.sphere(visual_root, "PatchB", Vector3(0.29, 0.65, 0.28), 0.19, dark, Vector3(0.3, 0.7, 1.0))
	VisualFactory.sphere(visual_root, "PatchC", Vector3(0.19, 0.99, -0.49), 0.17, dark, Vector3(0.45, 0.7, 0.8))
	var tail := VisualFactory.cylinder(visual_root, "Tail", Vector3(0, 0.83, -0.9), 0.035, 0.7, white, Vector3(0.8, 0, 0), 8)
	tail.rotation.x = 0.55
	VisualFactory.sphere(visual_root, "TailTip", Vector3(0, 0.48, -1.08), 0.09, dark, Vector3(0.75, 1.1, 0.75))
	VisualFactory.sphere(visual_root, "Udder", Vector3(0, 0.42, 0), 0.18, pink, Vector3(1.0, 0.6, 0.8))

func _build_chicken() -> void:
	var body_color := Color("f8f0d2") if randf() > 0.35 else Color("c87542")
	var red := Color("d94b45")
	var yellow := Color("e8b83f")
	var dark := Color("2c2925")
	VisualFactory.sphere(visual_root, "Body", Vector3(0, 0.34, 0), 0.25, body_color, Vector3(0.9, 1.05, 1.15))
	VisualFactory.sphere(visual_root, "Head", Vector3(0, 0.63, 0.16), 0.17, body_color)
	VisualFactory.sphere(visual_root, "WingLeft", Vector3(-0.22, 0.36, 0), 0.15, body_color.darkened(0.08), Vector3(0.45, 0.8, 1.0))
	VisualFactory.sphere(visual_root, "WingRight", Vector3(0.22, 0.36, 0), 0.15, body_color.darkened(0.08), Vector3(0.45, 0.8, 1.0))
	VisualFactory.sphere(visual_root, "Beak", Vector3(0, 0.59, 0.35), 0.08, yellow, Vector3(0.72, 0.5, 1.2))
	VisualFactory.sphere(visual_root, "CombA", Vector3(-0.07, 0.81, 0.12), 0.06, red)
	VisualFactory.sphere(visual_root, "CombB", Vector3(0, 0.84, 0.12), 0.065, red)
	VisualFactory.sphere(visual_root, "CombC", Vector3(0.07, 0.8, 0.12), 0.055, red)
	for side in [-1.0, 1.0]:
		VisualFactory.sphere(visual_root, "Eye", Vector3(side * 0.1, 0.67, 0.29), 0.025, dark, Vector3.ONE, false)
		VisualFactory.cylinder(visual_root, "Leg", Vector3(side * 0.08, 0.11, 0), 0.025, 0.25, yellow, Vector3.ZERO, 8)
	VisualFactory.sphere(visual_root, "Tail", Vector3(0, 0.43, -0.28), 0.14, body_color, Vector3(0.65, 1.15, 0.55))

func _build_pig() -> void:
	var pink := Color("e9a69c")
	var light_pink := Color("f2bab0")
	var dark := Color("4a3432")
	VisualFactory.capsule(visual_root, "Body", Vector3(0, 0.55, 0), 0.36, 1.18, pink, Vector3(0, 0, PI / 2.0))
	VisualFactory.sphere(visual_root, "Head", Vector3(0, 0.67, 0.58), 0.31, light_pink, Vector3(0.95, 0.9, 1.05))
	VisualFactory.sphere(visual_root, "Snout", Vector3(0, 0.58, 0.86), 0.16, Color("d88983"), Vector3(1.05, 0.62, 0.62))
	for side in [-1.0, 1.0]:
		VisualFactory.sphere(visual_root, "Ear", Vector3(side * 0.22, 0.91, 0.54), 0.13, pink, Vector3(0.7, 1.0, 0.55))
		VisualFactory.sphere(visual_root, "Eye", Vector3(side * 0.13, 0.72, 0.82), 0.028, dark, Vector3.ONE, false)
		VisualFactory.sphere(visual_root, "Nostril", Vector3(side * 0.055, 0.59, 1.0), 0.022, dark, Vector3.ONE, false)
	for x in [-0.24, 0.24]:
		for z in [-0.31, 0.31]:
			VisualFactory.cylinder(visual_root, "Leg", Vector3(x, 0.22, z), 0.065, 0.38, pink, Vector3.ZERO, 9)
			VisualFactory.cylinder(visual_root, "Hoof", Vector3(x, 0.05, z), 0.07, 0.12, dark, Vector3.ZERO, 9)
	var tail := VisualFactory.cylinder(visual_root, "Tail", Vector3(0, 0.62, -0.68), 0.025, 0.35, pink, Vector3(0.8, 0, 0.2), 8)
	tail.rotation.z = 0.7
