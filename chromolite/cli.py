from __future__ import annotations

import getpass
import os
from importlib.metadata import PackageNotFoundError, version
from pathlib import Path

import typer
import uvicorn

from chromolite.connection import (
    ENV_BASIC_PASSWORD,
    ENV_BASIC_USERNAME,
    ENV_TOKEN,
    AuthConfig,
    load_auth_from_env,
    parse_endpoint_url,
)

app = typer.Typer()

UI_HOST = "127.0.0.1"
UI_PORT = 48731
REMOTE_DEFAULT_PORT = 8000


def _resolve_auth(auth: str | None, ask_credentials: bool) -> AuthConfig | None:
    if auth not in (None, "token", "basic"):
        typer.echo(
            f"Error: invalid --auth value {auth!r}. Choose 'token' or 'basic'.",
            err=True,
        )
        raise typer.Exit(code=1)

    auth_type = auth or ("token" if ask_credentials else None)

    if auth_type is None:
        return load_auth_from_env()

    if auth_type == "token":
        if ask_credentials:
            token = getpass.getpass("Chroma auth token: ")
            if not token:
                typer.echo("Error: auth token must not be empty.", err=True)
                raise typer.Exit(code=1)
            return AuthConfig(provider="token", credentials=token)

        token = os.environ.get(ENV_TOKEN)
        if not token:
            typer.echo(
                f"Error: --auth token requires {ENV_TOKEN} to be set, or pass "
                "--ask-credentials to enter it securely.",
                err=True,
            )
            raise typer.Exit(code=1)
        return AuthConfig(provider="token", credentials=token)

    if ask_credentials:
        username = typer.prompt("Chroma username")
        password = getpass.getpass("Chroma password: ")
        if not username or not password:
            typer.echo("Error: username and password must not be empty.", err=True)
            raise typer.Exit(code=1)
        return AuthConfig(provider="basic", credentials=f"{username}:{password}")

    username = os.environ.get(ENV_BASIC_USERNAME)
    password = os.environ.get(ENV_BASIC_PASSWORD)
    if not username or not password:
        typer.echo(
            f"Error: --auth basic requires {ENV_BASIC_USERNAME} and "
            f"{ENV_BASIC_PASSWORD} to be set, or pass --ask-credentials.",
            err=True,
        )
        raise typer.Exit(code=1)
    return AuthConfig(provider="basic", credentials=f"{username}:{password}")


def _start_ui(ui_host: str, ui_port: int) -> None:
    if ui_host not in ("127.0.0.1", "localhost"):
        typer.echo(
            "Warning: exposing the UI beyond localhost. Anyone who can reach "
            f"{ui_host}:{ui_port} can read the connected Chroma data.",
            err=True,
        )

    typer.echo(f"Starting UI at http://{ui_host}:{ui_port}")
    uvicorn.run(
        "chromolite.main:app",
        host=ui_host,
        port=ui_port,
        reload=False,
    )


def _start_local(
    connection,
    path: str,
    tenant: str,
    database: str,
    ui_host: str,
    ui_port: int,
) -> None:
    typer.echo(f"Connecting to local database at {Path(path).resolve()} ...")

    try:
        connection.connect_local(path, tenant=tenant, database=database)
        latency = connection.verify()
        count = connection.probe_collections()
    except ConnectionError as exc:
        typer.echo(f"Error: {exc}", err=True)
        raise typer.Exit(code=1)

    typer.echo(f"  Connected in {latency:.0f} ms, {count} collections")
    _start_ui(ui_host, ui_port)


def _start_remote(
    connection,
    host: str,
    port: int,
    ssl: bool,
    tenant: str,
    database: str,
    auth: AuthConfig | None,
    ui_host: str,
    ui_port: int,
) -> None:
    scheme = "https" if ssl else "http"
    typer.echo(f"Connecting to Chroma at {scheme}://{host}:{port} ...")

    try:
        connection.connect_remote(
            host,
            port,
            ssl=ssl,
            tenant=tenant,
            database=database,
            auth=auth,
        )
        latency = connection.verify()
        count = connection.probe_collections()
    except ConnectionError as exc:
        typer.echo(f"Error: {exc}", err=True)
        raise typer.Exit(code=1)

    auth_label = "configured" if auth else "none"
    typer.echo(
        f"  Connected in {latency:.0f} ms, auth: {auth_label}, {count} collections"
    )
    _start_ui(ui_host, ui_port)


