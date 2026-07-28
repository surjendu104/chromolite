import logging

from fastapi import APIRouter, Query

from chromolite.collection import db

logger = logging.getLogger(__name__)

router = APIRouter(
    prefix="/collections/{collection_name}/documents",
    tags=["Documents"],
)


@router.get("/normal")
def get_documents_normal(collection_name: str):
    client = db.get_client()
    collection = client.get_collection(name=collection_name)
    documents = collection.get(include=["embeddings", "documents", "metadatas"])

    structured_document_data = []
    for id_, embedding, doc, metadata in zip(
        documents["ids"],
        documents["embeddings"],
        documents["documents"],
        documents["metadatas"],
    ):
        structured_document_data.append(
            {
                "id": id_,
                "embedding": embedding.tolist(),
                "document": doc,
                "metadata": metadata,
            }
        )

    return {"data": structured_document_data}


@router.get("")
def get_documents(
    collection_name: str,
    page: int = Query(1, ge=1),
    page_size: int = Query(10, ge=1, le=100),
):
    client = db.get_client()
    collection = client.get_collection(name=collection_name)

    offset = (page - 1) * page_size

    documents = collection.get(
        include=["embeddings", "documents", "metadatas"],
        limit=page_size,
        offset=offset,
    )

    structured_document_data = []
    for id_, embedding, doc, metadata in zip(
        documents["ids"],
        documents["embeddings"],
        documents["documents"],
        documents["metadatas"],
    ):
        structured_document_data.append(
            {
                "id": id_,
                "embedding": embedding.tolist(),
                "document": doc,
                "metadata": metadata,
            }
        )

    # Total number of documents
    total = collection.count()

    return {
        "data": structured_document_data,
        "pagination": {
            "page": page,
            "page_size": page_size,
            "total": total,
            "total_pages": (total + page_size - 1) // page_size,
            "has_next": offset + page_size < total,
            "has_previous": page > 1,
        },
    }
