/**
 * @format
 */
import { initI18n, SUPPORTED_LANGUAGES, setAppLanguage } from '../src/i18n';
import i18n from '../src/i18n';

beforeAll(async () => {
  await initI18n();
});

describe('i18n', () => {
  it('exposes four supported languages like web', () => {
    expect(SUPPORTED_LANGUAGES.map((l) => l.code)).toEqual(['en', 'es', 'ar', 'ur']);
  });

  it('translates English sign-in title', () => {
    expect(i18n.t('signIn.title')).toBe('Sign in');
  });

  it('translates Spanish drawer feed', async () => {
    await i18n.changeLanguage('es');
    expect(i18n.t('drawer.feed')).toBe('Actividad');
  });

  it('translates Arabic subscription title', async () => {
    await i18n.changeLanguage('ar');
    expect(i18n.t('subscription.title')).toBe('الاشتراك');
  });

  it('interpolates unread count', async () => {
    await i18n.changeLanguage('en');
    expect(i18n.t('header.unreadCount', { count: 3 })).toContain('3');
  });

  it('setAppLanguage switches locale', async () => {
    await setAppLanguage('ur');
    expect(i18n.language.startsWith('ur')).toBe(true);
    expect(i18n.t('signIn.submit')).toBeTruthy();
    await setAppLanguage('en');
  });
});
