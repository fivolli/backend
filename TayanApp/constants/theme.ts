/**
 * Below are the colors that are used in the app. The colors are defined in the light and dark mode.
 * There are many other ways to style your app. For example, [Nativewind](https://www.nativewind.dev/), [Tamagui](https://tamagui.dev/), [unistyles](https://reactnativeunistyles.vercel.app), etc.
 */

import { Platform } from 'react-native';

// Эти цвета синхронизированы с веб-версией (Frontend/index.html)
const primaryColor = '#2C2D5F';
const dangerColor = '#B91717';
const successColor = '#2E7D32';

// Soft status surfaces (used in volunteer history cards)
const infoBg = '#E3F2FD';
const infoBorder = '#90CAF9';
const successBg = '#E8F5E9';
const successBorder = '#A5D6A7';
const dangerBg = '#FFEBEE';
const dangerBorder = '#EF9A9A';
const surfaceLight = '#ffffff';
const bgLight = '#F5F5F8';
const borderLight = '#e5e5e5';

const tintColorLight = primaryColor;
const tintColorDark = '#fff';

export const Colors = {
  light: {
    text: '#11181C',
    background: bgLight,
    surface: surfaceLight,
    border: borderLight,
    primary: primaryColor,
    danger: dangerColor,
    success: successColor,
    infoBg,
    infoBorder,
    successBg,
    successBorder,
    dangerBg,
    dangerBorder,
    tint: tintColorLight,
    icon: '#687076',
    tabIconDefault: '#687076',
    tabIconSelected: tintColorLight,
  },
  dark: {
    text: '#ECEDEE',
    background: '#151718',
    surface: '#1C1C1E',
    border: '#2A2A2A',
    primary: primaryColor,
    danger: dangerColor,
    success: successColor,
    infoBg,
    infoBorder,
    successBg,
    successBorder,
    dangerBg,
    dangerBorder,
    tint: tintColorDark,
    icon: '#9BA1A6',
    tabIconDefault: '#9BA1A6',
    tabIconSelected: tintColorDark,
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
