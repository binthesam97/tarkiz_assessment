import { Routes } from '@angular/router';
import { provideDynamicValidators } from './core/validator-registry';
import { provideDynamicForms } from './core/provide-dynamic-forms';
import { CUSTOM_VALIDATORS } from './demo/custom-validators';
import { DynamicFormPageComponent } from './demo/dynamic-form-page.component';
import { RatingControl } from './demo/rating.control';

export default [
  {
    path: '',
    title: 'Dynamic Form Builder',
    component: DynamicFormPageComponent,
    providers: [
      provideDynamicForms({ types: ['rating'], component: RatingControl, defaultValue: null }),
      provideDynamicValidators(...CUSTOM_VALIDATORS),
    ],
  },
] satisfies Routes;
