import { Stack, useFocusEffect } from 'expo-router';
import { useCallback, useEffect, useRef } from 'react';
import { AppState, FlatList, StyleSheet, Text, View, type ListRenderItem } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useKeyboardVisible } from '@/core/hooks/use-keyboard-visible';
import { store } from '@/core/store/store';
import { useAppSelector } from '@/core/store/hooks';
import { Banner } from '@/core/ui/banner';
import { Button } from '@/core/ui/button';
import { KeyboardAvoidingScreen } from '@/core/ui/keyboard-avoiding-screen';
import { colors, spacing } from '@/core/ui/theme';
import { Composer } from '../components/composer';
import { MessageBubble } from '../components/message-bubble';
import type { ChatMessage } from '../data/chat.model';
import { chatSelectors } from '../state/chat-slice';
import { ChatService } from '../state/chat-service';

const CONVERSATION_ID = 'team-general';
const GUEST_USER_ID = 'mobile-guest';
const LOAD_TEST_SIZE = 1000;

export function ChatScreen() {
  const userId = useAppSelector((state) => state.auth.session?.user.sub ?? GUEST_USER_ID);
  const messages = useAppSelector(chatSelectors.selectAll);
  const connection = useAppSelector((state) => state.chat.connection);
  const typingUserIds = useAppSelector((state) => state.chat.typingUserIds);
  const stats = useAppSelector((state) => state.chat.stats);
  const isOnline = useAppSelector((state) => state.connectivity.isOnline);
  const insets = useSafeAreaInsets();
  const keyboardVisible = useKeyboardVisible();
  const serviceRef = useRef<ChatService | null>(null);

  useEffect(() => {
    const service = new ChatService(store.dispatch, store.getState, userId, CONVERSATION_ID);
    serviceRef.current = service;
    void service.open();
    return () => {
      service.close();
      serviceRef.current = null;
    };
  }, [userId]);

  useEffect(() => {
    if (isOnline) serviceRef.current?.onNetworkRestored();
  }, [isOnline]);

  useFocusEffect(
    useCallback(() => {
      serviceRef.current?.setVisible(AppState.currentState === 'active');
      const subscription = AppState.addEventListener('change', (state) => serviceRef.current?.setVisible(state === 'active'));
      return () => {
        subscription.remove();
        serviceRef.current?.setVisible(false);
      };
    }, []),
  );

  const send = useCallback((text: string) => void serviceRef.current?.send(text), []);
  const onTyping = useCallback(() => serviceRef.current?.onUserTyping(), []);
  const retry = useCallback((message: ChatMessage) => void serviceRef.current?.retry(message), []);
  const loadOlder = useCallback(() => void serviceRef.current?.loadOlder(), []);

  const renderItem = useCallback<ListRenderItem<ChatMessage>>(
    ({ item }) => <MessageBubble message={item} isOwn={item.senderId === userId} onRetry={retry} />,
    [userId, retry],
  );

  return (
    <KeyboardAvoidingScreen style={styles.screen}>
      <Stack.Screen options={{ title: 'Team chat', headerRight: () => <Text style={styles.connection}>{connection === 'connected' ? '● Online' : connection}</Text> }} />
      {connection !== 'connected' ? <Banner tone="warning" message={isOnline ? 'Reconnecting… messages will send when the connection is back.' : 'Offline. Messages are saved and will send when you reconnect.'} /> : null}

      <View style={styles.loadTest}>
        <Text style={styles.stats}>
          Received {stats.received} · last batch {stats.lastBatchSize} msgs, {stats.lastBatchMs} ms to apply · {messages.length} in memory
        </Text>
        <Button title={`Simulate ${LOAD_TEST_SIZE}`} variant="secondary" compact onPress={() => serviceRef.current?.requestLoadTest(LOAD_TEST_SIZE)} disabled={connection !== 'connected'} />
      </View>

      <FlatList
        style={styles.list}
        data={messages}
        renderItem={renderItem}
        keyExtractor={keyExtractor}
        // Inverted: index 0 (newest) sits at the bottom, and new messages do not shift the scroll position.
        inverted
        onEndReached={loadOlder}
        onEndReachedThreshold={0.3}
        initialNumToRender={20}
        maxToRenderPerBatch={20}
        windowSize={7}
        keyboardDismissMode="interactive"
      />

      {typingUserIds.length ? <Text style={styles.typing}>{typingUserIds.join(', ')} {typingUserIds.length > 1 ? 'are' : 'is'} typing…</Text> : null}
      {/* The keyboard covers the home indicator / navigation bar, so the safe-area gap is only needed without it. */}
      <View style={{ paddingBottom: keyboardVisible ? 0 : insets.bottom, backgroundColor: colors.surface }}>
        <Composer onSend={send} onTyping={onTyping} />
      </View>
    </KeyboardAvoidingScreen>
  );
}

const keyExtractor = (message: ChatMessage) => message.id;

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: '#ece5dd' },
  list: { flex: 1 },
  connection: { fontSize: 13, color: colors.success, fontWeight: '600' },
  loadTest: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, paddingHorizontal: spacing.md, paddingVertical: spacing.sm, backgroundColor: colors.surface },
  stats: { flex: 1, fontSize: 11, color: colors.textMuted },
  typing: { paddingHorizontal: spacing.lg, paddingVertical: spacing.xs, fontSize: 13, fontStyle: 'italic', color: colors.textMuted },
});
