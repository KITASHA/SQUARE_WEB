// Retained pages are complete HTML files. No database, login or write routes.
const retired = /^\/(?:bands|gigs|topics|releases|login|logout|sessions|admin)(?:\/|$|\.html$)/;
const enrollment = /^\/events(?:\/|$|\.html$)/;
const settings = /^\/homes\/(?:option|workshop)(?:\/|$|\.html$)/;

function headersFor(response, preview, head) {
  const headers = new Headers(response.headers);
  headers.set('X-Content-Type-Options', 'nosniff');
  headers.set('Referrer-Policy', 'strict-origin-when-cross-origin');
  headers.set('Permissions-Policy', 'camera=(), microphone=(), geolocation=()');
  headers.set('X-Frame-Options', 'DENY');
  if (preview) headers.set('X-Robots-Tag', 'noindex, nofollow');
  return new Response(head ? null : response.body, {
    status: response.status, statusText: response.statusText, headers
  });
}

export default {
  async fetch(request, env) {
    const preview = env.PREVIEW === 'true';
    const head = request.method === 'HEAD';
    let response;
    if (request.method !== 'GET' && !head) {
      response = new Response('Method Not Allowed', { status: 405, headers: { Allow: 'GET, HEAD' } });
    } else {
      const { pathname } = new URL(request.url);
      let destination;
      if (enrollment.test(pathname)) destination = '/homes/join';
      else if (retired.test(pathname) || settings.test(pathname)) destination = '/';
      if (destination) {
        response = new Response(null, { status: 301, headers: { Location: destination } });
      } else {
        response = await env.ASSETS.fetch(request);
      }
    }
    return headersFor(response, preview, head);
  }
};
