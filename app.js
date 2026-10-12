// Scene settings. Change these to tune the scene. Most can also be changed
// in the settings panel; the ones in savedSettingNames are saved on the
// visitor's device and win over these.
const sceneSettings = {
	// The scene's clock in hours, from 6 (6:00 AM, when Jesus was led to
	// Pilate "early in the morning") to 15 (3:00 PM, the ninth hour, when he
	// died). Each visit starts here. See hourCurves and the timeline.
	hour: 6,
	// How fast the clock runs on its own, a minute at a time: minutes of the
	// day per real second (1.5 = the 9 hours pass in 6 minutes). 0 starts it
	// paused. It stops at 3 PM; the button by the time pauses and plays it.
	clockSpeed: 1.5,
	// 0 is a clear sky, 1 a full storm; 0.7 is the original storm.
	// Rain, lightning, clouds and wind all follow it (see weatherCurves).
	// null picks a random weather that follows the hour (see weatherForHour).
	weatherIntensity: null,
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

const savedSettingNames = ["parallax", "parallaxSmoothing"];

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

// How the clock sets the light and the weather, as [hour, value] points
// like weatherCurves.
const hourCurves = {
	// The daylight level the timeCurves read: 0 night, 1 full day. The sun is
	// rising at 6 and high by noon.
	daylight: [[6, 0.4], [7, 0.55], [9, 0.78], [11.5, 1], [15, 1]],
	// From noon "there was darkness over the whole land until the ninth hour"
	// (Mark 15:33) and "the sun was darkened" (Luke 23:45): an unnatural dimming
	// of the day, not night. It falls fast just before noon, so it's already
	// dark at 12, and deepens to its darkest at 3 PM. 0 is none; at 1 the
	// light reaches darkLight.
	darkness: [[6, 0], [11.75, 0], [12, 0.65], [15, 1]],
	// The usual weather: often stormy in the dim early morning (sometimes
	// clear enough for the stars) and in the darkness, calmer through the
	// bright morning, then building from 2:30 to the fiercest storm at 3 PM,
	// when he died and the earth quaked (past 1, so even a calm lean reaches
	// a full storm). weatherForHour adds the visit's random lean.
	weather: [[6, 0.55], [7.5, 0.45], [9, 0.3], [11.5, 0.25], [12, 0.7], [14.5, 0.8], [15, 1.2]],
};

// How much stormier (or calmer) than usual the weather is: random for each
// visit, set by the Weather slider, and none after a jump to an event (each
// event has its hour's usual weather). As the clock runs, the weather follows
// the hour plus this lean, so the storm builds into the noon darkness.
let weatherLean = randomBetween(-0.2, 0.2);

function weatherForHour(hour) {
	return clamp(alongCurve(hourCurves.weather, hour) + weatherLean, 0, 1);
}

sceneSettings.weatherIntensity ??= weatherForHour(sceneSettings.hour);

function daylight() {
	return alongCurve(hourCurves.daylight, sceneSettings.hour);
}

function darkness() {
	return alongCurve(hourCurves.darkness, sceneSettings.hour);
}

// What the noon darkness dims each light toward: a dull grey-blue sky, dim
// land and clouds, a faint sun, stars showing through, and lamps lit in the
// city.
const darkLight = {
	starlight: 0.5,
	sky: [58, 64, 72],
	landLight: 0.85,
	landSaturation: 0.65,
	cloudLight: 0.8,
	figureLight: 0.88,
	sunOpacity: 0.25,
	cityGlow: 0.6,
};

// A light's value for the hour, dimmed by the noon darkness.
function lightFor(name) {
	const value = byTime(timeCurves[name]);
	return name in darkLight ? value + (darkLight[name] - value) * darkness() : value;
}

// How the light follows the daylight level, as [daylight, value] points.
// Every curve gives the original look at 0.3 (multipliers 1, tints 0), so
// 0.3 is exactly the original pre-dawn scene; sunrise (on the left horizon)
// is around 0.45.
const timeCurves = {
	// Brightness, colour and sunrise warmth of the land layers. At sunrise the
	// sun is behind the hills, so the land stays dim (backlit) a while longer.
	landLight: [[0, 0.6], [0.3, 1], [0.45, 1.12], [0.6, 1.7], [1, 2.3]],
	landSaturation: [[0, 0.8], [0.3, 1], [0.6, 1.4], [1, 1.6]],
	landWarmth: [[0, 0], [0.3, 0], [0.45, 0.35], [0.6, 0.15], [1, 0]],
	// Clouds: dark at night, glowing warm at sunrise, bright by day.
	cloudLight: [[0, 0.55], [0.3, 1], [0.45, 1.3], [0.6, 1.6], [1, 1.9]],
	cloudWarmth: [[0, 0], [0.3, 0], [0.42, 0.45], [0.6, 0.15], [1, 0]],
	// Stars (and shooting stars) fade as the sky lightens; they're still out
	// at 6 AM (0.4) and gone by about 7.
	starlight: [[0, 1], [0.3, 1], [0.4, 0.85], [0.5, 0.2], [0.6, 0], [1, 0]],
	// The city's window and lantern lights go out in daylight.
	cityGlow: [[0, 1], [0.3, 1], [0.5, 0.35], [0.65, 0], [1, 0]],
	// The figure's brightness.
	figureLight: [[0, 0.75], [0.3, 1], [0.6, 1.12], [1, 1.18]],
	// The sun: hidden until after 0.32, rising from behind the left hills.
	sunOpacity: [[0, 0], [0.32, 0], [0.4, 1], [1, 1]],
	// How dark the ridges' cast shadows are: none before the sun is up,
	// strongest just after sunrise, a little softer through the day. Their
	// length and angle come from the sun's place (landShadows).
	shadowStrength: [[0, 0], [0.38, 0], [0.44, 0.8], [0.7, 0.65], [1, 0.55]],
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
	return alongCurve(points, daylight());
}

// Sky colours dim toward darkLight.sky; the sunrise glows fade out.
function skyColor(points, glow = false) {
	const dark = darkness();
	const [r, g, b, a] = alongCurve(points, daylight()).map((value, i) =>
		i < 3 ? value + (darkLight.sky[i] - value) * dark : glow ? value * (1 - dark) : value,
	);
	return `rgba(${Math.round(r)}, ${Math.round(g)}, ${Math.round(b)}, ${a.toFixed(3)})`;
}

// 9.5 -> "9:30 AM", to the minute.
function clockTime(hour) {
	const minutes = Math.round(hour * 60);
	const hours = Math.floor(minutes / 60);
	return `${((hours + 11) % 12) + 1}:${String(minutes % 60).padStart(2, "0")} ${hours < 12 ? "AM" : "PM"}`;
}

// The hour as the Gospels count it, from sunrise at 6: 9 AM ends the third
// hour (Mark 15:25), noon the sixth and 3 PM the ninth (Mark 15:33-34).
function gospelHour(hour) {
	const ordinals = ["First", "Second", "Third", "Fourth", "Fifth", "Sixth", "Seventh", "Eighth", "Ninth"];
	return `${ordinals[clamp(Math.ceil(hour - 6 - 0.001), 1, 9) - 1]} hour`;
}

// Paints the sky's small canvas: the gradient from the horizon up, and the
// sunrise glow, an ellipse as wide and tall as the sky centred low on the
// left.
function drawSky() {
	const canvas = document.querySelector(".sky-gradient");
	const context = canvas.getContext("2d");
	const { width, height } = canvas;
	const sky = context.createLinearGradient(0, height, 0, 0);
	sky.addColorStop(0, skyColor(skyColors.horizon));
	sky.addColorStop(0.2, skyColor(skyColors.low));
	sky.addColorStop(0.5, skyColor(skyColors.middle));
	sky.addColorStop(1, skyColor(skyColors.zenith));
	context.fillStyle = sky;
	context.fillRect(0, 0, width, height);

	const edge = skyColor(skyColors.glowEdge, true);
	context.save();
	context.translate(width * 0.2, height);
	context.scale(width, height);
	const glow = context.createRadialGradient(0, 0, 0, 0, 0, 1);
	glow.addColorStop(0, skyColor(skyColors.glowCore, true));
	glow.addColorStop(0.35, skyColor(skyColors.glowMiddle, true));
	glow.addColorStop(0.59, edge);
	glow.addColorStop(0.75, edge.replace(/[\d.]+\)$/, "0)")); // fades out
	context.fillStyle = glow;
	context.fillRect(-0.2, -1, 1, 1);
	context.restore();
}

