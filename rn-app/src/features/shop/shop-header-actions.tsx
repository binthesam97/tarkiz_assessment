import Ionicons from '@expo/vector-icons/Ionicons';
import { router } from 'expo-router';
import { Pressable, StyleSheet, View } from 'react-native';
import { colors, spacing } from '@/core/ui/theme';
import { CartButton } from './cart/components/cart-button';

/** Store header actions: order history and the cart. */
export function ShopHeaderActions() {
  return (
    <View style={styles.row}>
      <Pressable
        style={({ pressed }) => [styles.button, pressed && styles.pressed]}
        onPress={() => router.push('/shop/orders')}
        accessibilityRole="button"
        accessibilityLabel="Your orders"
        hitSlop={8}
      >
        <Ionicons name="receipt-outline" size={24} color={colors.accent} />
      </Pressable>
      <CartButton />
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', gap: spacing.md, paddingHorizontal: spacing.xs },
  button: { padding: spacing.xs },
  pressed: { opacity: 0.6 },
});
