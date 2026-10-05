function createStars(stars) {
	const sky = document.getElementById("sky");

	for (let i = 0; i < stars; i++) {
		const size = Math.random();
		const star = document.createElement("div");

		star.classList.add("star");
		star.style.top = Math.random() * 100 + "%";
		star.style.left = Math.random() * 100 + "%";
		star.style.opacity = Math.random() * 1.1;

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

		sky.appendChild(star);
	}
}

function createShootingStars() {
	const sky = document.getElementById("sky");
	const reducedMotion = window.matchMedia(
		"(prefers-reduced-motion: reduce)",
	).matches;

	if (reducedMotion) return;

	function scheduleShootingStar(firstStar = false) {
		const minimumDelay = firstStar ? 4500 : 18000;
		const delayRange = firstStar ? 4500 : 22000;

		window.setTimeout(launchShootingStar, minimumDelay + Math.random() * delayRange);
	}

	function launchShootingStar() {
		const shootingStar = document.createElement("span");
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
		shootingStar.style.setProperty("--shooting-distance", `${45 + Math.random() * 25}vw`);
		shootingStar.style.setProperty("--shooting-duration", `${900 + Math.random() * 350}ms`);

		shootingStar.addEventListener("animationend", () => shootingStar.remove(), {
			once: true,
		});
		sky.appendChild(shootingStar);
		scheduleShootingStar();
	}

	scheduleShootingStar(true);
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

	function moveLayers(x, y) {
		for (const layer of layers) {
			const layerDepthScale =
				layer === christ ? depthScale * christDepthFactor : depthScale;
			const depth = Number(layer.dataset.z_index) * layerDepthScale;
			layer.style.translate = `${x * depth}px ${y * depth}px`;
		}

		const horizontalRange = isTouchDevice
			? 24 * mobileHorizontalStrength
			: Math.max(window.innerWidth / 2, 1);
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
		currentX += (targetX - currentX) * smoothing;
		currentY += (targetY - currentY) * smoothing;
		moveLayers(currentX, currentY);
		requestAnimationFrame(animateParallax);
	}

	requestAnimationFrame(animateParallax);

	if (!isTouchDevice) {
		document.addEventListener("mousemove", (event) => {
			targetX = event.clientX - window.innerWidth / 2;
			targetY = event.clientY - window.innerHeight / 2;
		});
	}

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

		const screenAngle = screen.orientation?.angle ?? window.orientation ?? 0;
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

				if (typeof DeviceOrientationEvent.requestPermission === "function") {
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
