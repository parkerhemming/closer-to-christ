// The rain, drawn on two full-screen canvases (behind and in front of the
// storm wash) rather than as an element per drop: each frame redraws every
// drop as a slanted streak, and a drop that falls off the bottom starts again
// above the top. Drops are grouped into a few brightness/width bands and each
// band is drawn in one go, so a downpour of hundreds of drops costs about as
// much as a drizzle.
//
// It runs in a worker (startRain in js/storm.js hands it the canvases), so it keeps
// falling even when the page's own frames are held up, as Chrome does while
// the settings panel scrolls. Where a canvas can't be handed to a worker, the
// page runs it instead (this file is also loaded as a script).

// layers: [{ canvas, count, length, fallSeconds, opacity, drift, width,
// maximumScale, lowQualityShare }]. conditions() gives the weather:
// { rain, wind, lengthScale, brightness, low }. onCount gets the number of
// drops now and then.
function createRain(layers, conditions, onCount) {
	const fallSlant = Math.tan((7 * Math.PI) / 180); // the original 7deg lean
	const brightnessBands = 4;
	const widthBands = 2;
	const nextFrame = self.requestAnimationFrame
		? (frame) => self.requestAnimationFrame(frame)
		: (frame) => setTimeout(() => frame(performance.now()), 16);
	const between = (minimum, maximum) =>
		minimum + Math.random() * (maximum - minimum);
	let width = 0;
	let height = 0;
	let lastTime = performance.now();
	let lastCount = 0;
	let firstFrame = true;
	let paused = false;

	for (const layer of layers) {
		layer.context = layer.canvas.getContext("2d");
		layer.drops = [];
	}

	function resize(newWidth, newHeight, pixelRatio) {
		width = newWidth;
		height = newHeight;
		for (const layer of layers) {
			// Soft rain doesn't need full retina sharpness; fewer pixels to clear.
			const scale = Math.min(pixelRatio, layer.maximumScale);
			layer.canvas.width = Math.round(width * scale);
			layer.canvas.height = Math.round(height * scale);
			layer.context.setTransform(scale, 0, 0, scale, 0, 0);
			layer.context.lineCap = "round";
		}
	}

	// A drop starts somewhere above the top edge (or anywhere on screen when
	// the rain first appears, so it doesn't arrive as one sheet).
	function newDrop(layer, anywhere) {
		const fallSeconds = between(...layer.fallSeconds);
		return {
			x: between(-0.08, 1.04) * width,
			y: anywhere ? between(-0.4, 1) * height : between(-0.4, 0) * height,
			// The original drops fell 150% of the screen height in fallSeconds.
			speed: (1.5 * height) / fallSeconds,
			drift: between(...layer.drift) / (1.5 * height), // sideways per px fallen
			length: between(...layer.length),
			band: Math.floor(Math.random() * brightnessBands * widthBands),
		};
	}

	function frame(now) {
		nextFrame(frame);
		// At most about 60 a second: on 120Hz screens every other frame is
		// skipped, which halves the drawing and looks the same for rain.
		if (paused || !width || now - lastTime < 14) return;
		const elapsed = Math.min((now - lastTime) / 1000, 0.05);
		lastTime = now;
		const { rain, wind, lengthScale, brightness, low } = conditions();
		const seconds = now / 1000;
		// Gusts: the amount of rain swells and eases a little over time.
		const gust =
			1 +
			0.18 * Math.sin(seconds * 0.7) +
			0.1 * Math.sin(seconds * 1.9 + 1);
		let total = 0;

		for (const layer of layers) {
			const share = low ? layer.lowQualityShare : 1;
			const target = Math.round(layer.count * rain * share * gust);
			while (layer.drops.length < target) {
				layer.drops.push(newDrop(layer, firstFrame));
			}
			// No rain: clear the canvas once, then leave it alone (an untouched
			// canvas costs nothing to show).
			if (!layer.drops.length) {
				if (!layer.blank) layer.context.clearRect(0, 0, width, height);
				layer.blank = true;
				continue;
			}
			layer.blank = false;

			// One faint tail path and one brighter head path per band.
			const tails = Array.from(
				{ length: brightnessBands * widthBands },
				() => new Path2D(),
			);
			const heads = Array.from(
				{ length: brightnessBands * widthBands },
				() => new Path2D(),
			);
			for (let i = layer.drops.length - 1; i >= 0; i--) {
				const drop = layer.drops[i];
				drop.y += drop.speed * elapsed;
				drop.x += drop.speed * elapsed * drop.drift * wind;
				const length = drop.length * lengthScale;
				if (drop.y - length > height) {
					// Fallen off the bottom: start again at the top, or stop if
					// the rain has eased off.
					if (layer.drops.length > target) layer.drops.splice(i, 1);
					else layer.drops[i] = newDrop(layer, false);
					continue;
				}
				// A streak along the fall direction (the 7deg lean plus its wind
				// drift): a faint upper tail and a brighter lower end, like the
				// original gradient drops.
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
				const brightnessStep =
					((band % brightnessBands) + 0.5) / brightnessBands;
				const widthStep =
					(Math.floor(band / brightnessBands) + 0.5) / widthBands;
				const [lowOpacity, highOpacity] = layer.opacity;
				const [thin, thick] = layer.width;
				const alpha = Math.min(
					1,
					(lowOpacity + (highOpacity - lowOpacity) * brightnessStep) *
						brightness,
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
		if (now - lastCount > 500) {
			lastCount = now;
			onCount(total);
		}
	}

	nextFrame(frame);
	return {
		resize,
		pause(isPaused) {
			paused = isPaused;
		},
	};
}

// In the worker: the page sends the canvases, then the window size, the
// weather and whether the tab is hidden whenever they change.
if (typeof window === "undefined") {
	let rain = null;
	let weather = {
		rain: 0,
		wind: 1,
		lengthScale: 1,
		brightness: 1,
		low: false,
	};
	self.onmessage = ({ data }) => {
		if (data.conditions) weather = data.conditions;
		if (data.layers) {
			rain = createRain(
				data.layers,
				() => weather,
				(total) => self.postMessage(total),
			);
		}
		if (data.size) rain?.resize(...data.size);
		if ("hidden" in data) rain?.pause(data.hidden);
	};
}
