/**
 * Declarative description of a single form field. The JSON supplied by the
 * consumer maps directly onto this shape; only `type` and `label` are required.
 */
export interface FieldConfig {
  type: string;
  label: string;
  /** Form control key. Derived from `label` when omitted. */
  name?: string;
  required?: boolean;
  placeholder?: string;
  hint?: string;
  defaultValue?: unknown;
  options?: (string | FieldOption)[];
  validators?: ValidatorConfig[];
  /** Free-form settings consumed by specific control types (e.g. `{ max: 5 }` for a rating). */
  props?: Record<string, unknown>;
}

export interface FieldOption {
  label: string;
  value: string;
}

export interface ValidatorConfig {
  /** Key of a validator registered with the validator registry (e.g. `minLength`, `pattern`). */
  name: string;
  value?: unknown;
  /** Overrides the default error message for this validator. */
  message?: string;
}

/** A field after defaults have been applied; this is what control components receive. */
export interface ResolvedField extends Omit<FieldConfig, 'name' | 'options'> {
  name: string;
  id: string;
  options: FieldOption[];
}
