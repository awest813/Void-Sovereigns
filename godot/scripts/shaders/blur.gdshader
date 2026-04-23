shader_type canvas_item;

uniform float blur_amount : hint_range(0, 10) = 3.0;

void fragment() {
	vec4 col = vec4(0.0);
	float samples = 9.0;
	for (float x = -1.0; x <= 1.0; x++) {
		for (float y = -1.0; y <= 1.0; y++) {
			col += texture(TEXTURE, UV + vec2(x, y) * TEXTURE_PIXEL_SIZE * blur_amount);
		}
	}
	COLOR = col / samples;
}
