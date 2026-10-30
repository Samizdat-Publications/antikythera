// Keeps the exhibit's heavy files in Cloudflare's edge cache.
//
// Cloudflare caches by file extension, and .glb, .json and .hdr are not on its list, so the model,
// the eclipse canons and the skies came from the Pages asset store on every request. Read cold, after
// a few quiet minutes, the store gave the 13 MB model at a few hundred KB/s: half a minute or more
// before the machine appeared, on a line that fetches the same file warm in a second and a half.
// This function answers from the data centre's cache instead and fills it on a miss.
//
// The cache key carries the build id (functions/build.json, written by tools/build-pages.mjs on every
// build), so a new deployment never gets the old model; the visitor's own copy is still revalidated
// against its ETag as before, and the service worker's shelf works as it did. Routed here for
// /models/*, /hdri/* and /data/* (see _routes.json); the other two folders re-export this.

import build from '../build.json';

const KEEP = 'public, max-age=31536000';

export async function onRequest({ request, next, waitUntil }) {
  if (request.method !== 'GET' || request.headers.has('Range')) return next();
  const url = new URL(request.url);
  const key = new Request(`${url.origin}${url.pathname}?build=${build.id}`);
  const cache = caches.default;
  let res = await cache.match(key);
  const hit = Boolean(res);
  if (!res) {
    const fresh = await next();
    if (fresh.status !== 200) return fresh;
    const stored = new Response(fresh.body, fresh);
    stored.headers.set('Cache-Control', KEEP);
    res = stored.clone();
    waitUntil(cache.put(key, stored));
  }
  const etag = res.headers.get('ETag');
  if (etag && request.headers.get('If-None-Match') === etag) {
    return new Response(null, { status: 304, headers: { ETag: etag, 'Cache-Control': 'public, max-age=0, must-revalidate' } });
  }
  const out = new Response(res.body, res);
  out.headers.set('Cache-Control', 'public, max-age=0, must-revalidate');
  out.headers.set('X-Edge-Cache', hit ? 'hit' : 'miss');
  return out;
}
