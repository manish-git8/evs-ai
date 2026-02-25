"""
Application settings and environment configuration.

This module loads and provides access to all environment variables
and configuration settings used throughout the application.
"""

import os
from typing import List
from dotenv import load_dotenv

# Load environment variables from .env file
load_dotenv()


class Settings:
    """Application settings loaded from environment variables."""
    
    # SMTP Email Configuration
    SMTP_SERVER: str = "smtp.gmail.com"
    SMTP_PORT: int = 587
    SMTP_USERNAME: str = os.getenv("SMTP_USERNAME", "")
    SMTP_PASSWORD: str = os.getenv("SMTP_PASSWORD", "")
    ADMIN_EMAIL: str = os.getenv("ADMIN_EMAIL", "")
    
    # CORS Configuration
    CORS_ORIGINS: List[str] = [
        "http://localhost:3000",
        "http://127.0.0.1:3000"
    ]
    
    # Pattern Configuration
    PATTERN_FILE_PATH: str = "patterns.json"
    
    # Server Configuration
    HOST: str = "0.0.0.0"
    PORT: int = 8000
    
    # Rate Limiting Configuration (requests per minute)
    # Voice conversations consume 2-3 API calls per exchange, so limits are generous
    RATE_LIMIT_CHAT: str = os.getenv("RATE_LIMIT_CHAT", "120/minute")
    RATE_LIMIT_CART: str = os.getenv("RATE_LIMIT_CART", "60/minute")
    RATE_LIMIT_TICKET: str = os.getenv("RATE_LIMIT_TICKET", "5/minute")
    
    # Logging Configuration
    LOG_LEVEL: str = os.getenv("LOG_LEVEL", "INFO")
    LOG_FILE: str = os.getenv("LOG_FILE", "logs/app.log")
    
    # Voice Assistant Configuration
    VOICE_SESSION_TIMEOUT: int = int(os.getenv("VOICE_SESSION_TIMEOUT", "120"))  # seconds
    
    # Procurement API Configuration
    PROCUREMENT_API_BASE: str = os.getenv("PROCUREMENT_API_BASE", "http://procurement-api.internal")
    API_TIMEOUT: int = int(os.getenv("API_TIMEOUT", "10"))
    
    # LLM Configuration (Ollama + Mistral)
    LLM_ENABLED: bool = os.getenv("LLM_ENABLED", "true").lower() == "true"
    OLLAMA_BASE_URL: str = os.getenv("OLLAMA_BASE_URL", "http://localhost:11434")
    OLLAMA_MODEL: str = os.getenv("OLLAMA_MODEL", "mistral")
    LLM_TIMEOUT: int = int(os.getenv("LLM_TIMEOUT", "8"))  # seconds
    
    # Whisper STT Configuration
    WHISPER_MODEL: str = os.getenv("WHISPER_MODEL", "tiny.en")
    
    # TTS Configuration
    TTS_ENGINE: str = os.getenv("TTS_ENGINE", "pyttsx3")  # "pyttsx3" or "piper"


# Create a singleton instance
settings = Settings()
