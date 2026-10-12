const RESET_KEY = 'tops:sw-reset'
const RESET_VERSION = '2'

/**
 * 一次性清理历史 Service Worker 与全部缓存。
 *
 * 背景：旧版 sw.js 对 index.html 采用 cache-first 且缓存名固定（teacher-ops-v1），
 * 重新部署后浏览器仍返回缓存中的旧入口页，而旧入口引用的 JS 文件名（带 hash）在
 * 新版本中已不存在 → 404 → 白屏。此函数用于让存量用户恢复到干净状态。
 *
 * @returns true 表示已执行清理且调用方应立即 reload
 */
async function resetStaleSW(): Promise<boolean> {
  try {
    if (localStorage.getItem(RESET_KEY) === RESET_VERSION) return false

    if ('serviceWorker' in navigator) {
      const regs = await navigator.serviceWorker.getRegistrations()
      for (const r of regs) await r.unregister()
    }
    if (window.caches) {
      const keys = await caches.keys()
      for (const k of keys) await caches.delete(k)
    }
    localStorage.setItem(RESET_KEY, RESET_VERSION)
    return true
  } catch {
    return false
  }
}

export function registerSW() {
  if (typeof window === 'undefined') return
  if (!('serviceWorker' in navigator)) return
  // 只在生产构建时启用（避免 dev 缓存导致刷新不生效）
  if (import.meta.env.DEV) return

  window.addEventListener('load', () => {
    void (async () => {
      try {
        // 1) 先清理历史遗留（仅一次），清理后重载以彻底脱离旧 SW 控制
        if (await resetStaleSW()) {
          location.reload()
          return
        }

        // 2) 注册新 SW；updateViaCache: 'none' 避免浏览器缓存 sw.js 导致更新检测失效
        const url = new URL('sw.js', window.location.href).toString()
        const reg = await navigator.serviceWorker.register(url, {
          scope: './',
          updateViaCache: 'none',
        })

        if (reg.waiting) reg.waiting.postMessage('SKIP_WAITING')
        reg.addEventListener('updatefound', () => {
          const installing = reg.installing
          if (!installing) return
          installing.addEventListener('statechange', () => {
            if (installing.state === 'installed' && navigator.serviceWorker.controller) {
              // 新版本已就绪，不强制打断用户操作，下次刷新生效
              console.info('[TeacherOps] 新版本已就绪，下次刷新后生效')
            }
          })
        })
      } catch (err) {
        // 不阻塞主流程
        console.warn('SW registration failed', err)
      }
    })()
  })
}

/** 供「清空缓存并重试」按钮调用：注销 SW + 清缓存 */
export async function purgeSWAndCaches(): Promise<void> {
  try {
    if ('serviceWorker' in navigator) {
      const regs = await navigator.serviceWorker.getRegistrations()
      for (const r of regs) await r.unregister()
    }
    if (window.caches) {
      const keys = await caches.keys()
      for (const k of keys) await caches.delete(k)
    }
  } catch {
    /* 忽略 */
  }
}
