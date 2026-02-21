import os
from datetime import datetime, timedelta, timezone
from jose import jwt
from passlib.context import CryptContext

pwd = CryptContext(schemes=["argon2"], deprecated="auto")

SECRET_KEY = os.getenv("SECRET_KEY", "CHANGE_ME_TO_SOMETHING_LONG")
ALGORITHM = "HS256"
EXPIRE_MIN = int(os.getenv("JWT_EXPIRE_MIN", str(60 * 24 * 7)))


def _bool_env(name: str, default: bool = False) -> bool:
    v = os.getenv(name)
    if v is None:
        return default
    return v.strip().lower() in {"1", "true", "yes", "y", "on"}


_APP_ENV = (os.getenv("APP_ENV", "dev") or "dev").strip().lower()
_ALLOW_INSECURE_SECRET = _bool_env("ALLOW_INSECURE_SECRET_KEY", False)

if SECRET_KEY == "CHANGE_ME_TO_SOMETHING_LONG" and _APP_ENV in {"prod", "production", "staging"} and not _ALLOW_INSECURE_SECRET:
    raise RuntimeError("SECRET_KEY must be set in staging/production")

def hash_password(p: str) -> str:
    return pwd.hash(p)

def verify_password(p: str, h: str) -> bool:
    return pwd.verify(p, h)

def create_token(user_id: int) -> str:
    now = datetime.now(timezone.utc)
    exp = now + timedelta(minutes=EXPIRE_MIN)
    return jwt.encode({"sub": str(user_id), "iat": int(now.timestamp()), "exp": exp}, SECRET_KEY, algorithm=ALGORITHM)
