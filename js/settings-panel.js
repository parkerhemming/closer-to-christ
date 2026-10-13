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
		const visibleClouds = [
			...document.querySelectorAll(".storm-cloud"),
		].filter((cloud) => cloud.getClientRects().length).length;
		const rows = [
			[
				"Quality",
				`${root.dataset.quality}: ${root.dataset.qualityReason}`,
			],
			renderStats.connectionTestMs !== null && [
				"Connection test",
				`${renderStats.connectionTestMs}ms for 48KB`,
			],
			[
				"Images",
				getQuality() === "low" || root.dataset.assets === "small"
					? "half size (2048px wide)"
					: "full size (4096px wide)",
			],
			[
				"Loaded in",
				renderStats.loadSeconds
					? `${renderStats.loadSeconds.toFixed(1)}s`
					: "...",
			],
			[
				"Frame rate",
				framesPerSecond === null ? "..." : `${framesPerSecond} fps`,
			],
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
				`${renderStats.stars ?? 0} stars, ` +
					`${renderStats.raindrops} raindrops`,
			],
			[
				"Offline cache",
				navigator.serviceWorker?.controller
					? "on"
					: "off until next visit",
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
			if (description.textContent !== value)
				description.textContent = value;
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
		if (
			dialog.open &&
			!dialog.contains(event.target) &&
			!button.contains(event.target)
		) {
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
		weatherLean =
			sceneSettings.weatherIntensity -
			alongCurve(hourCurves.weather, sceneSettings.hour);
		sceneSettings.parallax = parallax.checked;
		sceneSettings.parallaxSmoothing = Number(parallaxSmoothing.value);
		saveSettings();
		showCurrentValues();
	});

	// A hint under the gear once 3:00 has come: where to see how this was
	// made. Shown a moment after the first quake settles (or after a while,
	// if there's no quake), and fades away on its own, half again as late as
	// the sound hint. Once a visit.
	const githubHint = document.querySelector(".github-hint");
	let hintTimer = 0;
	let hinted = false;
	function showGithubHint() {
		hinted = true;
		githubHint.hidden = false;
		githubHint.offsetWidth; // laid out first, so it fades in
		githubHint.classList.add("is-shown");
		setTimeout(() => githubHint.classList.remove("is-shown"), 6750);
	}
	document.addEventListener("scenesettings", () => {
		const atThree = sceneSettings.hour >= 15 - 0.001;
		if (hinted || atThree === Boolean(hintTimer)) return;
		clearTimeout(hintTimer);
		hintTimer = atThree ? setTimeout(showGithubHint, 12000) : 0;
	});
	document.addEventListener("earthquake", ({ detail }) => {
		if (hinted || !detail.first) return;
		clearTimeout(hintTimer);
		hintTimer = setTimeout(showGithubHint, detail.seconds * 1000 + 1500);
	});
}
