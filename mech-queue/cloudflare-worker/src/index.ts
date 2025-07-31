export interface Env {
  ORIGIN_URL: string;
  METRICS_URL: string;
  // Add rate limiting with Durable Objects or KV if needed
}

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const url = new URL(request.url);
    
    // Handle CORS preflight
    if (request.method === 'OPTIONS') {
      return new Response(null, {
        headers: {
          'Access-Control-Allow-Origin': '*',
          'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
          'Access-Control-Allow-Headers': 'Content-Type, x-api-key',
          'Access-Control-Max-Age': '86400',
        },
      });
    }

    // Route to metrics endpoint
    if (url.pathname === '/metrics') {
      const metricsResponse = await fetch(env.METRICS_URL + '/metrics', {
        method: 'GET',
        headers: {
          'User-Agent': 'Cloudflare-Worker',
        },
      });

      return new Response(metricsResponse.body, {
        status: metricsResponse.status,
        headers: {
          'Content-Type': 'text/plain',
          'Cache-Control': 'no-cache, no-store, must-revalidate',
        },
      });
    }

    // Forward all other requests to the origin
    const originUrl = env.ORIGIN_URL + url.pathname + url.search;
    
    // Forward the request headers
    const headers = new Headers(request.headers);
    headers.set('X-Forwarded-For', request.headers.get('CF-Connecting-IP') || 'unknown');
    headers.set('X-Forwarded-Proto', 'https');
    headers.set('X-Real-IP', request.headers.get('CF-Connecting-IP') || 'unknown');

    try {
      const response = await fetch(originUrl, {
        method: request.method,
        headers: headers,
        body: request.body,
      });

      // Create response with CORS headers
      const responseHeaders = new Headers(response.headers);
      responseHeaders.set('Access-Control-Allow-Origin', '*');
      responseHeaders.set('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
      responseHeaders.set('Access-Control-Allow-Headers', 'Content-Type, x-api-key');
      
      // Add security headers
      responseHeaders.set('X-Content-Type-Options', 'nosniff');
      responseHeaders.set('X-Frame-Options', 'DENY');
      responseHeaders.set('X-XSS-Protection', '1; mode=block');

      return new Response(response.body, {
        status: response.status,
        statusText: response.statusText,
        headers: responseHeaders,
      });
    } catch (error) {
      return new Response(JSON.stringify({
        success: false,
        error: {
          code: 'PROXY_ERROR',
          message: 'Failed to reach origin server',
          details: error instanceof Error ? error.message : 'Unknown error',
        },
      }), {
        status: 502,
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*',
        },
      });
    }
  },
};