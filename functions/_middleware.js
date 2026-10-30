// One public address: antikytheraexhibit.com.
// www, the misspelled antikytherexhibit.com and the old pages.dev address forward there. Only the
// page entry routes reach this function (see _routes.json: "/", "/index.html" and "/about" are added
// after finish-site.mjs writes the video routes), so media is still served directly on any host.
// Preview deployments (<hash>.antikythera-5fq.pages.dev) are left alone.
//
// For now the address itself opens the exhibit: someone who types it in, or follows it from an email,
// lands on the working machine. Visitors who come from the Samizdat Publications hub see the landing
// page, and /about or ?landing always shows it.
const HOME = 'antikytheraexhibit.com';
const EXHIBIT = 'https://antikythera.stewartgregerson.workers.dev/';
const PERMANENT = new Set([`www.${HOME}`, 'antikytherexhibit.com', 'www.antikytherexhibit.com']);
const HUB = ['samizdatpublications.com', 'samizdat-e0x.pages.dev', 'samizdat-publications.github.io'];

function fromHub(request) {
  const ref = request.headers.get('Referer');
  if (!ref) return false;
  try {
    const host = new URL(ref).hostname;
    return host === HOME || HUB.some((h) => host === h || host.endsWith('.' + h));
  } catch {
    return false;
  }
}

export async function onRequest({ request, next, env }) {
  const url = new URL(request.url);
  const fromPagesDev = url.hostname === 'antikythera-5fq.pages.dev';
  if (fromPagesDev || PERMANENT.has(url.hostname)) {
    url.hostname = HOME;
    url.protocol = 'https:';
    url.port = '';
    // 302 from pages.dev (easy to undo), 301 for the other names (permanent).
    return Response.redirect(url.toString(), fromPagesDev ? 302 : 301);
  }
  if (url.hostname === HOME) {
    if (url.pathname === '/about') return env.ASSETS.fetch(new URL('/', url));
    const page = url.pathname === '/' || url.pathname === '/index.html';
    if (page && !url.searchParams.has('landing') && !fromHub(request)) {
      return new Response(null, {
        status: 302,
        headers: { Location: EXHIBIT, 'Cache-Control': 'no-store', Vary: 'Referer' },
      });
    }
  }
  return next();
}
