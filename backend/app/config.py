from functools import lru_cache

from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    # App
    app_name: str = "Decision Arena API"
    debug: bool = False
    environment: str = "production"
    port: int = 8000

    # Security
    allowed_origins: str = "http://localhost:3000"
    secret_key: str = "change-me-in-production-use-random-256-bit-key"

    # Clerk
    clerk_secret_key: str
    clerk_webhook_secret: str = ""

    # Supabase
    supabase_url: str
    supabase_service_key: str  # service role key (NOT anon key — needed for admin ops)

    # AI
    gemini_api_key: str = ""
    openai_api_key: str | None = None
    groq_api_key: str = ""
    groq_model: str = "llama-3.1-8b-instant"
    ollama_base_url: str = "http://localhost:11434"
    ollama_model: str = "qwen2.5:14b"
    primary_llm: str = "groq"  # groq | ollama | gemini | openai

    # LLM parameters
    llm_temperature: float = 0.85
    llm_max_tokens: int = 350
    debate_max_messages_per_stage: int = 4

    # Rate limiting
    free_tier_daily_limit: int = 3
    max_panel_size: int = 6
    min_panel_size: int = 2

    # Redis (optional)
    redis_url: str | None = None

    class Config:
        env_file = ".env"
        env_file_encoding = "utf-8"

    @property
    def allowed_origins_list(self) -> list[str]:
        return [o.strip() for o in self.allowed_origins.split(",")]


@lru_cache
def get_settings() -> Settings:
    return Settings()
