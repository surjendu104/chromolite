from fastapi import APIRouter
from pydantic import BaseModel

from chromolite.connection import db

router = APIRouter(
    prefix="/query",
    tags=["Query"],
)


class QueryRequest(BaseModel):
    collection_name: str
    query_text: str
    n_results: int = 10
    where: dict | None = None


@router.post("/")
def query(data: QueryRequest):
    client = db.get_client()
    collection = client.get_collection(name=data.collection_name)
    result = collection.query(
        query_texts=[data.query_text], n_results=data.n_results, where=data.where
    )

    return result
