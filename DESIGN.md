# Chromolite Design System

> Product design specification for Chromolite
> Audience: developers, ML engineers, AI engineers, data engineers
> Product character: minimal, technical, precise, lightweight, calm

---

## 1. Design Direction

Chromolite is a developer tool for understanding local ChromaDB collections, embeddings, vector spaces, and retrieval behavior.

The interface should feel like a **serious technical instrument**, not an analytics SaaS dashboard.

The design should communicate:

* Precision
* Technical confidence
* Clarity
* Speed
* Density without clutter
* Calmness
* Trustworthiness
* Engineering taste

Chromolite should look like software an AI engineer would happily keep open all day.

### Core principle

> **Make complex vector systems feel inspectable.**

The UI should progressively reveal complexity rather than displaying everything at once.

Do not build a dashboard full of cards simply because cards are available.

Every visual element should answer one of:

1. What is this?
2. What is its current state?
3. Is something wrong?
4. What can I inspect next?
5. What action can I take?

---

# 2. Product Personality

Chromolite should feel:

### Technical, not corporate

Avoid:

* SaaS gradients
* Huge marketing typography
* Decorative illustrations
* Excessive rounded cards
* Generic AI sparkles
* Excessive glassmorphism
* Excessive shadows

Prefer:

* Strong typography
* Thin borders
* Dense but breathable layouts
* Subtle surfaces
* Monospaced technical values
* Small status indicators
* Precise spacing
* Clear hierarchy

### Minimal, not empty

Minimalism does not mean removing useful information.

The product can contain a lot of information, but information must have hierarchy.

A useful mental model:

```text
Primary information
        ↓
Supporting information
        ↓
Technical detail
        ↓
Raw/debug information
```

Do not give all four levels equal visual weight.

---

# 3. Visual Reference

The visual language should sit somewhere between:

* Linear
* Vercel
* GitHub's developer surfaces
* modern observability tools
* scientific/data-analysis software

But Chromolite should have its own identity.

The interface should feel **editorial and technical**, rather than dashboard-heavy.

---

# 4. Typography

Typography is one of the primary brand elements.

## Primary Typeface

### Space Grotesk

Use **Space Grotesk** as the primary UI typeface.

Use it for:

* Page titles
* Section headings
* Navigation
* Buttons
* Body text
* Descriptions
* Empty states
* Form labels
* General UI copy

Space Grotesk provides the modern technical character without making the interface feel overly futuristic.

### Recommended weights

```text
400 — body
500 — labels / controls
600 — important labels / section headings
700 — page titles / major emphasis
```

Avoid using 700 everywhere.

Typography should rely on hierarchy rather than excessive weight.

---

## Secondary Typeface

### IBM Plex Mono

Use **IBM Plex Mono** for technical information.

Use it for:

* Vector dimensions
* Collection counts
* Similarity scores
* Distances
* Percentages when analytical
* Latency
* IDs
* Hashes
* Collection names when appropriate
* File paths
* API-like values
* Coordinates
* Model names
* Algorithm parameters
* Timestamps
* Status codes
* Query results
* Chart axis values when appropriate

Example:

```text
1,284,912 vectors
1536 dimensions
cosine
0.9821 similarity
42.8 ms
```

The distinction between fonts should help users immediately understand:

> "This is interface language."

versus:

> "This is machine/data language."

---

# 5. Typography Hierarchy

Suggested hierarchy:

```text
Page Title
Space Grotesk / 28–32px / 600–700

Section Title
Space Grotesk / 18–20px / 600

Card Title
Space Grotesk / 14–16px / 600

Body
Space Grotesk / 13–14px / 400

Secondary text
Space Grotesk / 12–13px / 400

Technical value
IBM Plex Mono / 12–14px / 400–500

Metric
IBM Plex Mono / 20–28px / 500

Micro label
IBM Plex Mono / 10–11px / 500
```

Do not make every metric huge.

Large typography should communicate significance.

---

# 6. Color System

Chromolite should use a restrained neutral base.

The UI should work primarily through:

* background
* surface
* border
* text
* muted text
* one restrained accent

Color should communicate meaning, not decoration.

## Base palette

Use near-neutral colors rather than pure black and pure white.

### Light mode

```text
Background       #F8F8F6
Surface          #FFFFFF
Surface subtle   #F3F3F0

Border           #E5E5E0
Border strong    #D7D7D0

Text             #181817
Text secondary   #5F5F5A
Text muted       #898983
```

### Dark mode

```text
Background       #0D0D0C
Surface          #141413
Surface subtle   #1A1A18

Border           #292927
Border strong    #383835

Text             #F1F1ED
Text secondary   #A7A7A0
Text muted       #707069
```

