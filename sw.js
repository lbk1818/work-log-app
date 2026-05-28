// Service Worker - 离线缓存 + 后台提醒
const CACHE_NAME = 'work-log-v7.0';
const urlsToCache = [
    './',
    './index.html',
    './mobile-app.js',
    './user-auth.js',
    './mobile-manifest.json'
];

// ===== 安装：预缓存核心文件 =====
self.addEventListener('install', event => {
    self.skipWaiting();
    event.waitUntil(
        caches.open(CACHE_NAME).then(cache => {
            console.log('[SW] Caching core files');
            return cache.addAll(urlsToCache);
        })
    );
});

// ===== 激活：清理旧缓存 =====
self.addEventListener('activate', event => {
    event.waitUntil(
        caches.keys().then(cacheNames => {
            return Promise.all(
                cacheNames.map(cacheName => {
                    if (cacheName !== CACHE_NAME) {
                        console.log('[SW] Deleting old cache:', cacheName);
                        return caches.delete(cacheName);
                    }
                })
            );
        }).then(() => self.clients.claim())
    );
});

// ===== 请求拦截：网络优先，离线回退缓存 =====
self.addEventListener('fetch', event => {
    if (event.request.method !== 'GET') return;

    // HTML/JS 文件：网络优先
    if (event.request.url.includes('.html') ||
        event.request.url.includes('.js') ||
        event.request.url.endsWith('/')) {
        event.respondWith(
            fetch(event.request)
                .then(response => {
                    if (response && response.status === 200) {
                        const cloned = response.clone();
                        caches.open(CACHE_NAME).then(cache => {
                            cache.put(event.request, cloned);
                        });
                    }
                    return response;
                })
                .catch(() => caches.match(event.request))
        );
    } else {
        // 其他资源：缓存优先
        event.respondWith(
            caches.match(event.request)
                .then(response => response || fetch(event.request))
        );
    }
});

// ===== 消息处理 =====
self.addEventListener('message', event => {
    if (event.data && event.data.type === 'SKIP_WAITING') {
        self.skipWaiting();
    }
    if (event.data && event.data.type === 'CHECK_REMINDER') {
        checkAndNotify();
    }
});

// ===== Periodic Background Sync（Android Chrome 支持）=====
self.addEventListener('periodicsync', event => {
    if (event.tag === 'bedtime-reminder') {
        console.log('[SW] Periodic sync triggered:', event.tag);
        event.waitUntil(checkAndNotify());
    }
});

// ===== 推送通知点击 =====
self.addEventListener('notificationclick', event => {
    event.notification.close();
    event.waitUntil(
        clients.matchAll({ type: 'window', includeUncontrolled: true })
            .then(clientList => {
                // 如果已有打开的窗口，聚焦它
                for (const client of clientList) {
                    if (client.url.includes(self.location.hostname)) {
                        return client.focus();
                    }
                }
                // 否则打开新窗口
                return clients.openWindow('./');
            })
    );
});

// ===== 核心：检查是否需要提醒并发送通知 =====
async function checkAndNotify() {
    const today = getLocalDate();

    // 检查今天是否已提醒
    const lastReminder = await getFromStorage('last_bedtime_reminder');
    if (lastReminder === today) {
        console.log('[SW] Already reminded today');
        return;
    }

    const now = new Date();
    const hour = now.getHours();

    // 只在 21:00-23:00 之间提醒
    if (hour < 21 || hour >= 23) {
        console.log('[SW] Not in reminder window, current hour:', hour);
        return;
    }

    // 发送通知
    await sendReminderNotification();
    await saveToStorage('last_bedtime_reminder', today);
}

async function sendReminderNotification() {
    const title = '🌙 记录工作日志';
    const options = {
        body: '今天的工作内容记录了吗？点击打开 App 记录一下吧！',
        icon: './icon-192.png',
        badge: './icon-192.png',
        tag: 'bedtime-reminder',
        requireInteraction: true,
        vibrate: [200, 100, 200],
        timestamp: Date.now()
    };

    try {
        await self.registration.showNotification(title, options);
        console.log('[SW] Notification sent');
    } catch (e) {
        console.error('[SW] Notification failed:', e);
    }
}

// ===== IndexedDB 辅助函数（SW 内无法用 localStorage）=====
function openDB() {
    return new Promise((resolve, reject) => {
        const request = indexedDB.open('sw-storage', 1);
        request.onupgradeneeded = () => {
            if (!request.result.objectStoreNames.contains('kv')) {
                request.result.createObjectStore('kv');
            }
        };
        request.onsuccess = () => resolve(request.result);
        request.onerror = () => reject(request.error);
    });
}

async function getFromStorage(key) {
    const db = await openDB();
    return new Promise((resolve, reject) => {
        const tx = db.transaction('kv', 'readonly');
        const req = tx.objectStore('kv').get(key);
        req.onsuccess = () => resolve(req.result);
        req.onerror = () => reject(req.error);
    });
}

async function saveToStorage(key, value) {
    const db = await openDB();
    return new Promise((resolve, reject) => {
        const tx = db.transaction('kv', 'readwrite');
        tx.objectStore('kv').put(value, key);
        tx.oncomplete = () => resolve();
        tx.onerror = () => reject(tx.error);
    });
}

function getLocalDate() {
    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, '0');
    const day = String(now.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
}
