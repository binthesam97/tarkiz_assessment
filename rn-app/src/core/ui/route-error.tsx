import type { ErrorBoundaryProps } from 'expo-router';
import { StyleSheet, Text, View } from 'react-native';
import { Button } from './button';
import { colors, spacing } from './theme';

/** Per-route error boundary: a crash in one screen shows a retry state instead of taking down the app. */
export function RouteErrorBoundary({ retry }: ErrorBoundaryProps) {
  return (
    <View style={styles.container} accessibilityRole="alert">
      <Text style={styles.title}>This screen could not be displayed</Text>
      <Text style={styles.body}>The rest of the app is unaffected. Try again, or go back and continue.</Text>
      <Button title="Try again" onPress={() => void retry()} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, justifyContent: 'center', padding: spacing.xl, gap: spacing.md, backgroundColor: colors.background },
  title: { fontSize: 18, fontWeight: '700', color: colors.text },
  body: { fontSize: 15, color: colors.textMuted },
});
