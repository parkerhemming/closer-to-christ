function createCityLights() {
	const plane = document.querySelector(".city-flicker-plane");
	const candidates = [
		[2846, 1540, 6, 9], [2350, 1644, 6, 5], [3602, 1544, 6, 13],
		[2392, 1587, 5, 5], [3598, 1516, 6, 9], [2093, 1546, 5, 5],
		[4024, 1608, 5, 5], [2977, 1606, 5, 5], [3731, 1588, 10, 6],
		[2204, 1534, 6, 12], [3662, 1546, 5, 8], [2093, 1537, 5, 4],
		[2946, 1493, 6, 8], [2781, 1504, 5, 5], [3862, 1664, 5, 5],
		[2261, 1546, 6, 8], [3076, 1543, 5, 6], [3784, 1560, 6, 15],
		[1798, 1551, 5, 5], [3976, 1616, 5, 4], [2522, 1613, 6, 6],
		[2322, 1546, 6, 5], [3293, 1494, 8, 5], [3952, 1539, 6, 8],
		[2510, 1562, 6, 13], [2033, 1516, 10, 6], [2991, 1618, 5, 4],
		[2607, 1542, 7, 9], [2428, 1534, 5, 5], [2700, 1616, 6, 8],
		[3343, 1629, 5, 5], [4058, 1537, 6, 15], [2370, 1535, 5, 5],
		[2038, 1587, 5, 5], [2456, 1572, 14, 7], [3776, 1500, 10, 13],
		[3920, 1616, 5, 5], [3031, 1594, 5, 5], [2882, 1497, 4, 4],
		[2661, 1543, 6, 9], [2313, 1545, 6, 5], [3652, 1548, 5, 5],
		[2351, 1633, 5, 5], [3207, 1570, 5, 5], [1791, 1550, 5, 5],
		[3977, 1631, 5, 4], [2206, 1516, 6, 7], [3736, 1557, 5, 5],
		[2818, 1619, 6, 10], [2593, 1479, 11, 10], [2235, 1594, 5, 5],
		[2773, 1537, 5, 5], [2385, 1615, 5, 5], [2590, 1512, 7, 12],
		[2671, 1479, 5, 5], [3541, 1478, 6, 5], [3682, 1579, 5, 5],
		[3985, 1519, 6, 8], [2009, 1521, 6, 15],
	];
	const colors = ["#ff9a3d", "#ffb35f", "#f47f2f", "#ffc174"];

	const shuffled = [...candidates].sort(() => Math.random() - 0.5).slice(0, 20);
	const lights = shuffled.map(([x, y, width, height], index) => {
		const light = document.createElement("span");
		light.className = "city-flicker-light";
		// Coordinates are in the 4096x2048 city image; the plane is its
		// 320px-tall window strip starting at row 1408.
		light.style.setProperty("--flicker-x", `${(x / 4096) * 100}%`);
		light.style.setProperty("--flicker-y", `${((y - 1408) / 320) * 100}%`);
		light.style.setProperty("--flicker-width", `${(width / 4096) * 100}%`);
		light.style.setProperty("--flicker-height", `${(height / 320) * 100}%`);
		light.style.setProperty("--flicker-color", colors[index % colors.length]);
		light.dataset.activity = randomBetween(0.35, 2.4);
		plane.appendChild(light);
		return light;
	});

	if (reducedMotion) return;

	let previousLight = null;

	function selectNextLight() {
		const available = lights.filter((light) => light !== previousLight);
		const totalWeight = available.reduce(
			(sum, light) => sum + Number(light.dataset.activity),
			0,
		);
		let roll = Math.random() * totalWeight;
		for (const light of available) {
			roll -= Number(light.dataset.activity);
			if (roll <= 0) return light;
		}
		return available.at(-1);
	}

	function scheduleNextBurst() {
		window.setTimeout(startBurst, randomBetween(350, 2400));
	}

	function startBurst() {
		if (document.hidden || document.documentElement.hasAttribute("data-no-city-lights")) {
			scheduleNextBurst(); // nothing to flicker for in a hidden tab
			return;
		}
		const light = selectNextLight();
		previousLight = light;
		let pulses = Math.floor(randomBetween(2, 7));

		function pulse() {
			if (pulses <= 0) {
				light.style.opacity = 0;
				scheduleNextBurst();
				return;
			}

			light.style.opacity = randomBetween(0.28, 0.82);
			pulses -= 1;
			window.setTimeout(() => {
				light.style.opacity = randomBetween(0.06, 0.18);
				window.setTimeout(pulse, randomBetween(45, 140));
			}, randomBetween(45, 115));
		}

		pulse();
	}

	scheduleNextBurst();
}

