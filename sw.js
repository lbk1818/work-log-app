// Service Worker - 支持离线使用
const CACHE_NAME = 'work-log-v6.0-cache'; // 更新版本号强制刷新缓存
const urlsToCache = [
    './',
    './index.html',
    './mobile-app.js',
    './mobile-manifest.json'
];

// 安装 Service Worker - 立即激活
self.addEventListener('install', event => {
    self.skipWaiting(); // 跳过等待，立即激活新版本
    event.waitUntil(
        caches.open(CACHE_NAME)
            .then(cache => {
                console.log('Opened cache');
                return cache.addAll(urlsToCache);
            })
    );
});

// 激活时清理旧缓存
self.addEventListener('activate', event => {
    event.waitUntil(
        caches.keys().then(cacheNames => {
            return Promise.all(
                cacheNames.map(cacheName => {
                    if (cacheName !== CACHE_NAME) {
                        console.log('Deleting old cache:', cacheName);
                        return caches.delete(cacheName);
                    }
                })
            );
        })
    );
});

// 拦截请求 - 优先网络，离线才用缓存
self.addEventListener('fetch', event => {
    // 只对 GET 请求进行处理
    if (event.request.method !== 'GET') return;
    
    // HTML 和 JS 文件：优先从网络获取，失败再用缓存
    if (event.request.url.includes('.html') || 
        event.request.url.includes('.js') ||
        event.request.url.endsWith('/')) {
        event.respondWith(
            fetch(event.request)
                .then(response => {
                    // 网络请求成功，更新缓存
                    if (response && response.status === 200) {
                        const responseToCache = response.clone();
                        caches.open(CACHE_NAME).then(cache => {
                            cache.put(event.request, responseToCache);
                        });
                    }
                    return response;
                })
                .catch(() => {
                    // 网络失败，使用缓存
                    return caches.match(event.request);
                })
        );
    } else {
        // 其他资源（图片、CSS等）：缓存优先
        event.respondWith(
            caches.match(event.request)
                .then(response => {
                    if (response) {
                        return response;
                    }
                    return fetch(event.request);
                })
        );
    }
});

// 消息处理 - 通知客户端更新
self.addEventListener('message', event => {
    if (event.data && event.data.type === 'SKIP_WAITING') {
        self.skipWaiting();
    }
});
