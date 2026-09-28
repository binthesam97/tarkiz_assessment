import { useEffect, useState } from 'react';
import { Keyboard, Platform } from 'react-native';

/** Whether the software keyboard is on screen. iOS reports the change before the animation, Android after it. */
export function useKeyboardVisible(): boolean {
  const [visible, setVisible] = useState(Keyboard.isVisible());

  useEffect(() => {
    const show = Platform.OS === 'ios' ? 'keyboardWillShow' : 'keyboardDidShow';
    const hide = Platform.OS === 'ios' ? 'keyboardWillHide' : 'keyboardDidHide';
    const subscriptions = [Keyboard.addListener(show, () => setVisible(true)), Keyboard.addListener(hide, () => setVisible(false))];
    return () => subscriptions.forEach((subscription) => subscription.remove());
  }, []);

  return visible;
}
