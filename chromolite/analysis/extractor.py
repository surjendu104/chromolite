from __future__ import annotations

import logging
import time
from dataclasses import dataclass, field
from typing import Any

import numpy as np
from chromadb.api.models.Collection import Collection

from chromolite.analysis.models import (
    CollectionSummary,
    IndexInformation,
    MetadataFieldSummary,
    SamplingConfig,
)

logger = logging.getLogger(__name__)


@dataclass
class ExtractedVectorBatch:
    """In-memory safe representation of vector batch retrieved from ChromaDB."""

    ids: list[str]
    embeddings: np.ndarray  # Shape (N, D), float32
    documents: list[str | None]
    metadatas: list[dict[str, Any] | None]
    valid_mask: np.ndarray  # Boolean array of shape (N,)
    valid_ids: list[str]
    valid_embeddings: np.ndarray  # Shape (M, D) where M <= N
    valid_documents: list[str | None]
    valid_metadatas: list[dict[str, Any] | None]
    invalid_reasons: dict[str, str] = field(default_factory=dict)
    total_in_collection: int = 0
    sampled: bool = False
    sample_size: int = 0
    dimension: int | None = None
    distance_metric: str = "cosine"
    extraction_time_ms: float = 0.0


def normalize_distance_metric(space_str: str | None) -> str:
    """Normalize ChromaDB space parameter to standard metric name."""
    if not space_str:
        return "cosine"
    space = space_str.strip().lower()
    if space in ("cosine", "cos"):
        return "cosine"
    if space in ("l2", "euclidean", "sqeuclidean"):
        return "l2"
    if space in ("ip", "inner_product", "dot", "dot_product"):
        return "ip"
    return space


def get_collection_index_info(collection: Collection) -> IndexInformation:
    """Extract index and distance metric configuration from Chroma collection."""
    raw_config: dict[str, Any] = {}
    space = "cosine"
    ef_c = None
    ef_s = None
    m_val = None
    resize = None
    sync = None

    try:
        if hasattr(collection, "configuration") and collection.configuration:
            config_dict = (
                collection.configuration
                if isinstance(collection.configuration, dict)
                else {}
            )
            raw_config.update(config_dict)
            hnsw_conf = config_dict.get("hnsw", {})
            if isinstance(hnsw_conf, dict):
                space = hnsw_conf.get("space", space)
                ef_c = hnsw_conf.get("ef_construction")
                ef_s = hnsw_conf.get("ef_search")
                m_val = hnsw_conf.get("max_neighbors")
                resize = hnsw_conf.get("resize_factor")
                sync = hnsw_conf.get("sync_threshold")
    except (AttributeError, TypeError, ValueError) as exc:
        logger.debug(f"Could not read collection configuration: {exc}")

    if hasattr(collection, "metadata") and collection.metadata:
        raw_config.setdefault("metadata", collection.metadata)
        if "hnsw:space" in collection.metadata:
            space = str(collection.metadata["hnsw:space"])

    space = normalize_distance_metric(space)

    return IndexInformation(
        space=space,
        ef_construction=ef_c,
        ef_search=ef_s,
        max_neighbors=m_val,
        resize_factor=resize,
        sync_threshold=sync,
        raw_configuration=raw_config,
    )


def summarize_collection_metadata(
    metadatas: list[dict[str, Any] | None],
) -> list[MetadataFieldSummary]:
    """Inspect metadata records across extracted vectors and summarize types and cardinalities."""
    fields_map: dict[str, dict[str, Any]] = {}

    for meta in metadatas:
        if not meta:
            continue
        for k, v in meta.items():
            if k not in fields_map:
                fields_map[k] = {
                    "types": set(),
                    "values": set(),
                    "null_count": 0,
                    "sample_values": [],
                }
            if v is None:
                fields_map[k]["null_count"] += 1
            else:
                v_type = type(v).__name__
                fields_map[k]["types"].add(v_type)
                if len(fields_map[k]["sample_values"]) < 5:
                    fields_map[k]["sample_values"].append(v)
                try:
                    fields_map[k]["values"].add(
                        v if isinstance(v, (str, int, float, bool)) else str(v)
                    )
                except (TypeError, ValueError):
                    pass

    summaries: list[MetadataFieldSummary] = []
    for k, info in sorted(fields_map.items(), key=lambda x: x[0]):
        types_list = list(info["types"])
        primary_type = types_list[0] if types_list else "unknown"
        unique_c = len(info["values"])
        summaries.append(
            MetadataFieldSummary(
                name=k,
                data_type=primary_type,
                sample_values=info["sample_values"],
                unique_count=unique_c,
                null_count=info["null_count"],
                is_high_cardinality=unique_c > 100,
            )
        )
    return summaries


