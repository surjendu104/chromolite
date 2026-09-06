import chromadb
import numpy as np
import pytest
from chromadb.config import Settings

from chromolite.analysis.extractor import extract_vector_batch
from chromolite.analysis.metadata import (
    compute_metadata_analysis,
    compute_temporal_drift,
    parse_timestamp_value,
)


@pytest.fixture
def ephemeral_client():
    return chromadb.EphemeralClient(settings=Settings(anonymized_telemetry=False))


def test_parse_timestamp_formats():
    dt1 = parse_timestamp_value("2024-03-15T10:30:00Z")
    assert dt1 is not None
    assert dt1.year == 2024
    assert dt1.month == 3
    assert dt1.day == 15

    dt2 = parse_timestamp_value("2023-11-20")
    assert dt2 is not None
    assert dt2.year == 2023
    assert dt2.month == 11

    assert parse_timestamp_value(None) is None


def test_categorical_metadata_analysis(ephemeral_client):
    col = ephemeral_client.create_collection(name="meta_cat_test")
    rng = np.random.default_rng(42)

    # 3 categories with distinct embeddings
    c1 = rng.normal(loc=0.0, scale=0.1, size=(20, 4))
    c2 = rng.normal(loc=5.0, scale=0.1, size=(20, 4))
    c3 = rng.normal(loc=10.0, scale=0.1, size=(20, 4))

    embs = np.vstack([c1, c2, c3]).tolist()
    ids = [f"v_{i}" for i in range(60)]
    metas = [{"topic": "NLP"}] * 20 + [{"topic": "CV"}] * 20 + [{"topic": "RL"}] * 20

    col.add(ids=ids, embeddings=embs, metadatas=metas)

    batch = extract_vector_batch(col)
    res = compute_metadata_analysis(col, batch, parameters={"field_name": "topic"})

    assert res.field_name == "topic"
    assert res.field_type == "categorical"
    assert res.total_vectors_with_field == 60
    assert res.coverage_rate == 1.0
    assert res.unique_values_count == 3
    assert res.categories is not None
    assert len(res.categories) == 3
    assert res.cluster_purity is not None
    assert res.cluster_purity >= 0.90  # Well-separated categories have high purity
    assert res.normalized_mutual_information is not None
    assert res.normalized_mutual_information > 0.60


def test_numeric_metadata_analysis(ephemeral_client):
    col = ephemeral_client.create_collection(name="meta_num_test")
    embs = [[1.0, 0.0], [2.0, 0.0], [3.0, 0.0], [4.0, 0.0], [5.0, 0.0]]
    metas = [{"score": 10.0}, {"score": 20.0}, {"score": 30.0}, {"score": 40.0}, {"score": 50.0}]

    col.add(
        ids=[f"p_{i}" for i in range(5)],
        embeddings=embs,
        metadatas=metas,
    )

    batch = extract_vector_batch(col)
    res = compute_metadata_analysis(col, batch, parameters={"field_name": "score"})

    assert res.field_name == "score"
    assert res.field_type == "numeric"
    assert res.numeric_stats is not None
    assert res.numeric_stats.stats.mean == 30.0
    assert res.numeric_stats.stats.min == 10.0
    assert res.numeric_stats.stats.max == 50.0
    # Vector norm is perfectly correlated with score in this dataset
    assert res.numeric_stats.norm_correlation is not None
    assert np.isclose(res.numeric_stats.norm_correlation, 1.0)


def test_temporal_drift_computation(ephemeral_client):
    col = ephemeral_client.create_collection(name="temporal_drift_test")
    # Jan vectors around [0, 0]
    # Feb vectors around [5, 5] (shifted centroid)
    # Mar vectors around [10, 10] (shifted further)
    rng = np.random.default_rng(123)
    jan = rng.normal(loc=0.0, scale=0.1, size=(10, 2)).tolist()
    feb = rng.normal(loc=5.0, scale=0.1, size=(10, 2)).tolist()
    mar = rng.normal(loc=10.0, scale=0.1, size=(10, 2)).tolist()

    embs = jan + feb + mar
    ids = [f"t_{i}" for i in range(30)]
    metas = (
        [{"created_at": "2024-01-15T12:00:00"}] * 10
        + [{"created_at": "2024-02-15T12:00:00"}] * 10
        + [{"created_at": "2024-03-15T12:00:00"}] * 10
    )

    col.add(ids=ids, embeddings=embs, metadatas=metas)

    batch = extract_vector_batch(col)
    res = compute_temporal_drift(
        col,
        batch,
        parameters={"timestamp_field": "created_at", "granularity": "month"},
    )

    assert res.total_windows == 3
    assert len(res.windows) == 3
    assert res.windows[0].window_label == "2024-01"
    assert res.windows[1].window_label == "2024-02"
    assert res.windows[2].window_label == "2024-03"

    # Centroid drift from previous
    assert res.windows[0].centroid_drift_from_previous is None  # First window has no prior
    assert res.windows[1].centroid_drift_from_previous is not None
    assert res.windows[1].centroid_drift_from_previous > 0.0
    assert res.mean_consecutive_drift > 0.0
