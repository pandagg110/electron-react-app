import { createContext, useContext, useEffect, useState } from 'react'
import { Titlebar, TitlebarProps } from './Titlebar'
import { TitlebarContextProvider } from './TitlebarContext'
import type { ChannelReturn } from '@/lib/conveyor/schemas'
import { useConveyor } from '@/app/hooks/use-conveyor'

type WindowInitProps = ChannelReturn<'window-init'>

interface WindowContextProps {
  titlebar: TitlebarProps
  readonly window: WindowInitProps | undefined
}

const WindowContext = createContext<WindowContextProps | undefined>(undefined)

interface WindowContextProviderProps {
  children: React.ReactNode
  titlebar?: TitlebarProps
  showTitlebar?: boolean
}

export const WindowContextProvider = ({
  children,
  titlebar = {
    title: 'Electron React App',
    icon: 'appIcon.png',
    titleCentered: false,
    menuItems: [],
  },
  showTitlebar = true,
}: WindowContextProviderProps) => {
  const [initProps, setInitProps] = useState<WindowInitProps>()
  const { windowInit } = useConveyor('window')

  useEffect(() => {
    let isMounted = true

    windowInit().then((props) => {
      if (isMounted) {
        setInitProps(props)
      }
    })

    const content = document.querySelector('.window-content')
    const parent = content?.parentElement

    if (parent) {
      parent.classList.add('window-frame')
      parent.classList.toggle('window-frame--frameless', !showTitlebar)
    }

    return () => {
      isMounted = false
    }
  }, [windowInit, showTitlebar])

  return (
    <WindowContext.Provider value={{ titlebar, window: initProps }}>
      {showTitlebar ? (
        <TitlebarContextProvider>
          <Titlebar />
        </TitlebarContextProvider>
      ) : null}
      <div className={`window-content${showTitlebar ? '' : ' frameless-window'}`}>{children}</div>
    </WindowContext.Provider>
  )
}

export const useWindowContext = () => {
  const context = useContext(WindowContext)
  if (!context) {
    throw new Error('useWindowContext must be used within a WindowContextProvider')
  }
  return context
}

