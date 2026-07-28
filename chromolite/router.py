from fastapi import APIRouter

from chromolite.collection import router as collection_router
from chromolite.documents import router as documents_router

# from chromolite.query import router as query_router

router = APIRouter(prefix="")

router.include_router(collection_router)
router.include_router(documents_router)
# router.include_router(query_router)
