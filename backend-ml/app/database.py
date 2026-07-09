import os
import redis
from sqlalchemy.ext.asyncio import create_async_engine, async_sessionmaker, AsyncSession
from sqlalchemy import text
from contextlib import asynccontextmanager

DATABASE_URL = os.getenv(
    "DATABASE_URL", 
    "postgresql+asyncpg://pme_user:pme_password@db:5432/pme_analytix"
)

REDIS_URL = os.getenv("REDIS_URL", "redis://redis:6379/0")
redis_client = redis.from_url(REDIS_URL, decode_responses=True)


# Create an async database engine
engine = create_async_engine(
    DATABASE_URL,
    echo=True, # Echo SQL statements for debugging in development
    pool_pre_ping=True
)

# Async session factory
AsyncSessionLocal = async_sessionmaker(
    bind=engine,
    class_=AsyncSession,
    expire_on_commit=False
)

async def get_db_session(pme_id: int = None) -> AsyncSession:
    """
    Dependency to yield an async database session configured with the correct
    schema path for the specified PME.
    """
    async with AsyncSessionLocal() as session:
        if pme_id:
            # Dynamically resolve schema name from the public PME table
            try:
                # Force search_path to public to query the PME table
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
                
            # Validate schema_name to prevent SQL injection
            import re
            if not re.match(r"^[a-zA-Z0-9_]+$", schema_name):
                raise ValueError("Nom de schéma invalide.")
                
            # Set search path to switch connection scope to the resolved tenant schema
            await session.execute(text(f"SET search_path TO {schema_name}, public"))
        else:
            await session.execute(text("SET search_path TO public"))
            
        yield session
