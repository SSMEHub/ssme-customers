export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    // Try serving the requested path as a static asset
    let response = await env.ASSETS.fetch(request);
    // If the asset doesn't exist (404), serve index.html for SPA routing
    if (response.status === 404) {
      response = await env.ASSETS.fetch(new URL('/index.html', url.origin).toString());
    }
    return response;
  }
}
