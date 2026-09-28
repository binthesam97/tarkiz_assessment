import { JsonPipe } from '@angular/common';
import { ChangeDetectionStrategy, Component, signal } from '@angular/core';
import { DynamicFormComponent } from '../components/dynamic-form.component';
import { FieldConfig } from '../core/field-config';
import { SAMPLE_CONFIGS } from './sample-configs';

@Component({
  selector: 'app-dynamic-form-page',
  imports: [DynamicFormComponent, JsonPipe],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './dynamic-form-page.component.html',
  styleUrl: './dynamic-form-page.component.scss',
})
export class DynamicFormPageComponent {
  protected readonly samples = SAMPLE_CONFIGS;
  protected readonly selectedSampleId = signal(SAMPLE_CONFIGS[0]!.id);
  protected readonly configText = signal(stringify(SAMPLE_CONFIGS[0]!.fields));
  protected readonly config = signal<FieldConfig[]>(SAMPLE_CONFIGS[0]!.fields);
  protected readonly parseError = signal<string | null>(null);
  protected readonly submittedValue = signal<Record<string, unknown> | null>(null);

  protected selectSample(id: string): void {
    const sample = this.samples.find((candidate) => candidate.id === id);
    if (!sample) return;
    this.selectedSampleId.set(id);
    this.configText.set(stringify(sample.fields));
    this.apply();
  }

  protected apply(): void {
    try {
      const parsed: unknown = JSON.parse(this.configText());
      if (!Array.isArray(parsed)) throw new Error('Configuration must be a JSON array of fields.');
      this.config.set(parsed as FieldConfig[]);
      this.parseError.set(null);
      this.submittedValue.set(null);
    } catch (error) {
      this.parseError.set(error instanceof Error ? error.message : String(error));
    }
  }
}

function stringify(fields: FieldConfig[]): string {
  return JSON.stringify(fields, null, 2);
}
