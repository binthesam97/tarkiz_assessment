import { useCallback, useEffect, useImperativeHandle, useRef, useState, type Ref } from 'react';
import {
  StyleSheet,
  Text,
  TextInput,
  View,
  type NativeSyntheticEvent,
  type StyleProp,
  type TextInputKeyPressEventData,
  type TextStyle,
  type ViewStyle,
} from 'react-native';
import { applyBackspace, applyInput, isComplete, toCells, type OtpCharacterSet } from './otp-logic';

export interface OtpInputHandle {
  focus: () => void;
  clear: () => void;
}

export interface OtpInputProps {
  /** Number of cells. Default 6. */
  length?: number;
  /** Controlled value. Omit to let the component manage its own state. */
  value?: string;
  onChange?: (code: string) => void;
  /** Called once every cell is filled. */
  onComplete?: (code: string) => void;
  /** Allowed characters. Default `numeric`. */
  characterSet?: OtpCharacterSet;
  /** Validation message; renders the error state and is announced to screen readers. */
  error?: string | null;
  autoFocus?: boolean;
  disabled?: boolean;
  /** Masks entered characters. */
  secure?: boolean;
  ref?: Ref<OtpInputHandle>;
  testID?: string;
  containerStyle?: StyleProp<ViewStyle>;
  cellStyle?: StyleProp<TextStyle>;
  focusedCellStyle?: StyleProp<TextStyle>;
  filledCellStyle?: StyleProp<TextStyle>;
  errorCellStyle?: StyleProp<TextStyle>;
  errorTextStyle?: StyleProp<TextStyle>;
}

/**
 * Segmented one-time-password input.
 *
 * - Focus advances automatically and moves back on backspace.
 * - Pasting or SMS autofill (iOS `oneTimeCode`, Android `sms-otp`) spreads the code across cells.
 * - Works controlled (`value` + `onChange`) or uncontrolled.
 */
export function OtpInput({
  length = 6,
  value,
  onChange,
  onComplete,
  characterSet = 'numeric',
  error,
  autoFocus = false,
  disabled = false,
  secure = false,
  ref,
  testID,
  containerStyle,
  cellStyle,
  focusedCellStyle,
  filledCellStyle,
  errorCellStyle,
  errorTextStyle,
}: OtpInputProps) {
  const isControlled = value !== undefined;
  const [internalCells, setInternalCells] = useState(() => toCells('', length));
  const cells = isControlled ? toCells(value, length) : internalCells;
  const [focusedIndex, setFocusedIndex] = useState<number | null>(null);
  const inputs = useRef<(TextInput | null)[]>([]);
  const lastCompleted = useRef<string | null>(null);

  const focusCell = useCallback((index: number) => inputs.current[index]?.focus(), []);

  // Reset uncontrolled state if the length changes.
  useEffect(() => {
    if (!isControlled) setInternalCells((current) => toCells(current.join(''), length));
  }, [isControlled, length]);

  const commit = (next: string[]) => {
    const code = next.join('');
    if (!isControlled) setInternalCells(next);
    onChange?.(code);
    if (isComplete(next) && lastCompleted.current !== code) {
      lastCompleted.current = code;
      onComplete?.(code);
    } else if (!isComplete(next)) {
      lastCompleted.current = null;
    }
  };

  // No dependency list: the handle closes over the latest cells and commit on every render.
  useImperativeHandle(ref, () => ({
    focus: () => focusCell(Math.max(0, cells.findIndex((cell) => cell === ''))),
    clear: () => {
      commit(toCells('', length));
      focusCell(0);
    },
  }));

  const handleChangeText = (index: number, text: string) => {
    const change = applyInput(cells, index, text, characterSet);
    commit(change.cells);
    if (change.focusIndex !== null && change.focusIndex !== index) focusCell(change.focusIndex);
  };

  const handleKeyPress = (index: number, event: NativeSyntheticEvent<TextInputKeyPressEventData>) => {
    if (event.nativeEvent.key !== 'Backspace') return;
    const change = applyBackspace(cells, index);
    if (change.focusIndex === null) return;
    commit(change.cells);
    focusCell(change.focusIndex);
  };

  const hasError = Boolean(error);

  return (
    <View testID={testID}>
      <View style={[styles.row, containerStyle]}>
        {cells.map((cell, index) => {
          const focused = focusedIndex === index;
          return (
            <TextInput
              key={index}
              ref={(input) => {
                inputs.current[index] = input;
              }}
              testID={testID ? `${testID}-cell-${index}` : undefined}
              value={cell}
              onChangeText={(text) => handleChangeText(index, text)}
              onKeyPress={(event) => handleKeyPress(index, event)}
              onFocus={() => setFocusedIndex(index)}
              onBlur={() => setFocusedIndex((current) => (current === index ? null : current))}
              // Select the existing character so typing replaces it.
              selectTextOnFocus
              editable={!disabled}
              autoFocus={autoFocus && index === 0}
              secureTextEntry={secure}
              keyboardType={characterSet === 'numeric' ? 'number-pad' : 'default'}
              autoCapitalize="characters"
              autoCorrect={false}
              // Only the first cell advertises OTP autofill; the whole code arrives there and is distributed.
              textContentType={index === 0 ? 'oneTimeCode' : 'none'}
              autoComplete={index === 0 ? 'sms-otp' : 'off'}
              importantForAutofill={index === 0 ? 'yes' : 'no'}
              accessibilityLabel={`Code character ${index + 1} of ${length}`}
              accessibilityState={{ disabled }}
              style={[
                styles.cell,
                cellStyle,
                cell !== '' && [styles.filled, filledCellStyle],
                focused && [styles.focused, focusedCellStyle],
                hasError && [styles.error, errorCellStyle],
                disabled && styles.disabled,
              ]}
            />
          );
        })}
      </View>
      {hasError ? (
        <Text style={[styles.errorText, errorTextStyle]} accessibilityRole="alert" accessibilityLiveRegion="polite">
          {error}
        </Text>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', gap: 8, justifyContent: 'center' },
  cell: {
    width: 48,
    height: 56,
    borderRadius: 10,
    borderWidth: 1.5,
    borderColor: '#d0d5dd',
    backgroundColor: '#ffffff',
    textAlign: 'center',
    fontSize: 22,
    fontWeight: '600',
    color: '#101828',
  },
  filled: { borderColor: '#98a2b3' },
  focused: { borderColor: '#3657d6' },
  error: { borderColor: '#c4302b', backgroundColor: '#fef3f2' },
  disabled: { opacity: 0.5 },
  errorText: { marginTop: 8, textAlign: 'center', color: '#c4302b', fontSize: 14 },
});
