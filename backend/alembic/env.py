import os
import sys
import importlib
from logging.config import fileConfig

from alembic import context
from sqlalchemy import pool
from sqlalchemy.ext.asyncio import async_engine_from_config

# --- Make project root importable (/app) ---
THIS_DIR = os.path.dirname(__file__)
PROJECT_ROOT = os.path.abspath(os.path.join(THIS_DIR, ".."))
if PROJECT_ROOT not in sys.path:
    sys.path.insert(0, PROJECT_ROOT)

# Optional: load .env at project root
try:
    from dotenv import load_dotenv
    load_dotenv(os.path.join(PROJECT_ROOT, ".env"))
except Exception:
    pass

config = context.config

# Logging
if config.config_file_name is not None:
    fileConfig(config.config_file_name)

# --- DB URL from environment ---
db_url = os.getenv("DATABASE_URL")
if not db_url:
    raise RuntimeError("DATABASE_URL is not set in the environment for Alembic.")
config.set_main_option("sqlalchemy.url", db_url)

# --- Find your Base.metadata for autogenerate ---
_TARGET_IMPORT_CANDIDATES = [
    ("app.models", "Base"),
    ("app.db.base", "Base"),
    ("app.database", "Base"),
    ("app.db.models", "Base"),
    ("app.core.models", "Base"),
    ("models", "Base"),
    ("database", "Base"),
]

target_metadata = None
errors = []
for module_name, attr in _TARGET_IMPORT_CANDIDATES:
    try:
        mod = importlib.import_module(module_name)
        Base = getattr(mod, attr)
        target_metadata = Base.metadata
        break
    except Exception as e:
        errors.append(f"{module_name}.{attr}: {type(e).__name__}: {e}")

if target_metadata is None:
    tried = "\n  - ".join(errors)
    raise ImportError(
        "Alembic couldn't locate your SQLAlchemy Base.metadata.\n"
        "Update the import list in alembic/env.py to point to your actual Base.\n"
        "Tried:\n  - " + tried
    )

# --- Offline runner (no DB connection) ---
def run_migrations_offline() -> None:
    url = config.get_main_option("sqlalchemy.url")
    context.configure(
        url=url,
        target_metadata=target_metadata,
        literal_binds=True,
        compare_type=True,
        dialect_opts={"paramstyle": "named"},
    )
    with context.begin_transaction():
        context.run_migrations()

# --- Online runner (async engine, sync migration body) ---
def do_run_migrations(connection) -> None:
    """This runs in a sync context passed by connection.run_sync()."""
    context.configure(
        connection=connection,
        target_metadata=target_metadata,
        compare_type=True,
    )
    with context.begin_transaction():
        context.run_migrations()

async def run_migrations_online() -> None:
    connectable = async_engine_from_config(
        config.get_section(config.config_ini_section, {}),
        prefix="sqlalchemy.",
        poolclass=pool.NullPool,
    )
    async with connectable.connect() as connection:
        # IMPORTANT: run the sync body via run_sync to avoid MissingGreenlet
        await connection.run_sync(do_run_migrations)
    await connectable.dispose()

if context.is_offline_mode():
    run_migrations_offline()
else:
    import asyncio
    asyncio.run(run_migrations_online())
