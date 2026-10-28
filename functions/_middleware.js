// One public address for the landing page: antikytheraexhibit.com.
// www, the misspelled antikytherexhibit.com and the old pages.dev address forward there. Only the
// page entry routes reach this function (see _routes.json: "/" and "/index.html" are added after
// finish-site.mjs writes the video routes), so media is still served directly on any host.
// Preview deployments (<hash>.antikythera-5fq.pages.dev) are left alone.
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
  return next();
}
