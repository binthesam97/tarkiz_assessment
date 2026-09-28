import Ionicons from '@expo/vector-icons/Ionicons';
import { router, type Href } from 'expo-router';
import { Pressable, StyleSheet } from 'react-native';
import { colors } from './theme';

/**
 * Back button for screens opened without history (a notification, a link, or a reload that restores
 * the last screen). The native back button only appears when there is a screen to return to, so this
 * one replaces the current screen with its logical parent instead.
 */
export function HeaderBackFallback({ to }: { to: Href }) {
  return (
    <Pressable
      style={({ pressed }) => [styles.button, pressed && styles.pressed]}
      onPress={() => router.replace(to)}
      accessibilityRole="button"
      accessibilityLabel="Back"
      hitSlop={8}
    >
      <Ionicons name="chevron-back" size={28} color={colors.accent} />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  button: { paddingRight: 8 },
  pressed: { opacity: 0.6 },
});
