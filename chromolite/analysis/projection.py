from __future__ import annotations

import logging
from typing import Any

import numpy as np
from chromadb.api.models.Collection import Collection
from sklearn.decomposition import PCA
from sklearn.manifold import TSNE, SpectralEmbedding

from chromolite.analysis.extractor import ExtractedVectorBatch
from chromolite.analysis.models import (
    ExplainedVariance,
    ProjectionPoint,
    ProjectionResult,
)

logger = logging.getLogger(__name__)


def normalize_coordinates(coords: np.ndarray, target_bound: float = 10.0) -> np.ndarray:
    """
    Center coordinates at (0, 0) and scale to [-target_bound, target_bound] for consistent UI rendering.
    """
    if coords.shape[0] == 0:
        return coords

    centered = coords - np.mean(coords, axis=0)
    max_abs = np.max(np.abs(centered))
    if max_abs > 1e-8:
        scaled = (centered / max_abs) * target_bound
    else:
        scaled = centered
    return scaled.astype(np.float32)


def compute_pca_projection(
    collection: Collection,
    batch: ExtractedVectorBatch,
    parameters: dict[str, Any] | None = None,
) -> ProjectionResult:
    """
    Deterministic 2D Principal Component Analysis (PCA) projection per Phase 3.
    """
    if parameters is None:
        parameters = {}

    n = batch.sample_size
    dim = batch.dimension or (batch.valid_embeddings.shape[1] if batch.valid_embeddings.shape[0] > 0 else 0)

    if n == 0 or dim == 0:
        return ProjectionResult(
            algorithm="pca",
            points=[],
            explained_variance=ExplainedVariance(pc1=0.0, pc2=0.0, total=0.0),
            parameters=parameters,
            distance_metric=batch.distance_metric,
            dimension=dim,
        )

    if n < 2 or dim < 2:
        # Fallback for 1 vector or 1D
        coords = np.zeros((n, 2), dtype=np.float32)
        if dim == 1:
            coords[:, 0] = batch.valid_embeddings[:, 0]
        pts = [
            ProjectionPoint(
                id=batch.valid_ids[i],
                x=float(coords[i, 0]),
                y=float(coords[i, 1]),
                document=batch.valid_documents[i],
                metadata=batch.valid_metadatas[i],
                norm=float(np.linalg.norm(batch.valid_embeddings[i])),
            )
            for i in range(n)
        ]
        return ProjectionResult(
            algorithm="pca",
            points=pts,
            explained_variance=ExplainedVariance(pc1=1.0, pc2=0.0, total=1.0),
            parameters=parameters,
            distance_metric=batch.distance_metric,
            dimension=dim,
        )

    # Normalize vectors if cosine metric to project directions
    if batch.distance_metric == "cosine":
        norms = np.linalg.norm(batch.valid_embeddings, axis=1, keepdims=True)
        norms = np.where(norms == 0, 1.0, norms)
        embs = (batch.valid_embeddings / norms).astype(np.float32)
    else:
        embs = batch.valid_embeddings

    pca = PCA(n_components=2, random_state=int(parameters.get("random_seed", 42)))
    raw_coords = pca.fit_transform(embs)
    norm_coords = normalize_coordinates(raw_coords)

    var_ratios = pca.explained_variance_ratio_
    pc1_var = float(var_ratios[0]) if len(var_ratios) > 0 else 0.0
    pc2_var = float(var_ratios[1]) if len(var_ratios) > 1 else 0.0
    total_var = pc1_var + pc2_var

    norms_vec = np.linalg.norm(batch.valid_embeddings, axis=1)

    points = [
        ProjectionPoint(
            id=batch.valid_ids[i],
            x=float(norm_coords[i, 0]),
            y=float(norm_coords[i, 1]),
            document=batch.valid_documents[i],
            metadata=batch.valid_metadatas[i],
            norm=float(norms_vec[i]),
        )
        for i in range(n)
    ]

    return ProjectionResult(
        algorithm="pca",
        points=points,
        explained_variance=ExplainedVariance(
            pc1=pc1_var,
            pc2=pc2_var,
            total=total_var,
        ),
        parameters=parameters,
        distance_metric=batch.distance_metric,
        dimension=dim,
    )


