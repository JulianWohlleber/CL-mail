import { useEffect } from 'react'
import { useUIStore } from '../stores/ui.store'

export function useTheme() {
  const theme = useUIStore((s) => s.theme)
  const setTheme = useUIStore((s) => s.setTheme)

  useEffect(() => {
    const html = document.documentElement
    html.classList.remove('dark')

    if (theme === 'dark') {
      html.classList.add('dark')
    } else if (theme === 'system') {
      const mq = window.matchMedia('(prefers-color-scheme: dark)')
      if (mq.matches) html.classList.add('dark')

      const handler = (e: MediaQueryListEvent) => {
        html.classList.toggle('dark', e.matches)
      }
      mq.addEventListener('change', handler)
      return () => mq.removeEventListener('change', handler)
    }
  }, [theme])

  const toggleTheme = () => {
    const next = theme === 'light' ? 'dark' : theme === 'dark' ? 'system' : 'light'
    setTheme(next)
  }

  return { theme, setTheme, toggleTheme }
}
