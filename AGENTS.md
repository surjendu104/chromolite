# Chromolite — AI Engineering Agent Instructions

## Project

Chromolite is a lightweight **local ChromaDB visualizer**.

It is a Python application that starts a FastAPI server through the CLI and serves a compiled React frontend from the Python package.

The project is intentionally a **single installable Python package with an embedded static frontend**.

The primary engineering goal is to extend Chromolite into a serious **ChromaDB embedding-space and vector-search diagnostics tool** without breaking the existing CLI/package/distribution model.

---

# 1. Repository Architecture

Before modifying anything, understand this architecture.

```text
chromolite/
│
├── chromolite/
│   ├── cli.py
│   ├── main.py
│   ├── connection.py
│   ├── collection.py
│   ├── documents.py
│   ├── query.py
│   ├── config.py
│   ├── router.py
│   │
│   └── static/
│       └── built React application
│
├── frontend/
│   ├── src/
│   │   ├── components/
│   │   ├── service/
│   │   ├── store/
│   │   └── mappers/
│   ├── package.json
│   └── vite.config.*
│
├── pyproject.toml
├── uv.lock
└── README.md
```

Backend:

```text
Python
FastAPI
ChromaDB
Typer
Uvicorn
```

Frontend:

```text
React
TypeScript
Vite
Tailwind CSS
Zustand
```

The frontend is built and the resulting static assets are served by the Python application.

Do not change this architecture without a strong technical reason.

---

# 2. First Rule: Inspect Before Coding

Before implementing any feature:

1. Inspect the repository.
2. Inspect `pyproject.toml`.
3. Inspect `frontend/package.json`.
4. Inspect the existing API routes.
5. Inspect the ChromaDB connection layer.
6. Inspect the existing frontend service layer.
7. Inspect Zustand stores.
8. Inspect the existing build process.
9. Inspect tests.
10. Determine where the new functionality belongs.

Do not blindly install dependencies.

Do not assume the repository matches this document perfectly.

The actual source code is authoritative.

If the architecture differs from this document, adapt to the real code while preserving the project's design principles.

---

# 3. Dependency Policy

Do not install packages merely because they are convenient.

Before adding a dependency:

1. Search the repository to determine whether the functionality already exists.
2. Check whether the Python standard library or existing dependency can provide it.
3. Determine whether the functionality belongs in Python/backend or TypeScript/frontend.
4. Prefer mature, maintained libraries.
5. Keep the dependency footprint small.
6. Update the appropriate lockfile.
7. Verify the project still builds and tests.

Python dependencies must be managed through the project's existing `uv`/`pyproject.toml` workflow.

Frontend dependencies must be managed through the existing npm/package-manager workflow.

Never introduce:

* Poetry
* Pipenv
* a second package manager
* unnecessary state-management libraries
* unnecessary UI frameworks

unless the existing architecture genuinely requires them.

---

# 4. Critical Architectural Decision: Where Computation Runs

Chromolite is a local developer tool.

Embedding analysis should primarily execute on the **Python side**, not in the browser.

Use this architecture:

```text
React UI
   │
   │ HTTP
   ▼
FastAPI
   │
   ▼
Analysis services
   │
   ├── ChromaDB
   ├── NumPy
   ├── SciPy
   ├── scikit-learn
   ├── UMAP/HDBSCAN where justified
   └── other ML/statistics dependencies
```

The browser should primarily handle:

* visualization
* interaction
* filtering
* selection
* state
* rendering

Do not move expensive operations such as:

* large-scale kNN
* UMAP
* t-SNE
* clustering
* outlier detection
* collection-wide statistics

into React unless there is a compelling reason.

The browser must not freeze while analyzing a collection.

---

# 5. ChromaDB Is the Source of Truth

Chromolite is a **ChromaDB visualizer**.

Do not create an independent vector database or duplicate the collection unnecessarily.

Use the existing ChromaDB connection abstraction.

The analysis layer should obtain:

* collection information
* IDs
* embeddings
* documents
* metadata

through the existing connection/service architecture wherever possible.

Do not access ChromaDB directly from frontend code.

Never expose filesystem/database internals to the browser unnecessarily.

---

# 6. API Design

Do not put analysis logic inside existing route handlers.

Create a dedicated analysis layer.

