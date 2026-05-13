// Cloudflare Worker - GitHub Pages 国内加速代理
export default {
  async fetch(request, env, ctx) {
    const url = new URL(request.url);
    
    // 代理 GitHub Pages（添加时间戳避免缓存问题）
    const githubUrl = `https://lbk1818.github.io/work-log-app/${url.pathname}${url.search}`;
    
    try {
      const response = await fetch(githubUrl, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
          'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
          'Accept-Language': 'zh-CN,zh;q=0.9,en;q=0.8'
        },
        redirect: 'follow'
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
      return new Response(`Error: ${error.message}`, { status: 500 });
    }
  }
};
