import chromadb
import numpy as np
import pytest
from chromadb.config import Settings

from chromolite.analysis.extractor import extract_vector_batch
from chromolite.analysis.outliers import compute_outliers


@pytest.fixture
def ephemeral_client():
    return chromadb.EphemeralClient(settings=Settings(anonymized_telemetry=False))


def test_knn_distance_outlier_detection_obvious_outlier(ephemeral_client):
    col = ephemeral_client.create_collection(
        name="outlier_detection_test",
        metadata={"hnsw:space": "l2"},
    )
    rng = np.random.default_rng(42)
    # 40 core cluster points around (5, 5)
    cluster = rng.normal(loc=5.0, scale=0.1, size=(40, 4))
    # 1 obvious outlier far away at (100, 100)
    outlier = np.array([[100.0, 100.0, 100.0, 100.0]])
    embs = np.vstack([cluster, outlier]).tolist()
    ids = [f"c_{i}" for i in range(40)] + ["obvious_outlier"]

    col.add(ids=ids, embeddings=embs)

    batch = extract_vector_batch(col)
    res = compute_outliers(
        col,
        batch,
        parameters={"method": "knn_distance", "threshold_quantile": 0.05, "k": 5},
    )

    assert res.method == "knn_distance"
    assert res.outliers_count >= 1
    # Top outlier must be "obvious_outlier"
    top_outlier = res.outliers[0]
    assert top_outlier.id == "obvious_outlier"
    assert top_outlier.isolation_factor > 10.0
    assert top_outlier.local_density_score < 10.0


def test_lof_outlier_detection(ephemeral_client):
    col = ephemeral_client.create_collection(
        name="lof_detection_test",
        metadata={"hnsw:space": "l2"},
    )
    rng = np.random.default_rng(123)
    # 30 core points
    cluster = rng.normal(loc=10.0, scale=0.2, size=(30, 3))
    # 1 isolated point
    outlier = np.array([[80.0, 80.0, 80.0]])
    embs = np.vstack([cluster, outlier]).tolist()
    ids = [f"p_{i}" for i in range(30)] + ["lof_outlier"]

    col.add(ids=ids, embeddings=embs)

    batch = extract_vector_batch(col)
    res = compute_outliers(
        col,
        batch,
        parameters={"method": "lof", "threshold_quantile": 0.05, "k": 5},
    )

    assert res.method == "lof"
    assert res.outliers_count >= 1
    assert res.outliers[0].id == "lof_outlier"
    assert res.outliers[0].lof_score is not None
    assert res.outliers[0].lof_score > 1.5


def test_outliers_edge_case_few_vectors(ephemeral_client):
    col = ephemeral_client.create_collection(name="few_vecs_outlier")
    col.add(ids=["a", "b"], embeddings=[[1.0, 0.0], [0.0, 1.0]])

    batch = extract_vector_batch(col)
    res = compute_outliers(col, batch)
    assert res.outliers_count == 0
    assert len(res.outliers) == 0
