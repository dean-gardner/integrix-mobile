import { I18nManager, type TextStyle, type ViewStyle } from 'react-native';

function languageWantsRtl(i18n: { dir?: () => string }): boolean {
  if (typeof i18n.dir === 'function') {
    return i18n.dir() === 'rtl';
  }
  return I18nManager.isRTL;
}

export function isRtlLayout(i18n: { dir?: () => string }): boolean {
  // Prefer active UI language. I18nManager.isRTL can lag until a native restart.
  return languageWantsRtl(i18n);
}

/**
 * True when RN already mirrors horizontal layout (flex row start/end, left/right).
 * In that case applying `row-reverse` would cancel the mirror and look LTR again.
 */
export function doesNativeRtlSwap(): boolean {
  return Boolean(I18nManager.isRTL && I18nManager.doLeftAndRightSwapInRTL);
}

/**
 * Whether we still need a manual `row-reverse` to achieve a mirrored row.
 * XOR of "UI language wants RTL" and "native already swapped".
 */
export function needsManualRtlRowMirror(i18n: { dir?: () => string }): boolean {
  return languageWantsRtl(i18n) !== doesNativeRtlSwap();
}

/** Text blocks that should follow reading order when UI language is RTL. */
export function rtlAwareTextStyle(i18n: { dir?: () => string }): {
  textAlign: 'left' | 'right';
  writingDirection: 'ltr' | 'rtl';
  direction: 'ltr' | 'rtl';
} {
  const rtl = isRtlLayout(i18n);
  return {
    textAlign: rtl ? 'right' : 'left',
    writingDirection: rtl ? 'rtl' : 'ltr',
    // Paragraph base direction for BiDi (fixes ".2026" flipping to the wrong edge).
    direction: rtl ? 'rtl' : 'ltr',
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

/**
 * Mirror horizontal rows (icon + text) for RTL.
 * Uses `row` when native RTL swap is already active; otherwise `row-reverse`.
 */
export function rtlRowStyle(i18n: { dir?: () => string }): ViewStyle {
  return {
    flexDirection: needsManualRtlRowMirror(i18n) ? 'row-reverse' : 'row',
  };
}

/** Full-width block aligned to the reading edge (page titles, section headers). */
export function rtlBlockAlignStyle(i18n: { dir?: () => string }): ViewStyle {
  return isRtlLayout(i18n)
    ? { alignSelf: 'stretch', width: '100%', alignItems: 'flex-end' }
    : { alignSelf: 'stretch', width: '100%', alignItems: 'flex-start' };
}

/**
 * Absolute edge for badges/chips on the "end" of an icon.
 * Accounts for native left/right property swapping under RTL.
 */
export function rtlEdgePosition(
  i18n: { dir?: () => string },
  value: number
): ViewStyle {
  if (!isRtlLayout(i18n)) {
    return { right: value, left: undefined };
  }
  // With native swap, `right` paints on the visual start (left in RTL).
  // Without swap, set `left` explicitly for the visual start.
  return doesNativeRtlSwap()
    ? { right: value, left: undefined }
    : { left: value, right: undefined };
}
