# Capability boundary — 0.1.0

Status vocabulary: **Implemented** means executable code in the local application. **Adapter** means implemented connection code that needs external infrastructure/dependencies and was not tested against a real provider here. **Not implemented** is not implied by the presence of a related screen.

| Area | Status and exact scope | Not included |
| --- | --- | --- |
| Original enterprise UI | Implemented: 13 routes, light/dark themes, command search, responsive layout, mobile P&ID property drawer | Pixel-identical reproduction of every commercial release or workspace |
| Ontology | Implemented: mutable typed objects, relationship graph, schemas, filters and staged upserts | Distributed ontology services, arbitrary schema constraints, temporal graph database, branch merging |
| Data | Implemented: local CSV/JSON data and text documents, editing, profiling, SQL subset | Managed cloud/ERP/historian connectors, CDC, remote warehouses, streaming ingestion |
| Pipelines | Implemented: source/filter/derive/select/sort/aggregate/join/deduplicate/output DAG, editable wiring and drag layout | Distributed execution, partitioning, retry scheduler, arbitrary user-code containers |
| Assistant | Implemented deterministic routing, diagram/BOM tools, lexical BM25 document retrieval, grounded citations | Bundled LLM, embeddings/vector database, unrestricted planning agent, guaranteed prompt-injection protection |
| External models | Adapter: non-streaming chat-completions text and image requests with consent | Hosted model catalog, training/fine-tuning, model serving, managed budgets, realtime audio |
| Logic | Implemented: specific reviewed publication, work-order and object-edit templates | General-purpose visual LLM logic language, arbitrary code block runtime, resource-isolated execution |
| Evaluations | Implemented editable expected-substring assertions for local/external answers, retained results | LLM judges, statistical quality assurance, benchmark coverage of arbitrary questions |
| Applications | Implemented local dashboard widgets with data-bound metrics/charts/tables | Full application-building DSL, arbitrary layout/control authoring, mobile native deployment |
| Automations | Implemented manual and diagram-change triggers while the tab is running | Background execution with the browser closed, durable scheduler, remote event broker |
| Review/governance | Implemented staged payloads, explicit approve/reject, local audit history | SSO, server-enforced RBAC/ABAC, independent approver identities, regulated approvals, immutable audit storage |
| Collaboration | Local workspace and portable exports | Concurrent editing, CRDTs, server conflict resolution, cross-user roles |
| Rendering | Implemented retained WebGPU vector rendering plus tested Canvas 2D fallback | Hardware-certified frame-rate targets or tested million-element workloads |
| Numeric analysis | Implemented WGSL/CPU z-score calculation | Learned anomaly detection, process simulation, predictive safety assessment |

## P&ID Studio in detail

| Capability | Implementation |
| --- | --- |
| Editable drawing | Move, snap, rotate, duplicate, delete; pump, tank, exchanger, manual/control/check valves, instrument, filter, junction and off-page connector symbols |
| Properties | Tags/descriptions/classification, line class, nominal size, stored operating/design pressure, valve state; explicit verification |
| Connections | Process/signal edge creation, source/target edits, orthogonal route generation and editable waypoint arrays |
| Tracing | Directed upstream/downstream/both graph traversal; optional signal links and closed-valve stopping; BFS shortest-path engine |
| Checks | Missing/duplicate tags, unknown types, unreviewed/disconnected components, control signal, dangling/self edges, line size and stored pressure comparison |
| BOM | Normalized exact tags, duplicate/ambiguous rows, line-class differences, missing/extra items, edit-distance suggestions that never auto-merge |
| Revisions | Explicit snapshots, added/removed/field-change differences, reversible restoration; no multi-user merge |
| Native imports | JSON and metadata-bearing Stratum SVG preserve editability |
| Source images | PNG/JPEG/WebP retained as source; manual annotation; generic SVG sanitization and text candidates |
| PDF | Optional PDF.js adapter; selected page rendering and embedded-text candidates. Not tested here; no built-in OCR |
| External vision | Implemented adapter and review gate, strict coordinate/tag/endpoint validation; no provider quality validation or bundled detector |
| Publication | Frozen proposal, human approval, object/link upserts, source lineage. Does not delete pre-existing ontology objects when a source component is deleted |
| Interchange limits | No DWG/DGN, ISO 15926, DEXPI, intelligent CAD P&ID semantic interoperability, automatic line tracing from pixels, ISA symbol certification or engineering simulation |

## Operational boundary

The sample diagram deliberately collapses a heat exchanger to one graph node. Consequently, connectivity tracing is *not* fluid-domain-aware and can traverse utility and process connections through the same equipment. It is a traversal of represented relationships, not a hydraulic model or isolation certificate. Check-valve direction is represented by edge direction, not inferred from symbol rotation. Do not use this graph alone for lockout/tagout, equipment isolation, pressure calculations or operational decisions.

The UI's local viewer setting prevents accidental edits through application commands. It is not user authentication. Same-device users can change it themselves. An exported hash-linked local audit can be altered by someone who controls the file or browser. Production identity, authorization, immutability, secret handling and engineering assurance require independently enforced services and validation.