// At 3 PM, as he dies, "the earth did quake, and the rocks rent" (Matthew
// 27:51): a moment after the clock reaches 3:00 the ground shakes, then keeps
// shaking now and then while the storm is at its height (weather 0.9 and up,
// as it is at 3 PM unless set lower). Each tremor rolls toward the viewer: the far
// mountains and hills jolt first, then the Mount of Olives, the city, the ridge, the near ground and the cross,
// each a moment after the one behind it and harder the nearer it is, over a
// faint shake of the whole scene. The time, buttons and caption stay still.
// Each jolt is an animation added on top of the layer's parallax position
// (composite "add"), so nothing runs per frame.
function earthquakes() {
	if (reducedMotion || !("composite" in KeyframeEffect.prototype)) return;
	const everything = [...document.querySelectorAll("[data-z_index]")];
	// Far to near, by parallax depth (the land, its shadows, moving copies and
	// markers share their layer's depth, so they shake together), with how
	// far each jolts at full strength, in px: like the parallax, the farther
	// away, the less it seems to move.
	const wave = [
		[1.2, 0.5], // the mountains of Moab
		[1.5, 0.8], // distant hills
		[2, 1.1], // the Mount of Olives
		[2.5, 1.5], // Jerusalem
		[4.5, 3], // Golgotha ridge
		[8, 6.5], // near ground
		[16, 1.5], // the cross: barely, so the figure stays steady
	].map(([depth, reach]) => ({
		layers: everything.filter((layer) => Number(layer.dataset.z_index) === depth),
		reach,
	}));

	// A jolt: hits fast, rattles, settles; up and down more than side to side,
	// like ground heaving.
	function jolt(seconds, reach, upDown) {
		const steps = Math.round(seconds * 18);
		const keyframes = Array.from({ length: steps + 1 }, (_, step) => {
			const along = step / steps;
			const size = reach * Math.min(1, along * 6) * (1 - along) ** 1.6;
			return { translate: `${randomBetween(-size, size)}px ${randomBetween(-size, size) * upDown}px` };
		});
		keyframes[0] = keyframes[steps] = { translate: "0px 0px" };
		return keyframes;
	}

	const atThree = () => sceneSettings.hour >= 15 - 0.001;
	let timer;
	function shakeIn(ms, first = false) {
		clearTimeout(timer);
		timer = setTimeout(() => tremor(first), ms);
	}

	// The first, as 3:00 comes, is the longest and strongest.
	function tremor(first) {
		const strength = clamp((sceneSettings.weatherIntensity - 0.9) / 0.1, 0, 1);
		if (atThree() && strength > 0 && !document.hidden) {
			const scale = first ? 1 : 0.5 + 0.5 * strength;
			const gap = randomBetween(130, 200); // ms between one layer and the next
			const seconds = first ? 1.7 : randomBetween(0.9, 1.3);
			const whole = jolt(seconds + (wave.length * gap) / 1000, 1.5 * scale, 0.6);
			for (const layer of everything) {
				layer.animate(whole, { duration: (seconds * 1000 + wave.length * gap), composite: "add" });
			}
			wave.forEach(({ layers, reach }, index) => {
				const keyframes = jolt(seconds, reach * scale, 1.4);
				for (const layer of layers) {
					layer.animate(keyframes, { duration: seconds * 1000, delay: index * gap, composite: "add" });
				}
			});
		}
		shakeIn(randomBetween(5000, 12000));
	}

	// The first strikes just after the 3 PM caption has been read and folds
	// (or after a few seconds if it stays open).
	let waitingForCaption = false;
	function firstAfterCaption() {
		waitingForCaption = true;
		shakeIn(7000, true);
	}
	document.addEventListener("captionfolded", () => {
		if (!waitingForCaption) return;
		waitingForCaption = false;
		if (atThree()) shakeIn(500, true);
	});
	let wasThree = atThree();
	document.addEventListener("scenesettings", () => {
		if (atThree() && !wasThree) firstAfterCaption();
		if (!atThree()) waitingForCaption = false;
		wasThree = atThree();
	});
	if (wasThree) firstAfterCaption();
	else shakeIn(2000);
}

