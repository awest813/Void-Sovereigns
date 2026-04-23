shader_type canvas_item;
// Marathon-style subtle grain + scanline overlay for the hub background.
// Apply to a full-screen ColorRect behind the hub panels.

uniform float grain_intensity : hint_range(0.0, 1.0) = 0.06;
uniform float scanline_intensity : hint_range(0.0, 1.0) = 0.08;
uniform float scanline_freq : hint_range(1.0, 1000.0) = 240.0;

float hash(vec2 p) {
	p = fract(p * vec2(123.34, 456.21));
	p += dot(p, p + 45.32);
	return fract(p.x * p.y);
}

void fragment() {
	vec4 base = COLOR;
	float grain = (hash(UV * 1024.0 + TIME) - 0.5) * grain_intensity;
	float scan  = sin(UV.y * scanline_freq) * scanline_intensity;
	COLOR.rgb = clamp(base.rgb + grain - scan * 0.5, 0.0, 1.0);
}
