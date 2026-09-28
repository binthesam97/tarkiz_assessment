import { Stack, router } from 'expo-router';
import { useState } from 'react';
import { ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { useAppDispatch, useAppSelector } from '@/core/store/hooks';
import { Banner } from '@/core/ui/banner';
import { Button } from '@/core/ui/button';
import { KeyboardAvoidingScreen } from '@/core/ui/keyboard-avoiding-screen';
import { colors, radius, spacing } from '@/core/ui/theme';
import { fullName, type EmployeeChanges } from '../data/employee.model';
import { editEmployee, employeeSelectors } from '../state/employees-slice';

const EDITABLE_FIELDS: { key: keyof EmployeeChanges; label: string; keyboardType?: 'phone-pad' }[] = [
  { key: 'designation', label: 'Designation' },
  { key: 'location', label: 'Location' },
  { key: 'phone', label: 'Phone', keyboardType: 'phone-pad' },
];

export function EmployeeDetailScreen({ id }: { id: string }) {
  const dispatch = useAppDispatch();
  const employee = useAppSelector((state) => employeeSelectors.selectById(state, id));
  const isPending = useAppSelector((state) => state.employees.pendingIds.includes(id));
  const isOnline = useAppSelector((state) => state.connectivity.isOnline);
  const [draft, setDraft] = useState<EmployeeChanges>(() => ({ designation: employee?.designation, location: employee?.location, phone: employee?.phone }));
  const [saving, setSaving] = useState(false);

  if (!employee) return <Text style={styles.missing}>Employee not found on this device.</Text>;

  const changes = Object.fromEntries(EDITABLE_FIELDS.filter(({ key }) => draft[key] !== employee[key]).map(({ key }) => [key, draft[key]?.trim() ?? ''])) as EmployeeChanges;
  const isDirty = Object.keys(changes).length > 0;

  const save = async () => {
    setSaving(true);
    try {
      await dispatch(editEmployee({ id, changes })).unwrap();
      router.back();
    } finally {
      setSaving(false);
    }
  };

  return (
    <KeyboardAvoidingScreen style={styles.flex}>
      <Stack.Screen options={{ title: fullName(employee) }} />
      {isPending ? <Banner tone="warning" message="This record has changes waiting to sync." /> : null}
      <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
        <View style={styles.card}>
          <Text style={styles.name}>{fullName(employee)}</Text>
          <Text style={styles.meta}>{employee.email}</Text>
          <Text style={styles.meta}>{employee.department} · version {employee.version}</Text>
        </View>

        {EDITABLE_FIELDS.map(({ key, label, keyboardType }) => (
          <View key={key} style={styles.field}>
            <Text style={styles.label}>{label}</Text>
            <TextInput
              style={styles.input}
              value={draft[key] ?? ''}
              onChangeText={(value) => setDraft((current) => ({ ...current, [key]: value }))}
              keyboardType={keyboardType}
              accessibilityLabel={label}
            />
          </View>
        ))}

        <Button title={isOnline ? 'Save' : 'Save offline'} onPress={save} disabled={!isDirty} loading={saving} />
        {!isOnline ? <Text style={styles.hint}>Saved to this device and uploaded automatically when you are back online.</Text> : null}
      </ScrollView>
    </KeyboardAvoidingScreen>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1, backgroundColor: colors.background },
  content: { padding: spacing.lg, gap: spacing.lg },
  card: { backgroundColor: colors.surface, borderRadius: radius.md, padding: spacing.lg, gap: 2 },
  name: { fontSize: 20, fontWeight: '700', color: colors.text },
  meta: { color: colors.textMuted },
  field: { gap: spacing.xs },
  label: { fontSize: 13, fontWeight: '600', color: colors.textMuted },
  input: { backgroundColor: colors.surface, borderRadius: radius.md, borderWidth: StyleSheet.hairlineWidth, borderColor: colors.border, padding: spacing.md, fontSize: 15, color: colors.text },
  hint: { fontSize: 13, color: colors.textMuted, textAlign: 'center' },
  missing: { padding: spacing.xl, textAlign: 'center', color: colors.textMuted },
});
