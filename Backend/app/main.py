from fastapi import FastAPI, Depends, HTTPException, Request, UploadFile, File, BackgroundTasks
from fastapi.middleware.cors import CORSMiddleware
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from fastapi.exceptions import RequestValidationError
from fastapi.responses import JSONResponse
from fastapi.staticfiles import StaticFiles
from starlette.middleware.trustedhost import TrustedHostMiddleware
import os
from pathlib import Path
from threading import Lock

from dotenv import load_dotenv
from sqlalchemy.orm import Session
from jose import jwt, JWTError
from typing import List
from .schemas import HelpRequestItem
from .schemas import HelpRequestDetail
from .schemas import UpdateRequestStatus
from .schemas import VolunteerApplyResponse
from typing import List
from .schemas import OpenRequestItem
from datetime import datetime, timezone, timedelta
from .schemas import AcceptRequestResponse
from .schemas import VolunteerMyItem, VolunteerUpdateStatus, VolunteerRequestDetail
from .schemas import CreateReview, VolunteerRating
from sqlalchemy.orm import Session, aliased
from fastapi import Query
from .schemas import ReviewFeedItem, VolunteerReviewItem, ReviewsStats, LocationIn, LocationUpdateResponse, HospitalItem, VolunteerGeoUpdate, NearbyVolunteer, NearbyRequest, GeoSearchParams, VideoItem
from sqlalchemy import func
from sqlalchemy import text
import httpx


# Load env vars from Backend/.env (local dev convenience).
# This must run before importing modules that read env (db/security).
_BASE_DIR = Path(__file__).resolve().parents[1]
load_dotenv(dotenv_path=_BASE_DIR / ".env", override=False)


from .db import Base, engine, get_db, init_db, SessionLocal
from .models import User, HelpRequest, PushToken, NotificationPrefs, ChatMessage, AiJob
from .schemas import (
    RegisterRequest,
    LoginRequest,
    TokenResponse,
    MeResponse,
    UpdateMeRequest,
    CreateHelpRequest,
    HelpRequestResponse,
    PushTokenIn,
    PushTestIn,
    NotificationPrefsIn,
    ChatSendIn,
    ChatMessageOut,
    AiTriageIn,
    AiTriageOut,
    AiJobCreateOut,
    AiJobStatusOut,
)
from .security import (
    hash_password,
    verify_password,
    create_token,
    SECRET_KEY,
    ALGORITHM,
)

from .i18n import set_request_language, reset_lang, tr

import time
import json
import uuid
import base64
from collections import defaultdict, deque


def _bool_env(name: str, default: bool = False) -> bool:
    v = os.getenv(name)
    if v is None:
        return default
    return v.strip().lower() in {"1", "true", "yes", "y", "on"}


def _csv_env(name: str, default: list[str]) -> list[str]:
    raw = os.getenv(name, "")
    values = [x.strip() for x in raw.split(",") if x.strip()]
    return values if values else default


def _int_env(name: str, default: int, min_value: int | None = None, max_value: int | None = None) -> int:
    try:
        value = int(str(os.getenv(name, default)).strip())
    except Exception:
        value = default
    if min_value is not None:
        value = max(min_value, value)
    if max_value is not None:
        value = min(max_value, value)
    return value


