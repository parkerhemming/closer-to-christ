// Scene settings. Change these to tune the scene. The ones in
// savedSettingNames can also be changed in the settings panel, and a
// visitor's choices there are saved on their device and win over these.
const sceneSettings = {
	// 0 is night, 1 full day; 0.3 is the original pre-dawn scene and sunrise
	// (on the left horizon) is around 0.45. See timeCurves.
	timeOfDay: 0.3,
	// 0 is a clear sky, 1 a full storm; 0.7 is the original storm.
	// Rain, lightning, clouds and wind all follow it (see weatherCurves).
	weatherIntensity: 0.7,
	// Whether the scene follows the mouse or phone tilt at all.
	parallax: true,
	// Seconds the parallax takes to catch up to the mouse or tilt.
	// 0 follows exactly; 0.2 is a gentle, floaty ease. With smoothing, a fast
	// flick swings a little past where it's heading and settles back (more
	// smoothing, bigger swing).
	parallaxSmoothing: 0.3,
	// The loading screen stays up at least this long so its verse can be read.
	minimumLoadingSeconds: 4,
};

const reducedMotion = window.matchMedia(
	"(prefers-reduced-motion: reduce)",
).matches;

const savedSettingNames = [
	"timeOfDay",
	"weatherIntensity",
	"parallax",
	"parallaxSmoothing",
];

try {
	const saved = JSON.parse(localStorage.getItem("sceneSettings")) ?? {};
	for (const name of savedSettingNames) {
		if (name in saved) sceneSettings[name] = saved[name];
	}
} catch {}

// Saves the visitor's choices and tells the scene to pick them up.
function saveSettings() {
	try {
		const saved = Object.fromEntries(
			savedSettingNames.map((name) => [name, sceneSettings[name]]),
		);
		localStorage.setItem("sceneSettings", JSON.stringify(saved));
	} catch {}
	document.dispatchEvent(new Event("scenesettings"));
}

// How each part of the weather follows weatherIntensity, as [weather, value]
// points joined by straight lines. Every curve has value 1 at weather 0.7, so
// 0.7 is exactly the original storm.
const weatherCurves = {
	// Amount of rain: none until 0.35, a downpour (14x the original) at 1.
	rain: [[0, 0], [0.35, 0], [0.7, 1], [1, 14]],
	// Streak length: long streaks in heavy rain read as sheets of water.
	rainLength: [[0, 1], [0.7, 1], [1, 1.9]],
	// Streak brightness.
	rainBrightness: [[0, 1], [0.7, 1], [1, 1.25]],
	// How often lightning strikes: none until 0.55, 2.5x as often at 1.
	lightning: [[0, 0], [0.55, 0], [0.7, 1], [1, 2.5]],
	// Cloud opacity: faint wisps when clear, thin at partly cloudy, much
	// thicker than the original at 1.
	clouds: [[0, 0.08], [0.4, 0.38], [0.7, 1], [1, 1.7]],
	// Cloud brightness: light, fair-weather clouds when clear; dark at 1.
	cloudShade: [[0, 1.45], [0.4, 1.2], [0.7, 1], [1, 0.72]],
	// Wind: how fast the clouds drift and how far the rain slants.
	wind: [[0, 0.35], [0.7, 1], [1, 1.9]],
	// Direct sunlight getting through the clouds (it sets how strong the
	// ridges' shadows are).
	sunlight: [[0, 1], [0.5, 0.8], [0.7, 0.45], [1, 0.15]],
	// The dark storm wash over the whole scene (its opacity: the wash is
	// twice the original strength, so 0.5 is the original and 1 is double).
	gloom: [[0, 0], [0.4, 0.22], [0.7, 0.5], [1, 1]],
};

function byWeather(points) {
	return alongCurve(points, sceneSettings.weatherIntensity);
}

// How the light follows timeOfDay, as [time, value] points like weatherCurves.
// Every curve gives the original look at 0.3 (multipliers 1, tints 0), so
// 0.3 is exactly the original scene.
const timeCurves = {
	// Brightness, colour and sunrise warmth of the land layers. At sunrise the
	// sun is behind the hills, so the land stays dim (backlit) a while longer.
	landLight: [[0, 0.6], [0.3, 1], [0.45, 1.12], [0.6, 1.7], [1, 2.3]],
	landSaturation: [[0, 0.8], [0.3, 1], [0.6, 1.4], [1, 1.6]],
	landWarmth: [[0, 0], [0.3, 0], [0.45, 0.35], [0.6, 0.15], [1, 0]],
	// Clouds: dark at night, glowing warm at sunrise, bright by day.
	cloudLight: [[0, 0.55], [0.3, 1], [0.45, 1.3], [0.6, 1.6], [1, 1.9]],
	cloudWarmth: [[0, 0], [0.3, 0], [0.42, 0.45], [0.6, 0.15], [1, 0]],
	// Stars (and shooting stars) fade as the sky lightens.
	starlight: [[0, 1], [0.3, 1], [0.45, 0.25], [0.55, 0], [1, 0]],
	// The city's window and lantern lights go out in daylight.
	cityGlow: [[0, 1], [0.3, 1], [0.5, 0.35], [0.65, 0], [1, 0]],
	// The figure's brightness.
	figureLight: [[0, 0.75], [0.3, 1], [0.6, 1.12], [1, 1.18]],
	// The sun: hidden until after 0.32, rising from behind the left hills.
	sunOpacity: [[0, 0], [0.32, 0], [0.4, 1], [1, 1]],
	// Cast shadows of the ridges: none before the sun is up, longest and
	// strongest just after sunrise, retreating to the ridge by late morning.
	// shadowReach is how much of the visible land in front of a ridge its
	// shadow covers; shadowLean is how far it slants right (the sun is on the
	// left) per unit of length.
	shadowStrength: [[0, 0], [0.38, 0], [0.44, 0.65], [0.55, 0.55], [0.75, 0.3], [0.9, 0], [1, 0]],
	shadowReach: [[0, 0.8], [0.45, 0.8], [0.55, 0.5], [0.7, 0.2], [0.85, 0.05], [1, 0.02]],
	shadowLean: [[0, 0.9], [0.38, 0.9], [0.6, 0.6], [1, 0.2]],
	// Of screen height; the left hills' ridge is at about 0.7, so the sun is
	// half behind them at 0.45.
	sunHeight: [[0, 0.85], [0.35, 0.84], [0.45, 0.7], [0.55, 0.58], [0.7, 0.42], [1, 0.14]],
	sunLeft: [[0, 0.2], [0.45, 0.2], [1, 0.3]], // of screen width
};

