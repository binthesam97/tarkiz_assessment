# Rendering 10,000 Records — Optimisation Strategy

Route: `/performance` · Source: `src/app/features/performance`

The page renders a 10,000-row dataset with search and sorting. Its metric panel shows the render time
and the number of DOM nodes in the table.

The "before" figures below come from an unoptimised baseline built during development: default change
detection, `track $index`, filtering and formatting in template methods, and every row in the DOM.
It served as the comparison point and is not part of the delivered page.

## Measurements

Chrome, development build, MacBook.

| Metric                                           | Baseline         | Optimised     |
| ------------------------------------------------ | ---------------- | ------------- |
| Initial render (state change → painted frame)    | 3.5 – 4.2 s      | 25 – 55 ms    |
| Re-sort 10,000 rows                              | 0.7 – 1.1 s      | 25 – 70 ms    |
| DOM nodes in the table                           | ~100,000         | ~310          |
| Row-template evaluations per second while idle¹  | 30,000 – 60,000  | 0             |
| Row-template evaluations for a re-sort           | 30,000           | ~90 (visible rows only) |

¹ Measured while a clock updated four times a second elsewhere in the app, triggering application-wide
change detection, which is representative of timers, WebSocket messages or any other unrelated UI activity.

## What was changed and why

| Technique | Problem in the baseline | Implementation |
| --- | --- | --- |
| **OnPush change detection** | `ChangeDetectionStrategy.Eager` re-checks all 10,000 rows on every tick anywhere in the app. | `OptimizedTableComponent` and `RecordRowComponent` are OnPush and signal-driven, so they are skipped unless their inputs change. (Angular 22 makes OnPush the default; it is still declared explicitly for intent.) |
| **Virtual scrolling** | Every row is in the DOM: ~100k nodes, slow layout, high memory. | `cdk-virtual-scroll-viewport` with a fixed `itemSize` renders only the rows in view plus a buffer, whatever the dataset size. |
| **trackBy / track** | `track $index` ties DOM nodes to positions, so a re-sort destroys and re-creates rows. | `trackBy: trackById` lets Angular move and reuse existing row views. `templateCacheSize` recycles row templates while scrolling. |
| **Memoisation** | Filtering/sorting run in a template method, i.e. on *every* check. Formatting runs through method calls and builds a new `Intl` formatter per call. | `computed()` signals memoise filtering and sorting separately, so changing only the sort does not re-run the search. Pure pipes (`initials`, `inr`, `shortDate`) re-run only when their input changes. `Intl` formatters are created once per module. |
| **Debounced search** | Filtering 10k rows on every keystroke. | Search input is debounced by 250 ms before it reaches the `computed` pipeline. |
| **Lazy loading** | Everything ships in the initial bundle. | Each challenge is a lazily loaded route (`loadChildren`). Within this page, the department summary uses `@defer (on viewport; prefetch on idle)`, so its code is a separate chunk fetched only when needed. |

## Further options for larger datasets

- **Server-side pagination / infinite scroll** once data no longer fits comfortably in memory.
- **Web Worker** for filtering and sorting at 100k+ rows, keeping the main thread free.
- **Pre-computed search index** (lower-cased fields built once) if search becomes a hot path.
- **`@for` + `content-visibility: auto`** as a lighter alternative when row heights vary and CDK's fixed-size strategy does not fit.
