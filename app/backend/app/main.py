import os
from pathlib import Path

from fastapi import FastAPI, HTTPException
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


def mount_frontend(app: FastAPI, dist: Path) -> None:
    """Serve the built SPA: real files from dist/, index.html for client-side routes."""
    if not dist.is_dir():
        return
    root = dist.resolve()
    if (root / "assets").is_dir():
        app.mount("/assets", StaticFiles(directory=str(root / "assets")), name="frontend-assets")

    @app.get("/{full_path:path}")
    async def serve_spa(full_path: str):
        if full_path == "api" or full_path.startswith("api/"):
            raise HTTPException(status_code=404, detail="Not Found")
        candidate = (root / full_path).resolve()
        if full_path and candidate.is_file() and candidate.is_relative_to(root):
            return FileResponse(str(candidate))
        return FileResponse(str(root / "index.html"))


mount_frontend(
    app,
    Path(
        os.environ.get(
            "FRONTEND_DIST_PATH",
            str(Path(__file__).parent.parent.parent / "frontend" / "dist"),
        )
    ),
)
