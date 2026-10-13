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
	// The speed button's multiple of clockSpeed: 1, 1.5, 2 or 5.
	clockSpeedMultiplier: 1,
	// 0 is a clear sky, 1 a full storm; 0.7 is the original storm.
	// Rain, lightning, clouds and wind all follow it (see weatherCurves).
	// null picks a random weather that follows the hour (see weatherForHour).
	weatherIntensity: null,
	// Whether the scene follows the mouse or phone tilt at all.
	parallax: true,
	// How softly the parallax follows the mouse or tilt: it covers about 63% of
	// the way in this many seconds, starting at once and slowing as it
	// arrives. 0 follows exactly.
	parallaxSmoothing: 0.2,
	// Whether the scene's sound is on (the speaker button by the gear).
	sound: false,
	// The loading screen stays up at least this long so its verse can be read.
	minimumLoadingSeconds: 4,
};

const reducedMotion = window.matchMedia(
	"(prefers-reduced-motion: reduce)",
).matches;

const savedSettingNames = [
	"parallax",
	"parallaxSmoothing",
	"clockSpeedMultiplier",
	"sound",
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
	rain: [
		[0, 0],
		[0.35, 0],
		[0.7, 1],
		[1, 14],
	],
	// Streak length: long streaks in heavy rain read as sheets of water.
	rainLength: [
		[0, 1],
		[0.7, 1],
		[1, 1.9],
	],
	// Streak brightness.
	rainBrightness: [
		[0, 1],
		[0.7, 1],
		[1, 1.25],
	],
	// How often lightning strikes: none until 0.55, 2.5x as often at 1.
	lightning: [
		[0, 0],
		[0.55, 0],
		[0.7, 1],
		[1, 2.5],
	],
	// Cloud opacity: faint wisps when clear, thin at partly cloudy, much
	// thicker than the original at 1.
	clouds: [
		[0, 0.08],
		[0.4, 0.38],
		[0.7, 1],
		[1, 1.7],
	],
	// Cloud brightness: light, fair-weather clouds when clear; dark at 1.
	cloudShade: [
		[0, 1.45],
		[0.4, 1.2],
		[0.7, 1],
		[1, 0.72],
	],
	// Wind: how fast the clouds drift and how far the rain slants.
	wind: [
		[0, 0.35],
		[0.7, 1],
		[1, 1.9],
	],
	// Direct sunlight getting through the clouds (it sets how strong the
	// ridges' shadows are).
	sunlight: [
		[0, 1],
		[0.5, 0.8],
		[0.7, 0.45],
		[1, 0.15],
	],
	// The dark storm wash over the whole scene (its opacity: the wash is
	// twice the original strength, so 0.5 is the original and 1 is double).
	gloom: [
		[0, 0],
		[0.4, 0.22],
		[0.7, 0.5],
		[1, 1],
	],
};

function byWeather(points) {
	return alongCurve(points, sceneSettings.weatherIntensity);
}

// How the clock sets the light and the weather, as [hour, value] points
// like weatherCurves.
const hourCurves = {
	// The daylight level the timeCurves read: 0 night, 1 full day. The sun is
	// rising at 6 and high by noon.
	daylight: [
		[6, 0.4],
		[7, 0.55],
		[9, 0.78],
		[11.5, 1],
		[15, 1],
	],
	// From noon "there was darkness over the whole land until the ninth hour"
	// (Mark 15:33) and "the sun was darkened" (Luke 23:45): an unnatural dimming
	// of the day, not night. It falls fast just before noon, so it's already
	// dark at 12, and deepens to its darkest at 3 PM. 0 is none; at 1 the
	// light reaches darkLight.
	darkness: [
		[6, 0],
		[11.75, 0],
		[12, 0.65],
		[15, 1],
	],
	// The usual weather: often stormy in the dim early morning (sometimes
	// clear enough for the stars) and in the darkness, calmer through the
	// bright morning, then building from 2:30 to the fiercest storm at 3 PM,
	// when he died and the earth quaked (past 1, so even a calm lean reaches
	// a full storm). weatherForHour adds the visit's random lean.
	weather: [
		[6, 0.55],
		[7.5, 0.45],
		[9, 0.3],
		[11.5, 0.25],
		[12, 0.7],
		[14.5, 0.8],
		[15, 1.2],
	],
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
	cityGlow: 0.9,
};

// A light's value for the hour, dimmed by the noon darkness.
function lightFor(name) {
	const value = byTime(timeCurves[name]);
	return name in darkLight
		? value + (darkLight[name] - value) * darkness()
		: value;
}

