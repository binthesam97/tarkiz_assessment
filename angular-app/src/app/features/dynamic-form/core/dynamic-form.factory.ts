import { Injectable, inject } from '@angular/core';
import { FormControl, FormGroup, ValidatorFn } from '@angular/forms';
import { ControlRegistry } from './control-registry';
import { FieldConfig, FieldOption, ResolvedField } from './field-config';
import { ValidatorRegistry } from './validator-registry';

export interface DynamicFormModel {
  fields: ResolvedField[];
  form: FormGroup<Record<string, FormControl<unknown>>>;
}

/** Turns JSON field configs into resolved fields plus a matching reactive `FormGroup`. */
@Injectable()
export class DynamicFormFactory {
  private readonly controls = inject(ControlRegistry);
  private readonly validators = inject(ValidatorRegistry);

  build(configs: FieldConfig[]): DynamicFormModel {
    const fields = this.resolveFields(configs);
    const group: Record<string, FormControl<unknown>> = {};

    for (const field of fields) {
      const definition = this.controls.get(field.type);
      const initialValue = field.defaultValue ?? definition?.defaultValue ?? null;
      group[field.name] = new FormControl<unknown>(initialValue, { validators: this.validatorsFor(field) });
    }

    return { fields, form: new FormGroup(group) };
  }

  private resolveFields(configs: FieldConfig[]): ResolvedField[] {
    const used = new Set<string>();
    return configs.map((config, index) => {
      if (!config?.type || !config?.label) {
        throw new Error(`Field at index ${index} must define both "type" and "label".`);
      }
      const name = uniqueName(config.name ?? toCamelCase(config.label), used);
      return {
        ...config,
        name,
        id: `df-${name}`,
        options: (config.options ?? []).map(toOption),
      };
    });
  }

  private validatorsFor(field: ResolvedField): ValidatorFn[] {
    const intrinsic = this.controls.get(field.type)?.validators?.(field) ?? [];
    const configured = (field.validators ?? []).map(({ name, value }) => this.validators.create(name, value));
    const required = field.required ? [this.validators.create(field.type === 'checkbox' ? 'requiredTrue' : 'required', true)] : [];
    return [...required, ...intrinsic, ...configured];
  }
}

function toOption(option: string | FieldOption): FieldOption {
  return typeof option === 'string' ? { label: option, value: option } : option;
}

function toCamelCase(label: string): string {
  const words = label.replace(/[^a-zA-Z0-9]+/g, ' ').trim().split(/\s+/);
  return words.map((word, i) => (i === 0 ? word.toLowerCase() : word[0]!.toUpperCase() + word.slice(1).toLowerCase())).join('') || 'field';
}

function uniqueName(candidate: string, used: Set<string>): string {
  let name = candidate;
  for (let suffix = 2; used.has(name); suffix++) name = `${candidate}${suffix}`;
  used.add(name);
  return name;
}
