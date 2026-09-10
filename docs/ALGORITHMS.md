# Algorithms and interpretation

## Numeric anomaly scores

For finite observations x₁…xₙ:

- μ = (Σxᵢ) / n
- σ = sqrt(Σ(xᵢ − μ)² / n), using the **population** standard deviation
- zᵢ = |xᵢ − μ| / σ, or 0 when σ is zero
- flaggedᵢ = zᵢ > threshold (strict comparison)

The WGSL kernel uses one invocation per observation, guarded by `id.x < count`, and a workgroup size of 256. It clamps the divisor at 1e−7 to avoid a GPU division instability. Inputs must be finite; the threshold must be finite and non-negative. Inputs exceeding adapter storage or dispatch limits use CPU fallback. The current implementation uses global rather than rolling moments, does not distinguish operating modes and is not a trained anomaly detector.

## Graph analysis

Process edges are directed from `from` to `to`. Downstream traversal follows their direction; upstream reverses it; both adds each direction. Signals are excluded by default. Closed-valve mode removes edges incident to a node marked closed. Breadth-first traversal records reached components, encountered edges and hop depth. Shortest path uses a predecessor map and reverses the predecessor sequence after reaching the target.

This is connectivity of the represented graph, not pressure/flow propagation. Equipment lacks independently modeled ports and fluid domains. In particular, utility and process circuits joined to the same exchanger node are connected in this graph. Users must not interpret a highlighted path as a verified isolation boundary.

## BOM reconciliation

Tags are converted to uppercase and stripped to ASCII letters/digits. One exact normalized match is matched, unless both records have a nonempty but unequal lineClass. Multiple exact rows are ambiguous. A component with no exact row is missing. Rows not used by an exact or ambiguous match are extra.

For a missing component, Levenshtein distance computes minimum insertion/deletion/substitution count against candidate BOM tags. Only a best candidate at distance ≤2 is displayed. It is a suggestion, never an accepted identity or automatic update. Normalization can collapse meaningful punctuation, so ambiguous results and organizational tag conventions still need review.

## Revision changes

Records are joined by stable ID, independently for nodes and edges. A new ID is added; a missing ID is removed. For an existing ID, the union of property keys is compared using JSON serialization. Changed keys are displayed. This is a structural diff, not a visual pixel comparison or semantic engineering-equivalence checker.

## Expressions and SQL subset

The tokenizer recognizes numbers, quoted string literals, flat field identifiers and a fixed set of operators. A precedence parser creates an AST. Evaluation accesses only own row properties and an allowlist of pure functions. JavaScript statements, assignments, object access execution and arbitrary functions are not supported.

Arithmetic: `+ - * / %`; comparisons: `= == != <> > < >= <=`; boolean: `and or not && || !`; pattern: `like` with `%` and `_`; null checks: `is null`, `is not null`.

Functions: `abs`, `round`, `lower`, `upper`, `length`, `coalesce`, `contains`, `sqrt`, `min`, `max`. Division/modulo by zero yields null. This is not ANSI SQL: booleans use JavaScript-style truthiness, general comparison/null coercion is simplified and dotted identifiers name flat columns rather than nested property access. Use explicit `is null` filters where null handling matters.

Queries support `SELECT expression [AS alias] FROM dataset [WHERE expression] [GROUP BY field] [ORDER BY projected_column ASC|DESC] [LIMIT integer]`. One grouping and ordering field are supported. Aggregate functions are count, sum, avg, min and max; numeric aggregates exclude null/empty/nonnumeric values, and `count(column)` excludes null/empty values. No joins in SQL, subqueries, window functions, DDL or writes; joins are available in pipelines.

Examples:

```sql
SELECT tag, round(pressure, 2) AS pressure
FROM ds-assets
WHERE status = 'Active' AND pressure > 7
ORDER BY pressure DESC
LIMIT 20
```

```sql
SELECT type, count(*) AS count
FROM ds-assets
GROUP BY type
ORDER BY count DESC
```

## Document retrieval

Retrieval uses lexical BM25-style scoring, with k₁=1.2 and b=0.75. For term frequency f, document length L, corpus average length L̄, document frequency df and corpus size N:

`IDF = ln(1 + (N − df + 0.5) / (df + 0.5))`

`score = Σ IDF × f × (k₁ + 1) / [f + k₁ × (1 − b + bL/L̄)]`

Tokens are Unicode letter/number/hyphen sequences. The local assistant selects from implemented routes such as tag lookup, checks, reconciliation, connectivity or document excerpts. It does not infer arbitrary natural-language intent or provide generative reasoning.

## Evaluations and audit

An evaluation passes when the lowercased answer contains the lowercased expected string. This checks a narrow regression assertion; it is not comprehensive correctness, groundedness or safety grading. Exceptions are recorded as failed cases.

The local audit links each record to the previous record's hash and computes an FNV-1a-style 32-bit hash of the serialized entry. The initial record is a local anchor. This is a change-history aid, **not a cryptographic signature, immutable ledger or security control**. Undo/redo preserves the audit and appends reversal entries rather than erasing history.
