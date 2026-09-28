import { router, type Href } from 'expo-router';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { colors, radius, spacing } from '@/core/ui/theme';

interface Challenge {
  title: string;
  href: Href;
}

const CHALLENGES: Challenge[] = [
  { title: 'Offline-First Employee Directory', href: '/employees' },
  { title: '50,000 Products', href: '/products' },
  { title: 'OTP Input Component', href: '/otp' },
  { title: 'Field Employee Tracker', href: '/tracker' },
  { title: 'E-commerce Store', href: '/shop' },
  { title: 'Team Chat', href: '/chat' },
  { title: 'Employee App (System Design)', href: '/hr' },
];

export default function HomeScreen() {
  return (
    <ScrollView contentContainerStyle={styles.content}>
      {CHALLENGES.map((challenge, index) => (
        <Pressable
          key={challenge.title}
          accessibilityRole="button"
          style={({ pressed }) => [styles.card, pressed && styles.pressed]}
          onPress={() => router.push(challenge.href)}
        >
          <View style={styles.badge}>
            <Text style={styles.badgeText}>{index + 1}</Text>
          </View>
          <Text style={styles.title}>{challenge.title}</Text>
        </Pressable>
      ))}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  content: { padding: spacing.lg, gap: spacing.md },
  card: { flexDirection: 'row', alignItems: 'center', gap: spacing.md, backgroundColor: colors.surface, borderRadius: radius.md, padding: spacing.lg, borderWidth: StyleSheet.hairlineWidth, borderColor: colors.border },
  pressed: { opacity: 0.7 },
  badge: { width: 40, height: 40, borderRadius: 20, backgroundColor: colors.accentSoft, alignItems: 'center', justifyContent: 'center' },
  badgeText: { color: colors.accent, fontWeight: '700' },
  title: { flex: 1, fontSize: 16, fontWeight: '600', color: colors.text },
});
