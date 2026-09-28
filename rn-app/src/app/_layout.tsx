import { Stack, type Href } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useEffect } from 'react';
import { Provider } from 'react-redux';
import { bootstrapApp } from '@/core/bootstrap/app-bootstrap';
import { useNotificationDeepLinks } from '@/core/notifications/use-notification-deep-links';
import { store } from '@/core/store/store';
import { HeaderBackFallback } from '@/core/ui/header-back-fallback';
import { colors } from '@/core/ui/theme';
import { ShopHeaderActions, useOrderUpdates } from '@/features/shop';

/** Where "back" goes when a screen was opened without history. Anything not listed returns home. */
const PARENT_ROUTES: Record<string, Href> = {
  'employees/[id]': '/employees',
  'shop/product/[id]': '/shop',
  'shop/cart': '/shop',
  'shop/checkout': '/shop/cart',
  'shop/orders/index': '/shop',
  'shop/orders/[id]': '/shop/orders',
  'hr/leave': '/hr',
};

export default function RootLayout() {
  useEffect(() => bootstrapApp(store.dispatch, store.getState), []);
  useNotificationDeepLinks();

  return (
    <Provider store={store}>
      <OrderUpdates />
      <StatusBar style="dark" />
      <Stack
        screenOptions={({ navigation, route }) => ({
          headerTintColor: colors.accent,
          headerBackButtonDisplayMode: 'minimal',
          headerTitleStyle: { color: colors.text },
          contentStyle: { backgroundColor: colors.background },
          headerLeft:
            route.name === 'index' || navigation.canGoBack()
              ? undefined
              : () => <HeaderBackFallback to={PARENT_ROUTES[route.name] ?? '/'} />,
        })}
      >
        <Stack.Screen name="index" options={{ title: 'Tarkiz React Native Assessment' }} />
        <Stack.Screen name="employees/index" options={{ title: 'Employee Directory' }} />
        <Stack.Screen name="products" options={{ title: 'Products' }} />
        <Stack.Screen name="otp" options={{ title: 'OTP Input' }} />
        <Stack.Screen name="tracker" options={{ title: 'Field Tracker' }} />
        <Stack.Screen name="chat" options={{ title: 'Team chat' }} />
        <Stack.Screen name="shop/index" options={{ title: 'Tarkiz Store', headerRight: () => <ShopHeaderActions /> }} />
        <Stack.Screen name="shop/product/[id]" options={{ title: '', headerRight: () => <ShopHeaderActions /> }} />
        <Stack.Screen name="shop/cart" options={{ title: 'Cart' }} />
        <Stack.Screen name="shop/checkout" options={{ title: 'Checkout', presentation: 'modal' }} />
        <Stack.Screen name="shop/orders/index" options={{ title: 'Your orders' }} />
        <Stack.Screen name="shop/orders/[id]" options={{ title: 'Order details' }} />
        <Stack.Screen name="hr/index" options={{ title: 'Tarkiz HR portal' }} />
        <Stack.Screen name="hr/leave" options={{ title: 'Apply for leave', presentation: 'modal' }} />
      </Stack>
    </Provider>
  );
}

/** Listens for order events app-wide, so an order update arrives wherever the customer is. */
function OrderUpdates() {
  useOrderUpdates();
  return null;
}
