import random
import uuid
from datetime import datetime, timedelta
from pathlib import Path

import chromadb
import numpy as np
from chromadb.config import Settings

# Configuration

DB_PATH = "./test_chroma_db"

EMBEDDING_DIM = 384

DOCUMENTS_PER_COLLECTION = 500

COLLECTIONS = {
    "books": [
        "Python",
        "Machine Learning",
        "Algorithms",
        "Clean Code",
        "Design Patterns",
        "Operating Systems",
        "Networking",
        "Databases",
    ],
    "research": [
        "LLMs",
        "Computer Vision",
        "NLP",
        "Quantum Computing",
        "Distributed Systems",
        "Vector Databases",
        "Knowledge Graphs",
        "Graph Neural Networks",
    ],
    "movies": [
        "Interstellar",
        "Inception",
        "The Matrix",
        "Avatar",
        "Dune",
        "Arrival",
        "Blade Runner",
        "The Dark Knight",
    ],
    "programming": [
        "Python",
        "Rust",
        "Go",
        "Java",
        "React",
        "FastAPI",
        "Docker",
        "Kubernetes",
    ],
    "notes": [
        "Shopping",
        "Travel",
        "Meeting",
        "Recipe",
        "Workout",
        "Ideas",
        "Journal",
        "Finance",
    ],
}

WORDS = [
    "vector",
    "database",
    "embedding",
    "semantic",
    "retrieval",
    "document",
    "python",
    "metadata",
    "chromadb",
    "collection",
    "query",
    "similarity",
    "language",
    "artificial",
    "intelligence",
    "learning",
    "visualizer",
    "storage",
    "backend",
    "frontend",
]


# Helpers

def random_date():
    start = datetime(2022, 1, 1)
    end = datetime.now()

    delta = end - start

    return start + timedelta(seconds=random.randint(0, int(delta.total_seconds())))


def random_document(topic, idx):
    sentence_count = random.randint(8, 25)

    body = []

    for _ in range(sentence_count):
        body.append(
            " ".join(random.choices(WORDS, k=random.randint(10, 22))).capitalize() + "."
        )

    return f"""
Document #{idx}

Topic: {topic}

This document belongs to the topic "{topic}".

{" ".join(body)}

Unique ID:
{uuid.uuid4()}
""".strip()


def random_embedding():
    """
    Generate normalized embedding.
    """

    v = np.random.randn(EMBEDDING_DIM)

    v = v / np.linalg.norm(v)

    return v.tolist()


# ==========================================================
# Create DB
# ==========================================================

Path(DB_PATH).mkdir(exist_ok=True)

client = chromadb.PersistentClient(
    path=DB_PATH,
    settings=Settings(anonymized_telemetry=False),
)

print("Creating database...\n")

for collection_name, topics in COLLECTIONS.items():
    collection = client.get_or_create_collection(
        name=collection_name,
        metadata={
            "description": f"Sample collection '{collection_name}'",
            "owner": "visualizer",
            "embedding_dimension": EMBEDDING_DIM,
            "created_for": "Chroma Visualizer",
            "version": "1.0",
        },
    )

    ids = []
    docs = []
    embeddings = []
    metadatas = []

    print(f"Generating {collection_name}...")

    for i in range(DOCUMENTS_PER_COLLECTION):
        topic = random.choice(topics)

        ids.append(f"{collection_name}-{uuid.uuid4()}")

        docs.append(random_document(topic, i))

        embeddings.append(random_embedding())

        created = random_date()

        metadatas.append(
            {
                "title": f"{topic} Article {i}",
                "topic": topic,
                "category": collection_name,
                "author": f"Author {random.randint(1, 25)}",
                "language": random.choice(["English", "French", "German", "Spanish"]),
                "year": created.year,
                "month": created.month,
                "day": created.day,
                "created_at": created.isoformat(),
                "rating": random.randint(1, 5),
                "score": round(random.uniform(0, 1), 4),
                "views": random.randint(10, 50000),
                "likes": random.randint(0, 5000),
                "featured": random.choice([True, False]),
                "verified": random.choice([True, False]),
                "premium": random.choice([True, False]),
                "word_count": random.randint(300, 3000),
                "reading_time": random.randint(2, 25),
                "difficulty": random.choice(["Beginner", "Intermediate", "Advanced"]),
                "tags": ",".join(
                    random.sample(
                        [
                            "AI",
                            "ML",
                            "Python",
                            "RAG",
                            "Database",
                            "Cloud",
                            "LLM",
                            "Vector",
                            "Docker",
                            "Backend",
                            "Frontend",
                        ],
                        random.randint(2, 5),
                    )
                ),
                "region": random.choice(["US", "EU", "India", "Japan", "Australia"]),
                "department": random.choice(
                    ["Engineering", "Research", "Product", "Marketing"]
                ),
            }
        )

    collection.add(
        ids=ids,
        documents=docs,
        embeddings=embeddings,
        metadatas=metadatas,
    )

    print(f"  ✓ Added {len(ids)} documents ({EMBEDDING_DIM}-dim embeddings)")

print("\nDatabase created successfully.\n")

print("Collections:")

for c in client.list_collections():
    print(f" • {c.name}")

print("\nDone.")
