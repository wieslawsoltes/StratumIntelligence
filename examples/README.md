# Example files

All examples are synthetic; they are not plant records and are not for construction or operation.

Import `feed-water-pid.json` or `feed-water-pid.svg` in P&ID Studio. They retain editable components and connections. Import `northline-workspace.json` through Models & settings or the workspace menu to replace all local sample state.

Import `ds-assets.csv` or `ds-telemetry.csv` in Data workspace. Use `ds-bom.csv` with the P&ID **Import BOM** action; a normal dataset import does not replace the canonical BOM automatically. `equipment-readiness.pipeline.json` documents the full pipeline record; the pipeline JSON editor expects its `nodes` array. `vision-response.json` shows the response schema for an external vision endpoint; it is not a model output or a detection-quality example.

The initial BOM has 18 exact matches, one line-class mismatch (HV-102), one drawing-only component (PT-102) and one BOM-only item (HV-999). The structural checker separately reports two issues for PT-102: unconnected and unreviewed.