@app.command()
def run(
    path: str | None = typer.Option(
        None,
        help="Path to a local ChromaDB database. Defaults to ./chroma.",
    ),
    url: str | None = typer.Option(
        None,
        help="Full endpoint URL of a remote Chroma server, e.g. https://host:8000.",
    ),
    host: str | None = typer.Option(
        None,
        help="Host of a remote Chroma server (no scheme).",
    ),
    port: int | None = typer.Option(
        None,
        help="Port of a remote Chroma server (default 8000).",
    ),
    ssl: bool = typer.Option(
        False,
        help="Use TLS for the remote connection.",
    ),
    tenant: str = typer.Option("default_tenant", help="Chroma tenant name."),
    database: str = typer.Option("default_database", help="Chroma database name."),
    auth: str | None = typer.Option(
        None,
        help="Authentication method: 'token' or 'basic'. Credentials come from "
        "CHROMA_AUTH_* environment variables or --ask-credentials.",
    ),
    ask_credentials: bool = typer.Option(
        False,
        help="Prompt securely for credentials instead of reading them from the "
        "environment.",
    ),
    ui_host: str = typer.Option(
        UI_HOST,
        help="Host the UI server binds to (default 127.0.0.1).",
    ),
    ui_port: int = typer.Option(
        UI_PORT,
        help="Port the UI server binds to.",
    ),
) -> None:
    """Launch the Chromolite UI connected to a local or remote Chroma server."""

    if not 1 <= ui_port <= 65535:
        typer.echo("Error: --ui-port must be between 1 and 65535.", err=True)
        raise typer.Exit(code=1)
    if port is not None and not 1 <= port <= 65535:
        typer.echo("Error: --port must be between 1 and 65535.", err=True)
        raise typer.Exit(code=1)

    selectors = sum(1 for value in (path, url, host) if value is not None)
    if selectors > 1:
        typer.echo(
            "Error: --path, --url, and --host are mutually exclusive.",
            err=True,
        )
        raise typer.Exit(code=1)
    if selectors == 0:
        path = "./chroma"

    if url is not None and (port is not None or ssl):
        typer.echo(
            "Error: --port and --ssl are derived from --url. Use --host instead.",
            err=True,
        )
        raise typer.Exit(code=1)

    from chromolite.connection import db

    auth_config = _resolve_auth(auth, ask_credentials)

    if path is not None:
        _start_local(db, path, tenant, database, ui_host, ui_port)
        return

    if url is not None:
        try:
            host, port, ssl = parse_endpoint_url(url)
        except ValueError as exc:
            typer.echo(f"Error: {exc}", err=True)
            raise typer.Exit(code=1)
    else:
        host = host.strip() if host else ""
        if not host:
            typer.echo("Error: --host must not be empty.", err=True)
            raise typer.Exit(code=1)
        if "://" in host:
            typer.echo(
                "Error: --host must not include a scheme. Use --url for full URLs.",
                err=True,
            )
            raise typer.Exit(code=1)
        port = port or REMOTE_DEFAULT_PORT

    _start_remote(
        db,
        host,
        port,
        ssl,
        tenant,
        database,
        auth_config,
        ui_host,
        ui_port,
    )


@app.command()
def info() -> None:
    """Show version and connection usage."""
    try:
        installed_version = version("chromolite")
    except PackageNotFoundError:
        installed_version = "unknown"

    typer.echo(f"chromolite {installed_version}")
    typer.echo()
    typer.echo("Local database:")
    typer.echo("  chromolite run --path /path/to/chroma")
    typer.echo()
    typer.echo("Remote Chroma server:")
    typer.echo("  chromolite run --url https://host:8000 --auth token")
    typer.echo("  chromolite run --host host --port 8000 --ssl")
    typer.echo()
    typer.echo("Authentication (never pass secrets as CLI arguments):")
    typer.echo(f"  token: set {ENV_TOKEN}")
    typer.echo(f"  basic: set {ENV_BASIC_USERNAME} and {ENV_BASIC_PASSWORD}")
    typer.echo("  or run with --ask-credentials to enter them interactively")


if __name__ == "__main__":
    app()
