/** Pure, framework-free OTP state transitions. Kept separate from the component so they can be unit tested. */

export type OtpCharacterSet = 'numeric' | 'alphanumeric' | 'alpha';

const CHARACTER_PATTERNS: Record<OtpCharacterSet, RegExp> = {
  numeric: /[0-9]/,
  alphanumeric: /[a-zA-Z0-9]/,
  alpha: /[a-zA-Z]/,
};

export function sanitize(input: string, characterSet: OtpCharacterSet): string[] {
  const pattern = CHARACTER_PATTERNS[characterSet];
  return [...input].filter((character) => pattern.test(character));
}

export function toCells(value: string, length: number): string[] {
  return Array.from({ length }, (_, index) => value[index] ?? '');
}

export interface OtpChange {
  cells: string[];
  /** Index that should receive focus next, or `null` to keep the current focus. */
  focusIndex: number | null;
}

/**
 * Applies text entered into cell `index`.
 *
 * - A single character fills the cell and advances focus.
 * - Several characters (paste, SMS autofill, fast typing) are distributed from `index`,
 *   or from the first cell when the text is a complete code.
 * - Empty text clears the cell and keeps focus.
 * - Characters outside the character set are ignored.
 */
export function applyInput(cells: readonly string[], index: number, rawText: string, characterSet: OtpCharacterSet): OtpChange {
  const length = cells.length;
  const next = [...cells];

  if (rawText === '') {
    next[index] = '';
    return { cells: next, focusIndex: null };
  }

  // Cells select their content on focus, so replacing a character arrives as a single character.
  // Several characters therefore mean a paste, autofill, or fast typing that outran the focus change:
  // all of them are spread forward so no keystroke is lost.
  const characters = sanitize(rawText, characterSet);
  if (characters.length === 0) return { cells: next, focusIndex: null };

  const start = characters.length >= length ? 0 : index;
  characters.slice(0, length - start).forEach((character, offset) => {
    next[start + offset] = character;
  });

  const lastFilled = Math.min(start + characters.length, length) - 1;
  return { cells: next, focusIndex: Math.min(lastFilled + 1, length - 1) };
}

/**
 * Backspace on an empty cell clears the previous cell and moves focus back,
 * which matches how users expect a segmented input to behave.
 */
export function applyBackspace(cells: readonly string[], index: number): OtpChange {
  if (cells[index] || index === 0) return { cells: [...cells], focusIndex: null };
  const next = [...cells];
  next[index - 1] = '';
  return { cells: next, focusIndex: index - 1 };
}

export function isComplete(cells: readonly string[]): boolean {
  return cells.every((cell) => cell !== '');
}
