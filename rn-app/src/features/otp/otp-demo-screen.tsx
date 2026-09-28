import { OtpInput, type OtpInputHandle } from '@tarkiz/react-native-otp-input';
import { useRef, useState } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { Banner } from '@/core/ui/banner';
import { Button } from '@/core/ui/button';
import { KeyboardAvoidingScreen } from '@/core/ui/keyboard-avoiding-screen';
import { colors, radius, spacing } from '@/core/ui/theme';

/** Stand-in for a server-side verification call. */
const DEMO_CODE = '246810';
const verifyCode = (code: string) => new Promise<boolean>((resolve) => setTimeout(() => resolve(code === DEMO_CODE), 600));

export function OtpDemoScreen() {
  const otpRef = useRef<OtpInputHandle>(null);
  const [code, setCode] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [status, setStatus] = useState<'idle' | 'verifying' | 'verified'>('idle');

  const verify = async (value: string) => {
    setStatus('verifying');
    const ok = await verifyCode(value);
    if (ok) {
      setStatus('verified');
      return;
    }
    otpRef.current?.clear();
    setStatus('idle');
    setError('That code is incorrect. Please try again.');
  };

  const onChange = (value: string) => {
    setCode(value);
    if (error) setError(null);
  };

  return (
    <KeyboardAvoidingScreen style={styles.flex}>
      <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
        <View style={styles.card}>
          <Text style={styles.title}>Verify your phone</Text>
          <Text style={styles.subtitle}>
            Enter the 6-digit code. For this demo the correct code is <Text style={styles.code}>{DEMO_CODE}</Text> — try pasting it.
          </Text>

          <OtpInput
            ref={otpRef}
            length={6}
            value={code}
            onChange={onChange}
            onComplete={verify}
            error={error}
            // Stay editable while verifying: disabling would drop the keyboard, and clear() refocuses on failure.
            disabled={status === 'verified'}
            autoFocus
            testID="otp-demo"
          />

          {status === 'verified' ? (
            <Banner tone="success" message="Phone number verified." />
          ) : (
            <Button title="Verify" onPress={() => void verify(code)} disabled={code.length < 6} loading={status === 'verifying'} />
          )}
          <Button
            title="Reset"
            variant="secondary"
            onPress={() => {
              setStatus('idle');
              setError(null);
              otpRef.current?.clear();
            }}
          />
        </View>

        <View style={styles.card}>
          <Text style={styles.heading}>Variants</Text>
          <Text style={styles.label}>Alphanumeric, 4 characters</Text>
          <OtpInput length={4} characterSet="alphanumeric" />
          <Text style={styles.label}>Masked PIN</Text>
          <OtpInput length={4} secure />
        </View>
      </ScrollView>
    </KeyboardAvoidingScreen>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1, backgroundColor: colors.background },
  content: { padding: spacing.lg, gap: spacing.lg },
  card: { backgroundColor: colors.surface, borderRadius: radius.md, padding: spacing.xl, gap: spacing.lg },
  title: { fontSize: 20, fontWeight: '700', color: colors.text, textAlign: 'center' },
  subtitle: { fontSize: 14, color: colors.textMuted, textAlign: 'center' },
  code: { fontWeight: '700', color: colors.text },
  heading: { fontSize: 16, fontWeight: '600', color: colors.text },
  label: { fontSize: 13, color: colors.textMuted, marginBottom: -spacing.sm },
});
