# Architecture

## Data flow

`HTML forms / pointer events → app commands → Store transaction → validation + audit → change event → rendered views / IndexedDB save`

`Datasets → WorkerClient → worker operation → safe expression evaluator / DAG → result trace → materialized datasets`

`Diagram → graph checks + BOM reconciliation + frozen publication proposal → explicit reviewer action → ontology upsert`

`Scene primitives → tessellation → retained WebGPU vertex buffer → uniform view transform → render pass`, with `Canvas 2D` geometry fallback and a separate text overlay.

No imported expression is evaluated as JavaScript. The single-file builder emits ordinary module factories at build time; it does not introduce runtime eval or Function constructors.

## Module boundaries

- **Store** owns persistent workspace data, transaction rollback, undo/redo and audit appends. It clones state before mutation and rolls back on invalid state. All imports pass structural validation. A successful initial IndexedDB open persists the initial workspace. Debounced writes use complete snapshots in a read/write IndexedDB transaction.
- **Data** implements CSV, data profiling, an expression tokenizer/parser/evaluator and worker-safe transformation functions. The DAG memoizes each evaluated node, tracks the active recursion set to detect cycles and records counts/durations. Join uses a keyed lookup. All blocks execute even when they are not upstream of an output; the final output is the last encountered output block.
- **Analysis** performs graph traversal, structural validation, BOM reconciliation, revision diffing, tag candidates, vision-response validation and staged ontology publication. It does not access the DOM.
- **Agent** composes deterministic responses and lexical document retrieval, or sends an explicitly authorized external request. Tool traces summarize executed tools and results; they are not private model chain-of-thought. Remote text is escaped for display and never executed.
- **Interchange** handles SVG/JSON/raster portability. Generic SVG is never attached as active markup. It strips script, external references, styles, event handlers and foreign objects before using it as an image. Original editable source metadata is escaped in SVG export.
- **Renderer** separates geometry from viewport state. A view change updates a 32-byte uniform. Buffer capacity grows geometrically. Geometry batching is one render pass with triangle-list vertices; glyphs remain in Canvas. Source imagery is on a separate canvas under vectors. Device loss switches to Canvas and hides stale GPU output.
- **Editor** owns pointer capture, world/screen transforms, shape/edge hit tests, drag previews, zoom/pinch, selection and command routing. Only completed drags mutate state, so every drag has one undo entry.
- **App/UI** connect these libraries to 13 screens. Pipeline layout is retained in block positions; graph exploration positions are session-only. The main `window.stratum` object exposes app/store/GPU objects for local inspection and regression tests, not as an authenticated remote API.

## State model

`schemaVersion: 1` includes diagrams, active diagram, typed objects/links, datasets, documents, pipeline definitions/runs, agents/threads, proposals, evaluation cases/runs, automation definitions, dashboard widgets, settings and audit entries.

A node has stable ID, tag, symbol type, world coordinates, rotation, review status and engineering metadata. A connection has stable ID, from/to component IDs, process/signal kind, optional waypoint pairs and line metadata. Components and connections are separate records; source images do not become semantic graphs until annotations are made.

A publication proposal snapshots nodes and edges so later drawing edits do not alter the proposed payload. Approving applies object IDs `asset-<node-id>` and link IDs `link-<edge-id>`. Source/off-page connectors are not exported as ontology assets. Upsert preserves unrelated object properties; publication is additive/updating rather than destructive synchronization.

## Async execution and error boundaries

The worker sends a readiness handshake. A blocked/unavailable worker falls back after 1.8 seconds; requests then yield before running on the main thread. Real worker calls have a 60-second request timeout. External model requests have a 90-second abort timeout. Responses include explicit failure states rather than fabricated results.

A worker timeout rejects that request; it is not a distributed cancellation or retry facility. In fallback mode, large transforms can still block the UI after the initial yield. Save errors produce a visible status and require exporting a backup. Imported binary/file size guards do not imply an unbounded streaming architecture.

## Performance envelope

Expected graph traversal is O(V+E), keyed joins O(L+R+output) and pipeline execution proportional to its transforms. BOM matching currently scans the BOM per component, with edit distance only for unmatched tags. Diagram route generation locates endpoints by array search. Hit-testing is linear; there is no spatial index. Very large scenes and whole-state history can be memory/CPU intensive. These are explicit optimization targets rather than hidden claims of arbitrary scalability.

Z-score moments are computed in CPU Float64 arithmetic. The compute kernel receives Float32 inputs/moments and produces Float32 scores. Readback and pipeline setup contribute to end-to-end diagnostics. The renderer status is a CPU elapsed measurement, not a GPU timestamp or FPS benchmark.

## Build and deployment

ES modules run directly from any permitted static origin. `tools/build-singlefile.py` embeds CSS, source factories and a real bundled classic worker into one HTML file. The source variant uses a module worker. The core has no runtime CDN requests. Only optional PDF import and explicitly configured model calls initiate external dependency/provider requests.

For production services, introduce a server-side repository abstraction for workspace versions; authenticated authorization checks for all writes; a secret-bearing model proxy; durable job queues; connector adapters; and domain-specific engineering validation. Keep those interfaces separate from local UI permissions and deterministic analysis.
