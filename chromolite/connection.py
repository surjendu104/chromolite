from pathlib import Path

from chromadb import PersistentClient
from chromadb.api import ClientAPI


class ChromaConnection:
    def __init__(self) -> None:
        self.client = None

    def connect(self, path: str | Path) -> ClientAPI | None:
        self.client = PersistentClient(path=path)
        return self.client

    def get_client(self) -> ClientAPI:
        if self.client is None:
            raise RuntimeError("Chroma client not initialized")
        return self.client


db = ChromaConnection()
