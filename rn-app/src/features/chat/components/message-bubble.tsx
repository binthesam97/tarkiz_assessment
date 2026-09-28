import { memo } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { colors, spacing } from '@/core/ui/theme';
import type { ChatMessage, MessageStatus } from '../data/chat.model';

const STATUS_LABEL: Record<MessageStatus, string> = {
  pending: 'Sending',
  sent: 'Sent',
  delivered: 'Delivered',
  read: 'Read',
  failed: 'Not sent — tap to retry',
};

// One shared formatter: toLocaleTimeString builds a new formatter on every call, which adds up across hundreds of rows.
const timeFormatter = new Intl.DateTimeFormat(undefined, { hour: '2-digit', minute: '2-digit' });

const STATUS_ICON: Record<MessageStatus, string> = { pending: '🕓', sent: '✓', delivered: '✓✓', read: '✓✓', failed: '!' };

interface MessageBubbleProps {
  message: ChatMessage;
  isOwn: boolean;
  onRetry?: (message: ChatMessage) => void;
}

/** Re-renders only when this message object changes (e.g. its status advances). */
export const MessageBubble = memo(function MessageBubble({ message, isOwn, onRetry }: MessageBubbleProps) {
  const time = timeFormatter.format(new Date(message.sentAt));
  const canRetry = isOwn && message.status === 'failed' && onRetry;

  return (
    <View style={[styles.row, isOwn ? styles.rowOwn : styles.rowOther]}>
      <Pressable
        disabled={!canRetry}
        onPress={() => onRetry?.(message)}
        style={[styles.bubble, isOwn ? styles.own : styles.other]}
        accessibilityLabel={`${isOwn ? 'You' : message.senderId}: ${message.text}. ${time}${isOwn ? `. ${STATUS_LABEL[message.status]}` : ''}`}
      >
        {!isOwn ? <Text style={styles.sender}>{message.senderId}</Text> : null}
        <Text style={styles.text}>{message.text}</Text>
        <View style={styles.meta}>
          <Text style={styles.time}>{time}</Text>
          {isOwn ? <Text style={[styles.ticks, message.status === 'read' && styles.read, message.status === 'failed' && styles.failed]}>{STATUS_ICON[message.status]}</Text> : null}
        </View>
      </Pressable>
    </View>
  );
});

const styles = StyleSheet.create({
  row: { paddingHorizontal: spacing.md, paddingVertical: 2, flexDirection: 'row' },
  rowOwn: { justifyContent: 'flex-end' },
  rowOther: { justifyContent: 'flex-start' },
  bubble: { maxWidth: '80%', borderRadius: 14, paddingHorizontal: spacing.md, paddingVertical: spacing.sm },
  own: { backgroundColor: '#dcf8c6', borderBottomRightRadius: 4 },
  other: { backgroundColor: colors.surface, borderBottomLeftRadius: 4 },
  sender: { fontSize: 12, fontWeight: '700', color: colors.accent, marginBottom: 2 },
  text: { fontSize: 15, color: colors.text },
  meta: { flexDirection: 'row', justifyContent: 'flex-end', alignItems: 'center', gap: 4, marginTop: 2 },
  time: { fontSize: 11, color: colors.textMuted },
  ticks: { fontSize: 11, color: colors.textMuted, fontWeight: '700' },
  read: { color: '#34b7f1' },
  failed: { color: colors.danger },
});
