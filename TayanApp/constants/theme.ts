

import { Platform } from 'react-native';


const primaryColor = '#2C2D5F';
const dangerColor = '#B91717';
const successColor = '#2E7D32';


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
    sans: 'system-ui',
    serif: 'ui-serif',
    rounded: 'ui-rounded',
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