// The grass and bushes on the two near land layers sway in the wind, each
// drawn by wind.js in a worker so it keeps moving while the page's own frames
// are held up (as Chrome does while the settings scroll). The ridge is
// farther off and its bushes stiffer, so it moves less. Without a worker
// canvas or WebGL, with reduced motion or on low quality, the still images
// stay.
function swayInWind() {
	if (!("transferControlToOffscreen" in HTMLCanvasElement.prototype)) return;
	// Drawn still (see wind.js), so their light changes without the browser
	// redrawing them in full each tick: the clouds, at CSS-pixel resolution
	// (their images are soft and half-size anyway), each image repeated across
	// as its CSS background is, drifting with the layer's animation...
	const clouds = {
		light: () =>
			`brightness(${byWeather(weatherCurves.cloudShade)}) brightness(${lightFor("cloudLight")}) sepia(${byTime(timeCurves.cloudWarmth)})`,
		still: true,
		tiled: true,
		maximumScale: 1,
	};
	for (const cloud of ["far", "deep", "middle", "midband", "lower", "near"]) {
		swayLayer(`.storm-cloud--${cloud} .storm-cloud__texture`, `.storm-cloud--${cloud} canvas`, null, clouds);
	}
	if (getQuality() === "low") return;
	// ...and the far land layers.
	const landLight = () =>
		`brightness(${lightFor("landLight")}) saturate(${lightFor("landSaturation")}) sepia(${byTime(timeCurves.landWarmth)})`;
	const far = { light: landLight, still: true, maximumScale: 2 };
	swayLayer('[data-scenery="far-mountains"]', ".land-wind--far", null, far);
	swayLayer('[data-scenery="distant-hills"]', ".land-wind--hills", null, far);
	swayLayer('[data-scenery="olives"]', ".land-wind--olives", null, far);
	swayLayer('[data-scenery="distant-jerusalem"]', ".land-wind--city", null, far);
	// Plants flutter each on their own (waves across the image); the cloth
	// and hair ripple downward.
	// Drawn below retina sharpness (maximumScale): every pixel is redrawn
	// each frame, and these dark, moving layers look the same with fewer.
	// With reduced motion they're drawn still too.
	const plants = { light: landLight, flutterFrequency: [140, 0, 57, 0], maximumScale: 1.25, still: reducedMotion };
	swayLayer('[data-scenery="ground"]', ".land-wind--ground", "./assets/wind/near-ground-sway-v2.png", {
		...plants,
		strength: 1,
	});
	swayLayer('[data-scenery="golgotha-ridge"]', ".land-wind--ridge", "./assets/wind/golgotha-ridge-sway-v2.png", {
		...plants,
		strength: 0.45,
	});
	swayLayer("#christ", ".christ-wind", "./assets/christ/christ-motion-v2.png", {
		light: () => `brightness(${lightFor("figureLight")})`,
		strength: 0.3,
		flutterFrequency: [0, -30, 0, 13],
		breathing: 1,
		breathCentre: 625 / 1186, // the middle of the chest
		maximumScale: 1.5,
		still: reducedMotion,
	});
}

let stillLayers = 0;

