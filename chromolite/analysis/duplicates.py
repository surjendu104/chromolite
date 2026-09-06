from __future__ import annotations

import hashlib
import logging
from collections import defaultdict
from typing import Any

import numpy as np
from chromadb.api.models.Collection import Collection
from sklearn.neighbors import NearestNeighbors

from chromolite.analysis.extractor import ExtractedVectorBatch
from chromolite.analysis.models import (
    DuplicateDetectionResult,
    DuplicateGroup,
    DuplicateMember,
)

logger = logging.getLogger(__name__)


def find_exact_duplicate_groups(
    batch: ExtractedVectorBatch,
    normalized_embeddings: np.ndarray,
) -> tuple[list[list[int]], set[int]]:
    """
    Detect exact byte-level duplicate vectors via SHA-256 hash buckets.
    """
    hash_buckets: dict[str, list[int]] = defaultdict(list)

    # Round to 6 decimal places for numerical floating point stability
    rounded = np.round(normalized_embeddings, decimals=6)

    for i in range(len(batch.valid_ids)):
        h = hashlib.sha256(rounded[i].tobytes()).hexdigest()
        hash_buckets[h].append(i)

    exact_groups: list[list[int]] = []
    exact_indices: set[int] = set()

    for indices in hash_buckets.values():
        if len(indices) > 1:
            exact_groups.append(indices)
            exact_indices.update(indices)

    return exact_groups, exact_indices


def find_near_duplicate_groups(
    batch: ExtractedVectorBatch,
    normalized_embeddings: np.ndarray,
    threshold: float = 0.98,
    candidate_k: int = 25,
) -> list[DuplicateGroup]:
    """
    Detect near-duplicate vector clusters using kNN candidate generation + exact cosine verification.
    """
    n = len(batch.valid_ids)
    if n < 2:
        return []

    # 1. First find exact duplicates
    exact_indices_groups, _ = find_exact_duplicate_groups(batch, normalized_embeddings)

    # 2. Candidate generation for near duplicates using kNN
    k = min(candidate_k, n - 1)
    nn = NearestNeighbors(n_neighbors=k + 1, metric="cosine", algorithm="auto")
    nn.fit(normalized_embeddings)

    distances, indices = nn.kneighbors(normalized_embeddings, n_neighbors=k + 1)

    # Adjacency list for connected components
    adj: dict[int, set[int]] = defaultdict(set)

    # Connect exact groups
    for g in exact_indices_groups:
        for i in range(len(g)):
            for j in range(i + 1, len(g)):
                adj[g[i]].add(g[j])
                adj[g[j]].add(g[i])

    # Connect near duplicate pairs above threshold
    for i in range(n):
        for dist, neighbor_idx in zip(distances[i, 1:], indices[i, 1:]):
            sim = 1.0 - float(dist)
            if sim >= threshold:
                adj[i].add(neighbor_idx)
                adj[neighbor_idx].add(i)

    # Connected components traversal
    visited = set()
    duplicate_groups: list[DuplicateGroup] = []
    group_counter = 1

    norms = np.linalg.norm(batch.valid_embeddings, axis=1)

    for i in range(n):
        if i not in visited and i in adj and len(adj[i]) > 0:
            component = []
            queue = [i]
            visited.add(i)

            while queue:
                curr = queue.pop(0)
                component.append(curr)
                for neighbor in adj[curr]:
                    if neighbor not in visited:
                        visited.add(neighbor)
                        queue.append(neighbor)

            if len(component) > 1:
                # Primary vector is the first component member
                primary_idx = component[0]
                primary_emb = normalized_embeddings[primary_idx]

                members: list[DuplicateMember] = []
                min_sim = 1.0
                is_all_exact = True

                for member_idx in component:
                    sim = float(np.dot(primary_emb, normalized_embeddings[member_idx]))
                    sim = max(-1.0, min(1.0, sim))
                    min_sim = min(min_sim, sim)
                    if sim < 0.99999:
                        is_all_exact = False

                    members.append(
                        DuplicateMember(
                            id=batch.valid_ids[member_idx],
                            similarity_to_primary=sim,
                            document=batch.valid_documents[member_idx],
                            metadata=batch.valid_metadatas[member_idx],
                            norm=float(norms[member_idx]),
                        )
                    )

                # Sort members: primary first (sim=1.0), then by descending similarity
                members.sort(key=lambda m: m.similarity_to_primary, reverse=True)

                duplicate_groups.append(
                    DuplicateGroup(
                        group_id=f"group_{group_counter}",
                        is_exact=is_all_exact,
                        min_similarity=float(min_sim),
                        member_count=len(members),
                        members=members,
                    )
                )
                group_counter += 1

    # Sort groups by member count descending
    duplicate_groups.sort(key=lambda g: g.member_count, reverse=True)
    return duplicate_groups


def compute_duplicates(
    collection: Collection,
    batch: ExtractedVectorBatch,
    parameters: dict[str, Any] | None = None,
) -> DuplicateDetectionResult:
    """
    Compute exact and near-duplicate vector clusters per Phase 7.
    """
    if parameters is None:
        parameters = {}

    threshold = float(parameters.get("threshold", 0.98))
    threshold = min(max(0.85, threshold), 0.999)

    n = batch.sample_size
    if n < 2:
        return DuplicateDetectionResult(
            threshold=threshold,
            exact_duplicate_count=0,
            exact_group_count=0,
            near_duplicate_count=0,
            near_group_count=0,
            total_redundant_vectors=0,
            redundancy_rate=0.0,
            groups=[],
            interpretation="Collection requires at least 2 vectors to detect duplicate embeddings.",
        )

    # Normalize vectors for cosine similarity
    norms = np.linalg.norm(batch.valid_embeddings, axis=1, keepdims=True)
    norms = np.where(norms == 0, 1.0, norms)
    normalized_embeddings = (batch.valid_embeddings / norms).astype(np.float32)

    groups = find_near_duplicate_groups(
        batch,
        normalized_embeddings,
        threshold=threshold,
        candidate_k=int(parameters.get("candidate_k", 25)),
    )

    exact_groups = [g for g in groups if g.is_exact]
    near_groups = [g for g in groups if not g.is_exact]

    # Redundant vectors = total members in groups minus the 1 representative per group
    total_in_groups = sum(g.member_count for g in groups)
    total_redundant = sum(g.member_count - 1 for g in groups)

    exact_redundant = sum(g.member_count - 1 for g in exact_groups)
    near_redundant = sum(g.member_count - 1 for g in near_groups)

    redundancy_rate = float(total_redundant / n) if n > 0 else 0.0

    interpretation = (
        f"Evaluated {n:,} vectors at cosine similarity threshold ≥ {threshold:.2f}. "
        f"Identified {len(groups)} duplicate groups containing {total_in_groups} total vectors "
        f"({total_redundant} redundant embeddings, {redundancy_rate * 100:.2f}% of collection). "
        f"{len(exact_groups)} groups represent exact byte duplicates, while {len(near_groups)} groups "
        f"represent near-duplicate semantic overlaps."
    )

    return DuplicateDetectionResult(
        threshold=threshold,
        exact_duplicate_count=exact_redundant,
        exact_group_count=len(exact_groups),
        near_duplicate_count=near_redundant,
        near_group_count=len(near_groups),
        total_redundant_vectors=total_redundant,
        redundancy_rate=redundancy_rate,
        groups=groups,
        interpretation=interpretation,
    )
