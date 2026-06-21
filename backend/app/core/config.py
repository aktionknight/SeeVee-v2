from pydantic_settings import BaseSettings

class Settings(BaseSettings):
    PROJECT_NAME: str = "SeeVee API"
    DATABASE_URL: str = "postgresql+asyncpg://postgres:postgres@localhost:5432/seevee"

    class Config:
        env_file = ".env"

settings = Settings()
