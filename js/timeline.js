// The day of the Crucifixion, in order. hour is on the scene's clock;
// "about" marks times the scriptures don't give exactly. Latter-day
// scriptures are listed before the Bible.
const timeline = [
	{
		hour: 6,
		about: true,
		title: "Bound and led to Pilate",
		text: "As soon as it was day, the chief priests held a council, bound Jesus and delivered him to Pontius Pilate.",
		references: "Mark 15:1; Luke 22:66; John 18:28",
	},
	{
		hour: 6.5,
		about: true,
		title: "Sent to Herod",
		text: "Pilate found no fault in him and sent him to Herod. Jesus answered him nothing, and Herod mocked him and sent him back in a gorgeous robe.",
		references: "Mosiah 14:7; Luke 23:4-12",
	},
	{
		hour: 7,
		about: true,
		title: "Barabbas is released",
		text: 'The crowd asked for Barabbas and cried, "Let him be crucified." Pilate washed his hands before them.',
		references: "Matthew 27:15-26",
	},
	{
		hour: 7.5,
		about: true,
		title: "Scourged and crowned with thorns",
		text: "Soldiers scourged him, clothed him in purple, pressed a crown of thorns on his head and mocked him as a king.",
		references: "1 Nephi 19:9; Mark 15:15-20; John 19:1-3",
	},
	{
		hour: 8,
		about: true,
		title: '"Behold the man!"',
		text: "Pilate brought him out wearing the crown of thorns and the purple robe, then delivered him to be crucified.",
		references: "John 19:4-16",
	},
	{
		hour: 8.5,
		about: true,
		title: "The road to Golgotha",
		text: 'Bearing his cross, he went out to Golgotha. Simon of Cyrene was made to carry it, and Jesus told the women weeping for him, "Weep not for me."',
		references: "Mark 15:20-22; Luke 23:26-31; John 19:17",
	},
	{
		hour: 9,
		title: "Crucified at the third hour",
		text: 'He was nailed to the cross between two thieves, and prayed, "Father, forgive them; for they know not what they do."',
		references:
			"1 Nephi 11:33; 3 Nephi 27:14; Mark 15:25-28; Luke 23:33-34",
	},
	{
		hour: 9.5,
		about: true,
		title: "His garments divided",
		text: "Soldiers cast lots for his coat. Above him hung Pilate's title in Hebrew, Greek and Latin: Jesus of Nazareth the King of the Jews.",
		references: "Psalm 22:18; John 19:19-24",
	},
	{
		hour: 10.25,
		about: true,
		title: "Mocked on the cross",
		text: 'Passersby, chief priests and scribes railed on him: "He saved others; himself he cannot save."',
		references: "Mark 15:29-32; Luke 23:35-37",
	},
	{
		hour: 10.75,
		about: true,
		title: '"To day shalt thou be with me in paradise"',
		text: "One of the thieves asked Jesus to remember him. Jesus promised he would be with him that day in paradise, the world of spirits.",
		references: "Alma 40:11-12; D&C 138:18-19; Luke 23:39-43",
	},
	{
		hour: 11.25,
		about: true,
		title: '"Behold thy mother!"',
		text: "Seeing his mother and the disciple whom he loved by the cross, he gave her into that disciple's care.",
		references: "John 19:25-27",
	},
	{
		hour: 12,
		title: "Darkness at the sixth hour",
		text: "From noon there was darkness over the whole land until the ninth hour, and the sun was darkened.",
		references: "Mark 15:33; Luke 23:44-45",
	},
	{
		hour: 14.75,
		about: true,
		title: '"Why hast thou forsaken me?"',
		text: 'About the ninth hour he cried with a loud voice, "My God, my God, why hast thou forsaken me?" He trod the winepress alone.',
		references: "D&C 76:107; D&C 133:50; Matthew 27:46; Mark 15:34",
	},
	{
		hour: 14 + 55 / 60, // 2:55, on the clock's minute
		about: true,
		title: '"It is finished"',
		text: 'After a sponge of vinegar he said, "It is finished," and, "Father, into thy hands I commend my spirit," and gave up the ghost.',
		references: "Mosiah 15:7; D&C 19:18-19; Luke 23:46; John 19:28-30",
	},
	{
		hour: 15,
		title: "The earth quakes, the veil is torn",
		text: 'The temple veil tore from top to bottom and the earth shook. The centurion said, "Truly this was the Son of God." In the Americas, storms, earthquakes and three days of darkness marked his death, as Samuel the Lamanite had prophesied.',
		references: "Helaman 14:20-27; 3 Nephi 8:5-23; Matthew 27:51-54",
	},
];

