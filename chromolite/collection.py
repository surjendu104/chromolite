from fastapi import APIRouter, HTTPException
from pydantic import BaseModel

from chromolite.connection import db

router = APIRouter(prefix="/collections", tags=["Collections"])


class CreateCollection(BaseModel):
    name: str


class DeleteCollection(BaseModel):
    name: str


@router.post("")
def create_collection(data: CreateCollection):
    client = db.get_client()

    existing_collection = client.get_collection(name=data.name)
    if existing_collection:
        return HTTPException(detail="Collection already present", status_code=400)
    new_collection = client.create_collection(name=data.name)

    return {"id": new_collection.id, "name": new_collection.name}


@router.get("")
def get_collections():

    client = db.get_client()

    collection_list = client.list_collections()

    collections = []

    for collection in collection_list:
        collections.append(
            {
                "id": collection.id,
                "name": collection.name,
                "tenant": collection.tenant,
                "database": collection.database,
            }
        )

    return collections


@router.get("/{collection_name}")
def get_collection(collection_name: str):
    client = db.get_client()
    collection = client.get_collection(name=collection_name)

    print(collection.configuration)
    print(type(collection.configuration))
    
    print(collection.configuration_json)
    print(type(collection.configuration_json))
    
    print(collection.schema)
    print(type(collection.schema))

    response = {
        "id": collection.id,
        "name": collection.name,
        "metadata": collection.metadata,
        "database": collection.database,
        "tenant": collection.tenant,
        "schema": collection.schema.serialize_to_json(),
        "configuration": collection.configuration_json,
        # "configuration_json": collection.configuration_json,
        "document_count": collection.count(),
        # "indexing_status": collection.get_indexing_status(),
        "fork_count": collection.fork_count,
    }

    return response


@router.delete("/")
def delete_collection(data: DeleteCollection):
    client = db.get_client()
    existing_collection = client.get_collection(name=data.name)
    if not existing_collection:
        return HTTPException(detail="Collection not found", status_code=404)

    client.delete_collection(name=data.name)
    return {"status": "success"}
