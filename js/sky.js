// The stars: the still ones painted once into a canvas (with their glow),
// so the starfield is a single picture that fades with the dawn; as
// hundreds of glowing elements, every star was repainted each frame while it
// faded, and Safari slowed to a few frames a second through sunrise. The
// twinkling ones are tiny elements of their own, each fading by itself.
function createStars(count) {
	const sky = document.querySelector("#sky .stars");
	const canvas = document.createElement("canvas");
	canvas.className = "stars-canvas";
	sky.append(canvas);
	const lowQuality = getQuality() === "low";
	const stars = Array.from({ length: count }, () => {
		const size = Math.random();
		return {
			x: Math.random(),
			y: Math.random(),
			opacity: Math.random() * 0.8,
			twinkle: size < 0.25,
			big: size > 0.96,
			width: size > 0.96 ? size * 12.5 : size * 2.5,
			delay: Math.random(),
		};
	});
	renderStats.stars = count;

	const fragment = document.createDocumentFragment();
	for (const star of stars.filter((star) => star.twinkle)) {
		const holder = document.createElement("span");
		holder.className = "star-twinkle";
		holder.style.left = `${star.x * 100}%`;
		holder.style.top = `${star.y * 100}%`;
		const dot = document.createElement("span");
		dot.style.width = `${star.width}px`;
		dot.style.animationDelay = `${star.delay}s`;
		dot.style.animationDuration = `${star.delay * 2 + 0.75}s`;
		holder.append(dot);
		fragment.append(holder);
	}
	sky.append(fragment);

	// Painted as the stars' CSS was: each glow is the star itself blurred
	// (a box-shadow's blur radius is twice the spread, as a canvas shadowBlur
	// is), so a tiny star has a tiny, faint glow.
	const glows = lowQuality
		? [[4, "#dcefff"]]
		: [
				[20, "#8ebce0"],
				[10, "#dcefff"],
				[4, "white"],
			];
	// Just a shape's glow: the shape is drawn off the canvas and its shadow
	// thrown back onto it.
	function glow(context, draw, blur, colour, scale) {
		context.save();
		context.shadowColor = colour;
		context.shadowBlur = blur * scale;
		context.shadowOffsetX = 100000 * scale;
		context.translate(-100000, 0);
		draw();
		context.restore();
	}

	// The big stars: a four-pointed sparkle, glowing as their CSS
	// drop-shadows did (each glow is of everything before it), painted once.
	const sparkle = [
		[50, 0],
		[52, 37],
		[58, 41],
		[72, 27],
		[61, 44],
		[64, 48],
		[100, 50],
		[64, 52],
		[61, 56],
		[72, 73],
		[58, 59],
		[52, 63],
		[50, 100],
		[48, 63],
		[42, 59],
		[28, 73],
		[39, 56],
		[36, 52],
		[0, 50],
		[36, 48],
		[39, 44],
		[28, 27],
		[42, 41],
		[48, 37],
	];
	function sparkleImage(width, scale) {
		const reach = width / 2 + 24; // the glows' reach, in CSS pixels
		const image = document.createElement("canvas");
		image.width = image.height = Math.ceil(reach * 2 * scale);
		const context = image.getContext("2d");
		context.setTransform(
			scale,
			0,
			0,
			scale,
			image.width / 2,
			image.height / 2,
		);
		context.beginPath();
		for (const [x, y] of sparkle)
			context.lineTo(((x - 50) / 100) * width, ((y - 50) / 100) * width);
		context.closePath();
		context.fillStyle = "white";
		context.fill();
		context.setTransform(1, 0, 0, 1, 0, 0);
		context.globalCompositeOperation = "destination-over";
		for (const [blur, colour] of lowQuality
			? []
			: [
					[1.5, "white"],
					[4, "#dcefff"],
					[8, "#8ebce0"],
				]) {
			const copy = document.createElement("canvas");
			copy.width = copy.height = image.width;
			copy.getContext("2d").drawImage(image, 0, 0);
			glow(context, () => context.drawImage(copy, 0, 0), blur, colour, 1);
		}
		return { image, reach };
	}

	function paint() {
		const width = sky.offsetWidth;
		const height = sky.offsetHeight;
		if (!width) return;
		const scale = Math.min(window.devicePixelRatio, 2);
		canvas.width = Math.round(width * scale);
		canvas.height = Math.round(height * scale);
		const context = canvas.getContext("2d");
		context.setTransform(scale, 0, 0, scale, 0, 0);
		for (const star of stars) {
			if (star.twinkle) continue;
			const x = star.x * width;
			const y = star.y * height;
			context.globalAlpha = star.opacity;
			if (star.big) {
				const { image, reach } = sparkleImage(star.width, scale);
				context.drawImage(
					image,
					x - reach,
					y - reach,
					reach * 2,
					reach * 2,
				);
				continue;
			}
			const dot = () => {
				context.beginPath();
				context.arc(x, y, star.width / 2, 0, Math.PI * 2);
				context.fillStyle = "white";
				context.fill();
			};
			for (const [blur, colour] of glows)
				glow(context, dot, blur, colour, scale);
			dot();
		}
	}

	paint();
	let resizeTimer;
	window.addEventListener("resize", () => {
		clearTimeout(resizeTimer);
		resizeTimer = setTimeout(paint, 300);
	});
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
		// A hidden tab still fires timers but doesn't run animations, so stars
		// launched then never end: they'd pile up and all streak at once on
		// return. Skip this one instead.
		if (document.hidden) {
			scheduleShootingStar();
			return;
		}
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
			// Fainter as the sky lightens (they no longer sit in a fading layer).
			"--shooting-opacity":
				randomBetween(...profile.opacity) * lightFor("starlight"),
			"--shooting-head-size": `${randomBetween(...profile.head)}px`,
		});

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

// The sun glides between positions as the clock runs (see .sun), but not
// while the page can't be seen: a page loading in a hidden tab hasn't drawn
// the sun yet, and gliding then starts it from a corner. So the glide is off
// while hidden and comes back two frames after the page is shown.
function sunGlide() {
	const root = document.documentElement;
	function update() {
		delete root.dataset.sceneShown;
		if (document.hidden) return;
		requestAnimationFrame(() =>
			requestAnimationFrame(() => (root.dataset.sceneShown = "")),
		);
	}
	update();
	document.addEventListener("visibilitychange", update);
}