// How the light follows the daylight level, as [daylight, value] points.
// Every curve gives the original look at 0.3 (multipliers 1, tints 0), so
// 0.3 is exactly the original pre-dawn scene; sunrise (on the left horizon)
// is around 0.45.
const timeCurves = {
	// Brightness, colour and sunrise warmth of the land layers. At sunrise the
	// sun is behind the hills, so the land stays dim (backlit) a while longer.
	landLight: [
		[0, 0.6],
		[0.3, 1],
		[0.45, 1.12],
		[0.6, 1.7],
		[1, 2.3],
	],
	landSaturation: [
		[0, 0.8],
		[0.3, 1],
		[0.6, 1.4],
		[1, 1.6],
	],
	landWarmth: [
		[0, 0],
		[0.3, 0],
		[0.45, 0.35],
		[0.6, 0.15],
		[1, 0],
	],
	// Clouds: dark at night, glowing warm at sunrise, bright by day.
	cloudLight: [
		[0, 0.55],
		[0.3, 1],
		[0.45, 1.3],
		[0.6, 1.6],
		[1, 1.9],
	],
	cloudWarmth: [
		[0, 0],
		[0.3, 0],
		[0.42, 0.45],
		[0.6, 0.15],
		[1, 0],
	],
	// Stars (and shooting stars) fade as the sky lightens; they're still out
	// at 6 AM (0.4) and gone by about 7.
	starlight: [
		[0, 1],
		[0.3, 1],
		[0.4, 0.85],
		[0.5, 0.2],
		[0.6, 0],
		[1, 0],
	],
	// The city's window and lantern lights go out in daylight.
	cityGlow: [
		[0, 1],
		[0.42, 1],
		[0.55, 0.35],
		[0.68, 0],
		[1, 0],
	], // full until sunrise
	// The figure's brightness.
	figureLight: [
		[0, 0.75],
		[0.3, 1],
		[0.6, 1.12],
		[1, 1.18],
	],
	// The sun: hidden until after 0.32, rising from behind the left hills.
	sunOpacity: [
		[0, 0],
		[0.32, 0],
		[0.4, 1],
		[1, 1],
	],
	// How dark the ridges' cast shadows are: none before the sun is up,
	// strongest just after sunrise, a little softer through the day. Their
	// length and angle come from the sun's place (landShadows).
	shadowStrength: [
		[0, 0],
		[0.38, 0],
		[0.44, 0.8],
		[0.7, 0.65],
		[1, 0.55],
	],
	// Of screen height; the left hills' ridge is at about 0.7, so the sun is
	// half behind them at 0.45.
	sunHeight: [
		[0, 0.85],
		[0.35, 0.84],
		[0.45, 0.7],
		[0.55, 0.58],
		[0.7, 0.42],
		[1, 0.14],
	],
	sunLeft: [
		[0, 0.2],
		[0.45, 0.2],
		[1, 0.3],
	], // of screen width
};

// Sky colours at each time as [time, [r, g, b, a]]: the gradient from the
// horizon up, plus the sunrise glow low on the left. 0.3 is the original sky.
const skyColors = {
	horizon: [
		[0, [26, 37, 51, 1]],
		[0.3, [81, 85, 101, 1]],
		[0.45, [232, 164, 115, 1]],
		[0.6, [233, 201, 165, 1]],
		[1, [201, 224, 239, 1]],
	],
	low: [
		[0, [16, 28, 40, 1]],
		[0.3, [48, 59, 72, 1]],
		[0.45, [122, 112, 128, 1]],
		[0.6, [150, 174, 196, 1]],
		[1, [127, 177, 222, 1]],
	],
	middle: [
		[0, [11, 26, 38, 1]],
		[0.3, [23, 40, 52, 1]],
		[0.45, [76, 98, 122, 1]],
		[0.6, [110, 150, 190, 1]],
		[1, [88, 145, 205, 1]],
	],
	zenith: [
		[0, [5, 14, 22, 1]],
		[0.3, [9, 23, 32, 1]],
		[0.45, [42, 74, 102, 1]],
		[0.6, [79, 127, 174, 1]],
		[1, [61, 120, 184, 1]],
	],
	glowCore: [
		[0, [239, 174, 112, 0]],
		[0.3, [239, 174, 112, 0.38]],
		[0.45, [255, 190, 120, 0.75]],
		[0.6, [255, 228, 190, 0.4]],
		[1, [255, 250, 235, 0.15]],
	],
	glowMiddle: [
		[0, [166, 111, 98, 0]],
		[0.3, [166, 111, 98, 0.2]],
		[0.45, [240, 150, 110, 0.45]],
		[0.6, [250, 205, 170, 0.2]],
		[1, [255, 245, 230, 0.06]],
	],
	glowEdge: [
		[0, [58, 61, 76, 0]],
		[0.3, [58, 61, 76, 0.07]],
		[0.45, [180, 120, 120, 0.15]],
		[0.6, [200, 190, 200, 0.06]],
		[1, [240, 240, 240, 0]],
	],
};

