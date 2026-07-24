from pydantic_settings import BaseSettings

class Settings(BaseSettings):
    PROJECT_NAME: str
    DATABASE_URL: str

    # JWT settings
    SECRET_KEY: str
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 10080  # 7 days

    # Cookie settings (override in .env for production)
    COOKIE_DOMAIN: str = ""              # e.g. ".yourdomain.com" — empty = browser default
    COOKIE_SECURE: bool = False           # Set True in production (HTTPS)
    COOKIE_SAMESITE: str = "lax"          # "lax" for same-domain, "none" for cross-domain (requires Secure)

    # CORS
    FRONTEND_URL: str

    # Google OAuth
    GOOGLE_CLIENT_ID: str
    GOOGLE_CLIENT_SECRET: str
    GOOGLE_REDIRECT_URI: str
    GOOGLE_API_KEY: str

    # Encryption (Fernet key for encrypting stored API keys)
    ENCRYPTION_KEY: str = "change_me_to_a_32_byte_base64_key="

    class Config:
        env_file = ".env"
        extra = "ignore"

settings = Settings()
