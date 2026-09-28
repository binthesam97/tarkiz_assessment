import { memo, useState } from 'react';
import { Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { colors, radius, spacing } from '@/core/ui/theme';

interface ComposerProps {
  onSend: (text: string) => void;
  onTyping: () => void;
}

/** Owns its own text state so keystrokes never re-render the message list. */
export const Composer = memo(function Composer({ onSend, onTyping }: ComposerProps) {
  const [text, setText] = useState('');
  const canSend = text.trim().length > 0;

  const send = () => {
    if (!canSend) return;
    onSend(text);
    setText('');
  };

  return (
    <View style={styles.container}>
      <TextInput
        style={styles.input}
        value={text}
        onChangeText={(value) => {
          setText(value);
          onTyping();
        }}
        placeholder="Message"
        placeholderTextColor={colors.textMuted}
        multiline
        accessibilityLabel="Message"
      />
      <Pressable accessibilityRole="button" accessibilityLabel="Send" disabled={!canSend} onPress={send} style={[styles.send, !canSend && styles.disabled]}>
        <Text style={styles.sendText}>Send</Text>
      </Pressable>
    </View>
  );
});

const styles = StyleSheet.create({
  container: { flexDirection: 'row', alignItems: 'flex-end', gap: spacing.sm, padding: spacing.sm, backgroundColor: colors.surface, borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: colors.border },
  input: { flex: 1, maxHeight: 120, minHeight: 40, paddingHorizontal: spacing.md, paddingVertical: spacing.sm, borderRadius: radius.md, backgroundColor: colors.background, fontSize: 15, color: colors.text },
  send: { height: 40, paddingHorizontal: spacing.lg, borderRadius: radius.md, backgroundColor: colors.accent, justifyContent: 'center' },
  disabled: { opacity: 0.4 },
  sendText: { color: '#fff', fontWeight: '700' },
});
