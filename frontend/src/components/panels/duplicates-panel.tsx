import React, { useState, useEffect, useCallback } from 'react';
import {
  Copy,
  Play,
  Info,
  AlertTriangle,
  CheckCircle2,
  Sliders,
  ChevronDown,
  ChevronRight,
} from 'lucide-react';
import { useCollectionStore } from '../../store/collection.store';
import { getDuplicates } from '../../service/analysis.service';
import type {
  AnalysisResponse,
  DuplicateDetectionResult,
} from '../../store/analysis.types';
import { Button } from '../ui/button';
import { Badge } from '../ui/badge';
import { Panel, PanelHeader, PanelBody } from '../ui/panel';
import { Metric } from '../ui/metric';
import { LoadingState } from '../ui/loading-state';
import { CopyButton } from '../ui/copy-button';

export const DuplicatesPanel: React.FC = () => {
  const activeCollection = useCollectionStore((s) => s.activeCollection);
  const details = useCollectionStore((s) => s.activeCollectionDetails);

  const [threshold, setThreshold] = useState<number>(0.98);
  const [sampleSize, setSampleSize] = useState<number>(10000);
  const [randomSeed, setRandomSeed] = useState<number>(42);

  const [data, setData] =
    useState<AnalysisResponse<DuplicateDetectionResult> | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Set of expanded group IDs
  const [expandedGroups, setExpandedGroups] = useState<Set<string>>(
    new Set(['group_1', 'group_2']),
  );

  const toggleGroup = (groupId: string) => {
    setExpandedGroups((prev) => {
      const next = new Set(prev);
      if (next.has(groupId)) {
        next.delete(groupId);
      } else {
        next.add(groupId);
      }
      return next;
    });
  };

  const runAnalysis = useCallback(async () => {
    if (!activeCollection) return;
    setIsLoading(true);
    setError(null);
    try {
      const res = await getDuplicates(
        activeCollection.name,
        threshold,
        sampleSize,
        randomSeed,
      );
      setData(res);
      // Auto-expand first 2 groups
      if (res.result.groups.length > 0) {
        setExpandedGroups(
          new Set(res.result.groups.slice(0, 3).map((g) => g.group_id)),
        );
      }
    } catch (err: unknown) {
      console.error('Failed to detect duplicates', err);
      setError(
        err instanceof Error
          ? err.message
          : 'Failed to compute duplicate detection analysis.',
      );
    } finally {
      setIsLoading(false);
    }
  }, [activeCollection, threshold, sampleSize, randomSeed]);

  useEffect(() => {
    runAnalysis();
  }, [runAnalysis]);

  const totalVectors = details?.document_count ?? 0;
  const result = data?.result;

  return (
    <div className="bg-background flex h-full flex-col overflow-y-auto p-6">
      <div className="mx-auto w-full max-w-5xl space-y-6">
        {/* Header */}
        <div className="border-border flex flex-wrap items-start justify-between gap-4 border-b pb-5">
          <div>
            <div className="mb-1 flex items-center gap-2">
              <span className="text-text-muted font-mono text-[10px] font-semibold tracking-wider uppercase">
                INTEGRITY & REDUNDANCY
              </span>
              <Badge variant="accent" size="xs" mono>
                Phase 7
              </Badge>
              {data && (
                <Badge
                  variant={result && result.total_redundant_vectors > 0 ? 'warning' : 'success'}
                  size="xs"
                  mono
                >
                  {result?.total_redundant_vectors.toLocaleString()} Redundant Vectors
                </Badge>
              )}
            </div>
            <h1 className="text-foreground flex items-center gap-2 font-sans text-[22px] font-semibold tracking-tight">
              <Copy className="text-accent h-5 w-5" />
              Duplicate & Near-Duplicate Detection
            </h1>
            <p className="text-text-secondary mt-1 max-w-2xl text-[13px] leading-normal">
              Identifies exact identical vectors and near-duplicate semantic clusters
              exceeding similarity thresholds without naive O(N²) all-pairs comparisons.
            </p>
          </div>

          <Button
            variant="primary"
            size="sm"
            isLoading={isLoading}
            leftIcon={<Play className="h-3.5 w-3.5" />}
            onClick={runAnalysis}
          >
            Scan for Duplicates
          </Button>
        </div>

        {/* Configuration Toolbar */}
        <Panel subtle className="p-3.5">
          <div className="flex flex-wrap items-center justify-between gap-4 text-[12px]">
            <div className="flex flex-wrap items-center gap-4">
              <div className="flex items-center gap-2">
                <Sliders className="text-text-muted h-3.5 w-3.5" />
                <span className="text-text-secondary font-sans font-medium">
                  Similarity Cutoff:
                </span>
                <select
                  value={threshold}
                  onChange={(e) => setThreshold(Number(e.target.value))}
                  className="bg-surface border-border text-foreground rounded border px-2.5 py-1 font-mono text-[11.5px]"
                >
                  <option value={0.99}>≥ 0.99 (Extremely Strict / Near-Identical)</option>
                  <option value={0.98}>≥ 0.98 (Standard Semantic Duplicate)</option>
                  <option value={0.95}>≥ 0.95 (Broad Redundancy Cluster)</option>
                  <option value={0.90}>≥ 0.90 (Loose Paraphrase)</option>
                </select>
              </div>

              <div className="flex items-center gap-2">
                <span className="text-text-secondary font-sans font-medium">
                  Sample:
                </span>
                <select
                  value={sampleSize}
                  onChange={(e) => setSampleSize(Number(e.target.value))}
                  className="bg-surface border-border text-foreground rounded border px-2 py-1 font-mono text-[11.5px]"
                >
                  <option value={1000}>1,000</option>
                  <option value={5000}>5,000</option>
                  <option value={10000}>10,000</option>
                  <option value={25000}>25,000</option>
                </select>
              </div>

              <div className="flex items-center gap-2">
                <span className="text-text-secondary font-sans font-medium">
                  Seed:
                </span>
                <input
                  type="number"
                  value={randomSeed}
                  onChange={(e) => setRandomSeed(Number(e.target.value))}
                  className="bg-surface border-border text-foreground w-16 rounded border px-2 py-1 font-mono text-[11.5px]"
                />
              </div>
            </div>

            <div className="text-text-muted font-mono text-[11px]">
              Collection: {totalVectors.toLocaleString()} vectors
            </div>
          </div>
        </Panel>

        {/* Error State */}
        {error && (
          <div className="border-error/40 bg-error/10 text-error flex items-start gap-2.5 rounded-md border p-3.5 text-[12.5px]">
            <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
            <div>
              <span className="font-semibold">Detection Failed: </span>
              <span>{error}</span>
            </div>
          </div>
        )}

        {/* Loading State */}
        {isLoading && !result && (
          <div className="py-16">
            <LoadingState label="Hashing byte representations and filtering kNN duplicate candidates in Python…" />
          </div>
        )}

        {result && (
          <>
            {/* Summary Metrics Cards */}
            <div className="grid grid-cols-2 gap-3.5 sm:grid-cols-4">
              <Panel subtle className="p-4">
                <Metric
                  label="Redundant Vectors"
                  value={result.total_redundant_vectors.toLocaleString()}
                  description="Non-unique embeddings"
                  size="standard"
                />
              </Panel>

              <Panel subtle className="p-4">
                <Metric
                  label="Redundancy Rate"
                  value={`${(result.redundancy_rate * 100).toFixed(2)}%`}
                  description="Fraction of collection"
                  size="standard"
                />
              </Panel>

              <Panel subtle className="p-4">
                <Metric
                  label="Exact Duplicate Groups"
                  value={result.exact_group_count.toLocaleString()}
                  description={`${result.exact_duplicate_count} identical vectors`}
                  size="standard"
                />
              </Panel>

              <Panel subtle className="p-4">
                <Metric
                  label="Near-Duplicate Groups"
                  value={result.near_group_count.toLocaleString()}
                  description={`≥ ${(result.threshold * 100).toFixed(0)}% similarity`}
                  size="standard"
                />
              </Panel>
            </div>

            {/* Redundancy Status Banner */}
            <div
              className={`flex items-start gap-3 rounded-md border p-4 text-[12.5px] ${
                result.total_redundant_vectors > 0
                  ? 'border-warning/50 bg-warning/10 text-text-primary'
                  : 'border-success/40 bg-success/10 text-text-primary'
              }`}
            >
              {result.total_redundant_vectors > 0 ? (
                <AlertTriangle className="text-warning mt-0.5 h-5 w-5 shrink-0" />
              ) : (
                <CheckCircle2 className="text-success mt-0.5 h-5 w-5 shrink-0" />
              )}
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <span className="font-sans font-semibold">
                    {result.total_redundant_vectors > 0
                      ? `${result.groups.length} Duplicate Groups Identified`
                      : 'Zero Duplicate Vectors Detected'}
                  </span>
                  <Badge
                    variant={result.total_redundant_vectors > 0 ? 'warning' : 'success'}
                    size="xs"
                  >
                    {result.total_redundant_vectors > 0
                      ? `${result.total_redundant_vectors} Redundant`
                      : 'Clean Index'}
                  </Badge>
                </div>
                <p className="text-text-secondary leading-relaxed">
                  {result.interpretation}
                </p>
              </div>
            </div>

            {/* Duplicate Groups List */}
            <Panel>
              <PanelHeader
                title={`Duplicate Groups (${result.groups.length})`}
                description="Clusters of identical or near-identical embeddings. Expand each group to compare member similarities, norms, and documents."
                actions={
                  <div className="flex items-center gap-2">
                    <Button
                      variant="ghost"
                      size="xs"
                      onClick={() =>
                        setExpandedGroups(
                          expandedGroups.size === result.groups.length
                            ? new Set()
                            : new Set(result.groups.map((g) => g.group_id)),
                        )
                      }
                    >
                      {expandedGroups.size === result.groups.length
                        ? 'Collapse All'
                        : 'Expand All'}
                    </Button>
                  </div>
                }
              />
              <PanelBody className="space-y-3 p-3">
                {result.groups.length === 0 ? (
                  <div className="py-8 text-center text-text-muted text-[13px]">
                    No duplicate or near-duplicate vectors discovered at threshold ≥ {threshold.toFixed(2)}.
                  </div>
                ) : (
                  result.groups.map((group, idx) => {
                    const isExpanded = expandedGroups.has(group.group_id);

                    return (
                      <div
                        key={group.group_id}
                        className="border-border bg-surface-subtle/30 overflow-hidden rounded-md border text-[12px] transition-colors"
                      >
                        {/* Group Header */}
                        <div
                          onClick={() => toggleGroup(group.group_id)}
                          className="hover:bg-surface-subtle flex cursor-pointer items-center justify-between p-3 select-none"
                        >
                          <div className="flex items-center gap-2.5">
                            {isExpanded ? (
                              <ChevronDown className="text-text-muted h-4 w-4 shrink-0" />
                            ) : (
                              <ChevronRight className="text-text-muted h-4 w-4 shrink-0" />
                            )}
                            <span className="font-sans font-semibold text-foreground">
                              Duplicate Group #{idx + 1}
                            </span>
                            <Badge
                              variant={group.is_exact ? 'success' : 'warning'}
                              size="xs"
                              mono
                            >
                              {group.is_exact ? 'Exact Match' : 'Near Duplicate'}
                            </Badge>
                          </div>

                          <div className="flex items-center gap-3 font-mono text-[11.5px]">
                            <span className="text-text-muted">
                              Min Similarity: <strong className="text-foreground">{group.min_similarity.toFixed(4)}</strong>
                            </span>
                            <span className="bg-border h-3 w-px" />
                            <span className="text-text-secondary">
                              <strong className="text-accent">{group.member_count}</strong> vectors ({group.member_count - 1} redundant)
                            </span>
                          </div>
                        </div>

                        {/* Expanded Members Table */}
                        {isExpanded && (
                          <div className="border-border/70 border-t bg-surface p-3 space-y-2">
                            <div className="overflow-x-auto">
                              <table className="w-full text-left text-[11.5px]">
                                <thead>
                                  <tr className="border-border bg-surface-subtle/60 text-text-muted border-b font-mono text-[10px] uppercase">
                                    <th className="px-3 py-1.5 font-medium">Role</th>
                                    <th className="px-3 py-1.5 font-medium">Vector ID</th>
                                    <th className="px-3 py-1.5 font-medium">Similarity to Primary</th>
                                    <th className="px-3 py-1.5 font-medium">Norm</th>
                                    <th className="px-3 py-1.5 font-medium">Document Preview</th>
                                  </tr>
                                </thead>
                                <tbody className="divide-border divide-y">
                                  {group.members.map((member, mIdx) => (
                                    <tr key={member.id} className="hover:bg-surface-subtle">
                                      <td className="px-3 py-2">
                                        <Badge
                                          variant={mIdx === 0 ? 'accent' : 'neutral'}
                                          size="xs"
                                        >
                                          {mIdx === 0 ? 'Primary' : 'Duplicate'}
                                        </Badge>
                                      </td>
                                      <td className="px-3 py-2 font-mono font-medium text-foreground max-w-[140px] truncate">
                                        <div className="flex items-center gap-1.5">
                                          <span>{member.id}</span>
                                          <CopyButton text={member.id} size="sm" label="Copy ID" />
                                        </div>
                                      </td>
                                      <td className="px-3 py-2 font-mono font-semibold text-foreground">
                                        {member.similarity_to_primary.toFixed(4)}
                                      </td>
                                      <td className="px-3 py-2 font-mono text-text-muted">
                                        {member.norm.toFixed(3)}
                                      </td>
                                      <td className="px-3 py-2 text-text-secondary max-w-[280px] truncate font-sans">
                                        {member.document || '—'}
                                      </td>
                                    </tr>
                                  ))}
                                </tbody>
                              </table>
                            </div>
                          </div>
                        )}
                      </div>
                    );
                  })
                )}
              </PanelBody>
            </Panel>

            {/* Methodological Notice */}
            <div className="border-border bg-surface-subtle/50 text-text-secondary flex items-start gap-2.5 rounded-md border p-3.5 text-[12px]">
              <Info className="text-accent mt-0.5 h-4 w-4 shrink-0" />
              <div className="space-y-1">
                <span className="text-foreground font-sans font-medium">
                  Vector DB Redundancy Diagnostics
                </span>
                <p className="leading-relaxed">
                  Near-duplicate embeddings directly waste vector database index memory and degrade search diversity by returning multiple copies of the same record in top-K results. In high-dimensional spaces, vectors with similarity $\ge 0.98$ represent near-identical semantic content.
                </p>
                <div className="text-text-muted mt-2 flex items-center justify-between font-mono text-[11px]">
                  <span>Candidate Generation: Sub-quadratic kNN graph</span>
                  <span>Execution: {data.execution_time_ms.toFixed(1)}ms</span>
                </div>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
};

export default DuplicatesPanel;
