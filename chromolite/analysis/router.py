from __future__ import annotations

from fastapi import APIRouter, HTTPException, Query

from chromolite.analysis.models import (
    AnalysisResponse,
    CollectionHealthResult,
    CollectionSummary,
    KnnDensityResult,
    MetricDefinition,
    NeighborInfo,
    OutlierDetectionResult,
    ProjectionResult,
    SamplingConfig,
    SimilarityDistributionResult,
)
from chromolite.analysis.service import analysis_service

router = APIRouter(prefix="/analysis", tags=["Analysis"])


@router.get("/metrics", response_model=list[MetricDefinition])
def list_metrics():
    """Return all registered analytical metrics with mathematical definitions and documentation."""
    return list(analysis_service.registry.values())


@router.get("/{collection_name}/summary", response_model=CollectionSummary)
def get_collection_summary(collection_name: str):
    """Return collection high-level schema, dimensionality, index configuration, and metadata fields."""
    try:
        return analysis_service.get_collection_summary(collection_name)
    except (RuntimeError, ValueError, KeyError) as exc:
        raise HTTPException(
            status_code=404,
            detail=f"Failed to load collection summary for '{collection_name}': {exc}",
        ) from exc


@router.get(
    "/{collection_name}/health",
    response_model=AnalysisResponse[CollectionHealthResult],
)
def get_collection_health(
    collection_name: str,
    max_samples: int = Query(10000, ge=10, le=200000),
    random_seed: int = Query(42),
):
    """Compute vector norm statistics, unit-normalization status, and collection health indicators."""
    try:
        sampling = SamplingConfig(max_samples=max_samples, random_seed=random_seed)
        return analysis_service.get_collection_health(
            collection_name=collection_name,
            sampling=sampling,
        )
    except Exception as exc:
        raise HTTPException(
            status_code=500,
            detail=f"Failed to compute health for '{collection_name}': {exc}",
        ) from exc


@router.get(
    "/{collection_name}/similarity",
    response_model=AnalysisResponse[SimilarityDistributionResult],
)
def get_similarity_distribution(
    collection_name: str,
    pair_sample_count: int = Query(50000, ge=100, le=500000),
    max_samples: int = Query(10000, ge=10, le=100000),
    random_seed: int = Query(42),
):
    """Compute pairwise similarity distribution, anisotropy diagnostics, and 1-NN similarity."""
    try:
        sampling = SamplingConfig(max_samples=max_samples, random_seed=random_seed)
        parameters = {
            "pair_sample_count": pair_sample_count,
            "random_seed": random_seed,
        }
        return analysis_service.get_similarity_distribution(
            collection_name=collection_name,
            parameters=parameters,
            sampling=sampling,
        )
    except Exception as exc:
        raise HTTPException(
            status_code=500,
            detail=f"Failed to compute similarity distribution for '{collection_name}': {exc}",
        ) from exc


@router.get(
    "/{collection_name}/projection",
    response_model=AnalysisResponse[ProjectionResult],
)
def get_projection(
    collection_name: str,
    algorithm: str = Query("pca", pattern="^(pca|umap|tsne)$"),
    max_samples: int = Query(5000, ge=10, le=50000),
    n_neighbors: int = Query(15, ge=2, le=100),
    perplexity: float = Query(30.0, ge=2.0, le=100.0),
    random_seed: int = Query(42),
):
    """Compute 2D embedding space projection using PCA (deterministic baseline), UMAP, or t-SNE."""
    try:
        sampling = SamplingConfig(max_samples=max_samples, random_seed=random_seed)
        parameters = {
            "algorithm": algorithm,
            "n_neighbors": n_neighbors,
            "perplexity": perplexity,
            "random_seed": random_seed,
        }
        return analysis_service.get_projection(
            collection_name=collection_name,
            parameters=parameters,
            sampling=sampling,
        )
    except Exception as exc:
        raise HTTPException(
            status_code=500,
            detail=f"Failed to compute 2D {algorithm.upper()} projection for '{collection_name}': {exc}",
        ) from exc


@router.get(
    "/{collection_name}/knn",
    response_model=AnalysisResponse[KnnDensityResult],
)
def get_knn_density(
    collection_name: str,
    k: int = Query(15, ge=1, le=100),
    max_samples: int = Query(10000, ge=10, le=50000),
    random_seed: int = Query(42),
):
    """Compute original high-dimensional kNN distances and relative local density scores."""
    try:
        sampling = SamplingConfig(max_samples=max_samples, random_seed=random_seed)
        return analysis_service.get_knn_density(
            collection_name=collection_name,
            k=k,
            sampling=sampling,
        )
    except Exception as exc:
        raise HTTPException(
            status_code=500,
            detail=f"Failed to compute kNN density for '{collection_name}': {exc}",
        ) from exc


@router.get(
    "/{collection_name}/vectors/{vector_id}/neighbors",
    response_model=list[NeighborInfo],
)
def get_vector_neighbors(
    collection_name: str,
    vector_id: str,
    k: int = Query(15, ge=1, le=100),
):
    """Retrieve top-K nearest neighbors in original embedding space for a specific vector."""
    try:
        return analysis_service.get_vector_neighbors(
            collection_name=collection_name,
            vector_id=vector_id,
            k=k,
        )
    except Exception as exc:
        raise HTTPException(
            status_code=500,
            detail=f"Failed to load neighbors for vector '{vector_id}': {exc}",
        ) from exc


@router.get(
    "/{collection_name}/outliers",
    response_model=AnalysisResponse[OutlierDetectionResult],
)
def get_outliers(
    collection_name: str,
    method: str = Query("knn_distance", pattern="^(knn_distance|lof)$"),
    threshold_quantile: float = Query(0.01, ge=0.001, le=0.20),
    k: int = Query(15, ge=2, le=100),
    max_samples: int = Query(10000, ge=10, le=50000),
    random_seed: int = Query(42),
):
    """Identify unusually isolated vectors relative to local neighborhoods via kNN distance or LOF."""
    try:
        sampling = SamplingConfig(max_samples=max_samples, random_seed=random_seed)
        return analysis_service.get_outliers(
            collection_name=collection_name,
            method=method,
            threshold_quantile=threshold_quantile,
            k=k,
            sampling=sampling,
        )
    except Exception as exc:
        raise HTTPException(
            status_code=500,
            detail=f"Failed to detect outliers for '{collection_name}': {exc}",
        ) from exc


@router.post("/{collection_name}/cache/clear")
def clear_collection_cache(collection_name: str):
    """Invalidate cached analytical computations for this collection."""
    try:
        collection = analysis_service.get_collection(collection_name)
        analysis_service.cache.invalidate_collection(str(collection.id))
        return {"status": "success", "message": f"Cache cleared for '{collection_name}'."}
    except (RuntimeError, ValueError, KeyError) as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc
