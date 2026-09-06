import chromadb
import pytest
from chromadb.config import Settings

from chromolite.analysis.duplicates import compute_duplicates
from chromolite.analysis.extractor import extract_vector_batch


@pytest.fixture
def ephemeral_client():
    return chromadb.EphemeralClient(settings=Settings(anonymized_telemetry=False))


def test_exact_duplicate_detection(ephemeral_client):
    col = ephemeral_client.create_collection(name="exact_dup_test")
    # 3 exact duplicates + 2 distinct vectors
    col.add(
        ids=["dup1", "dup2", "dup3", "unique1", "unique2"],
        embeddings=[
            [1.0, 2.0, 3.0],
            [1.0, 2.0, 3.0],
            [1.0, 2.0, 3.0],
            [5.0, 0.0, 1.0],
            [0.0, 5.0, 1.0],
        ],
        documents=["text dup 1", "text dup 2", "text dup 3", "unique 1", "unique 2"],
    )

    batch = extract_vector_batch(col)
    res = compute_duplicates(col, batch, parameters={"threshold": 0.98})

    assert res.exact_group_count == 1
    assert res.exact_duplicate_count == 2
    assert res.total_redundant_vectors == 2
    assert len(res.groups) == 1

    group = res.groups[0]
    assert group.is_exact is True
    assert group.member_count == 3
    assert {m.id for m in group.members} == {"dup1", "dup2", "dup3"}


def test_near_duplicate_detection_threshold(ephemeral_client):
    col = ephemeral_client.create_collection(name="near_dup_test")
    # Base vector: [1.0, 0.0]
    # Near vector (similarity ~ 0.985): [0.985, 0.172]
    # Moderate vector (similarity ~ 0.92): [0.92, 0.39]
    col.add(
        ids=["base", "near", "moderate", "orthogonal"],
        embeddings=[
            [1.0, 0.0],
            [0.985, 0.172],
            [0.92, 0.39],
            [0.0, 1.0],
        ],
    )

    batch = extract_vector_batch(col)

    # At threshold 0.98: base and near should form a group
    res_098 = compute_duplicates(col, batch, parameters={"threshold": 0.98})
    assert len(res_098.groups) == 1
    assert res_098.groups[0].member_count == 2
    assert {m.id for m in res_098.groups[0].members} == {"base", "near"}

    # At threshold 0.99: base and near should NOT form a group (sim is ~0.985 < 0.99)
    res_099 = compute_duplicates(col, batch, parameters={"threshold": 0.99})
    assert len(res_099.groups) == 0

    # At threshold 0.90: base, near, and moderate should form a group
    res_090 = compute_duplicates(col, batch, parameters={"threshold": 0.90})
    assert len(res_090.groups) == 1
    assert res_090.groups[0].member_count == 3


def test_duplicates_empty_collection(ephemeral_client):
    col = ephemeral_client.create_collection(name="empty_dup_test")
    col.add(ids=["single"], embeddings=[[1.0, 2.0]])

    batch = extract_vector_batch(col)
    res = compute_duplicates(col, batch)
    assert res.total_redundant_vectors == 0
    assert len(res.groups) == 0