// layer: the element showing the layer's image until its drawn copy is up.
// light(): the time of day's CSS filters for it. swayUrl: its motion map, or
// null for a still layer. tiled: the image repeats across, placed by the
// layer's background position and size (the clouds).
function swayLayer(layer, canvasSelector, swayUrl, { light, tiled, ...motion }) {
	const land = document.querySelector(layer);
	const canvas = document.querySelector(canvasSelector);
	if (!land || !canvas || !land.getClientRects().length) return; // hidden at this quality
	const style = getComputedStyle(land);
	// The image: an <img>, the layer's background, or (the city) the
	// --texture its ::before shows.
	const source =
		land.currentSrc ||
		(style.backgroundImage + style.getPropertyValue("--texture")).match(/url\("?([^")]+)"?\)/)?.[1];
	if (!source) return;
	const texture = new URL(source, document.baseURI).href;

	// The layer's CSS filters (its grade, then the time of day's light) as one
	// colour matrix for the shader.
	const grade = colorFilter(style.getPropertyValue("--color-grade"));
	const conditions = () => {
		const filters = colorFilter(light(), grade);
		return {
			wind: byWeather(weatherCurves.wind),
			grade: [0, 1, 2].flatMap((column) => filters.rows.map((row) => row[column])),
			gradeOffset: filters.offset,
			// How long its colour glides to this (a jump in time is already eased).
			settle: !glideBigCanvases ? 0 : "jumping" in document.documentElement.dataset ? 0.08 : 0.5,
		};
	};
	const size = () => [canvas.offsetWidth, canvas.offsetHeight, window.devicePixelRatio];
	const tile = () => {
		if (!tiled) return undefined;
		const { backgroundPositionX, backgroundPositionY, backgroundSize } = getComputedStyle(land);
		return [backgroundPositionX, backgroundPositionY, backgroundSize.split(" ")[1]].map(parseFloat);
	};

	const worker = new Worker("./js/workers/wind.js");
	const offscreen = canvas.transferControlToOffscreen();
	worker.postMessage(
		{
			canvas: offscreen,
			image: texture,
			sway: swayUrl && new URL(swayUrl, location.href).href,
			...motion,
			size: size(),
			tile: tile(),
			conditions: conditions(),
		},
		[offscreen],
	);
	worker.onmessage = ({ data }) => {
		if (data === "drawn") land.classList.add("is-swaying");
	};
	// Only once the light or wind has moved enough to see (as in setStyle),
	// and the still layers a few milliseconds apart, not all in one frame:
	// each redraw of a big layer is new work for Safari's compositor. They
	// all land within ~70ms, well inside a tick even at 5x speed; spread
	// wider, the layers changed light at different moments and shimmered.
	const delay = motion.still ? 8 * stillLayers++ : 0;
	let sent = [];
	document.addEventListener("scenesettings", () => {
		const next = conditions();
		const numbers = [next.wind, ...next.grade, ...next.gradeOffset];
		if (numbers.every((number, i) => Math.abs(number - sent[i]) < Math.max(0.015 * Math.abs(sent[i]), 0.004))) return;
		sent = numbers;
		setTimeout(() => worker.postMessage({ conditions: next }), delay);
	});
	window.addEventListener("resize", () => worker.postMessage({ size: size(), tile: tile() }), { passive: true });
	document.addEventListener("visibilitychange", () => worker.postMessage({ hidden: document.hidden }));
}

