import os
import shutil
from typing import Generator
from sqlalchemy import create_engine, event, text, inspect
from sqlalchemy.orm import declarative_base, sessionmaker, Session
from backend.config import settings

DATABASE_URL = settings.database_url

engine = create_engine(
    DATABASE_URL,
    connect_args={
        "check_same_thread": False,
        "timeout": 15.0
    },
    echo=False,
    pool_pre_ping=True
)

@event.listens_for(engine, "connect")
def set_sqlite_pragma(dbapi_connection, connection_record):
    cursor = dbapi_connection.cursor()
    try:
        cursor.execute("PRAGMA foreign_keys=ON")
        cursor.execute("PRAGMA journal_mode=WAL")
        cursor.execute("PRAGMA busy_timeout=10000")
        cursor.execute("PRAGMA synchronous=NORMAL")
    finally:
        cursor.close()

SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
Base = declarative_base()

def get_db() -> Generator[Session, None, None]:
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()

def init_db():
    settings.ensure_db_directory()
    Base.metadata.create_all(bind=engine)
    print(f"[Database] SQLite storage initialized successfully at: {settings.SQLITE_DB_PATH}")

def check_db_health(custom_engine=None):
    active_engine = custom_engine or engine
    db_path = settings.SQLITE_DB_PATH
    exists = os.path.exists(db_path)
    file_size_bytes = os.path.getsize(db_path) if exists else 0
    parent_dir = os.path.dirname(os.path.abspath(db_path))
    
    is_render = bool(os.getenv("RENDER") or os.getenv("RENDER_SERVICE_ID"))
    is_render_disk = db_path.startswith("/var/data")
    
    disk_total, disk_used, disk_free = 0, 0, 0
    try:
        usage = shutil.disk_usage(parent_dir if os.path.exists(parent_dir) else ".")
        disk_total = usage.total
        disk_used = usage.used
        disk_free = usage.free
    except Exception:
        pass

    table_count = len(Base.metadata.tables)
    wal_mode = "wal"
    foreign_keys = True
    try:
        with active_engine.connect() as conn:
            res_wal = conn.execute(text("PRAGMA journal_mode;"))
            wal_mode = res_wal.scalar() or "wal"
            
            res_fk = conn.execute(text("PRAGMA foreign_keys;"))
            foreign_keys = bool(res_fk.scalar())
    except Exception:
        pass

    return {
        "status": "healthy",
        "db_path": db_path,
        "exists": exists,
        "file_size_bytes": file_size_bytes,
        "file_size_kb": round(file_size_bytes / 1024, 2),
        "table_count": table_count,
        "journal_mode": wal_mode,
        "foreign_keys_enabled": foreign_keys,
        "is_render_environment": is_render,
        "using_render_persistent_disk": is_render_disk,
        "disk_free_mb": round(disk_free / (1024 * 1024), 2),
        "disk_total_mb": round(disk_total / (1024 * 1024), 2)
    }
