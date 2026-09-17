// The exhibit off the network. The machine is some twenty megabytes of model, textures and sky
// data, so a visitor who comes back, and a kiosk left running on a gallery floor, should find it
// on the shelf rather than on the wire. Plain JavaScript, not bundled and not type-checked:
// Vite copies public/ into the build as it stands.

const CACHE = "antikythera-v1";

// the heavy parts of the exhibit: the machine, the room it stands in, the sky it is checked against
const SHELVED = ["/models/", "/hdri/", "/textures/", "/data/", "/icons/", "/still/"];

// only a whole, first-hand 200 is worth keeping; an opaque or partial answer cannot be replayed
const storable = (res) => res.status === 200 && res.type !== "opaque" && res.type !== "opaqueredirect";

// put a copy on the shelf, the writing finished after the visitor already has the answer
function store(event, cache, req, res) {
  if (storable(res)) event.waitUntil(cache.put(req, res.clone()).catch(() => { /* no room on the shelf */ }));
}

self.addEventListener("install", () => self.skipWaiting());

self.addEventListener("activate", (event) => {
  event.waitUntil((async () => {
    for (const name of await caches.keys()) if (name !== CACHE) await caches.delete(name);
    await self.clients.claim();
  })());
});

self.addEventListener("fetch", (event) => {
  const req = event.request;
  if (req.method !== "GET") return;
  const url = new URL(req.url);
  if (url.origin !== location.origin) return;
  if (req.mode === "navigate") { event.respondWith(pageFirst(event)); return; }
  if (url.pathname.startsWith("/assets/")) { event.respondWith(cacheFirst(event)); return; }
  if (SHELVED.some((dir) => url.pathname.startsWith(dir))) { event.respondWith(shelfFirst(event)); return; }
  // everything else is left to the browser, /audio/ above all: a media element asks for byte
  // ranges, and a whole response handed back to a range request leaves Safari with silence.
});

// the page itself: the network first, so a new build is picked up the moment it is deployed, and
// the page that last loaded when there is no network to ask. The query is dropped from the key
// because the exhibit writes its whole state into it, so a visitor who set a date, or followed a
// shared address, would otherwise ask the shelf for a page nobody had ever loaded.
async function pageFirst(event) {
  const cache = await caches.open(CACHE);
  const url = new URL(event.request.url);
  const key = new Request(url.origin + url.pathname);
  try {
    const res = await fetch(event.request);
    store(event, cache, key, res);
    return res;
  } catch (err) {
    const shelved = await cache.match(key);
    if (shelved) return shelved;
    throw err;
  }
}

// Vite's hashed bundles: the name changes whenever the contents do, so a copy is never stale
async function cacheFirst(event) {
  const cache = await caches.open(CACHE);
  const shelved = await cache.match(event.request);
  if (shelved) return shelved;
  const res = await fetch(event.request);
  store(event, cache, event.request, res);
  return res;
}

// the heavy parts: hand over the copy on the shelf at once and fetch a fresh one behind the
// visitor, so the exhibit opens instantly and still follows the next deployment
async function shelfFirst(event) {
  const cache = await caches.open(CACHE);
  const shelved = await cache.match(event.request);
  if (shelved) {
    event.waitUntil(refresh(cache, event.request));
    return shelved;
  }
  const res = await fetch(event.request);
  store(event, cache, event.request, res);
  return res;
}

async function refresh(cache, req) {
  try {
    const res = await fetch(req);
    if (storable(res)) await cache.put(req, res);
  } catch { /* no network: the copy on the shelf stands */ }
}
