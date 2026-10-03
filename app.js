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

function parallax() {
	const layers = document.getElementsByClassName("layer");

	document.addEventListener("mousemove", (event) => {
		const x = event.clientX - window.innerWidth / 2;
		const y = event.clientY - window.innerHeight / 2;

		for (const layer of layers) {
			const depth = layer.dataset.z_index * 0.0005;
			layer.style.translate = `${x * depth}px ${y * depth}px`;
		}
	});
}