Prefer an architecture similar to:

```text
chromolite/
├── analysis/
│   ├── __init__.py
│   ├── service.py
│   ├── statistics.py
│   ├── similarity.py
│   ├── projection.py
│   ├── neighbors.py
│   ├── outliers.py
│   ├── clustering.py
│   ├── duplicates.py
│   ├── metadata.py
│   └── evaluation.py
```

Exact structure may differ if the existing codebase suggests a better organization.

The important rule is:

> API routes should orchestrate analysis services, not contain mathematical implementations.

---

# 7. API Response Requirements

Every expensive analysis endpoint should expose enough information for the frontend to understand the result.

Where appropriate include:

```json
{
  "status": "completed",
  "computed_on": 10000,
  "total_vectors": 250000,
  "method": "sampled",
  "approximate": true,
  "parameters": {},
  "result": {}
}
```

For metrics, distinguish:

```text
exact
sampled
approximate
estimated
```

Never hide this information.

A user must be able to tell whether a metric represents:

> the entire collection

or:

> a sample/approximation of the collection.

---

# 8. Never Fabricate Metrics

This is a hard rule.

Never:

* invent values
* use placeholder numbers in production UI
* silently return fake data
* generate random points to make a visualization look populated
* estimate a metric without labeling it as an estimate

If data is unavailable, return:

```text
Not available
```

and explain why.

Example:

```text
Recall@10
Not available

Ground-truth relevance data is required.
```

---

# 9. Mathematical Correctness

Every metric must have:

1. A precise definition.
2. A known algorithm.
3. A documented interpretation.
4. Tests against known values.
5. Clearly documented limitations.

Be especially careful about:

```text
cosine similarity
cosine distance
L2 distance
dot product
```

Do not treat them as interchangeable.

If the collection uses cosine distance, do not label a cosine distance value as cosine similarity.

---

# 10. Phase-Based Implementation

Do not implement the entire analytics system in one pass.

Implement the following phases sequentially.

After each phase:

1. Run tests.
2. Run type checks.
3. Run linting where available.
4. Build the frontend.
5. Verify the CLI still works.
6. Verify static assets are served.
7. Inspect the UI.
8. Check performance.
9. Check edge cases.
10. Only then continue.

---

# PHASE 0 — Architecture and Dependency Audit

Before coding features:

Inspect:

```text
pyproject.toml
uv.lock
frontend/package.json
frontend/vite.config.*
chromolite/main.py
chromolite/cli.py
chromolite/connection.py
chromolite/collection.py
chromolite/documents.py
chromolite/query.py
chromolite/router.py
```

Determine:

* existing API conventions
* existing DTO patterns
* existing frontend API client
* existing Zustand conventions
* frontend build command
* how static files are copied/built
* testing strategy
* ChromaDB version
* Python version

Produce an implementation plan.

Do not start feature implementation until the dependency and architecture audit is complete.

---

# PHASE 1 — Collection Health

Implement:

```text
vector count
dimension
distance metric
embedding norm statistics
```

Norm statistics:

```text
min
P01
P05
P25
median
P75
P95
P99
max
mean
standard deviation
```

Handle:

* empty collection
* zero vectors
* malformed vectors
* NaN
* infinity
* dimension mismatch

Create backend tests using small deterministic vectors.

Frontend should show:

```text
Collection
──────────────────

Vectors       10,421
Dimensions    1536
Metric        cosine

Embedding norms
mean          ...
median        ...
P05           ...
P95           ...
```

---

# PHASE 2 — Similarity Distribution

Implement:

### Global similarity distribution

For large collections, never perform:

```text
O(N²)
```

pairwise comparison.

Use statistically reasonable sampling.

Expose:

```text
mean
median
P01
P05
P25
P75
P95
P99
standard deviation
```

### Local similarity

Use k-nearest-neighbor analysis.

Clearly indicate whether the result is:

```text
exact
sampled
approximate
```

Use global similarity as an embedding-space diagnostic.

Do not automatically call high similarity "bad."

---

# PHASE 3 — PCA

Implement PCA first.

Why:

* deterministic
* fast
* interpretable
* excellent baseline

Expose:

```text
PC1 variance
PC2 variance
combined variance
```

Visualization must support selecting individual points.

Store:

```text
x
y
vector ID
```

