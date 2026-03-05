import { createContext, useContext, useState, type ReactNode } from 'react'
import { ko } from '../locales/ko'
import { en } from '../locales/en'
import type { Translations } from '../locales/ko'

type Lang = 'ko' | 'en'

const LOCALES: Record<Lang, Translations> = { ko, en }
const STORAGE_KEY = 'onboardai-lang'

interface LangContextValue {
  lang: Lang
  t: Translations
  setLang: (lang: Lang) => void
}

const LangContext = createContext<LangContextValue>({
  lang: 'ko',
  t: ko,
  setLang: () => {},
})

export function LangProvider({ children }: { children: ReactNode }) {
  const [lang, setLangState] = useState<Lang>(() => {
    const saved = localStorage.getItem(STORAGE_KEY)
    return saved === 'en' ? 'en' : 'ko'
  })

  function setLang(next: Lang) {
    setLangState(next)
    localStorage.setItem(STORAGE_KEY, next)
  }

  return (
    <LangContext.Provider value={{ lang, t: LOCALES[lang], setLang }}>
      {children}
    </LangContext.Provider>
  )
}

export function useLang() {
  return useContext(LangContext)
}
