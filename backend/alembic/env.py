# filepath: backend/alembic/env.py
import asyncio
import os
from logging.config import fileConfig

from sqlalchemy import pool
from sqlalchemy.ext.asyncio import async_engine_from_config
from alembic import context

# ---------------------------------------------------------------------------
# Alembic Config
# ---------------------------------------------------------------------------
config = context.config

# Interpret the config file for Python logging.
# This sets up loggers basically.
if config.config_file_name is not None:
    fileConfig(config.config_file_name)

# Import your application's metadata here so 'autogenerate' works.
# Make sure app.db.base imports/aggregates all your models.
from app.db.base import Base  # noqa: E402

target_metadata = Base.metadata


def _coerce_async_driver(url: str | None) -> str | None:
    """
    Ensure the URL uses the async driver for PostgreSQL.
    Railway often provides DATABASE_URL like 'postgresql://...'
    but async engine requires 'postgresql+asyncpg://...'
    """
    if not url:
        return url
    if url.startswith("postgresql://"):
        return url.replace("postgresql://", "postgresql+asyncpg://", 1)
    # If already async (postgresql+asyncpg://), leave it.
    return url


def run_migrations_offline() -> None:
    """
    Run migrations in 'offline' mode.
    This configures the context with just a URL and not an Engine,
    though an Engine is acceptable here as well.
    """
    # Prefer env var if present, else ini option.
    url = os.environ.get("DATABASE_URL") or config.get_main_option("sqlalchemy.url")
    url = _coerce_async_driver(url)

    # In offline mode we still pass a (possibly async) URL string.
    context.configure(
        url=url,
        target_metadata=target_metadata,
        literal_binds=True,
        compare_type=True,
        compare_server_default=True,
    )

    with context.begin_transaction():
        context.run_migrations()


def _configure_context_with_connection(connection):
    """
    Helper to configure Alembic with a live connection.
    """
    context.configure(
        connection=connection,
        target_metadata=target_metadata,
        compare_type=True,
        compare_server_default=True,
    )


def do_run_migrations(connection):
    _configure_context_with_connection(connection)
    with context.begin_transaction():
        context.run_migrations()


async def run_migrations_online() -> None:
    """
    Run migrations in 'online' mode using an ASYNC engine.
    """
    # Get the [alembic] section dict correctly for async_engine_from_config
    section = config.get_section(config.config_ini_section) or {}

    # Work out the final URL (env var wins) and coerce to async driver if needed
    url = os.environ.get("DATABASE_URL") or section.get("sqlalchemy.url") or config.get_main_option("sqlalchemy.url")
    url = _coerce_async_driver(url)
    section["sqlalchemy.url"] = url

    connectable = async_engine_from_config(
        section,
        prefix="sqlalchemy.",
        poolclass=pool.NullPool,
    )

    async with connectable.connect() as connection:
        await connection.run_sync(do_run_migrations)

    await connectable.dispose()


if context.is_offline_mode():
    run_migrations_offline()
else:
    asyncio.run(run_migrations_online())
