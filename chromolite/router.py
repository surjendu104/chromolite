from fastapi import APIRouter

from chromolite.analysis.router import router as analysis_router
from chromolite.collection import router as collection_router
from chromolite.documents import router as documents_router

# from chromolite.query import router as query_router

router = APIRouter(prefix="/api")

router.include_router(collection_router)
router.include_router(documents_router)
router.include_router(analysis_router)
# router.include_router(query_router)