// Sky colours at each time as [time, [r, g, b, a]]: the gradient from the
// horizon up, plus the sunrise glow low on the left. 0.3 is the original sky.
const skyColors = {
	horizon: [[0, [26, 37, 51, 1]], [0.3, [81, 85, 101, 1]], [0.45, [232, 164, 115, 1]], [0.6, [233, 201, 165, 1]], [1, [201, 224, 239, 1]]],
	low: [[0, [16, 28, 40, 1]], [0.3, [48, 59, 72, 1]], [0.45, [122, 112, 128, 1]], [0.6, [150, 174, 196, 1]], [1, [127, 177, 222, 1]]],
	middle: [[0, [11, 26, 38, 1]], [0.3, [23, 40, 52, 1]], [0.45, [76, 98, 122, 1]], [0.6, [110, 150, 190, 1]], [1, [88, 145, 205, 1]]],
	zenith: [[0, [5, 14, 22, 1]], [0.3, [9, 23, 32, 1]], [0.45, [42, 74, 102, 1]], [0.6, [79, 127, 174, 1]], [1, [61, 120, 184, 1]]],
	glowCore: [[0, [239, 174, 112, 0]], [0.3, [239, 174, 112, 0.38]], [0.45, [255, 190, 120, 0.75]], [0.6, [255, 228, 190, 0.4]], [1, [255, 250, 235, 0.15]]],
	glowMiddle: [[0, [166, 111, 98, 0]], [0.3, [166, 111, 98, 0.2]], [0.45, [240, 150, 110, 0.45]], [0.6, [250, 205, 170, 0.2]], [1, [255, 245, 230, 0.06]]],
	glowEdge: [[0, [58, 61, 76, 0]], [0.3, [58, 61, 76, 0.07]], [0.45, [180, 120, 120, 0.15]], [0.6, [200, 190, 200, 0.06]], [1, [240, 240, 240, 0]]],
};

function alongCurve(points, at) {
	at = clamp(at, points[0][0], points.at(-1)[0]);
	for (let i = 1; i < points.length; i++) {
		const [fromAt, from] = points[i - 1];
		const [toAt, to] = points[i];
		if (at <= toAt) {
			const along = (at - fromAt) / (toAt - fromAt);
			return Array.isArray(from)
				? from.map((value, j) => value + (to[j] - value) * along)
				: from + (to - from) * along;
		}
	}
	return points.at(-1)[1];
}

function byTime(points) {
	return alongCurve(points, sceneSettings.timeOfDay);
}

function skyColor(points) {
	const [r, g, b, a] = alongCurve(points, sceneSettings.timeOfDay);
	return `rgba(${Math.round(r)}, ${Math.round(g)}, ${Math.round(b)}, ${a.toFixed(3)})`;
}

function timeName(time) {
	if (time < 0.2) return "Night";
	if (time < 0.38) return "Dawn";
	if (time < 0.5) return "Sunrise";
	if (time < 0.75) return "Morning";
	return "Day";
}

// Sets the light for the current time of day as CSS variables on <html>;
// the sky, land, clouds, city lights, stars and figure all read them.
function applyTimeOfDay() {
	setStyleProperties(document.documentElement, {
		"--sky-horizon": skyColor(skyColors.horizon),
		"--sky-low": skyColor(skyColors.low),
		"--sky-middle": skyColor(skyColors.middle),
		"--sky-zenith": skyColor(skyColors.zenith),
		"--glow-core": skyColor(skyColors.glowCore),
		"--glow-middle": skyColor(skyColors.glowMiddle),
		"--glow-edge": skyColor(skyColors.glowEdge),
		"--land-light": byTime(timeCurves.landLight),
		"--land-saturation": byTime(timeCurves.landSaturation),
		"--land-warmth": byTime(timeCurves.landWarmth),
		"--cloud-light": byTime(timeCurves.cloudLight),
		"--cloud-warmth": byTime(timeCurves.cloudWarmth),
		"--starlight": byTime(timeCurves.starlight),
		"--city-glow": byTime(timeCurves.cityGlow),
		"--figure-light": byTime(timeCurves.figureLight),
		"--sun-opacity": byTime(timeCurves.sunOpacity),
		"--sun-top": `${byTime(timeCurves.sunHeight) * 100}vh`,
		"--sun-left": `${byTime(timeCurves.sunLeft) * 100}vw`,
	});
}

function weatherName(weather) {
	if (weather < 0.15) return "Clear";
	if (weather < 0.35) return "Partly cloudy";
	if (weather < 0.55) return "Overcast";
	if (weather < 0.85) return "Storm";
	return "Heavy storm";
}

function randomBetween(minimum, maximum) {
	return minimum + Math.random() * (maximum - minimum);
}

function clamp(value, minimum, maximum) {
	return Math.max(minimum, Math.min(maximum, value));
}

function setStyleProperties(element, properties) {
	for (const [name, value] of Object.entries(properties)) {
		element.style.setProperty(name, value);
	}
}

// Quality levels. The <head> script picks the starting level from the
// connection and device; these lower it when loading or drawing turns out to
// be slow. CSS reacts to data-quality right away (including the image size).
const qualityLevels = ["low", "medium", "high"];
// Filled in as the scene loads; shown in the settings panel's details.
const renderStats = { loadSeconds: null, connectionTestMs: null, raindrops: 0 };
// A small image every lower-quality scene uses; timing it tells a fast
// connection from a slow one before the large images start downloading.
const connectionTestImage = "./assets/mobile/storm-cloud-cumulus.avif"; // 48KB

function getQuality() {
	return document.documentElement.dataset.quality;
}

// remember: keep the level for later visits (for slow devices, not slow
// networks, since later visits load from the cache).
function setQuality(quality, { reason, remember = false }) {
	document.documentElement.dataset.quality = quality;
	document.documentElement.dataset.qualityReason = reason;
	if (remember) {
		try {
			localStorage.setItem("loweredQuality", quality);
		} catch {}
	}
}

function lowerQuality(options) {
	const level = qualityLevels.indexOf(getQuality());
	if (level > 0) setQuality(qualityLevels[level - 1], options);
}

// Every image the visible scene uses, read from the computed styles so the
// list never drifts from the CSS. Hidden layers (display: none) are skipped:
// the browser never downloads their images either.
function sceneImageUrls() {
	const urls = new Set();
	const addUrls = (value) => {
		for (const [, url] of value.matchAll(/url\("?([^")]+)"?\)/g)) urls.add(url);
	};

	for (const element of document.querySelectorAll("body *")) {
		if (element.closest(".overlay") || !element.getClientRects().length) {
			continue;
		}
		for (const pseudo of [null, "::before"]) {
			const style = getComputedStyle(element, pseudo);
			addUrls(style.backgroundImage);
			addUrls(style.maskImage || style.webkitMaskImage || "");
		}
		if (element instanceof HTMLImageElement) urls.add(element.currentSrc);
	}
	return [...urls];
}

