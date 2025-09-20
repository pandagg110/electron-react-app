import './styles/app.css'
import { BattleProvider, useBattleContext } from '@/app/providers/battle-provider'
import { HomeScreen } from '@/app/components/battle/home-screen'
import { CommanderScreen } from '@/app/components/battle/commander-screen'
import { GroupScreen } from '@/app/components/battle/group-screen'
import { JunglerScreen } from '@/app/components/battle/jungler-screen'
import { MapPanel } from '@/app/components/map/map-panel'
import { useMediaQuery } from '@/app/hooks/use-media-query'

const Viewport = () => {
  const { profile } = useBattleContext()
  const role = profile.role
  const isDesktop = useMediaQuery('(min-width: 1024px)')

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

  return (
    <div className="flex h-full w-full overflow-hidden bg-slate-950 text-slate-100">
      <main className="flex-1 overflow-auto">{content}</main>
      {isDesktop ? (
        <aside className="flex shrink-0 items-start gap-4 p-4">
          <MapPanel />
        </aside>
      ) : (
        <div className="fixed bottom-4 right-4 z-40">
          <MapPanel />
        </div>
      )}
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
