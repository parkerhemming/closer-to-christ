function createStars(stars) {
	const sky = document.getElementById("sky");
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
	const sky = document.getElementById("sky");
	const reducedMotion = window.matchMedia(
		"(prefers-reduced-motion: reduce)",
	).matches;

	if (reducedMotion) return;

	function randomBetween(minimum, maximum) {
		return minimum + Math.random() * (maximum - minimum);
	}

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
		const distanceRoll = Math.random();
		const distance =
			distanceRoll < 0.42
				? {
					width: [42, 78],
					thickness: [0.65, 1.05],
					duration: [1450, 2350],
					travel: [28, 48],
					opacity: [0.42, 0.66],
					blur: [0.45, 0.8],
					head: [1.4, 2.1],
				}
				: distanceRoll < 0.82
					? {
						width: [76, 132],
						thickness: [1, 1.75],
						duration: [920, 1650],
						travel: [40, 66],
						opacity: [0.62, 0.86],
						blur: [0.25, 0.55],
						head: [1.9, 2.8],
					}
					: {
							width: [118, 205],
							thickness: [1.6, 2.7],
							duration: [580, 1120],
							travel: [55, 88],
							opacity: [0.82, 1],
							blur: [0.08, 0.3],
							head: [2.6, 4.2],
						};
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

		shootingStar.className = "shooting-star";
		shootingStar.setAttribute("aria-hidden", "true");
		shootingStar.style.setProperty("--shooting-start-x", `${startX}%`);
		shootingStar.style.setProperty("--shooting-start-y", `${startY}%`);
		shootingStar.style.setProperty("--shooting-angle", `${angle}deg`);
		const travel = randomBetween(...distance.travel);
		shootingStar.style.setProperty(
			"--shooting-distance",
			`${travel}vw`,
		);
		shootingStar.style.setProperty(
			"--shooting-mid-distance",
			`${travel * 0.72}vw`,
		);
		shootingStar.style.setProperty(
			"--shooting-duration",
			`${randomBetween(...distance.duration)}ms`,
		);
		shootingStar.style.setProperty(
			"--shooting-tail-width",
			`${randomBetween(...distance.width)}px`,
		);
		shootingStar.style.setProperty(
			"--shooting-thickness",
			`${randomBetween(...distance.thickness)}px`,
		);
		shootingStar.style.setProperty(
			"--shooting-opacity",
			randomBetween(...distance.opacity),
		);
		shootingStar.style.setProperty(
			"--shooting-blur",
			`${randomBetween(...distance.blur)}px`,
		);
		shootingStar.style.setProperty(
			"--shooting-head-size",
			`${randomBetween(...distance.head)}px`,
		);

		if (Math.random() < 0.3) {
			shootingStar.classList.add("shooting-star--stretch");
		}

		shootingStar.addEventListener(
			"animationend",
			() => shootingStar.remove(),
			{
				once: true,
			},
		);
		sky.appendChild(shootingStar);
		scheduleShootingStar();
	}

	scheduleShootingStar(true);
}

