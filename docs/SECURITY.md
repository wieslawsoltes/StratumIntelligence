# Security and operational limits

Stratum 0.1 is a local, single-user application. Do not treat its settings, review status or UI visibility as an authorization boundary.

**Data stays local by default.** Core sample/editing/analysis functions do not contact a server. Optional PDF import downloads code from a pinned CDN when local modules are missing. Text/vision model calls require a configured endpoint and explicit sharing consent. The PDF adapter's remote dependency was not fetched or integrity-audited in this build environment; install and review a local dependency for restricted deployments.

**API keys live only in memory.** The browser can still inspect them and any same-origin script can access application memory. Use a short-lived token or authenticated server-side proxy rather than a high-privilege permanent key. Browser CORS is a provider/hosting configuration requirement, not something the app can safely bypass. HTTP endpoints are accepted for local development; use trusted HTTPS for remote data.

**Imports are untrusted.** Text is escaped for HTML; CSV headers reject prototype-related names; arbitrary expressions cannot execute JavaScript; workspace imports validate structural arrays, IDs, coordinates, dimensions and embedded-image URLs. Generic SVG removes active/external markup and is used as an image rather than inserted into the DOM. Validation is not a claim of independent security-audit coverage. Avoid importing untrusted massive/complex content into a sensitive browser session.

**External model context is untrusted reference data.** Instructions tell the provider not to follow source-document instructions, but prompting is not a guaranteed defense. Returned text cannot invoke write operations. Vision output must pass schema/coordinate/tag/endpoint validation and a human review before being added. The model can still misread a symbol, invent a plausible tag or miss connectivity. Every annotation remains unverified.

**Local audit and review are editable local state.** There is no SSO, server RBAC/ABAC, independent approver identity, cryptographic audit, encryption at rest, DLP, tenant isolation or tamper-resistant review. Exports are plaintext, including documents and conversations. Changing the local viewer role is not a login or privilege escalation barrier.

**No safety certification.** Sample pressures and telemetry are synthetic. Stored-value comparisons, graph paths and BOM differences are not HAZOP, SIL, LOPA, relief sizing, hydraulic/thermal calculations, code compliance, validated isolation studies or safe operating instructions. Symbols are an illustrative library, not a complete ISA/ISO conformance implementation. Review source records and use qualified engineering procedures before any real-world action.

**Browser storage can fail or be cleared.** The save bar reports whether IndexedDB is available. Export important work; do not equate a local save with a backup. Undo/redo is in-memory history and does not survive a reload, though explicit revision baselines do. Automations run only while this application is open; they are not an unattended control system.
