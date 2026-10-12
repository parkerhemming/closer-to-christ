// The scene's moving parts: the grass and bushes of the two near land layers
// and the figure's hair, loincloth and breathing. A worker (one per layer,
// handed a canvas by swayInWind in app.js) draws the layer's image with
// WebGL, shifting each pixel by its motion map's red (how far it sways
// sideways in the wind) and green (how much it rises with each breath).
// The maps come from tools/bake-plant-sway.py (plant tips most, roots and
// rocks not at all) and tools/bake-figure-motion.py. Gusts roll across from
// left to right; plants each flutter on their own and the cloth and hair
// ripple downward.
//
// The layer's colour grade and the time of day's light are CSS filters on the
// still image; here the same filters arrive as one colour matrix, applied in
// the shader, because a CSS filter on a canvas that changes every frame
// would be redone every frame.

const vertexShader = `
attribute vec2 corner;
varying vec2 place;
void main() {
	place = corner * 0.5 + 0.5;
	place.y = 1.0 - place.y;
	gl_Position = vec4(corner, 0.0, 1.0);
}`;

const fragmentShader = `
#ifdef GL_FRAGMENT_PRECISION_HIGH
precision highp float; // the time grows large
#else
precision mediump float;
#endif
uniform sampler2D land;
uniform sampler2D sway;
uniform vec4 flutterFrequency; // across and down the image, for two waves
uniform float breathing; // 0 for none
uniform float breathCentre; // the body's middle, across the image
uniform vec2 canvasSize;
uniform float imageWidth;
uniform float time;
uniform float wind;
uniform mat3 grade; // column by column
uniform vec3 gradeOffset;
varying vec2 place;
void main() {
	// The image is placed like the CSS background: full height, centred.
	float u = (place.x * canvasSize.x - (canvasSize.x - imageWidth) / 2.0) / imageWidth;
	float v = place.y;
	vec2 at = vec2(u, v);
	vec4 motion = texture2D(sway, at);
	float gust = 0.6 + 0.4 * sin(u * 9.0 - time * 0.9) + 0.25 * sin(u * 23.0 - time * 1.7);
	float flutter = 0.5 * sin(dot(at, flutterFrequency.xy) + time * 2.6)
		+ 0.35 * sin(dot(at, flutterFrequency.zw) - time * 3.7);
	float shift = motion.r * wind * (0.024 * gust + 0.016 * flutter) * canvasSize.y / imageWidth;
	// A breath about every 5.5 seconds: in quickly, out slowly.
	float phase = fract(time / 5.5);
	float breath = phase < 0.4 ? smoothstep(0.0, 0.4, phase) : 1.0 - smoothstep(0.4, 1.0, phase);
	float lift = motion.g * breathing * breath;
	u = breathCentre + (u - breathCentre) * (1.0 - 0.012 * lift) - shift;
	v += 0.003 * lift;
	if (u < 0.0 || u > 1.0) discard;
	vec4 color = texture2D(land, vec2(u, v));
	if (color.a < 0.002) discard;
	vec3 graded = clamp(grade * (color.rgb / color.a) + gradeOffset, 0.0, 1.0);
	gl_FragColor = vec4(graded * color.a, color.a);
}`;

let gl = null;
let canvas = null;
let uniforms = {};
let imageAspect = 1;
let cssSize = [0, 0];
let conditions = { wind: 1, grade: [1, 0, 0, 0, 1, 0, 0, 0, 1], gradeOffset: [0, 0, 0] };
let wind = null; // eases toward conditions.wind
let strength = 1; // how far this layer bends in the same wind
let maximumScale = 2; // canvas pixels per CSS pixel, at most
let paused = false;
let lastTime = performance.now();
let reportedFirstFrame = false;

const nextFrame = self.requestAnimationFrame
	? (frame) => self.requestAnimationFrame(frame)
	: (frame) => setTimeout(() => frame(performance.now()), 16);

async function loadTexture(url, unit) {
	const blob = await fetch(url).then((response) => response.blob());
	const bitmap = await createImageBitmap(blob, { premultiplyAlpha: "premultiply" });
	const texture = gl.createTexture();
	gl.activeTexture(gl.TEXTURE0 + unit);
	gl.bindTexture(gl.TEXTURE_2D, texture);
	gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, bitmap);
	for (const wrap of [gl.TEXTURE_WRAP_S, gl.TEXTURE_WRAP_T]) {
		gl.texParameteri(gl.TEXTURE_2D, wrap, gl.CLAMP_TO_EDGE);
	}
	gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
	gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
	return bitmap;
}

