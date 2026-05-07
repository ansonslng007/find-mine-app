import { StyleSheet, Text, type TextProps } from 'react-native';

import { Colors } from '@/constants/theme';
import { useThemeColor } from '@/hooks/use-theme-color';

export type ThemedTextProps = TextProps & {
  lightColor?: string;
  darkColor?: string;
  type?:
    | 'default'
    | 'title'
    | 'defaultSemiBold'
    | 'subtitle'
    | 'link'
    | 'screenTitle'
    | 'screenSubtitle'
    | 'body'
    | 'bodyMuted'
    | 'caption'
    | 'cardTitle'
    | 'labelError';
};

function themeColorKeyForType(
  type: NonNullable<ThemedTextProps['type']>
): keyof typeof Colors.light {
  switch (type) {
    case 'screenTitle':
    case 'body':
    case 'cardTitle':
      return 'textPrimary';
    case 'screenSubtitle':
    case 'bodyMuted':
    case 'caption':
      return 'textMuted';
    case 'labelError':
      return 'danger';
    default:
      return 'text';
  }
}

export function ThemedText({
  style,
  lightColor,
  darkColor,
  type = 'default',
  ...rest
}: ThemedTextProps) {
  const color = useThemeColor(
    { light: lightColor, dark: darkColor },
    themeColorKeyForType(type)
  );

  return (
    <Text
      style={[
        { color },
        type === 'default' ? styles.default : undefined,
        type === 'title' ? styles.title : undefined,
        type === 'defaultSemiBold' ? styles.defaultSemiBold : undefined,
        type === 'subtitle' ? styles.subtitle : undefined,
        type === 'link' ? styles.link : undefined,
        type === 'screenTitle' ? styles.screenTitle : undefined,
        type === 'screenSubtitle' ? styles.screenSubtitle : undefined,
        type === 'body' ? styles.body : undefined,
        type === 'bodyMuted' ? styles.bodyMuted : undefined,
        type === 'caption' ? styles.caption : undefined,
        type === 'cardTitle' ? styles.cardTitle : undefined,
        type === 'labelError' ? styles.labelError : undefined,
        style,
      ]}
      {...rest}
    />
  );
}

const styles = StyleSheet.create({
  default: {
    fontSize: 16,
    lineHeight: 24,
  },
  defaultSemiBold: {
    fontSize: 16,
    lineHeight: 24,
    fontWeight: '600',
  },
  title: {
    fontSize: 32,
    fontWeight: 'bold',
    lineHeight: 32,
  },
  subtitle: {
    fontSize: 20,
    fontWeight: 'bold',
  },
  link: {
    lineHeight: 30,
    fontSize: 16,
    color: '#0a7ea4',
  },
  screenTitle: {
    fontSize: 26,
    fontWeight: '700',
  },
  screenSubtitle: {
    fontSize: 15,
    marginTop: 2,
  },
  body: {
    fontSize: 16,
    lineHeight: 24,
  },
  bodyMuted: {
    fontSize: 14,
    lineHeight: 20,
  },
  caption: {
    fontSize: 12,
    lineHeight: 16,
  },
  cardTitle: {
    fontSize: 16,
    fontWeight: '700',
  },
  labelError: {
    fontSize: 15,
    textAlign: 'center',
  },
});
