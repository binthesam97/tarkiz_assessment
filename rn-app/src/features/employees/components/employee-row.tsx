import { memo } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { colors, radius, spacing } from '@/core/ui/theme';
import { fullName, type Employee } from '../data/employee.model';

interface EmployeeRowProps {
  employee: Employee;
  pending: boolean;
  onPress: (id: string) => void;
}

export const EmployeeRow = memo(function EmployeeRow({ employee, pending, onPress }: EmployeeRowProps) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityHint="Opens employee details"
      style={({ pressed }) => [styles.row, pressed && styles.pressed]}
      onPress={() => onPress(employee.id)}
    >
      <View style={styles.avatar}>
        <Text style={styles.initials}>{employee.firstName[0]}{employee.lastName[0]}</Text>
      </View>
      <View style={styles.body}>
        <Text style={styles.name}>{fullName(employee)}</Text>
        <Text style={styles.meta} numberOfLines={1}>{employee.designation} · {employee.department}</Text>
      </View>
      {pending ? <Text style={styles.pending}>Not synced</Text> : null}
    </Pressable>
  );
});

export const EMPLOYEE_ROW_HEIGHT = 68;

const styles = StyleSheet.create({
  row: { height: EMPLOYEE_ROW_HEIGHT, flexDirection: 'row', alignItems: 'center', gap: spacing.md, paddingHorizontal: spacing.lg, backgroundColor: colors.surface },
  pressed: { backgroundColor: colors.background },
  avatar: { width: 40, height: 40, borderRadius: 20, backgroundColor: colors.accentSoft, alignItems: 'center', justifyContent: 'center' },
  initials: { color: colors.accent, fontWeight: '700' },
  body: { flex: 1 },
  name: { fontSize: 16, fontWeight: '600', color: colors.text },
  meta: { fontSize: 13, color: colors.textMuted, marginTop: 2 },
  pending: { fontSize: 11, fontWeight: '700', color: colors.warning, backgroundColor: colors.warningSoft, paddingHorizontal: spacing.sm, paddingVertical: 2, borderRadius: radius.pill, overflow: 'hidden' },
});
