# pyright: reportMissingImports=false
import os
import re
import redis.asyncio as aioredis
from sqlalchemy.ext.asyncio import create_async_engine, async_sessionmaker, AsyncSession
from sqlalchemy import text

# ── Environment ────────────────────────────────────────────────────────────────
DATABASE_URL = os.getenv(
    "DATABASE_URL",
    "postgresql+asyncpg://pme_user:pme_password@db:5432/pme_analytix"
)
REDIS_URL = os.getenv("REDIS_URL", "redis://redis:6379/0")

# ── Redis async client ─────────────────────────────────────────────────────────
# PERF FIX: use redis.asyncio instead of synchronous redis-py.
# Synchronous Redis calls block FastAPI's event loop on every cache hit/miss,
# introducing latency proportional to Redis RTT for every concurrent request.
# With redis.asyncio, I/O is yielded to the event loop and can be multiplexed
# across hundreds of concurrent connections without thread overhead.
redis_client = aioredis.from_url(REDIS_URL, decode_responses=True)

# ── SQLAlchemy Async Engine ────────────────────────────────────────────────────
# PERF FIX: disable echo in production — SQL logging to stdout is a synchronous
# I/O operation that serialises log writes and adds measurable CPU overhead at
# high query rates (>1k QPS it can consume 5-10% of total CPU).
# PERF FIX: explicit pool sizing.
#   pool_size=20  — concurrent connections held open; tune to DB max_connections.
#   max_overflow=10 — burst headroom above pool_size before requests queue.
#   pool_timeout=30 — raise immediately after 30 s instead of blocking forever.
#   pool_recycle=1800 — recycle idle connections every 30 min to avoid stale TCP.
engine = create_async_engine(
    DATABASE_URL,
    echo=False,
    pool_pre_ping=True,
    pool_size=20,
    max_overflow=10,
    pool_timeout=30,
    pool_recycle=1800,
)

# ── Session Factory ────────────────────────────────────────────────────────────
AsyncSessionLocal = async_sessionmaker(
    bind=engine,
    class_=AsyncSession,
    expire_on_commit=False
)

# Pre-compiled schema name validator — compiled once at import time, not per request.
_SCHEMA_RE = re.compile(r"^[a-zA-Z0-9_]+$")


async def get_db_session(pme_id: int = None) -> AsyncSession:
    """
    Dependency that yields an async database session scoped to the correct
    PostgreSQL tenant schema for the specified PME.

    The search_path is always reset in the finally block so that the pooled
    connection is clean when returned.
    """
    async with AsyncSessionLocal() as session:
        try:
            if pme_id:
                # Resolve tenant schema from the public routing table.
                try:
                    await session.execute(text("SET search_path TO public"))
                    result = await session.execute(
                        text("SELECT nom_schema, plan FROM core_pme WHERE id = :pme_id"),
                        {"pme_id": pme_id}
                    )
                    row = result.first()
                    if row:
                        schema_name, plan = row
                        session.info['pme_plan'] = plan
                    else:
                        schema_name = f"tenant_{pme_id}"
                        session.info['pme_plan'] = 'starter'
                except Exception:
                    schema_name = f"tenant_{pme_id}"
                    session.info['pme_plan'] = 'starter'

                # Guard against SQL injection — pattern compiled at module level.
                if not _SCHEMA_RE.match(schema_name):
                    raise ValueError("Nom de schéma invalide.")

                await session.execute(text(f"SET search_path TO {schema_name}, public"))
            else:
                await session.execute(text("SET search_path TO public"))

            yield session
        finally:
            # Critical: always reset so the pooled connection is not contaminated.
            try:
                await session.execute(text("RESET search_path"))
            except Exception:
                pass
