export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    // Try to serve static asset first
    try {
      return await env.ASSETS.fetch(request);
    } catch (e) {
      // Fall through to SPA fallback
    }
    // SPA fallback — serve index.html for all non-asset routes
    const response = await env.ASSETS.fetch(new Request(new URL('/index.html', url.origin), request));
    return response;
  }
}