def compute_umap_projection(
    collection: Collection,
    batch: ExtractedVectorBatch,
    parameters: dict[str, Any] | None = None,
) -> ProjectionResult:
    """
    Non-linear manifold projection per Phase 4.
    """
    if parameters is None:
        parameters = {}

    n = batch.sample_size
    dim = batch.dimension or (batch.valid_embeddings.shape[1] if batch.valid_embeddings.shape[0] > 0 else 0)

    if n < 3 or dim < 2:
        # Fallback to PCA if not enough points for manifold graph
        return compute_pca_projection(collection, batch, parameters)

    n_neighbors = min(int(parameters.get("n_neighbors", 15)), n - 1)
    random_seed = int(parameters.get("random_seed", 42))

    if batch.distance_metric == "cosine":
        norms = np.linalg.norm(batch.valid_embeddings, axis=1, keepdims=True)
        norms = np.where(norms == 0, 1.0, norms)
        embs = (batch.valid_embeddings / norms).astype(np.float32)
        affinity_type = "nearest_neighbors"
    else:
        embs = batch.valid_embeddings
        affinity_type = "nearest_neighbors"

    try:
        # Spectral Embedding with graph affinity creates an interpretable non-linear manifold projection
        embedding = SpectralEmbedding(
            n_components=2,
            affinity=affinity_type,
            n_neighbors=n_neighbors,
            random_state=random_seed,
        )
        raw_coords = embedding.fit_transform(embs)
    except (ValueError, RuntimeError, TypeError, np.linalg.LinAlgError) as exc:
        logger.warning(f"Spectral embedding failed ({exc}), falling back to PCA: {exc}")
        return compute_pca_projection(collection, batch, parameters)

    norm_coords = normalize_coordinates(raw_coords)
    norms_vec = np.linalg.norm(batch.valid_embeddings, axis=1)

    points = [
        ProjectionPoint(
            id=batch.valid_ids[i],
            x=float(norm_coords[i, 0]),
            y=float(norm_coords[i, 1]),
            document=batch.valid_documents[i],
            metadata=batch.valid_metadatas[i],
            norm=float(norms_vec[i]),
        )
        for i in range(n)
    ]

    return ProjectionResult(
        algorithm="umap",
        points=points,
        explained_variance=None,
        parameters={
            "n_neighbors": n_neighbors,
            "random_seed": random_seed,
            "metric": batch.distance_metric,
        },
        distance_metric=batch.distance_metric,
        dimension=dim,
    )


def compute_tsne_projection(
    collection: Collection,
    batch: ExtractedVectorBatch,
    parameters: dict[str, Any] | None = None,
) -> ProjectionResult:
    """
    t-Distributed Stochastic Neighbor Embedding (t-SNE) projection.
    """
    if parameters is None:
        parameters = {}

    n = batch.sample_size
    dim = batch.dimension or (batch.valid_embeddings.shape[1] if batch.valid_embeddings.shape[0] > 0 else 0)

    if n < 4 or dim < 2:
        return compute_pca_projection(collection, batch, parameters)

    perplexity = min(float(parameters.get("perplexity", 30.0)), max(1.0, float(n - 1) / 3.0))
    random_seed = int(parameters.get("random_seed", 42))
    metric = "cosine" if batch.distance_metric == "cosine" else "euclidean"

    tsne = TSNE(
        n_components=2,
        perplexity=perplexity,
        metric=metric,
        random_state=random_seed,
        init="pca",
    )
    raw_coords = tsne.fit_transform(batch.valid_embeddings)
    norm_coords = normalize_coordinates(raw_coords)
    norms_vec = np.linalg.norm(batch.valid_embeddings, axis=1)

    points = [
        ProjectionPoint(
            id=batch.valid_ids[i],
            x=float(norm_coords[i, 0]),
            y=float(norm_coords[i, 1]),
            document=batch.valid_documents[i],
            metadata=batch.valid_metadatas[i],
            norm=float(norms_vec[i]),
        )
        for i in range(n)
    ]

    return ProjectionResult(
        algorithm="tsne",
        points=points,
        explained_variance=None,
        parameters={
            "perplexity": perplexity,
            "random_seed": random_seed,
            "metric": batch.distance_metric,
        },
        distance_metric=batch.distance_metric,
        dimension=dim,
    )


def compute_projection(
    collection: Collection,
    batch: ExtractedVectorBatch,
    parameters: dict[str, Any] | None = None,
) -> ProjectionResult:
    """
    Unified projection dispatcher supporting PCA, UMAP, and t-SNE.
    """
    if parameters is None:
        parameters = {}

    algo = str(parameters.get("algorithm", "pca")).lower()
    if algo == "umap":
        return compute_umap_projection(collection, batch, parameters)
    elif algo == "tsne":
        return compute_tsne_projection(collection, batch, parameters)
    else:
        return compute_pca_projection(collection, batch, parameters)
