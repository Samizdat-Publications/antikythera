// One public address: antikytheraexhibit.com, which serves the exhibit itself at / and the landing
// page at /landing (the Pages build puts web/dist at the root and site/index.html at landing.html, see
// tools/build-pages.mjs). www, the misspelled antikytherexhibit.com and the old pages.dev address
// forward there. Only the routes listed in _routes.json reach this function: the page entries plus
// the videos and the narration, which need byte ranges. Preview deployments
// (<hash>.antikythera-5fq.pages.dev) are left alone.
const HOME = 'antikytheraexhibit.com';
const PERMANENT = new Set([`www.${HOME}`, 'antikytherexhibit.com', 'www.antikytherexhibit.com']);

export async function onRequest({ request, next }) {
  const url = new URL(request.url);
  const fromPagesDev = url.hostname === 'antikythera-5fq.pages.dev';
  if (fromPagesDev || PERMANENT.has(url.hostname)) {
    url.hostname = HOME;
    url.protocol = 'https:';
    url.port = '';
    // 302 from pages.dev (easy to undo), 301 for the other names (permanent).
    return Response.redirect(url.toString(), fromPagesDev ? 302 : 301);
  }
  // the landing page's older addresses: /about, /landing/ and ?landing on the root
  if (url.pathname === '/about' || url.pathname === '/landing/' || (url.pathname === '/' && url.searchParams.has('landing'))) {
    return Response.redirect(`${url.origin}/landing`, 301);
  }
  return next();
}
