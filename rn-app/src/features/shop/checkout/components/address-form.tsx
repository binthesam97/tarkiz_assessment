import { useState } from 'react';
import { StyleSheet, Text, TextInput, View, type TextInputProps } from 'react-native';
import { Button } from '@/core/ui/button';
import { colors, radius, spacing } from '@/core/ui/theme';
import type { ShippingAddress } from '../../api/shop.model';

const POSTAL_CODE = /^\d{6}$/;

interface AddressFormProps {
  initial: ShippingAddress;
  onSubmit: (address: ShippingAddress) => void;
}

export function AddressForm({ initial, onSubmit }: AddressFormProps) {
  const [address, setAddress] = useState(initial);
  const [touched, setTouched] = useState(false);
  const set = (field: keyof ShippingAddress) => (value: string) => setAddress((current) => ({ ...current, [field]: value }));

  const trimmed: ShippingAddress = { name: address.name.trim(), line1: address.line1.trim(), city: address.city.trim(), postalCode: address.postalCode.trim() };
  const errors: Partial<Record<keyof ShippingAddress, string>> = {
    ...(!trimmed.name && { name: 'Enter the recipient’s name' }),
    ...(!trimmed.line1 && { line1: 'Enter a street address' }),
    ...(!trimmed.city && { city: 'Enter a city' }),
    ...(!POSTAL_CODE.test(trimmed.postalCode) && { postalCode: 'Enter a 6-digit PIN code' }),
  };
  const valid = Object.keys(errors).length === 0;

  const submit = () => {
    setTouched(true);
    if (valid) onSubmit(trimmed);
  };

  return (
    <View style={styles.form}>
      <Field label="Full name" value={address.name} onChangeText={set('name')} error={touched ? errors.name : undefined} autoComplete="name" textContentType="name" />
      <Field label="Address" value={address.line1} onChangeText={set('line1')} error={touched ? errors.line1 : undefined} autoComplete="street-address" textContentType="fullStreetAddress" />
      <View style={styles.row}>
        <View style={styles.flex}>
          <Field label="City" value={address.city} onChangeText={set('city')} error={touched ? errors.city : undefined} textContentType="addressCity" />
        </View>
        <View style={styles.flex}>
          <Field label="PIN code" value={address.postalCode} onChangeText={set('postalCode')} error={touched ? errors.postalCode : undefined} keyboardType="number-pad" maxLength={6} textContentType="postalCode" />
        </View>
      </View>
      <Button title="Deliver to this address" onPress={submit} />
    </View>
  );
}

function Field({ label, error, ...input }: TextInputProps & { label: string; error?: string }) {
  return (
    <View style={styles.field}>
      <Text style={styles.label}>{label}</Text>
      <TextInput style={[styles.input, error && styles.inputError]} placeholderTextColor={colors.textMuted} accessibilityLabel={label} {...input} />
      {error ? <Text style={styles.error}>{error}</Text> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  form: { gap: spacing.md },
  row: { flexDirection: 'row', gap: spacing.md },
  flex: { flex: 1 },
  field: { gap: spacing.xs },
  label: { fontSize: 13, fontWeight: '600', color: colors.textMuted },
  input: { backgroundColor: colors.surface, borderWidth: StyleSheet.hairlineWidth, borderColor: colors.border, borderRadius: radius.md, padding: spacing.md, fontSize: 15, color: colors.text },
  inputError: { borderColor: colors.danger },
  error: { fontSize: 12, color: colors.danger },
});
