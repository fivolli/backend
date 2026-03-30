

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
const bgDark = '#0F1220';
const surfaceDark = '#171B2B';
const borderDark = '#2A3046';

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
    text: '#EEF2F7',
    background: bgDark,
    surface: surfaceDark,
    border: borderDark,
    primary: primaryColor,
    danger: dangerColor,
    success: successColor,
    infoBg: '#16263C',
    infoBorder: '#3A6EA5',
    successBg: '#173224',
    successBorder: '#2E7D32',
    dangerBg: '#3A1D24',
    dangerBorder: '#B44A5A',
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
