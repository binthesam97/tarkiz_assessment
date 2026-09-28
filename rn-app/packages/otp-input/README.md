# @tarkiz/react-native-otp-input

Accessible, dependency-free one-time-password input for React Native.

- Auto-advances focus as characters are entered; backspace on an empty cell moves back and clears it
- Paste and SMS autofill (`oneTimeCode` on iOS, `sms-otp` on Android) distribute the code across cells
- Numeric, alphabetic or alphanumeric codes; invalid characters are ignored
- Validation/error state announced to screen readers
- Controlled or uncontrolled, with an imperative `focus()` / `clear()` handle
- Fully typed; styling overridable per state

## Installation

```bash
npm install @tarkiz/react-native-otp-input
```

Peer dependencies: `react >= 18`, `react-native >= 0.72`. No native code, so it works in Expo Go.

## Usage

```tsx
import { OtpInput, type OtpInputHandle } from '@tarkiz/react-native-otp-input';

function VerifyScreen() {
  const otpRef = useRef<OtpInputHandle>(null);
  const [error, setError] = useState<string | null>(null);

  const verify = async (code: string) => {
    const ok = await api.verify(code);
    if (!ok) {
      setError('That code is incorrect.');
      otpRef.current?.clear();
    }
  };

  return <OtpInput ref={otpRef} length={6} autoFocus error={error} onChange={() => setError(null)} onComplete={verify} />;
}
```

## Props

| Prop | Type | Default | Description |
| --- | --- | --- | --- |
| `length` | `number` | `6` | Number of cells |
| `value` | `string` | — | Controlled value. Omit for uncontrolled usage |
| `onChange` | `(code: string) => void` | — | Called on every change with the current (possibly partial) code |
| `onComplete` | `(code: string) => void` | — | Called once when all cells are filled |
| `characterSet` | `'numeric' \| 'alpha' \| 'alphanumeric'` | `'numeric'` | Allowed characters; also selects the keyboard |
| `error` | `string \| null` | — | Shows the error state and message |
| `autoFocus` | `boolean` | `false` | Focus the first cell on mount |
| `disabled` | `boolean` | `false` | Disable input |
| `secure` | `boolean` | `false` | Mask characters |
| `ref` | `Ref<OtpInputHandle>` | — | `{ focus(), clear() }` |
| `containerStyle`, `cellStyle`, `focusedCellStyle`, `filledCellStyle`, `errorCellStyle`, `errorTextStyle` | styles | — | Visual overrides |

The state transitions (`applyInput`, `applyBackspace`, `sanitize`, `isComplete`) are exported for
reuse, for example to build a different visual variant.

## Development

```bash
npm test          # node:test unit tests for the input logic
npm run typecheck
npm run build     # emits lib/ (JS + .d.ts)
```

`prepublishOnly` runs all three, so a broken build cannot be published. The `react-native` field
points bundlers such as Metro at the TypeScript source; `main`/`types` serve other consumers.
