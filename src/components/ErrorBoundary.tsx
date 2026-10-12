/**
 * 全局错误边界 — 避免渲染异常导致"纯白屏无提示"
 * 提供「清空本地缓存并重试」，用于处理被旧 Service Worker / 旧 IndexedDB 卡死的情况。
 */
import { Component, type ErrorInfo, type ReactNode } from 'react'

interface Props {
  children: ReactNode
}

interface State {
  error: Error | null
}

export class ErrorBoundary extends Component<Props, State> {
  state: State = { error: null }

  static getDerivedStateFromError(error: Error): State {
    return { error }
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    // 保留栈信息，便于线上排查
    console.error('[TeacherOps] 渲染异常', error, info.componentStack)
  }

  private hardReset = async () => {
    try {
      // 注销 Service Worker 并清空其缓存
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
    try {
      // 清空 UI 偏好（业务数据在 IndexedDB，不受影响）
      localStorage.clear()
    } catch {
      /* 忽略 */
    }
    location.reload()
  }

  render() {
    if (this.state.error) {
      return (
        <div className="min-h-screen flex items-center justify-center p-6">
          <div className="card p-5 max-w-lg w-full">
            <h1 className="text-base font-semibold mb-1">页面出错了</h1>
            <p className="text-xs text-soft mb-3">
              应用已停止渲染。多数情况下是旧缓存或本地数据库升级被占用导致，点下方按钮可自愈。
            </p>
            <pre className="text-2xs text-soft bg-paper-100 rounded p-2 overflow-auto max-h-40 whitespace-pre-wrap">
              {String(this.state.error?.message ?? this.state.error)}
            </pre>
            <div className="flex gap-2 mt-3">
              <button className="btn-primary" onClick={() => location.reload()}>
                重新加载
              </button>
              <button className="btn-outline" onClick={this.hardReset}>
                清空缓存并重试
              </button>
            </div>
          </div>
        </div>
      )
    }
    return this.props.children
  }
}
