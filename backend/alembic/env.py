import os
import sys
from pathlib import Path
from logging.config import fileConfig

from sqlalchemy import engine_from_config, pool
from alembic import context

# --- Ensure your app package is importable -----------------------------------
# Assuming this file lives at: <repo_root>/alembic/env.py
REPO_ROOT = Path(__file__).resolve().parents[1]
CANDIDATE_PATHS = [
    REPO_ROOT,                # e.g. <repo_root>/app
    REPO_ROOT / "backend",    # e.g. <repo_root>/backend/app
    REPO_ROOT / "src",        # optional: <repo_root>/src/app
]
for p in CANDIDATE_PATHS:
    sp = str(p)
    if sp not in sys.path:
        sys.path.insert(0, sp)

# Import your SQLAlchemy Base
# If your models are at backend/app/db/base.py this will work because we just added ./backend
try:
    from app.db.base import Base  # <-- adjust if your package name differs
except ModuleNotFoundError as e:
    raise RuntimeError(
        "Alembic couldn't import 'app.db.base'. "
        "Ensure your package is at one of: ./app, ./backend/app, or ./src/app, "
        "and that each package directory has an __init__.py"
    ) from e
# -----------------------------------------------------------------------------

# Alembic Config object
config = context.config

# Configure logging from alembic.ini if present
if config.config_file_name is not None:
    fileConfig(config.config_file_name)

# Target metadata for autogenerate
target_metadata = Base.metadata


def get_database_url() -> str:
    """Resolve DB URL from env or alembic.ini, normalize scheme."""
    url = os.getenv("DATABASE_URL") or config.get_main_option("sqlalchemy.url")
    if url and url.startswith("postgres://"):
        url = url.replace("postgres://", "postgresql://", 1)
    return url


def run_migrations_offline() -> None:
    """Run migrations in 'offline' mode."""
    url = get_database_url()
    context.configure(
        url=url,
        target_metadata=target_metadata,
        literal_binds=True,
        dialect_opts={"paramstyle": "named"},
    )
    with context.begin_transaction():
        context.run_migrations()


def run_migrations_online() -> None:
    """Run migrations in 'online' mode with a sync engine."""
    configuration = config.get_section(config.config_ini_section) or {}
    configuration["sqlalchemy.url"] = get_database_url()

    connectable = engine_from_config(
        configuration,
        prefix="sqlalchemy.",
        poolclass=pool.NullPool,
    )

    with connectable.connect() as connection:
        context.configure(connection=connection, target_metadata=target_metadata)
        with context.begin_transaction():
            context.run_migrations()


if context.is_offline_mode():
    run_migrations_offline()
else:
    run_migrations_online()
