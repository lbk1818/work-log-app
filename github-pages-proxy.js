// Cloudflare Worker - GitHub Pages 国内加速代理
export default {
  async fetch(request, env, ctx) {
    const url = new URL(request.url);
    
    // 代理 GitHub Pages
    const githubUrl = `https://lbk1818.github.io/work-log-app/${url.pathname}`;
    
    try {
      const response = await fetch(githubUrl, {
        headers: {
          'User-Agent': request.headers.get('User-Agent') || ''
        }
      });
      
      // 添加 CORS 和缓存头
      const newHeaders = new Headers(response.headers);
      newHeaders.set('Access-Control-Allow-Origin', '*');
      newHeaders.set('Cache-Control', 'public, max-age=3600');
      
      return new Response(response.body, {
        status: response.status,
        headers: newHeaders
      });
    } catch (error) {
      return new Response('Error: ' + error.message, { status: 500 });
    }
  }
};
