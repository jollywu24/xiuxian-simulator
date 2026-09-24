shader_type spatial;
render_mode cull_disabled;
uniform vec3 deep_color : source_color = vec3(0.27, 0.43, 0.44);
uniform vec3 shallow_color : source_color = vec3(0.36, 0.50, 0.44);
varying vec2 river_position;
void vertex() {
	river_position = VERTEX.xz;
	float a = VERTEX.x * 2.5 + VERTEX.z * 1.7 + TIME * 0.65;
	float b = VERTEX.z * 4.0 - TIME * 0.9;
	NORMAL = normalize(vec3(-cos(a)*0.015, 1.0, -cos(a)*0.01-cos(b)*0.012));
}
void fragment() {
	float shore = smoothstep(1.3,2.0,abs(river_position.x));
	float ripple = sin(river_position.y * 3.1 + sin(river_position.x*2.1) - TIME * 0.4) * 0.002;
	ALBEDO = mix(deep_color,shallow_color,shore*0.65) + ripple;
	ROUGHNESS = 0.62;
	SPECULAR = 0.28;
	METALLIC = 0.0;
}
