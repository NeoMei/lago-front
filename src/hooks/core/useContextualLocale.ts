import { useCallback, useEffect, useState } from 'react'

import { envGlobalVar } from '~/core/apolloClient'
import {
  getTranslations,
  Locale,
  LocaleEnum,
  TranslateData,
  translateKey,
  Translation,
} from '~/core/translations'

import type { TranslateFunc } from './useInternationalization'

const { appEnv } = envGlobalVar()

// Simple module-level cache for contextual translations
const contextualTranslationCache = new Map<Locale, Translation>()

// Warm the cache for a locale ahead of render. Consumers that render synchronously
// (e.g. the off-screen quote/order PDF editor) can await this so that
// `useContextualLocale`'s state initializer resolves the bundle on the very first
// render instead of returning empty strings until the async import lands.
export const preloadContextualLocale = async (locale: Locale): Promise<void> => {
  if (contextualTranslationCache.has(locale)) return

  const loadedTranslations = await getTranslations(locale)

  contextualTranslationCache.set(locale, loadedTranslations)
}

export const loadContextualTranslator = async (locale: Locale): Promise<TranslateFunc> => {
  await preloadContextualLocale(locale)

  if (locale !== LocaleEnum.en) await preloadContextualLocale(LocaleEnum.en)

  const translations = contextualTranslationCache.get(locale)
  const fallback = contextualTranslationCache.get(LocaleEnum.en)

  return (key, data, plural = 0) =>
    translateKey(
      { translations: translations?.[key] ? translations : fallback, locale, appEnv },
      key,
      data,
      plural,
    )
}

type UseContextualLocale = (locale: Locale) => {
  translateWithContextualLocal: (key: string, data?: TranslateData, plural?: number) => string
}

export const useContextualLocale: UseContextualLocale = (locale) => {
  const [translations, setTranslations] = useState<Translation | undefined>(() =>
    contextualTranslationCache.get(locale),
  )

  useEffect(() => {
    if (contextualTranslationCache.has(locale)) {
      setTranslations(contextualTranslationCache.get(locale))
      return
    }

    preloadContextualLocale(locale).then(() => {
      setTranslations(contextualTranslationCache.get(locale))
    })
  }, [locale])

  return {
    translateWithContextualLocal: useCallback(
      (key, data, plural = 0) => {
        return translateKey({ translations, locale, appEnv }, key, data, plural)
      },
      [translations, locale],
    ),
  }
}
