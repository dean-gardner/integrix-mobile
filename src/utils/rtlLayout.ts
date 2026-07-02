import { I18nManager, type TextStyle, type ViewStyle } from 'react-native';

export function isRtlLayout(i18n: { dir?: () => string }): boolean {
  const dir = typeof i18n.dir === 'function' ? i18n.dir() : 'ltr';
  return I18nManager.isRTL || dir === 'rtl';
}

/** Text blocks that should follow reading order when UI language is RTL. */
export function rtlAwareTextStyle(i18n: { dir?: () => string }): {
  textAlign: 'left' | 'right';
  writingDirection: 'ltr' | 'rtl';
} {
  const rtl = isRtlLayout(i18n);
  return {
    textAlign: rtl ? 'right' : 'left',
    writingDirection: rtl ? 'rtl' : 'ltr',
  };
}

/** TextInput style + prop values need to be explicit on Android. */
export function rtlAwareInputStyle(i18n: { dir?: () => string }): TextStyle {
  const rtl = isRtlLayout(i18n);
  return {
    textAlign: rtl ? 'right' : 'left',
    writingDirection: rtl ? 'rtl' : 'ltr',
    direction: rtl ? 'rtl' : 'ltr',
  };
}

/** Container-level direction for cards/modals/screens. */
export function rtlDirectionStyle(i18n: { dir?: () => string }): ViewStyle | undefined {
  return isRtlLayout(i18n) ? { direction: 'rtl' } : undefined;
}

/** Mirror horizontal rows (icon + text) for RTL. */
export function rtlRowStyle(i18n: { dir?: () => string }): ViewStyle {
  return isRtlLayout(i18n) ? { flexDirection: 'row-reverse' } : { flexDirection: 'row' };
}

/** Full-width block aligned to the reading edge (page titles, section headers). */
export function rtlBlockAlignStyle(i18n: { dir?: () => string }): ViewStyle {
  return isRtlLayout(i18n)
    ? { alignSelf: 'stretch', width: '100%', alignItems: 'flex-end' }
    : { alignSelf: 'stretch', width: '100%', alignItems: 'flex-start' };
}

export function rtlEdgePosition(
  i18n: { dir?: () => string },
  value: number
): ViewStyle {
  return isRtlLayout(i18n)
    ? { left: value, right: undefined }
    : { right: value, left: undefined };
}
