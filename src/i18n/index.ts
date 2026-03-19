import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import { I18nManager, Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';

import en from './locales/en.json';
import es from './locales/es.json';
import ar from './locales/ar.json';
import ur from './locales/ur.json';
import enApp from './locales/en.app.json';
import esApp from './locales/es.app.json';
import arApp from './locales/ar.app.json';
import urApp from './locales/ur.app.json';
import { mergeDeep } from './mergeDeep';

export const RTL_LANGUAGES = ['ar', 'ur'] as const;
export const SUPPORTED_LANGUAGES = [
  { code: 'en' as const, nativeLabel: 'English' },
  { code: 'es' as const, nativeLabel: 'Español' },
  { code: 'ar' as const, nativeLabel: 'العربية' },
  { code: 'ur' as const, nativeLabel: 'اردو' },
];

const LANG_KEY = '@integrix_app_language';

function buildEn(): Record<string, unknown> {
  return mergeDeep(en as Record<string, unknown>, enApp as Record<string, unknown>);
}

function buildLocale(
  localeJson: Record<string, unknown>,
  localeApp: Record<string, unknown>
): Record<string, unknown> {
  return mergeDeep(mergeDeep(buildEn(), localeJson), localeApp);
}

const enT = buildEn();
const esT = buildLocale(es as Record<string, unknown>, esApp as Record<string, unknown>);
const arT = buildLocale(ar as Record<string, unknown>, arApp as Record<string, unknown>);
const urT = buildLocale(ur as Record<string, unknown>, urApp as Record<string, unknown>);

const resources = {
  en: { translation: enT },
  es: { translation: esT },
  ar: { translation: arT },
  ur: { translation: urT },
};

function applyRtl(lng: string) {
  const isRtl = RTL_LANGUAGES.includes(lng as (typeof RTL_LANGUAGES)[number]);
  if (Platform.OS === 'ios' || Platform.OS === 'android') {
    I18nManager.allowRTL(true);
    if (I18nManager.isRTL !== isRtl) {
      I18nManager.forceRTL(isRtl);
    }
  }
}

const languageDetector = {
  type: 'languageDetector' as const,
  async: true,
  detect: async (cb: (lng: string) => void) => {
    try {
      const saved = await AsyncStorage.getItem(LANG_KEY);
      if (saved && SUPPORTED_LANGUAGES.some((l) => l.code === saved)) {
        cb(saved);
        return;
      }
    } catch {
      /* ignore */
    }
    cb('en');
  },
  init: () => {},
  cacheUserLanguage: async (lng: string) => {
    try {
      await AsyncStorage.setItem(LANG_KEY, lng);
    } catch {
      /* ignore */
    }
  },
};

let initDone = false;
let languageListenerAttached = false;

function isJestTest(): boolean {
  return (globalThis as { process?: { env?: { NODE_ENV?: string } } }).process?.env?.NODE_ENV === 'test';
}

export function initI18n(): Promise<void> {
  if (initDone) return Promise.resolve();
  if (isJestTest()) {
    return i18n
      .use(initReactI18next)
      .init({
        lng: 'en',
        resources,
        fallbackLng: 'en',
        interpolation: { escapeValue: false },
        react: { useSuspense: false },
        compatibilityJSON: 'v4',
      })
      .then(() => {
        initDone = true;
      });
  }

  return i18n
    .use(languageDetector)
    .use(initReactI18next)
    .init({
      resources,
      fallbackLng: 'en',
      supportedLngs: ['en', 'es', 'ar', 'ur'],
      interpolation: { escapeValue: false },
      react: { useSuspense: false },
      compatibilityJSON: 'v4',
    })
    .then(() => {
      initDone = true;
      applyRtl(i18n.language);
      if (!languageListenerAttached) {
        languageListenerAttached = true;
        i18n.on('languageChanged', (lng) => applyRtl(lng));
      }
    });
}

export async function setAppLanguage(code: string): Promise<void> {
  if (!SUPPORTED_LANGUAGES.some((l) => l.code === code)) return;
  await i18n.changeLanguage(code);
  try {
    await AsyncStorage.setItem(LANG_KEY, code);
  } catch {
    /* ignore */
  }
}

export default i18n;
