from __future__ import annotations

import logging
from typing import Any

import numpy as np
from chromadb.api.models.Collection import Collection
from sklearn.neighbors import NearestNeighbors

from chromolite.analysis.extractor import ExtractedVectorBatch
from chromolite.analysis.models import (
    DistributionStats,
    SimilarityDistributionResult,
)
from chromolite.analysis.statistics import (
    compute_distribution_stats,
    compute_histogram,
)

logger = logging.getLogger(__name__)


def compute_pairwise_cosine_similarities(
    normalized_embeddings: np.ndarray,
    pair_sample_count: int = 50000,
    random_seed: int = 42,
) -> np.ndarray:
    """
    Efficiently compute pairwise cosine similarities on sampled pairs.

    Time complexity: O(M * D) where M = pair_sample_count, completely avoiding O(N^2).
    """
    n = normalized_embeddings.shape[0]
    if n < 2:
        return np.array([], dtype=np.float32)

    total_possible_pairs = n * (n - 1) // 2

    if total_possible_pairs <= pair_sample_count:
        # Compute exact all-pairs dot product
        # Upper triangle without diagonal
        triu_indices = np.triu_indices(n, k=1)
        sims = np.sum(
            normalized_embeddings[triu_indices[0]] * normalized_embeddings[triu_indices[1]],
            axis=1,
        )
        return np.clip(sims, -1.0, 1.0)

    # Subsample M random pairs without replacement
    rng = np.random.default_rng(random_seed)
    m = min(pair_sample_count, total_possible_pairs)

    # Generate random index pairs where i != j
    i_indices = rng.integers(0, n, size=m, dtype=np.int32)
    j_indices = rng.integers(0, n - 1, size=m, dtype=np.int32)
    # Ensure j != i
    j_indices = np.where(j_indices >= i_indices, j_indices + 1, j_indices)

    # Vectorized pairwise dot product
    sims = np.sum(
        normalized_embeddings[i_indices] * normalized_embeddings[j_indices],
        axis=1,
    )
    return np.clip(sims, -1.0, 1.0)


def compute_nearest_neighbor_similarities(
    embeddings: np.ndarray,
    distance_metric: str = "cosine",
    max_probe_vectors: int = 5000,
    random_seed: int = 42,
) -> np.ndarray:
    """
    Compute 1-nearest neighbor similarity distribution for collection probes.
    """
    n = embeddings.shape[0]
    if n < 2:
        return np.array([], dtype=np.float32)

    sklearn_metric = "cosine" if distance_metric == "cosine" else "euclidean"

    # Fit kNN index on vectors
    nn = NearestNeighbors(n_neighbors=2, metric=sklearn_metric, algorithm="auto")
    nn.fit(embeddings)

    if n > max_probe_vectors:
        rng = np.random.default_rng(random_seed)
        probe_indices = rng.choice(n, size=max_probe_vectors, replace=False)
        probes = embeddings[probe_indices]
    else:
        probes = embeddings

    distances, _ = nn.kneighbors(probes, n_neighbors=2)
    # distances[:, 1] is the distance to the nearest distinct neighbor
    nn_distances = distances[:, 1]

    if distance_metric == "cosine":
        # Cosine distance to similarity: 1 - dist
        nn_similarities = 1.0 - nn_distances
        return np.clip(nn_similarities, -1.0, 1.0)

    # For Euclidean space, return negative distance as relative similarity
    return -nn_distances


def compute_similarity_distribution(
    collection: Collection,
    batch: ExtractedVectorBatch,
    parameters: dict[str, Any] | None = None,
) -> SimilarityDistributionResult:
    """
    Compute global pairwise and local 1-NN similarity distributions per Phase 2.
    """
    if parameters is None:
        parameters = {}

    pair_sample_count = int(parameters.get("pair_sample_count", 50000))
    random_seed = int(parameters.get("random_seed", 42))
    distance_metric = batch.distance_metric

    n = batch.sample_size
    if n < 2:
        empty_stats = compute_distribution_stats(np.array([]))
        empty_hist = compute_histogram(np.array([]))
        return SimilarityDistributionResult(
            distance_metric=distance_metric,
            pair_sample_count=0,
            pairwise_similarity=empty_stats,
            similarity_histogram=empty_hist,
            mean_pairwise_similarity=0.0,
            is_potentially_anisotropic=False,
            anisotropy_interpretation="Collection requires at least 2 vectors to compute pairwise similarity.",
            nearest_neighbor_similarity=None,
        )

    # Normalize vectors for cosine similarity computation
    norms = np.linalg.norm(batch.valid_embeddings, axis=1, keepdims=True)
    # Numerical safety for zero division
    norms = np.where(norms == 0, 1.0, norms)
    normalized_embeddings = (batch.valid_embeddings / norms).astype(np.float32)

    pairwise_sims = compute_pairwise_cosine_similarities(
        normalized_embeddings,
        pair_sample_count=pair_sample_count,
        random_seed=random_seed,
    )

    pairwise_stats = compute_distribution_stats(pairwise_sims)
    pairwise_hist = compute_histogram(pairwise_sims, num_bins=30)

    mean_sim = pairwise_stats.mean
    is_anisotropic = (distance_metric == "cosine") and (mean_sim > 0.70)

    if is_anisotropic:
        interpretation = (
            f"High mean pairwise cosine similarity ({mean_sim:.3f} > 0.70) indicates potential "
            "embedding space anisotropy (cone effect). Vectors occupy a narrow directional sub-space. "
            "Evaluate retrieval quality and consider mean-centering or whitening if discrimination is low."
        )
    else:
        interpretation = (
            f"Mean pairwise cosine similarity is {mean_sim:.3f}. The distribution demonstrates normal "
            "angular spread across the embedding manifold."
        )

    # 1-NN similarity
    nn_sims = compute_nearest_neighbor_similarities(
        batch.valid_embeddings,
        distance_metric=distance_metric,
        random_seed=random_seed,
    )
    nn_stats: DistributionStats | None = None
    if nn_sims.size > 0:
        nn_stats = compute_distribution_stats(nn_sims)

    return SimilarityDistributionResult(
        distance_metric=distance_metric,
        pair_sample_count=int(pairwise_sims.size),
        pairwise_similarity=pairwise_stats,
        similarity_histogram=pairwise_hist,
        mean_pairwise_similarity=mean_sim,
        is_potentially_anisotropic=is_anisotropic,
        anisotropy_interpretation=interpretation,
        nearest_neighbor_similarity=nn_stats,
    )
