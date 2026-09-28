import { memo } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { colors, spacing } from './theme';

type Tone = 'info' | 'warning' | 'danger' | 'success';

const TONES: Record<Tone, { background: string; foreground: string }> = {
  info: { background: colors.accentSoft, foreground: colors.accent },
  warning: { background: colors.warningSoft, foreground: colors.warning },
  danger: { background: colors.dangerSoft, foreground: colors.danger },
  success: { background: colors.successSoft, foreground: colors.success },
};

interface BannerProps {
  message: string;
  tone?: Tone;
  actionLabel?: string;
  onAction?: () => void;
}

export const Banner = memo(function Banner({ message, tone = 'info', actionLabel, onAction }: BannerProps) {
  const { background, foreground } = TONES[tone];
  return (
    <View style={[styles.container, { backgroundColor: background }]} accessibilityRole="alert">
      <Text style={[styles.message, { color: foreground }]}>{message}</Text>
      {actionLabel && onAction ? (
        <Pressable accessibilityRole="button" onPress={onAction} hitSlop={8}>
          <Text style={[styles.action, { color: foreground }]}>{actionLabel}</Text>
        </Pressable>
      ) : null}
    </View>
  );
});

const styles = StyleSheet.create({
  container: { flexDirection: 'row', alignItems: 'center', gap: spacing.md, paddingHorizontal: spacing.lg, paddingVertical: spacing.md },
  message: { flex: 1, fontSize: 14, fontWeight: '500' },
  action: { fontSize: 14, fontWeight: '700' },
});
