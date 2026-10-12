import React from 'react'
import ReactDOM from 'react-dom/client'
import { HashRouter } from 'react-router-dom'
import App from './App'
import './index.css'
import { initDB } from './db'
import { registerSW } from './utils/sw'
import { getTheme, applyTheme } from './utils/theme'
import { ErrorBoundary } from './components/ErrorBoundary'

/**
 * 给 Promise 加超时。
 * IndexedDB 版本升级时若被其它标签页占用（blocked），openDB 会一直挂起而不 reject，
 * 不加超时会导致 await 永不返回 —— 这正是线上"白屏"的成因之一。
 */
function withTimeout<T>(p: Promise<T>, ms: number): Promise<T | null> {
  return Promise.race([
    p,
    new Promise<null>((resolve) => {
      setTimeout(() => {
        console.warn('[TeacherOps] 数据库初始化超时，已跳过等待（请关闭其它标签页后重试）')
        resolve(null)
      }, ms)
    }),
  ])
}

async function bootstrap() {
  // 1) 先应用主题，避免首屏闪白
  applyTheme(getTheme())

  // 2) 先挂载界面：数据库异常绝不能导致白屏
  const root = ReactDOM.createRoot(document.getElementById('root')!)
  root.render(
    <React.StrictMode>
      <ErrorBoundary>
        <HashRouter>
          <App />
        </HashRouter>
      </ErrorBoundary>
    </React.StrictMode>,
  )

  // 3) 再初始化数据层，超时不阻塞
  try {
    await withTimeout(initDB(), 8000)
  } catch (err) {
    console.error('[TeacherOps] 数据库初始化失败', err)
  }

  // 4) 注册 PWA Service Worker（失败不阻塞主流程）
  registerSW()
}

bootstrap().catch((err) => {
  console.error('Bootstrap failed', err)
  const el = document.getElementById('root')
  if (el) {
    el.innerHTML = `<div style="padding:24px;font-family:sans-serif">初始化失败：${String(err)}</div>`
  }
})