def _safe_reaction_minutes(created_at: datetime | None, accepted_at: datetime | None) -> int | None:
    if not created_at or not accepted_at:
        return None
    try:
        c = created_at
        a = accepted_at
        # Normalize tz-awareness mismatch that can happen between DB/default timestamps.
        if c.tzinfo is None and a.tzinfo is not None:
            c = c.replace(tzinfo=timezone.utc)
        elif c.tzinfo is not None and a.tzinfo is None:
            a = a.replace(tzinfo=timezone.utc)
        delta = a - c
        return max(0, int(delta.total_seconds() // 60))
    except Exception:
        return None


DEFAULT_CORS_ORIGINS = [
    "http://127.0.0.1:5500",
    "http://localhost:5500",
    "http://127.0.0.1:5501",
    "http://localhost:5501",
    "http://127.0.0.1:8000",
    "http://localhost:8000",
    "https://tayan.help",
    "https://www.tayan.help",
]

MAX_BODY_BYTES = _int_env("MAX_BODY_BYTES", 5 * 1024 * 1024, min_value=64 * 1024, max_value=25 * 1024 * 1024)
MAX_AVATAR_BYTES = _int_env("MAX_AVATAR_BYTES", 2 * 1024 * 1024, min_value=128 * 1024, max_value=8 * 1024 * 1024)
GLOBAL_RATE_LIMIT_RPM = _int_env("GLOBAL_RATE_LIMIT_RPM", 240, min_value=30, max_value=3000)
AUTH_RATE_LIMIT_RPM = _int_env("AUTH_RATE_LIMIT_RPM", 20, min_value=3, max_value=300)
AI_RATE_LIMIT_RPM = _int_env("AI_RATE_LIMIT_RPM", 12, min_value=2, max_value=120)
TRUSTED_HOSTS = _csv_env("TRUSTED_HOSTS", ["127.0.0.1", "localhost"])
CORS_ALLOW_ORIGINS = _csv_env("CORS_ALLOW_ORIGINS", DEFAULT_CORS_ORIGINS)
# Allow common hosted frontend domains (Render/Vercel) without manual per-domain updates.
_DEFAULT_CORS_ALLOW_ORIGIN_REGEX = r"^https://([a-z0-9-]+\.)?vercel\.app$|^https://frontend-[a-z0-9-]+\.onrender\.com$|^https://(www\.)?tayan\.help$"
_cors_regex_raw = os.getenv("CORS_ALLOW_ORIGIN_REGEX")
CORS_ALLOW_ORIGIN_REGEX = (
    _cors_regex_raw.strip()
    if _cors_regex_raw and _cors_regex_raw.strip()
    else _DEFAULT_CORS_ALLOW_ORIGIN_REGEX
)

ALLOWED_AVATAR_MIME_TO_EXT = {
    "image/jpeg": ".jpg",
    "image/jpg": ".jpg",
    "image/png": ".png",
    "image/webp": ".webp",
}

_RATE_LIMIT_LOCK = Lock()
_RATE_LIMIT_BUCKETS: dict[str, deque[float]] = defaultdict(deque)


app = FastAPI()

if _bool_env("DB_AUTO_CREATE", False):
    init_db()

EXPO_PUSH_URL = "https://exp.host/--/api/v2/push/send"
HOSPITAL_CACHE_TTL_SEC = int(os.getenv("HOSPITAL_CACHE_TTL_SEC", "60"))
HOSPITAL_CACHE = {}

UPLOADS_DIR = Path(__file__).resolve().parent / "uploads"
UPLOADS_DIR.mkdir(parents=True, exist_ok=True)
AVATARS_DIR = UPLOADS_DIR / "avatars"
AVATARS_DIR.mkdir(parents=True, exist_ok=True)
app.mount("/static", StaticFiles(directory=str(UPLOADS_DIR)), name="static")


def _can_access_request_chat(u: User, r: HelpRequest) -> bool:
    if not u or not r:
        return False

    if int(r.user_id) == int(u.id):
        return True
    if r.accepted_by and int(r.accepted_by) == int(u.id):
        return True
    return False


def _ensure_prefs_row(db: Session, user_id: int) -> NotificationPrefs:
    row = db.query(NotificationPrefs).filter(NotificationPrefs.user_id == user_id).first()
    if row:
        return row
    row = NotificationPrefs(user_id=user_id)
    db.add(row)
    db.flush()
    return row


def _get_prefs_map(db: Session, user_ids: list[int]) -> dict[int, NotificationPrefs]:
    if not user_ids:
        return {}
    rows = db.query(NotificationPrefs).filter(NotificationPrefs.user_id.in_(user_ids)).all()
    return {int(r.user_id): r for r in rows if getattr(r, "user_id", None) is not None}


def _get_push_token_map(db: Session, user_ids: list[int]) -> dict[int, str]:
    if not user_ids:
        return {}
    rows = db.query(PushToken).filter(PushToken.user_id.in_(user_ids)).all()
    out: dict[int, str] = {}
    for r in rows:
        tok = getattr(r, "token", None)
        uid = getattr(r, "user_id", None)
        if uid is None or not tok:
            continue
        out[int(uid)] = str(tok)
    return out


def _help_request_detail_payload(db: Session, r: HelpRequest) -> dict:
    volunteer_name = None
    volunteer_phone = None
    accepted_by = getattr(r, "accepted_by", None)
    if accepted_by:
        try:
            v = db.query(User).filter(User.id == accepted_by).first()
            if v:
                volunteer_name = v.name
                volunteer_phone = v.phone
        except Exception:
            # Keep payload usable even if volunteer lookup fails.
            volunteer_name = None
            volunteer_phone = None

    return {
        "id": r.id,
        "kind": r.kind,
        "status": r.status,
        "created_at": r.created_at,
        "severity": getattr(r, "severity", None),
        "symptoms": r.symptoms,
        "comments": r.comments,
        "accepted_by": accepted_by,
        "accepted_at": r.accepted_at,
        "volunteer_name": volunteer_name,
        "volunteer_phone": volunteer_phone,
        "volunteer_lat": r.volunteer_lat,
        "volunteer_lng": r.volunteer_lng,
        "lat": r.lat,
        "lng": r.lng,
        "address": r.address,
        "in_progress_at": r.in_progress_at,
        "completed_at": r.completed_at,
        "canceled_at": r.canceled_at,
        "reaction_minutes": _safe_reaction_minutes(r.created_at, r.accepted_at),
        "rating": r.rating,
        "review_text": r.review_text,
        "reviewed_at": r.reviewed_at,
    }


def _send_expo_push(
    tokens: list[str],
    title: str,
    body: str,
    data: dict | None = None,
    db: Session | None = None,
    token_to_user_id: dict[str, int] | None = None,
):
    if not tokens:
        return

    headers = {"Accept": "application/json", "Content-Type": "application/json"}
    # Expo recommends up to 100 messages per request.
    chunk_size = 100
    for i in range(0, len(tokens), chunk_size):
        chunk = tokens[i : i + chunk_size]
        payload = []
        for t in chunk:
            payload.append({
                "to": t,
                "title": title,
                "body": body,
                "sound": "default",
                "data": data or {},
            })
        try:
            resp = httpx.post(EXPO_PUSH_URL, json=payload, headers=headers, timeout=10.0)
            if not db:
                continue

            # Expo can return HTTP 200 with per-message errors in body.
            if resp.status_code >= 400:
                continue

            try:
                body_json = resp.json()
            except Exception:
                body_json = {}

            results = body_json.get("data") if isinstance(body_json, dict) else []
            if not isinstance(results, list):
                results = []

            invalid_tokens: list[str] = []
            for token, item in zip(chunk, results):
                if not isinstance(item, dict):
                    continue
                if item.get("status") != "error":
                    continue
                details = item.get("details") if isinstance(item.get("details"), dict) else {}
                expo_err = details.get("error")
                msg = item.get("message")
                if expo_err == "DeviceNotRegistered" or (isinstance(msg, str) and "DeviceNotRegistered" in msg):
                    invalid_tokens.append(token)

            if invalid_tokens:
                try:
                    (
                        db.query(PushToken)
                        .filter(PushToken.token.in_(invalid_tokens))
                        .delete(synchronize_session=False)
                    )
                    db.commit()
                except Exception:
                    try:
                        db.rollback()
                    except Exception:
                        pass
        except Exception:
            # Best-effort: do not fail core API calls because push failed.
            pass


def _send_resend_email(to_email: str, subject: str, html: str) -> None:
    api_key = (os.getenv("RESEND_API_KEY") or "").strip()
    email_from = (os.getenv("EMAIL_FROM") or "").strip()
    if not api_key or not email_from:
        return

    payload = {
        "from": email_from,
        "to": [to_email],
        "subject": subject,
        "html": html,
    }
    headers = {
        "Authorization": f"Bearer {api_key}",
        "Content-Type": "application/json",
    }
    try:
        resp = httpx.post("https://api.resend.com/emails", json=payload, headers=headers, timeout=12.0)
        if resp.status_code >= 400 and _bool_env("AI_DEBUG", False):
            print(f"[MAIL_DBG] Resend failed status={resp.status_code} body={resp.text[:500]}")
    except Exception as e:
        if _bool_env("AI_DEBUG", False):
            print(f"[MAIL_DBG] Resend exception: {e}")


def _public_url(request: Request, url_or_path: str | None) -> str | None:
    if not url_or_path:
        return None
    v = str(url_or_path)
    if v.startswith("data:"):
        return v
    if v.startswith("/"):
        return str(request.base_url).rstrip("/") + v
    return v


@app.get("/videos", response_model=List[VideoItem])
def list_videos():
    p = Path(__file__).resolve().parent / "videos.json"
    if not p.exists():
        return []

    try:
        # Accept UTF-8 with or without BOM (PowerShell often writes BOM by default).
        raw = json.loads(p.read_text(encoding="utf-8-sig"))
        if not isinstance(raw, list):
            return []

        items = []
        for x in raw:
            if not isinstance(x, dict):
                continue
            try:
                items.append(VideoItem(**x))
            except Exception:
                continue

        return items
    except Exception:
        return []


@app.middleware("http")
async def language_middleware(request: Request, call_next):
    token = set_request_language(request)
    try:
        return await call_next(request)
    finally:
        reset_lang(token)


@app.exception_handler(HTTPException)
async def http_exception_handler(request: Request, exc: HTTPException):
    content = {"detail": exc.detail}
    if isinstance(exc.detail, str):
        content["message"] = exc.detail
    return JSONResponse(status_code=exc.status_code, content=content, headers=getattr(exc, "headers", None))


@app.exception_handler(RequestValidationError)
async def validation_exception_handler(request: Request, exc: RequestValidationError):
    errors = exc.errors()
    return JSONResponse(
        status_code=422,
        content={"message": tr("validation.error"), "errors": errors, "detail": errors},
    )


def _client_ip(request: Request) -> str:
    xff = (request.headers.get("x-forwarded-for") or "").strip()
    if xff:
        return xff.split(",")[0].strip()
    client = getattr(request, "client", None)
    return str(getattr(client, "host", "unknown"))


def _enforce_rate_limit(scope: str, key: str, limit: int, window_sec: int = 60) -> None:
    now = time.time()
    bucket_key = f"{scope}:{key}"
    with _RATE_LIMIT_LOCK:
        bucket = _RATE_LIMIT_BUCKETS[bucket_key]
        while bucket and (now - bucket[0]) > window_sec:
            bucket.popleft()
        if len(bucket) >= limit:
            raise HTTPException(429, "Too many requests. Try again later.")
        bucket.append(now)


@app.middleware("http")
async def security_middleware(request: Request, call_next):
    if request.method != "OPTIONS":
        content_length = request.headers.get("content-length")
        if content_length and content_length.isdigit():
            if int(content_length) > MAX_BODY_BYTES:
                return JSONResponse(status_code=413, content={"message": "Request body is too large"})

        path = request.url.path or ""
        if not (path.startswith("/docs") or path.startswith("/openapi") or path.startswith("/static")):
            _enforce_rate_limit("global", _client_ip(request), GLOBAL_RATE_LIMIT_RPM)

    response = await call_next(request)
    response.headers["X-Content-Type-Options"] = "nosniff"
    response.headers["X-Frame-Options"] = "DENY"
    response.headers["Referrer-Policy"] = "strict-origin-when-cross-origin"
    response.headers["Permissions-Policy"] = "camera=(), microphone=(), geolocation=(self)"
    if _bool_env("HTTPS_ONLY", False):
        response.headers["Strict-Transport-Security"] = "max-age=31536000; includeSubDomains"
    return response


import math

def hav_km(lat1: float, lng1: float, lat2: float, lng2: float) -> float:
    """
    Расчет расстояния между двумя точками по формуле гаверсинуса
    Возвращает расстояние в километрах
    """
    R = 6371  
    

    lat1_rad = math.radians(lat1)
    lat2_rad = math.radians(lat2)
    delta_lat = math.radians(lat2 - lat1)
    delta_lng = math.radians(lng2 - lng1)
    

    a = (math.sin(delta_lat / 2) ** 2 + 
         math.cos(lat1_rad) * math.cos(lat2_rad) * math.sin(delta_lng / 2) ** 2)
    c = 2 * math.atan2(math.sqrt(a), math.sqrt(1 - a))
    return R * c

def bbox(lat: float, lng: float, radius_km: float) -> tuple:
    """
    Создает ограничивающий прямоугольник для предварительной фильтрации в БД
    Возвращает: (min_lat, max_lat, min_lng, max_lng)
    """
    lat_delta = radius_km / 111.0
    lng_delta = radius_km / (111.0 * math.cos(math.radians(lat)))
    
    return (
        lat - lat_delta,  
        lat + lat_delta,   
        lng - lng_delta,  
        lng + lng_delta   
    )

app.add_middleware(TrustedHostMiddleware, allowed_hosts=TRUSTED_HOSTS)
app.add_middleware(
    CORSMiddleware,
    allow_origins=CORS_ALLOW_ORIGINS,
    allow_origin_regex=CORS_ALLOW_ORIGIN_REGEX or None,
    allow_credentials=True,
    allow_methods=["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
    allow_headers=["Authorization", "Content-Type", "Accept", "Accept-Language"],
)


bearer = HTTPBearer()
bearer_optional = HTTPBearer(auto_error=False)

def get_current_user(db: Session, token: str):
    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        uid = payload.get("sub")
        if not uid:
            return None
        return db.query(User).filter(User.id == int(uid)).first()
    except JWTError:
        return None

def require_role(u, role: str):
    if not u or getattr(u, "role", None) != role:
        raise HTTPException(403, tr("auth.forbidden"))
    

def volunteer_only(
    creds: HTTPAuthorizationCredentials = Depends(bearer),
    db: Session = Depends(get_db),
):
    u = get_current_user(db, creds.credentials)
    if not u:
        raise HTTPException(401, tr("auth.unauthorized"))
    require_role(u, "volunteer")
    return u


def auth_user(
    creds: HTTPAuthorizationCredentials = Depends(bearer),
    db: Session = Depends(get_db),
):
    u = get_current_user(db, creds.credentials)
    if not u:
        raise HTTPException(401, tr("auth.unauthorized"))
    return u


def _normalize_lang(raw_lang: str | None) -> str:
    lang = str(raw_lang or "").split(",")[0].split(";")[0].strip().lower() or "ru"
    if lang.startswith("en"):
        return "en"
    if lang.startswith("ky") or lang.startswith("kg"):
        return "ky"
    return "ru"


def _parse_ai_history(body: AiTriageIn) -> list[dict]:
    history: list[dict] = []
    if isinstance(body.history, list):
        for item in body.history:
            try:
                role = getattr(item, "role", None)
                txt = str(getattr(item, "text", "")).strip()
                if role in ("user", "assistant") and txt:
                    history.append({"role": role, "text": txt})
            except Exception:
                continue
    return history


def _run_ai_job(job_id: int):
    db = SessionLocal()
    try:
        job = db.query(AiJob).filter(AiJob.id == job_id).first()
        if not job:
            return
        job.status = "processing"
        db.commit()
        db.refresh(job)

        history = []
        try:
            parsed = json.loads(job.history_json or "[]")
            if isinstance(parsed, list):
                history = parsed
        except Exception:
            history = []

        lang = str(job.lang or "ru")
        answer = (_openai_triage(str(job.text or ""), lang, history=history) or "").strip()
        if not answer and history:
            # Fallback: sometimes long/odd history may lead to empty output blocks.
            answer = (_openai_triage(str(job.text or ""), lang, history=[]) or "").strip()
        answer = _cleanup_ai_answer(answer, lang)
        if not answer:
            job.answer = None
            job.status = "failed"
            job.error = "empty ai answer"
        else:
            job.answer = answer[:4000]
            job.status = "done"
            job.error = None
        job.completed_at = datetime.utcnow()
        db.commit()
        db.refresh(job)

        if job.user_id and job.status == "done":
            try:
                owner_id = int(job.user_id)
                prefs = db.query(NotificationPrefs).filter(NotificationPrefs.user_id == owner_id).first()
                enabled = True if prefs is None else bool(prefs.updates)
                if enabled:
                    tok = db.query(PushToken).filter(PushToken.user_id == owner_id).first()
                    if tok and tok.token:
                        _send_expo_push(
                            [tok.token],
                            title="AI-ответ готов",
                            body="Откройте чат, ответ уже доступен.",
                            data={"kind": "ai_ready", "ai_job_id": job.id},
                            db=db,
                        )
            except Exception:
                pass
    except Exception as e:
        try:
            job = db.query(AiJob).filter(AiJob.id == job_id).first()
            if job:
                job.status = "failed"
                job.error = str(e)[:1000]
                job.completed_at = datetime.utcnow()
                db.commit()
        except Exception:
            try:
                db.rollback()
            except Exception:
                pass
    finally:
        db.close()


def _openai_triage(text: str, lang: str, history: list[dict] | None = None) -> str:
    api_key = (os.getenv("OPENAI_API_KEY") or "").strip()
    if not api_key:
        raise HTTPException(501, tr("ai.not_configured"))

    model = (os.getenv("OPENAI_MODEL") or "gpt-5-nano").strip()

    text = (text or "").strip()
    if len(text) > 2000:
        text = text[:2000]

    system = (
        "You are a medical assistant for a volunteer help app. "
        "Answer naturally in free text. "
        "Be concise: usually 2-4 short sentences unless user asks for details. "
        "Write with correct grammar and spelling. "
        "Always answer in the user's language. "
        "Do not mix languages in one answer. "
        "If user's language is Russian, avoid English words and provide Russian equivalents. "
        "Use recent conversation context as the primary source of facts. "
        "If the user asks a follow-up question, rely on previously stated facts and do not ask to repeat them. "
        "Ask only for missing critical details that were not provided before. "
        "Do NOT provide a medical diagnosis. "
        "If symptoms suggest immediate danger, clearly advise calling emergency services."
    )
    input_items = [
        {"role": "system", "content": [{"type": "input_text", "text": system}]},
    ]

    # Keep only recent dialogue turns to control latency/tokens.
    safe_history = history or []
    if len(safe_history) > 6:
        safe_history = safe_history[-6:]

    for item in safe_history:
        role = item.get("role")
        text_item = str(item.get("text") or "").strip()
        if role not in ("user", "assistant") or not text_item:
            continue
        block_type = "output_text" if role == "assistant" else "input_text"
        input_items.append({
            "role": role,
            "content": [{"type": block_type, "text": text_item[:1000]}],
        })

    recent_user_facts: list[str] = []
    for item in reversed(safe_history):
        if item.get("role") != "user":
            continue
        txt = str(item.get("text") or "").strip()
        if not txt:
            continue
        recent_user_facts.append(txt[:300])
        if len(recent_user_facts) >= 3:
            break
    recent_user_facts.reverse()

    facts_block = ""
    if recent_user_facts:
        facts_lines = "\n".join([f"- {x}" for x in recent_user_facts])
        facts_block = f"\nRecent user context:\n{facts_lines}\n"

    user = f"Language: {lang}{facts_block}\nCurrent user text: {text}"
    input_items.append({"role": "user", "content": [{"type": "input_text", "text": user}]})

    payload = {
        "model": model,
        "input": input_items,
        "max_output_tokens": int(os.getenv("AI_MAX_OUTPUT_TOKENS", "420")),
        "reasoning": {"effort": os.getenv("AI_REASONING_EFFORT", "low")},
        "text": {"verbosity": os.getenv("AI_TEXT_VERBOSITY", "low")},
    }

    headers = {"Authorization": f"Bearer {api_key}", "Content-Type": "application/json"}
    timeout_sec = float(os.getenv("AI_TIMEOUT_SEC", "60"))
    max_attempts = max(1, int(os.getenv("AI_RETRIES", "1")))
    r = None

    for attempt in range(1, max_attempts + 1):
        try:
            r = httpx.post(
                "https://api.openai.com/v1/responses",
                headers=headers,
                json=payload,
                timeout=timeout_sec,
            )
        except Exception as e:
            if _bool_env("AI_DEBUG", False):
                print(f"[AI_DBG] OpenAI request exception attempt={attempt}/{max_attempts}: {e}")
            if attempt < max_attempts:
                time.sleep(0.8 * attempt)
                continue
            raise HTTPException(503, tr("ai.failed"))

        # Retry only for transient statuses.
        if r.status_code == 429 or (500 <= r.status_code < 600):
            if _bool_env("AI_DEBUG", False):
                print(f"[AI_DBG] OpenAI transient status={r.status_code} attempt={attempt}/{max_attempts}")
            if attempt < max_attempts:
                time.sleep(0.8 * attempt)
                continue
        break

    if r.status_code >= 400:
        try:
            detail = r.json()
        except Exception:
            detail = r.text
        raise HTTPException(503, f"{tr('ai.failed')} (openai {r.status_code}): {detail}")

    def _collect_text_candidates(obj, out: list[str]):
        if isinstance(obj, dict):
            for k, v in obj.items():
                lk = str(k).lower()
                if lk in {"text", "output_text", "value", "refusal"}:
                    if isinstance(v, str) and v.strip():
                        out.append(v.strip())
                    elif isinstance(v, list):
                        for it in v:
                            if isinstance(it, str) and it.strip():
                                out.append(it.strip())
                            else:
                                _collect_text_candidates(it, out)
                    elif isinstance(v, dict):
                        _collect_text_candidates(v, out)
                else:
                    _collect_text_candidates(v, out)
        elif isinstance(obj, list):
            for it in obj:
                _collect_text_candidates(it, out)

    try:
        j = r.json()

        # If model used the whole budget on reasoning, retry once with bigger output budget.
        try:
            if (
                isinstance(j, dict)
                and str(j.get("status")) == "incomplete"
                and isinstance(j.get("incomplete_details"), dict)
                and str(j.get("incomplete_details", {}).get("reason")) == "max_output_tokens"
            ):
                payload_retry = dict(payload)
                current = int(payload.get("max_output_tokens", 420))
                payload_retry["max_output_tokens"] = max(current * 2, 800)
                if _bool_env("AI_DEBUG", False):
                    print(
                        f"[AI_DBG] retry on incomplete/max_output_tokens "
                        f"old={current} new={payload_retry['max_output_tokens']}"
                    )
                r2 = httpx.post(
                    "https://api.openai.com/v1/responses",
                    headers=headers,
                    json=payload_retry,
                    timeout=timeout_sec,
                )
                if r2.status_code < 400:
                    j = r2.json()
        except Exception:
            pass

        # Try to extract textual output from several possible response shapes
        out_text = None

        # 1) legacy 'output_text'
        if isinstance(j, dict):
            ot = j.get("output_text")
            if isinstance(ot, str) and ot.strip():
                out_text = ot.strip()
            elif isinstance(ot, list):
                parts = [str(x).strip() for x in ot if isinstance(x, str) and str(x).strip()]
                if parts:
                    out_text = "\n".join(parts)

        # 2) 'output' array (Responses API) with content blocks
        if not out_text and isinstance(j, dict) and isinstance(j.get("output"), list):
            parts: list[str] = []
            for item in j.get("output"):
                if isinstance(item, dict):
                    content = item.get("content")
                    if isinstance(content, list):
                        for c in content:
                            if isinstance(c, dict):
                                # content blocks sometimes have 'text'
                                t = c.get("text")
                                if isinstance(t, str) and t.strip():
                                    parts.append(t.strip())
                                elif isinstance(t, dict):
                                    tv = t.get("value")
                                    if isinstance(tv, str) and tv.strip():
                                        parts.append(tv.strip())
                                # Some responses use 'output_text' or nested dicts for text blocks.
                                ot2 = c.get("output_text")
                                if isinstance(ot2, str) and ot2.strip():
                                    parts.append(ot2.strip())
                                elif isinstance(ot2, dict):
                                    tv2 = ot2.get("value")
                                    if isinstance(tv2, str) and tv2.strip():
                                        parts.append(tv2.strip())
                                rf = c.get("refusal")
                                if isinstance(rf, str) and rf.strip():
                                    parts.append(rf.strip())
                                elif isinstance(rf, dict):
                                    rv = rf.get("value")
                                    if isinstance(rv, str) and rv.strip():
                                        parts.append(rv.strip())
                            elif isinstance(c, str):
                                parts.append(c.strip())
                elif isinstance(item, str):
                    parts.append(item.strip())
            if parts:
                out_text = "\n".join(parts)

        # 3) choices / chat completions style
        if not out_text and isinstance(j, dict) and isinstance(j.get("choices"), list):
            parts = []
            for ch in j.get("choices"):
                if isinstance(ch, dict):
                    # Try message -> content
                    msg = ch.get("message") or ch.get("delta") or {}
                    if isinstance(msg, dict):
                        content = msg.get("content")
                        if isinstance(content, list):
                            for c in content:
                                if isinstance(c, dict) and isinstance(c.get("text"), str):
                                    parts.append(c.get("text").strip())
                        elif isinstance(content, str):
                            parts.append(content.strip())
                    if isinstance(ch.get("text"), str):
                        parts.append(ch.get("text").strip())
            if parts:
                out_text = "\n".join(parts)

        # 4) Robust fallback: recursively collect textual fields from raw payload.
        if not out_text:
            candidates: list[str] = []
            _collect_text_candidates(j, candidates)
            # Avoid returning just echoed user input if any; keep meaningful longest text.
            if candidates:
                candidates = [c for c in candidates if len(c) >= 2]
                if candidates:
                    out_text = max(candidates, key=len)

        if not out_text:
            if _bool_env("AI_DEBUG", False):
                try:
                    print("[AI_DBG] Empty model text, raw response:", j)
                except Exception:
                    pass
            return ""
        return out_text.strip()
    except Exception:
        raise HTTPException(503, tr("ai.failed"))


def _cleanup_ai_answer(answer: str, lang: str) -> str:
    out = (answer or "").strip()
    if not out:
        return ""
    if lang == "ru":
        # Guardrail for mixed EN/RU medical terms in Russian output.
        replacements = {
            "numbness": "онемение",
            "numbost": "онемение",
            "numbость": "онемение",
            "fever": "жар",
            "dizziness": "головокружение",
        }
        low = out.lower()
        for k, v in replacements.items():
            if k in low:
                out = out.replace(k, v).replace(k.capitalize(), v.capitalize()).replace(k.upper(), v.upper())
                low = out.lower()
    return out


@app.post("/ai/triage", response_model=AiJobCreateOut)
def ai_triage(
    body: AiTriageIn,
    request: Request,
    bg: BackgroundTasks,
    creds: HTTPAuthorizationCredentials | None = Depends(bearer_optional),
    db: Session = Depends(get_db),
):
    try:
        if _bool_env("AI_DEBUG", False):
            client = getattr(request, "client", None)
            client_host = getattr(client, "host", None) if client else None
            hdrs = {k: v for k, v in request.headers.items()}
            print(f"[AI_DBG] /ai/triage request from={client_host} headers={hdrs} body_len={len((body.text or "").strip())}")
    except Exception:
        pass
    current_user = None
    if creds and getattr(creds, "credentials", None):
        current_user = get_current_user(db, creds.credentials)

    rl_key = f"user:{int(current_user.id)}" if current_user else f"ip:{_client_ip(request)}"
    _enforce_rate_limit("ai_triage", rl_key, AI_RATE_LIMIT_RPM)

    lang = _normalize_lang(body.lang or request.query_params.get("lang") or request.headers.get("accept-language"))
    history = _parse_ai_history(body)

    job = AiJob(
        user_id=int(current_user.id) if current_user else None,
        lang=lang,
        text=(body.text or "").strip()[:2000],
        history_json=json.dumps(history, ensure_ascii=False),
        status="pending",
    )
    db.add(job)
    db.commit()
    db.refresh(job)

    bg.add_task(_run_ai_job, int(job.id))
    return {"job_id": int(job.id), "status": job.status}


@app.get("/ai/triage/jobs/{job_id}", response_model=AiJobStatusOut)
def ai_triage_job_status(
    job_id: int,
    creds: HTTPAuthorizationCredentials | None = Depends(bearer_optional),
    db: Session = Depends(get_db),
):
    job = db.query(AiJob).filter(AiJob.id == job_id).first()
    if not job:
        raise HTTPException(404, "ai job not found")

    if job.user_id is not None:
        if not creds or not getattr(creds, "credentials", None):
            raise HTTPException(401, tr("auth.unauthorized"))
        u = get_current_user(db, creds.credentials)
        if not u or int(u.id) != int(job.user_id):
            raise HTTPException(403, tr("auth.forbidden"))

    # Defensive normalization for old/inconsistent rows.
    if str(job.status) == "done" and not str(job.answer or "").strip():
        job.status = "failed"
        job.error = job.error or "empty ai answer"
        if not job.completed_at:
            job.completed_at = datetime.utcnow()
        db.commit()
        db.refresh(job)

    return {
        "job_id": int(job.id),
        "status": str(job.status),
        "answer": job.answer,
        "error": job.error,
        "created_at": job.created_at,
        "updated_at": job.updated_at,
        "completed_at": job.completed_at,
    }


@app.get("/")
def root():
    return {"status": "ok"}

@app.post("/auth/register", response_model=TokenResponse)
def register(data: RegisterRequest, request: Request, db: Session = Depends(get_db)):
    _enforce_rate_limit("auth_register", _client_ip(request), AUTH_RATE_LIMIT_RPM)

    phone = (data.phone or "").strip()
    if len(phone) < 6:
        raise HTTPException(400, "phone is invalid")

    email = (data.email or "").strip().lower()
    if not email or "@" not in email:
        raise HTTPException(400, "email is invalid")

    password = str(data.password or "")
    if len(password) < 8:
        raise HTTPException(400, "password must be at least 8 characters")

    if db.query(User).filter(User.phone == phone).first():
        raise HTTPException(400, tr("auth.phone_taken"))
    if db.query(User).filter(func.lower(User.email) == email).first():
        raise HTTPException(400, "email is already in use")

    role = data.role.strip().lower()
    if role not in ("user", "volunteer"):
        raise HTTPException(400, tr("auth.invalid_role"))

    u = User(
        name=(data.name or "").strip() or "User",
        email=email,
        phone=phone,
        password_hash=hash_password(password),
        role=role,
    )
    db.add(u)
    db.commit()
    db.refresh(u)

    _send_resend_email(
        to_email=email,
        subject="Welcome to Tayan",
        html=(
            "<h2>Welcome to Tayan</h2>"
            "<p>Your account has been created successfully.</p>"
            "<p>If you did not create this account, please change your password immediately.</p>"
        ),
    )

    return {
        "access_token": create_token(u.id),
        "token_type": "bearer"
    }


@app.post("/auth/login", response_model=TokenResponse)
def login(data: LoginRequest, request: Request, db: Session = Depends(get_db)):
    _enforce_rate_limit("auth_login", _client_ip(request), AUTH_RATE_LIMIT_RPM)
    raw = (data.email or "").strip()
    candidates: list[User] = []
    if "@" in raw:
        # Handle legacy duplicates safely: verify password against all matches.
        candidates = db.query(User).filter(func.lower(User.email) == raw.lower()).all()
    else:
        # Backward-compatible fallback for old clients/users that still type phone.
        candidates = db.query(User).filter(User.phone == raw).all()

    password = str(data.password or "")
    u = None
    for c in candidates:
        try:
            if verify_password(password, c.password_hash):
                u = c
                break
        except Exception:
            continue

    if not u:
        raise HTTPException(400, "Invalid email or password")

    return {"access_token": create_token(u.id), "token_type": "bearer"}

@app.get("/auth/me", response_model=MeResponse)
def me(
    request: Request,
    creds: HTTPAuthorizationCredentials = Depends(bearer),
    db: Session = Depends(get_db),
):
    token = creds.credentials
    u = get_current_user(db, token)
    if not u:
        raise HTTPException(401, tr("auth.unauthorized"))

    return {
        "id": u.id,
        "name": u.name,
        "email": u.email,
        "avatar_url": _public_url(request, getattr(u, "avatar_url", None)),
        "phone": u.phone,
        "role": u.role,
    }


@app.patch("/auth/me", response_model=MeResponse)
def update_me(
    request: Request,
    data: UpdateMeRequest,
    creds: HTTPAuthorizationCredentials = Depends(bearer),
    db: Session = Depends(get_db),
):
    token = creds.credentials
    u = get_current_user(db, token)
    if not u:
        raise HTTPException(401, tr("auth.unauthorized"))

    if data.name is not None:
        name = (data.name or "").strip()
        if not name:
            raise HTTPException(400, "name is required")
        u.name = name

    if data.email is not None:
        email = (data.email or "").strip()
        u.email = email or None

    if data.avatar_url is not None:
        avatar_url = (data.avatar_url or "").strip()
        if avatar_url and not (
            avatar_url.startswith("http://")
            or avatar_url.startswith("https://")
            or avatar_url.startswith("/static/")
            or avatar_url.startswith("data:image/")
        ):
            raise HTTPException(400, "avatar_url must be http(s), data:image/*, or /static/*")
        u.avatar_url = avatar_url or None

    db.commit()
    db.refresh(u)

    return {
        "id": u.id,
        "name": u.name,
        "email": u.email,
        "avatar_url": _public_url(request, getattr(u, "avatar_url", None)),
        "phone": u.phone,
        "role": u.role,
    }


@app.post("/auth/me/avatar", response_model=MeResponse)
def upload_my_avatar(
    request: Request,
    file: UploadFile = File(...),
    creds: HTTPAuthorizationCredentials = Depends(bearer),
    db: Session = Depends(get_db),
):
    token = creds.credentials
    u = get_current_user(db, token)
    if not u:
        raise HTTPException(401, tr("auth.unauthorized"))

    ct = (file.content_type or "").lower().strip()
    ext = ALLOWED_AVATAR_MIME_TO_EXT.get(ct)
    if not ext:
        raise HTTPException(400, "unsupported image type")

    try:
        chunks: list[bytes] = []
        written = 0
        while True:
            chunk = file.file.read(1024 * 1024)
            if not chunk:
                break
            written += len(chunk)
            if written > MAX_AVATAR_BYTES:
                raise HTTPException(413, "avatar file is too large")
            chunks.append(chunk)
    except Exception:
        raise
    finally:
        try:
            file.file.close()
        except Exception:
            pass

    raw = b"".join(chunks)
    if not raw:
        raise HTTPException(400, "empty avatar file")

    encoded = base64.b64encode(raw).decode("ascii")
    u.avatar_url = f"data:{ct};base64,{encoded}"
    db.commit()
    db.refresh(u)

    return {
        "id": u.id,
        "name": u.name,
        "email": u.email,
        "avatar_url": _public_url(request, getattr(u, "avatar_url", None)),
        "phone": u.phone,
        "role": u.role,
    }


@app.delete("/auth/me")
def delete_me(
    creds: HTTPAuthorizationCredentials = Depends(bearer),
    db: Session = Depends(get_db),
):
    token = creds.credentials
    u = get_current_user(db, token)
    if not u:
        raise HTTPException(401, tr("auth.unauthorized"))

    # Delete user's own requests.
    db.query(HelpRequest).filter(HelpRequest.user_id == u.id).delete(synchronize_session=False)

    # Delete push token row.
    db.query(PushToken).filter(PushToken.user_id == u.id).delete(synchronize_session=False)

    # Delete notification prefs row.
    db.query(NotificationPrefs).filter(NotificationPrefs.user_id == u.id).delete(synchronize_session=False)

    # If user is a volunteer, scrub references in other users' requests.
    db.query(HelpRequest).filter(HelpRequest.accepted_by == u.id).update(
        {
            HelpRequest.accepted_by: None,
            HelpRequest.accepted_at: None,
            HelpRequest.volunteer_lat: None,
            HelpRequest.volunteer_lng: None,
            HelpRequest.in_progress_at: None,
            HelpRequest.completed_at: None,
            HelpRequest.canceled_at: None,
        },
        synchronize_session=False,
    )

    db.delete(u)
    db.commit()

    return {"status": "ok"}


@app.put("/auth/me/push-token")
def upsert_push_token(
    data: PushTokenIn,
    creds: HTTPAuthorizationCredentials = Depends(bearer),
    db: Session = Depends(get_db),
):
    token = creds.credentials
    u = get_current_user(db, token)
    if not u:
        raise HTTPException(401, tr("auth.unauthorized"))

    raw = (data.token or "").strip()
    if not raw:
        raise HTTPException(400, "token is required")

    row = db.query(PushToken).filter(PushToken.user_id == u.id).first()
    if row:
        row.token = raw
        row.platform = (data.platform or "").strip() or None
    else:
        row = PushToken(user_id=u.id, token=raw, platform=(data.platform or "").strip() or None)
        db.add(row)

    _ensure_prefs_row(db, u.id)
    db.commit()
    return {"status": "ok"}


@app.put("/auth/me/notification-prefs")
def upsert_notification_prefs(
    data: NotificationPrefsIn,
    creds: HTTPAuthorizationCredentials = Depends(bearer),
    db: Session = Depends(get_db),
):
    token = creds.credentials
    u = get_current_user(db, token)
    if not u:
        raise HTTPException(401, tr("auth.unauthorized"))

    row = db.query(NotificationPrefs).filter(NotificationPrefs.user_id == u.id).first()
    if not row:
        row = NotificationPrefs(user_id=u.id)
        db.add(row)

    row.sos = bool(data.sos)
    row.volunteers = bool(data.volunteers)
    row.updates = bool(data.updates)

    db.commit()
    return {"status": "ok"}


@app.post("/auth/me/push/test")
def test_push_to_me(
    data: PushTestIn,
    creds: HTTPAuthorizationCredentials = Depends(bearer),
    db: Session = Depends(get_db),
):
    token = creds.credentials
    u = get_current_user(db, token)
    if not u:
        raise HTTPException(401, tr("auth.unauthorized"))

    row = db.query(PushToken).filter(PushToken.user_id == u.id).first()
    if not row or not row.token:
        raise HTTPException(400, "push token not registered")

    title = (data.title or "Tayan").strip() or "Tayan"
    body = (data.body or "").strip()
    if not body:
        raise HTTPException(400, "body is required")

    payload = {
        "to": row.token,
        "title": title,
        "body": body,
        "sound": "default",
        "data": {"kind": "test"},
    }

    try:
        r = httpx.post(
            "https://exp.host/--/api/v2/push/send",
            json=payload,
            headers={"Accept": "application/json", "Content-Type": "application/json"},
            timeout=15.0,
        )
    except Exception as e:
        raise HTTPException(502, f"expo push error: {e}")

    if r.status_code >= 400:
        raise HTTPException(502, f"expo push http {r.status_code}: {r.text}")

    try:
        return r.json()
    except Exception:
        return {"status": "unknown", "raw": r.text}


@app.post("/requests", response_model=HelpRequestResponse)
def create_request(
    data: CreateHelpRequest,
    creds: HTTPAuthorizationCredentials = Depends(bearer),
    db: Session = Depends(get_db),
):
    token = creds.credentials
    u = get_current_user(db, token)
    if not u:
        raise HTTPException(401, tr("auth.unauthorized"))

    if getattr(u, "role", None) == "volunteer" and data.kind != "sos":
        raise HTTPException(403, tr("request.volunteer_only_sos"))

    if data.kind not in ("sos", "symptom"):
        raise HTTPException(400, tr("request.invalid_kind"))

    r = HelpRequest(
        user_id=u.id,
        kind=data.kind,
        symptoms=data.symptoms,
        comments=data.comments,
        status="new",
        lat=data.lat,
        lng=data.lng,
        address=data.address,
        severity=data.severity,
    )
    db.add(r)
    db.commit()
    db.refresh(r)

    # Push: SOS request -> notify nearby online volunteers who enabled SOS notifications.
    if r.kind == "sos" and r.lat is not None and r.lng is not None:
        try:
            radius_km = 5.0
            min_lat, max_lat, min_lng, max_lng = bbox(float(r.lat), float(r.lng), radius_km)
            online_threshold = datetime.utcnow() - timedelta(seconds=120)

            volunteers = (
                db.query(User)
                .filter(
                    User.role == "volunteer",
                    User.volunteer_lat.isnot(None),
                    User.volunteer_lng.isnot(None),
                    User.volunteer_online_at.isnot(None),
                    User.volunteer_online_at >= online_threshold,
                    User.volunteer_lat >= min_lat,
                    User.volunteer_lat <= max_lat,
                    User.volunteer_lng >= min_lng,
                    User.volunteer_lng <= max_lng,
                )
                .all()
            )

            nearby_ids: list[int] = []
            for v in volunteers:
                d = hav_km(float(r.lat), float(r.lng), float(v.volunteer_lat), float(v.volunteer_lng))
                if d <= radius_km:
                    nearby_ids.append(int(v.id))

            prefs_map = _get_prefs_map(db, nearby_ids)
            token_map = _get_push_token_map(db, nearby_ids)

            targets: list[str] = []
            for vid in nearby_ids:
                prefs = prefs_map.get(vid)
                sos_enabled = True if prefs is None else bool(prefs.sos)
                if not sos_enabled:
                    continue
                t = token_map.get(vid)
                if t:
                    targets.append(t)

            if targets:
                _send_expo_push(
                    targets,
                    title="SOS рядом",
                    body="Поблизости новая SOS-заявка. Откройте приложение.",
                    data={"kind": "sos", "request_id": r.id},
                    db=db,
                )
        except Exception:
            pass

    return {"id": r.id, "status": r.status}

@app.get("/requests/my", response_model=List[HelpRequestItem])
def my_requests(
    creds: HTTPAuthorizationCredentials = Depends(bearer),
    db: Session = Depends(get_db),
):
    token = creds.credentials
    u = get_current_user(db, token)
    if not u:
        raise HTTPException(401, tr("auth.unauthorized"))

    volunteer = aliased(User)
    rows = (
        db.query(HelpRequest, volunteer.name.label("volunteer_name"))
        .outerjoin(volunteer, volunteer.id == HelpRequest.accepted_by)
        .filter(HelpRequest.user_id == u.id)
        .order_by(HelpRequest.id.desc())
        .all()
    )
    return [
        {
            "id": r.id,
            "kind": r.kind,
            "status": r.status,
            "created_at": r.created_at,
            "volunteer_name": volunteer_name,
            "symptoms": r.symptoms,
            "comments": r.comments,
            "accepted_by": r.accepted_by,
            "accepted_at": r.accepted_at,
            "lat": r.lat,
            "lng": r.lng,
            "address": r.address,
            "in_progress_at": r.in_progress_at,
            "completed_at": r.completed_at,
            "canceled_at": r.canceled_at,
            "reaction_minutes": _safe_reaction_minutes(r.created_at, r.accepted_at),
            "rating": r.rating,
            "review_text": r.review_text,
            "reviewed_at": r.reviewed_at,
        }
        for r, volunteer_name in rows
    ]
@app.get("/requests/open", response_model=List[OpenRequestItem])
def open_requests(
    creds: HTTPAuthorizationCredentials = Depends(bearer),
    db: Session = Depends(get_db),
):
    token = creds.credentials
    u = get_current_user(db, token)
    if not u:
        raise HTTPException(401, tr("auth.unauthorized"))

    require_role(u, "volunteer")

    owner = aliased(User)
    rows = (
        db.query(HelpRequest, owner.name)
        .outerjoin(owner, HelpRequest.user_id == owner.id)
        .filter(HelpRequest.status == "new")
        .order_by(HelpRequest.id.desc())
        .all()
    )
    return [
        {
            "id": r.id,
            "kind": r.kind,
            "status": r.status,
            "created_at": r.created_at,
            "user_name": owner_name,
            "severity": r.severity,
            "symptoms": r.symptoms,
            "comments": r.comments,
            "lat": r.lat,
            "lng": r.lng,
            "address": r.address,
        }
        for r, owner_name in rows
    ]


@app.get("/requests/{request_id}", response_model=HelpRequestDetail)
def get_request(
    request_id: int,
    creds: HTTPAuthorizationCredentials = Depends(bearer),
    db: Session = Depends(get_db),
):
    token = creds.credentials
    u = get_current_user(db, token)
    if not u:
        raise HTTPException(401, tr("auth.unauthorized"))

    r = db.query(HelpRequest).filter(HelpRequest.id == request_id).first()
    if not r or r.user_id != u.id:
        raise HTTPException(404, tr("request.not_found"))

    return _help_request_detail_payload(db, r)



@app.patch("/requests/{request_id}/status", response_model=HelpRequestDetail)
def update_status(
    request_id: int,
    data: UpdateRequestStatus,
    creds: HTTPAuthorizationCredentials = Depends(bearer),
    db: Session = Depends(get_db),
):
    token = creds.credentials
    u = get_current_user(db, token)
    if not u:
        raise HTTPException(401, tr("auth.unauthorized"))

    allowed = {"canceled"}
    if data.status not in allowed:
        raise HTTPException(400, tr("request.status_invalid"))

    r = db.query(HelpRequest).filter(HelpRequest.id == request_id).first()
    if not r or r.user_id != u.id:
        raise HTTPException(404, tr("request.not_found"))

    if r.status != "new":
        raise HTTPException(400, tr("request.already_handled"))
    
    now = datetime.utcnow()

    if data.status == "completed" and r.completed_at is None:
        r.completed_at = now

    if data.status == "canceled" and r.canceled_at is None:
        r.canceled_at = now

    r.status = data.status
    db.commit()
    db.refresh(r)

    # Push: notify the request owner about cancellation if they enabled updates.
    try:
        owner_id = int(r.user_id)
        prefs = db.query(NotificationPrefs).filter(NotificationPrefs.user_id == owner_id).first()
        enabled = True if prefs is None else bool(prefs.updates)
        if enabled:
            tok = db.query(PushToken).filter(PushToken.user_id == owner_id).first()
            if tok and tok.token:
                _send_expo_push(
                    [tok.token],
                    title="Заявка отменена",
                    body="Вы отменили заявку.",
                    data={"kind": "request_status", "request_id": r.id, "status": r.status},
                    db=db,
                )
    except Exception:
        pass
    return r

@app.post("/requests/{request_id}/review", response_model=HelpRequestDetail)
def leave_review(
    request_id: int,
    data: CreateReview,
    creds: HTTPAuthorizationCredentials = Depends(bearer),
    db: Session = Depends(get_db),
):
    token = creds.credentials
    u = get_current_user(db, token)
    if not u:
        raise HTTPException(401, tr("auth.unauthorized"))

    r = db.query(HelpRequest).filter(HelpRequest.id == request_id).first()
    if not r or r.user_id != u.id:
        raise HTTPException(404, tr("request.not_found"))
    print(
        "REVIEW DEBUG:",
        "id=", r.id,
        "status=", r.status,
        "accepted_by=", r.accepted_by,
        "rating=", r.rating,
        "completed_at=", r.completed_at
    )

    if r.status != "completed":
        raise HTTPException(400, tr("review.only_completed"))

    if not r.accepted_by:
        raise HTTPException(400, tr("review.no_volunteer"))

    if data.rating < 1 or data.rating > 5:
        raise HTTPException(400, tr("review.rating_range"))

    if r.rating is not None:
        raise HTTPException(400, tr("review.already_submitted"))

    r.rating = data.rating
    r.review_text = (data.review_text or "").strip() or None
    r.reviewed_at = datetime.utcnow()

    db.commit()
    db.refresh(r)
    return r


@app.post("/volunteer/apply", response_model=VolunteerApplyResponse)
def volunteer_apply(
    creds: HTTPAuthorizationCredentials = Depends(bearer),
    db: Session = Depends(get_db),
):
    token = creds.credentials
    u = get_current_user(db, token)
    if not u:
        raise HTTPException(401, tr("auth.unauthorized"))

    u.role = "volunteer"
    db.commit()
    return {"ok": True}

@app.post("/requests/{request_id}/accept", response_model=AcceptRequestResponse)
def accept_request(
    request_id: int,
    creds: HTTPAuthorizationCredentials = Depends(bearer),
    db: Session = Depends(get_db),
):
    token = creds.credentials
    u = get_current_user(db, token)
    if not u:
        raise HTTPException(401, tr("auth.unauthorized"))

    require_role(u, "volunteer")
    active = (
        db.query(HelpRequest)
        .filter(
            HelpRequest.accepted_by == u.id,
            HelpRequest.status.in_(["accepted", "in_progress"])
        )
        .first()
    )

    if active:
        raise HTTPException(400, tr("volunteer.active_request_exists"))

    r = db.query(HelpRequest).filter(HelpRequest.id == request_id).first()
    if not r:
        raise HTTPException(404, tr("request.not_found"))

    if r.status != "new":
        raise HTTPException(400, tr("volunteer.request_not_new"))

    r.status = "accepted"
    r.accepted_by = u.id
    r.accepted_at = datetime.utcnow()

    db.commit()
    db.refresh(r)

    # Push: notify request owner that volunteer accepted.
    try:
        owner_id = int(r.user_id)
        prefs = db.query(NotificationPrefs).filter(NotificationPrefs.user_id == owner_id).first()
        enabled = True if prefs is None else bool(prefs.updates)
        if enabled:
            tok = db.query(PushToken).filter(PushToken.user_id == owner_id).first()
            if tok and tok.token:
                _send_expo_push(
                    [tok.token],
                    title="Заявка принята",
                    body="Волонтёр принял вашу заявку.",
                    data={"kind": "request_status", "request_id": r.id, "status": r.status},
                    db=db,
                )
    except Exception:
        pass
    return {"id": r.id, "status": r.status, "accepted_by": r.accepted_by}


@app.get("/requests/{request_id}/chat/messages", response_model=List[ChatMessageOut])
def list_chat_messages(
    request_id: int,
    after_id: int = Query(0, ge=0),
    limit: int = Query(50, ge=1, le=200),
    creds: HTTPAuthorizationCredentials = Depends(bearer),
    db: Session = Depends(get_db),
):
    token = creds.credentials
    u = get_current_user(db, token)
    if not u:
        raise HTTPException(401, tr("auth.unauthorized"))

    r = db.query(HelpRequest).filter(HelpRequest.id == request_id).first()
    if not r:
        raise HTTPException(404, tr("request.not_found"))

    if not _can_access_request_chat(u, r):
        raise HTTPException(403, tr("chat.forbidden"))

    if r.accepted_by is None:
        raise HTTPException(400, tr("chat.not_available"))

    q = (
        db.query(ChatMessage, User)
        .join(User, User.id == ChatMessage.sender_id)
        .filter(ChatMessage.request_id == request_id)
    )

    if after_id:
        q = q.filter(ChatMessage.id > int(after_id))

    rows = q.order_by(ChatMessage.id.asc()).limit(int(limit)).all()

    out: list[ChatMessageOut] = []
    for m, sender in rows:
        out.append(
            ChatMessageOut(
                id=int(m.id),
                request_id=int(m.request_id),
                sender_id=int(m.sender_id),
                sender_role=str(getattr(sender, "role", "user")),
                sender_name=getattr(sender, "name", None),
                text=str(getattr(m, "text", "")),
                created_at=m.created_at,
            )
        )

    return out


@app.post("/requests/{request_id}/chat/messages", response_model=ChatMessageOut)
def send_chat_message(
    request_id: int,
    data: ChatSendIn,
    creds: HTTPAuthorizationCredentials = Depends(bearer),
    db: Session = Depends(get_db),
):
    token = creds.credentials
    u = get_current_user(db, token)
    if not u:
        raise HTTPException(401, tr("auth.unauthorized"))

    r = db.query(HelpRequest).filter(HelpRequest.id == request_id).first()
    if not r:
        raise HTTPException(404, tr("request.not_found"))

    if not _can_access_request_chat(u, r):
        raise HTTPException(403, tr("chat.forbidden"))

    if r.accepted_by is None:
        raise HTTPException(400, tr("chat.not_available"))

    text_value = (data.text or "").strip()
    if not text_value:
        raise HTTPException(400, tr("chat.text_required"))

    m = ChatMessage(request_id=int(r.id), sender_id=int(u.id), text=text_value)
    db.add(m)
    db.commit()
    db.refresh(m)

    # Push: notify the other participant about a new chat message (best-effort).
    try:
        receiver_id: int | None = None
        if int(r.user_id) == int(u.id):
            receiver_id = int(r.accepted_by) if r.accepted_by is not None else None
        elif r.accepted_by is not None and int(r.accepted_by) == int(u.id):
            receiver_id = int(r.user_id)

        if receiver_id and receiver_id != int(u.id):
            prefs = db.query(NotificationPrefs).filter(NotificationPrefs.user_id == receiver_id).first()
            enabled = True if prefs is None else bool(prefs.updates)
            if enabled:
                tok = db.query(PushToken).filter(PushToken.user_id == receiver_id).first()
                if tok and tok.token:
                    sender_name = (getattr(u, "name", None) or tr("common.user")).strip() if isinstance(getattr(u, "name", None), str) else (getattr(u, "name", None) or "")
                    if not sender_name:
                        sender_name = "User"
                    short = text_value
                    if len(short) > 120:
                        short = short[:117] + "…"

                    _send_expo_push(
                        [tok.token],
                        title=tr("chat.push_title"),
                        body=tr("chat.push_body", vars={"name": sender_name, "text": short}),
                        data={
                            "kind": "chat_message",
                            "request_id": int(r.id),
                            "name": getattr(u, "name", None) or None,
                            "role": getattr(u, "role", None) or None,
                        },
                        db=db,
                    )
    except Exception:
        pass

    return ChatMessageOut(
        id=int(m.id),
        request_id=int(m.request_id),
        sender_id=int(m.sender_id),
        sender_role=str(getattr(u, "role", "user")),
        sender_name=getattr(u, "name", None),
        text=str(getattr(m, "text", "")),
        created_at=m.created_at,
    )

@app.get("/volunteer/my", response_model=List[VolunteerMyItem])
def volunteer_my(
    creds: HTTPAuthorizationCredentials = Depends(bearer),
    db: Session = Depends(get_db),
):
    token = creds.credentials
    u = get_current_user(db, token)
    if not u:
        raise HTTPException(401, tr("auth.unauthorized"))

    require_role(u, "volunteer")

    items = (
        db.query(HelpRequest)
        .filter(HelpRequest.accepted_by == u.id)
        .order_by(HelpRequest.id.desc())
        .all()
    )
    return items


@app.patch("/volunteer/requests/{request_id}/location", response_model=LocationUpdateResponse)
def update_vol_location(
    request_id: int,
    payload: LocationIn,
    u: User = Depends(volunteer_only),
    db: Session = Depends(get_db),
):
    r = db.query(HelpRequest).filter(HelpRequest.id == request_id).first()
    if not r:
        raise HTTPException(404, tr("request.not_found"))

    if r.accepted_by != u.id:
        raise HTTPException(403, tr("auth.forbidden"))

    r.volunteer_lat = payload.volunteer_lat
    r.volunteer_lng = payload.volunteer_lng

    db.commit()
    return {"ok": True}

@app.get("/requests/{request_id}/track", response_model=HelpRequestDetail)
def track_request(
    request_id: int,
    creds: HTTPAuthorizationCredentials = Depends(bearer),
    db: Session = Depends(get_db),
):
    u = get_current_user(db, creds.credentials)
    if not u:
        raise HTTPException(401, tr("auth.unauthorized"))

    r = db.query(HelpRequest).filter(HelpRequest.id == request_id).first()
    if not r:
        raise HTTPException(404, tr("request.not_found"))

    if not (r.user_id == u.id or r.accepted_by == u.id):
        raise HTTPException(403, tr("auth.forbidden"))

    return _help_request_detail_payload(db, r)




@app.get("/volunteer/requests/{request_id}", response_model=VolunteerRequestDetail)
def volunteer_request_detail(
    request_id: int,
    creds: HTTPAuthorizationCredentials = Depends(bearer),
    db: Session = Depends(get_db),
):
    token = creds.credentials
    u = get_current_user(db, token)
    if not u:
        raise HTTPException(401, tr("auth.unauthorized"))
    
    require_role(u, "volunteer")

    r = db.query(HelpRequest).filter(HelpRequest.id == request_id).first()
    if not r:
        raise HTTPException(404, tr("request.not_found"))

    if r.status != "new" and r.accepted_by != u.id:
        raise HTTPException(403, tr("auth.forbidden"))
    
    owner = db.query(User).filter(User.id == r.user_id).first()

    return {
        "id": r.id,
        "user_id": r.user_id,
        "kind": r.kind,
        "status": r.status,
        "created_at": r.created_at,
        "severity": r.severity,
        "symptoms": r.symptoms,
        "comments": r.comments,
        "accepted_by": r.accepted_by,
        "accepted_at": r.accepted_at,
        "in_progress_at": r.in_progress_at,
        "completed_at": r.completed_at,
        "canceled_at": r.canceled_at,
        "reaction_minutes": None,
        "lat": r.lat,
        "lng": r.lng,
        "address": r.address,
        "user_phone": owner.phone if owner else None,
        "user_name": owner.name if owner else None,
    }
    



@app.patch("/volunteer/requests/{request_id}/status", response_model=VolunteerRequestDetail)
def volunteer_update_status(
    request_id: int,
    data: VolunteerUpdateStatus,
    creds: HTTPAuthorizationCredentials = Depends(bearer),
    db: Session = Depends(get_db),
):
    token = creds.credentials
    u = get_current_user(db, token)
    if not u:
        raise HTTPException(401, tr("auth.unauthorized"))

    require_role(u, "volunteer")

    r = db.query(HelpRequest).filter(HelpRequest.id == request_id).first()
    if not r:
        raise HTTPException(404, tr("request.not_found"))

    if r.accepted_by != u.id:
        raise HTTPException(403, tr("auth.forbidden"))

    allowed = {"accepted", "in_progress", "completed", "canceled"}

    if data.status not in allowed:
        raise HTTPException(400, tr("volunteer.status_invalid"))

    if r.status in ("completed", "canceled"):
        raise HTTPException(400, tr("volunteer.request_closed"))

    if r.status == "new":
        raise HTTPException(400, tr("volunteer.must_accept_first"))

    if r.status == "accepted" and data.status not in ("in_progress", "canceled"):
        raise HTTPException(400, tr("volunteer.transition_from_accepted"))

    if r.status == "in_progress" and data.status not in ("completed", "canceled"):
        raise HTTPException(400, tr("volunteer.transition_from_in_progress"))
    
    now = datetime.utcnow()

    if data.status == "in_progress" and r.in_progress_at is None:
        r.in_progress_at = now

    if data.status == "completed" and r.completed_at is None:
        r.completed_at = now

    if data.status == "canceled" and r.canceled_at is None:
        r.canceled_at = now


    r.status = data.status
    db.commit()
    db.refresh(r)

    # Push: notify request owner about status change (in progress / completed / canceled) if enabled.
    try:
        owner_id = int(r.user_id)
        prefs = db.query(NotificationPrefs).filter(NotificationPrefs.user_id == owner_id).first()
        enabled = True if prefs is None else bool(prefs.updates)
        if enabled:
            tok = db.query(PushToken).filter(PushToken.user_id == owner_id).first()
            if tok and tok.token:
                title = "Обновление заявки"
                if r.status == "in_progress":
                    title = "Волонтёр в пути"
                elif r.status == "completed":
                    title = "Заявка завершена"
                elif r.status == "canceled":
                    title = "Заявка отменена"

                _send_expo_push(
                    [tok.token],
                    title=title,
                    body="Статус вашей заявки обновлён.",
                    data={"kind": "request_status", "request_id": r.id, "status": r.status},
                    db=db,
                )
    except Exception:
        pass
    return r

@app.get("/volunteer/{volunteer_id}/rating", response_model=VolunteerRating)
def volunteer_rating(volunteer_id: int, db: Session = Depends(get_db)):
    avg_rating = (
        db.query(func.avg(HelpRequest.rating))
        .filter(HelpRequest.accepted_by == volunteer_id, HelpRequest.rating.isnot(None))
        .scalar()
    )
    count = (
        db.query(func.count(HelpRequest.rating))
        .filter(HelpRequest.accepted_by == volunteer_id, HelpRequest.rating.isnot(None))
        .scalar()
    )

    return {
        "volunteer_id": volunteer_id,
        "avg_rating": float(avg_rating or 0.0),
        "reviews_count": int(count or 0),
    }


@app.get("/reviews/latest", response_model=List[ReviewFeedItem])
def latest_reviews(
    limit: int = Query(20, ge=1, le=100),
    db: Session = Depends(get_db),
):
    V = aliased(User)
    U = aliased(User)

    rows = (
        db.query(
            HelpRequest.id.label("request_id"),
            HelpRequest.rating,
            HelpRequest.review_text,
            HelpRequest.reviewed_at,
            HelpRequest.kind,
            HelpRequest.accepted_by.label("volunteer_id"),
            V.name.label("volunteer_name"),
            HelpRequest.user_id.label("user_id"),
            U.name.label("user_name"),
        )
        .join(V, V.id == HelpRequest.accepted_by)
        .join(U, U.id == HelpRequest.user_id)
        .filter(HelpRequest.rating.isnot(None))
        .order_by(HelpRequest.reviewed_at.desc())
        .limit(limit)
        .all()
    )

    return [
        {
            "request_id": r.request_id,
            "rating": int(r.rating),
            "review_text": r.review_text,
            "reviewed_at": r.reviewed_at,
            "volunteer_id": int(r.volunteer_id),
            "volunteer_name": r.volunteer_name,
            "user_id": int(r.user_id),
            "user_name": r.user_name,
            "kind": r.kind,
        }
        for r in rows
    ]


@app.get("/volunteer/{volunteer_id}/reviews", response_model=List[VolunteerReviewItem])
def volunteer_reviews(
    volunteer_id: int,
    limit: int = Query(20, ge=1, le=100),
    offset: int = Query(0, ge=0, le=10000),
    db: Session = Depends(get_db),
):
    U = aliased(User)

    rows = (
        db.query(
            HelpRequest.id.label("request_id"),
            HelpRequest.rating,
            HelpRequest.review_text,
            HelpRequest.reviewed_at,
            HelpRequest.kind,
            HelpRequest.user_id.label("user_id"),
            U.name.label("user_name"),
        )
        .join(U, U.id == HelpRequest.user_id)
        .filter(
            HelpRequest.accepted_by == volunteer_id,
            HelpRequest.rating.isnot(None),
        )
        .order_by(HelpRequest.reviewed_at.desc())
        .offset(offset)
        .limit(limit)
        .all()
    )

    return [
        {
            "request_id": r.request_id,
            "rating": int(r.rating),
            "review_text": r.review_text,
            "reviewed_at": r.reviewed_at,
            "user_id": int(r.user_id),
            "user_name": r.user_name,
            "kind": r.kind,
        }
        for r in rows
    ]

@app.get("/reviews/stats", response_model=ReviewsStats)
def reviews_stats(db: Session = Depends(get_db)):
    avg_rating = (
        db.query(func.avg(HelpRequest.rating))
        .filter(HelpRequest.rating.isnot(None))
        .scalar()
    )

    count = (
        db.query(func.count(HelpRequest.rating))
        .filter(HelpRequest.rating.isnot(None))
        .scalar()
    )

    return {
        "avg_rating": float(avg_rating or 0.0),
        "reviews_count": int(count or 0),
    }


@app.patch("/volunteer/me/geo")
def update_volunteer_geo(
    data: VolunteerGeoUpdate,
    creds: HTTPAuthorizationCredentials = Depends(bearer),
    db: Session = Depends(get_db),
):
    """Обновление координат волонтера"""
    u = get_current_user(db, creds.credentials)
    if not u:
        raise HTTPException(401, tr("auth.unauthorized"))
    
    require_role(u, "volunteer")
    
    u.volunteer_lat = data.volunteer_lat
    u.volunteer_lng = data.volunteer_lng

    u.volunteer_online_at = datetime.utcnow()
    
    db.commit()
    return {"ok": True}

@app.get("/geo/volunteers", response_model=List[NearbyVolunteer])
def get_nearby_volunteers(
    lat: float = Query(..., description="Latitude"),
    lng: float = Query(..., description="Longitude"),  
    radius_km: float = Query(5.0, description="Search radius in kilometers"),
    limit: int = Query(20, description="Maximum number of results"),
    db: Session = Depends(get_db),
):
    """Поиск ближайших волонтеров"""
    
    min_lat, max_lat, min_lng, max_lng = bbox(lat, lng, radius_km)
    
    online_threshold = datetime.utcnow() - timedelta(seconds=120)
    
    volunteers = (
        db.query(User)
        .filter(
            User.role == "volunteer",
            User.volunteer_lat.isnot(None),
            User.volunteer_lng.isnot(None),
            User.volunteer_online_at.isnot(None),
            User.volunteer_online_at >= online_threshold,
            User.volunteer_lat >= min_lat,
            User.volunteer_lat <= max_lat,
            User.volunteer_lng >= min_lng,
            User.volunteer_lng <= max_lng,
        )
        .all()
    )
    

    nearby = []
    for v in volunteers:
        distance = hav_km(lat, lng, v.volunteer_lat, v.volunteer_lng)
        if distance <= radius_km:
            try:
                now = datetime.now(timezone.utc)
                online_at = v.volunteer_online_at
                if online_at is None:
                    continue
                if online_at.tzinfo is None:
                    online_at = online_at.replace(tzinfo=timezone.utc)
                online_seconds = (now - online_at).total_seconds()
            except Exception:
                online_seconds = 0
            nearby.append(NearbyVolunteer(
                id=v.id,
                name=v.name,
                phone=v.phone,
                lat=v.volunteer_lat,
                lng=v.volunteer_lng,
                distance_km=round(distance, 2),
                online_minutes_ago=int(online_seconds // 60)
            ))
    
    nearby.sort(key=lambda x: x.distance_km)
    return nearby[:limit]

@app.get("/geo/requests", response_model=List[NearbyRequest])
def get_nearby_requests(
    lat: float = Query(..., description="Latitude"),
    lng: float = Query(..., description="Longitude"),  
    radius_km: float = Query(5.0, description="Search radius in kilometers"),
    limit: int = Query(20, description="Maximum number of results"),
    creds: HTTPAuthorizationCredentials = Depends(bearer),
    db: Session = Depends(get_db),
):
    """Поиск ближайших запросов о помощи (только для волонтеров)"""
    
    u = get_current_user(db, creds.credentials)
    if not u:
        raise HTTPException(401, tr("auth.unauthorized"))
    
    require_role(u, "volunteer")
    
    min_lat, max_lat, min_lng, max_lng = bbox(lat, lng, radius_km)
    

    requests = (
        db.query(HelpRequest)
        .filter(
            HelpRequest.status == "new",
            HelpRequest.lat.isnot(None),
            HelpRequest.lng.isnot(None),
            HelpRequest.lat >= min_lat,
            HelpRequest.lat <= max_lat,
            HelpRequest.lng >= min_lng,
            HelpRequest.lng <= max_lng,
        )
        .all()
    )
    
    nearby = []
    for r in requests:
        distance = hav_km(lat, lng, r.lat, r.lng)
        if distance <= radius_km:

            if r.kind == "sos":
                marker_color = "red"
            elif r.severity == "unstable":
                marker_color = "yellow" 
            elif r.severity == "light":
                marker_color = "green"
            else:
                marker_color = "orange" 
            
            created_seconds = (datetime.utcnow() - r.created_at).total_seconds()
            nearby.append(NearbyRequest(
                id=r.id,
                kind=r.kind,
                severity=r.severity,
                lat=r.lat,
                lng=r.lng,
                distance_km=round(distance, 2),
                created_minutes_ago=int(created_seconds // 60),
                marker_color=marker_color,
                address=r.address,
                symptoms=r.symptoms
            ))
    
    nearby.sort(key=lambda x: x.distance_km)
    return nearby[:limit]

@app.get("/geo/hospitals", response_model=List[HospitalItem])
def get_nearby_hospitals(
    lat: float = Query(..., description="Latitude"),
    lng: float = Query(..., description="Longitude"),  
    radius: int = Query(5000, description="Search radius in meters"),
    limit: int = Query(30, description="Maximum number of results"),
    db: Session = Depends(get_db),
):
    try:
        import httpx

        cache_key = (round(float(lat), 3), round(float(lng), 3), int(radius), int(limit))
        cached = HOSPITAL_CACHE.get(cache_key)
        if cached and (time.time() - cached[0]) < HOSPITAL_CACHE_TTL_SEC:
            return cached[1]

        radius = max(200, min(int(radius), 30000))
        limit = max(1, min(int(limit), 100))

        query = f"""
            [out:json][timeout:20];
            (
              nwr[\"amenity\"~\"^(hospital|clinic)$\"](around:{radius},{lat},{lng});
            );
            out center tags qt;
        """.strip()

        endpoints = [
            "https://overpass-api.de/api/interpreter",
            "https://overpass.kumi.systems/api/interpreter",
        ]

        last_err = None
        data = None
        for url in endpoints:
            try:
                with httpx.Client(timeout=25.0, headers={
                    "Content-Type": "text/plain;charset=UTF-8",
                    "User-Agent": "TayanApp/1.0",
                }) as client:
                    resp = client.post(url, content=query.encode("utf-8"))
                    resp.raise_for_status()
                    data = resp.json()
                    break
            except Exception as e:
                last_err = e
                data = None

        if not data:
            raise RuntimeError(f"Overpass unavailable: {last_err}")

        elements = data.get("elements", []) or []

        def _pick(*vals):
            for v in vals:
                if v is not None and str(v).strip() != "":
                    return str(v).strip()
            return None

        def _addr(tags: dict):
            full = _pick(tags.get("addr:full"), tags.get("address"))
            if full:
                return full
            parts = [
                _pick(tags.get("addr:city")),
                _pick(tags.get("addr:street")),
                _pick(tags.get("addr:housenumber")),
            ]
            parts = [p for p in parts if p]
            return ", ".join(parts) if parts else None

        def _phone(tags: dict):
            return _pick(
                tags.get("phone"),
                tags.get("contact:phone"),
                tags.get("mobile"),
            )

        seen = set()
        items: List[HospitalItem] = []
        for elem in elements:
            etype = elem.get("type")
            eid = elem.get("id")
            if not etype or not eid:
                continue

            tags = elem.get("tags") or {}
            name = _pick(tags.get("name"), tags.get("name:ru"), tags.get("name:en")) or "Медицинское учреждение"

            if etype == "node":
                h_lat = elem.get("lat")
                h_lng = elem.get("lon")
            else:
                center = elem.get("center") or {}
                h_lat = center.get("lat")
                h_lng = center.get("lon")

            if h_lat is None or h_lng is None:
                continue

            key = (round(float(h_lat), 6), round(float(h_lng), 6), (name or ""))
            if key in seen:
                continue
            seen.add(key)

            dist = hav_km(lat, lng, float(h_lat), float(h_lng))
            items.append(HospitalItem(
                name=name,
                lat=float(h_lat),
                lng=float(h_lng),
                distance_km=round(dist, 2),
                address=_addr(tags),
                phone=_phone(tags),
                osm_type=etype,
                osm_id=int(eid),
            ))

        items.sort(key=lambda x: x.distance_km)
        if not items:
            items = _get_sample_hospitals(lat, lng, limit)
        else:
            items = items[:limit]

        HOSPITAL_CACHE[cache_key] = (time.time(), items)
        return items
    except Exception:
        return _get_sample_hospitals(lat, lng, limit)

def _get_sample_hospitals(lat: float, lng: float, limit: int) -> List[HospitalItem]:
    """Fallback sample data for Bishkek area"""
    sample_hospitals = [
        {"name": "Национальный центр кардиологии", "lat": 42.8725, "lng": 74.5941, "address": "ул. Тоголок Молдо 3"},
        {"name": "Республиканская клиническая больница", "lat": 42.8556, "lng": 74.5837, "address": "ул. Логвиненко 8"},
        {"name": "НЦОМиД им. С.Б.Данияровой", "lat": 42.8678, "lng": 74.5874, "address": "ул. Ахунбаева 190"},
        {"name": "Центр семейной медицины №3", "lat": 42.8901, "lng": 74.5612, "address": "ул. Киевская 148"},
        {"name": "Городская клиническая больница №1", "lat": 42.8445, "lng": 74.6011, "address": "ул. Льва Толстого 105/2"},
        {"name": "Медицинский центр Аsia", "lat": 42.8834, "lng": 74.5719, "address": "ул. Манаса 40/1"},
        {"name": "Центр семейной медицины №9", "lat": 42.8321, "lng": 74.5677, "address": "ул. Южная магистраль 81"},
        {"name": "Поликлиника №15", "lat": 42.8512, "lng": 74.5344, "address": "мкр. Джал 29/1"}
    ]
    
    import math
    
    def haversine_distance(lat1, lon1, lat2, lon2):
        R = 6371
        dlat = math.radians(lat2 - lat1)
        dlon = math.radians(lon2 - lon1)
        a = math.sin(dlat/2) * math.sin(dlat/2) + math.cos(math.radians(lat1)) * math.cos(math.radians(lat2)) * math.sin(dlon/2) * math.sin(dlon/2)
        c = 2 * math.atan2(math.sqrt(a), math.sqrt(1-a))
        return R * c
    
    hospitals = []
    for i, h in enumerate(sample_hospitals):
        distance = haversine_distance(lat, lng, h["lat"], h["lng"])
        hospitals.append(HospitalItem(
            name=h["name"],
            lat=h["lat"],
            lng=h["lng"],
            distance_km=round(distance, 2),
            address=h["address"],
            osm_type="sample",
            osm_id=i
        ))
    
    hospitals.sort(key=lambda x: x.distance_km)
    return hospitals[:limit]









