# Chromolite

A lightweight visualizer for local ChromaDB databases. Install the Python package, point it at your ChromaDB path, and get a clean web UI to browse collections, inspect documents, and explore schemas.

## Installation

```bash
pip install chromolite
```

Or with [uv](https://docs.astral.sh/uv/):

```bash
uv pip install chromolite
```

## Quick Start

```bash
chromolite run --path='/path/to/chroma'
```

This starts the server at `http://127.0.0.1:8080` and opens your ChromaDB instance in the browser.

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
│   ├── connection.py     # ChromaDB PersistentClient wrapper
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

- [ ] CLI support for Chroma HTTP client (connect to remote instances)
- [ ] Connection management through the UI
- [ ] Create collections, databases, and tenants from the UI
- [ ] Export documents and collections

## License

MIT
