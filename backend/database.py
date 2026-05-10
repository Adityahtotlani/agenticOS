from sqlalchemy import create_engine, text
from sqlalchemy.orm import declarative_base, sessionmaker
from config import settings

engine = create_engine(
    settings.database_url,
    connect_args={"check_same_thread": False} if "sqlite" in settings.database_url else {}
)
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
Base = declarative_base()


def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


# Lightweight idempotent column additions for SQLite, since we don't ship Alembic.
# Each entry: (table, column, SQL fragment for the ALTER).
_PATCHES = [
    ("agents", "mcp_server_ids", "ALTER TABLE agents ADD COLUMN mcp_server_ids JSON DEFAULT '[]'"),
    ("agents", "knowledge_base_id", "ALTER TABLE agents ADD COLUMN knowledge_base_id INTEGER"),
    ("agents", "system_prompt", "ALTER TABLE agents ADD COLUMN system_prompt TEXT"),
    ("agents", "budget_usd", "ALTER TABLE agents ADD COLUMN budget_usd FLOAT"),
    ("agents", "spent_usd", "ALTER TABLE agents ADD COLUMN spent_usd FLOAT DEFAULT 0.0"),
]


def apply_lightweight_migrations() -> None:
    if "sqlite" not in settings.database_url:
        return
    with engine.connect() as conn:
        for table, column, ddl in _PATCHES:
            exists = conn.execute(
                text(f"SELECT 1 FROM sqlite_master WHERE type='table' AND name='{table}'")
            ).first()
            if not exists:
                continue
            cols = [row[1] for row in conn.execute(text(f"PRAGMA table_info({table})")).all()]
            if column not in cols:
                conn.execute(text(ddl))
                conn.commit()