// Shows the loading screen until every scene image is downloaded and decoded,
// so layers appear together instead of popping in one by one.
async function loadScene() {
	const loading = document.getElementById("loading");
	const wait = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

	// Time a small download first. Slow (like 3G): use the small images from
	// the start rather than waiting on large ones that would never finish.
	const root = document.documentElement;
	if ("probing" in root.dataset) {
		const started = performance.now();
		await fetch(connectionTestImage)
			.then((response) => response.blob())
			.catch(() => {});
		const testMs = Math.round(performance.now() - started);
		renderStats.connectionTestMs = testMs;
		// About 3G or slower takes over 1.5s for 48KB; slow 4G, over 0.8s.
		if (testMs > 1500) {
			setQuality("low", { reason: `slow connection (test took ${testMs}ms)` });
		} else if (testMs > 800 && getQuality() === "high") {
			setQuality("medium", { reason: `slowish connection (test took ${testMs}ms)` });
		}
		delete root.dataset.probing; // the scene layers appear and start loading
	}

	const urls = sceneImageUrls();
	let loaded = 0;
	const images = Promise.all(
		urls.map(async (url) => {
			const image = new Image();
			image.src = url;
			// Downloaded (or failed: a missing image shouldn't block the scene)...
			await new Promise((resolve) => {
				image.onload = image.onerror = resolve;
			});
			loaded += 1;
			loading.style.setProperty("--progress", loaded / urls.length);
			// ...then decoded, so it can draw at once. Browsers postpone decoding
			// in background tabs, so don't wait on it for long.
			await Promise.race([image.decode().catch(() => {}), wait(2000)]);
		}),
	);

	// Never hold the scene back forever on a very slow connection.
	await Promise.race([images, wait(25000)]);
	renderStats.loadSeconds = performance.now() / 1000;

	await wait((sceneSettings.minimumLoadingSeconds - renderStats.loadSeconds) * 1000);
	loading.classList.add("is-done");
	loading.addEventListener("transitionend", () => loading.remove(), {
		once: true,
	});
	watchFrameRate();

	if ("serviceWorker" in navigator) {
		navigator.serviceWorker.register("./sw.js").catch(() => {});
	}
}

// Once the scene has settled, watch the frame rate for a few seconds. Well
// below 20fps steps the quality down one level and remembers it, so
// struggling (older) phones get a lighter scene now and on later visits.
// Smooth drawing clears an earlier step-down, so a device isn't stuck on a
// lower level because of one bad moment.
function watchFrameRate() {
	const frameTimes = [];
	let previous;
	let end;

	function measure(now) {
		if (document.hidden || !document.hasFocus()) return; // not a fair test
		frameTimes.push(now - previous);
		previous = now;
		if (now < end) {
			requestAnimationFrame(measure);
			return;
		}
		frameTimes.sort((a, b) => a - b);
		const median = frameTimes[Math.floor(frameTimes.length / 2)];
		if (median > 50) {
			lowerQuality({ reason: "slow frame rate", remember: true });
		} else if (median < 25) {
			try {
				localStorage.removeItem("loweredQuality");
			} catch {}
		}
	}

	// Skip the first seconds: decoding and the first animations settle there.
	setTimeout(() => {
		previous = performance.now();
		end = previous + 4000;
		requestAnimationFrame(measure);
	}, 3000);
}

function createStars(stars) {
	const sky = document.querySelector("#sky .stars");
	const fragment = document.createDocumentFragment();

	for (let i = 0; i < stars; i++) {
		const size = Math.random();
		const star = document.createElement("div");

		star.classList.add("star");
		star.style.top = Math.random() * 100 + "%";
		star.style.left = Math.random() * 100 + "%";
		star.style.opacity = Math.random() * 0.8;

		if (size < 0.25) {
			star.classList.add("twinkle");
			const delay = Math.random();
			star.style.animationDelay = delay + "s";
			star.style.animationDuration = delay * 2 + 0.75 + "s";
		}

		if (size > 0.96) {
			star.classList.add("big");
			star.style.width = size * 12.5 + "px";
		} else {
			star.style.width = size * 2.5 + "px";
		}

		fragment.appendChild(star);
	}

	sky.appendChild(fragment);
}

function createShootingStars() {
	const sky = document.querySelector("#sky .stars");
	// Far, middle, and near meteors: dimmer and slower the farther away.
	const profiles = [
		{
			chance: 0.42,
			width: [42, 78],
			thickness: [0.65, 1.05],
			duration: [1450, 2350],
			travel: [28, 48],
			opacity: [0.42, 0.66],
			blur: [0.45, 0.8],
			head: [1.4, 2.1],
		},
		{
			chance: 0.82,
			width: [76, 132],
			thickness: [1, 1.75],
			duration: [920, 1650],
			travel: [40, 66],
			opacity: [0.62, 0.86],
			blur: [0.25, 0.55],
			head: [1.9, 2.8],
		},
		{
			chance: 1,
			width: [118, 205],
			thickness: [1.6, 2.7],
			duration: [580, 1120],
			travel: [55, 88],
			opacity: [0.82, 1],
			blur: [0.08, 0.3],
			head: [2.6, 4.2],
		},
	];

	if (reducedMotion) return;

	function scheduleShootingStar(firstStar = false) {
		const minimumDelay = firstStar ? 4500 : 18000;
		const delayRange = firstStar ? 4500 : 22000;

		window.setTimeout(
			launchShootingStar,
			minimumDelay + Math.random() * delayRange,
		);
	}

	function launchShootingStar() {
		const shootingStar = document.createElement("span");
		const roll = Math.random();
		const profile = profiles.find((profile) => roll < profile.chance);
		const movingRight = Math.random() > 0.5;
		const movingDown = Math.random() > 0.35;
		const angle = movingRight
			? movingDown
				? 12 + Math.random() * 18
				: -(8 + Math.random() * 16)
			: movingDown
				? 150 + Math.random() * 18
				: 192 + Math.random() * 16;
		const startX = movingRight
			? 5 + Math.random() * 40
			: 55 + Math.random() * 40;
		const startY = movingDown
			? 4 + Math.random() * 23
			: 20 + Math.random() * 18;

		const travel = randomBetween(...profile.travel);

		shootingStar.className = "shooting-star";
		shootingStar.setAttribute("aria-hidden", "true");
		setStyleProperties(shootingStar, {
			"--shooting-start-x": `${startX}%`,
			"--shooting-start-y": `${startY}%`,
			"--shooting-angle": `${angle}deg`,
			"--shooting-distance": `${travel}vw`,
			"--shooting-mid-distance": `${travel * 0.72}vw`,
			"--shooting-duration": `${randomBetween(...profile.duration)}ms`,
			"--shooting-tail-width": `${randomBetween(...profile.width)}px`,
			"--shooting-thickness": `${randomBetween(...profile.thickness)}px`,
			"--shooting-opacity": randomBetween(...profile.opacity),
			"--shooting-blur": `${randomBetween(...profile.blur)}px`,
			"--shooting-head-size": `${randomBetween(...profile.head)}px`,
		});

		if (Math.random() < 0.3) {
			shootingStar.classList.add("shooting-star--stretch");
		}

		shootingStar.addEventListener("animationend", () => shootingStar.remove(), {
			once: true,
		});
		sky.appendChild(shootingStar);
		scheduleShootingStar();
	}

	scheduleShootingStar(true);
}