def extract_collection_summary(collection: Collection) -> CollectionSummary:
    """Generate high-level collection summary and schema information."""
    total = collection.count()
    index_info = get_collection_index_info(collection)

    dim: int | None = None
    if (
        collection.metadata
        and "embedding_dimension" in collection.metadata
        and isinstance(collection.metadata["embedding_dimension"], int)
    ):
        dim = collection.metadata["embedding_dimension"]

    sample_meta: list[dict[str, Any] | None] = []
    if total > 0:
        try:
            probe = collection.get(
                include=["embeddings", "metadatas"],
                limit=min(total, 100),
            )
            if probe.get("embeddings") is not None and len(probe["embeddings"]) > 0:
                first_emb = probe["embeddings"][0]
                if hasattr(first_emb, "__len__"):
                    dim = len(first_emb)
            if probe.get("metadatas"):
                sample_meta = probe["metadatas"]
        except (RuntimeError, ValueError, KeyError) as exc:
            logger.warning(f"Failed to probe sample embeddings from {collection.name}: {exc}")

    metadata_summaries = summarize_collection_metadata(sample_meta)

    return CollectionSummary(
        id=str(collection.id),
        name=collection.name,
        vector_count=total,
        dimension=dim,
        distance_metric=index_info.space,
        database=getattr(collection, "database", "default_database"),
        tenant=getattr(collection, "tenant", "default_tenant"),
        metadata_fields=metadata_summaries,
        index_information=index_info,
        collection_metadata=collection.metadata or {},
    )


