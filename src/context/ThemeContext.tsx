import {
    createContext,
    useContext,
    useEffect,
    useMemo,
    useState,
    type ReactNode,
  } from 'react'
  
  type Theme = 'light' | 'dark'
  
  interface ThemeContextValue {
    theme: Theme
    setTheme: (theme: Theme) => void
    toggleTheme: () => void
  }
  
  const ThemeContext = createContext<ThemeContextValue | null>(null)
  
  export function ThemeProvider({ children }: { children: ReactNode }) {
    const [theme, setThemeState] = useState<Theme>(() => {
      const savedTheme = localStorage.getItem('theme')
  
      if (savedTheme === 'light' || savedTheme === 'dark') {
        return savedTheme
      }
  
      return 'light'
    })
  
    useEffect(() => {
      localStorage.setItem('theme', theme)
  
      if (theme === 'dark') {
        document.documentElement.classList.add('dark')
      } else {
        document.documentElement.classList.remove('dark')
      }
    }, [theme])
  
    function setTheme(nextTheme: Theme) {
      setThemeState(nextTheme)
    }
  
    function toggleTheme() {
      setThemeState((currentTheme) =>
        currentTheme === 'light' ? 'dark' : 'light',
      )
    }
  
    const value = useMemo(
      () => ({
        theme,
        setTheme,
        toggleTheme,
      }),
      [theme],
    )
  
    return (
      <ThemeContext.Provider value={value}>
        {children}
      </ThemeContext.Provider>
    )
  }
  
  export function useTheme() {
    const context = useContext(ThemeContext)
  
    if (!context) {
      throw new Error('useTheme must be used inside ThemeProvider')
    }
  
    return context
  }