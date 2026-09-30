import asyncio
import logging
from contextlib import asynccontextmanager

from pathlib import Path

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse
from fastapi.staticfiles import StaticFiles

from app.config import settings
from app.database import Base, SessionLocal, engine
from app.live_feed import refresh_live
from app.routers import auth_routes, cities, me, watches
from app.seed import seed_catalog

DIST = Path(__file__).resolve().parents[2] / "frontend" / "dist"

logger = logging.getLogger("aether")


async def _live_loop():
    while True:
        try:
            count = await asyncio.to_thread(refresh_live)
            logger.info("Refreshed live air quality for %s cities", count)
        except Exception:
            logger.exception("Live air-quality refresh failed")
        await asyncio.sleep(600)


@asynccontextmanager
async def lifespan(_app: FastAPI):
    Base.metadata.create_all(bind=engine)
    db = SessionLocal()
    try:
        seed_catalog(db)
    finally:
        db.close()
    task = asyncio.create_task(_live_loop())
    yield
    task.cancel()


app = FastAPI(title="Aether API", version="1.0.0", lifespan=lifespan)

origins = [o.strip() for o in settings.cors_origins.split(",") if o.strip()]
app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(auth_routes.router)
app.include_router(me.router)
app.include_router(cities.router)
app.include_router(watches.router)


@app.get("/api/health")
def health():
    return {"status": "ok", "service": "aether"}


if DIST.exists():
    assets = DIST / "assets"
    if assets.exists():
        app.mount("/assets", StaticFiles(directory=assets), name="assets")

    @app.get("/{full_path:path}")
    def frontend(full_path: str):
        candidate = DIST / full_path
        if full_path and candidate.is_file():
            return FileResponse(candidate)
        return FileResponse(DIST / "index.html")
