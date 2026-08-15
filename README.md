# Chromolite

A lightweight visualizer for ChromaDB databases. Install the Python package, point it at a local ChromaDB path or a remote Chroma server, and get a clean web UI to browse collections, inspect documents, and explore schemas.

## Installation

```bash
pip install chromolite
```

Or with [uv](https://docs.astral.sh/uv/):

```bash
uv pip install chromolite
```

## Quick Start

Point at a local ChromaDB database:

```bash
chromolite run --path='/path/to/chroma'
```

Or connect to a remote Chroma server:

```bash
chromolite run --url https://my-chroma.example.com:8000
```

By default the UI starts at `http://127.0.0.1:48731` and binds to localhost only.

## Connecting to a remote server

`chromolite run` supports three mutually exclusive target options. If none are
given it defaults to `--path ./chroma`.

| Option | Description |
|--------|-------------|
| `--path <dir>` | Local ChromaDB persistent database |
| `--url <url>` | Full endpoint URL (`http(s)://host:port`); `ssl` is derived from the scheme |
| `--host <host>` | Remote server host; pair with `--port` and `--ssl` |

Remote connection options:

| Option | Default | Description |
|--------|---------|-------------|
| `--port <port>` | `8000` | Remote server port (when using `--host`) |
| `--ssl` | `false` | Enable TLS for the remote connection |
| `--tenant` | `default_tenant` | Chroma tenant name |
| `--database` | `default_database` | Chroma database name |
| `--auth <token\|basic>` | env detection | Authentication method |
| `--ask-credentials` | `false` | Prompt securely for credentials |
| `--ui-host` | `127.0.0.1` | Host the UI server binds to |
| `--ui-port` | `48731` | Port the UI server binds to |

Before the UI starts, chromolite checks the connection (heartbeat + a
collection listing) and only launches the frontend if everything is healthy.

## Authentication & security

- **Never pass secrets as CLI arguments.** They would appear in shell history
  and process listings. Credentials are read from environment variables or an
  interactive prompt (`--ask-credentials`, hidden input).
- **Token auth** — set `CHROMA_AUTH_TOKEN` (sent via the `X-Chroma-Token`
  header by default; override with `CHROMA_AUTH_TRANSPORT_HEADER`).
- **Basic auth** — set `CHROMA_AUTH_BASIC_USERNAME` and
  `CHROMA_AUTH_BASIC_PASSWORD`.
- **URLs must not embed credentials** — `https://user:pass@host` is rejected.
- **Secrets are redacted** in logs, error messages, and connection info.
- **Use `--ssl` for remote connections** so data is encrypted in transit.
- The UI server binds to `127.0.0.1` by default; exposing it beyond localhost
  (`--ui-host 0.0.0.0`) lets anyone who can reach it read the connected data.
- Chroma telemetry is disabled (`anonymized_telemetry=False`).

## Features

- **Collection Browser** — sidebar listing of all collections with quick navigation
- **Dashboard** — document count, schema keys, active indexes, HNSW configuration at a glance
- **Schema Explorer** — table view of every key, its data type, index type, and active status
- **Document Viewer** — paginated document table with configurable page sizes (10–100), slide-in detail panel showing ID, content, and metadata as formatted JSON

## Tech Stack

| Layer | Technology |
|-------|------------|
| Backend | Python 3.14, FastAPI, ChromaDB, Typer, Uvicorn |
| Frontend | React 19, TypeScript, Vite, Tailwind CSS v4, Zustand |

## Project Structure

```
chromolite/
├── chromolite/
│   ├── cli.py            # CLI entry point (typer)
│   ├── main.py           # FastAPI app + static file serving
│   ├── connection.py     # Local/remote Chroma client + auth + verification
│   ├── collection.py     # Collection CRUD endpoints
│   ├── documents.py      # Paginated document endpoints
│   ├── query.py          # Similarity search endpoint
│   ├── config.py         # Host/port/path defaults
│   ├── router.py         # Route aggregator
│   └── static/           # Built frontend assets
├── frontend/
│   └── src/
│       ├── components/   # React UI panels
│       ├── service/      # API client functions
│       ├── store/        # Zustand state management
│       └── mappers/      # DTO → frontend type mappers
├── pyproject.toml
└── README.md
```

## API Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| `GET` | `/collections` | List all collections |
| `GET` | `/collections/{name}` | Get collection details + schema |
| `POST` | `/collections` | Create a collection |
| `DELETE` | `/collections/` | Delete a collection |
| `GET` | `/collections/{name}/documents?page=&page_size=` | Paginated documents |
| `GET` | `/health` | Health check |

## Roadmap

- [x] CLI support for Chroma HTTP client (connect to remote instances)
- [ ] Connection management through the UI
- [ ] Create collections, databases, and tenants from the UI
- [ ] Export documents and collections

## License

MIT