Do not use the 2D distance as a replacement for original embedding-space distance.

---

# PHASE 4 — UMAP

Implement UMAP after PCA.

Expose:

```text
n_neighbors
min_dist
metric
random_seed
```

Record projection configuration.

For large collections:

* sample vectors
* compute projection in Python
* cache the result
* return only the data required by the browser

Do not blindly send millions of points to React.

---

# PHASE 5 — kNN and Local Density

Implement:

```text
nearest neighbor
kNN similarity
kNN distance
local density score
```

Support:

```text
K = 5
K = 10
K = 20
K = 50
K = 100
```

Local density should be clearly described as a kNN-derived relative measure unless a formal density estimator is being used.

---

# PHASE 6 — Outlier Detection

Implement:

1. kNN-distance based outlier score
2. LOF if justified by collection size and dependency cost

Allow:

```text
top 0.1%
top 1%
top 5%
```

Vector inspector must show:

```text
outlier score
local density
nearest neighbors
metadata
```

Do not call a vector "bad."

Use:

> unusually isolated relative to its local neighborhood

---

# PHASE 7 — Duplicate Detection

Implement:

### Exact duplicates

Efficiently detect identical vectors.

### Near duplicates

Use:

```text
0.99
0.98
0.95
```

thresholds.

Do not perform all-pairs comparison for large collections.

Use candidate generation + exact verification.

Show duplicate groups.

---

# PHASE 8 — Clustering

Implement clustering appropriate to the collection size.

Potential approaches:

```text
MiniBatch K-Means
HDBSCAN
K-Means
```

Do not introduce every algorithm automatically.

Select the smallest robust solution.

Expose cluster:

```text
size
centroid
intra-cluster distance
nearest cluster
```

---

# PHASE 9 — Cluster Quality

Implement:

```text
silhouette score
Davies-Bouldin index
cluster separation
```

Clearly document:

* score range
* whether higher/lower is better
* sample size
* calculation method

Never create arbitrary "good/bad" labels without justification.

---

# PHASE 10 — Metadata Analysis

Allow users to color the embedding visualization by metadata.

Support:

```text
category
language
source
tenant
document type
```

Implement:

```text
category distribution
cluster purity
metadata/cluster relationship
```

Optionally implement mutual information.

Handle high-cardinality metadata gracefully.

Never render thousands of legend entries.

---

# PHASE 11 — Temporal Analysis

When timestamp metadata exists:

Support:

```text
day
week
month
quarter
```

Calculate:

```text
vector count
centroid
centroid drift
norm statistics
similarity statistics
```

Clearly identify the drift methodology.

Do not invent statistical significance thresholds.

---

# PHASE 12 — Vector Inspector

Clicking a point should open a detailed inspector.

Show:

```text
Vector ID

Metadata

Document/content

Dimension
Norm

Cluster
Outlier score
Local density

Nearest neighbors
    rank
    ID
    similarity/distance

Projection coordinates
```

Original-space similarity must be used for neighbor relationships.

---

# PHASE 13 — Query Visualization

Support a query embedding when available.

Display:

```text
query
nearest neighbors
rank
similarity/distance
metadata
```

Show the query as a distinct point in the projection.

Never imply that 2D projection distance determines retrieval rank.

---

# PHASE 14 — Retrieval Evaluation

Only implement these metrics when ground truth exists:

```text
Recall@K
Precision@K
MRR
nDCG@K
```

Support:

```text
K=1
K=5
K=10
K=50
```

Never fabricate relevance labels.

---

# PHASE 15 — ANN vs Exact

Compare:

```text
ANN search
vs
exact nearest-neighbor search
```

Calculate:

```text
Recall@1
Recall@5
Recall@10
Recall@50
```

For selected queries show:

```text
ANN results
Exact results
Overlap
```

This is a core Vector DB diagnostic.

---

# PHASE 16 — Search Latency

Measure separately where possible:

```text
query embedding latency
database search latency
reranking latency
total latency
```

Report:

```text
p50
p95
p99
```

Do not confuse UI rendering latency with database latency.

---

# PHASE 17 — Recall vs Latency

Create benchmarking functionality.

Depending on the Chroma/index implementation, expose relevant parameters.

Record:

```text
configuration
recall@K
p50
p95
p99
```

