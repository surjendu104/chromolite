from __future__ import annotations

import os
import time
from pathlib import Path
from urllib.parse import urlsplit

from chromadb import HttpClient, PersistentClient
from chromadb.api import ClientAPI
from chromadb.config import Settings

TOKEN_AUTH_PROVIDER = "chromadb.auth.token_authn.TokenAuthClientProvider"
BASIC_AUTH_PROVIDER = "chromadb.auth.basic_authn.BasicAuthClientProvider"

DEFAULT_TOKEN_TRANSPORT_HEADER = "X-Chroma-Token"

ENV_TOKEN = "CHROMA_AUTH_TOKEN"
ENV_BASIC_USERNAME = "CHROMA_AUTH_BASIC_USERNAME"
ENV_BASIC_PASSWORD = "CHROMA_AUTH_BASIC_PASSWORD"
ENV_TRANSPORT_HEADER = "CHROMA_AUTH_TRANSPORT_HEADER"


class AuthConfig:
    """Chroma authentication settings.

    Credentials are never included in ``repr()``/``str()`` output, so they
    cannot leak into logs or tracebacks.
    """

    def __init__(
        self,
        *,
        provider: str,
        credentials: str,
        transport_header: str | None = None,
    ) -> None:
        if provider not in ("token", "basic"):
            raise ValueError(f"Unsupported auth provider: {provider!r}")
        if not credentials:
            raise ValueError("Auth credentials must not be empty")
        self.provider = provider
        self.credentials = credentials
        self.transport_header = transport_header

    @property
    def is_basic(self) -> bool:
        return self.provider == "basic"

    def __repr__(self) -> str:
        return f"AuthConfig(provider={self.provider!r}, credentials=<redacted>)"


def load_auth_from_env() -> AuthConfig | None:
    """Build an :class:`AuthConfig` from environment variables.

    Returns ``None`` when no credentials are configured. Secrets are read from
    the environment (never from the command line) so they do not leak through
    shell history or process listings.
    """
    if token := os.environ.get(ENV_TOKEN):
        return AuthConfig(
            provider="token",
            credentials=token,
            transport_header=os.environ.get(ENV_TRANSPORT_HEADER),
        )

    username = os.environ.get(ENV_BASIC_USERNAME)
    password = os.environ.get(ENV_BASIC_PASSWORD)
    if username and password:
        return AuthConfig(provider="basic", credentials=f"{username}:{password}")

    return None


def parse_endpoint_url(url: str) -> tuple[str, int, bool]:
    """Parse a Chroma endpoint URL into ``(host, port, ssl)``.

    Rejects URLs that embed credentials, paths, or non-HTTP schemes.
    """
    parsed = urlsplit(url)

    if parsed.scheme not in ("http", "https"):
        raise ValueError(
            f"Unsupported URL scheme {parsed.scheme!r}. Use 'http' or 'https'."
        )
    if parsed.username or parsed.password:
        raise ValueError(
            "URLs must not embed credentials. "
            f"Set {ENV_TOKEN} (or {ENV_BASIC_USERNAME}/{ENV_BASIC_PASSWORD}) instead."
        )
    if parsed.path and parsed.path.strip("/"):
        raise ValueError("URL must not include a path.")

    host = parsed.hostname
    if not host:
        raise ValueError("URL must include a host.")

    port = parsed.port or (443 if parsed.scheme == "https" else 8000)
    return host, port, parsed.scheme == "https"


def _settings_for_auth(auth: AuthConfig | None) -> Settings:
    settings = Settings(anonymized_telemetry=False)

    if auth is None:
        return settings

    if auth.provider == "token":
        settings.chroma_client_auth_provider = TOKEN_AUTH_PROVIDER
        settings.chroma_client_auth_credentials = auth.credentials
        settings.chroma_auth_token_transport_header = (
            auth.transport_header or DEFAULT_TOKEN_TRANSPORT_HEADER
        )
    else:
        settings.chroma_client_auth_provider = BASIC_AUTH_PROVIDER
        settings.chroma_client_auth_credentials = auth.credentials

    return settings


class ChromaConnection:
    def __init__(self) -> None:
        self.client: ClientAPI | None = None
        self.mode: str | None = None

    def connect_local(
        self,
        path: str | Path = "./chroma",
        tenant: str = "default_tenant",
        database: str = "default_database",
    ) -> ClientAPI:
        path = Path(path)

        try:
            path.mkdir(parents=True, exist_ok=True)
        except OSError as exc:
            raise ConnectionError(
                f"Cannot access database directory '{path}': {exc}"
            ) from exc

        self.client = PersistentClient(
            path=str(path),
            settings=Settings(anonymized_telemetry=False),
            tenant=tenant,
            database=database,
        )
        self.mode = "persistent"
        return self.client

    def connect_remote(
        self,
        host: str,
        port: int,
        ssl: bool = False,
        tenant: str = "default_tenant",
        database: str = "default_database",
        auth: AuthConfig | None = None,
    ) -> ClientAPI:
        scheme = "https" if ssl else "http"

        try:
            self.client = HttpClient(
                host=host,
                port=port,
                ssl=ssl,
                settings=_settings_for_auth(auth),
                tenant=tenant,
                database=database,
            )
        except Exception as exc:
            raise ConnectionError(
                f"Could not connect to Chroma at {scheme}://{host}:{port}. "
                "Make sure the server is running and the address is correct."
            ) from exc

        self.mode = "http"
        return self.client

    def get_client(self) -> ClientAPI:
        if self.client is None:
            raise RuntimeError("Chroma client not initialized")
        return self.client

    def verify(self) -> float:
        """Confirm liveness with a heartbeat; returns round-trip latency in ms."""
        client = self.get_client()

        start = time.perf_counter()
        try:
            result = client.heartbeat()
        except Exception as exc:
            raise ConnectionError(
                "Chroma connection check failed: the server did not respond to a "
                "heartbeat. Make sure it is running and the address is correct."
            ) from exc

        latency_ms = (time.perf_counter() - start) * 1000.0

        if not isinstance(result, (int, float)) or result <= 0:
            raise ConnectionError(
                "Chroma connection check failed: unexpected heartbeat response."
            )

        return latency_ms

    def probe_collections(self) -> int:
        """Verify authenticated read access; returns the visible collection count."""
        client = self.get_client()

        try:
            collections = client.list_collections()
        except Exception as exc:
            raise ConnectionError(
                "Connected to Chroma, but the request was denied. Check your "
                f"{ENV_TOKEN} / {ENV_BASIC_USERNAME} / {ENV_BASIC_PASSWORD} "
                "credentials and the server's authentication settings."
            ) from exc

        return len(collections)


db = ChromaConnection()