// Ridges cast shadows on the land in front of them while the sun is up (it
// rises behind them, in the east). Each column of a ridge's skyline casts
// forward, away from the point on the horizon below the sun, as far as the
// sun's height allows: long and slanting at sunrise, shorter as it climbs,
// fanning out on either side of the sun, so the angles change as it moves
// across the sky. Darkest near the ridge and fading toward the far end, the
// shadow darkens the land beneath it (a multiply blend in the CSS) and keeps
// to the receiving land's outline; it fades as clouds or the noon darkness
// hide the sun. Each is drawn into a small canvas over the land, moving with
// it in the parallax, so a change of light is a quick redraw, not work for
// the GPU's layers.
function landShadows() {
	const pairs = [
		{
			ridge: '[data-scenery="far-mountains"]',
			ridgeShape: "./assets/shadows/far-mountains-shape-v2.webp",
			land: '[data-scenery="distant-hills"]',
			landShape: "./assets/shadows/hills-shape-v3.webp",
			canvas: ".land-shadow--hills",
			landSizedByWidth: false,
		},
		{
			ridge: '[data-scenery="distant-hills"]',
			ridgeShape: "./assets/shadows/hills-shape-v3.webp",
			land: '[data-scenery="olives"]',
			landShape: "./assets/shadows/olives-shape-v2.webp",
			canvas: ".land-shadow--olives",
			landSizedByWidth: false,
		},
		{
			ridge: '[data-scenery="olives"]',
			ridgeShape: "./assets/shadows/olives-shape-v2.webp",
			land: '[data-scenery="distant-jerusalem"]',
			landShape: "./assets/shadows/jerusalem-land-v2.webp",
			canvas: ".land-shadow--city",
			landSizedByWidth: true, // the city image is sized by width
		},
		{
			ridge: '[data-scenery="golgotha-ridge"]',
			ridgeShape: "./assets/shadows/golgotha-ridge-shape.webp",
			land: '[data-scenery="ground"]',
			landShape: "./assets/shadows/near-ground-land.webp",
			canvas: ".land-shadow--ground",
			landSizedByWidth: false,
		},
	].map((pair) => {
		const ridge = document.querySelector(pair.ridge);
		const land = document.querySelector(pair.land);
		const image = (src) => Object.assign(new Image(), { src });
		return {
			...pair,
			canvas: document.querySelector(pair.canvas),
			ridgeShape: image(pair.ridgeShape),
			landShape: image(pair.landShape),
			ridge,
			land,
		};
	});
	const landScale =
		Number(getComputedStyle(document.documentElement).getPropertyValue("--parallax-overscan")) || 1.2;
	const canvasWidth = 640; // the shadows are soft; this is plenty
	// Where the land meets the sky, as a share of the screen's height: the
	// sun's height above it sets how long the shadows are.
	const horizon = 0.72;

	// Where an element sits with no parallax applied.
	function restingRect(element) {
		const rect = element.getBoundingClientRect();
		const [dx = 0, dy = 0] = (element.style.translate || "")
			.split(" ")
			.map((value) => parseFloat(value) || 0);
		return { left: rect.left - dx, top: rect.top - dy, width: rect.width, height: rect.height };
	}

	// An outline's top edge, column by column, as a share of its height (1
	// where the column is empty).
	function topEdge(image) {
		const canvas = Object.assign(document.createElement("canvas"), {
			width: image.naturalWidth,
			height: image.naturalHeight,
		});
		const context = canvas.getContext("2d", { willReadFrequently: true });
		context.drawImage(image, 0, 0);
		const { data, width, height } = context.getImageData(0, 0, canvas.width, canvas.height);
		const tops = new Float32Array(width).fill(1);
		for (let x = 0; x < width; x++) {
			for (let y = 0; y < height; y++) {
				if (data[(y * width + x) * 4 + 3] > 128) {
					tops[x] = y / height;
					break;
				}
			}
		}
		return tops;
	}

	// The land's edge as the ground lies, not its grass tips or rooftops: in
	// each stretch of 31 columns, the edge at the lower quarter.
	function groundEdge(tops) {
		return tops.map((_, x) => {
			const near = [...tops.slice(Math.max(0, x - 15), x + 16)].sort((a, b) => a - b);
			return near[Math.floor(near.length * 0.75)];
		});
	}

	// Where an image drawn like CSS background-size `auto 100%` (or `100%
	// auto`), anchored at the bottom centre of a box, lands.
	function placement(image, box, byWidth) {
		const aspect = image.naturalWidth / image.naturalHeight;
		const width = byWidth ? box.width : box.height * aspect;
		const height = byWidth ? box.width / aspect : box.height;
		return { left: box.left + (box.width - width) / 2, top: box.top + box.height - height, width, height };
	}

	// The top edge of a placed outline at x, or null off its sides.
	function edgeAt(tops, place, x) {
		const along = (x - place.left) / place.width;
		if (along < 0 || along >= 1) return null;
		return place.top + tops[Math.floor(along * tops.length)] * place.height;
	}

	// Each ridge and its land, in the land layer's own (unscaled) units.
	function measure() {
		for (const pair of pairs) {
			if (!pair.ridgeShape.complete || !pair.landShape.complete) return;
			pair.ridgeTops ??= topEdge(pair.ridgeShape);
			pair.landTops ??= groundEdge(topEdge(pair.landShape));
			const ridge = restingRect(pair.ridge);
			const land = restingRect(pair.land);
			pair.landRect = land;
			pair.box = { left: 0, top: 0, width: land.width / landScale, height: land.height / landScale };
			const outline = {
				left: (ridge.left - land.left) / landScale,
				top: (ridge.top - land.top) / landScale,
				width: ridge.width / landScale,
				height: ridge.height / landScale,
			};
			pair.ridgePlace = placement(pair.ridgeShape, outline, false);
			pair.landPlace = placement(pair.landShape, pair.box, pair.landSizedByWidth);
			pair.canvas.width = canvasWidth;
			pair.canvas.height = Math.max(1, Math.round((canvasWidth * pair.box.height) / pair.box.width));
		}
	}

	// sun: where it is across the sky and how high, as the timeCurves give.
	function draw(pair, [sunLeft, sunTop]) {
		const context = pair.canvas.getContext("2d");
		context.setTransform(1, 0, 0, 1, 0, 0);
		context.clearRect(0, 0, pair.canvas.width, pair.canvas.height);
		if (pair.canvas.hidden || !pair.ridgeTops) return;
		const { box } = pair;
		context.setTransform(pair.canvas.width / box.width, 0, 0, pair.canvas.width / box.width, 0, 0);

		// The sun, in land units, and its height above the horizon: how long
		// a shadow is for each unit of ridge above the land's edge.
		const sunX = (sunLeft * innerWidth - pair.landRect.left) / landScale;
		const sunHeight = Math.max(0.025, horizon - sunTop);
		const reach = Math.min(6, 0.3 / sunHeight);
		// How far a shadow leans sideways, per unit of length, at a point one
		// unit from below the sun: they fan out on either side of it.
		const fan = (0.7 * innerHeight) / landScale;

		const bases = [];
		const tips = [];
		for (let along = 0; along <= box.width; along += box.width / 200) {
			const base = edgeAt(pair.landTops, pair.landPlace, along);
			if (base === null) continue;
			const top = edgeAt(pair.ridgeTops, pair.ridgePlace, along);
			const length = top === null ? 0 : Math.max(0, base - top) * reach;
			const lean = clamp((along - sunX) / fan, -1.5, 1.5);
			bases.push([along, base]);
			tips.push([along + lean * length, base + length]);
		}

		// Darkest near the ridge: layers reaching less and less far.
		context.fillStyle = "rgba(14, 18, 32, 0.24)";
		for (const share of [1, 0.78, 0.56, 0.36]) {
			context.beginPath();
			bases.forEach(([px, py], i) => (i ? context.lineTo(px, py) : context.moveTo(px, py)));
			for (let i = tips.length - 1; i >= 0; i--) {
				const [bx, by] = bases[i];
				context.lineTo(bx + (tips[i][0] - bx) * share, by + (tips[i][1] - by) * share);
			}
			context.fill();
		}

		// Only what falls on the land.
		const { left, top, width, height } = pair.landPlace;
		context.globalCompositeOperation = "destination-in";
		context.drawImage(pair.landShape, left, top, width, height);
		context.globalCompositeOperation = "source-over";
	}

	// The shadows' angles glide with the sun between the clock's ticks.
	let sun = [0, 0];
	function drawAll(at = sun) {
		sun = at;
		for (const pair of pairs) draw(pair, sun);
	}
	const glideShadows = glideBigCanvases ? glider(drawAll, { fps: 20 }) : drawAll;

	function applyLight() {
		const strength =
			byTime(timeCurves.shadowStrength) * byWeather(weatherCurves.sunlight) * (1 - darkness());
		for (const pair of pairs) pair.canvas.style.setProperty("--shadow-strength", strength);
		// No sun to cast them: hide the canvases and skip drawing.
		for (const pair of pairs) pair.canvas.hidden = strength < 0.01;
		glideShadows([byTime(timeCurves.sunLeft), byTime(timeCurves.sunHeight)]);
	}

	measure();
	applyLight();
	document.addEventListener("scenesettings", applyLight);
	window.addEventListener("resize", () => {
		measure();
		drawAll();
	});
	for (const pair of pairs) {
		for (const image of [pair.ridgeShape, pair.landShape]) {
			image.addEventListener("load", () => {
				measure();
				drawAll();
			});
		}
	}
}
