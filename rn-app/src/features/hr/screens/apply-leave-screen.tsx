import { router } from 'expo-router';
import { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { Banner } from '@/core/ui/banner';
import { Button } from '@/core/ui/button';
import { KeyboardAvoidingScreen } from '@/core/ui/keyboard-avoiding-screen';
import { colors, radius, spacing } from '@/core/ui/theme';
import { useApplyLeaveMutation } from '../data/hr-api';
import { todayIso, type LeaveType } from '../data/hr.model';

const LEAVE_TYPES: LeaveType[] = ['CASUAL', 'SICK', 'EARNED'];
const DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/;

export function ApplyLeaveScreen() {
  const [applyLeave, { isLoading }] = useApplyLeaveMutation();
  const [type, setType] = useState<LeaveType>('CASUAL');
  const [from, setFrom] = useState(todayIso());
  const [to, setTo] = useState(todayIso());
  const [reason, setReason] = useState('');
  const [error, setError] = useState<string | null>(null);

  const submit = async () => {
    if (!DATE_PATTERN.test(from) || !DATE_PATTERN.test(to)) return setError('Dates must be in YYYY-MM-DD format.');
    if (from > to) return setError('The end date must be on or after the start date.');
    setError(null);
    try {
      await applyLeave({ type, from, to, reason: reason.trim() }).unwrap();
      router.back();
    } catch {
      setError('Could not submit the request. Please try again.');
    }
  };

  return (
    <KeyboardAvoidingScreen style={styles.flex}>
      <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
        {error ? <Banner tone="danger" message={error} /> : null}
        <Text style={styles.label}>Type</Text>
        <View style={styles.segmented}>
          {LEAVE_TYPES.map((option) => (
            <Pressable key={option} accessibilityRole="radio" accessibilityState={{ selected: type === option }} onPress={() => setType(option)} style={[styles.segment, type === option && styles.segmentActive]}>
              <Text style={[styles.segmentText, type === option && styles.segmentTextActive]}>{option.charAt(0) + option.slice(1).toLowerCase()}</Text>
            </Pressable>
          ))}
        </View>
        <Text style={styles.label}>From (YYYY-MM-DD)</Text>
        <TextInput style={styles.input} value={from} onChangeText={setFrom} accessibilityLabel="From date" keyboardType="numbers-and-punctuation" />
        <Text style={styles.label}>To (YYYY-MM-DD)</Text>
        <TextInput style={styles.input} value={to} onChangeText={setTo} accessibilityLabel="To date" keyboardType="numbers-and-punctuation" />
        <Text style={styles.label}>Reason</Text>
        <TextInput style={[styles.input, styles.multiline]} value={reason} onChangeText={setReason} multiline accessibilityLabel="Reason" />
        <Button title="Submit request" onPress={submit} loading={isLoading} />
      </ScrollView>
    </KeyboardAvoidingScreen>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1, backgroundColor: colors.background },
  content: { padding: spacing.lg, gap: spacing.sm },
  label: { marginTop: spacing.sm, fontSize: 13, fontWeight: '600', color: colors.textMuted },
  input: { backgroundColor: colors.surface, borderWidth: StyleSheet.hairlineWidth, borderColor: colors.border, borderRadius: radius.md, padding: spacing.md, fontSize: 15, color: colors.text },
  multiline: { minHeight: 90, textAlignVertical: 'top' },
  segmented: { flexDirection: 'row', backgroundColor: colors.border, borderRadius: radius.md, padding: 3 },
  segment: { flex: 1, paddingVertical: spacing.sm, alignItems: 'center', borderRadius: radius.sm },
  segmentActive: { backgroundColor: colors.surface },
  segmentText: { color: colors.textMuted, fontWeight: '500' },
  segmentTextActive: { color: colors.text, fontWeight: '700' },
});
