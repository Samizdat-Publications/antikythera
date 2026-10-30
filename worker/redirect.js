// antikythera.stewartgregerson.workers.dev, the exhibit's first address, now only forwards to
// antikytheraexhibit.com, keeping the path and the query (the exhibit keeps its whole state there,
// so a shared link still opens the same view). The exhibit itself is served by the Cloudflare Pages
// project `antikythera` (tools/build-pages.mjs). To serve the exhibit from this Worker again, put
// back `[assets] directory = "web/dist"` in wrangler.toml and drop `main`.
const HOME = 'https://antikytheraexhibit.com';

export default {
  fetch(request) {
    const url = new URL(request.url);
    return Response.redirect(HOME + url.pathname + url.search, 301);
  },
};