function createStorm() {
	const reducedMotion = window.matchMedia(
		"(prefers-reduced-motion: reduce)",
	).matches;
	const lightningLayers = [
		document.getElementById("lightning-back"),
		document.getElementById("lightning-middle"),
		document.getElementById("lightning-front"),
	];
	const svgNamespace = "http://www.w3.org/2000/svg";

	function randomBetween(minimum, maximum) {
		return minimum + Math.random() * (maximum - minimum);
	}

	function startRainEmitter(elementId, settings) {
		const rainLayer = document.getElementById(elementId);

		function createRainDrop(initialDrop = false) {
			const drop = document.createElement("span");
			const duration = randomBetween(
				settings.minimumDuration,
				settings.maximumDuration,
			);
			drop.className = "rain-drop";
			drop.style.setProperty("--rain-x", `${randomBetween(-8, 104)}%`);
			drop.style.setProperty(
				"--rain-length",
				`${randomBetween(settings.minimumLength, settings.maximumLength)}px`,
			);
			drop.style.setProperty(
				"--rain-duration",
				`${duration}ms`,
			);
			if (initialDrop) {
				drop.style.animationDelay = `${-randomBetween(0, duration * 0.85)}ms`;
			}
			drop.style.setProperty(
				"--rain-opacity",
				randomBetween(settings.minimumOpacity, settings.maximumOpacity),
			);
			drop.style.setProperty(
				"--rain-drift",
				`${randomBetween(settings.minimumDrift, settings.maximumDrift)}px`,
			);
			drop.style.setProperty(
				"--rain-width",
				`${randomBetween(settings.minimumWidth, settings.maximumWidth)}px`,
			);
			drop.addEventListener("animationend", () => drop.remove(), {
				once: true,
			});
			rainLayer.appendChild(drop);
		}

		function scheduleDrop() {
			const burstSize =
				Math.random() < settings.burstChance
					? Math.floor(randomBetween(2, settings.maximumBurst + 1))
					: 1;

			for (let i = 0; i < burstSize; i++) {
				window.setTimeout(createRainDrop, randomBetween(0, 90));
			}

			const pause =
				Math.random() < settings.pauseChance
					? randomBetween(
							settings.minimumPause,
							settings.maximumPause,
						)
					: 0;
			window.setTimeout(
				scheduleDrop,
				randomBetween(settings.minimumGap, settings.maximumGap) + pause,
			);
		}

		for (let i = 0; i < settings.initialDrops; i++) {
			createRainDrop(true);
		}
		scheduleDrop();
	}

	function clampLightningX(value) {
		return Math.max(10, Math.min(90, value));
	}

	function createBoltPath() {
		const points = [{ x: randomBetween(42, 58), y: -4 }];
		let y = -4;

		while (y < 104) {
			y += randomBetween(7, 13);
			points.push({
				x: clampLightningX(points.at(-1).x + randomBetween(-14, 14)),
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
			`${Math.max(2, Math.min(84, strikeX + randomBetween(-9, 3)))}%`,
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
				branchX = clampLightningX(
					branchX +
						direction * randomBetween(7, 16) +
						randomBetween(-3, 3),
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
		window.setTimeout(
			triggerLightning,
			minimumDelay + Math.random() * delayRange,
		);
	}

	if (reducedMotion) return;

	startRainEmitter("rain-back", {
		minimumLength: 8,
		maximumLength: 20,
		minimumDuration: 720,
		maximumDuration: 1120,
		minimumOpacity: 0.12,
		maximumOpacity: 0.34,
		minimumDrift: 50,
		maximumDrift: 105,
		minimumWidth: 0.28,
		maximumWidth: 0.62,
		minimumGap: 14,
		maximumGap: 58,
		burstChance: 0.38,
		maximumBurst: 5,
		pauseChance: 0.04,
		minimumPause: 250,
		maximumPause: 700,
		initialDrops: 16,
	});
	startRainEmitter("rain-front", {
		minimumLength: 18,
		maximumLength: 44,
		minimumDuration: 430,
		maximumDuration: 760,
		minimumOpacity: 0.24,
		maximumOpacity: 0.62,
		minimumDrift: 90,
		maximumDrift: 180,
		minimumWidth: 0.42,
		maximumWidth: 0.88,
		minimumGap: 30,
		maximumGap: 105,
		burstChance: 0.3,
		maximumBurst: 4,
		pauseChance: 0.06,
		minimumPause: 350,
		maximumPause: 950,
		initialDrops: 6,
	});
	scheduleLightning(true);
}

function createCityLights() {
	const reducedMotion = window.matchMedia(
		"(prefers-reduced-motion: reduce)",
	).matches;
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

	function randomBetween(minimum, maximum) {
		return minimum + Math.random() * (maximum - minimum);
	}

	const shuffled = [...candidates].sort(() => Math.random() - 0.5).slice(0, 20);
	const lights = shuffled.map(([x, y, width, height], index) => {
		const light = document.createElement("span");
		light.className = "city-flicker-light";
		light.style.setProperty("--flicker-x", `${(x / 4096) * 100}%`);
		light.style.setProperty("--flicker-y", `${(y / 2048) * 100}%`);
		light.style.setProperty("--flicker-width", `${(width / 4096) * 100}%`);
		light.style.setProperty("--flicker-height", `${(height / 2048) * 100}%`);
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

function parallax() {
	const layers = document.querySelectorAll("[data-z_index]");
	const christ = document.getElementById("christ");
	const isTouchDevice = navigator.maxTouchPoints > 0;
	const depthScale = isTouchDevice ? 0.00044 : 0.0009;
	const christDepthFactor = 0.78;
	const mobileHorizontalStrength = 70;
	const mobileVerticalStrength = 50;
	const smoothing = 0.075;
	let targetX = 0;
	let targetY = 0;
	let currentX = 0;
	let currentY = 0;
	let animationFrame = 0;
	let horizontalRange = isTouchDevice
		? 24 * mobileHorizontalStrength
		: Math.max(window.innerWidth / 2, 1);
	const layerSettings = [...layers].map((layer) => ({
		layer,
		depth:
			Number(layer.dataset.z_index) *
			(layer === christ ? depthScale * christDepthFactor : depthScale),
	}));

	function moveLayers(x, y) {
		for (const { layer, depth } of layerSettings) {
			layer.style.translate = `${x * depth}px ${y * depth}px`;
		}

		const horizontalProgress = clamp(x / horizontalRange, -1, 1);

		christ.style.setProperty(
			"--christ-rotate-y",
			`${horizontalProgress * 1.25}deg`,
		);
		christ.style.setProperty(
			"--christ-edge-offset",
			`${horizontalProgress * -0.7}px`,
		);
	}

	function animateParallax() {
		animationFrame = 0;
		currentX += (targetX - currentX) * smoothing;
		currentY += (targetY - currentY) * smoothing;
		moveLayers(currentX, currentY);

		if (
			Math.abs(targetX - currentX) > 0.1 ||
			Math.abs(targetY - currentY) > 0.1
		) {
			requestParallaxFrame();
		}
	}

	function requestParallaxFrame() {
		if (!animationFrame) {
			animationFrame = requestAnimationFrame(animateParallax);
		}
	}

	if (!isTouchDevice) {
		document.addEventListener("mousemove", (event) => {
			targetX = event.clientX - window.innerWidth / 2;
			targetY = event.clientY - window.innerHeight / 2;
			requestParallaxFrame();
		});
	}

	let resizeTimer;
	window.addEventListener(
		"resize",
		() => {
			horizontalRange = isTouchDevice
				? 24 * mobileHorizontalStrength
				: Math.max(window.innerWidth / 2, 1);
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

	function clamp(value, minimum, maximum) {
		return Math.max(minimum, Math.min(maximum, value));
	}

	function moveToward(current, destination, maximumChange) {
		return (
			current +
			clamp(destination - current, -maximumChange, maximumChange)
		);
	}

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

		const nextTargetX =
			clamp(horizontalTilt, -24, 24) * mobileHorizontalStrength;
		const nextTargetY =
			clamp(verticalTilt, -18, 18) * mobileVerticalStrength;

		// Limit how quickly the target itself can move so re-entering a tilt
		// boundary remains smooth even if the sensor emits an unusual value.
		targetX = moveToward(targetX, nextTargetX, 90);
		targetY = moveToward(targetY, nextTargetY, 75);
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

	if (isTouchDevice && typeof DeviceOrientationEvent !== "undefined") {
		const motionTrigger = document.getElementById("motion-trigger");

		motionTrigger.addEventListener(
			"click",
			async () => {
				motionTrigger.remove();

				if (
					typeof DeviceOrientationEvent.requestPermission ===
					"function"
				) {
					await requestMotionPermission();
				} else {
					startMotion();
				}
			},
			{ once: true },
		);

		if (typeof DeviceOrientationEvent.requestPermission === "function") {
			// Safari resolves an existing decision without a user gesture. If the
			// decision is still pending, it throws and we reveal the start screen.
			requestMotionPermission().then((permission) => {
				if (permission === "prompt") motionTrigger.hidden = false;
			});
		} else {
			motionTrigger.hidden = false;
		}
	}
}
