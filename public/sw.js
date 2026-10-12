// TeacherOps Service Worker — v2
//
// 策略（重要）：
// 1) HTML 导航请求：network-first（先网络，失败才回缓存）
//    —— 旧版对 index.html 用 cache-first 且缓存名固定，导致重新部署后浏览器
//       一直拿到旧的入口页，其中引用的旧 JS 已不存在 → 404 → 白屏。
// 2) 带 hash 的静态资源（assets/*.js|css）：cache-first（内容定址，文件名即版本，安全）
// 3) activate 时清理所有旧缓存，保证历史遗留缓存不会残留。
const CACHE_VERSION = 'v2'
const CACHE_NAME = `teacher-ops-${CACHE_VERSION}`
const APP_SHELL = ['./', './index.html', './manifest.webmanifest']

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches
      .open(CACHE_NAME)
      // 单个资源失败不应让 install 整体失败
      .then((cache) => cache.addAll(APP_SHELL).catch(() => undefined))
      .then(() => self.skipWaiting()),
  )
})

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) => Promise.all(keys.filter((k) => k !== CACHE_NAME).map((k) => caches.delete(k))))
      .then(() => self.clients.claim()),
  )
})

self.addEventListener('fetch', (event) => {
  const req = event.request
  if (req.method !== 'GET') return
  const url = new URL(req.url)
  if (url.origin !== self.location.origin) return

  const isHtml =
    req.mode === 'navigate' || (req.headers.get('accept') || '').includes('text/html')

  // 1) 页面入口：网络优先，保证发布后用户拿到最新 index.html
  if (isHtml) {
    event.respondWith(
      fetch(req)
        .then((res) => {
          if (res && res.status === 200) {
            const clone = res.clone()
            caches.open(CACHE_NAME).then((c) => c.put('./index.html', clone)).catch(() => {})
          }
          return res
        })
        .catch(() => caches.match('./index.html').then((c) => c || caches.match('./'))),
    )
    return
  }

  // 2) 静态资源：缓存优先，缺失再走网络
  event.respondWith(
    caches.match(req).then((cached) => {
      if (cached) return cached
      return fetch(req)
        .then((res) => {
          if (res && res.status === 200 && res.type === 'basic') {
            const clone = res.clone()
            caches.open(CACHE_NAME).then((c) => c.put(req, clone)).catch(() => {})
          }
          return res
        })
        .catch(() => cached),
    }),
  )
})

// 支持页面主动触发跳过等待（用于「有更新，点此刷新」）
self.addEventListener('message', (event) => {
  if (event.data === 'SKIP_WAITING') self.skipWaiting()
})
