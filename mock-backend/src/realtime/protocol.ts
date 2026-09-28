/** Envelope used by every WebSocket frame in both directions. */
export interface Frame<TType extends string = string, TPayload = unknown> {
  type: TType;
  payload: TPayload;
}

export function parseFrame(raw: unknown): Frame | null {
  try {
    const frame = JSON.parse(String(raw)) as Frame;
    return typeof frame?.type === 'string' ? frame : null;
  } catch {
    return null;
  }
}

export function encode<T extends string, P>(type: T, payload: P): string {
  return JSON.stringify({ type, payload } satisfies Frame<T, P>);
}