The dark interface should not be pure black.

The light interface should not be pure white everywhere.

---

# 7. Accent Color

Use one primary accent.

The accent should feel technical rather than playful.

Recommended direction:

```text
Accent           #7C5CFC
```

Use accent sparingly for:

* Active navigation
* Selected collection
* Focus states
* Primary actions
* Selected points
* Links
* Interactive chart states
* Query point
* Important highlights

Do not flood the interface with accent color.

An accent should mean:

> "This is currently selected or actionable."

---

# 8. Semantic Colors

Semantic colors should be subtle.

```text
Success
#2F9E68

Warning
#C88A24

Error
#D45454

Info
#4D7CFE
```

Avoid bright saturated badges.

Prefer:

```text
background: semantic color at low opacity
border: semantic color at moderate opacity
text: semantic color
```

Example:

```text
✓ Healthy
```

should feel subtle rather than like a traffic-light dashboard.

---

# 9. Spacing

Use a consistent spacing scale.

Base unit:

```text
4px
```

Recommended scale:

```text
4
8
12
16
20
24
32
40
48
64
```

Most UI should live between:

```text
8px → 32px
```

Avoid excessive whitespace that makes a technical tool feel like a marketing site.

---

# 10. Layout

Chromolite should use a restrained application shell.

Recommended structure:

```text
┌──────────────────────────────────────────────────────────────┐
│ Logo / Collection                         Search / Actions   │
├──────────────┬───────────────────────────────────────────────┤
│              │                                               │
│ Navigation   │                Main workspace                 │
│              │                                               │
│ Collections  │                                               │
│ Analytics    │                                               │
│ Queries      │                                               │
│              │                                               │
│              │                                               │
└──────────────┴───────────────────────────────────────────────┘
```

The sidebar should not dominate the interface.

Recommended width:

```text
220–240px
```

On smaller screens it should collapse.

---

# 11. Application Header

The header should be quiet.

Avoid a large branded header.

Use:

```text
Chromolite
/
collection_name
```

or:

```text
Chromolite        collection_name
```

with actions on the right.

Header height:

```text
52–60px
```

Use a subtle bottom border.

---

# 12. Sidebar

The sidebar is navigation, not a second dashboard.

Primary sections:

```text
Collections

Overview
Documents
Embeddings
Neighbors
Clusters
Outliers
Duplicates
Queries
Evaluation
```

Not every section needs to be visible for every collection.

Navigation should communicate hierarchy.

Example:

```text
COLLECTION

  Overview
  Documents
  Embeddings

ANALYSIS

  Similarity
  Neighbors
  Clusters
  Outliers

RETRIEVAL

  Queries
  Evaluation
```

Section labels should use IBM Plex Mono.

Keep them small and understated.

---

# 13. Cards

Cards should be used for **logical grouping**, not decoration.

Avoid:

```text
┌─────────────────────┐
│  Big fancy card     │
│                     │
│      1,284,912      │
│       vectors       │
└─────────────────────┘
```

repeated 12 times.

Prefer a compact metric system:

```text
VECTORS          DIMENSION        METRIC

1,284,912        1536             cosine
```

Cards should feel like panels in an engineering tool.

### Card characteristics

```text
border: 1px
radius: 8–10px
shadow: none or extremely subtle
background: surface
```

Avoid large rounded corners.

Avoid gradients.

Avoid floating shadows.

---

# 14. Metric Cards

Metrics should prioritize readability.

Example:

```text
VECTOR COUNT
1,284,912
+4.8% from previous snapshot
```

The label can use IBM Plex Mono.

The number should use IBM Plex Mono.

The explanatory text should use Space Grotesk.

This creates a deliberate visual distinction.

---

# 15. Borders

Borders are important to Chromolite.

Use borders to establish structure instead of shadows.

Default:

```text
1px solid border
```

Borders should usually be low contrast.

A stronger border is reserved for:

* active state
* selected item
* focused control
* important separation

---

# 16. Shadows

Use very few shadows.

Default:

```text
none
```

For floating UI:

```text
small, soft shadow
```

Never use large dramatic shadows.

Chromolite should feel flat and precise.

---

# 17. Radius

Recommended:

```text
Inputs       6px
Buttons      6px
Cards        8px
Dialogs      10px
Menus        8px
```

Do not use `rounded-full` except for:

* status dots
* avatars
* tiny indicators
* genuinely circular controls

Avoid the "everything is a pill" aesthetic.

---

# 18. Buttons

Buttons should be compact.

