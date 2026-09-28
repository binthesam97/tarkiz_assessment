import { ChangeDetectionStrategy, Component, computed, inject, input, output, signal } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { FormControl, ReactiveFormsModule } from '@angular/forms';
import { Observable, catchError, debounce, distinctUntilChanged, map, of, startWith, switchMap, timer } from 'rxjs';
import { SuggestionService } from './suggestion.service';

type SearchState =
  | { status: 'idle' }
  | { status: 'loading' }
  | { status: 'success'; results: string[] }
  | { status: 'error' };

let nextId = 0;

/**
 * Accessible autocomplete (ARIA combobox pattern).
 *
 *   input ─ debounce ─ distinctUntilChanged ─ switchMap(search) ─ results
 *
 * `switchMap` unsubscribes from the previous search when a new term arrives,
 * which cancels its HTTP request. Caching and retries live in SuggestionService.
 */
@Component({
  selector: 'app-autocomplete',
  imports: [ReactiveFormsModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './autocomplete.component.html',
  styleUrl: './autocomplete.component.scss',
})
export class AutocompleteComponent {
  readonly placeholder = input('Search');
  readonly debounceMs = input(300);
  readonly minLength = input(2);

  readonly selected = output<string>();

  private readonly suggestions = inject(SuggestionService);

  protected readonly listboxId = `autocomplete-listbox-${nextId++}`;
  protected readonly query = new FormControl('', { nonNullable: true });
  protected readonly open = signal(false);
  protected readonly activeIndex = signal(-1);

  protected readonly state = toSignal(this.searchStates(), { initialValue: { status: 'idle' } as SearchState });
  protected readonly results = computed(() => {
    const state = this.state();
    return state.status === 'success' ? state.results : [];
  });

  protected onKeydown(event: KeyboardEvent): void {
    const count = this.results().length;
    switch (event.key) {
      case 'ArrowDown':
        event.preventDefault();
        this.open.set(true);
        if (count) this.activeIndex.update((index) => (index + 1) % count);
        break;
      case 'ArrowUp':
        event.preventDefault();
        if (count) this.activeIndex.update((index) => (index <= 0 ? count - 1 : index - 1));
        break;
      case 'Enter': {
        const option = this.results()[this.activeIndex()];
        if (this.open() && option) {
          event.preventDefault();
          this.choose(option);
        }
        break;
      }
      case 'Escape':
        this.open.set(false);
        break;
    }
  }

  protected choose(option: string): void {
    this.query.setValue(option, { emitEvent: false });
    this.open.set(false);
    this.activeIndex.set(-1);
    this.selected.emit(option);
  }

  private searchStates(): Observable<SearchState> {
    return this.query.valueChanges.pipe(
      map((value) => value.trim()),
      // Equivalent to debounceTime, but reads the input on every keystroke so a bound value is honoured.
      debounce(() => timer(this.debounceMs())),
      distinctUntilChanged(),
      switchMap((term) => {
        this.activeIndex.set(-1);
        this.open.set(term.length >= this.minLength());
        if (term.length < this.minLength()) return of<SearchState>({ status: 'idle' });
        return this.suggestions.search(term).pipe(
          map((results): SearchState => ({ status: 'success', results })),
          startWith<SearchState>({ status: 'loading' }),
          catchError(() => of<SearchState>({ status: 'error' })),
        );
      }),
    );
  }
}
