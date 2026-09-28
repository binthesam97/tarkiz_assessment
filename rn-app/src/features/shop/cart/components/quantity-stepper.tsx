import { memo } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { colors, radius } from '@/core/ui/theme';

interface QuantityStepperProps {
  value: number;
  min?: number;
  max: number;
  onChange: (value: number) => void;
  label: string;
}

export const QuantityStepper = memo(function QuantityStepper({ value, min = 1, max, onChange, label }: QuantityStepperProps) {
  return (
    <View style={styles.container} accessibilityRole="adjustable" accessibilityLabel={`${label} quantity`} accessibilityValue={{ min, max, now: value }}>
      <Pressable
        style={styles.button}
        onPress={() => onChange(value - 1)}
        disabled={value <= min}
        accessibilityRole="button"
        accessibilityLabel="Decrease quantity"
        hitSlop={6}
      >
        <Text style={[styles.symbol, value <= min && styles.disabled]}>−</Text>
      </Pressable>
      <Text style={styles.value}>{value}</Text>
      <Pressable
        style={styles.button}
        onPress={() => onChange(value + 1)}
        disabled={value >= max}
        accessibilityRole="button"
        accessibilityLabel="Increase quantity"
        hitSlop={6}
      >
        <Text style={[styles.symbol, value >= max && styles.disabled]}>+</Text>
      </Pressable>
    </View>
  );
});

const styles = StyleSheet.create({
  container: { flexDirection: 'row', alignItems: 'center', borderWidth: StyleSheet.hairlineWidth, borderColor: colors.border, borderRadius: radius.md, alignSelf: 'flex-start' },
  button: { width: 36, height: 34, alignItems: 'center', justifyContent: 'center' },
  symbol: { fontSize: 18, fontWeight: '600', color: colors.accent },
  disabled: { color: colors.border },
  value: { minWidth: 24, textAlign: 'center', fontSize: 15, fontWeight: '600', color: colors.text },
});