Primary:

```text
solid accent
white/light text
6px radius
```

Secondary:

```text
transparent/surface
border
```

Ghost:

```text
no border
subtle hover
```

Danger:

```text
semantic error treatment
```

Buttons should not be oversized.

Recommended height:

```text
32–36px
```

---

# 19. Inputs

Inputs should look like technical controls.

Characteristics:

```text
height: 32–36px
border: 1px
radius: 6px
font: Space Grotesk
```

Technical inputs may use IBM Plex Mono.

Examples:

```text
k = 10
threshold = 0.98
seed = 42
```

---

# 20. Tables

Tables are important because this is a developer tool.

Avoid overly decorative data tables.

Use:

* thin row separators
* compact rows
* strong column hierarchy
* monospaced technical values
* subtle hover state

Example:

```text
ID                 SIMILARITY      DISTANCE      CLUSTER
doc_82af...        0.9821          0.0179        03
doc_19bc...        0.9744          0.0256        03
doc_02aa...        0.9618          0.0382        07
```

IDs and analytical values should use IBM Plex Mono.

---

# 21. Charts

Charts should be treated as analytical instruments.

Do not decorate charts unnecessarily.

Avoid:

* gradients
* 3D
* excessive legends
* chart junk
* excessive grid lines
* oversized titles

Prefer:

* subtle axes
* minimal grid
* clear tooltips
* precise labels
* consistent scales
* meaningful annotations

Charts should prioritize interpretation over visual spectacle.

---

# 22. Embedding Visualization

Embedding visualization is one of Chromolite's signature surfaces.

The visualization should be treated as a workspace.

Example:

```text
┌────────────────────────────────────────────────────────────┐
│ Projection: UMAP       Color: Cluster       Sample: 25k    │
│                                                            │
│                                                            │
│                    · · ·                                  │
│               · · ·    · ·                                │
│             · ·           ·                                │
│                    ·                                       │
│                                                            │
│                              · · ·                         │
│                           · ·    ·                         │
│                                                            │
└────────────────────────────────────────────────────────────┘
```

Controls should stay close to the visualization.

Do not place a giant control panel above the chart.

---

# 23. Projection vs Original Space

The UI must clearly distinguish:

```text
Projection space
```

from:

```text
Original embedding space
```

For example:

```text
UMAP projection
2D visualization only
```

When showing nearest neighbors, make clear that retrieval is computed in the original embedding space.

Never visually imply that:

> closer in UMAP = more similar in embedding space.

This distinction is fundamental to the product.

---

# 24. Data Density

Chromolite is expected to handle technically dense information.

Density should be controlled through hierarchy.

Use:

* compact controls
* grouped sections
* progressive disclosure
* tabs
* expandable detail
* side inspectors

Do not solve density by shrinking everything.

The interface should remain comfortable to read.

---

# 25. Inspector Pattern

Selecting an embedding/vector should open an inspector.

Recommended:

```text
┌─────────────────────────────────────────────────────────────┐
│ VECTOR INSPECTOR                                      ×     │
├─────────────────────────────────────────────────────────────┤
│ ID                                                          │
│ doc_82af9c...                                               │
│                                                             │
│ METADATA                                                    │
│ source      documentation                                   │
│ category    api                                             │
│                                                             │
│ EMBEDDING                                                    │
│ dimensions      1536                                        │
│ norm            1.0028                                      │
│ cluster         03                                          │
│ outlier score   0.012                                       │
│                                                             │
│ NEAREST NEIGHBORS                                           │
│ ...                                                         │
└─────────────────────────────────────────────────────────────┘
```

The inspector should feel like a developer debugger.

---

# 26. Status Indicators

Use small status indicators.

Example:

```text
● Connected
● Computing
● Approximate
● Cached
● Stale
```

The indicator should not dominate.

Prefer:

```text
● Connected
```

over:

```text
[ CONNECTED ]
```

unless a badge is genuinely useful.

---

# 27. Loading States

Avoid generic full-page spinners.

Show what is happening.

Example:

```text
Computing nearest neighbors

██████████████░░░░░░

12,842 / 25,000 vectors
```

For long-running operations:

```text
UMAP projection
Computing 25k sampled vectors
Estimated complexity: high
```

The UI should make computation feel understandable.

---

# 28. Empty States

Empty states should be concise and useful.

Avoid illustrations.

Example:

```text
No embedding analysis yet

Compute a projection to explore the structure
of this collection.

[ Compute projection ]
```

Developer tools should not waste space explaining obvious concepts.

---

# 29. Errors

Errors should be actionable.

Bad:

