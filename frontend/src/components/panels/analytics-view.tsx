import React from 'react';
import {
  Compass,
  Activity,
  Radio,
  Layers,
  GitFork,
  Copy,
  Search,
  Sliders,
  Play,
  Info,
  Terminal,
} from 'lucide-react';
import { Button } from '../ui/button';
import { Badge } from '../ui/badge';
import { Panel, PanelHeader, PanelBody } from '../ui/panel';
import { useCollectionStore } from '../../store/collection.store';
import type { TabId } from '../../store/sidebar.store';

interface AnalyticsMeta {
  title: string;
  category: string;
  description: string;
  icon: React.ComponentType<{ className?: string }>;
  parameters: { label: string; default: string; description: string }[];
  metrics: { label: string; description: string }[];
  phase: string;
}

const ANALYTICS_CONFIG: Record<string, AnalyticsMeta> = {
  embeddings: {
    title: '2D Embedding Projection',
    category: 'PROJECTION',
    description:
      'Dimensionality reduction via deterministic PCA baseline and non-linear UMAP to visualize collection manifold structure.',
    icon: Compass,
    parameters: [
      {
        label: 'Algorithm',
        default: 'PCA / UMAP',
        description: 'Projection technique',
      },
      {
        label: 'Sample size',
        default: '10,000 vectors',
        description: 'Subsample to avoid browser freezing',
      },
      {
        label: 'Metric',
        default: 'Cosine',
        description: 'High-dimensional distance metric',
      },
      {
        label: 'Random Seed',
        default: '42',
        description: 'Reproducibility seed',
      },
    ],
    metrics: [
      {
        label: 'PC1 Variance',
        description: 'Variance explained by principal component 1',
      },
      {
        label: 'PC2 Variance',
        description: 'Variance explained by principal component 2',
      },
      {
        label: 'Combined Variance',
        description: 'Total variance retained in 2D projection',
      },
    ],
    phase: 'Phase 3 & Phase 4',
  },
  similarity: {
    title: 'Similarity Distribution',
    category: 'STATISTICS',
    description:
      'Pairwise similarity distribution across sampled vector pairs and k-nearest-neighbor distances in original high-dimensional space.',
    icon: Activity,
    parameters: [
      {
        label: 'Pair Sample Count',
        default: '50,000 pairs',
        description: 'Sampled pair evaluation (avoids O(N²))',
      },
      {
        label: 'k Neighbors',
        default: 'k = 15',
        description: 'Local neighborhood size',
      },
    ],
    metrics: [
      {
        label: 'Mean Similarity',
        description: 'Global average pairwise cosine similarity',
      },
      {
        label: 'Median Similarity',
        description: 'P50 pairwise cosine similarity',
      },
      {
        label: 'P05 / P95 Spread',
        description: 'Distribution bounds of embedding space density',
      },
    ],
    phase: 'Phase 2',
  },
  neighbors: {
    title: 'kNN & Local Density',
    category: 'NEIGHBORHOOD',
    description:
      'Analyze local neighborhood consistency, local density scores, and high-dimensional neighbor graphs.',
    icon: Radio,
    parameters: [
      {
        label: 'K Values',
        default: '5, 10, 20, 50',
        description: 'Neighbor depth',
      },
      {
        label: 'Metric',
        default: 'Cosine Distance',
        description: 'Original-space distance',
      },
    ],
    metrics: [
      {
        label: 'Mean kNN Distance',
        description: 'Average distance to k nearest neighbors',
      },
      {
        label: 'Local Density Index',
        description: 'Relative neighborhood density estimation',
      },
    ],
    phase: 'Phase 5',
  },
  clusters: {
    title: 'Clustering & Separation',
    category: 'STRUCTURE',
    description:
      'Cluster vector spaces using MiniBatch K-Means or HDBSCAN with silhouette and Davies-Bouldin quality metrics.',
    icon: Layers,
    parameters: [
      {
        label: 'Algorithm',
        default: 'MiniBatch K-Means',
        description: 'Scalable clustering algorithm',
      },
      {
        label: 'Cluster Count (k)',
        default: '8',
        description: 'Target partitions',
      },
    ],
    metrics: [
      {
        label: 'Silhouette Score',
        description: 'Cluster cohesion vs separation (-1 to 1)',
      },
      {
        label: 'Davies-Bouldin Index',
        description: 'Cluster separation ratio',
      },
    ],
    phase: 'Phase 8 & Phase 9',
  },
  outliers: {
    title: 'Outlier & Isolation Detection',
    category: 'ANOMALIES',
    description:
      'Detect vectors unusually isolated from their local neighborhood using kNN distance and Local Outlier Factor (LOF).',
    icon: GitFork,
    parameters: [
      {
        label: 'Method',
        default: 'kNN Distance / LOF',
        description: 'Isolation algorithm',
      },
      {
        label: 'Threshold',
        default: 'Top 1%',
        description: 'Anomaly quantile cutoff',
      },
    ],
    metrics: [
      {
        label: 'Outlier Rate',
        description: 'Fraction of collection flagged as isolated',
      },
      {
        label: 'Isolation Score',
        description: 'Mean distance relative to expected neighborhood density',
      },
    ],
    phase: 'Phase 6',
  },
  duplicates: {
    title: 'Duplicate & Near-Duplicate Detection',
    category: 'INTEGRITY',
    description:
      'Identify exact duplicate embeddings and near-duplicate clusters above 0.98 similarity thresholds.',
    icon: Copy,
    parameters: [
      {
        label: 'Similarity Threshold',
        default: '0.98',
        description: 'Near-duplicate boundary',
      },
      {
        label: 'Candidate Generator',
        default: 'LSH / MinHash',
        description: 'Sub-O(N²) candidate filter',
      },
    ],
    metrics: [
      {
        label: 'Exact Duplicate Count',
        description: 'Identical embedding vectors',
      },
      {
        label: 'Near Duplicate Groups',
        description: 'Clusters of highly redundant vectors',
      },
    ],
    phase: 'Phase 7',
  },
  queries: {
    title: 'Vector Query Workspace',
    category: 'DEBUGGER',
    description:
      'Test queries against ChromaDB, inspect nearest retrieved vectors, and compare original space distance with 2D projection.',
    icon: Search,
    parameters: [
      {
        label: 'n_results',
        default: '10',
        description: 'Top K retrieved documents',
      },
      {
        label: 'Filter',
        default: 'None',
        description: 'Metadata where clause',
      },
    ],
    metrics: [
      {
        label: 'Query Latency',
        description: 'Database retrieval time in milliseconds',
      },
      {
        label: 'Top-1 Similarity',
        description: 'Cosine similarity to nearest match',
      },
    ],
    phase: 'Phase 13 & Phase 16',
  },
  evaluation: {
    title: 'Retrieval Evaluation & Benchmarking',
    category: 'BENCHMARK',
    description:
      'Compare ANN index search against exact nearest-neighbor search to calculate ANN Recall@K and search latency profiles.',
    icon: Sliders,
    parameters: [
      {
        label: 'Test Queries',
        default: '100 sample vectors',
        description: 'Evaluation probe set',
      },
      {
        label: 'K Cutoffs',
        default: '1, 5, 10, 50',
        description: 'Recall depths',
      },
    ],
    metrics: [
      {
        label: 'ANN Recall@10',
        description: 'ANN top-10 overlap with exact search',
      },
      {
        label: 'p50 / p95 Latency',
        description: 'Search latency distribution',
      },
    ],
    phase: 'Phase 14 & Phase 15',
  },
};

