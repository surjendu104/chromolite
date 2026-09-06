import chromadb
import numpy as np
import pytest
from chromadb.config import Settings

from chromolite.analysis.clustering import compute_clustering
from chromolite.analysis.extractor import extract_vector_batch


@pytest.fixture
def ephemeral_client():
    return chromadb.EphemeralClient(settings=Settings(anonymized_telemetry=False))


def test_clustering_well_separated_gaussian_clusters(ephemeral_client):
    col = ephemeral_client.create_collection(
        name="cluster_quality_test",
        metadata={"hnsw:space": "l2"},
    )
    rng = np.random.default_rng(42)

    # 3 clusters of 25 vectors each in 6D
    c1 = rng.normal(loc=-10.0, scale=0.2, size=(25, 6))
    c2 = rng.normal(loc=0.0, scale=0.2, size=(25, 6))
    c3 = rng.normal(loc=10.0, scale=0.2, size=(25, 6))

    embs = np.vstack([c1, c2, c3]).tolist()
    ids = [f"vec_{i}" for i in range(75)]
    metas = (
        [{"category": "cluster_a"}] * 25
        + [{"category": "cluster_b"}] * 25
        + [{"category": "cluster_c"}] * 25
    )

    col.add(ids=ids, embeddings=embs, metadatas=metas)

    batch = extract_vector_batch(col)
    res = compute_clustering(col, batch, parameters={"k": 3, "algorithm": "kmeans", "random_seed": 42})

    assert res.k == 3
    assert len(res.clusters) == 3
    assert sum(c.size for c in res.clusters) == 75
    assert np.isclose(sum(c.percentage for c in res.clusters), 100.0)

    # Cluster quality should be very high on well-separated clusters
    assert res.quality.silhouette_score > 0.60
    assert res.quality.davies_bouldin_index < 0.80

    # Dominant metadata should be captured
    dom_cats = [c.dominant_metadata.get("category", "") for c in res.clusters]
    assert any("cluster_a" in c for c in dom_cats)
    assert any("cluster_b" in c for c in dom_cats)
    assert any("cluster_c" in c for c in dom_cats)


def test_minibatch_kmeans_algorithm(ephemeral_client):
    col = ephemeral_client.create_collection(name="minibatch_test")
    rng = np.random.default_rng(123)
    embs = rng.standard_normal((60, 4)).tolist()
    ids = [f"id_{i}" for i in range(60)]

    col.add(ids=ids, embeddings=embs)

    batch = extract_vector_batch(col)
    res = compute_clustering(col, batch, parameters={"k": 4, "algorithm": "minibatch_kmeans"})

    assert res.algorithm == "minibatch_kmeans"
    assert res.k == 4
    assert len(res.clusters) == 4
    assert res.quality.davies_bouldin_index > 0.0


def test_clustering_edge_cases(ephemeral_client):
    col = ephemeral_client.create_collection(name="single_cluster_test")
    col.add(ids=["single"], embeddings=[[1.0, 2.0]])

    batch = extract_vector_batch(col)
    res = compute_clustering(col, batch, parameters={"k": 5})

    assert res.k == 0
    assert len(res.clusters) == 0