```text
Something went wrong.
```

Good:

```text
Projection failed

UMAP requires at least 3 valid vectors.
This collection contains 2.

[ Back to collection ]
```

If a metric cannot be computed:

```text
Not available

Ground-truth relevance labels are required
to calculate Recall@K.
```

Never display fake values.

---

# 30. Approximation

Approximation must be visible.

Examples:

```text
25k sampled vectors
Approximate
```

or:

```text
ANN search
Recall measured against exact search
```

Approximation should never be hidden behind a polished visualization.

---

# 31. Animation

Animation should be restrained.

Use transitions for:

* hover
* selection
* panel opening
* navigation
* filtering
* chart interaction

Duration:

```text
100–180ms
```

Avoid:

* bouncing
* excessive spring animations
* page transitions
* animated gradients
* decorative motion

The interface should feel fast even when computation is expensive.

---

# 32. Hover States

Hover states should be subtle.

Examples:

```text
background → slightly lighter/darker
border → slightly stronger
text → slightly brighter
```

Do not transform elements on hover.

No scaling.

No dramatic glow.

---

# 33. Selection States

Selection should be obvious but restrained.

Use:

* accent border
* subtle accent background
* accent indicator

For visualization points:

```text
normal → small point
hover → larger point + tooltip
selected → highlighted point + inspector
```

---

# 34. Visualization Colors

For clusters and categorical metadata, use a carefully designed categorical palette.

The palette must:

* work in dark mode
* work in light mode
* remain distinguishable
* avoid excessively saturated colors
* support color-blind users where possible

Do not reuse semantic colors for arbitrary clusters.

Semantic colors mean:

```text
green = healthy
yellow = warning
red = error
```

Cluster colors mean:

```text
cluster identity
```

These concepts must remain visually distinct.

---

# 35. Dark Mode

Dark mode should be a first-class design.

Do not simply invert light mode.

Dark mode should use layered surfaces:

```text
background
    ↓
surface
    ↓
elevated surface
    ↓
selected surface
```

Borders become important for separation.

Text contrast should be high enough for readability without making every surface extremely bright.

---

# 36. Responsive Behavior

Chromolite is primarily a desktop developer tool.

Prioritize:

```text
1440px
1280px
1024px
```

Support smaller screens gracefully.

At smaller widths:

* collapse sidebar
* stack metric groups
* move inspector into drawer
* simplify visualization controls
* allow horizontal table scrolling

Do not attempt to make every complex visualization perfect on a phone.

---

# 37. Accessibility

Minimum requirements:

* keyboard navigation
* visible focus states
* sufficient text contrast
* semantic buttons
* semantic navigation
* accessible labels
* no information conveyed by color alone
* tooltips should not contain the only explanation of a control

Charts and visualization controls must have accessible textual alternatives where practical.

---

# 38. Icons

Use icons sparingly.

Icons should communicate actions or navigation.

Do not add an icon to every label.

Preferred style:

* simple
* geometric
* consistent stroke width
* visually quiet

Icons should support typography, not replace it.

---

# 39. Icon + Text

Good:

```text
⌕ Search
```

Good:

```text
＋ Create collection
```

Avoid:

```text
[icon] [icon] [icon] [icon] [icon]
```

when the user has no way to know what the icons mean.

---

# 40. Data Formatting

Numbers should be formatted consistently.

Examples:

```text
1,284,912
1,536
0.9821
42.8 ms
98.7%
```

Technical values should use IBM Plex Mono.

Do not mix:

```text
1.2k
1,284
1284
```

randomly.

Choose formatting based on context.

---

# 41. Micro Labels

Micro labels are useful for analytical interfaces.

Example:

```text
VECTOR COUNT
1,284,912
```

or:

```text
DISTANCE METRIC
COSINE
```

Micro labels should be:

```text
IBM Plex Mono
10–11px
uppercase
slight letter spacing
muted
```

Do not overuse uppercase.

---

# 42. Tooltips

Tooltips should explain technical concepts without becoming documentation.

Example:

```text
Mean kNN distance

Average distance from each sampled vector
to its k nearest neighbors in the original
embedding space.
```

For mathematically meaningful metrics, tooltips can include:

* definition
* method
* approximation state
* sample size

---

# 43. Progressive Disclosure

The default view should show the most useful information.

Advanced users should be able to inspect deeper details.

Example:

```text
Similarity
0.742

[View distribution]
```

opens:

```text
Mean
Median
P05
P95
Std
Sample size
Method
Metric
```

Do not expose every statistic simultaneously.

---

# 44. Navigation Philosophy

Navigation should follow the user's mental model.