function compile(type, source) {
	const shader = gl.createShader(type);
	gl.shaderSource(shader, source);
	gl.compileShader(shader);
	if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) throw new Error(gl.getShaderInfoLog(shader));
	return shader;
}

async function setup({ image: landImage, sway, strength: layerStrength, flutterFrequency, breathing = 0, breathCentre = 0.5 }) {
	strength = layerStrength;
	gl = canvas.getContext("webgl", { premultipliedAlpha: true, antialias: false });
	if (!gl) throw new Error("no WebGL");
	const program = gl.createProgram();
	gl.attachShader(program, compile(gl.VERTEX_SHADER, vertexShader));
	gl.attachShader(program, compile(gl.FRAGMENT_SHADER, fragmentShader));
	gl.linkProgram(program);
	gl.useProgram(program);

	gl.bindBuffer(gl.ARRAY_BUFFER, gl.createBuffer());
	gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 1, -1, -1, 1, 1, 1]), gl.STATIC_DRAW);
	const corner = gl.getAttribLocation(program, "corner");
	gl.enableVertexAttribArray(corner);
	gl.vertexAttribPointer(corner, 2, gl.FLOAT, false, 0, 0);

	for (const name of [
		"land", "sway", "canvasSize", "imageWidth", "time", "wind", "grade", "gradeOffset",
		"flutterFrequency", "breathing", "breathCentre",
	]) {
		uniforms[name] = gl.getUniformLocation(program, name);
	}
	gl.uniform4fv(uniforms.flutterFrequency, flutterFrequency);
	gl.uniform1f(uniforms.breathing, breathing);
	gl.uniform1f(uniforms.breathCentre, breathCentre);
	const [image] = await Promise.all([loadTexture(landImage, 0), loadTexture(sway, 1)]);
	imageAspect = image.width / image.height;
	gl.uniform1i(uniforms.land, 0);
	gl.uniform1i(uniforms.sway, 1);
	nextFrame(frame);
}

function frame(now) {
	nextFrame(frame);
	// At most about 60 a second: on 120Hz screens every other frame is
	// skipped. The motion is slow, so it looks the same for half the work.
	if (paused || !cssSize[0] || now - lastTime < 14) return;
	const elapsed = Math.min((now - lastTime) / 1000, 0.1);
	lastTime = now;
	const target = conditions.wind * strength;
	wind = wind === null ? target : wind + (target - wind) * Math.min(1, elapsed * 1.5);
	gl.viewport(0, 0, canvas.width, canvas.height);
	gl.clearColor(0, 0, 0, 0);
	gl.clear(gl.COLOR_BUFFER_BIT);
	gl.uniform2f(uniforms.canvasSize, ...cssSize);
	gl.uniform1f(uniforms.imageWidth, cssSize[1] * imageAspect);
	gl.uniform1f(uniforms.time, now / 1000);
	gl.uniform1f(uniforms.wind, wind);
	gl.uniformMatrix3fv(uniforms.grade, false, conditions.grade);
	gl.uniform3fv(uniforms.gradeOffset, conditions.gradeOffset);
	gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
	if (!reportedFirstFrame) {
		reportedFirstFrame = true;
		self.postMessage("drawn");
	}
}

// The page sends the canvas and image urls first, then the canvas's CSS size,
// the conditions and whether the tab is hidden whenever they change.
self.onmessage = ({ data }) => {
	if (data.canvas) canvas = data.canvas;
	if (data.maximumScale) maximumScale = data.maximumScale;
	if (data.conditions) conditions = data.conditions;
	if ("hidden" in data) paused = data.hidden;
	if (data.size) {
		const [width, height, pixelRatio] = data.size;
		cssSize = [width, height];
		if (canvas) {
			const scale = Math.min(pixelRatio, maximumScale);
			canvas.width = Math.round(width * scale);
			canvas.height = Math.round(height * scale);
		}
	}
	if (data.canvas) setup(data).catch((error) => self.postMessage({ failed: String(error) }));
};
