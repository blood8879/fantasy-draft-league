import { type ReactNode, createContext, useCallback, useContext, useMemo, useState } from "react"
import { en } from "./en"
import { es } from "./es"
import { ja } from "./ja"
import { ko } from "./ko"

export const locales = ["en", "ko", "ja", "es"] as const
export type Locale = (typeof locales)[number]

export const localeNames: Readonly<Record<Locale, string>> = {
  en: "English",
  ko: "한국어",
  ja: "日本語",
  es: "Español",
}

const dictionaries: Readonly<Record<Locale, Readonly<Record<string, string>>>> = {
  en,
  ko,
  ja,
  es,
}

const STORAGE_KEY = "legend-draft-locale"

function isLocale(value: string | null): value is Locale {
  return value !== null && (locales as readonly string[]).includes(value)
}

function readInitialLocale(): Locale {
  try {
    const saved = globalThis.localStorage?.getItem(STORAGE_KEY)
    if (isLocale(saved)) {
      return saved
    }
  } catch {
    // 접근 불가 환경
  }
  return "en"
}

type TranslateParams = Readonly<Record<string, string | number>>

export type I18nValue = {
  readonly locale: Locale
  setLocale: (locale: Locale) => void
  t: (key: string, params?: TranslateParams) => string
}

const I18nContext = createContext<I18nValue | undefined>(undefined)

export function I18nProvider({
  children,
  initialLocale,
}: {
  readonly children: ReactNode
  readonly initialLocale?: Locale | undefined
}) {
  const [locale, setLocaleState] = useState<Locale>(initialLocale ?? readInitialLocale)

  const setLocale = useCallback((next: Locale) => {
    setLocaleState(next)
    try {
      globalThis.localStorage?.setItem(STORAGE_KEY, next)
    } catch {
      // 저장 불가 환경은 무시
    }
  }, [])

  const t = useCallback(
    (key: string, params?: TranslateParams): string => {
      const template = dictionaries[locale][key] ?? en[key] ?? key
      if (params === undefined) {
        return template
      }
      return template.replace(/\{(\w+)\}/g, (match, name: string) =>
        name in params ? String(params[name]) : match,
      )
    },
    [locale],
  )

  const value = useMemo<I18nValue>(() => ({ locale, setLocale, t }), [locale, setLocale, t])
  return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>
}

export function useI18n(): I18nValue {
  const value = useContext(I18nContext)
  if (value === undefined) {
    throw new Error("useI18n must be used within an I18nProvider")
  }
  return value
}