Recommended top-level structure:

```text
Collections
```

Then inside a collection:

```text
Overview
Documents
Embeddings
Analysis
Queries
Evaluation
```

The product should feel like inspecting one system rather than navigating a SaaS product with dozens of unrelated pages.

---

# 45. Overview Page

The overview should answer:

> "Is this collection healthy, and where should I look next?"

Suggested hierarchy:

```text
Collection name
description / metadata

Core metrics
────────────────────────────

Vector count
Dimensions
Metric
Embedding coverage

Embedding health
────────────────────────────

Norm distribution
Similarity distribution

Structure
────────────────────────────

Projection
Clusters
Outliers

Retrieval
────────────────────────────

Recent query performance
Recall / latency if available
```

The overview should not show every analysis result.

It should provide a map of the system.

---

# 46. Analysis Pages

Analysis pages should have a consistent structure:

```text
Title
Short explanation

Controls
────────────────────────

Primary visualization
────────────────────────

Supporting metrics
────────────────────────

Detailed table / inspector
────────────────────────
```

This creates familiarity across:

* Similarity
* Neighbors
* Clusters
* Outliers
* Duplicates
* Retrieval

---

# 47. Query Workspace

Query analysis should feel like a debugging environment.

Example:

```text
QUERY

"How do I configure authentication?"

Embedding
1536 dimensions

Top results
────────────────────────

01   0.9421   docs/authentication.md
02   0.9184   docs/configuration.md
03   0.9012   docs/security.md
```

The query vector should be visually distinct in the embedding projection.

Retrieval rank should remain independent from 2D projection position.

---

# 48. Developer Tool Aesthetic

Chromolite should feel closer to a:

```text
debugger
profiler
database inspector
scientific instrument
```

than a:

```text
marketing dashboard
BI dashboard
AI landing page
```

This is the strongest design constraint in the entire system.

---

# 49. What To Avoid

Never introduce these unless there is a strong product reason:

* Glassmorphism
* Large gradients
* AI sparkle icons
* Excessive pills
* Giant metric numbers
* Heavy drop shadows
* Excessive rounded cards
* Decorative illustrations
* Animated backgrounds
* Neon cyberpunk aesthetics
* Dashboard clutter
* Excessive charts
* Excessive badges
* Huge hero sections
* Marketing-style copy
* Generic "AI" visual language

Chromolite should not look like an AI startup landing page.

It should look like a **tool engineers trust**.

---

# 50. Design Tokens

Create a centralized token layer.

Do not scatter visual values throughout components.

Tokens should cover:

```text
font family
font size
font weight
line height

background
surface
border
text
muted
accent
semantic colors

spacing
radius
shadows

control heights
sidebar width
header height
```

Tailwind utilities should consume the design system rather than becoming the design system.

---

# 51. Component Philosophy

Components should be composable and boring.

Prefer:

```text
Metric
Panel
Section
Table
Tabs
Toolbar
Inspector
Badge
Button
Input
Select
Tooltip
EmptyState
```

over dozens of highly specialized visual components.

A component should exist because it expresses a reusable UI concept.

---

# 52. Frontend Architecture

The design system must not create architectural coupling.

Keep:

```text
data fetching
    ↓
service layer

application state
    ↓
Zustand

presentation
    ↓
React components

visual styling
    ↓
design tokens / Tailwind
```

Visualization components should receive data rather than fetch it directly.

---

# 53. Performance

Visual polish must not come at the expense of performance.

Avoid:

* unnecessary re-renders
* expensive calculations inside React render
* rendering thousands of DOM nodes for vector points
* giant SVG datasets when Canvas/WebGL is appropriate
* unnecessary animations
* repeated data transformations

Embedding visualization should be designed for large datasets.

---

# 54. Visual Density

Chromolite should have approximately:

```text
comfortable density
```

rather than:

```text
enterprise dashboard density
```

or:

```text
consumer app whitespace
```

Target:

* 12–14px body text
* 32–36px controls
* 8–24px internal spacing
* compact tables
* generous separation between conceptual sections

---

# 55. Design Principle: Quiet Confidence

The final interface should not constantly tell the user:

> "Look how beautiful this is."

Instead it should communicate:

> "Everything you need is here, and nothing is getting in your way."

That is the desired Chromolite aesthetic.

---

# 56. Final Design Rule

When making a design decision, prefer:

```text
clarity > decoration
hierarchy > density
precision > spectacle
utility > novelty
consistency > cleverness
performance > animation
data integrity > visual polish
```

Chromolite should feel like a tool built by engineers who care deeply about both **systems and interfaces**.
