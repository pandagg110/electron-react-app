import './styles/app.css'
import { BattleProvider, useBattleContext } from '@/app/providers/battle-provider'
import { HomeScreen } from '@/app/components/battle/home-screen'
import { CommanderScreen } from '@/app/components/battle/commander-screen'
import { GroupScreen } from '@/app/components/battle/group-screen'
import { JunglerScreen } from '@/app/components/battle/jungler-screen'
import { MapPanel } from '@/app/components/map/map-panel'
import { CompactWindowControls } from '@/app/components/window/CompactWindowControls'

const Viewport = () => {
  const { profile } = useBattleContext()
  const role = profile.role

  let content: JSX.Element
  if (!role) {
    content = <HomeScreen />
  } else if (role === 'commander') {
    content = <CommanderScreen />
  } else if (role === 'jungler') {
    content = <JunglerScreen />
  } else {
    content = <GroupScreen />
  }

  const showMapPanel = role === 'commander'
  const containerClass = showMapPanel
    ? 'relative flex h-full w-full overflow-hidden bg-slate-950 text-slate-100'
    : 'flex h-full w-full justify-center bg-slate-950 text-slate-100'

  const wrapperClass =
    !role || role === 'commander'
      ? 'mx-auto flex min-h-full w-full max-w-[720px] flex-col gap-6 px-4 py-6 sm:px-6'
      : 'mx-auto flex min-h-full w-full flex-col gap-3 px-1 py-2 sm:max-w-[320px] sm:px-3 sm:py-4'

  return (
    <div className={containerClass}>
      <main className="flex-1 overflow-auto" style={{ WebkitAppRegion: 'no-drag' }}>
        <div className={wrapperClass}>{content}</div>
      </main>
      {/* Tactical map temporarily disabled.
      {showMapPanel ? (
        <div className="fixed bottom-4 right-4 z-40" style={{ WebkitAppRegion: 'no-drag' }}>
          <MapPanel />
        </div>
      ) : null}
      */}
    </div>
  )
}

const OverlayLayout = () => (
  <div className="app-overlay flex h-full w-full flex-col rounded-lg bg-slate-950/95 text-slate-100 shadow-lg">
    <CompactWindowControls />
    <div className="flex-1 overflow-hidden" style={{ WebkitAppRegion: 'no-drag' }}>
      <Viewport />
    </div>
  </div>
)

export default function App() {
  return (
    <BattleProvider>
      <OverlayLayout />
    </BattleProvider>
  )
}