def extract_vector_batch(
    collection: Collection,
    sampling: SamplingConfig | None = None,
    chunk_size: int = 5000,
) -> ExtractedVectorBatch:
    """
    Safely extract vectors and metadata from ChromaDB with batching and numerical validation.

    Handles:
    - Empty collections
    - Sampling configuration (deterministic reproducible random sampling)
    - Zero vectors
    - NaN / Infinite float values
    - Dimension mismatches
    - Missing documents or metadata
    """
    start_time = time.perf_counter()
    if sampling is None:
        sampling = SamplingConfig()

    total = collection.count()
    index_info = get_collection_index_info(collection)
    distance_metric = index_info.space

    if total == 0:
        return ExtractedVectorBatch(
            ids=[],
            embeddings=np.empty((0, 0), dtype=np.float32),
            documents=[],
            metadatas=[],
            valid_mask=np.empty((0,), dtype=bool),
            valid_ids=[],
            valid_embeddings=np.empty((0, 0), dtype=np.float32),
            valid_documents=[],
            valid_metadatas=[],
            invalid_reasons={},
            total_in_collection=0,
            sampled=False,
            sample_size=0,
            dimension=None,
            distance_metric=distance_metric,
            extraction_time_ms=(time.perf_counter() - start_time) * 1000.0,
        )

    target_count = min(total, sampling.max_samples)
    is_sampled = target_count < total

    all_ids: list[str] = []
    all_embeddings_list: list[list[float]] = []
    all_docs: list[str | None] = []
    all_metas: list[dict[str, Any] | None] = []

    if not is_sampled:
        # Retrieve all vectors in chunks
        offset = 0
        while offset < total:
            limit = min(chunk_size, total - offset)
            batch = collection.get(
                include=["embeddings", "documents", "metadatas"],
                limit=limit,
                offset=offset,
            )
            batch_ids = batch.get("ids", [])
            batch_embs = batch.get("embeddings", [])
            batch_docs = batch.get("documents") or [None] * len(batch_ids)
            batch_metas = batch.get("metadatas") or [None] * len(batch_ids)

            for i, vid in enumerate(batch_ids):
                all_ids.append(vid)
                emb = batch_embs[i]
                if hasattr(emb, "tolist"):
                    emb = emb.tolist()
                all_embeddings_list.append(emb)
                all_docs.append(batch_docs[i] if i < len(batch_docs) else None)
                all_metas.append(batch_metas[i] if i < len(batch_metas) else None)

            offset += limit
    else:
        # Deterministic random index sampling
        rng = np.random.default_rng(sampling.random_seed)
        chosen_indices = np.sort(rng.choice(total, size=target_count, replace=False))

        # Retrieve all required indices efficiently via chunking
        chunk_start = 0
        while chunk_start < total:
            chunk_end = min(chunk_start + chunk_size, total)
            mask = (chosen_indices >= chunk_start) & (chosen_indices < chunk_end)
            chunk_indices = chosen_indices[mask] - chunk_start

            if len(chunk_indices) > 0:
                batch = collection.get(
                    include=["embeddings", "documents", "metadatas"],
                    limit=chunk_end - chunk_start,
                    offset=chunk_start,
                )
                batch_ids = batch.get("ids", [])
                batch_embs = batch.get("embeddings", [])
                batch_docs = batch.get("documents") or [None] * len(batch_ids)
                batch_metas = batch.get("metadatas") or [None] * len(batch_ids)

                for idx in chunk_indices:
                    if idx < len(batch_ids):
                        all_ids.append(batch_ids[idx])
                        emb = batch_embs[idx]
                        if hasattr(emb, "tolist"):
                            emb = emb.tolist()
                        all_embeddings_list.append(emb)
                        all_docs.append(
                            batch_docs[idx] if idx < len(batch_docs) else None
                        )
                        all_metas.append(
                            batch_metas[idx] if idx < len(batch_metas) else None
                        )

            chunk_start = chunk_end

    # Numerical Validation and Array Sanitization
    n = len(all_ids)
    if n == 0:
        return ExtractedVectorBatch(
            ids=[],
            embeddings=np.empty((0, 0), dtype=np.float32),
            documents=[],
            metadatas=[],
            valid_mask=np.empty((0,), dtype=bool),
            valid_ids=[],
            valid_embeddings=np.empty((0, 0), dtype=np.float32),
            valid_documents=[],
            valid_metadatas=[],
            invalid_reasons={},
            total_in_collection=total,
            sampled=is_sampled,
            sample_size=0,
            dimension=None,
            distance_metric=distance_metric,
            extraction_time_ms=(time.perf_counter() - start_time) * 1000.0,
        )

    # Determine expected dimension from the most frequent vector length
    lengths = [len(v) for v in all_embeddings_list if v is not None and hasattr(v, "__len__")]
    expected_dim: int | None = None
    if lengths:
        from collections import Counter
        expected_dim = Counter(lengths).most_common(1)[0][0]

    valid_mask = np.ones(n, dtype=bool)
    invalid_reasons: dict[str, str] = {}
    valid_embeddings_list: list[np.ndarray] = []
    valid_ids: list[str] = []
    valid_docs: list[str | None] = []
    valid_metas: list[dict[str, Any] | None] = []

    for i in range(n):
        vid = all_ids[i]
        emb = all_embeddings_list[i]

        if emb is None or not hasattr(emb, "__len__"):
            valid_mask[i] = False
            invalid_reasons[vid] = "missing_embedding"
            continue

        if expected_dim is not None and len(emb) != expected_dim:
            valid_mask[i] = False
            invalid_reasons[vid] = f"dimension_mismatch (expected {expected_dim}, got {len(emb)})"
            continue

        arr = np.asarray(emb, dtype=np.float32)

        if np.isnan(arr).any():
            valid_mask[i] = False
            invalid_reasons[vid] = "contains_nan"
            continue

        if np.isinf(arr).any():
            valid_mask[i] = False
            invalid_reasons[vid] = "contains_inf"
            continue

        norm = float(np.linalg.norm(arr))
        if norm < 1e-12:
            valid_mask[i] = False
            invalid_reasons[vid] = "zero_vector (norm < 1e-12)"
            continue

        valid_embeddings_list.append(arr)
        valid_ids.append(vid)
        valid_docs.append(all_docs[i])
        valid_metas.append(all_metas[i])

    if valid_embeddings_list:
        valid_arr = np.vstack(valid_embeddings_list).astype(np.float32)
    else:
        valid_arr = np.empty((0, expected_dim or 0), dtype=np.float32)

    # Full raw array placeholder for all embeddings with zero-padding for invalids
    if expected_dim:
        full_arr = np.zeros((n, expected_dim), dtype=np.float32)
        for i, emb in enumerate(all_embeddings_list):
            if emb is not None and len(emb) == expected_dim:
                try:
                    full_arr[i] = np.asarray(emb, dtype=np.float32)
                except (ValueError, TypeError):
                    pass
    else:
        full_arr = np.empty((n, 0), dtype=np.float32)

    extraction_time = (time.perf_counter() - start_time) * 1000.0

    return ExtractedVectorBatch(
        ids=all_ids,
        embeddings=full_arr,
        documents=all_docs,
        metadatas=all_metas,
        valid_mask=valid_mask,
        valid_ids=valid_ids,
        valid_embeddings=valid_arr,
        valid_documents=valid_docs,
        valid_metadatas=valid_metas,
        invalid_reasons=invalid_reasons,
        total_in_collection=total,
        sampled=is_sampled,
        sample_size=len(valid_ids),
        dimension=expected_dim,
        distance_metric=distance_metric,
        extraction_time_ms=extraction_time,
    )
