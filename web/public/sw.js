// The exhibit off the network. The machine is some twenty megabytes of model, textures and sky
// data, so a visitor who comes back, and a kiosk left running on a gallery floor, should find it
// on the shelf rather than on the wire. Plain JavaScript, not bundled and not type-checked:
// Vite copies public/ into the build as it stands.
//
// The shelf is filled on install rather than as the visitor happens to ask for things, so one
// visit is enough and the exhibit opens with no network afterwards.
//
// The worker assumes the site is served from the root of its origin: the `/assets/` test and the
// shelved prefixes below are absolute paths, and a deployment under a sub-path would miss them.

const CACHE = "antikythera-v4";

// the heavy parts of the exhibit: the machine, the room it stands in, the sky it is checked against
const SHELVED = ["/textures/", "/data/", "/icons/", "/still/"];

// the two heaviest, which change only with a deployment that bumps CACHE: answered from the shelf
// and never fetched again behind the visitor, which cost a returning visitor the ten-megabyte
// model on every visit
const FIXED = ["/models/", "/hdri/"];

// everything the exhibit needs to open with nothing to ask: the page, the machine and the fragment,
// the gear table, the two eclipse canons, the two skies, the Moon, the still shown without WebGL,
// and the marks the launcher and a shared link use
const PRECACHE = [
  "./",
  "./models/antikythera.glb",
  "./models/fragment_a.glb",
  "./data/gears.json",
  "./data/eclipses_solar.json",
  "./data/eclipses_lunar.json",
  "./hdri/studio_small_09_1k.hdr",
  "./hdri/artist_workshop_1k.hdr",
  "./textures/moon_1k.jpg",
  "./still/iso.jpg",
  "./icons/icon-192.png",
  "./icons/icon-512.png",
  "./icons/icon-512-maskable.png",
  "./manifest.webmanifest",
  "./og.jpg",
];

// the key a thing is shelved under: its address with the query dropped. The exhibit writes its
// whole state into the query, so the page has to be filed under its bare address, and the filling
// on install and the answering on fetch have to agree about that or neither ever finds the other.
const keyFor = (href) => { const u = new URL(href, location.href); return new Request(u.origin + u.pathname); };

// only a whole, first-hand 200 is worth keeping; an opaque or partial answer cannot be replayed
const storable = (res) => res.status === 200 && res.type !== "opaque" && res.type !== "opaqueredirect";

// put a copy on the shelf, the writing finished after the visitor already has the answer
function store(event, cache, req, res) {
  if (storable(res)) event.waitUntil(cache.put(req, res.clone()).catch(() => { /* no room on the shelf */ }));
}

// The shelf is filled here, one file at a time and each failure swallowed, so a file that is not
// in this build cannot keep the whole install from finishing; addAll would fail all of them.
self.addEventListener("install", (event) => {
  self.skipWaiting();
  event.waitUntil((async () => {
    const cache = await caches.open(CACHE);
    await Promise.all(PRECACHE.map((path) => cache.add(keyFor(path)).catch(() => { /* one absence is not a failure */ })));
  })());
});

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
  if (FIXED.some((dir) => url.pathname.startsWith(dir))) { event.respondWith(cacheFirst(event)); return; }
  if (SHELVED.some((dir) => url.pathname.startsWith(dir))) { event.respondWith(shelfFirst(event)); return; }
  // everything else is left to the browser, /audio/ above all: a media element asks for byte
  // ranges, and a whole response handed back to a range request leaves Safari with silence.
});

// the page itself: the network first, so a new build is picked up the moment it is deployed, and
// the page that last loaded when there is no network to ask. `keyFor` drops the query, which is
// where the exhibit keeps its whole state, so a visitor who set a date, or followed a shared
// address, does not ask the shelf for a page nobody had ever loaded.
async function pageFirst(event) {
  const cache = await caches.open(CACHE);
  const key = keyFor(event.request.url);
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

// Vite's hashed bundles, whose name changes whenever the contents do, and the model and the rooms,
// which change only with a new CACHE: a copy on the shelf is never stale
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
