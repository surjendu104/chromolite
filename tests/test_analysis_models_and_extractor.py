import chromadb
import numpy as np
import pytest
from chromadb.config import Settings

from chromolite.analysis.extractor import (
    extract_collection_summary,
    extract_vector_batch,
    normalize_distance_metric,
)
from chromolite.analysis.models import (
    AnalysisMethod,
    AnalysisResponse,
    AnalysisStatus,
    MetricDefinition,
    SamplingConfig,
    SamplingStrategy,
)
from chromolite.analysis.service import InMemoryAnalysisCache


@pytest.fixture
def ephemeral_client():
    return chromadb.EphemeralClient(settings=Settings(anonymized_telemetry=False))


def test_distance_metric_normalization():
    assert normalize_distance_metric("cosine") == "cosine"
    assert normalize_distance_metric("COS") == "cosine"
    assert normalize_distance_metric("l2") == "l2"
    assert normalize_distance_metric("euclidean") == "l2"
    assert normalize_distance_metric("ip") == "ip"
    assert normalize_distance_metric("dot") == "ip"
    assert normalize_distance_metric(None) == "cosine"


def test_empty_collection_extraction(ephemeral_client):
    col = ephemeral_client.create_collection(name="empty_test")
    summary = extract_collection_summary(col)
    assert summary.vector_count == 0
    assert summary.name == "empty_test"

    batch = extract_vector_batch(col)
    assert batch.total_in_collection == 0
    assert batch.sample_size == 0
    assert len(batch.valid_ids) == 0
    assert batch.valid_embeddings.shape == (0, 0)


def test_valid_vector_extraction_and_metadata(ephemeral_client):
    col = ephemeral_client.create_collection(
        name="valid_test",
        metadata={"hnsw:space": "cosine"},
    )
    col.add(
        ids=["doc_1", "doc_2", "doc_3"],
        embeddings=[
            [1.0, 0.0, 0.0],
            [0.0, 1.0, 0.0],
            [0.0, 0.0, 1.0],
        ],
        documents=["text 1", "text 2", "text 3"],
        metadatas=[
            {"category": "tech", "priority": 1},
            {"category": "finance", "priority": 2},
            {"category": "tech", "priority": 3},
        ],
    )

    summary = extract_collection_summary(col)
    assert summary.vector_count == 3
    assert summary.dimension == 3
    assert summary.distance_metric == "cosine"
    assert len(summary.metadata_fields) == 2

    batch = extract_vector_batch(col)
    assert batch.sample_size == 3
    assert batch.valid_embeddings.shape == (3, 3)
    assert len(batch.invalid_reasons) == 0
    assert batch.valid_ids == ["doc_1", "doc_2", "doc_3"]


def test_invalid_vector_filtering():
    class MockCollection:
        def __init__(self):
            self.id = "mock_col_id"
            self.name = "mock_invalid_filter_test"
            self.metadata = {"hnsw:space": "cosine"}
            self.configuration = {"hnsw": {"space": "cosine"}}

        def count(self):
            return 6

        def get(self, include=None, limit=None, offset=0):
            return {
                "ids": ["good_1", "good_2", "nan_vec", "inf_vec", "zero_vec", "dim_mismatch"],
                "embeddings": [
                    [1.0, 2.0, 3.0],
                    [4.0, 5.0, 6.0],
                    [float("nan"), 1.0, 2.0],
                    [float("inf"), 1.0, 2.0],
                    [0.0, 0.0, 0.0],
                    [1.0, 2.0, 3.0, 4.0],  # 4-dim instead of 3
                ],
                "documents": ["g1", "g2", "nan", "inf", "zero", "dim"],
                "metadatas": [{"k": 1}, {"k": 2}, {"k": 3}, {"k": 4}, {"k": 5}, {"k": 6}],
            }

    mock_col = MockCollection()
    batch = extract_vector_batch(mock_col)
    assert batch.total_in_collection == 6
    assert batch.sample_size == 2
    assert set(batch.valid_ids) == {"good_1", "good_2"}
    assert "nan_vec" in batch.invalid_reasons
    assert "inf_vec" in batch.invalid_reasons
    assert "zero_vec" in batch.invalid_reasons
    assert "dim_mismatch" in batch.invalid_reasons
    assert batch.valid_embeddings.shape == (2, 3)


def test_deterministic_sampling(ephemeral_client):
    col = ephemeral_client.create_collection(name="sampling_test")
    n = 100
    dim = 8
    rng = np.random.default_rng(123)
    embeddings = rng.standard_normal((n, dim)).tolist()
    ids = [f"id_{i}" for i in range(n)]

    col.add(ids=ids, embeddings=embeddings)

    sample_cfg1 = SamplingConfig(strategy=SamplingStrategy.RANDOM, max_samples=25, random_seed=42)
    batch1 = extract_vector_batch(col, sampling=sample_cfg1)

    sample_cfg2 = SamplingConfig(strategy=SamplingStrategy.RANDOM, max_samples=25, random_seed=42)
    batch2 = extract_vector_batch(col, sampling=sample_cfg2)

    assert batch1.sample_size == 25
    assert batch1.sampled is True
    assert batch1.valid_ids == batch2.valid_ids
    np.testing.assert_array_equal(batch1.valid_embeddings, batch2.valid_embeddings)


def test_analysis_cache():
    cache = InMemoryAnalysisCache(max_entries=10, ttl_seconds=60)
    key = cache.make_key("col_1", 100, "metric_a", {"param": 1})

    assert cache.get(key) is None
    cache.set(key, "col_1", {"value": 42})
    assert cache.get(key) == {"value": 42}

    cache.invalidate_collection("col_1")
    assert cache.get(key) is None


def test_analysis_response_model():
    metric_def = MetricDefinition(
        id="test_metric",
        name="Test Metric",
        description="A test metric description",
        formula="x + y",
        range_min=0.0,
        range_max=1.0,
    )
    assert metric_def.id == "test_metric"

    resp = AnalysisResponse(
        status=AnalysisStatus.COMPLETED,
        metric_id="test_metric",
        computed_on=100,
        total_vectors=100,
        method=AnalysisMethod.EXACT,
        approximate=False,
        parameters={"k": 5},
        result={"mean": 0.85},
        execution_time_ms=5.2,
    )
    assert resp.status == AnalysisStatus.COMPLETED
    assert resp.result["mean"] == 0.85
    data = resp.model_dump()
    assert data["method"] == "exact"
    assert data["computed_on"] == 100
