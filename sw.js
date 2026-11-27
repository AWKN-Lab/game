/**
 * 时空剧场 Service Worker — 轻量运行与离线降级（总 PRD MOD-OPS-03 P1「Service Worker 缓存」）
 *
 * 策略：
 *  - 核心外壳（首页、样式、注册表、工具脚本、vendor）安装时预缓存（单项失败不阻塞安装）；
 *  - 页面导航：网络优先，失败回退缓存（弱网/断网时核心页面仍可打开）；
 *  - 同源静态资源（css/js/图片）：Stale-While-Revalidate，图片运行时缓存上限 80 条；
 *  - 不缓存：/api/（数据必须实时）、audio/ 与 music/（体积过大，按剧本播放时由浏览器自行加载）、
 *    fonts/ 与在线字体（保持原有网络行为）。
 */
var SW_VERSION = 'tt-sw-v1';
var SHELL_CACHE = SW_VERSION + '-shell';
var ASSET_CACHE = SW_VERSION + '-assets';
var IMAGE_CACHE = SW_VERSION + '-images';
var IMAGE_LIMIT = 80;

// 预缓存清单：核心页面外壳。dist/output.css 为构建产物，缺失时由运行时缓存兜底。
var PRECACHE_URLS = [
    '/',
    '/index.html',
    '/script-select.html',
    '/mvp.css',
    '/script-registry.js',
    '/data-store.js',
    '/assets/js/event-client.js',
    '/assets/js/light-mode.js',
    '/vendor/d3.v7.min.js',
    '/favicon.svg'
];

self.addEventListener('install', function (event) {
    event.waitUntil(
        caches.open(SHELL_CACHE).then(function (cache) {
            // 单项捕获失败：某个资源缺失不应导致整个 SW 安装失败
            return Promise.all(PRECACHE_URLS.map(function (url) {
                return cache.add(new Request(url, { cache: 'reload' })).catch(function (error) {
                    console.warn('[SW] 预缓存跳过：', url, error && error.message);
                });
            }));
        }).then(function () {
            return self.skipWaiting();
        })
    );
});

self.addEventListener('activate', function (event) {
    event.waitUntil(
        caches.keys().then(function (keys) {
            return Promise.all(keys.map(function (key) {
                if (key.indexOf(SW_VERSION) !== 0) return caches.delete(key);
            }));
        }).then(function () {
            return self.clients.claim();
        })
    );
});

function isSkipped(url) {
    return url.pathname.startsWith('/api/') ||
        url.pathname.startsWith('/audio/') ||
        url.pathname.startsWith('/music/') ||
        url.pathname.startsWith('/fonts/');
}

function isImage(request) {
    return request.destination === 'image' || /\.(png|jpe?g|gif|webp|svg|ico)$/i.test(new URL(request.url).pathname);
}

async function trimCache(cacheName, limit) {
    var cache = await caches.open(cacheName);
    var keys = await cache.keys();
    if (keys.length <= limit) return;
    for (var i = 0; i < keys.length - limit; i++) {
        await cache.delete(keys[i]);
    }
}

async function staleWhileRevalidate(request, cacheName) {
    var cache = await caches.open(cacheName);
    var cached = await cache.match(request);
    var fetchPromise = fetch(request).then(function (response) {
        if (response && response.ok) cache.put(request, response.clone());
        return response;
    }).catch(function () {
        return cached;
    });
    return cached || fetchPromise;
}

async function networkFirst(request, cacheName) {
    var cache = await caches.open(cacheName);
    try {
        var response = await fetch(request);
        if (response && response.ok) cache.put(request, response.clone());
        return response;
    } catch (error) {
        var cached = await cache.match(request);
        if (cached) return cached;
        if (request.mode === 'navigate') {
            var shell = await cache.match('/index.html');
            if (shell) return shell;
        }
        throw error;
    }
}

self.addEventListener('fetch', function (event) {
    var request = event.request;
    if (request.method !== 'GET') return;

    var url = new URL(request.url);
    if (url.origin !== self.location.origin) return; // 在线字体等跨域请求不拦截
    if (isSkipped(url)) return;

    if (request.mode === 'navigate') {
        event.respondWith(networkFirst(request, SHELL_CACHE));
        return;
    }

    if (isImage(request)) {
        event.respondWith((async function () {
            var cache = await caches.open(IMAGE_CACHE);
            var cached = await cache.match(request);
            var fetchPromise = fetch(request).then(function (response) {
                if (response && response.ok) {
                    cache.put(request, response.clone());
                    trimCache(IMAGE_CACHE, IMAGE_LIMIT);
                }
                return response;
            }).catch(function () {
                return cached;
            });
            return cached || fetchPromise;
        })());
        return;
    }

    event.respondWith(staleWhileRevalidate(request, ASSET_CACHE));
});