Visualize:

```text
Recall
   ↑
   │          ●
   │       ●
   │    ●
   │ ●
   └────────────────→ latency
```

---

# PHASE 18 — Model/Version Comparison

If the collection contains embedding model/version information, compare:

```text
norm distribution
similarity distribution
cluster structure
outlier rate
duplicate rate
retrieval quality
latency
```

Do not compare raw coordinates between unrelated embedding spaces.

---

# 11. Sampling Strategy

Large collections must not be dumped into the browser.

Implement sampling.

Potential strategies:

```text
random
stratified by metadata
cluster-aware
```

Start with random sampling.

Add smarter strategies only when necessary.

Every result should report:

```text
sample size
total collection size
sampling method
```

---

# 12. Caching

Cache expensive computations.

Cache keys must include all relevant parameters.

Conceptually:

```text
collection identity
collection version
metric
algorithm
parameters
sample size
random seed
```

Never return cached results for a different configuration.

---

# 13. Background Jobs

For expensive operations such as:

```text
UMAP
t-SNE
large clustering jobs
large kNN analysis
retrieval benchmarks
```

do not block the FastAPI request indefinitely.

Introduce an appropriate local background-job abstraction if needed.

The UI should support:

```text
queued
running
completed
failed
cancelled
```

Do not introduce a distributed job system unless the project genuinely needs one.

Chromolite is primarily a local developer tool.

---

# 14. Frontend Architecture

Follow the existing React architecture.

Use:

```text
service/
```

for API calls.

Use:

```text
store/
```

for persistent/shared analysis state.

Use:

```text
components/
```

for presentation.

Do not put API calls directly throughout visualization components.

Do not duplicate API DTO definitions unnecessarily.

Keep backend DTOs and frontend types explicit.

---

# 15. Visualization UX

The primary workflow should be:

```text
Collection
    ↓
Health
    ↓
Embedding visualization
    ↓
Color/filter
    ↓
Select vector
    ↓
Inspect neighborhood
    ↓
Inspect metadata
    ↓
Inspect outlier/cluster
    ↓
Run query
    ↓
Evaluate retrieval
```

The visualization should support:

```text
zoom
pan
point selection
brushing
filtering
metadata coloring
cluster coloring
density coloring
outlier coloring
```

---

# 16. Important Default Metrics

The main collection dashboard should prioritize:

```text
Vectors
Dimensions
Distance metric

Mean/median norm
Global similarity
Nearest-neighbor similarity
Local density
Outlier rate
Duplicate rate

Cluster count
Silhouette
Cluster separation

Recall@K
ANN recall
p50 latency
p95 latency
p99 latency
```

Do not show retrieval metrics when no ground truth exists.

---

# 17. Metric Explainability

Every metric needs an explanation.

For example:

```text
Silhouette Score

Measures how similar points are to their own
cluster compared with the nearest neighboring cluster.

Range:
-1 to 1

Higher values generally indicate better separation.

Computed on:
10,000 sampled vectors

Method:
sampled
```

Also show:

```text
Exact / Sampled / Approximate
Sample size
Parameters
Last computed
```

---

# 18. Performance Rules

Never accidentally implement:

```text
N × N
```

work for a large collection.

Before adding an operation, ask:

> What is its computational complexity?

Prefer:

```text
O(N)
O(N log N)
O(NK)
approximate algorithms
sampling
batch processing
```

where appropriate.

---

# 19. Numerical Safety

All numerical code must handle:

```text
NaN
inf
-inf
zero vectors
empty arrays
dimension mismatch
float precision
```

Do not silently drop invalid vectors.

If invalid data is excluded, report:

```text
valid vectors
invalid vectors
reason
```

---

# 20. Testing Requirements

Every analytical function requires unit tests.

Test:

```text
empty collection
single vector
two vectors
identical vectors
orthogonal vectors
opposite vectors
zero vectors
NaN
infinity
dimension mismatch
known clusters
overlapping clusters
obvious outlier
missing metadata
high-cardinality metadata
```

Use deterministic test vectors where possible.

Do not test numerical algorithms using arbitrary approximate assertions when exact mathematical expectations can be calculated.

---

# 21. CLI Compatibility

The following behavior must continue working:

```bash
chromolite run --path="/path/to/chroma"
```

