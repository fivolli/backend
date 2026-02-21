# Tayan Backend - staging deploy notes

## 1) Environment variables
Set these as secrets/vars in your hosting panel:

- `DATABASE_URL`
  - SQLite (simple): `sqlite:///./app.db`
  - Postgres (recommended): `postgresql+psycopg2://USER:PASSWORD@HOST:5432/DBNAME`
- `DB_AUTO_CREATE`
  - `true` is OK for local SQLite MVP only
  - `false` for Postgres (use Alembic migrations)
- `APP_ENV`
  - `staging` or `prod` on deployed environments
- `SECRET_KEY`
  - Must be a long random string in staging/prod
- `TRUSTED_HOSTS`
  - Comma-separated domain names allowed in `Host` header
- `CORS_ALLOW_ORIGINS`
  - Comma-separated frontend origins
- `HTTPS_ONLY`
  - Set `true` behind HTTPS to enable HSTS
- `MAX_BODY_BYTES`, `MAX_AVATAR_BYTES`
  - Request/upload size limits
- `GLOBAL_RATE_LIMIT_RPM`, `AUTH_RATE_LIMIT_RPM`, `AI_RATE_LIMIT_RPM`
  - Basic per-minute throttling

Local dev only:
- `ALLOW_INSECURE_SECRET_KEY`
  - Keep `false` in staging/prod

AI (optional):
- `OPENAI_API_KEY` - required to enable `POST /ai/triage`
- `OPENAI_MODEL` - optional (default: `gpt-5-nano`)

## 2) Install
Use Python 3.12.

- Install deps: `pip install -r requirements.txt`

Local dev convenience:
- Backend auto-loads `Backend/.env` on startup
- Put `OPENAI_API_KEY=...` there to enable `POST /ai/triage`

## 3) Database migrations (recommended)
Run Alembic migrations on deploy:

- `alembic upgrade head`

Postgres quick start (example):
- Create DB/user in your provider.
- Set `DATABASE_URL=postgresql+psycopg2://USER:PASSWORD@HOST:5432/DBNAME`
- Set `DB_AUTO_CREATE=false`
- Run `alembic upgrade head`

## 4) Start command
- `uvicorn app.main:app --host 0.0.0.0 --port 8000`

## 5) Health check
Quick checks after deploy:
- `GET /docs` should load
- `GET /` should return `{"status":"ok"}`
- Register/login and run one AI triage job end-to-end

## Notes
- Backend fails fast in staging/prod when `SECRET_KEY` is default.
- For production, use Postgres instead of SQLite.
- If you run behind a reverse proxy, keep proxy timeout above your AI job polling expectations.
