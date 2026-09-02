import os
from pathlib import Path

from fastapi import FastAPI
from fastapi.responses import FileResponse
from fastapi.staticfiles import StaticFiles

from app.database import Base, engine
from app.routers import auth, employees

Base.metadata.create_all(bind=engine)

app = FastAPI(title="Internal Employee Portal")

app.include_router(auth.router, prefix="/api/auth", tags=["auth"])
app.include_router(employees.router, prefix="/api/employees", tags=["employees"])


@app.get("/healthz")
def healthz():
    return {"status": "ok"}


_frontend_dist = Path(
    os.environ.get(
        "FRONTEND_DIST_PATH",
        str(Path(__file__).parent.parent.parent / "frontend" / "dist"),
    )
)
if _frontend_dist.is_dir():
    app.mount(
        "/assets",
        StaticFiles(directory=str(_frontend_dist / "assets")),
        name="frontend-assets",
    )

    @app.get("/{full_path:path}")
    async def serve_spa(full_path: str):
        return FileResponse(str(_frontend_dist / "index.html"))
