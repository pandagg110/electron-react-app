import './styles/app.css'
import { BattleProvider, useBattleContext } from '@/app/providers/battle-provider'
import { HomeScreen } from '@/app/components/battle/home-screen'
import { CommanderScreen } from '@/app/components/battle/commander-screen'
import { GroupScreen } from '@/app/components/battle/group-screen'
import { JunglerScreen } from '@/app/components/battle/jungler-screen'
import { MapPanel } from '@/app/components/map/map-panel'

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
      : 'mx-auto flex min-h-full w-full max-w-[320px] flex-col gap-4 px-3 py-4'

  return (
    <div className={containerClass}>
      <main className="flex-1 overflow-auto">
        <div className={wrapperClass}>{content}</div>
      </main>
      {showMapPanel ? (
        <div className="fixed bottom-4 right-4 z-40">
          <MapPanel />
        </div>
      ) : null}
    </div>
  )
}

export default function App() {
  return (
    <BattleProvider>
      <Viewport />
    </BattleProvider>
  )
}