The CLI must still:

1. connect to the local ChromaDB
2. start FastAPI
3. serve the frontend
4. open/access the UI
5. expose the API
6. serve the compiled static build

Do not require the user to run a separate Node server in production/package usage.

The frontend development server may be used during development.

The published Python package must contain the built frontend.

---

# 22. Frontend Build Requirements

When frontend code changes:

1. Install/update only required frontend dependencies.
2. Run the frontend build.
3. Verify output location.
4. Verify the Python application serves the new static assets.
5. Test the installed/package-style execution path.

Do not leave the repository in a state where:

```text
npm run dev
```

works but:

```text
chromolite run --path="..."
```

does not.

---

# 23. Backward Compatibility

Existing features must continue working:

* collection browser
* dashboard
* schema explorer
* document viewer
* document pagination
* document detail panel
* existing query functionality
* health endpoint
* CLI
* static serving

Do not rewrite working functionality simply to introduce new architecture.

---

# 24. Code Quality

Prefer:

* small functions
* explicit types
* meaningful names
* pure mathematical functions where possible
* dependency injection where useful
* deterministic computation
* testable services
* clear error handling

Avoid:

* giant route handlers
* giant React components
* hidden global state
* duplicated API logic
* silent exception handling
* magic constants
* arbitrary thresholds

---

# 25. Product Principle

Chromolite is not supposed to be:

> "A pretty UMAP viewer."

It should become:

> **A debugging and observability tool for ChromaDB embeddings and vector search.**

The user should be able to go from:

```text
2D visualization
      ↓
point
      ↓
vector
      ↓
original-space neighbors
      ↓
metadata/document
      ↓
cluster/outlier analysis
      ↓
retrieval behavior
```

That chain is more important than visual polish.

---

# 26. Do Not Overbuild

Do not implement every possible embedding metric.

Before adding a metric, answer:

> What engineering decision does this metric help the user make?

If the answer is unclear, do not add it.

Prioritize:

1. collection health
2. similarity distribution
3. PCA
4. UMAP
5. kNN/local density
6. outliers
7. duplicates
8. clustering
9. cluster quality
10. metadata analysis
11. temporal drift
12. vector inspection
13. query visualization
14. retrieval evaluation
15. ANN vs exact recall
16. latency
17. recall-vs-latency
18. model comparison

---

# 27. Agent Working Style

Act as a seasoned AI infrastructure engineer.

Do not blindly obey a feature request if the implementation would be:

* mathematically incorrect
* computationally unsafe
* architecturally inconsistent
* misleading to users

If a proposed approach is wrong, explain why and implement the technically correct alternative.

Before making major architectural changes:

```text
inspect
→ reason
→ propose
→ implement
→ test
```

Do not make broad speculative refactors.

Keep changes focused and incremental.

---

# 28. Required Completion Report

After each phase, report:

```text
Phase:
Status:

Implemented:
- ...

Files changed:
- ...

Dependencies added:
- ...

API changes:
- ...

Frontend changes:
- ...

Tests:
- ...

Performance:
- ...

Known limitations:
- ...

Next phase:
- ...
```

Never claim a feature is complete without tests.

---

# 29. First Task

Do NOT start implementing embedding analytics immediately.

First:

1. Inspect the repository.
2. Inspect the Python dependency configuration.
3. Inspect the frontend dependency configuration.
4. Inspect existing API/service/store architecture.
5. Inspect the ChromaDB integration.
6. Inspect the frontend build and static-serving process.
7. Determine what dependencies already exist.
8. Determine which new Python/JS dependencies are actually required.
9. Produce a concise implementation plan.
10. Run the existing tests/build before modifying anything.

Then implement **PHASE 0 only**.

Do not proceed to Phase 1 until Phase 0 has been reviewed and the repository remains healthy.

---

# 30. Final Rule

**Correctness > completeness > performance > visual polish.**

A metric that is mathematically correct, clearly labeled, reproducible, and slightly less pretty is preferable to a beautiful visualization that gives the engineer a misleading conclusion.

Never fake data.

Never hide approximation.

Never silently perform O(N²) computation on a production-sized collection.

Never confuse a 2D projection with the actual embedding space.

Never claim retrieval quality without ground truth.

Build Chromolite as an engineering tool.
