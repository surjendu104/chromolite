from __future__ import annotations

from fastapi import APIRouter, HTTPException, Query

from chromolite.analysis.models import (
    AnalysisResponse,
    CollectionHealthResult,
    CollectionSummary,
    MetricDefinition,
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


@router.post("/{collection_name}/cache/clear")
def clear_collection_cache(collection_name: str):
    """Invalidate cached analytical computations for this collection."""
    try:
        collection = analysis_service.get_collection(collection_name)
        analysis_service.cache.invalidate_collection(str(collection.id))
        return {"status": "success", "message": f"Cache cleared for '{collection_name}'."}
    except (RuntimeError, ValueError, KeyError) as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc
