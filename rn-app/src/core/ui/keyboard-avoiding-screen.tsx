import { useCallback, useRef, useState, type ReactNode } from 'react';
import { KeyboardAvoidingView, StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';

interface KeyboardAvoidingScreenProps {
  style?: StyleProp<ViewStyle>;
  children: ReactNode;
}

/**
 * Keeps the focused input above the keyboard on both platforms.
 *
 * Android apps draw edge-to-edge, so the window no longer shrinks for the keyboard and the screen has
 * to make room itself, as on iOS. React Native's KeyboardAvoidingView measures itself against its
 * parent and needs the distance from the top of the window (status bar, header) as an offset. This
 * wrapper measures that distance instead of hard-coding a header height.
 */
export function KeyboardAvoidingScreen({ style, children }: KeyboardAvoidingScreenProps) {
  const container = useRef<View>(null);
  const [top, setTop] = useState(0);

  const measure = useCallback(() => container.current?.measureInWindow((_x, y) => setTop(y)), []);

  return (
    <View ref={container} style={styles.flex} onLayout={measure}>
      <KeyboardAvoidingView style={[styles.flex, style]} behavior="padding" keyboardVerticalOffset={top}>
        {children}
      </KeyboardAvoidingView>
    </View>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
});
