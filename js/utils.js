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

// Sets CSS variables on every element a selector matches, but only once a
// value has moved enough to see (1.5%): the clock nudges them all a tiny step
// every tick, and each change makes the browser redraw the layers that use
// it. All of them on every tick cost Safari a stall of 50-100ms; most ticks
// now change nothing. The sun's place is set every tick: it only moves its
// own GPU layer, and skipped steps made it lurch and stop.
const appliedStyle = new WeakMap();

function setStyle(selector, properties) {
	for (const element of document.querySelectorAll(selector)) {
		const applied = appliedStyle.get(element) ?? {};
		appliedStyle.set(element, applied);
		for (const [name, value] of Object.entries(properties)) {
			const now = parseFloat(value);
			const before = applied[name];
			const step =
				name === "--sun-top" || name === "--sun-left"
					? 0
					: Math.max(0.015 * Math.abs(before), 0.004);
			if (before !== undefined && Math.abs(now - before) <= step)
				continue;
			applied[name] = now;
			element.style.setProperty(name, value);
		}
	}
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

// CSS filter functions (brightness, saturate, contrast, sepia, hue-rotate)
// combined into one colour matrix (rows) and offset, using the filter spec's
// formulas, applied after `start`. The browser clamps each step's colours;
// this only clamps the end (within 2/255 of it on the clouds).
function colorFilter(
	filters,
	start = {
		rows: [
			[1, 0, 0],
			[0, 1, 0],
			[0, 0, 1],
		],
		offset: [0, 0, 0],
	},
) {
	let { rows, offset } = start;
	for (const [, name, number, unit] of filters.matchAll(
		/([\w-]+)\(([\d.]+)(%|deg)?\)/g,
	)) {
		const a = Number(number) / (unit === "%" ? 100 : 1);
		const n = 1 - Math.min(a, 1);
		const [cos, sin] = [
			Math.cos((a * Math.PI) / 180),
			Math.sin((a * Math.PI) / 180),
		];
		const step = {
			brightness: [
				[a, 0, 0],
				[0, a, 0],
				[0, 0, a],
			],
			contrast: [
				[a, 0, 0],
				[0, a, 0],
				[0, 0, a],
			],
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
			"hue-rotate": [
				[
					0.213 + cos * 0.787 - sin * 0.213,
					0.715 - cos * 0.715 - sin * 0.715,
					0.072 - cos * 0.072 + sin * 0.928,
				],
				[
					0.213 - cos * 0.213 + sin * 0.143,
					0.715 + cos * 0.285 + sin * 0.14,
					0.072 - cos * 0.072 - sin * 0.283,
				],
				[
					0.213 - cos * 0.213 - sin * 0.787,
					0.715 - cos * 0.715 + sin * 0.715,
					0.072 + cos * 0.928 + sin * 0.072,
				],
			],
		}[name];
		const add = name === "contrast" ? 0.5 - 0.5 * a : 0;
		const apply = (vector) =>
			step.map(
				(row) =>
					row[0] * vector[0] +
					row[1] * vector[1] +
					row[2] * vector[2],
			);
		rows = [0, 1, 2].map((i) => apply(rows.map((row) => row[i]))); // columns, transformed...
		rows = [0, 1, 2].map((i) => rows.map((column) => column[i])); // ...back to rows
		offset = apply(offset).map((value) => value + add);
	}
	return { rows, offset };
}

// Safari (and so every browser on iPhone, which all use its engine) pays dearly
// for each redraw of a big canvas: redrawing the drawn land and clouds while
// their light glided dropped it to a few frames a second. There they change
// light in steps, as the clock ticks; elsewhere they glide.
const glideBigCanvases = !navigator.vendor?.startsWith("Apple");

// The clock changes the light in steps (each tick, or a 1.5% change). This
// draws the steps as a glide: given new target numbers, it eases the shown
// ones toward them (about `seconds` to settle, quicker during a jump in time,
// which is already eased) and calls paint(shown) at most `fps` times a second
// until they arrive, then stops.
function glider(paint, { seconds = 0.5, fps = 30 } = {}) {
	let shown = null;
	let target = null;
	let frame = 0;
	let last = 0;
	function step(now) {
		frame = 0;
		if (last && now - last < 1000 / fps - 2) {
			frame = requestAnimationFrame(step);
			return;
		}
		const elapsed = last ? Math.min((now - last) / 1000, 0.25) : 1 / fps;
		last = now;
		const settle =
			"jumping" in document.documentElement.dataset ? 0.08 : seconds;
		const share = 1 - Math.exp(-elapsed / settle);
		let moving = false;
		shown = shown.map((value, i) => {
			const gap = target[i] - value;
			if (Math.abs(gap) < 0.0005 * (Math.abs(target[i]) + 1))
				return target[i];
			moving = true;
			return value + gap * share;
		});
		paint(shown);
		if (moving) frame = requestAnimationFrame(step);
		else last = 0;
	}
	return (values) => {
		target = values;
		if (!shown || document.hidden) {
			shown = values;
			paint(shown);
		} else if (!frame) {
			frame = requestAnimationFrame(step);
		}
	};
}
