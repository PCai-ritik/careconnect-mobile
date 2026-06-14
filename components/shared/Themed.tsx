import React, { useMemo } from 'react';
import { Text, View, StyleSheet, type TextProps, type ViewProps } from 'react-native';
import { useTheme } from '@/providers/ThemeProvider';
import { typography as staticTypography } from '@/constants/theme';

export interface ThemedTextProps extends TextProps {
  variant?: 'heading' | 'body';
  weight?: 'regular' | 'medium' | 'semiBold' | 'bold';
  color?: 'primary' | 'secondary' | 'muted' | 'brand';
  size?: 'xs' | 'sm' | 'base' | 'lg' | 'xl' | '2xl' | '3xl' | '4xl';
}

export const ThemedText = React.memo(function ThemedText(props: ThemedTextProps) {
  const { style, variant = 'body', weight = 'regular', color = 'primary', size = 'base', ...otherProps } = props;
  const { colors, typography } = useTheme();

  const styles = useMemo(() => {
    const sizeMap = staticTypography.size[size];
    return StyleSheet.create({
      text: {
        fontFamily: typography[variant][weight],
        fontSize: sizeMap.fontSize,
        lineHeight: sizeMap.lineHeight,
        color: color === 'brand' ? colors.primary :
               color === 'secondary' ? colors.textSecondary :
               color === 'muted' ? colors.textMuted :
               colors.textPrimary,
      },
    });
  }, [typography, colors, variant, weight, color, size]);

  return <Text style={[styles.text, style]} {...otherProps} />;
});

export interface ThemedViewProps extends ViewProps {
  bg?: 'background' | 'surface' | 'surfaceMuted' | 'brand';
  rounded?: boolean;
}

export const ThemedView = React.memo(function ThemedView(props: ThemedViewProps) {
  const { style, bg, rounded, ...otherProps } = props;
  const { colors, shape } = useTheme();

  const styles = useMemo(() => {
    return StyleSheet.create({
      view: {
        backgroundColor: bg === 'brand' ? colors.primary :
                         bg === 'surface' ? colors.surface :
                         bg === 'surfaceMuted' ? colors.surfaceMuted :
                         bg === 'background' ? colors.background :
                         undefined,
        borderRadius: rounded ? shape.radius : undefined,
      },
    });
  }, [colors, shape, bg, rounded]);

  return <View style={[styles.view, style]} {...otherProps} />;
});
