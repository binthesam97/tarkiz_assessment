import Ionicons from '@expo/vector-icons/Ionicons';
import { router } from 'expo-router';
import { Pressable, StyleSheet, Text } from 'react-native';
import { useAppSelector } from '@/core/store/hooks';
import { colors, radius, spacing } from '@/core/ui/theme';
import { selectCartCount } from '../state/cart-slice';

/** Header action: cart icon with the number of items in the cart. */
export function CartButton() {
  const count = useAppSelector(selectCartCount);
  return (
    <Pressable
      style={({ pressed }) => [styles.button, pressed && styles.pressed]}
      onPress={() => router.push('/shop/cart')}
      accessibilityRole="button"
      accessibilityLabel={count ? `Cart, ${count} items` : 'Cart, empty'}
      hitSlop={8}
    >
      <Ionicons name="cart-outline" size={26} color={colors.accent} />
      {count ? <Text style={styles.count}>{count > 99 ? '99+' : count}</Text> : null}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  button: { padding: spacing.xs },
  pressed: { opacity: 0.6 },
  count: {
    position: 'absolute',
    top: -2,
    right: -4,
    minWidth: 18,
    paddingHorizontal: 4,
    borderRadius: radius.pill,
    backgroundColor: colors.danger,
    color: '#fff',
    fontSize: 11,
    fontWeight: '700',
    lineHeight: 18,
    textAlign: 'center',
    overflow: 'hidden',
  },
});
