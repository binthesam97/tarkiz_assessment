import { Pressable, StyleSheet, Text, View } from 'react-native';
import { colors, radius, spacing } from '@/core/ui/theme';

interface ChoiceRowProps {
  title: string;
  detail: string;
  trailing?: string;
  selected: boolean;
  onPress: () => void;
}

/** A radio-style option used for delivery and payment choices. */
export function ChoiceRow({ title, detail, trailing, selected, onPress }: ChoiceRowProps) {
  return (
    <Pressable style={[styles.row, selected && styles.selected]} onPress={onPress} accessibilityRole="radio" accessibilityState={{ checked: selected }}>
      <View style={[styles.radio, selected && styles.radioSelected]}>{selected ? <View style={styles.radioDot} /> : null}</View>
      <View style={styles.body}>
        <Text style={styles.title}>{title}</Text>
        <Text style={styles.detail}>{detail}</Text>
      </View>
      {trailing ? <Text style={styles.trailing}>{trailing}</Text> : null}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', gap: spacing.md, padding: spacing.md, borderRadius: radius.md, borderWidth: 1, borderColor: colors.border, backgroundColor: colors.surface },
  selected: { borderColor: colors.accent, backgroundColor: colors.accentSoft },
  radio: { width: 20, height: 20, borderRadius: 10, borderWidth: 2, borderColor: colors.border, alignItems: 'center', justifyContent: 'center' },
  radioSelected: { borderColor: colors.accent },
  radioDot: { width: 10, height: 10, borderRadius: 5, backgroundColor: colors.accent },
  body: { flex: 1, gap: 2 },
  title: { fontSize: 15, fontWeight: '600', color: colors.text },
  detail: { fontSize: 13, color: colors.textMuted },
  trailing: { fontSize: 14, fontWeight: '600', color: colors.text },
});
