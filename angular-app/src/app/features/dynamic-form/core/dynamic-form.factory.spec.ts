import { Component } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { DynamicControl } from './dynamic-control';
import { ControlRegistry } from './control-registry';
import { DynamicFormFactory } from './dynamic-form.factory';
import { provideDynamicForms } from './provide-dynamic-forms';
import { ValidatorRegistry } from './validator-registry';

@Component({ selector: 'df-test-control', template: '' })
class TestControl extends DynamicControl {}

function createFactory(): DynamicFormFactory {
  TestBed.configureTestingModule({
    providers: [
      provideDynamicForms({ types: ['rating'], component: TestControl, defaultValue: 3 }),
      ControlRegistry,
      ValidatorRegistry,
      DynamicFormFactory,
    ],
  });
  return TestBed.inject(DynamicFormFactory);
}

describe('DynamicFormFactory', () => {
  it('builds controls for the sample configuration from the brief', () => {
    const { form, fields } = createFactory().build([
      { type: 'text', label: 'Name', required: true },
      { type: 'email', label: 'Email', required: true },
      { type: 'dropdown', label: 'Department', options: ['IT', 'HR', 'Finance'] },
    ]);

    expect(Object.keys(form.controls)).toEqual(['name', 'email', 'department']);
    expect(fields[2]?.options.map((option) => option.value)).toEqual(['IT', 'HR', 'Finance']);
    expect(form.valid).toBe(false);
  });

  it('applies required, intrinsic (email) and configured validators', () => {
    const { form } = createFactory().build([
      { type: 'email', label: 'Email', required: true },
      { type: 'text', label: 'Code', validators: [{ name: 'minLength', value: 3 }] },
    ]);

    expect(form.controls['email']?.hasError('required')).toBe(true);
    form.controls['email']?.setValue('not-an-email');
    expect(form.controls['email']?.hasError('email')).toBe(true);
    form.controls['code']?.setValue('ab');
    expect(form.controls['code']?.hasError('minlength')).toBe(true);
  });

  it('supports control types registered outside the core, including their defaults', () => {
    const { form } = createFactory().build([{ type: 'rating', label: 'Score' }]);
    expect(form.controls['score']?.value).toBe(3);
  });

  it('de-duplicates generated control names', () => {
    const { fields } = createFactory().build([
      { type: 'text', label: 'Name' },
      { type: 'text', label: 'Name' },
    ]);
    expect(fields.map((field) => field.name)).toEqual(['name', 'name2']);
  });

  it('rejects unknown validators with a helpful message', () => {
    expect(() => createFactory().build([{ type: 'text', label: 'X', validators: [{ name: 'nope' }] }])).toThrow(/Unknown validator "nope"/);
  });
});
