import os

from sqlalchemy import create_engine
from sqlalchemy.orm import declarative_base, sessionmaker


_raw_db_url = os.getenv("DATABASE_URL")
DATABASE_URL = (_raw_db_url.strip() if _raw_db_url and _raw_db_url.strip() else "sqlite:///./app.db")
IS_SQLITE = DATABASE_URL.lower().startswith("sqlite")


def _bool_env(name: str, default: bool) -> bool:
    v = os.getenv(name)
    if v is None:
        return default
    return v.strip().lower() in {"1", "true", "yes", "y", "on"}


connect_args = {"check_same_thread": False} if IS_SQLITE else {}
engine = create_engine(
    DATABASE_URL,
    connect_args=connect_args,
    pool_pre_ping=True,
)

SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
Base = declarative_base()


def init_db() -> None:
    """Optional dev convenience.

    For SQLite we default to creating tables automatically.
    For Postgres/MySQL/etc you should run Alembic migrations instead.
    """

    auto_create = _bool_env("DB_AUTO_CREATE", default=IS_SQLITE)
    if auto_create:
        Base.metadata.create_all(bind=engine)


def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()