export interface AnalyticsViewProps {
  tab: TabId;
}

export const AnalyticsView: React.FC<AnalyticsViewProps> = ({ tab }) => {
  const activeCollection = useCollectionStore((s) => s.activeCollection);
  const details = useCollectionStore((s) => s.activeCollectionDetails);
  const config = ANALYTICS_CONFIG[tab] || ANALYTICS_CONFIG.embeddings;
  const Icon = config.icon;

  const vectorCount = details?.document_count ?? 0;

  return (
    <div className="bg-background flex h-full flex-col overflow-y-auto p-6">
      <div className="mx-auto w-full max-w-5xl space-y-6">
        {/* Header */}
        <div className="border-border flex items-start justify-between gap-4 border-b pb-5">
          <div>
            <div className="mb-1 flex items-center gap-2">
              <span className="text-text-muted font-mono text-[10px] font-semibold tracking-wider uppercase">
                {config.category}
              </span>
              <Badge variant="accent" size="xs" mono>
                {config.phase}
              </Badge>
            </div>
            <h1 className="text-foreground flex items-center gap-2 font-sans text-[20px] font-semibold tracking-tight">
              <Icon className="text-accent h-5 w-5" />
              {config.title}
            </h1>
            <p className="text-text-secondary mt-1 max-w-2xl text-[13px] leading-normal">
              {config.description}
            </p>
          </div>

          <Button
            variant="primary"
            size="sm"
            leftIcon={<Play className="h-3.5 w-3.5" />}
            onClick={() => {
              alert(
                `Computational engine for ${config.title} will execute in Python analysis service. Vector dataset size: ${vectorCount.toLocaleString()} vectors.`,
              );
            }}
          >
            Compute Analysis
          </Button>
        </div>

        {/* Workspace Canvas / Placeholder State */}
        <Panel className="flex min-h-[280px] flex-col justify-between">
          <PanelHeader
            title="Analysis Workspace"
            description={`Collection: ${activeCollection?.name ?? '—'} (${vectorCount.toLocaleString()} vectors)`}
            actions={
              <Badge variant="neutral" size="xs" mono>
                Status: Ready for computation
              </Badge>
            }
          />
          <PanelBody className="my-auto flex flex-col items-center justify-center p-12 text-center">
            <div className="border-border bg-surface-subtle text-text-muted mb-3 flex h-10 w-10 items-center justify-center rounded-md border">
              <Icon className="text-accent h-5 w-5" />
            </div>
            <h3 className="text-foreground font-sans text-[14px] font-semibold tracking-tight">
              {config.title} Workspace
            </h3>
            <p className="text-text-secondary mt-1 max-w-md text-[13px] leading-normal">
              Click &quot;Compute Analysis&quot; to run the Python ML pipeline
              on{' '}
              <span className="text-foreground font-mono font-medium">
                {vectorCount.toLocaleString()}
              </span>{' '}
              vectors. Operations execute in backend NumPy / SciPy services to
              ensure browser performance.
            </p>
            <div className="mt-4 flex items-center gap-2">
              <span className="text-text-muted flex items-center gap-1 font-mono text-[11px]">
                <Terminal className="h-3 w-3" /> Backend service ready
              </span>
            </div>
          </PanelBody>
        </Panel>

        {/* Configuration & Parameter Specification */}
        <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
          <Panel>
            <PanelHeader title="Execution Parameters" />
            <PanelBody className="p-0">
              <div className="divide-border divide-y">
                {config.parameters.map((param) => (
                  <div
                    key={param.label}
                    className="flex items-center justify-between p-3 text-[12.5px]"
                  >
                    <div>
                      <span className="text-foreground font-sans font-medium">
                        {param.label}
                      </span>
                      <p className="text-text-secondary text-[11px]">
                        {param.description}
                      </p>
                    </div>
                    <span className="text-text-primary bg-surface-subtle border-border rounded border px-2 py-0.5 font-mono text-[12px]">
                      {param.default}
                    </span>
                  </div>
                ))}
              </div>
            </PanelBody>
          </Panel>

          <Panel>
            <PanelHeader title="Observed Metrics & Diagnostic Output" />
            <PanelBody className="p-0">
              <div className="divide-border divide-y">
                {config.metrics.map((metric) => (
                  <div
                    key={metric.label}
                    className="flex items-center justify-between p-3 text-[12.5px]"
                  >
                    <div>
                      <span className="text-foreground font-sans font-medium">
                        {metric.label}
                      </span>
                      <p className="text-text-secondary text-[11px]">
                        {metric.description}
                      </p>
                    </div>
                    <span className="text-text-muted font-mono text-[11px]">
                      Pending run
                    </span>
                  </div>
                ))}
              </div>
            </PanelBody>
          </Panel>
        </div>

        {/* Mathematical Disclaimer */}
        <div className="border-border bg-surface-subtle/70 text-text-secondary flex items-start gap-2.5 rounded-md border p-3.5 text-[12px]">
          <Info className="text-accent mt-0.5 h-4 w-4 shrink-0" />
          <div className="space-y-1">
            <span className="text-foreground font-sans font-medium">
              Mathematical Correctness Notice
            </span>
            <p className="leading-relaxed">
              In accordance with Chromolite standards, all distance metrics, kNN
              distributions, and density estimates are calculated in original
              high-dimensional vector space. 2D projections are visual
              approximations and never substitute for original embedding space
              distance.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AnalyticsView;