function createStorm() {
	const lightningLayers = [
		document.getElementById("lightning-back"),
		document.getElementById("lightning-middle"),
		document.getElementById("lightning-front"),
	];
	const svgNamespace = "http://www.w3.org/2000/svg";

	// Rain is drawn on two full-screen canvases (behind and in front of the
	// storm wash) rather than as an element per drop: each frame redraws every
	// drop as a slanted streak, and a drop that falls off the bottom starts
	// again above the top. Drops are grouped into a few brightness/width bands
	// and each band is drawn in one go, so a downpour of hundreds of drops costs
	// about as much as a drizzle. Nothing runs while the tab is hidden.
	function startRain(layers) {
		const fallSlant = Math.tan((7 * Math.PI) / 180); // the original 7deg lean
		const brightnessBands = 4;
		const widthBands = 2;
		let width = 0;
		let height = 0;
		let lastTime = 0;
		let firstFrame = true;

		for (const layer of layers) {
			layer.canvas = document.getElementById(layer.id);
			layer.context = layer.canvas.getContext("2d");
			layer.drops = [];
		}

		function resize() {
			width = window.innerWidth;
			height = window.innerHeight;
			for (const layer of layers) {
				// Soft rain doesn't need full retina sharpness; fewer pixels to clear.
				const scale = Math.min(window.devicePixelRatio, layer.maximumScale);
				layer.canvas.width = Math.round(width * scale);
				layer.canvas.height = Math.round(height * scale);
				layer.context.setTransform(scale, 0, 0, scale, 0, 0);
				layer.context.lineCap = "round";
			}
		}

		// A drop starts somewhere above the top edge (or anywhere on screen when
		// the rain first appears, so it doesn't arrive as one sheet).
		function newDrop(layer, anywhere) {
			const fallSeconds = randomBetween(...layer.fallSeconds);
			return {
				x: randomBetween(-0.08, 1.04) * width,
				y: anywhere ? randomBetween(-0.4, 1) * height : randomBetween(-0.4, 0) * height,
				// The original drops fell 150% of the screen height in fallSeconds.
				speed: (1.5 * height) / fallSeconds,
				drift: randomBetween(...layer.drift) / (1.5 * height), // sideways per px fallen
				length: randomBetween(...layer.length),
				band: Math.floor(Math.random() * brightnessBands * widthBands),
			};
		}

		function frame(now) {
			const elapsed = Math.min((now - lastTime) / 1000, 0.05);
			lastTime = now;
			const seconds = now / 1000;
			const wind = byWeather(weatherCurves.wind);
			const lengthScale = byWeather(weatherCurves.rainLength);
			const brightness = byWeather(weatherCurves.rainBrightness);
			// Gusts: the amount of rain swells and eases a little over time.
			const gust = 1 + 0.18 * Math.sin(seconds * 0.7) + 0.1 * Math.sin(seconds * 1.9 + 1);
			let total = 0;

			for (const layer of layers) {
				const share = getQuality() === "low" ? layer.lowQualityShare : 1;
				const target = Math.round(
					layer.count * byWeather(weatherCurves.rain) * share * gust,
				);
				while (layer.drops.length < target) {
					layer.drops.push(newDrop(layer, firstFrame));
				}

				// One faint tail path and one brighter head path per band.
				const tails = Array.from({ length: brightnessBands * widthBands }, () => new Path2D());
				const heads = Array.from({ length: brightnessBands * widthBands }, () => new Path2D());
				for (let i = layer.drops.length - 1; i >= 0; i--) {
					const drop = layer.drops[i];
					drop.y += drop.speed * elapsed;
					drop.x += drop.speed * elapsed * drop.drift * wind;
					const length = drop.length * lengthScale;
					if (drop.y - length > height) {
						// Fallen off the bottom: start again at the top, or stop
						// if the rain has eased off.
						if (layer.drops.length > target) layer.drops.splice(i, 1);
						else layer.drops[i] = newDrop(layer, false);
						continue;
					}
					// A streak along the fall direction (the 7deg lean plus its
					// wind drift): a faint upper tail and a brighter lower end,
					// like the original gradient drops.
					const dx = (fallSlant + drop.drift * wind) * length;
					const midX = drop.x - dx * 0.45;
					const midY = drop.y - length * 0.45;
					tails[drop.band].moveTo(drop.x - dx, drop.y - length);
					tails[drop.band].lineTo(midX, midY);
					heads[drop.band].moveTo(midX, midY);
					heads[drop.band].lineTo(drop.x, drop.y);
				}

				const context = layer.context;
				context.clearRect(0, 0, width, height);
				for (let band = 0; band < tails.length; band++) {
					const brightnessStep = (band % brightnessBands + 0.5) / brightnessBands;
					const widthStep = (Math.floor(band / brightnessBands) + 0.5) / widthBands;
					const [lowOpacity, highOpacity] = layer.opacity;
					const [thin, thick] = layer.width;
					const alpha = Math.min(
						1,
						(lowOpacity + (highOpacity - lowOpacity) * brightnessStep) * brightness,
					);
					context.lineWidth = thin + (thick - thin) * widthStep;
					context.strokeStyle = `rgba(203, 222, 233, ${alpha * 0.3})`;
					context.stroke(tails[band]);
					context.strokeStyle = `rgba(203, 222, 233, ${alpha * 0.9})`;
					context.stroke(heads[band]);
				}
				total += layer.drops.length;
			}
			firstFrame = false;
			renderStats.raindrops = total;
			requestAnimationFrame(frame);
		}

		resize();
		window.addEventListener("resize", resize, { passive: true });
		requestAnimationFrame((now) => {
			lastTime = now;
			frame(now);
		});
	}

	function createBoltPath() {
		const points = [{ x: randomBetween(42, 58), y: -4 }];
		let y = -4;

		while (y < 104) {
			y += randomBetween(7, 13);
			points.push({
				x: clamp(points.at(-1).x + randomBetween(-14, 14), 10, 90),
				y,
			});
		}

		return points;
	}

	function pointsToPath(points) {
		return points
			.map(
				(point, index) =>
					`${index === 0 ? "M" : "L"} ${point.x} ${point.y}`,
			)
			.join(" ");
	}

	function appendLightningPath(svg, points, className, width) {
		const path = document.createElementNS(svgNamespace, "path");
		path.setAttribute("d", pointsToPath(points));
		path.setAttribute("class", className);
		path.style.setProperty("--bolt-width", width);
		svg.appendChild(path);
	}

	function createLightningBolt(lightningLayer, strikeX, distance) {
		const bolt = document.createElementNS(svgNamespace, "svg");
		const mainPoints = createBoltPath();
		const duration = randomBetween(260, 520);
		const branchCount = Math.floor(randomBetween(1, 4));
		const reachesGround = distance !== "near" && Math.random() < 0.68;
		let boltTop;
		let boltHeight;
		let boltWidth;
		let strokeScale;

		if (distance === "far") {
			boltTop = randomBetween(24, 36);
			boltHeight = reachesGround
				? randomBetween(68, 75) - boltTop
				: randomBetween(17, 28);
			boltWidth = randomBetween(3.5, 8);
			strokeScale = 0.62;
		} else if (distance === "middle") {
			boltTop = randomBetween(13, 27);
			boltHeight = reachesGround
				? randomBetween(69, 79) - boltTop
				: randomBetween(25, 42);
			boltWidth = randomBetween(5, 13);
			strokeScale = 0.82;
		} else {
			boltTop = randomBetween(-8, 6);
			boltHeight = randomBetween(58, 94);
			boltWidth = randomBetween(10, 24);
			strokeScale = 1;
		}

		bolt.setAttribute("viewBox", "0 0 100 100");
		bolt.setAttribute("preserveAspectRatio", "none");
		bolt.setAttribute("aria-hidden", "true");
		bolt.classList.add(
			"lightning-bolt",
			`lightning-bolt--${distance}`,
			reachesGround ? "lightning-bolt--ground" : "lightning-bolt--cloud",
		);
		bolt.style.setProperty("--bolt-duration", `${duration}ms`);
		bolt.style.setProperty(
			"--bolt-left",
			`${clamp(strikeX + randomBetween(-9, 3), 2, 84)}%`,
		);
		bolt.style.setProperty("--bolt-top", `${boltTop}dvh`);
		bolt.style.setProperty("--bolt-height", `${boltHeight}dvh`);
		bolt.style.setProperty("--bolt-width-screen", `${boltWidth}vw`);
		bolt.style.setProperty("--bolt-slant", randomBetween(0.75, 1.25));

		appendLightningPath(
			bolt,
			mainPoints,
			"lightning-bolt__main",
			randomBetween(0.72, 1.25) * strokeScale,
		);

		for (let i = 0; i < branchCount; i++) {
			const startIndex = Math.floor(
				randomBetween(2, mainPoints.length - 3),
			);
			const start = mainPoints[startIndex];
			const direction = Math.random() > 0.5 ? 1 : -1;
			const branch = [{ ...start }];
			let branchX = start.x;
			let branchY = start.y;

			for (
				let segment = 0;
				segment < Math.floor(randomBetween(2, 5));
				segment++
			) {
				branchX = clamp(
					branchX + direction * randomBetween(7, 16) + randomBetween(-3, 3),
					10,
					90,
				);
				branchY += randomBetween(5, 10);
				branch.push({ x: branchX, y: branchY });
			}

			appendLightningPath(
				bolt,
				branch,
				"lightning-bolt__branch",
				randomBetween(0.36, 0.68) * strokeScale,
			);
		}

		lightningLayer.appendChild(bolt);
		window.setTimeout(() => bolt.remove(), duration + 100);
	}

	function createCloudFlash(lightningLayer, strikeX, distance) {
		const cloudFlash = document.createElement("span");
		const duration = randomBetween(320, 620);
		const flashTop =
			distance === "far"
				? randomBetween(14, 28)
				: distance === "middle"
					? randomBetween(4, 18)
					: randomBetween(-10, 2);

		cloudFlash.className = "cloud-lightning-flash";
		cloudFlash.style.setProperty("--flash-duration", `${duration}ms`);
		cloudFlash.style.setProperty("--flash-x", `${strikeX}%`);
		cloudFlash.style.setProperty("--flash-top", `${flashTop}dvh`);
		cloudFlash.style.setProperty(
			"--flash-width",
			`${randomBetween(30, 62)}vw`,
		);
		cloudFlash.style.setProperty(
			"--flash-height",
			`${randomBetween(32, 68)}dvh`,
		);
		cloudFlash.style.setProperty(
			"--flash-strength",
			randomBetween(0.38, 0.7),
		);
		lightningLayer.appendChild(cloudFlash);
		window.setTimeout(() => cloudFlash.remove(), duration + 80);
	}

	function triggerLightning() {
		// The weather may have calmed since this strike was scheduled.
		if (byWeather(weatherCurves.lightning) === 0) {
			scheduleLightning();
			return;
		}
		const distanceRoll = Math.random();
		const distanceIndex =
			distanceRoll < 0.52 ? 0 : distanceRoll < 0.86 ? 1 : 2;
		const distance = ["far", "middle", "near"][distanceIndex];
		const lightningLayer = lightningLayers[distanceIndex];
		const visibleBolt = Math.random() > 0.2;
		const strikeX = randomBetween(8, 92);

		createCloudFlash(lightningLayer, strikeX, distance);

		if (visibleBolt) createLightningBolt(lightningLayer, strikeX, distance);
		if (Math.random() > 0.66) {
			window.setTimeout(
				() => createLightningBolt(lightningLayer, strikeX, distance),
				randomBetween(80, 190),
			);
		}
		scheduleLightning();
	}

	function scheduleLightning(firstStrike = false) {
		const minimumDelay = firstStrike ? 1600 : 3200;
		const delayRange = firstStrike ? 2800 : 6800;
		const frequency = byWeather(weatherCurves.lightning);
		// No lightning in calm weather; look again in a few seconds.
		if (frequency === 0) {
			window.setTimeout(scheduleLightning, 3000);
			return;
		}
		window.setTimeout(
			triggerLightning,
			(minimumDelay + Math.random() * delayRange) / frequency,
		);
	}

	// Clouds and the storm wash follow the weather through CSS variables; the
	// wind sets the clouds' drift speed through their animation playback rate,
	// which changes smoothly instead of jumping like a new duration would.
	function applyWeather() {
		const storm = document.getElementById("storm");
		setStyleProperties(storm, {
			"--cloud-amount": byWeather(weatherCurves.clouds),
			"--cloud-shade": byWeather(weatherCurves.cloudShade),
			"--gloom": byWeather(weatherCurves.gloom),
		});
		const wind = byWeather(weatherCurves.wind);
		for (const texture of storm.querySelectorAll(".storm-cloud__texture")) {
			for (const animation of texture.getAnimations()) {
				animation.updatePlaybackRate(wind);
			}
		}
	}

	applyWeather();
	document.addEventListener("scenesettings", applyWeather);

	if (reducedMotion) return;

	// Each [min, max] pair is a random range. count is the number of drops in
	// the original storm (weather 0.7); the weather scales it.
	startRain([
		{
			id: "rain-back",
			count: 34,
			length: [8, 20],
			fallSeconds: [0.72, 1.12],
			opacity: [0.12, 0.34],
			drift: [50, 105], // px sideways over a full fall
			width: [0.28, 0.62],
			maximumScale: 1, // soft, distant rain
			lowQualityShare: 0,
		},
		{
			id: "rain-front",
			count: 10,
			length: [18, 44],
			fallSeconds: [0.43, 0.76],
			opacity: [0.24, 0.62],
			drift: [90, 180],
			width: [0.42, 0.88],
			maximumScale: 2,
			lowQualityShare: 0.5,
		},
	]);
	scheduleLightning(true);
}

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

