from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    anthropic_api_key: str
    database_url: str = "sqlite:////app/data/agenticios.db"
    debug: bool = False
    allowed_origins: str = "http://localhost:3000"
    secret_key: str = "change-me-in-production"
    access_token_expire_minutes: int = 60 * 24 * 7  # 1 week

    class Config:
        env_file = ".env"


settings = Settings()