// Sets the light for the clock's hour as CSS variables on <html>; the land,
// clouds, city lights, stars, sun and figure read them. The sky is painted.
function applyTimeOfDay() {
	drawSky();
	setStyleProperties(document.documentElement, {
		"--land-light": lightFor("landLight"),
		"--land-saturation": lightFor("landSaturation"),
		"--land-warmth": byTime(timeCurves.landWarmth),
		"--cloud-light": lightFor("cloudLight"),
		"--cloud-warmth": byTime(timeCurves.cloudWarmth),
		"--starlight": lightFor("starlight"),
		"--city-glow": lightFor("cityGlow"),
		"--figure-light": lightFor("figureLight"),
		"--sun-opacity": lightFor("sunOpacity"),
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
	if ("qualityChosen" in document.documentElement.dataset) return; // picked by hand
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
			head: [1.4, 2.1],
		},
		{
			chance: 0.82,
			width: [76, 132],
			thickness: [1, 1.75],
			duration: [920, 1650],
			travel: [40, 66],
			opacity: [0.62, 0.86],
			head: [1.9, 2.8],
		},
		{
			chance: 1,
			width: [118, 205],
			thickness: [1.6, 2.7],
			duration: [580, 1120],
			travel: [55, 88],
			opacity: [0.82, 1],
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

	// The rain (rain.js) runs in a worker where the browser can hand it the
	// canvases, so it keeps falling while the page's own frames are held up
	// (Chrome holds them while the settings panel scrolls). Elsewhere it runs
	// here. Either way this sends it the weather and the window size.
	function startRain(layers) {
		const canvases = layers.map((layer) => document.getElementById(layer.id));
		const conditions = () => ({
			rain: byWeather(weatherCurves.rain),
			wind: byWeather(weatherCurves.wind),
			lengthScale: byWeather(weatherCurves.rainLength),
			brightness: byWeather(weatherCurves.rainBrightness),
			low: getQuality() === "low",
		});
		const size = () => [window.innerWidth, window.innerHeight, window.devicePixelRatio];
		const countDrops = (total) => (renderStats.raindrops = total);

		if ("transferControlToOffscreen" in HTMLCanvasElement.prototype) {
			const worker = new Worker("./rain.js");
			const offscreen = canvases.map((canvas) => canvas.transferControlToOffscreen());
			worker.postMessage(
				{
					layers: layers.map((layer, i) => ({ ...layer, canvas: offscreen[i] })),
					size: size(),
					conditions: conditions(),
				},
				offscreen,
			);
			worker.onmessage = ({ data }) => countDrops(data);
			const sendConditions = () => worker.postMessage({ conditions: conditions() });
			document.addEventListener("scenesettings", sendConditions);
			setInterval(sendConditions, 2000); // picks up a change of quality too
			window.addEventListener("resize", () => worker.postMessage({ size: size() }), { passive: true });
			document.addEventListener("visibilitychange", () => worker.postMessage({ hidden: document.hidden }));
		} else {
			const rain = createRain(
				layers.map((layer, i) => ({ ...layer, canvas: canvases[i] })),
				conditions,
				countDrops,
			);
			rain.resize(...size());
			window.addEventListener("resize", () => rain.resize(...size()), { passive: true });
			document.addEventListener("visibilitychange", () => rain.pause(document.hidden));
		}
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
	// Each rate change restarts the huge cloud layers' animations on the GPU,
	// so it's only set once the weather stops changing (not every frame while
	// dragging the slider or easing the clock), and only when the wind has
	// changed noticeably (not every second as the running clock nudges it).
	let windTimer;
	let appliedWind = 1;
	function applyWeather() {
		const storm = document.getElementById("storm");
		setStyleProperties(storm, {
			"--cloud-amount": byWeather(weatherCurves.clouds),
			"--cloud-shade": byWeather(weatherCurves.cloudShade),
			"--gloom": byWeather(weatherCurves.gloom),
		});
		clearTimeout(windTimer);
		windTimer = setTimeout(() => {
			const wind = byWeather(weatherCurves.wind);
			if (Math.abs(wind - appliedWind) < appliedWind * 0.05) return;
			appliedWind = wind;
			for (const texture of storm.querySelectorAll(".storm-cloud__texture")) {
				for (const animation of texture.getAnimations()) {
					animation.updatePlaybackRate(wind);
				}
			}
		}, 250);
	}

	applyWeather();
	document.addEventListener("scenesettings", applyWeather);

	// Each cloud layer is painted once into a canvas at CSS-pixel resolution,
	// from the image and positions its CSS background describes, and the
	// background is then dropped. As a background the browser kept every layer
	// at full Retina resolution (about 28MB each), though the cloud images are
	// soft and half-size anyway; that crowded out other drawing, so scrolling
	// the settings panel stalled the whole scene in Chrome. The drift
	// animation and the colour filter stay on the layer, so nothing changes.
	function paintClouds() {
		for (const texture of document.querySelectorAll(".storm-cloud__texture")) {
			if (!texture.getClientRects().length) continue; // hidden at this quality
			// Read the CSS background as it is now (it differs on phones).
			texture.classList.remove("is-painted");
			const style = getComputedStyle(texture);
			const source = style.backgroundImage.match(/url\("?(.*?)"?\)/)?.[1];
			const imageHeight = parseFloat(style.backgroundSize.split(" ")[1]);
			const x = parseFloat(style.backgroundPositionX);
			const y = parseFloat(style.backgroundPositionY);
			if (!source) continue;
			const image = new Image();
			image.src = source;
			image.decode().then(() => {
				const canvas = texture.querySelector("canvas") ?? texture.appendChild(document.createElement("canvas"));
				const width = texture.offsetWidth;
				const height = texture.offsetHeight;
				const imageWidth = (imageHeight * image.naturalWidth) / image.naturalHeight;
				canvas.width = Math.ceil(width);
				canvas.height = Math.ceil(height);
				const context = canvas.getContext("2d");
				// repeat-x: tiles from the first one left of the edge to the right.
				for (let left = x - Math.ceil(x / imageWidth) * imageWidth; left < width; left += imageWidth) {
					context.drawImage(image, left, y, imageWidth, imageHeight);
				}
				texture.classList.add("is-painted");
			}, () => {}); // if it can't load, the CSS background stays
		}
	}

	paintClouds();
	let paintTimer;
	window.addEventListener("resize", () => {
		clearTimeout(paintTimer);
		paintTimer = setTimeout(paintClouds, 300);
	});

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
			// Full-screen at retina sharpness was the scene's biggest cost;
			// motion-blurred streaks look the same at 1x.
			maximumScale: 1,
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

	let wasThree = atThree();
	document.addEventListener("scenesettings", () => {
		if (atThree() && !wasThree) shakeIn(1000, true);
		wasThree = atThree();
	});
	shakeIn(2000, wasThree);
}

// The grass and bushes on the two near land layers sway in the wind, each
// drawn by wind.js in a worker so it keeps moving while the page's own frames
// are held up (as Chrome does while the settings scroll). The ridge is
// farther off and its bushes stiffer, so it moves less. Without a worker
// canvas or WebGL, with reduced motion or on low quality, the still images
// stay.
function swayInWind() {
	if (
		reducedMotion ||
		getQuality() === "low" ||
		!("transferControlToOffscreen" in HTMLCanvasElement.prototype)
	) {
		return;
	}
	const landLight = () =>
		`brightness(${lightFor("landLight")}) saturate(${lightFor("landSaturation")}) sepia(${byTime(timeCurves.landWarmth)})`;
	// Plants flutter each on their own (waves across the image); the cloth
	// and hair ripple downward.
	// Drawn below retina sharpness (maximumScale): every pixel is redrawn
	// each frame, and these dark, moving layers look the same with fewer.
	const plants = { light: landLight, flutterFrequency: [140, 0, 57, 0], maximumScale: 1.25 };
	swayLayer('[data-scenery="ground"]', ".land-wind--ground", "./assets/wind/near-ground-sway-v2.png", {
		...plants,
		strength: 1,
	});
	swayLayer('[data-scenery="golgotha-ridge"]', ".land-wind--ridge", "./assets/wind/golgotha-ridge-sway-v2.png", {
		...plants,
		strength: 0.45,
	});
	swayLayer("#christ", ".christ-wind", "./assets/christ/christ-motion-v1.png", {
		light: () => `brightness(${lightFor("figureLight")})`,
		strength: 0.3,
		flutterFrequency: [0, -30, 0, 13],
		breathing: 1,
		breathCentre: 625 / 1186, // the middle of the chest
		maximumScale: 1.5,
	});
}

// still: the element showing the layer's image until its moving copy has
// drawn. light(): the time of day's CSS filters for it.
function swayLayer(still, canvasSelector, swayUrl, { light, ...motion }) {
	const land = document.querySelector(still);
	const canvas = document.querySelector(canvasSelector);
	const style = getComputedStyle(land);
	const texture = land.currentSrc || style.backgroundImage.match(/url\("?([^")]+)"?\)/)?.[1];
	if (!texture) return;

	// The layer's CSS filters (its grade, then the time of day's light) as one
	// colour matrix for the shader.
	const grade = colorFilter(style.getPropertyValue("--color-grade"));
	const conditions = () => {
		const filters = colorFilter(light(), grade);
		return {
			wind: byWeather(weatherCurves.wind),
			grade: [0, 1, 2].flatMap((column) => filters.rows.map((row) => row[column])),
			gradeOffset: filters.offset,
		};
	};
	const size = () => [canvas.offsetWidth, canvas.offsetHeight, window.devicePixelRatio];

	const worker = new Worker("./wind.js");
	const offscreen = canvas.transferControlToOffscreen();
	worker.postMessage(
		{
			canvas: offscreen,
			image: texture,
			sway: new URL(swayUrl, location.href).href,
			...motion,
			size: size(),
			conditions: conditions(),
		},
		[offscreen],
	);
	worker.onmessage = ({ data }) => {
		if (data === "drawn") land.classList.add("is-swaying");
	};
	document.addEventListener("scenesettings", () => worker.postMessage({ conditions: conditions() }));
	window.addEventListener("resize", () => worker.postMessage({ size: size() }), { passive: true });
	document.addEventListener("visibilitychange", () => worker.postMessage({ hidden: document.hidden }));
}

// CSS filter functions (brightness, saturate, contrast, sepia) combined into
// one colour matrix (rows) and offset, using the filter spec's formulas,
// applied after `start`.
function colorFilter(filters, start = { rows: [[1, 0, 0], [0, 1, 0], [0, 0, 1]], offset: [0, 0, 0] }) {
	let { rows, offset } = start;
	for (const [, name, number, percent] of filters.matchAll(/(\w+)\(([\d.]+)(%?)\)/g)) {
		const a = Number(number) / (percent ? 100 : 1);
		const n = 1 - Math.min(a, 1);
		const step = {
			brightness: [[a, 0, 0], [0, a, 0], [0, 0, a]],
			contrast: [[a, 0, 0], [0, a, 0], [0, 0, a]],
			saturate: [
				[0.213 + 0.787 * a, 0.715 - 0.715 * a, 0.072 - 0.072 * a],
				[0.213 - 0.213 * a, 0.715 + 0.285 * a, 0.072 - 0.072 * a],
				[0.213 - 0.213 * a, 0.715 - 0.715 * a, 0.072 + 0.928 * a],
			],
			sepia: [
				[0.393 + 0.607 * n, 0.769 - 0.769 * n, 0.189 - 0.189 * n],
				[0.349 - 0.349 * n, 0.686 + 0.314 * n, 0.168 - 0.168 * n],
				[0.272 - 0.272 * n, 0.534 - 0.534 * n, 0.131 + 0.869 * n],
			],
		}[name];
		const add = name === "contrast" ? 0.5 - 0.5 * a : 0;
		const apply = (vector) => step.map((row) => row[0] * vector[0] + row[1] * vector[1] + row[2] * vector[2]);
		rows = [0, 1, 2].map((i) => apply(rows.map((row) => row[i]))); // columns, transformed...
		rows = [0, 1, 2].map((i) => rows.map((column) => column[i])); // ...back to rows
		offset = apply(offset).map((value) => value + add);
	}
	return { rows, offset };
}

// Set by landShadows(); parallax() calls it each frame with the mouse/tilt
// offset so the shadows follow the layers.
let updateLandShadows = null;

// Ridges cast shadows on the land in front of them while the sun is up (it
// rises behind them, in the east). Each column of a ridge's skyline casts
// forward, away from the point on the horizon below the sun, as far as the
// sun's height allows: long and slanting at sunrise, shorter as it climbs,
// fanning out on either side of the sun, so the angles change as it moves
// across the sky. Darkest near the ridge and fading toward the far end, the
// shadow darkens the land beneath it (a multiply blend in the CSS) and keeps
// to the receiving land's outline; it fades as clouds or the noon darkness
// hide the sun. Its far end moves with the ridge and its near end with the
// land, as the parallax moves them apart. Each is drawn into a small canvas
// over the land, so a change is a quick redraw, not work for the GPU's layers.
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
			ridgeDepth: Number(ridge.dataset.z_index),
			landDepth: Number(land.dataset.z_index),
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
	let lastX = 0;
	let lastDepthScale = 0;

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

	function draw(pair, x, depthScale) {
		const context = pair.canvas.getContext("2d");
		context.setTransform(1, 0, 0, 1, 0, 0);
		context.clearRect(0, 0, pair.canvas.width, pair.canvas.height);
		if (pair.canvas.hidden || !pair.ridgeTops) return;
		const { box } = pair;
		context.setTransform(pair.canvas.width / box.width, 0, 0, pair.canvas.width / box.width, 0, 0);

		// How far the ridge has moved relative to the land (in land units).
		const shift = (x * depthScale * (pair.ridgeDepth - pair.landDepth)) / landScale;
		// The sun, in land units, and its height above the horizon: how long
		// a shadow is for each unit of ridge above the land's edge.
		const sunX = (byTime(timeCurves.sunLeft) * innerWidth - pair.landRect.left) / landScale;
		const sunHeight = Math.max(0.025, horizon - byTime(timeCurves.sunHeight));
		const reach = Math.min(6, 0.3 / sunHeight);
		// How far a shadow leans sideways, per unit of length, at a point one
		// unit from below the sun: they fan out on either side of it.
		const fan = (0.7 * innerHeight) / landScale;

		const bases = [];
		const tips = [];
		for (let along = 0; along <= box.width; along += box.width / 200) {
			const base = edgeAt(pair.landTops, pair.landPlace, along);
			if (base === null) continue;
			const top = edgeAt(pair.ridgeTops, pair.ridgePlace, along - shift);
			const length = top === null ? 0 : Math.max(0, base - top) * reach;
			const lean = clamp((along - sunX) / fan, -1.5, 1.5);
			bases.push([along, base]);
			tips.push([along + lean * length, base + length]);
		}

		// Darkest near the ridge: layers reaching less and less far.
		context.fillStyle = "rgba(48, 56, 84, 0.26)";
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

	function place(x = lastX, depthScale = lastDepthScale) {
		lastX = x;
		lastDepthScale = depthScale;
		for (const pair of pairs) draw(pair, x, depthScale);
	}

	function applyLight() {
		const strength =
			byTime(timeCurves.shadowStrength) * byWeather(weatherCurves.sunlight) * (1 - darkness());
		document.documentElement.style.setProperty("--shadow-strength", strength);
		// No sun to cast them: hide the canvases and skip drawing.
		for (const pair of pairs) pair.canvas.hidden = strength < 0.01;
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
	for (const pair of pairs) {
		for (const image of [pair.ridgeShape, pair.landShape]) {
			image.addEventListener("load", () => {
				measure();
				place();
			});
		}
	}
}

function parallax() {
	const layers = document.querySelectorAll("[data-z_index]");
	const christ = document.querySelectorAll(".christ"); // still and moving
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
			(layer.classList.contains("christ") ? christDepthFactor : 1),
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
		for (const figure of christ) {
			figure.style.setProperty("--christ-rotate-y", `${horizontalProgress * 0.6}deg`);
			figure.style.setProperty("--christ-edge-offset", `${horizontalProgress * -0.4}px`);
		}
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
		hour,
		timeValue,
		weatherIntensity,
		weatherValue,
		parallax,
		parallaxSmoothing,
		smoothingValue,
	} = form.elements;

	function showCurrentValues() {
		hour.value = sceneSettings.hour;
		timeValue.value = `${clockTime(sceneSettings.hour)}, ${gospelHour(sceneSettings.hour).toLowerCase()}`;
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
		// Changes only the values that differ: rebuilding the whole list each
		// second made scrolling the panel stall in Chrome.
		for (const [name, value] of rows) {
			let description = detailValues.get(name);
			if (!description) {
				const term = document.createElement("dt");
				description = document.createElement("dd");
				term.textContent = name;
				details.append(term, description);
				detailValues.set(name, description);
			}
			if (description.textContent !== value) description.textContent = value;
		}
	}
	const detailValues = new Map();

	// The panel drops from the gear without covering the rest of the page
	// (a non-modal dialog). The gear (an x while open), a click anywhere else
	// or Escape closes it. It stops
	// above the caption so the caption stays readable.
	let detailsTimer;
	button.addEventListener("click", () => {
		if (dialog.open) {
			dialog.close();
			return;
		}
		showCurrentValues();
		showDetails();
		dialog.show();
		button.setAttribute("aria-expanded", "true");
		const caption = document.querySelector(".caption");
		dialog.style.maxHeight = `${caption.getBoundingClientRect().top - dialog.getBoundingClientRect().top - 12}px`;
		framesThisSecond = 0;
		requestAnimationFrame(countFrames);
		detailsTimer = setInterval(() => {
			framesPerSecond = framesThisSecond;
			framesThisSecond = 0;
			showDetails();
		}, 1000);
	});

	dialog.addEventListener("close", () => {
		clearInterval(detailsTimer);
		button.setAttribute("aria-expanded", "false");
	});

	document.addEventListener("keydown", (event) => {
		if (event.key === "Escape" && dialog.open) {
			dialog.close();
			button.focus();
		}
	});
	document.addEventListener("pointerdown", (event) => {
		if (dialog.open && !dialog.contains(event.target) && !button.contains(event.target)) {
			dialog.close();
		}
	});

	// Quality: Auto, or a level that sticks. The scene is built for its level
	// (images, stars, what moves), so a change reloads it. Either way any
	// earlier step-down is forgotten.
	try {
		form.elements.quality.value = localStorage.getItem("quality") ?? "auto";
	} catch {
		form.elements.quality.value = "auto";
	}
	for (const choice of form.elements.quality) {
		choice.addEventListener("change", () => {
			try {
				if (choice.value === "auto") localStorage.removeItem("quality");
				else localStorage.setItem("quality", choice.value);
				localStorage.removeItem("loweredQuality");
			} catch {}
			location.reload();
		});
	}

	form.addEventListener("input", (event) => {
		// Setting the time or weather by hand pauses the clock, so it stays.
		if (event.target === hour || event.target === weatherIntensity) {
			document.dispatchEvent(new Event("pauseclock"));
		}
		sceneSettings.hour = Number(hour.value);
		sceneSettings.weatherIntensity = Number(weatherIntensity.value);
		weatherLean = sceneSettings.weatherIntensity - alongCurve(hourCurves.weather, sceneSettings.hour);
		sceneSettings.parallax = parallax.checked;
		sceneSettings.parallaxSmoothing = Number(parallaxSmoothing.value);
		saveSettings();
		showCurrentValues();
	});
}

// The day of the Crucifixion, in order. hour is on the scene's clock;
// "about" marks times the scriptures don't give exactly. Latter-day
// scriptures are listed before the Bible.
const timeline = [
	{
		hour: 6,
		about: true,
		title: "Bound and led to Pilate",
		text: "As soon as it was day, the chief priests held a council, bound Jesus and delivered him to Pontius Pilate.",
		references: "Mark 15:1; Luke 22:66; John 18:28",
	},
	{
		hour: 6.5,
		about: true,
		title: "Sent to Herod",
		text: "Pilate found no fault in him and sent him to Herod. Jesus answered him nothing, and Herod mocked him and sent him back in a gorgeous robe.",
		references: "Mosiah 14:7; Luke 23:4-12",
	},
	{
		hour: 7,
		about: true,
		title: "Barabbas is released",
		text: "The crowd asked for Barabbas and cried, \"Let him be crucified.\" Pilate washed his hands before them.",
		references: "Matthew 27:15-26",
	},
	{
		hour: 7.5,
		about: true,
		title: "Scourged and crowned with thorns",
		text: "Soldiers scourged him, clothed him in purple, pressed a crown of thorns on his head and mocked him as a king.",
		references: "1 Nephi 19:9; Mark 15:15-20; John 19:1-3",
	},
	{
		hour: 8,
		about: true,
		title: "\"Behold the man!\"",
		text: "Pilate brought him out wearing the crown of thorns and the purple robe, then delivered him to be crucified.",
		references: "John 19:4-16",
	},
	{
		hour: 8.5,
		about: true,
		title: "The road to Golgotha",
		text: "Bearing his cross, he went out to Golgotha. Simon of Cyrene was made to carry it, and Jesus told the women weeping for him, \"Weep not for me.\"",
		references: "Mark 15:20-22; Luke 23:26-31; John 19:17",
	},
	{
		hour: 9,
		title: "Crucified at the third hour",
		text: "He was nailed to the cross between two thieves, and prayed, \"Father, forgive them; for they know not what they do.\"",
		references: "1 Nephi 11:33; 3 Nephi 27:14; Mark 15:25-28; Luke 23:33-34",
	},
	{
		hour: 9.5,
		about: true,
		title: "His garments divided",
		text: "Soldiers cast lots for his coat. Above him hung Pilate's title in Hebrew, Greek and Latin: Jesus of Nazareth the King of the Jews.",
		references: "Psalm 22:18; John 19:19-24",
	},
	{
		hour: 10.25,
		about: true,
		title: "Mocked on the cross",
		text: "Passersby, chief priests and scribes railed on him: \"He saved others; himself he cannot save.\"",
		references: "Mark 15:29-32; Luke 23:35-37",
	},
	{
		hour: 10.75,
		about: true,
		title: "\"To day shalt thou be with me in paradise\"",
		text: "One of the thieves asked Jesus to remember him. Jesus promised he would be with him that day in paradise, the world of spirits.",
		references: "Alma 40:11-12; D&C 138:18-19; Luke 23:39-43",
	},
	{
		hour: 11.25,
		about: true,
		title: "\"Behold thy mother!\"",
		text: "Seeing his mother and the disciple whom he loved by the cross, he gave her into that disciple's care.",
		references: "John 19:25-27",
	},
	{
		hour: 12,
		title: "Darkness at the sixth hour",
		text: "From noon there was darkness over the whole land until the ninth hour, and the sun was darkened.",
		references: "Mark 15:33; Luke 23:44-45",
	},
	{
		hour: 14.75,
		about: true,
		title: "\"Why hast thou forsaken me?\"",
		text: "About the ninth hour he cried with a loud voice, \"My God, my God, why hast thou forsaken me?\" He trod the winepress alone.",
		references: "D&C 76:107; D&C 133:50; Matthew 27:46; Mark 15:34",
	},
	{
		hour: 14.92,
		about: true,
		title: "\"It is finished\"",
		text: "After a sponge of vinegar he said, \"It is finished,\" and, \"Father, into thy hands I commend my spirit,\" and gave up the ghost.",
		references: "D&C 19:18-19; Luke 23:46; John 19:28-30",
	},
	{
		hour: 15,
		title: "The earth quakes, the veil is torn",
		text: "The temple veil tore from top to bottom and the earth shook. The centurion said, \"Truly this was the Son of God.\" In the Americas, storms, earthquakes and three days of darkness marked his death, as Samuel the Lamanite had prophesied.",
		references: "Helaman 14:20-27; 3 Nephi 8:5-23; Matthew 27:51-54",
	},
];

// The time in the top-left corner and the caption at the bottom, which
// says what is happening, steps between events with its arrows, and opens a
// list of the whole day upward. Moving to an event eases the clock to its
// time, with fresh weather to suit the hour.
function timelineClock() {
	const clock = document.querySelector(".clock-time");
	const caption = document.querySelector(".caption");
	const toggle = document.getElementById("timeline-button");
	const list = document.getElementById("timeline");
	const [previous, next] = caption.querySelectorAll(".caption-step");
	const title = caption.querySelector(".caption-title");
	const text = caption.querySelector(".caption-text");

	function element(tag, className, text) {
		const created = document.createElement(tag);
		created.className = className;
		created.textContent = text;
		return created;
	}

	// "10:47 AM" with the digits in their own span, so they can be drawn a
	// touch heavier to match Georgia's letters (see .time-digits).
	function timeParts(hour) {
		const [digits, period] = clockTime(hour).split(" ");
		return [element("span", "time-digits", digits), ` ${period}`];
	}

	// The latest event at or before an hour.
	function eventIndex(hour) {
		return timeline.findLastIndex((event) => event.hour <= hour + 0.001);
	}

	const choices = timeline.map((event) => {
		const choice = document.createElement("button");
		choice.type = "button";
		choice.append(
			element("span", "timeline-event-time", `${event.about ? "About " : ""}${clockTime(event.hour)}`),
			element("strong", "timeline-event-title", event.title),
			element("span", "timeline-event-text", event.text),
			element("cite", "timeline-event-references", event.references),
		);
		// Picking one closes the list; the caption shows that event for a few
		// seconds before folding, like any other.
		choice.addEventListener("click", () => {
			goToHour(event.hour);
			setOpen(false, { foldNow: false });
		});
		const item = document.createElement("li");
		item.append(choice);
		return item;
	});
	list.querySelector(".timeline-events").replaceChildren(...choices);

	// Where the clock is heading while it eases, so quick arrow presses
	// keep stepping from there.
	let heading = null;

	function showTime() {
		const hour = sceneSettings.hour;
		clock.replaceChildren(...timeParts(hour));
		const index = eventIndex(hour);
		choices.forEach((item, i) => {
			if (i === index) item.firstChild.setAttribute("aria-current", "true");
			else item.firstChild.removeAttribute("aria-current");
		});
		showCaption(timeline[index]);
		const target = eventIndex(heading ?? hour);
		previous.disabled = target === 0;
		// At the last event (3 PM) the next arrow starts the day over.
		const last = target === timeline.length - 1;
		next.toggleAttribute("data-restart", last);
		next.setAttribute("aria-label", last ? "Start the day again" : "Next event");
	}
	// The caption fades between events: "9:00 AM • Crucified at the third
	// hour", then what happened.
	let captioned = null;
	let captionTimer;
	function showCaption(event) {
		if (event === captioned) return;
		captioned = event;
		caption.classList.add("is-changing");
		clearTimeout(captionTimer);
		captionTimer = setTimeout(() => {
			resizeSmoothly(() => {
				const time = element("span", "caption-time", "");
				time.append(...timeParts(event.hour), " • ");
				title.replaceChildren(time, event.title);
				text.textContent = event.text;
				caption.classList.remove("is-changing");
				caption.classList.remove("is-folded");
			});
			holding = true;
			foldLater(3.5);
		}, captioned && title.textContent ? 400 : 0);
	}

	// Whenever the caption changes height (a new event, folding, opening), it
	// glides from the old height to the new one instead of snapping: measure,
	// make the change, measure again, then animate between the two.
	let resizing = null;
	function resizeSmoothly(change) {
		const from = toggle.getBoundingClientRect().height;
		resizing?.cancel();
		change();
		const to = toggle.getBoundingClientRect().height;
		if (reducedMotion || Math.abs(to - from) < 1) return;
		resizing = toggle.animate(
			[
				{ height: `${from}px`, overflow: "hidden" },
				{ height: `${to}px`, overflow: "hidden" },
			],
			{ duration: 350, easing: "cubic-bezier(0.2, 0.7, 0.3, 1)" },
		);
	}

	// The caption folds to one line (ending "...") a few seconds after each
	// event appears, so it covers less of the scene. With a mouse it opens while
	// the pointer is over it; on a touchscreen a tap opens it for a while. A
	// click or tap anywhere else folds it straight away. A new event's first
	// seconds always show in full, whatever the pointer does.
	let foldTimer;
	let hovered = false;
	let holding = false;
	function setFolded(folded) {
		if (folded === caption.classList.contains("is-folded") || (folded && holding)) return;
		clearTimeout(foldTimer);
		resizeSmoothly(() => caption.classList.toggle("is-folded", folded));
	}
	// Not while the pointer is over it or the list of events is open, and the
	// first caption's seconds start once the loading screen goes.
	function foldLater(seconds) {
		clearTimeout(foldTimer);
		if (document.querySelector("#loading:not(.is-done)")) {
			foldTimer = setTimeout(() => foldLater(seconds), 250);
			return;
		}
		foldTimer = setTimeout(() => {
			holding = false;
			if (!hovered && list.hidden) setFolded(true);
		}, seconds * 1000);
	}
	// Only the box itself opens on hover, not the arrows beside it.
	toggle.addEventListener("pointerenter", (event) => {
		if (event.pointerType !== "mouse") return;
		hovered = true;
		setFolded(false);
	});
	toggle.addEventListener("pointerleave", (event) => {
		if (event.pointerType !== "mouse") return;
		hovered = false;
		if (!holding && list.hidden) setFolded(true); // straight away, like opening
	});

	showTime();
	document.addEventListener("scenesettings", showTime);

	// The clock runs on its own a minute at a time (clockSpeed minutes a
	// second), with the weather following the hour, until 3 PM or a pause.
	const playButton = document.querySelector(".clock-play");
	const dayStart = timeline[0].hour;
	const dayEnd = timeline.at(-1).hour;
	let playing = sceneSettings.clockSpeed > 0;
	let settledAt = 0; // the clock waits until then (see goToHour)
	// Stopped because the day reached 3 PM (not paused by hand): going back to
	// an earlier event starts it again.
	let dayOver = false;

	// At 3 PM it becomes a restart button.
	function showPlaying() {
		const atEnd = sceneSettings.hour >= dayEnd - 0.001;
		playButton.toggleAttribute("data-paused", !playing);
		playButton.toggleAttribute("data-restart", atEnd);
		playButton.setAttribute("aria-label", atEnd ? "Start the day again" : playing ? "Pause time" : "Play time");
	}
	showPlaying();
	document.addEventListener("scenesettings", showPlaying);

	function startOver() {
		playing = true;
		dayOver = false;
		goToHour(dayStart);
		showPlaying();
	}

	document.addEventListener("pauseclock", () => {
		playing = false;
		dayOver = false;
		showPlaying();
	});

	// Play returns the weather to its hour's usual (it may have been set by
	// hand while paused); at 3 PM it starts the day over.
	playButton.addEventListener("click", () => {
		if (playButton.hasAttribute("data-restart")) return startOver();
		playing = !playing;
		dayOver = false;
		if (playing) goToHour(sceneSettings.hour);
		showPlaying();
	});

	setInterval(() => {
		// Not until the scene is on screen (after loading) and everything has
		// settled after a jump: the sun glides into place for 1.2s after the
		// light stops changing.
		const shown = "sceneShown" in document.documentElement.dataset;
		if (!playing || document.hidden || heading !== null || !shown || performance.now() < settledAt) return;
		sceneSettings.hour = Math.min(dayEnd, Math.round(sceneSettings.hour * 60 + 1) / 60);
		sceneSettings.weatherIntensity = weatherForHour(sceneSettings.hour);
		document.dispatchEvent(new Event("scenesettings"));
		if (sceneSettings.hour >= dayEnd) {
			playing = false;
			dayOver = true;
			showPlaying();
		}
	}, 1000 / (sceneSettings.clockSpeed || 1.5));

	// The arrows go a whole event back or forward, however far the clock has
	// run into the current one.
	function step(direction) {
		const to = timeline[eventIndex(heading ?? sceneSettings.hour) + direction];
		if (to) goToHour(to.hour);
	}
	previous.addEventListener("click", () => step(-1));
	next.addEventListener("click", () => (next.hasAttribute("data-restart") ? startOver() : step(1)));

	// The list opens upward from the caption, as far as just under the time
	// at the top, and opens at the current event.
	function setOpen(open, { foldNow = true } = {}) {
		toggle.setAttribute("aria-expanded", open);
		list.hidden = !open;
		// The caption stays open while the list is.
		if (!open) {
			if (foldNow && !hovered) setFolded(true);
			else foldLater(3.5);
			return;
		}
		setFolded(false);
		const above = caption.getBoundingClientRect().top - clock.getBoundingClientRect().bottom - 30;
		list.style.maxHeight = `${above}px`;
		const current = list.querySelector("[aria-current]");
		list.scrollTop = current.offsetTop - (list.clientHeight - current.offsetHeight) / 2;
	}
	// Folded (a tap), it opens the caption; open, it opens the list of events.
	toggle.addEventListener("click", () => {
		if (caption.classList.contains("is-folded")) {
			setFolded(false);
			foldLater(8);
		} else {
			setOpen(list.hidden);
		}
	});
	// A click anywhere else, or Escape, closes the list and folds the caption.
	document.addEventListener("pointerdown", (event) => {
		if (caption.contains(event.target)) return;
		if (list.hidden) setFolded(true);
		else setOpen(false);
	});
	document.addEventListener("keydown", (event) => {
		if (event.key === "Escape" && !list.hidden) {
			setOpen(false);
			toggle.focus();
		}
	});

	let easing = 0;
	let lastSceneUpdate = 0;
	function goToHour(hour) {
		const from = { hour: sceneSettings.hour, weather: sceneSettings.weatherIntensity };
		weatherLean = 0; // the event's own weather: its hour's usual
		const to = { hour, weather: weatherForHour(hour) };
		if (dayOver && hour < dayEnd) {
			playing = true;
			dayOver = false;
			showPlaying();
		}
		const seconds = reducedMotion ? 0 : 1.6;
		const start = performance.now();
		heading = hour;
		document.documentElement.dataset.jumping = "";
		cancelAnimationFrame(easing);
		function frame(now) {
			const along = seconds ? Math.min((now - start) / 1000 / seconds, 1) : 1;
			const eased = along < 0.5 ? 2 * along ** 2 : 1 - (2 - 2 * along) ** 2 / 2;
			sceneSettings.hour = from.hour + (to.hour - from.hour) * eased;
			sceneSettings.weatherIntensity = from.weather + (to.weather - from.weather) * eased;
			if (along === 1) {
				heading = null;
				// After a jump in time, a moment for everything to settle.
				if (Math.abs(to.hour - from.hour) > 0.02) settledAt = performance.now() + 300;
			}
			// The clock moves every frame; the scene's light (which repaints
			// the sky) changes 15 times a second, which still looks smooth.
			if (along === 1 || now - lastSceneUpdate >= 66) {
				lastSceneUpdate = now;
				document.dispatchEvent(new Event("scenesettings"));
			} else {
				showTime();
			}
			if (along < 1) {
				easing = requestAnimationFrame(frame);
			} else {
				// The sun's usual glide again, once its last step has started.
				requestAnimationFrame(() => {
					if (heading === null) delete document.documentElement.dataset.jumping;
				});
			}
		}
		easing = requestAnimationFrame(frame);
	}
}

// Markers on the figure and in the scene (teachings.js). Each opens a card of
// what that part teaches, beside the marker; on phones it opens across the
// screen instead (the CSS places it there). Clicking the marker again closes
// it. The markers stay faint until the mouse comes near, brightening as it
// gets closer; hovering one lights it up and shows its title.
function teachingMarkers() {
	const card = document.getElementById("teaching");
	const picture = card.querySelector(".teaching-picture");
	const title = card.querySelector(".teaching-title");
	const text = card.querySelector(".teaching-text");
	const scriptures = card.querySelector(".teaching-scriptures");
	const layers = {
		figure: document.querySelector(".christ-markers"),
		city: document.querySelector(".scene-markers--city"),
		olives: document.querySelector(".scene-markers--olives"),
		sky: document.querySelector(".scene-markers--sky"),
	};
	const phone = matchMedia("(max-width: 600px)");
	let openFor = null;
	let openAtPress = false;

	for (const teaching of teachings) {
		const marker = document.createElement("button");
		marker.type = "button";
		marker.className = "marker";
		marker.setAttribute("aria-label", teaching.title);
		const label = document.createElement("span");
		label.className = "marker-label";
		label.textContent = teaching.title;
		label.setAttribute("aria-hidden", "true");
		marker.append(label);
		const { figure, layer = "figure", style } = teaching.at;
		if (figure) {
			marker.style.left = `${(figure[0] / 1186) * 100}%`;
			marker.style.top = `${(figure[1] / 2337) * 100}%`;
		} else {
			marker.style.cssText = style;
		}
		// Was its card open when the press began? (A press outside the card
		// closes it before the click arrives.)
		marker.addEventListener("pointerdown", () => {
			openAtPress = openFor === marker && card.matches(":popover-open");
		});
		marker.addEventListener("click", () => {
			const again = openAtPress || (openFor === marker && card.matches(":popover-open"));
			openAtPress = false;
			if (again) {
				if (card.matches(":popover-open")) card.hidePopover();
				return;
			}
			show(teaching, marker);
		});
		layers[layer].append(marker);
	}

	card.addEventListener("toggle", (event) => {
		if (event.newState === "closed") openFor?.removeAttribute("aria-expanded");
	});

	function show(teaching, marker) {
		openFor?.removeAttribute("aria-expanded");
		picture.hidden = !teaching.picture;
		if (teaching.picture) {
			picture.querySelector("img").src = teaching.picture.src;
			picture.querySelector("img").alt = teaching.picture.alt;
			picture.querySelector("figcaption").textContent = teaching.picture.caption;
		}
		title.textContent = teaching.title;
		text.textContent = teaching.text;
		scriptures.replaceChildren(
			...teaching.scriptures.map(([reference, words]) => {
				const quote = document.createElement("blockquote");
				quote.className = "teaching-scripture";
				const cite = document.createElement("cite");
				cite.textContent = reference;
				quote.append(`\u201c${words}\u201d`, cite);
				return quote;
			}),
		);
		card.classList.toggle("teaching--wide", Boolean(teaching.wide));
		openFor = marker;
		marker.setAttribute("aria-expanded", "true");
		if (!card.matches(":popover-open")) card.showPopover();
		card.querySelector(".teaching-body").scrollTop = 0;
		place(marker);
	}

	// Beside the marker (right if it fits, else left), level with it but
	// kept on screen, with its pointer at the marker's height. It never
	// reaches down over the caption, even folded: it stops 12px above where
	// the folded box's top would be (the arrows sit centred on that box).
	function place(marker) {
		const edge = 20;
		const captionBox = document.querySelector(".caption-content").getBoundingClientRect();
		const arrow = document.querySelector(".caption-step");
		const foldedHeight = arrow.offsetHeight + 2 * parseFloat(getComputedStyle(arrow).marginBottom);
		const bottom = captionBox.bottom - foldedHeight - 12;
		if (phone.matches) {
			card.style.left = card.style.top = "";
			delete card.dataset.pointer;
			card.style.maxHeight = "";
			card.style.maxHeight = `${bottom - card.getBoundingClientRect().top}px`;
			return;
		}
		card.style.maxHeight = `${bottom - edge}px`;
		const gap = 14;
		const at = marker.getBoundingClientRect();
		const size = card.getBoundingClientRect();
		const middle = at.top + at.height / 2;
		const onRight = at.right + gap + size.width <= innerWidth - edge;
		const onLeft = at.left - gap - size.width >= edge;
		const left = onRight ? at.right + gap : at.left - gap - size.width;
		const top = clamp(middle - size.height / 2, edge, bottom - size.height);
		card.style.left = `${clamp(left, edge, innerWidth - edge - size.width)}px`;
		card.style.top = `${top}px`;
		// No pointer when the window is too narrow for it to sit beside it.
		if (onRight || onLeft) card.dataset.pointer = onRight ? "left" : "right";
		else delete card.dataset.pointer;
		card.style.setProperty("--pointer-y", `${clamp(middle - top, 22, size.height - 22)}px`);
	}

	// --near: 1 with the mouse on a marker, fading to 0 about 150px away
	// (measured at most once a frame).
	const markers = [...document.querySelectorAll(".marker")];
	let pointer = null;
	let measuring = 0;
	document.addEventListener(
		"pointermove",
		(event) => {
			if (event.pointerType !== "mouse") return;
			pointer = event;
			measuring ||= requestAnimationFrame(() => {
				measuring = 0;
				for (const marker of markers) {
					const box = marker.getBoundingClientRect();
					const distance = Math.hypot(
						pointer.clientX - (box.left + box.width / 2),
						pointer.clientY - (box.top + box.height / 2),
					);
					marker.style.setProperty("--near", clamp(1 - (distance - 20) / 130, 0, 1).toFixed(2));
				}
			});
		},
		{ passive: true },
	);
}

// The sun glides between positions as the clock runs (see .sun), but not
// while the page can't be seen: a page loading in a hidden tab hasn't drawn
// the sun yet, and gliding then starts it from a corner. So the glide is off
// while hidden and comes back two frames after the page is shown.
function sunGlide() {
	const root = document.documentElement;
	function update() {
		delete root.dataset.sceneShown;
		if (document.hidden) return;
		requestAnimationFrame(() => requestAnimationFrame(() => (root.dataset.sceneShown = "")));
	}
	update();
	document.addEventListener("visibilitychange", update);
}
