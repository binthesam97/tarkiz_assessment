import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { SuggestionService } from './suggestion.service';

describe('SuggestionService', () => {
  let service: SuggestionService;
  let http: HttpTestingController;

  beforeEach(() => {
    vi.useFakeTimers();
    TestBed.configureTestingModule({
      providers: [SuggestionService, provideHttpClient(), provideHttpClientTesting()],
    });
    service = TestBed.inject(SuggestionService);
    http = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    http.verify();
    vi.useRealTimers();
  });

  it('serves repeated terms from the cache', () => {
    const results: string[][] = [];
    service.search('ind').subscribe((value) => results.push(value));
    http.expectOne((request) => request.params.get('q') === 'ind').flush(['India']);

    service.search('IND ').subscribe((value) => results.push(value));
    http.expectNone((request) => request.params.get('q') === 'ind');
    expect(results).toEqual([['India'], ['India']]);
  });

  it('retries a failing request twice before surfacing the error', () => {
    let failed = false;
    service.search('fra').subscribe({ error: () => (failed = true) });

    for (let attempt = 0; attempt < 3; attempt++) {
      http.expectOne((request) => request.params.get('q') === 'fra').flush(null, { status: 503, statusText: 'Unavailable' });
      vi.runOnlyPendingTimers();
    }
    expect(failed).toBe(true);
  });

  it('does not retry client errors', () => {
    let failed = false;
    service.search('bad').subscribe({ error: () => (failed = true) });
    http.expectOne((request) => request.params.get('q') === 'bad').flush(null, { status: 400, statusText: 'Bad Request' });
    expect(failed).toBe(true);
  });

  it('cancels the HTTP request when the subscriber unsubscribes', () => {
    const subscription = service.search('ger').subscribe();
    const request = http.expectOne((candidate) => candidate.params.get('q') === 'ger');
    subscription.unsubscribe();
    expect(request.cancelled).toBe(true);
  });
});
