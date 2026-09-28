import { FieldConfig } from '../core/field-config';

export interface SampleConfig {
  id: string;
  label: string;
  fields: FieldConfig[];
}

export const SAMPLE_CONFIGS: SampleConfig[] = [
  {
    id: 'spec',
    label: 'Sample from the brief',
    fields: [
      { type: 'text', label: 'Name', required: true },
      { type: 'email', label: 'Email', required: true },
      { type: 'dropdown', label: 'Department', options: ['IT', 'HR', 'Finance'] },
    ],
  },
  {
    id: 'onboarding',
    label: 'Employee onboarding (extended)',
    fields: [
      {
        type: 'text',
        label: 'Full Name',
        required: true,
        validators: [
          { name: 'minLength', value: 3 },
          { name: 'noDigits', message: 'Names cannot contain numbers.' },
        ],
      },
      { type: 'email', label: 'Work Email', required: true, placeholder: 'name@company.com' },
      {
        type: 'tel',
        label: 'Phone',
        hint: '10-digit mobile number',
        validators: [{ name: 'pattern', value: '^[0-9]{10}$', message: 'Enter a 10-digit phone number.' }],
      },
      { type: 'number', label: 'Experience (years)', validators: [{ name: 'min', value: 0 }, { name: 'max', value: 50 }] },
      { type: 'date', label: 'Joining Date', required: true },
      { type: 'dropdown', label: 'Department', required: true, options: ['IT', 'HR', 'Finance', 'Sales'] },
      {
        type: 'radio',
        label: 'Work Mode',
        required: true,
        options: [
          { label: 'On-site', value: 'ONSITE' },
          { label: 'Hybrid', value: 'HYBRID' },
          { label: 'Remote', value: 'REMOTE' },
        ],
        defaultValue: 'HYBRID',
      },
      { type: 'rating', label: 'Interview Experience', props: { max: 5 }, hint: 'Custom control registered at the route level' },
      { type: 'textarea', label: 'About You', validators: [{ name: 'maxLength', value: 200 }] },
      { type: 'checkbox', label: 'Terms', placeholder: 'I accept the company policies', required: true },
    ],
  },
];