function byTime(points) {
	return alongCurve(points, daylight());
}

// Sky colours dim toward darkLight.sky; the sunrise glows fade out.
function skyColor(points, glow = false) {
	const dark = darkness();
	return alongCurve(points, daylight()).map((value, i) =>
		i < 3
			? value + (darkLight.sky[i] - value) * dark
			: glow
				? value * (1 - dark)
				: value,
	);
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
	const ordinals = [
		"First",
		"Second",
		"Third",
		"Fourth",
		"Fifth",
		"Sixth",
		"Seventh",
		"Eighth",
		"Ninth",
	];
	return `${ordinals[clamp(Math.ceil(hour - 6 - 0.001), 1, 9) - 1]} hour`;
}

// Paints the sky's small canvas: the gradient from the horizon up, and the
// sunrise glow, an ellipse as wide and tall as the sky centred low on the
// left. Its colours glide between the clock's ticks.
const skyStops = [
	"horizon",
	"low",
	"middle",
	"zenith",
	"glowCore",
	"glowMiddle",
	"glowEdge",
];
const glideSky = glider((values) => {
	const [horizon, low, middle, zenith, glowCore, glowMiddle, glowEdge] =
		skyStops.map((_, i) => {
			const [r, g, b, a] = values.slice(i * 4, i * 4 + 4);
			return `rgba(${Math.round(r)}, ${Math.round(g)}, ${Math.round(b)}, ${a.toFixed(3)})`;
		});
	const canvas = document.querySelector(".sky-gradient");
	const context = canvas.getContext("2d");
	const { width, height } = canvas;
	const sky = context.createLinearGradient(0, height, 0, 0);
	sky.addColorStop(0, horizon);
	sky.addColorStop(0.2, low);
	sky.addColorStop(0.5, middle);
	sky.addColorStop(1, zenith);
	context.fillStyle = sky;
	context.fillRect(0, 0, width, height);

	context.save();
	context.translate(width * 0.2, height);
	context.scale(width, height);
	const glow = context.createRadialGradient(0, 0, 0, 0, 0, 1);
	glow.addColorStop(0, glowCore);
	glow.addColorStop(0.35, glowMiddle);
	glow.addColorStop(0.59, glowEdge);
	glow.addColorStop(0.75, glowEdge.replace(/[\d.]+\)$/, "0)")); // fades out
	context.fillStyle = glow;
	context.fillRect(-0.2, -1, 1, 1);
	context.restore();
});

function drawSky() {
	glideSky(
		skyStops.flatMap((name) =>
			skyColor(skyColors[name], name.startsWith("glow")),
		),
	);
}

// Sets the light for the clock's hour as CSS variables on the land, clouds,
// city lights, stars, sun and figure (the drawn layers in wind.js get it as a
// colour matrix, in swayLayer). The sky is painted.
function applyTimeOfDay() {
	drawSky();
	// Fully faded out, the stars and the city's lights are switched off, so
	// their layers don't take GPU memory and drawing through the day.
	const root = document.documentElement;
	root.toggleAttribute("data-no-stars", lightFor("starlight") < 0.005);
	root.toggleAttribute("data-no-city-lights", lightFor("cityGlow") < 0.005);
	// Each value goes on the elements that use it, not on <html>: a change
	// there reaches every element on the page, and Safari then redrew most of
	// the scene after every tick of the clock (frames of 50-100ms).
	setStyle(".scenery", {
		"--land-light": lightFor("landLight"),
		"--land-saturation": lightFor("landSaturation"),
		"--land-warmth": byTime(timeCurves.landWarmth),
	});
	// The lights' own opacity, not a variable: on their glowing (filtered)
	// group a variable change made Safari redraw it.
	setStyle(".city-lights", { opacity: lightFor("cityGlow") });
	setStyle(".city-flicker-plane", { "--city-glow": lightFor("cityGlow") });
	setStyle(".storm-cloud", {
		"--cloud-light": lightFor("cloudLight"),
		"--cloud-warmth": byTime(timeCurves.cloudWarmth),
	});
	setStyle("#sky .stars", { "--starlight": lightFor("starlight") });
	setStyle("#christ", { "--figure-light": lightFor("figureLight") });
	placeSun();
}

// The sun's place and brightness for the hour. As the clock runs, the CSS
// glides it between ticks; during a jump in time goToHour places it every
// frame, so it follows the jump's own easing.
function placeSun() {
	setStyle("#sky .sun", {
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
