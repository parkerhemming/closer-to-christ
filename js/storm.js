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
			const worker = new Worker("./js/workers/rain.js");
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
		// The weather may have calmed since this strike was scheduled; and
		// strikes in a hidden tab would only pile up (as shooting stars would).
		if (byWeather(weatherCurves.lightning) === 0 || document.hidden) {
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
		// On the clouds and the wash themselves, not their shared parent (see
		// applyTimeOfDay).
		setStyle(".storm-cloud", {
			"--cloud-amount": byWeather(weatherCurves.clouds),
			"--cloud-shade": byWeather(weatherCurves.cloudShade),
		});
		setStyle(".storm-tone", { "--gloom": byWeather(weatherCurves.gloom) });
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