// Set by landShadows(); parallax() calls it each frame with the mouse/tilt
// offset so the shadows follow the layers.
let updateLandShadows = null;

// Ridges cast shadows on the land in front of them once the sun is up (it
// rises behind them, on the left). Each shadow is the ridge's own outline,
// flipped down from where the ridge meets the land in front, stretched by the
// sun's angle and leaned right, inside a catcher clipped to the receiving
// land's outline. Its far end moves with the ridge and its near end with the
// land, so it changes angle as the parallax moves them apart.
function landShadows() {
	const rootStyle = getComputedStyle(document.documentElement);
	// Image rows measured from the artwork's transparency (fraction of the
	// image height): where each ridge's skyline begins and where each
	// receiving layer's top edge is.
	const pairs = [
		{
			ridge: '[data-scenery="distant-hills"]',
			ridgeShape: "--texture",
			skyline: 0.294,
			land: '[data-scenery="distant-jerusalem"]',
			landEdge: 0.697, // the image is sized by width (2:1), anchored at the bottom
			landSizedByWidth: true,
			// The land is visible down to where the Golgotha ridge covers it.
			coveredBy: '[data-scenery="golgotha-ridge"]',
			coveredBySkyline: 0.636,
		},
		{
			ridge: '[data-scenery="golgotha-ridge"]',
			ridgeShape: "--mask",
			skyline: 0.596,
			land: '[data-scenery="ground"]',
			landEdge: 0.432, // the image is sized by height
			landSizedByWidth: false,
			coveredBy: null, // visible down to the bottom of the screen
		},
	].map((pair) => {
		const ridge = document.querySelector(pair.ridge);
		const land = document.querySelector(pair.land);
		const shadow = land.querySelector(".land-shadow > span");
		shadow.style.setProperty(
			"--shadow-shape",
			getComputedStyle(ridge).getPropertyValue(pair.ridgeShape),
		);
		return {
			...pair,
			shadow,
			ridgeDepth: Number(ridge.dataset.z_index),
			landDepth: Number(land.dataset.z_index),
			ridge,
			land,
		};
	});
	const landScale = Number(rootStyle.getPropertyValue("--parallax-overscan")) || 1.2;
	let lastX = 0;
	let lastDepthScale = 0;

	// Where an element sits with no parallax applied.
	function restingRect(element) {
		const rect = element.getBoundingClientRect();
		const [dx = 0, dy = 0] = (element.style.translate || "")
			.split(" ")
			.map((value) => parseFloat(value) || 0);
		return { left: rect.left - dx, top: rect.top - dy, width: rect.width, height: rect.height, bottom: rect.bottom - dy };
	}

	// Lays each shadow over its ridge, in the land layer's own (unscaled)
	// coordinates, and remembers the ground line and the ridge's height.
	function measure() {
		for (const pair of pairs) {
			const ridge = restingRect(pair.ridge);
			const land = restingRect(pair.land);
			const toLand = (screen, landStart) => (screen - landStart) / landScale;
			const groundLine = pair.landSizedByWidth
				? land.bottom - (1 - pair.landEdge) * (land.width / 2)
				: land.top + land.height * pair.landEdge;
			const skylineTop = ridge.top + ridge.height * pair.skyline;
			const visibleUntil = pair.coveredBy
				? (() => {
						const cover = restingRect(document.querySelector(pair.coveredBy));
						return cover.top + cover.height * pair.coveredBySkyline;
					})()
				: window.innerHeight;
			pair.base = toLand(groundLine, ridge.top);
			pair.ridgeHeight = Math.max(1, (groundLine - skylineTop) / landScale);
			// How much land is visible in front of the ridge.
			pair.visibleLand = Math.max(1, (visibleUntil - groundLine) / landScale);
			setStyleProperties(pair.shadow, {
				left: `${toLand(ridge.left, land.left)}px`,
				top: `${toLand(ridge.top, land.top)}px`,
				width: `${ridge.width / landScale}px`,
				height: `${ridge.height / landScale}px`,
				"transform-origin": `50% ${pair.base}px`,
			});
		}
	}

	function place(x = lastX, depthScale = lastDepthScale) {
		lastX = x;
		lastDepthScale = depthScale;
		const lean = byTime(timeCurves.shadowLean);
		for (const pair of pairs) {
			// How far the ridge has moved relative to the land (in land units).
			const shift = (x * depthScale * (pair.ridgeDepth - pair.landDepth)) / landScale;
			// The shadow's reach across the visible land, and the stretch of the
			// ridge's outline that gives it.
			const reach = byTime(timeCurves.shadowReach) * pair.visibleLand;
			const length = reach / pair.ridgeHeight;
			// The base follows the ridge; the tip stays put on the land.
			const slant = Math.atan(lean - shift / reach);
			pair.shadow.style.transform =
				`translateX(${shift}px) skewX(${slant}rad) scaleY(${-length})`;
		}
	}

	function applyLight() {
		document.documentElement.style.setProperty(
			"--shadow-strength",
			byTime(timeCurves.shadowStrength) * byWeather(weatherCurves.sunlight),
		);
		place();
	}

	measure();
	applyLight();
	updateLandShadows = place;
	document.addEventListener("scenesettings", applyLight);
	window.addEventListener("resize", () => {
		measure();
		place();
	});
}

