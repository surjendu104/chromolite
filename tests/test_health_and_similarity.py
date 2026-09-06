import chromadb
import numpy as np
import pytest
from chromadb.config import Settings

from chromolite.analysis.extractor import extract_vector_batch
from chromolite.analysis.similarity import (
    compute_pairwise_cosine_similarities,
    compute_similarity_distribution,
)
from chromolite.analysis.statistics import (
    compute_collection_health,
    compute_distribution_stats,
    compute_histogram,
)


@pytest.fixture
def ephemeral_client():
    return chromadb.EphemeralClient(settings=Settings(anonymized_telemetry=False))


def test_distribution_stats_calculation():
    arr = np.array([10.0, 20.0, 30.0, 40.0, 50.0])
    stats = compute_distribution_stats(arr)
    assert stats.min == 10.0
    assert stats.max == 50.0
    assert stats.median == 30.0
    assert stats.mean == 30.0
    assert np.isclose(stats.std, np.std(arr))


def test_histogram_generation():
    arr = np.linspace(0.0, 1.0, 100)
    hist = compute_histogram(arr, num_bins=10)
    assert len(hist.counts) == 10
    assert len(hist.bins) == 11
    assert len(hist.bin_centers) == 10
    assert sum(hist.counts) == 100


def test_collection_health_unit_normalized(ephemeral_client):
    col = ephemeral_client.create_collection(name="unit_norm_col")
    col.add(
        ids=["u1", "u2", "u3"],
        embeddings=[
            [1.0, 0.0, 0.0],
            [0.0, 1.0, 0.0],
            [0.0, 0.0, 1.0],
        ],
    )
    batch = extract_vector_batch(col)
    health = compute_collection_health(col, batch)

    assert health.vector_count == 3
    assert health.is_unit_normalized is True
    assert np.isclose(health.norms.mean, 1.0)
    assert np.isclose(health.norms.std, 0.0)
    assert health.health_status == "healthy"


def test_collection_health_variable_norms(ephemeral_client):
    col = ephemeral_client.create_collection(
        name="var_norm_col",
        metadata={"hnsw:space": "cosine"},
    )
    col.add(
        ids=["v1", "v2", "v3"],
        embeddings=[
            [3.0, 4.0],  # norm = 5.0
            [1.0, 1.0],  # norm = sqrt(2) approx 1.414
            [10.0, 0.0],  # norm = 10.0
        ],
    )
    batch = extract_vector_batch(col)
    health = compute_collection_health(col, batch)

    assert health.is_unit_normalized is False
    assert health.norms.min < 2.0
    assert health.norms.max == 10.0
    assert health.health_status == "warning"
    assert any("norms vary" in a for a in health.anomalies)


def test_similarity_distribution_exact_known_vectors():
    # 3 vectors:
    # v1 = [1, 0], v2 = [0, 1] -> cos = 0.0
    # v3 = [1, 1] / sqrt(2) -> cos(v1, v3) = 1/sqrt(2) ~ 0.7071
    # cos(v2, v3) = 1/sqrt(2) ~ 0.7071
    v1 = np.array([1.0, 0.0], dtype=np.float32)
    v2 = np.array([0.0, 1.0], dtype=np.float32)
    v3 = np.array([1.0 / np.sqrt(2.0), 1.0 / np.sqrt(2.0)], dtype=np.float32)

    embeddings = np.vstack([v1, v2, v3])
    sims = compute_pairwise_cosine_similarities(embeddings, pair_sample_count=100)

    assert len(sims) == 3
    expected_sims = sorted([0.0, float(1.0 / np.sqrt(2.0)), float(1.0 / np.sqrt(2.0))])
    actual_sims = sorted(float(x) for x in sims)
    np.testing.assert_allclose(actual_sims, expected_sims, atol=1e-5)


def test_similarity_distribution_anisotropic(ephemeral_client):
    col = ephemeral_client.create_collection(
        name="anisotropic_col",
        metadata={"hnsw:space": "cosine"},
    )
    # Generate vectors tightly clustered in a cone around [1, 0, 0]
    rng = np.random.default_rng(42)
    base = np.array([1.0, 0.0, 0.0])
    noise = rng.normal(0.0, 0.05, size=(50, 3))
    raw_vecs = base + noise
    norms = np.linalg.norm(raw_vecs, axis=1, keepdims=True)
    unit_vecs = (raw_vecs / norms).tolist()

    col.add(
        ids=[f"id_{i}" for i in range(50)],
        embeddings=unit_vecs,
    )

    batch = extract_vector_batch(col)
    result = compute_similarity_distribution(col, batch)

    assert result.mean_pairwise_similarity > 0.90
    assert result.is_potentially_anisotropic is True
    assert "cone effect" in result.anisotropy_interpretation.lower()


def test_similarity_distribution_single_vector(ephemeral_client):
    col = ephemeral_client.create_collection(name="single_vec_col")
    col.add(ids=["single"], embeddings=[[1.0, 2.0, 3.0]])

    batch = extract_vector_batch(col)
    result = compute_similarity_distribution(col, batch)
    assert result.pair_sample_count == 0
    assert result.pairwise_similarity.mean == 0.0
