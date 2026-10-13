function parallax() {
	const layers = document.querySelectorAll("[data-z_index]");
	const christDepthFactor = 0.78;
	const mobileHorizontalStrength = 70;
	const mobileVerticalStrength = 50;
	let targetX = 0;
	let targetY = 0;
	let currentX = 0;
	let currentY = 0;
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
		const vertical = 1.2; // up and down a little more than side to side
		for (const { layer, depth } of layerSettings) {
			const scale = depth * depthScale;
			layer.style.translate = `${x * scale}px ${y * scale * vertical}px`;
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

		// It moves at once, fastest at the start, and slows as it arrives, never
		// passing the goal: ~63% of the way in `smoothing` seconds.
		const share = smoothing > 0 ? 1 - Math.exp(-elapsed / smoothing) : 1;
		currentX += (goalX - currentX) * share;
		currentY += (goalY - currentY) * share;
		moveLayers(currentX, currentY);

		if (Math.abs(goalX - currentX) > 0.1 || Math.abs(goalY - currentY) > 0.1) {
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
	// keep the mouse parallax. A touch screen is required too: some desktop
	// browsers (test builds of WebKit) call their pointer coarse.
	const hasTiltScreen =
		typeof DeviceOrientationEvent !== "undefined" &&
		navigator.maxTouchPoints > 0 &&
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
