import chromadb
import numpy as np
import pytest
from chromadb.config import Settings

from chromolite.analysis.extractor import extract_vector_batch
from chromolite.analysis.projection import (
    compute_pca_projection,
    compute_projection,
    compute_tsne_projection,
    compute_umap_projection,
    normalize_coordinates,
)


@pytest.fixture
def ephemeral_client():
    return chromadb.EphemeralClient(settings=Settings(anonymized_telemetry=False))


def test_normalize_coordinates():
    raw = np.array([[-100.0, 50.0], [100.0, -50.0], [0.0, 0.0]])
    norm = normalize_coordinates(raw, target_bound=10.0)
    assert np.isclose(np.mean(norm, axis=0), [0.0, 0.0], atol=1e-5).all()
    assert np.max(np.abs(norm)) <= 10.0 + 1e-5


def test_pca_projection_deterministic_explained_variance(ephemeral_client):
    col = ephemeral_client.create_collection(name="pca_test_col")
    rng = np.random.default_rng(42)
    # Generate 50 vectors in 10-dimensional space
    embeddings = rng.standard_normal((50, 10)).tolist()
    ids = [f"doc_{i}" for i in range(50)]

    col.add(ids=ids, embeddings=embeddings)

    batch = extract_vector_batch(col)
    res1 = compute_pca_projection(col, batch, parameters={"random_seed": 42})
    res2 = compute_pca_projection(col, batch, parameters={"random_seed": 42})

    assert res1.algorithm == "pca"
    assert len(res1.points) == 50
    assert res1.explained_variance is not None
    assert 0.0 <= res1.explained_variance.pc1 <= 1.0
    assert 0.0 <= res1.explained_variance.pc2 <= 1.0
    assert res1.explained_variance.total == res1.explained_variance.pc1 + res1.explained_variance.pc2

    # Verify exact deterministic point reproducibility
    coords1 = [(p.x, p.y) for p in res1.points]
    coords2 = [(p.x, p.y) for p in res2.points]
    np.testing.assert_allclose(coords1, coords2, atol=1e-5)


def test_umap_and_tsne_projections(ephemeral_client):
    col = ephemeral_client.create_collection(name="manifold_test_col")
    # 2 well-separated clusters of 20 vectors each
    rng = np.random.default_rng(123)
    c1 = rng.normal(loc=-5.0, scale=0.5, size=(20, 8))
    c2 = rng.normal(loc=5.0, scale=0.5, size=(20, 8))
    embs = np.vstack([c1, c2]).tolist()
    ids = [f"pt_{i}" for i in range(40)]

    col.add(ids=ids, embeddings=embs)

    batch = extract_vector_batch(col)

    # UMAP / manifold
    umap_res = compute_umap_projection(col, batch, parameters={"n_neighbors": 10, "random_seed": 42})
    assert umap_res.algorithm == "umap"
    assert len(umap_res.points) == 40
    assert all(np.isfinite(p.x) and np.isfinite(p.y) for p in umap_res.points)

    # t-SNE
    tsne_res = compute_tsne_projection(col, batch, parameters={"perplexity": 10, "random_seed": 42})
    assert tsne_res.algorithm == "tsne"
    assert len(tsne_res.points) == 40
    assert all(np.isfinite(p.x) and np.isfinite(p.y) for p in tsne_res.points)


def test_projection_dispatcher(ephemeral_client):
    col = ephemeral_client.create_collection(name="dispatcher_test")
    col.add(
        ids=["a", "b", "c"],
        embeddings=[[1.0, 0.0], [0.0, 1.0], [1.0, 1.0]],
    )
    batch = extract_vector_batch(col)

    pca = compute_projection(col, batch, {"algorithm": "pca"})
    assert pca.algorithm == "pca"
    assert len(pca.points) == 3

    umap = compute_projection(col, batch, {"algorithm": "umap"})
    assert umap.algorithm in ("umap", "pca")
    assert len(umap.points) == 3
