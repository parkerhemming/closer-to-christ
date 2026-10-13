// Keeps the scene's images on the device so they only ever download once.
//
// Images under assets/ are served from the cache forever after the first
// visit. Pages, scripts and styles try the network first so edits show up
// right away, and fall back to the cache when offline.
//
// Replacing an image in place (same filename)? Bump CACHE so visitors get
// the new file; the old cache is deleted when the new worker activates.
const CACHE = "closer-to-christ-v2";

self.addEventListener("install", () => self.skipWaiting());

self.addEventListener("activate", (event) => {
	event.waitUntil(
		caches
			.keys()
			.then((keys) =>
				Promise.all(
					keys
						.filter((key) => key !== CACHE)
						.map((key) => caches.delete(key)),
				),
			)
			.then(() => self.clients.claim()),
	);
});

self.addEventListener("fetch", (event) => {
	const { request } = event;
	const url = new URL(request.url);
	if (request.method !== "GET" || url.origin !== location.origin) return;

	event.respondWith(
		url.pathname.includes("/assets/")
			? cacheFirst(request)
			: networkFirst(request),
	);
});

async function cacheFirst(request) {
	const cached = await caches.match(request);
	if (cached) return cached;
	const response = await fetch(request);
	if (response.ok) (await caches.open(CACHE)).put(request, response.clone());
	return response;
}

async function networkFirst(request) {
	try {
		// Always check with the server: without this the browser's own cache
		// could hand back an old page or stylesheet after an edit.
		const response = await fetch(request, { cache: "no-cache" });
		if (response.ok)
			(await caches.open(CACHE)).put(request, response.clone());
		return response;
	} catch {
		return (await caches.match(request)) ?? Response.error();
	}
}
