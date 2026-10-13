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
		for (const [, url] of value.matchAll(/url\("?([^")]+)"?\)/g))
			urls.add(url);
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
			setQuality("low", {
				reason: `slow connection (test took ${testMs}ms)`,
			});
		} else if (testMs > 800 && getQuality() === "high") {
			setQuality("medium", {
				reason: `slowish connection (test took ${testMs}ms)`,
			});
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

	await wait(
		(sceneSettings.minimumLoadingSeconds - renderStats.loadSeconds) * 1000,
	);
	loading.classList.add("is-done");
	loading.addEventListener("transitionend", () => loading.remove(), {
		once: true,
	});
	watchFrameRate();

	if ("serviceWorker" in navigator) {
		navigator.serviceWorker.register("./service-worker.js").catch(() => {});
	}
}

// Once the scene has settled, watch the frame rate. Everyone starts on the
// full scene; only a device that is truly struggling (under 20fps in each of
// three 4-second checks in a row, not one slow moment) steps down a level,
// and remembers it so struggling (older) phones get a lighter scene on later
// visits. Smooth drawing clears an earlier step-down.
function watchFrameRate() {
	if ("qualityChosen" in document.documentElement.dataset) return; // picked by hand
	const checks = 3;
	const medians = [];

	function check() {
		const frameTimes = [];
		let previous = performance.now();
		const end = previous + 4000;
		function measure(now) {
			// Not a fair test while hidden or in the background: start over.
			if (document.hidden || !document.hasFocus()) {
				setTimeout(check, 2000);
				return;
			}
			frameTimes.push(now - previous);
			previous = now;
			if (now < end) {
				requestAnimationFrame(measure);
				return;
			}
			frameTimes.sort((a, b) => a - b);
			const median = frameTimes[Math.floor(frameTimes.length / 2)];
			if (median < 25) {
				try {
					localStorage.removeItem("loweredQuality");
				} catch {}
				return; // smooth: nothing more to check
			}
			medians.push(median);
			if (medians.length < checks) return check();
			if (medians.every((m) => m > 50)) {
				lowerQuality({ reason: "slow frame rate", remember: true });
			}
		}
		requestAnimationFrame(measure);
	}

	// Skip the first seconds: decoding and the first animations settle there.
	setTimeout(check, 6000);
}
