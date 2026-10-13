// The scene's sound, with Web Audio. It plays on the browser's audio thread,
// not the page's, so it doesn't slow the scene. Every visit starts muted
// until the visitor turns it on with the speaker button, and it stops
// entirely while it's off or the tab is hidden.
//
// Made here from noise, so they follow the weather exactly:
// - Wind, always: a breeze when calm, a howl in a storm, coming in gusts.
// - Heavy rain: a hiss of countless drops and the roar of a downpour.
// - Thunder after each lightning flash: a crack overhead when it's near,
//   later, lower and softer the farther away it struck, from where it struck.
// - The earthquake at 3 PM: the ground's roar, stones falling, rocks splitting.
//
// Recordings (assets/sounds/, see the README for where each came from):
// - Light rain, birds in the morning, crickets before dawn and in the noon
//   darkness (animals go quiet, or start their night songs, when the sun is
//   darkened).
// - The crowd through the day's events: murmuring at the trials, a mob
//   crying out at 7:00 and 8:00, soldiers and mockers jeering and laughing,
//   women weeping on the road to Golgotha and by the cross, cries of fear
//   at the earthquake.
// - The day's moments: hammer blows at the third hour, a heartbeat from "Why
//   hast thou forsaken me?" that slows and stops at "It is finished", a
//   hush from which the storm rises back to its height at 3 PM, then the
//   temple veil tearing.
function soundscape() {
	const button = document.querySelector(".sound-toggle");
	if (!window.AudioContext) {
		button.hidden = true;
		return;
	}
	let audio; // the AudioContext, made the first time sound is turned on
	let master, ambience, echo, buffers, wind, rain, beds, crowdTone, events;
	const audible = () => audio?.state === "running" && sceneSettings.sound;
	// Easing to another time (an event, or back to 6 AM to start over).
	const jumping = () => "jumping" in document.documentElement.dataset;

	function showState() {
		button.setAttribute("aria-pressed", sceneSettings.sound);
	}
	showState();

	// On fades in; off (or a hidden tab) fades out, then suspends the audio
	// so it does no work at all.
	function switchSound() {
		if (sceneSettings.sound && !document.hidden) {
			if (!audio) build();
			audio.resume();
			update();
			glide(master.gain, 1, 1);
		} else if (audio) {
			glide(master.gain, 0, 0.3);
			setTimeout(() => {
				if (!sceneSettings.sound || document.hidden) audio.suspend();
			}, 400);
		}
	}
	button.addEventListener("click", () => {
		sceneSettings.sound = !sceneSettings.sound;
		showState();
		saveSettings();
		switchSound();
	});
	document.addEventListener("visibilitychange", switchSound);

	// Small helpers for building the sound.
	function glide(param, value, seconds = 0.5) {
		param.setTargetAtTime(value, audio.currentTime, seconds / 3);
	}
	function gain(value = 0) {
		return new GainNode(audio, { gain: value });
	}
	function filter(type, frequency, Q = 0.7) {
		return new BiquadFilterNode(audio, { type, frequency, Q });
	}
	// Connects each node to the next.
	function chain(...nodes) {
		nodes.reduce((from, to) => (from.connect(to), to));
	}
	// One of the buffers, looping from a random place, starting at `at`.
	function loopOf(buffer, rate = 1, at = 0) {
		const source = new AudioBufferSourceNode(audio, {
			buffer,
			loop: true,
			playbackRate: rate,
		});
		source.start(at, Math.random() * buffer.duration);
		return source;
	}
	// Part of a recording, `seconds` long from `from` (or all of it), fading
	// in and out, into `to`.
	function play(
		buffer,
		at,
		to,
		{ loud = 1, from = 0, seconds, fade = 0.05 },
	) {
		seconds ??= buffer.duration - from;
		const source = new AudioBufferSourceNode(audio, { buffer });
		const level = gain();
		level.gain.setValueAtTime(0, at);
		level.gain.linearRampToValueAtTime(loud, at + fade);
		level.gain.setValueAtTime(loud, at + seconds - fade);
		level.gain.linearRampToValueAtTime(0, at + seconds);
		chain(source, level, to);
		source.start(at, from, seconds);
		source.onended = () => level.disconnect();
	}
	// A buffer of `seconds`, filled sample by sample by `fill(data, channel,
	// rate)`.
	function makeBuffer(seconds, channels, fill) {
		const rate = audio.sampleRate;
		const buffer = audio.createBuffer(
			channels,
			Math.round(seconds * rate),
			rate,
		);
		for (let channel = 0; channel < channels; channel++) {
			fill(buffer.getChannelData(channel), channel, rate);
		}
		return buffer;
	}
	// Adds a sound starting at `start` seconds into a looping buffer, wrapping
	// round its end so the loop has no seam.
	function addAt(data, start, rate, samples, sampleAt) {
		const first = Math.floor(start * rate);
		for (let i = 0; i < samples; i++) {
			data[(first + i) % data.length] += sampleAt(i / rate);
		}
	}
	// A buffer made to loop without a seam: its last half second fades into
	// its first (which also hides the silence a recording's file adds at
	// each end).
	function seamless(buffer) {
		const fade = Math.round(0.5 * buffer.sampleRate);
		const length = buffer.length - fade;
		const loop = audio.createBuffer(
			buffer.numberOfChannels,
			length,
			buffer.sampleRate,
		);
		for (let channel = 0; channel < buffer.numberOfChannels; channel++) {
			const raw = buffer.getChannelData(channel);
			const data = loop.getChannelData(channel);
			data.set(raw.subarray(0, length));
			for (let i = 0; i < fade; i++) {
				const along = i / fade;
				data[i] =
					raw[i] * Math.sqrt(along) +
					raw[length + i] * Math.sqrt(1 - along);
			}
		}
		return loop;
	}

	// Noise that loops: white (a hiss), pink (softer, for wind) or brown (a
	// deep rumble), all equally loud.
	function noise(seconds, color) {
		return seamless(
			makeBuffer(seconds + 0.5, 2, (data) => {
				let b0 = 0;
				let b1 = 0;
				let b2 = 0;
				let power = 0;
				for (let i = 0; i < data.length; i++) {
					const white = Math.random() * 2 - 1;
					if (color === "pink") {
						b0 = 0.99765 * b0 + white * 0.099046;
						b1 = 0.963 * b1 + white * 0.2965164;
						b2 = 0.57 * b2 + white * 1.0526913;
						data[i] = b0 + b1 + b2 + white * 0.1848;
					} else if (color === "brown") {
						data[i] = b0 = (b0 + 0.02 * white) / 1.02;
					} else {
						data[i] = white;
					}
					power += data[i] ** 2;
				}
				const scale = 0.2 / Math.sqrt(power / data.length);
				for (let i = 0; i < data.length; i++) data[i] *= scale;
			}),
		);
	}

	// Stones knocking and falling in the earthquake: short bursts of noise,
	// some dull and some bright, some bouncing a few times.
	function rubble(seconds) {
		const stones = Array.from({ length: seconds * 22 }, () => ({
			start: Math.random() * seconds,
			bounces:
				Math.random() < 0.35 ? 2 + Math.floor(Math.random() * 3) : 1,
			gap: randomBetween(0.06, 0.15),
			loud: 0.15 + Math.random() ** 2 * 0.8,
			dull: randomBetween(0.04, 0.5),
			right: Math.random(),
		}));
		return makeBuffer(seconds, 2, (data, channel, rate) => {
			for (const stone of stones) {
				const side = Math.sqrt(channel ? stone.right : 1 - stone.right);
				let { start, gap, loud } = stone;
				for (let bounce = 0; bounce < stone.bounces; bounce++) {
					const knock = randomBetween(0.003, 0.012);
					let low = 0;
					addAt(data, start, rate, knock * 5 * rate, (t) => {
						low += stone.dull * (Math.random() * 2 - 1 - low);
						return side * loud * low * Math.exp(-t / knock);
					});
					start += gap;
					gap *= 0.65;
					loud *= 0.55;
				}
			}
		});
	}

	// The recordings, fetched and decoded the first time sound is turned on
	// (decoding runs off the page's thread). Each part stays silent until
	// its recording arrives; the beds start looping as soon as theirs does.
	const recordings = {};
	const bedNames = [
		"rain-light",
		"birds",
		"crickets",
		"crowd",
		"weeping",
		"weeping-soft",
	];
	const shotNames = [
		"mob",
		"mob-angry",
		"laughter",
		"gasp",
		"panic",
		"heartbeat",
		"hammer-v2",
		"tear",
	];
	function loadRecordings() {
		for (const name of [...bedNames, ...shotNames]) {
			fetch(`./assets/sounds/${name}.mp3`)
				.then((response) => response.arrayBuffer())
				.then((data) => audio.decodeAudioData(data))
				.then((buffer) => {
					if (name in beds) {
						recordings[name] = seamless(buffer);
						loopOf(recordings[name]).connect(beds[name]);
					} else {
						recordings[name] = buffer;
					}
				})
				.catch(() => {}); // that part stays silent
		}
	}

	// The sound's parts, made the first time it's turned on. Everything runs
	// through `ambience` (which the hush at "It is finished" quiets) and a
	// limiter, so a near thunderclap can't clip.
	function build() {
		audio = new AudioContext({ latencyHint: "playback" });
		// iPhones otherwise play web sound only with the ringer on.
		if (navigator.audioSession) navigator.audioSession.type = "playback";
		buffers = {
			white: noise(4, "white"),
			pink: noise(6, "pink"),
			brown: noise(6, "brown"),
		};
		master = gain(0);
		chain(
			master,
			new DynamicsCompressorNode(audio, {
				threshold: -8,
				knee: 2,
				ratio: 20,
				attack: 0.003,
				// Slow to let go, so the scene swells back gently after a
				// thunderclap or a tremor rather than jumping.
				release: 1,
			}),
			// The limiter adds its own boost; this keeps the loudest cracks
			// just under full scale.
			gain(0.8),
			audio.destination,
		);
		ambience = gain(1);
		ambience.connect(master);

		// An echo off the hills for thunder, the quake and far-off sounds.
		echo = new DelayNode(audio, { delayTime: 0.38 });
		const echoTone = filter("lowpass", 900);
		chain(echo, echoTone, gain(0.35), echo);
		chain(echoTone, gain(0.6), ambience);

		// Wind: a broad rush that brightens as it blows harder, and a hollow
		// whistle that only a strong wind brings out.
		wind = {
			body: filter("lowpass", 400),
			level: gain(),
			whistle: filter("bandpass", 900, 6),
			whistleLevel: gain(),
		};
		chain(loopOf(buffers.pink), wind.body, wind.level, ambience);
		chain(
			loopOf(buffers.pink, 1.07),
			wind.whistle,
			wind.whistleLevel,
			ambience,
		);

		// Heavy rain: a hiss of many drops, and the low roar of a downpour.
		rain = {
			hiss: gain(),
			hissTone: filter("lowpass", 6000),
			roar: gain(),
		};
		chain(
			loopOf(buffers.white),
			filter("highpass", 1000),
			rain.hissTone,
			rain.hiss,
			ambience,
		);
		chain(
			loopOf(buffers.brown),
			filter("lowpass", 500),
			rain.roar,
			ambience,
		);

		// The recorded beds, each at its own level (see update). The crowd's
		// voices are dulled by distance while they're in the city, and echo
		// off its walls.
		beds = Object.fromEntries(bedNames.map((name) => [name, gain()]));
		crowdTone = filter("lowpass", 1400);
		chain(crowdTone, ambience);
		chain(crowdTone, gain(0.4), echo);
		for (const [name, bed] of Object.entries(beds)) {
			bed.connect(name === "crowd" ? crowdTone : ambience);
		}
		events = newEvents();
		loadRecordings();

		document.addEventListener("scenesettings", update);
		document.addEventListener("lightning", (event) =>
			thunder(event.detail),
		);
		document.addEventListener("earthquake", (event) =>
			earthquake(event.detail),
		);
		gusts();
		heartbeat();
		callOut();
	}

	// One-off sounds (thunder, the quake, the crowd's outbursts, the hammer)
	// go through their own channel, so a jump in time can fade out any still
	// sounding, like the storm's last rumbles when the day starts over. The
	// crowd's are dulled with distance like its murmur.
	function newEvents() {
		// Straight to the output, so the hush and the heartbeat's quiet can't
		// swallow a thunderclap.
		const bus = gain(1);
		bus.connect(master);
		const echoes = gain(1); // what they send to the hills' echo
		echoes.connect(echo);
		const crowd = filter("lowpass", crowdTone.frequency.value);
		chain(crowd, bus);
		chain(crowd, gain(0.4), echoes);
		return { bus, echoes, crowd };
	}

	// How loud each part is through the day, as [hour, level] points.
	const hours = {
		birds: [
			[6, 0],
			[6.3, 0.5],
			[6.8, 1],
			[9, 0.8],
			[11.5, 0.5],
			[11.8, 0],
		],
		crickets: [
			[6, 1],
			[6.5, 0.3],
			[6.9, 0],
			[11.9, 0],
			[12.4, 0.8],
			[15, 0.6],
		],
		// How many people murmur: a crowd at the trials, the most when it
		// cries out at 7:00 and 8:00, a procession, the mockers at the cross,
		// then nearly no one in the darkness.
		crowd: [
			[6, 0.35],
			[6.4, 0.45],
			[6.9, 0.8],
			[7.2, 1],
			[7.5, 0.6],
			[7.9, 1],
			[8.3, 0.7],
			[8.6, 0.8],
			[9.2, 0.6],
			[10.1, 0.5],
			[10.4, 0.7],
			[10.8, 0.35],
			[11.75, 0.25],
			[12.1, 0.1],
			[14.7, 0.06],
			[14.75, 0],
		],
	};
	// When some jeer and laugh (Herod's men, the soldiers at the scourging and
	// casting lots, the mockers at the cross), and when women weep: on the
	// road to Golgotha and as he gives his mother into John's care.
	const jeering = [
		[6.4, 6.9],
		[7.35, 7.9],
		[9.35, 9.75],
		[10.1, 10.7],
	];
	const during = (spans, hour) =>
		spans.some(([from, to]) => hour >= from && hour < to);

	// Each part's level (each scene update, about once a second as the clock
	// runs).
	let wasJumping = false;
	let storm = 0; // the wind: 0 calm, 1 a gale
	let gust = 1;
	function update() {
		if (!audio) return;
		const hour = sceneSettings.hour;
		// A jump fades out what's still sounding from before, and the storm
		// eases over it rather than following every step.
		if (jumping() && !wasJumping) {
			const old = events;
			glide(old.bus.gain, 0, 1);
			glide(old.echoes.gain, 0, 1);
			setTimeout(() => {
				old.bus.disconnect();
				old.echoes.disconnect();
			}, 2000);
			events = newEvents();
		}
		wasJumping = jumping();
		const ease = wasJumping ? 2 : 0.5;
		// 0 dry, 1 a downpour (the rain curve runs to 14x the original).
		const wet =
			(reducedMotion ? 0 : Math.log1p(byWeather(weatherCurves.rain))) /
			Math.log1p(14);
		storm = clamp((byWeather(weatherCurves.wind) - 0.35) / 1.55, 0, 1);
		setWind();
		glide(beds["rain-light"].gain, 0.25 * Math.min(1, wet / 0.2), ease);
		glide(rain.hiss.gain, 0.22 * wet ** 1.3, ease);
		glide(rain.hissTone.frequency, 3500 + 6000 * wet, ease);
		glide(
			rain.roar.gain,
			0.3 * clamp((wet - 0.35) / 0.65, 0, 1) ** 1.5,
			ease,
		);
		// Birds hide from a storm; crickets go quiet in the rain. During a jump
		// they ease slowly, rather than swelling with each hour passed on the
		// way.
		const slow = wasJumping ? 5 : 2;
		const calm = clamp((0.75 - sceneSettings.weatherIntensity) / 0.4, 0, 1);
		glide(
			beds.birds.gain,
			0.09 * alongCurve(hours.birds, hour) * calm,
			slow,
		);
		glide(
			beds.crickets.gain,
			0.12 * alongCurve(hours.crickets, hour) * (1 - wet),
			slow,
		);
		glide(beds.crowd.gain, 0.3 * alongCurve(hours.crowd, hour), slow);
		glide(beds.weeping.gain, hour >= 8.45 && hour < 9.2 ? 0.22 : 0, slow);
		glide(
			beds["weeping-soft"].gain,
			hour >= 11.2 && hour < 11.7 ? 0.2 : 0,
			slow,
		);
		// Nearer once the procession leaves the city for Golgotha.
		for (const tone of [crowdTone, events.crowd]) {
			glide(tone.frequency, hour < 8.45 ? 1400 : 3200, 3);
		}
		passMoments();
		// The world falls away under the heartbeat and goes almost silent at
		// "It is finished" (2:55); then the wind and rain rise back with each
		// minute, slowly at first, to the full storm at 3:00.
		const finished = 14 + 55 / 60;
		const quiet =
			hour >= finished && hour < 15
				? 0.15 + 0.85 * ((hour - finished) / (15 - finished)) ** 1.5
				: heartbeatAt(hour) < 1
					? 0.4
					: 1;
		glide(ambience.gain, quiet, 2);
	}

	// The wind swells and eases over a few seconds, never jumping.
	function setWind() {
		glide(wind.level.gain, (0.06 + 0.14 * storm ** 1.2) * gust, 4);
		glide(wind.body.frequency, (300 + 900 * storm) * gust, 4);
		glide(wind.whistleLevel.gain, storm ** 2 * gust, 4);
	}
	function gusts() {
		gust = randomBetween(0.8, 1.2);
		if (audible()) {
			glide(wind.whistle.frequency, randomBetween(700, 1300), 5);
			setWind();
		}
		setTimeout(gusts, randomBetween(1500, 5000));
	}

	// Thunder and the earthquake must never go missing. With sound on and the
	// page in view, audio the browser has paused on its own (Safari can, when
	// another app takes the sound) is woken; what's scheduled then plays.
	function wake() {
		if (!audio || !sceneSettings.sound || document.hidden) return false;
		if (audio.state !== "running") audio.resume();
		return true;
	}

	// Thunder for each lightning strike (storm.js says where it struck).
	const strikes = {
		near: {
			delay: [0.05, 0.3],
			seconds: [4, 7],
			loud: 4,
			tone: 2800,
			crack: 1,
		},
		middle: {
			delay: [0.9, 2.2],
			seconds: [5, 8],
			loud: 3,
			tone: 1200,
			crack: 0.25,
		},
		far: {
			delay: [2.5, 5],
			seconds: [6, 10],
			loud: 2,
			tone: 500,
			crack: 0,
		},
	};
	function thunder({ distance, x }) {
		if (!wake()) return;
		const strike = strikes[distance];
		const at = audio.currentTime + randomBetween(...strike.delay);
		const seconds = randomBetween(...strike.seconds);
		const place = new StereoPannerNode(audio, {
			pan: clamp((x - 50) / 50, -1, 1) * 0.8,
		});
		place.connect(events.bus);
		place.connect(events.echoes);
		// The rumble: rolls of deep noise, darkening as they die away.
		const tone = filter("lowpass", strike.tone, 0.8);
		tone.frequency.setValueAtTime(strike.tone, at);
		tone.frequency.exponentialRampToValueAtTime(140, at + seconds);
		const loud = gain();
		loud.gain.setValueCurveAtTime(rolls(seconds, strike.loud), at, seconds);
		const rumble = loopOf(buffers.brown, randomBetween(0.85, 1.15), at);
		chain(rumble, tone, loud, place);
		rumble.stop(at + seconds);
		rumble.onended = () => place.disconnect();
		// The crack of a strike close by.
		if (strike.crack)
			crack(at, strike.crack, filter("highpass", 1500), place);
	}

	// A rumble's loudness over time: a few rolls, each swelling fast and
	// dying slowly, the first the biggest, all fading out, with a flutter.
	function rolls(seconds, loud) {
		const peaks = Array.from(
			{ length: 2 + Math.floor(Math.random() * 4) },
			(_, i) => ({
				at: i ? randomBetween(0.05, 0.55) : randomBetween(0, 0.04),
				size: i ? randomBetween(0.3, 0.85) : 1,
				fall: randomBetween(0.04, 0.14),
			}),
		);
		const curve = new Float32Array(Math.round(seconds * 60));
		for (let i = 1; i < curve.length; i++) {
			const t = i / (curve.length - 1);
			let level = 0;
			for (const { at, size, fall } of peaks) {
				const after = t - at;
				level +=
					size *
					(after < 0
						? Math.exp(-((after / 0.015) ** 2))
						: Math.exp(-after / fall));
			}
			curve[i] = loud * level * (1 - t) * randomBetween(0.75, 1);
		}
		return curve;
	}

	// A sharp crackle of noise, through `tone`, dying away in half a second.
	function crack(at, loud, tone, to) {
		const curve = new Float32Array(120);
		for (let i = 1; i < curve.length; i++) {
			curve[i] =
				loud * Math.random() ** 3 * Math.exp((-4 * i) / curve.length);
		}
		const level = gain();
		level.gain.setValueCurveAtTime(curve, at, 0.5);
		const noise = loopOf(buffers.white, 1, at);
		chain(noise, tone, level, to);
		noise.stop(at + 0.5);
	}

	// While they mock him, a burst of laughter or a few seconds of jeering
	// now and then, from a random part of each recording.
	function callOut() {
		if (audible() && !jumping() && during(jeering, sceneSettings.hour)) {
			const at = audio.currentTime + 0.05;
			const laughing = Math.random() < 0.5;
			const recording = recordings[laughing ? "laughter" : "mob-angry"];
			if (recording) {
				const seconds = randomBetween(3, 6);
				play(recording, at, events.crowd, {
					loud: laughing ? 0.35 : 0.25,
					from: Math.random() * (recording.duration - seconds),
					seconds,
					fade: 0.6,
				});
			}
		}
		setTimeout(callOut, randomBetween(4000, 9000));
	}

	// A heartbeat from "Why hast thou forsaken me?" (2:45 PM), slowing and
	// fading until "It is finished" (2:55), when it stops.
	const heartbeatAt = (hour) =>
		hour >= 14.75 ? (hour - 14.75) / (14 + 55 / 60 - 14.75) : 1;
	function heartbeat() {
		const along = heartbeatAt(sceneSettings.hour);
		let wait = 0.5;
		if (audible() && !jumping() && along < 1 && recordings.heartbeat) {
			play(recordings.heartbeat, audio.currentTime, master, {
				loud: 1 - 0.5 * along,
				fade: 0.01,
			});
			wait = 60 / (66 - 28 * along);
		}
		setTimeout(heartbeat, wait * 1000);
	}

	// The mob crying out, in the city: "Not this man, but Barabbas" and
	// "Crucify him!" (John 18:40; Mark 15:13-14) at 7:00, "Crucify him,
	// crucify him" (John 19:6) at 8:00.
	function mob(at) {
		if (!recordings.mob) return;
		play(recordings.mob, at, events.crowd, { loud: 0.6, fade: 0.3 });
		if (recordings["mob-angry"]) {
			play(recordings["mob-angry"], at + 1, events.crowd, {
				loud: 0.4,
				from: randomBetween(0, 12),
				seconds: 12,
				fade: 1,
			});
		}
	}

	// Moments of the day, as the running clock reaches them or a jump lands
	// on one (not when the time slider sweeps past several at once).
	const moments = [
		[7, mob], // "Barabbas is released"
		[8, mob], // "Behold the man!"
		[9, nails], // "Crucified at the third hour"
	];
	let lastHour = sceneSettings.hour;
	function passMoments() {
		const hour = sceneSettings.hour;
		for (const [at, happen] of moments) {
			const reached = jumping()
				? Math.abs(hour - at) < 1e-6 && Math.abs(lastHour - at) >= 1e-6
				: lastHour < at && hour >= at && hour - lastHour < 0.1;
			if (reached && audible()) happen(audio.currentTime + 0.3);
		}
		lastHour = hour;
	}

	// Hammer blows, far off, echoing off the hills.
	function nails(at) {
		if (!recordings["hammer-v2"]) return;
		const far = filter("lowpass", 3200);
		const place = new StereoPannerNode(audio, { pan: -0.15 });
		chain(far, place, events.bus);
		place.connect(events.echoes);
		// Two runs of steady blows on wood with a pause between (one blow
		// repeated, then another), pitched down to weigh more.
		play(recordings["hammer-v2"], at, far, { loud: 0.35 });
	}

	// Each tremor (earthquakes() in land.js shakes the scene at the same
	// moment): the ground's deep roar, heaving like the shaking, and stones
	// knocking and falling. The first, at 3 PM, begins with the temple veil
	// tearing and the rocks splitting (Matthew 27:51), and the crowd crying
	// out in fear.
	function earthquake({ seconds, strength, first }) {
		if (!wake()) return;
		const at = audio.currentTime;
		// The first is the big one; the aftershocks every few seconds roll in
		// and out more softly, so the storm isn't jolted up and down.
		const length = seconds + (first ? 1 : 2.5);
		const size = strength * (first ? 1 : 0.35);
		buffers.rubble ??= rubble(4);
		const parts = [
			// The roar, slowed to deepen it, and a note below hearing that
			// big speakers and headphones feel.
			[loopOf(buffers.brown, 0.7, at), filter("lowpass", 260, 1.2), 4],
			[new OscillatorNode(audio, { frequency: 38 }), gain(1), 1],
			[loopOf(buffers.rubble, randomBetween(0.85, 1.15), at), gain(1), 2],
		];
		for (const [source, tone, loud] of parts) {
			const level = gain();
			level.gain.setValueCurveAtTime(
				heave(length, loud * size, first ? 0.15 : 0.4),
				at,
				length,
			);
			chain(source, tone, level, events.bus);
			if (source instanceof OscillatorNode) source.start(at);
			source.stop(at + length);
		}
		if (!first) return;
		if (recordings.tear) {
			const temple = gain(1);
			temple.connect(events.bus);
			temple.connect(events.echoes);
			play(recordings.tear, at, temple, { loud: 0.6 });
		}
		if (recordings.gasp) {
			play(recordings.gasp, at + 0.4, events.crowd, {
				loud: 0.5,
				fade: 0.1,
			});
		}
		if (recordings.panic) {
			play(recordings.panic, at + 1.2, events.crowd, {
				loud: 0.3,
				fade: 0.5,
			});
		}
		// The rocks split: a dull crack and a deep boom.
		const rocks = gain(1);
		rocks.connect(events.bus);
		rocks.connect(events.echoes);
		crack(at + 0.2, 1.2, filter("bandpass", 700, 0.8), rocks);
		const boom = loopOf(buffers.brown, 0.6, at + 0.2);
		const level = gain();
		level.gain.setValueAtTime(0, at + 0.2);
		level.gain.linearRampToValueAtTime(2.2, at + 0.23);
		level.gain.setTargetAtTime(0, at + 0.23, 0.6);
		chain(boom, filter("lowpass", 220), level, rocks);
		boom.stop(at + 4);
	}

	// A tremor's loudness: swells in over `rise` of its length (fast for the
	// first, like the scene's jolt) and dies away smoothly to its end,
	// heaving a few times a second.
	function heave(length, loud, rise) {
		const rate = randomBetween(4, 7);
		const curve = new Float32Array(Math.round(length * 50));
		for (let i = 1; i < curve.length; i++) {
			const along = i / (curve.length - 1);
			const shape = Math.min(1, along / rise) * (1 - along) ** 1.5;
			const wobble =
				0.7 + 0.3 * Math.sin(2 * Math.PI * rate * along * length);
			curve[i] = loud * shape * wobble * randomBetween(0.85, 1);
		}
		return curve;
	}
}
