from pathlib import Path

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles

from chromolite.router import router

app = FastAPI(title="chromolite-server")


origins = [
    "http://localhost:5173",
    "http://localhost:48731",
]

app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(router=router)


# mount frontend build
STATIC_DIR = Path(__file__).parent / "static"

app.mount(
    "/",
    StaticFiles(directory=STATIC_DIR, html=True),
    name="frontend",
)


@app.get("/health")
def health():
    return {"status": "ok"}
