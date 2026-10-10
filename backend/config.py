import os
from pydantic_settings import BaseSettings

class Settings(BaseSettings):
    APP_NAME: str = "VolleyPro Tournament System"
    ENV: str = os.getenv("ENV", "development")
    
    # SQLite Persistent Storage configuration
    # Render persistent disk path: /var/data/volleyball.db
    # Local fallback path: ./data/volleyball.db
    SQLITE_DB_PATH: str = os.getenv("SQLITE_DB_PATH", os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "data", "volleyball.db")))
    
    # Scorer and admin security PIN / Key
    SCORER_PIN: str = os.getenv("SCORER_PIN", "1234")
    ADMIN_SECRET: str = os.getenv("ADMIN_SECRET", "volleypro_secret_key_2026")
    
    CORS_ORIGINS: str = os.getenv("CORS_ORIGINS", "*")
    PORT: int = int(os.getenv("PORT", "8000"))
    HOST: str = os.getenv("HOST", "0.0.0.0")

    def ensure_db_directory(self) -> str:
        db_path = os.path.abspath(self.SQLITE_DB_PATH)
        parent_dir = os.path.dirname(db_path)
        if parent_dir and not os.path.exists(parent_dir):
            try:
                os.makedirs(parent_dir, exist_ok=True)
            except Exception as e:
                print(f"[Storage Warning] Could not create directory {parent_dir}: {e}")
        return db_path

    @property
    def database_url(self) -> str:
        db_path = self.ensure_db_directory()
        return f"sqlite:///{db_path}"

settings = Settings()
