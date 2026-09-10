# Verification report

Release: 0.1.0 · 2026-09-09

## Executed checks

**62/62 core tests passed.** `node --test tests/core.test.js` tests CSV parsing/inference/formula-safe export, profiles beyond 50,000 rows, expression precedence and code-execution rejection, query/aggregate behavior, DAG transforms and invalid graphs, directional/closed-valve traces, engineering checks, BOM normalization and ambiguity, revision changes, vision schemas, atomic transactions/undo/redo/viewer guard, frozen approvals, grounded assistant queries, evaluation assertions, a mocked external API contract, vector tessellation, SVG export and CPU numeric results.

**33/33 browser/UI checks passed.** The Chromium suite exercises pointer dragging, snapping, inspector edits, undo/redo, symbol/pipe creation, zoom/fit, BOM and revisions, reviewed ontology publication, query/profile, actual pipeline execution/output materialization, assistant questions, ontology object creation, pipeline block drag/wiring, evaluations, telemetry analysis, preferences and all 13 routes. It also verifies that the mobile inspector can edit stored properties. No uncaught page errors or unexpected console errors were recorded in the passing run.

**8/8 browser interchange/integration checks passed.** Editable SVG round-trip; active/external SVG stripping; actual native JSON file picker; encoded PNG output at 2720×1540 for the sample; raster image import with no fabricated detections; validated workspace round-trip without the in-memory API key; explicit review of a schema-valid *example* vision response; 100,000-value anomaly computation.

The in-app evaluation suite executed **4/4 actual assertions** against the local deterministic assistant. That result is a narrow regression check, not a general AI-quality metric.

Machine-readable evidence is retained in `docs/test-results/`.

## Environment and exclusions

The browser was system Chromium in a policy-restricted environment. Main-document navigation was blocked by administrator policy. Tests used the authored standalone HTML through Playwright `set_content` in an opaque document; no administrator policies were disabled or bypassed.

The embedded **real worker ran successfully**, and the drawing used the **Canvas 2D fallback**. IndexedDB open was denied by this document context and the application displayed the correct session/storage warning. The regression tests therefore do **not** establish persistence across browser restarts, secure-origin source-module boot, or GPU behavior.

**Not integration-verified here:** WebGPU render pipeline, WGSL compute dispatch/readback on hardware, device-loss recovery under a real GPU fault, IndexedDB persistence across reloads, optional PDF.js module/page processing, any real external text/vision provider, external endpoint CORS, or production multi-user/security behavior. The API contract test uses a labeled mock; the vision review test uses an example JSON response. Neither is represented as real model inference.

Performance measurements are local observations, not guarantees. The status bar measures CPU work. A 100,000-value CPU diagnostic was exercised; this is not a proof of browser-scale database processing. No exact FPS, GPU speedup, maximum scene size or production throughput is claimed.

## Reproduce core tests

```sh
npm test
python3 tools/build-singlefile.py
```

## Reproduce standalone browser checks

Install Python Playwright in a test environment and provide a Chromium executable:

```sh
python3 -m pip install playwright
CHROMIUM_PATH=/path/to/chromium python3 tests/browser-regression.py
CHROMIUM_PATH=/path/to/chromium python3 tests/browser-interchange.py
```

The scripts use only the bundled authored app and synthetic fixtures. They execute in a headless test process with the sandbox disabled for container compatibility; do not use them to browse untrusted websites or sensitive operational data. Reports/screenshots go to `test-results/` by default, or `STRATUM_TEST_OUTPUT` when set.

For GPU/storage acceptance testing, serve the modular app using `npm start` in a normal permitted browser. Confirm the engine bar reports WebGPU, run **Models & settings → Run compute diagnostics**, inspect browser GPU validation messages, edit/export a workspace, reload and verify IndexedDB persistence. Repeat with GPU unavailable to verify fallback. These additional acceptance steps were not performed in this environment.