function parallax() {
	const layers = document.querySelectorAll("[data-z_index]");
	const christ = document.getElementById("christ");
	const christDepthFactor = 0.78;
	const mobileHorizontalStrength = 70;
	const mobileVerticalStrength = 50;
	let targetX = 0;
	let targetY = 0;
	let currentX = 0;
	let currentY = 0;
	let velocityX = 0;
	let velocityY = 0;
	let animationFrame = 0;
	let lastFrameTime = 0;
	// The mouse drives the parallax until the gyroscope actually reports data.
	let tiltActive = false;
	const layerSettings = [...layers].map((layer) => ({
		layer,
		depth:
			Number(layer.dataset.z_index) *
			(layer === christ ? christDepthFactor : 1),
	}));

	function moveLayers(x, y) {
		const depthScale = tiltActive ? 0.00044 : 0.0009;
		const horizontalRange = tiltActive
			? 24 * mobileHorizontalStrength
			: Math.max(window.innerWidth / 2, 1);

		for (const { layer, depth } of layerSettings) {
			const scale = depth * depthScale;
			layer.style.translate = `${x * scale}px ${y * scale}px`;
		}
		updateLandShadows?.(x, depthScale);

		const horizontalProgress = clamp(x / horizontalRange, -1, 1);

		// A slight turn of the figure (and its edge shadow) with the view.
		christ.style.setProperty(
			"--christ-rotate-y",
			`${horizontalProgress * 0.6}deg`,
		);
		christ.style.setProperty(
			"--christ-edge-offset",
			`${horizontalProgress * -0.4}px`,
		);
	}

	function animateParallax(time) {
		animationFrame = 0;
		// Capped so the first frame after a pause doesn't count the idle time.
		const elapsed = Math.min((time - lastFrameTime) / 1000, 1 / 30);
		lastFrameTime = time;
		// Share of the remaining distance to cover this frame. Based on elapsed
		// time, so the ease feels the same at 60Hz and 120Hz. 1 = jump straight there.
		// With parallax switched off, everything settles back to the centre.
		const goalX = sceneSettings.parallax ? targetX : 0;
		const goalY = sceneSettings.parallax ? targetY : 0;
		const smoothing = sceneSettings.parallaxSmoothing;

		if (smoothing > 0) {
			// A spring pulls the scene toward the goal. It carries velocity, so
			// a fast flick swings past the goal (further the faster it was) and
			// eases back; a slow move barely swings. The damping allows one
			// bounce: a fast flick overshoots ~6%, the swing back is <0.5%.
			// Stepped in small slices so it stays stable at any frame rate.
			const stiffness = 2.15 / smoothing; // ~63% of the way in `smoothing` seconds
			const damping = 2 * 0.65 * stiffness;
			for (let left = elapsed; left > 0; left -= 1 / 240) {
				const dt = Math.min(left, 1 / 240);
				velocityX += (stiffness ** 2 * (goalX - currentX) - damping * velocityX) * dt;
				velocityY += (stiffness ** 2 * (goalY - currentY) - damping * velocityY) * dt;
				currentX += velocityX * dt;
				currentY += velocityY * dt;
			}
		} else {
			currentX = goalX;
			currentY = goalY;
			velocityX = velocityY = 0;
		}
		moveLayers(currentX, currentY);

		const moving = Math.abs(velocityX) + Math.abs(velocityY) > 0.1;
		if (Math.abs(goalX - currentX) > 0.1 || Math.abs(goalY - currentY) > 0.1 || moving) {
			requestParallaxFrame();
		}
	}

	function requestParallaxFrame() {
		if (!animationFrame) {
			animationFrame = requestAnimationFrame(animateParallax);
		}
	}

	document.addEventListener("pointermove", (event) => {
		if (event.pointerType === "touch" || tiltActive) return;
		targetX = event.clientX - window.innerWidth / 2;
		targetY = event.clientY - window.innerHeight / 2;
		requestParallaxFrame();
	});

	let resizeTimer;
	window.addEventListener(
		"resize",
		() => {
			document.body.classList.add("is-resizing");
			window.clearTimeout(resizeTimer);
			resizeTimer = window.setTimeout(() => {
				document.body.classList.remove("is-resizing");
			}, 160);
			requestParallaxFrame();
		},
		{ passive: true },
	);

	// Phone tilt support
	let startingRotation = null;
	let motionEnabled = false;

	function getRotationMatrix(alpha, beta, gamma) {
		const degreesToRadians = Math.PI / 180;
		const a = alpha * degreesToRadians;
		const b = beta * degreesToRadians;
		const g = gamma * degreesToRadians;
		const ca = Math.cos(a);
		const sa = Math.sin(a);
		const cb = Math.cos(b);
		const sb = Math.sin(b);
		const cg = Math.cos(g);
		const sg = Math.sin(g);

		// Device Orientation uses an intrinsic Z-X'-Y'' rotation order.
		return [
			ca * cg - sa * sb * sg,
			-cb * sa,
			cg * sa * sb + ca * sg,
			cg * sa + ca * sb * sg,
			ca * cb,
			sa * sg - ca * cg * sb,
			-cb * sg,
			sb,
			cb * cg,
		];
	}

	function dotProduct(x1, y1, z1, x2, y2, z2) {
		return x1 * x2 + y1 * y2 + z1 * z2;
	}

	function resetMotionCenter() {
		startingRotation = null;
		targetX = 0;
		targetY = 0;
		requestParallaxFrame();
	}

	function handleOrientation(event) {
		if (event.gamma == null || event.beta == null) return;

		const rotation = getRotationMatrix(
			event.alpha ?? 0,
			event.beta,
			event.gamma,
		);

		if (startingRotation === null) {
			startingRotation = rotation;
			return;
		}

		const currentZ = [rotation[2], rotation[5], rotation[8]];
		const startingX = [
			startingRotation[0],
			startingRotation[3],
			startingRotation[6],
		];
		const startingY = [
			startingRotation[1],
			startingRotation[4],
			startingRotation[7],
		];
		const startingZ = [
			startingRotation[2],
			startingRotation[5],
			startingRotation[8],
		];
		const relativeX = dotProduct(...currentZ, ...startingX);
		const relativeY = dotProduct(...currentZ, ...startingY);
		const relativeZ = dotProduct(...currentZ, ...startingZ);

		// Once the phone is tilted almost perpendicular to its starting plane,
		// hold the current edge position. This avoids the atan2 wrap that occurs
		// if the device is carried through or around the far corner boundary.
		if (relativeZ <= 0.15) return;

		const radiansToDegrees = 180 / Math.PI;
		const relativeGamma =
			Math.atan2(relativeX, relativeZ) * radiansToDegrees;
		const relativeBeta =
			Math.atan2(-relativeY, relativeZ) * radiansToDegrees;

		const screenAngle =
			screen.orientation?.angle ?? window.orientation ?? 0;
		let horizontalTilt = relativeGamma;
		let verticalTilt = relativeBeta;

		if (screenAngle === 90) {
			horizontalTilt = -relativeBeta;
			verticalTilt = relativeGamma;
		} else if (screenAngle === 270 || screenAngle === -90) {
			horizontalTilt = relativeBeta;
			verticalTilt = -relativeGamma;
		} else if (screenAngle === 180) {
			horizontalTilt = -relativeGamma;
			verticalTilt = -relativeBeta;
		}

		tiltActive = true;
		targetX = clamp(horizontalTilt, -24, 24) * mobileHorizontalStrength;
		targetY = clamp(verticalTilt, -18, 18) * mobileVerticalStrength;
		requestParallaxFrame();
	}

	function startMotion() {
		if (motionEnabled) return;
		motionEnabled = true;
		window.addEventListener("deviceorientation", handleOrientation);
		window.addEventListener("orientationchange", resetMotionCenter);
		screen.orientation?.addEventListener("change", resetMotionCenter);
	}

	async function requestMotionPermission() {
		try {
			const permission = await DeviceOrientationEvent.requestPermission();
			if (permission === "granted") {
				startMotion();
			}

			return permission;
		} catch (error) {
			if (error.name !== "NotAllowedError") {
				console.warn("Motion permission was not enabled:", error);
			}
		}

		return "prompt";
	}

	// Only phones and tablets use tilt; touchscreen laptops have a mouse and
	// keep the mouse parallax.
	const hasTiltScreen =
		typeof DeviceOrientationEvent !== "undefined" &&
		window.matchMedia("(pointer: coarse)").matches;
	// iPhones ask for permission (needs a tap); Android just works.
	const needsPermission =
		hasTiltScreen && typeof DeviceOrientationEvent.requestPermission === "function";

	function enableTilt() {
		if (needsPermission) requestMotionPermission();
		else startMotion();
	}

	// Switching parallax on in the settings panel is a tap, so tilt can be
	// enabled (and permission asked) right there.
	document.addEventListener("scenesettings", () => {
		if (sceneSettings.parallax && hasTiltScreen && !motionEnabled) enableTilt();
		requestParallaxFrame();
	});

	if (!hasTiltScreen || !sceneSettings.parallax) return;

	const prompt = document.getElementById("motion-prompt");
	let asked = false;
	try {
		asked = localStorage.getItem("motionAsked") === "yes";
	} catch {}

	function answer(useMotion) {
		prompt.remove();
		try {
			localStorage.setItem("motionAsked", "yes");
		} catch {}
		sceneSettings.parallax = useMotion;
		saveSettings(); // with parallax on, this enables tilt within the tap
	}

	prompt
		.querySelector('[data-answer="yes"]')
		.addEventListener("click", () => answer(true));
	prompt
		.querySelector('[data-answer="no"]')
		.addEventListener("click", () => answer(false));

	if (needsPermission) {
		// Safari answers silently if permission was already decided; if it is
		// still undecided it throws, and only a tap on the prompt can ask.
		requestMotionPermission().then((permission) => {
			if (permission === "prompt") prompt.hidden = false;
		});
	} else if (asked) {
		startMotion();
	} else {
		prompt.hidden = false;
	}
}

