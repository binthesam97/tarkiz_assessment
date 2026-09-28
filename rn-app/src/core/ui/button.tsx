import { memo } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, Text, type PressableProps } from 'react-native';
import { colors, radius, spacing } from './theme';

type Variant = 'primary' | 'secondary' | 'danger';

interface ButtonProps extends Omit<PressableProps, 'children' | 'style'> {
  title: string;
  variant?: Variant;
  loading?: boolean;
  compact?: boolean;
}

export const Button = memo(function Button({ title, variant = 'primary', loading = false, compact = false, disabled, ...rest }: ButtonProps) {
  const isDisabled = disabled || loading;
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ disabled: isDisabled, busy: loading }}
      disabled={isDisabled}
      style={({ pressed }) => [styles.base, styles[variant], compact && styles.compact, (pressed || isDisabled) && styles.dimmed]}
      {...rest}
    >
      {loading ? (
        <ActivityIndicator color={variant === 'primary' ? '#fff' : colors.accent} />
      ) : (
        <Text style={[styles.label, variant === 'primary' ? styles.labelOnPrimary : variant === 'danger' ? styles.labelDanger : null]}>{title}</Text>
      )}
    </Pressable>
  );
});

const styles = StyleSheet.create({
  base: {
    minHeight: 44,
    paddingHorizontal: spacing.lg,
    borderRadius: radius.md,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.border,
  },
  compact: { minHeight: 34, paddingHorizontal: spacing.md },
  primary: { backgroundColor: colors.accent, borderColor: colors.accent },
  secondary: { backgroundColor: colors.surface },
  danger: { backgroundColor: colors.surface, borderColor: colors.danger },
  dimmed: { opacity: 0.6 },
  label: { fontSize: 15, fontWeight: '600', color: colors.text },
  labelOnPrimary: { color: '#fff' },
  labelDanger: { color: colors.danger },
});
