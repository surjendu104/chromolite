import chromadb
import numpy as np
import pytest
from chromadb.config import Settings

from chromolite.analysis.extractor import extract_vector_batch
from chromolite.analysis.neighbors import (
    compute_knn_and_density,
    get_vector_neighbors,
)


@pytest.fixture
def ephemeral_client():
    return chromadb.EphemeralClient(settings=Settings(anonymized_telemetry=False))


def test_knn_density_known_distances(ephemeral_client):
    col = ephemeral_client.create_collection(
        name="knn_density_test",
        metadata={"hnsw:space": "l2"},
    )
    # 4 non-zero points: 3 clustered together, 1 isolated outlier
    col.add(
        ids=["p0", "p1", "p2", "isolated"],
        embeddings=[
            [10.0, 0.0],
            [11.0, 0.0],
            [12.0, 0.0],
            [60.0, 0.0],
        ],
        documents=["point 0", "point 1", "point 2", "isolated point"],
    )

    batch = extract_vector_batch(col)
    res = compute_knn_and_density(col, batch, parameters={"k": 2})

    assert res.k == 2
    assert res.distance_metric == "l2"
    assert len(res.densest_vectors) == 4
    assert len(res.sparsest_vectors) == 4

    # p1 should be densest (neighbors p0 and p2 are distance 1.0 away each)
    densest_id = res.densest_vectors[0].id
    assert densest_id == "p1"
    assert np.isclose(res.densest_vectors[0].mean_knn_distance, 1.0)

    # isolated should be sparsest
    sparsest_id = res.sparsest_vectors[0].id
    assert sparsest_id == "isolated"
    assert res.sparsest_vectors[0].mean_knn_distance > 45.0
    assert res.sparsest_vectors[0].local_density_score < res.densest_vectors[0].local_density_score


def test_vector_neighbors_ranking(ephemeral_client):
    col = ephemeral_client.create_collection(
        name="neighbors_rank_test",
        metadata={"hnsw:space": "cosine"},
    )
    # Normalized embeddings
    col.add(
        ids=["target", "near1", "near2", "far"],
        embeddings=[
            [1.0, 0.0],
            [0.999, 0.044],  # very close to target
            [0.866, 0.5],    # 30 degrees
            [0.0, 1.0],      # 90 degrees (orthogonal)
        ],
    )

    batch = extract_vector_batch(col)
    neighbors = get_vector_neighbors(batch, target_vector_id="target", k=3)

    assert len(neighbors) == 3
    assert neighbors[0].id == "near1"
    assert neighbors[0].rank == 1
    assert neighbors[1].id == "near2"
    assert neighbors[1].rank == 2
    assert neighbors[2].id == "far"
    assert neighbors[2].rank == 3
    assert neighbors[0].distance < neighbors[1].distance < neighbors[2].distance
    assert neighbors[0].similarity > neighbors[1].similarity > neighbors[2].similarity


def test_knn_density_large_k_bounding(ephemeral_client):
    col = ephemeral_client.create_collection(name="knn_k_bounding")
    col.add(
        ids=["a", "b", "c"],
        embeddings=[[1.0, 0.0], [0.0, 1.0], [1.0, 1.0]],
    )
    batch = extract_vector_batch(col)
    # Request k=50 on 3 vectors -> should bound k to 2
    res = compute_knn_and_density(col, batch, parameters={"k": 50})
    assert res.k == 2
    assert len(res.densest_vectors) == 3
