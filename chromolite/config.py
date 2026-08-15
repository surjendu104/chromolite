from pathlib import Path

UI_HOST = "127.0.0.1"
UI_PORT = 48731

REMOTE_DEFAULT_PORT = 8000

DEFAULT_DB_PATH = Path.cwd() / "chroma"

STATIC_DIR = Path(__file__).parent / "static"