// The time in the top-left corner and the caption at the bottom, which
// says what is happening, steps between events with its arrows, and opens a
// list of the whole day upward. Moving to an event eases the clock to its
// time, with fresh weather to suit the hour.
function timelineClock() {
	const clock = document.querySelector(".clock-time");
	const caption = document.querySelector(".caption");
	const toggle = document.getElementById("timeline-button");
	const list = document.getElementById("timeline");
	const [previous, next] = caption.querySelectorAll(".caption-step");
	const title = caption.querySelector(".caption-title");
	const text = caption.querySelector(".caption-text");

	function element(tag, className, text) {
		const created = document.createElement(tag);
		created.className = className;
		created.textContent = text;
		return created;
	}

	// "10:47 AM" with the digits in their own span, so they can be drawn a
	// touch heavier to match Georgia's letters (see .time-digits).
	function timeParts(hour) {
		const [digits, period] = clockTime(hour).split(" ");
		return [element("span", "time-digits", digits), ` ${period}`];
	}

	// The latest event at or before an hour.
	function eventIndex(hour) {
		return timeline.findLastIndex((event) => event.hour <= hour + 0.001);
	}

	const choices = timeline.map((event) => {
		const choice = document.createElement("button");
		choice.type = "button";
		choice.append(
			element(
				"span",
				"timeline-event-time",
				`${event.about ? "About " : ""}${clockTime(event.hour)}`,
			),
			element("strong", "timeline-event-title", event.title),
			element("span", "timeline-event-text", event.text),
			element("cite", "timeline-event-references", event.references),
		);
		// Picking one closes the list; the caption shows that event for a few
		// seconds before folding, like any other.
		choice.addEventListener("click", () => {
			goToHour(event.hour);
			setOpen(false, { foldNow: false });
		});
		const item = document.createElement("li");
		item.append(choice);
		return item;
	});
	list.querySelector(".timeline-events").replaceChildren(...choices);

	// Where the clock is heading while it eases, so quick arrow presses
	// keep stepping from there.
	let heading = null;

	function showTime() {
		const hour = sceneSettings.hour;
		clock.replaceChildren(...timeParts(hour));
		const index = eventIndex(hour);
		choices.forEach((item, i) => {
			if (i === index)
				item.firstChild.setAttribute("aria-current", "true");
			else item.firstChild.removeAttribute("aria-current");
		});
		showCaption(timeline[index]);
		const target = eventIndex(heading ?? hour);
		previous.disabled = target === 0;
		// At the last event (3 PM) the next arrow starts the day over.
		const last = target === timeline.length - 1;
		next.toggleAttribute("data-restart", last);
		next.setAttribute(
			"aria-label",
			last ? "Start the day again" : "Next event",
		);
	}
	// The caption fades between events: "9:00 AM • Crucified at the third
	// hour", then what happened.
	let captioned = null;
	let captionTimer;
	let captionEvent = null; // the event whose words are up
	let captionShownAt = 0; // and when they appeared
	function showCaption(event) {
		if (event === captioned) return;
		captioned = event;
		caption.classList.add("is-changing");
		clearTimeout(captionTimer);
		captionTimer = setTimeout(
			() => {
				resizeSmoothly(() => {
					const time = element("span", "caption-time", "");
					time.append(...timeParts(event.hour), " • ");
					title.replaceChildren(time, event.title);
					text.textContent = event.text;
					captionEvent = event;
					captionShownAt = performance.now();
					caption.classList.remove("is-changing");
					caption.classList.remove("is-folded");
				});
				holding = true;
				foldLater(3.5);
			},
			captioned && title.textContent ? 400 : 0,
		);
	}

	// Whenever the caption changes height (a new event, folding, opening), it
	// glides from the old height to the new one instead of snapping: measure,
	// make the change, measure again, then animate between the two.
	let resizing = null;
	function resizeSmoothly(change) {
		const from = toggle.getBoundingClientRect().height;
		resizing?.cancel();
		change();
		const to = toggle.getBoundingClientRect().height;
		if (reducedMotion || Math.abs(to - from) < 1) return;
		resizing = toggle.animate(
			[
				{ height: `${from}px`, overflow: "hidden" },
				{ height: `${to}px`, overflow: "hidden" },
			],
			{ duration: 350, easing: "cubic-bezier(0.2, 0.7, 0.3, 1)" },
		);
	}

	// The caption folds to one line (ending "...") a few seconds after each
	// event appears, so it covers less of the scene. With a mouse it opens while
	// the pointer is over it; on a touchscreen a tap opens it for a while. A
	// click or tap anywhere else folds it straight away. A new event's first
	// seconds always show in full, whatever the pointer does.
	let foldTimer;
	let hovered = false;
	let holding = false;
	function setFolded(folded) {
		if (
			folded === caption.classList.contains("is-folded") ||
			(folded && holding)
		)
			return;
		clearTimeout(foldTimer);
		resizeSmoothly(() => caption.classList.toggle("is-folded", folded));
		if (folded) document.dispatchEvent(new Event("captionfolded"));
	}
	// Not while the pointer is over it or the list of events is open, and the
	// first caption's seconds start once the loading screen goes.
	function foldLater(seconds) {
		clearTimeout(foldTimer);
		if (document.querySelector("#loading:not(.is-done)")) {
			foldTimer = setTimeout(() => foldLater(seconds), 250);
			return;
		}
		foldTimer = setTimeout(() => {
			holding = false;
			if (!hovered && list.hidden) setFolded(true);
		}, seconds * 1000);
	}
	// Only the box itself opens on hover, not the arrows beside it.
	toggle.addEventListener("pointerenter", (event) => {
		if (event.pointerType !== "mouse") return;
		hovered = true;
		setFolded(false);
	});
	toggle.addEventListener("pointerleave", (event) => {
		if (event.pointerType !== "mouse") return;
		hovered = false;
		if (!holding && list.hidden) setFolded(true); // straight away, like opening
	});

	showTime();
	document.addEventListener("scenesettings", showTime);

	// The clock runs on its own a minute at a time (clockSpeed minutes a
	// second), with the weather following the hour, until 3 PM or a pause.
	const playButton = document.querySelector(".clock-play");
	const dayStart = timeline[0].hour;
	const dayEnd = timeline.at(-1).hour;
	let playing = sceneSettings.clockSpeed > 0;
	let settledAt = 0; // the clock waits until then (see goToHour)
	// Stopped because the day reached 3 PM (not paused by hand): going back to
	// an earlier event starts it again.
	let dayOver = false;

	// At 3 PM it becomes a restart button.
	function showPlaying() {
		const atEnd = sceneSettings.hour >= dayEnd - 0.001;
		playButton.toggleAttribute("data-paused", !playing);
		playButton.toggleAttribute("data-restart", atEnd);
		playButton.setAttribute(
			"aria-label",
			atEnd
				? "Start the day again"
				: playing
					? "Pause time"
					: "Play time",
		);
	}
	showPlaying();
	document.addEventListener("scenesettings", showPlaying);

	function startOver() {
		playing = true;
		dayOver = false;
		goToHour(dayStart);
		showPlaying();
	}

	document.addEventListener("pauseclock", () => {
		playing = false;
		dayOver = false;
		showPlaying();
	});

	// Play returns the weather to its hour's usual (it may have been set by
	// hand while paused); at 3 PM it starts the day over.
	playButton.addEventListener("click", () => {
		if (playButton.hasAttribute("data-restart")) return startOver();
		playing = !playing;
		dayOver = false;
		if (playing) goToHour(sceneSettings.hour);
		showPlaying();
	});

	// The speed button beside it steps through these multiples of clockSpeed;
	// the choice is saved with the other settings.
	const speedButton = document.querySelector(".clock-speed");
	const speeds = [1, 1.5, 2, 5];
	if (!speeds.includes(sceneSettings.clockSpeedMultiplier))
		sceneSettings.clockSpeedMultiplier = 1;
	function showSpeed() {
		const speed = sceneSettings.clockSpeedMultiplier;
		speedButton.textContent = `${speed}x`;
		speedButton.setAttribute("aria-label", `Clock speed: ${speed}x`);
	}
	showSpeed();
	speedButton.addEventListener("click", () => {
		const speed = sceneSettings.clockSpeedMultiplier;
		sceneSettings.clockSpeedMultiplier =
			speeds[(speeds.indexOf(speed) + 1) % speeds.length];
		showSpeed();
		saveSettings();
	});

	function tick() {
		// Not until the scene is on screen (after loading) and everything has
		// settled after a jump: the sun glides into place for 1.2s after the
		// light stops changing.
		const shown = "sceneShown" in document.documentElement.dataset;
		if (
			!playing ||
			document.hidden ||
			heading !== null ||
			!shown ||
			performance.now() < settledAt
		)
			return;
		const next = Math.min(
			dayEnd,
			Math.round(sceneSettings.hour * 60 + 1) / 60,
		);
		// The caption keeps up with the clock, even at the faster speeds: the
		// clock stays on an event's minute until its words have faded in, and
		// events only minutes apart (2:45, 2:55 and 3:00), which would flash
		// past, wait to be reached until the caption before has been up a few
		// seconds.
		const index = eventIndex(sceneSettings.hour);
		if (
			timeline[index] !== captionEvent ||
			(eventIndex(next) !== index &&
				performance.now() < captionShownAt + 4000)
		)
			return;
		sceneSettings.hour = next;
		sceneSettings.weatherIntensity = weatherForHour(sceneSettings.hour);
		document.dispatchEvent(new Event("scenesettings"));
		if (sceneSettings.hour >= dayEnd) {
			playing = false;
			dayOver = true;
			showPlaying();
		}
	}
	(function run() {
		tick();
		setTimeout(
			run,
			1000 /
				((sceneSettings.clockSpeed || 1.5) *
					sceneSettings.clockSpeedMultiplier),
		);
	})();

	// The arrows go a whole event back or forward, however far the clock has
	// run into the current one.
	function step(direction) {
		const to =
			timeline[eventIndex(heading ?? sceneSettings.hour) + direction];
		if (to) goToHour(to.hour);
	}
	previous.addEventListener("click", () => step(-1));
	next.addEventListener("click", () =>
		next.hasAttribute("data-restart") ? startOver() : step(1),
	);

	// The list opens upward from the caption, as far as just under the time
	// at the top, and opens at the current event.
	function setOpen(open, { foldNow = true } = {}) {
		toggle.setAttribute("aria-expanded", open);
		list.hidden = !open;
		// The caption stays open while the list is.
		if (!open) {
			if (foldNow && !hovered) setFolded(true);
			else foldLater(3.5);
			return;
		}
		setFolded(false);
		const above =
			caption.getBoundingClientRect().top -
			clock.getBoundingClientRect().bottom -
			30;
		list.style.maxHeight = `${above}px`;
		const current = list.querySelector("[aria-current]");
		list.scrollTop =
			current.offsetTop - (list.clientHeight - current.offsetHeight) / 2;
	}
	// Folded (a tap), it opens the caption; open, it opens the list of events.
	toggle.addEventListener("click", () => {
		if (caption.classList.contains("is-folded")) {
			setFolded(false);
			foldLater(8);
		} else {
			setOpen(list.hidden);
		}
	});
	// A click anywhere else, or Escape, closes the list and folds the caption.
	// (touchstart too: a tap on the scene, which ignores touches, lands on
	// the page itself, and iOS doesn't always report that as a pointer.)
	function pressOutside(event) {
		if (caption.contains(event.target)) return;
		if (list.hidden) setFolded(true);
		else setOpen(false);
	}
	document.addEventListener("pointerdown", pressOutside);
	document.addEventListener("touchstart", pressOutside, { passive: true });
	document.addEventListener("keydown", (event) => {
		if (event.key === "Escape" && !list.hidden) {
			setOpen(false);
			toggle.focus();
		}
	});

	let easing = 0;
	let lastSceneUpdate = 0;
	function goToHour(hour) {
		const from = {
			hour: sceneSettings.hour,
			weather: sceneSettings.weatherIntensity,
		};
		weatherLean = 0; // the event's own weather: its hour's usual
		const to = { hour, weather: weatherForHour(hour) };
		if (dayOver && hour < dayEnd) {
			playing = true;
			dayOver = false;
			showPlaying();
		}
		const seconds = reducedMotion ? 0 : 1.6;
		const start = performance.now();
		heading = hour;
		document.documentElement.dataset.jumping = "";
		cancelAnimationFrame(easing);
		function frame(now) {
			const along = seconds
				? Math.min((now - start) / 1000 / seconds, 1)
				: 1;
			const eased =
				along < 0.5 ? 2 * along ** 2 : 1 - (2 - 2 * along) ** 2 / 2;
			sceneSettings.hour = from.hour + (to.hour - from.hour) * eased;
			sceneSettings.weatherIntensity =
				from.weather + (to.weather - from.weather) * eased;
			if (along === 1) {
				heading = null;
				// After a jump in time, a moment for everything to settle.
				if (Math.abs(to.hour - from.hour) > 0.02)
					settledAt = performance.now() + 300;
			}
			// The clock moves every frame; the scene's light (which repaints
			// the sky) changes 15 times a second, which still looks smooth.
			if (along === 1 || now - lastSceneUpdate >= 66) {
				lastSceneUpdate = now;
				document.dispatchEvent(new Event("scenesettings"));
			} else {
				showTime();
				placeSun();
			}
			if (along < 1) {
				easing = requestAnimationFrame(frame);
			} else {
				// The sun's usual glide again, once its last step has started.
				requestAnimationFrame(() => {
					if (heading === null)
						delete document.documentElement.dataset.jumping;
				});
			}
		}
		easing = requestAnimationFrame(frame);
	}
}