// The gear button's panel. Every control writes straight into sceneSettings
// as it moves, so changes show live behind the panel. The render details at
// the bottom refresh while the panel is open.
function settingsPanel() {
	const button = document.getElementById("settings-button");
	const dialog = document.getElementById("settings");
	const form = dialog.querySelector("form");
	const details = dialog.querySelector(".settings-details");
	const {
		timeOfDay,
		timeValue,
		weatherIntensity,
		weatherValue,
		parallax,
		parallaxSmoothing,
		smoothingValue,
	} = form.elements;

	function showCurrentValues() {
		timeOfDay.value = sceneSettings.timeOfDay;
		timeValue.value = timeName(sceneSettings.timeOfDay);
		weatherIntensity.value = sceneSettings.weatherIntensity;
		weatherValue.value = `${weatherName(sceneSettings.weatherIntensity)}, ${Math.round(sceneSettings.weatherIntensity * 100)}%`;
		parallax.checked = sceneSettings.parallax;
		parallaxSmoothing.value = sceneSettings.parallaxSmoothing;
		parallaxSmoothing.disabled = !sceneSettings.parallax;
		smoothingValue.value =
			sceneSettings.parallaxSmoothing > 0
				? `${sceneSettings.parallaxSmoothing.toFixed(2)}s`
				: "Exact";
	}

	// Frame rate: frames counted over the last second while the panel is open.
	let framesThisSecond = 0;
	let framesPerSecond = null;
	function countFrames() {
		framesThisSecond += 1;
		if (dialog.open) requestAnimationFrame(countFrames);
	}

	function showDetails() {
		const root = document.documentElement;
		const connection = navigator.connection;
		const visibleClouds = [...document.querySelectorAll(".storm-cloud")].filter(
			(cloud) => cloud.getClientRects().length,
		).length;
		const rows = [
			["Quality", `${root.dataset.quality}: ${root.dataset.qualityReason}`],
			renderStats.connectionTestMs !== null && [
				"Connection test",
				`${renderStats.connectionTestMs}ms for 48KB`,
			],
			[
				"Images",
				getQuality() === "low" || root.dataset.assets === "small"
					? "small (2K)"
					: "full (4K)",
			],
			[
				"Loaded in",
				renderStats.loadSeconds ? `${renderStats.loadSeconds.toFixed(1)}s` : "...",
			],
			["Frame rate", framesPerSecond === null ? "..." : `${framesPerSecond} fps`],
			["Screen", `${innerWidth}x${innerHeight} @${devicePixelRatio}x`],
			// Chrome's own guess; often wrong, so it doesn't pick the quality.
			connection && [
				"Browser estimate",
				`${connection.effectiveType}, ${connection.rtt}ms, ${connection.downlink}Mb/s`,
			],
			navigator.deviceMemory && ["Memory", `${navigator.deviceMemory}GB`],
			["Clouds", `${visibleClouds} layers`],
			[
				"Effects",
				`${document.querySelectorAll(".star").length} stars, ` +
					`${renderStats.raindrops} raindrops`,
			],
			[
				"Offline cache",
				navigator.serviceWorker?.controller ? "on" : "off until next visit",
			],
		].filter(Boolean);
		details.replaceChildren(
			...rows.flatMap(([name, value]) => {
				const term = document.createElement("dt");
				const description = document.createElement("dd");
				term.textContent = name;
				description.textContent = value;
				return [term, description];
			}),
		);
	}

	let detailsTimer;
	button.addEventListener("click", () => {
		showCurrentValues();
		showDetails();
		dialog.showModal();
		framesThisSecond = 0;
		requestAnimationFrame(countFrames);
		detailsTimer = setInterval(() => {
			framesPerSecond = framesThisSecond;
			framesThisSecond = 0;
			showDetails();
		}, 1000);
	});

	dialog.addEventListener("close", () => clearInterval(detailsTimer));

	// A click on the backdrop (outside the card) closes the panel.
	dialog.addEventListener("click", (event) => {
		if (event.target === dialog) dialog.close();
	});

	form.addEventListener("input", () => {
		sceneSettings.timeOfDay = Number(timeOfDay.value);
		sceneSettings.weatherIntensity = Number(weatherIntensity.value);
		sceneSettings.parallax = parallax.checked;
		sceneSettings.parallaxSmoothing = Number(parallaxSmoothing.value);
		saveSettings();
		showCurrentValues();
	});
}
