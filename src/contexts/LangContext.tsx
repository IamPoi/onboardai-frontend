import { createContext, useContext, type ReactNode } from 'react'
import { en, type Translations } from '../locales/en'

interface LangContextValue {
  lang: 'en'
  t: Translations
  setLang: (lang: 'en') => void
}

const LangContext = createContext<LangContextValue>({
  lang: 'en',
  t: en,
  setLang: () => {},
})

export function LangProvider({ children }: { children: ReactNode }) {
  return (
    <LangContext.Provider value={{ lang: 'en', t: en, setLang: () => {} }}>
      {children}
    </LangContext.Provider>
  )
}

export function useLang() {
  return useContext(LangContext)
}
