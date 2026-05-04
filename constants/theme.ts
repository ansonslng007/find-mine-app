/**
 * Below are the colors that are used in the app. The colors are defined in the light and dark mode.
 * There are many other ways to style your app. For example, [Nativewind](https://www.nativewind.dev/), [Tamagui](https://tamagui.dev/), [unistyles](https://reactnativeunistyles.vercel.app), etc.
 */

import { Platform } from 'react-native';

const tintColorLight = '#2563eb';
const tintColorDark = '#fff';

/** Semantic palette shared by light / dark (keys must match both modes). */
export const Colors = {
  light: {
    text: '#11181C',
    background: '#fff',
    tint: tintColorLight,
    icon: '#687076',
    tabIconDefault: '#687076',
    tabIconSelected: tintColorLight,
    pageBackground: '#F3F4F6',
    cardBackground: '#FFFFFF',
    textPrimary: '#111827',
    textMuted: '#6B7280',
    borderSubtle: '#E5E7EB',
    brand: '#2563EB',
    danger: '#B91C1C',
    badgeLost: '#EF4444',
    badgeFound: '#2563EB',
    chipBackground: '#E5E7EB',
    onBrand: '#FFFFFF',
    placeholder: '#9CA3AF',
    imagePlaceholder: '#E5E7EB',
    shadow: '#000000',
  },
  dark: {
    text: '#ECEDEE',
    background: '#151718',
    tint: tintColorDark,
    icon: '#9BA1A6',
    tabIconDefault: '#9BA1A6',
    tabIconSelected: tintColorDark,
    pageBackground: '#0F1012',
    cardBackground: '#1C1D1F',
    textPrimary: '#F3F4F6',
    textMuted: '#9CA3AF',
    borderSubtle: '#3F3F46',
    brand: '#3B82F6',
    danger: '#FCA5A5',
    badgeLost: '#EF4444',
    badgeFound: '#60A5FA',
    chipBackground: '#3F3F46',
    onBrand: '#FFFFFF',
    placeholder: '#71717A',
    imagePlaceholder: '#3F3F46',
    shadow: '#000000',
  },
};

export const Fonts = Platform.select({
  ios: {
    /** iOS `UIFontDescriptorSystemDesignDefault` */
    sans: 'system-ui',
    /** iOS `UIFontDescriptorSystemDesignSerif` */
    serif: 'ui-serif',
    /** iOS `UIFontDescriptorSystemDesignRounded` */
    rounded: 'ui-rounded',
    /** iOS `UIFontDescriptorSystemDesignMonospaced` */
    mono: 'ui-monospace',
  },
  default: {
    sans: 'normal',
    serif: 'serif',
    rounded: 'normal',
    mono: 'monospace',
  },
  web: {
    sans: "system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif",
    serif: "Georgia, 'Times New Roman', serif",
    rounded: "'SF Pro Rounded', 'Hiragino Maru Gothic ProN', Meiryo, 'MS PGothic', sans-serif",
    mono: "SFMono-Regular, Menlo, Monaco, Consolas, 'Liberation Mono', 'Courier New', monospace",
  },
});
