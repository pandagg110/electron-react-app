import { useEffect, useState } from 'react'
import { Button } from '@/app/components/ui/button'
import { STORAGE_KEYS, loadJson, saveJson } from '@/app/utils/storage'
import { cn } from '@/lib/utils'

interface MapPanelSettings {
  pinned: boolean
  locked: boolean
  width: number
  opacity: number
}

const DEFAULT_SETTINGS: MapPanelSettings = {
  pinned: false,
  locked: false,
  width: 360,
  opacity: 0.9,
}

export const MapPanel = () => {
  const [settings, setSettings] = useState<MapPanelSettings>(() =>
    loadJson<MapPanelSettings | null>(STORAGE_KEYS.mapPanel, null) ?? DEFAULT_SETTINGS
  )

  useEffect(() => {
    saveJson(STORAGE_KEYS.mapPanel, settings)
  }, [settings])

  useEffect(() => {
    const api = window.conveyor?.window
    if (!api || typeof api.windowSetAlwaysOnTop !== 'function') return
    api.windowSetAlwaysOnTop(settings.pinned)
    return () => api.windowSetAlwaysOnTop(false)
  }, [settings.pinned])

  const togglePinned = () => setSettings((prev) => ({ ...prev, pinned: !prev.pinned }))
  const toggleLocked = () => setSettings((prev) => ({ ...prev, locked: !prev.locked }))

  return (
    <div
      className={cn(
        'rounded-xl border border-slate-700 bg-slate-900/95 text-slate-50 shadow-2xl backdrop-blur',
        settings.pinned ? 'fixed right-6 top-16 z-40' : 'relative'
      )}
      style={{
        width: settings.width,
        opacity: settings.locked ? Math.max(0.6, settings.opacity) : settings.opacity,
      }}
    >
      <div className="flex items-center justify-between gap-2 px-4 py-2">
        <div>
          <p className="text-sm font-semibold">战术地图</p>
          <p className="text-xs text-slate-300">固定在屏幕侧边以覆盖游戏边框</p>
        </div>
        <div className="flex items-center gap-2">
          <Button size="sm" variant={settings.pinned ? 'secondary' : 'outline'} onClick={togglePinned}>
            {settings.pinned ? '解除固定' : '固定'}
          </Button>
          <Button size="sm" variant={settings.locked ? 'destructive' : 'outline'} onClick={toggleLocked}>
            {settings.locked ? '解锁操作' : '锁定避免误触'}
          </Button>
        </div>
      </div>
      <div
        className={cn(
          'relative aspect-video overflow-hidden rounded-b-xl border-t border-slate-700 bg-gradient-to-br from-slate-800 to-slate-900',
          settings.locked && 'pointer-events-none select-none opacity-90'
        )}
      >
        <div className="absolute inset-4 rounded-lg border border-dashed border-slate-600" />
        <div className="absolute left-4 top-4 text-xs font-semibold uppercase tracking-widest text-slate-300">
          YanYun War Field
        </div>
        <div className="absolute bottom-4 right-4 text-right text-xs text-slate-400">
          <p>刷新周期：5:00</p>
          <p>4:00 提前提醒</p>
        </div>
      </div>
      <div className="space-y-2 px-4 py-3 text-xs text-slate-200">
        <div className="flex items-center justify-between gap-4">
          <span>面板宽度</span>
          <div className="flex items-center gap-2">
            <input
              className="h-1.5 w-32 cursor-pointer accent-slate-400"
              type="range"
              min={280}
              max={540}
              value={settings.width}
              onChange={(event) => setSettings((prev) => ({ ...prev, width: Number(event.target.value) }))}
            />
            <span className="w-14 text-right">{settings.width}px</span>
          </div>
        </div>
        <div className="flex items-center justify-between gap-4">
          <span>透明度</span>
          <div className="flex items-center gap-2">
            <input
              className="h-1.5 w-32 cursor-pointer accent-slate-400"
              type="range"
              min={50}
              max={100}
              value={Math.round(settings.opacity * 100)}
              onChange={(event) =>
                setSettings((prev) => ({ ...prev, opacity: Number(event.target.value) / 100 }))
              }
            />
            <span className="w-14 text-right">{Math.round(settings.opacity * 100)}%</span>
          </div>
        </div>
        <p className="text-[11px] text-slate-400">
          固定后保持窗口置顶并锁定下方区域，防止战斗中误触。解除锁定后可以继续拖拽或调整地图大小。
        </p>
      </div>
    </div>
  )
}
