import { makeVar, useReactiveVar } from '@apollo/client'

import { getUiTranslations, isUiLocale, LocaleEnum, UiLocale } from '~/core/translations'
import { getItemFromLS, setItemFromLS } from '~/core/utils/localStorage'

const LOCALE_LS_KEY = 'locale'

interface InternationalizationVar {
  locale: UiLocale
  translations?: Record<string, string>
}

const getInitialLocale = (): UiLocale => {
  const savedLocale = getItemFromLS(LOCALE_LS_KEY)

  if (isUiLocale(savedLocale)) return savedLocale

  const defaultLocale = typeof window === 'undefined' ? undefined : window.LAGO_DEFAULT_UI_LOCALE

  return isUiLocale(defaultLocale) ? defaultLocale : LocaleEnum.en
}

const internationalizationVar = makeVar<InternationalizationVar>({
  locale: getInitialLocale(),
  // `undefined` (not `{}`) is the "translations not loaded yet" sentinel so `translateKey`
  // can detect it in O(1) without enumerating the multi-thousand-key translations object.
  translations: undefined,
})

const loadTranslations = async (locale: UiLocale) => {
  const translations = await getUiTranslations(locale)

  if (typeof document !== 'undefined') document.documentElement.lang = locale
  internationalizationVar({
    locale,
    translations,
  })
}

export const initializeTranslations = () => loadTranslations(internationalizationVar().locale)

export const updateIntlLocale = (locale: UiLocale) => {
  setItemFromLS(LOCALE_LS_KEY, locale)
  return loadTranslations(locale)
}

export const useInternationalizationVar = () => useReactiveVar(internationalizationVar)
