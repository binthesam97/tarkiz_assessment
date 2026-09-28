import { DatePipe } from '@angular/common';
import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { NetworkControlsComponent } from '../../core/mock-network/network-controls.component';
import { AutocompleteComponent } from './autocomplete.component';
import { SearchLog } from './search-log';
import { SuggestionService } from './suggestion.service';

@Component({
  selector: 'app-autocomplete-page',
  imports: [AutocompleteComponent, NetworkControlsComponent, DatePipe],
  providers: [SuggestionService, SearchLog],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './autocomplete-page.component.html',
  styleUrl: './autocomplete-page.component.scss',
})
export class AutocompletePageComponent {
  private readonly suggestions = inject(SuggestionService);
  protected readonly log = inject(SearchLog);
  protected readonly selection = signal<string | null>(null);

  protected clearCache(): void {
    this.suggestions.clearCache();
    this.log.clear();
  }
}
