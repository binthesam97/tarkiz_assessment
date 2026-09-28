import { useState } from 'react';
import { Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { useAppDispatch, useAppSelector } from '@/core/store/hooks';
import { Banner } from '@/core/ui/banner';
import { Button } from '@/core/ui/button';
import { KeyboardAvoidingScreen } from '@/core/ui/keyboard-avoiding-screen';
import { colors, radius, spacing } from '@/core/ui/theme';
import { signIn } from '../auth-slice';

/** Seeded accounts from the mock backend, for demonstration only. */
const DEMO_ACCOUNTS = [
  { label: 'Employee', email: 'employee@acme.test', password: 'Emp@12345' },
  { label: 'HR', email: 'hr@acme.test', password: 'Hr@12345' },
] as const;

interface LoginScreenProps {
  title?: string;
  subtitle?: string;
}

/** Shared sign-in screen; features that need a session (HR, checkout) render it in place of their content. */
export function LoginScreen({ title = 'Sign in', subtitle }: LoginScreenProps) {
  const dispatch = useAppDispatch();
  const { submitting, error } = useAppSelector((state) => state.auth);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  const submit = () => void dispatch(signIn({ email: email.trim(), password }));

  return (
    <KeyboardAvoidingScreen style={styles.screen}>
      <View style={styles.card}>
        <Text style={styles.title}>{title}</Text>
        {subtitle ? <Text style={styles.subtitle}>{subtitle}</Text> : null}
        {error ? <Banner tone="danger" message={error} /> : null}
        <TextInput
          style={styles.input}
          placeholder="Work email"
          placeholderTextColor={colors.textMuted}
          value={email}
          onChangeText={setEmail}
          autoCapitalize="none"
          autoComplete="email"
          keyboardType="email-address"
          textContentType="username"
          accessibilityLabel="Work email"
        />
        <TextInput
          style={styles.input}
          placeholder="Password"
          placeholderTextColor={colors.textMuted}
          value={password}
          onChangeText={setPassword}
          secureTextEntry
          textContentType="password"
          accessibilityLabel="Password"
          onSubmitEditing={submit}
        />
        <Button title="Sign in" onPress={submit} loading={submitting} disabled={!email || !password} />
        <View style={styles.demo}>
          <Text style={styles.demoLabel}>Demo accounts:</Text>
          {DEMO_ACCOUNTS.map((account) => (
            <Pressable
              key={account.email}
              accessibilityRole="button"
              onPress={() => {
                setEmail(account.email);
                setPassword(account.password);
              }}
            >
              <Text style={styles.demoLink}>{account.label}</Text>
            </Pressable>
          ))}
        </View>
      </View>
    </KeyboardAvoidingScreen>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, justifyContent: 'center', padding: spacing.lg, backgroundColor: colors.background },
  card: { backgroundColor: colors.surface, borderRadius: radius.md, padding: spacing.xl, gap: spacing.md },
  title: { fontSize: 22, fontWeight: '700', color: colors.text },
  subtitle: { fontSize: 14, color: colors.textMuted },
  input: { borderWidth: StyleSheet.hairlineWidth, borderColor: colors.border, borderRadius: radius.md, padding: spacing.md, fontSize: 15, color: colors.text },
  demo: { flexDirection: 'row', alignItems: 'center', gap: spacing.md, marginTop: spacing.sm },
  demoLabel: { fontSize: 13, color: colors.textMuted },
  demoLink: { fontSize: 13, fontWeight: '600', color: colors.accent },
});
