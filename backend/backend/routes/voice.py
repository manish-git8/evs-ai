"""
Voice API routes — STT (Whisper) and TTS (pyttsx3) endpoints.

POST /voice/transcribe  — Accept audio file, return text transcription.
POST /voice/speak       — Accept text, return speech as WAV audio.
"""

# Fix OMP: Error #15 on Windows (NumPy + PyTorch OpenMP conflict)
import os
os.environ["KMP_DUPLICATE_LIB_OK"] = "TRUE"
os.environ["OMP_NUM_THREADS"] = "1"

import io
import os
import tempfile
import logging
import asyncio
from pathlib import Path

from fastapi import APIRouter, UploadFile, File, HTTPException
from fastapi.responses import StreamingResponse
from pydantic import BaseModel

from config.settings import settings

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/voice", tags=["voice"])

# ─────────────────────────────────────────────────────────
# Lazy-loaded Whisper model (loaded on first request)
# ─────────────────────────────────────────────────────────
_whisper_model = None


def _get_whisper_model():
    """Load Whisper model lazily to avoid startup delay."""
    global _whisper_model
    if _whisper_model is None:
        try:
            import whisper
            logger.info(f"[STT] Loading Whisper model: {settings.WHISPER_MODEL}")
            _whisper_model = whisper.load_model(settings.WHISPER_MODEL)
            logger.info("[STT] Whisper model loaded successfully")
        except Exception as e:
            logger.error(f"[STT] Failed to load Whisper model: {e}")
            raise HTTPException(status_code=503, detail=f"Whisper model not available: {e}")
    return _whisper_model


# ─────────────────────────────────────────────────────────
# STT Endpoint — Whisper transcription
# ─────────────────────────────────────────────────────────

@router.post("/transcribe")
async def transcribe_audio(audio: UploadFile = File(...)):
    """
    Transcribe audio to text using OpenAI Whisper (local).

    Accepts: audio file (WAV, WebM, MP3, OGG, FLAC)
    Returns: {"text": "transcribed text", "language": "en"}
    """
    # Validate file type
    allowed_types = {"audio/wav", "audio/webm", "audio/mp3", "audio/mpeg",
                     "audio/ogg", "audio/flac", "audio/x-wav",
                     "application/octet-stream"}
    content_type = audio.content_type or "application/octet-stream"

    # Read audio data
    audio_data = await audio.read()
    if len(audio_data) < 100:
        raise HTTPException(status_code=400, detail="Audio file too small or empty")

    # Write to temp file (Whisper needs a file path)
    suffix = ".webm" if "webm" in content_type else ".wav"
    tmp_path = None
    try:
        with tempfile.NamedTemporaryFile(suffix=suffix, delete=False) as tmp:
            tmp.write(audio_data)
            tmp_path = tmp.name

        # Run Whisper in a thread to avoid blocking the event loop
        model = _get_whisper_model()
        loop = asyncio.get_event_loop()
        result = await loop.run_in_executor(
            None,
            lambda: model.transcribe(
                tmp_path,
                language="en",
                fp16=False,  # Use FP32 on CPU
            )
        )

        text = (result.get("text") or "").strip()
        language = result.get("language", "en")

        logger.info(f"[STT] Transcribed: '{text}' (lang={language})")

        return {"text": text, "language": language}

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"[STT] Transcription error: {e}")
        raise HTTPException(status_code=500, detail=f"Transcription failed: {e}")
    finally:
        # Clean up temp file
        if tmp_path and os.path.exists(tmp_path):
            try:
                os.unlink(tmp_path)
            except Exception:
                pass


# ─────────────────────────────────────────────────────────
# TTS Endpoint — pyttsx3 speech synthesis
# ─────────────────────────────────────────────────────────

class SpeakRequest(BaseModel):
    text: str


# pyttsx3 is not thread-safe, so we use a lock
_tts_lock = asyncio.Lock()


@router.post("/speak")
async def speak_text(req: SpeakRequest):
    """
    Convert text to speech using pyttsx3 (offline, system voices).

    Accepts: {"text": "Hello, your cart has been approved"}
    Returns: audio/wav streaming response
    """
    text = (req.text or "").strip()
    if not text:
        raise HTTPException(status_code=400, detail="Text is required")

    # Limit text length to prevent abuse
    if len(text) > 2000:
        text = text[:2000]

    tmp_path = None
    try:
        # Generate speech in a temp file
        with tempfile.NamedTemporaryFile(suffix=".wav", delete=False) as tmp:
            tmp_path = tmp.name

        async with _tts_lock:
            loop = asyncio.get_event_loop()
            await loop.run_in_executor(None, _generate_tts, text, tmp_path)

        # Stream the audio file back
        if not os.path.exists(tmp_path) or os.path.getsize(tmp_path) < 100:
            raise HTTPException(status_code=500, detail="TTS generated empty audio")

        def _stream():
            with open(tmp_path, "rb") as f:
                yield f.read()
            # Clean up after streaming
            try:
                os.unlink(tmp_path)
            except Exception:
                pass

        return StreamingResponse(
            _stream(),
            media_type="audio/wav",
            headers={"Content-Disposition": "inline; filename=speech.wav"},
        )

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"[TTS] Speech generation error: {e}")
        if tmp_path and os.path.exists(tmp_path):
            try:
                os.unlink(tmp_path)
            except Exception:
                pass
        raise HTTPException(status_code=500, detail=f"TTS failed: {e}")


def _generate_tts(text: str, output_path: str):
    """Generate TTS audio file using pyttsx3 (runs in thread)."""
    import pyttsx3
    engine = pyttsx3.init()

    # Configure voice properties
    engine.setProperty("rate", 175)    # Speaking rate (words per minute)
    engine.setProperty("volume", 0.9)  # Volume (0.0 to 1.0)

    # Try to use a female voice if available
    voices = engine.getProperty("voices")
    for voice in voices:
        if "female" in voice.name.lower() or "zira" in voice.name.lower():
            engine.setProperty("voice", voice.id)
            break

    engine.save_to_file(text, output_path)
    engine.runAndWait()
    engine.stop()


# ─────────────────────────────────────────────────────────
# Health check
# ─────────────────────────────────────────────────────────

@router.get("/health")
async def voice_health():
    """Check availability of voice services."""
    whisper_ok = _whisper_model is not None
    return {
        "whisper_loaded": whisper_ok,
        "whisper_model": settings.WHISPER_MODEL,
        "tts_engine": settings.TTS_ENGINE,
    }
