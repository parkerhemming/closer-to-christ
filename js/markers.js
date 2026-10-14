// Markers on the figure and in the scene (teachings.js). Each opens a card of
// what that part teaches, beside the marker; on phones it opens across the
// screen instead (the CSS places it there). Clicking the marker again closes
// it. The markers stay faint until the mouse comes near, brightening as it
// gets closer; hovering one lights it up and shows its title.
function teachingMarkers() {
	const card = document.getElementById("teaching");
	const picture = card.querySelector(".teaching-picture");
	const title = card.querySelector(".teaching-title");
	const text = card.querySelector(".teaching-text");
	const scriptures = card.querySelector(".teaching-scriptures");
	const layers = {
		figure: document.querySelector(".christ-markers"),
		city: document.querySelector(".scene-markers--city"),
		olives: document.querySelector(".scene-markers--olives"),
		sky: document.querySelector(".scene-markers--sky"),
	};
	const phone = matchMedia("(max-width: 600px)");
	let openFor = null;
	let openAtPress = false;

	for (const teaching of teachings) {
		const marker = document.createElement("button");
		marker.type = "button";
		marker.className = "marker";
		marker.setAttribute("aria-label", teaching.title);
		const label = document.createElement("span");
		label.className = "marker-label";
		label.textContent = teaching.title;
		label.setAttribute("aria-hidden", "true");
		marker.append(label);
		// Centred over the marker, but nudged sideways to stay on the screen
		// (12px in) near its edges. Measured as it's about to show, inside
		// the layer's parallax scale.
		const keepLabelOnScreen = () => {
			label.style.removeProperty("--nudge");
			const box = label.getBoundingClientRect();
			const scale = box.width / label.offsetWidth || 1;
			const over =
				Math.max(0, 12 - box.left) -
				Math.max(0, box.right - (innerWidth - 12));
			if (over) label.style.setProperty("--nudge", `${over / scale}px`);
		};
		marker.addEventListener("pointerenter", keepLabelOnScreen);
		marker.addEventListener("focus", keepLabelOnScreen);
		const { figure, layer = "figure", style } = teaching.at;
		if (figure) {
			marker.style.left = `${(figure[0] / 1186) * 100}%`;
			marker.style.top = `${(figure[1] / 2337) * 100}%`;
		} else {
			marker.style.cssText = style;
		}
		// Was its card open when the press began? (A press outside the card
		// closes it before the click arrives.)
		marker.addEventListener("pointerdown", () => {
			openAtPress = openFor === marker && card.matches(":popover-open");
		});
		marker.addEventListener("click", () => {
			const again =
				openAtPress ||
				(openFor === marker && card.matches(":popover-open"));
			openAtPress = false;
			if (again) {
				if (card.matches(":popover-open")) card.hidePopover();
				return;
			}
			show(teaching, marker);
		});
		layers[layer].append(marker);
	}

	// Touch screens can't come near first, so the markers light up for a
	// while once the loading screen and motion question are gone, and for a
	// moment after each tap, then dim again.
	if (matchMedia("(hover: none)").matches) {
		const root = document.documentElement;
		let dimTimer;
		const lightUp = (seconds) => {
			root.dataset.markersLit = "";
			clearTimeout(dimTimer);
			dimTimer = setTimeout(
				() => delete root.dataset.markersLit,
				seconds * 1000,
			);
		};
		(function whenUncovered() {
			if (
				document.querySelector(
					"#loading:not(.is-done), #motion-prompt:not([hidden])",
				)
			)
				setTimeout(whenUncovered, 250);
			else lightUp(5);
		})();
		// Not for a tap that opens, or lands in, a big popup: the settings,
		// the list of events (an open caption's tap) or a card. A marker's
		// own tap still does. (touchstart: iOS doesn't always report a tap on
		// the scene as a pointer.)
		document.addEventListener(
			"touchstart",
			({ target }) => {
				const popup = target.closest?.(
					"#settings-button, #settings, #timeline, #teaching, .caption:not(.is-folded) #timeline-button",
				);
				if (popup && !target.closest(".marker")) return;
				lightUp(3);
			},
			{ passive: true },
		);
	}

	card.addEventListener("toggle", (event) => {
		if (event.newState === "closed")
			openFor?.removeAttribute("aria-expanded");
	});

	function show(teaching, marker) {
		openFor?.removeAttribute("aria-expanded");
		picture.hidden = !teaching.picture;
		if (teaching.picture) {
			picture.querySelector("img").src = teaching.picture.src;
			picture.querySelector("img").alt = teaching.picture.alt;
			picture.querySelector("figcaption").textContent =
				teaching.picture.caption;
		}
		title.textContent = teaching.title;
		text.textContent = teaching.text;
		scriptures.replaceChildren(
			...teaching.scriptures.map(([reference, words]) => {
				const quote = document.createElement("blockquote");
				quote.className = "teaching-scripture";
				const cite = document.createElement("cite");
				cite.textContent = reference;
				quote.append(`\u201c${words}\u201d`, cite);
				return quote;
			}),
		);
		card.classList.toggle("teaching--wide", Boolean(teaching.wide));
		openFor = marker;
		marker.setAttribute("aria-expanded", "true");
		if (!card.matches(":popover-open")) card.showPopover();
		card.querySelector(".teaching-body").scrollTop = 0;
		place(marker);
	}

	// Beside the marker (right if it fits, else left), level with it but
	// kept on screen, with its pointer at the marker's height. It never
	// reaches down over the caption, even folded: it stops 12px above where
	// the folded box's top would be (the arrows sit centred on that box).
	function place(marker) {
		const edge = 20;
		const captionBox = document
			.querySelector(".caption-content")
			.getBoundingClientRect();
		const arrow = document.querySelector(".caption-step");
		const foldedHeight =
			arrow.offsetHeight +
			2 * parseFloat(getComputedStyle(arrow).marginBottom);
		const bottom = captionBox.bottom - foldedHeight - 12;
		if (phone.matches) {
			card.style.left = card.style.top = "";
			delete card.dataset.pointer;
			card.style.maxHeight = "";
			card.style.maxHeight = `${bottom - card.getBoundingClientRect().top}px`;
			return;
		}
		card.style.maxHeight = `${bottom - edge}px`;
		const gap = 14;
		const at = marker.getBoundingClientRect();
		const size = card.getBoundingClientRect();
		const middle = at.top + at.height / 2;
		const onRight = at.right + gap + size.width <= innerWidth - edge;
		const onLeft = at.left - gap - size.width >= edge;
		const left = onRight ? at.right + gap : at.left - gap - size.width;
		const top = clamp(middle - size.height / 2, edge, bottom - size.height);
		card.style.left = `${clamp(left, edge, innerWidth - edge - size.width)}px`;
		card.style.top = `${top}px`;
		// No pointer when the window is too narrow for it to sit beside it.
		if (onRight || onLeft)
			card.dataset.pointer = onRight ? "left" : "right";
		else delete card.dataset.pointer;
		card.style.setProperty(
			"--pointer-y",
			`${clamp(middle - top, 22, size.height - 22)}px`,
		);
	}

	// --near: 1 with the mouse on a marker, fading to 0 about 150px away
	// (at most once a frame). Where the markers are is measured at most four
	// times a second: measuring every frame forced the browser to lay out
	// the page mid-frame, and the parallax only moves them a few pixels.
	const markers = [...document.querySelectorAll(".marker")];
	let centres = [];
	let measuredAt = -Infinity;
	let pointer = null;
	let measuring = 0;
	document.addEventListener(
		"pointermove",
		(event) => {
			if (event.pointerType !== "mouse") return;
			pointer = event;
			measuring ||= requestAnimationFrame((now) => {
				measuring = 0;
				if (now - measuredAt > 250) {
					measuredAt = now;
					centres = markers.map((marker) => {
						const box = marker.getBoundingClientRect();
						return [
							box.left + box.width / 2,
							box.top + box.height / 2,
						];
					});
				}
				markers.forEach((marker, i) => {
					const distance = Math.hypot(
						pointer.clientX - centres[i][0],
						pointer.clientY - centres[i][1],
					);
					const near = clamp(1 - (distance - 20) / 130, 0, 1).toFixed(
						2,
					);
					if (marker.style.getPropertyValue("--near") !== near)
						marker.style.setProperty("--near", near);
				});
			});
		},
		{ passive: true },
	);
}
