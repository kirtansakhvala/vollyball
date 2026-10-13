import os
import mimetypes

# Fix Python standard library mimetypes
mimetypes.init()
mimetypes.add_type("application/javascript", ".js")
mimetypes.add_type("application/javascript", ".mjs")
mimetypes.add_type("text/css", ".css")
mimetypes.add_type("image/svg+xml", ".svg")
mimetypes.add_type("application/json", ".json")

from contextlib import asynccontextmanager
from fastapi import FastAPI, WebSocket, WebSocketDisconnect, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse, Response
from backend.config import settings
from backend.database import init_db
from backend.routers import tournaments, teams, players, matches, scoring, system
from backend.websocket_manager import ws_manager

@asynccontextmanager
async def lifespan(app: FastAPI):
    # Safe database startup: initializes missing tables without dropping existing data
    init_db()
    yield

app = FastAPI(
    title="VolleyPro Scoring & Tournament API",
    description="Authoritative Volleyball Tournament and Live-Scoring Engine with Persistent SQLite storage.",
    version="1.0.0",
    lifespan=lifespan
)

origins = settings.CORS_ORIGINS.split(",") if settings.CORS_ORIGINS != "*" else ["*"]
app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Register API Routers
app.include_router(tournaments.router)
app.include_router(teams.router)
app.include_router(players.router)
app.include_router(matches.router)
app.include_router(scoring.router)
app.include_router(system.router)

@app.get("/api/health")
@app.get("/healthz")
def healthcheck():
    return {"status": "ok", "app": "VolleyPro", "version": "1.0.0"}

# WebSocket Endpoints
@app.websocket("/ws/volleyball/matches/{match_id}")
async def websocket_match_endpoint(websocket: WebSocket, match_id: int):
    await ws_manager.connect_match(match_id, websocket)
    try:
        while True:
            data = await websocket.receive_text()
            if data == "ping":
                await websocket.send_text("pong")
    except WebSocketDisconnect:
        ws_manager.disconnect_match(match_id, websocket)
    except Exception:
        ws_manager.disconnect_match(match_id, websocket)

@app.websocket("/ws/volleyball/live")
async def websocket_global_endpoint(websocket: WebSocket):
    await ws_manager.connect_global(websocket)
    try:
        while True:
            data = await websocket.receive_text()
            if data == "ping":
                await websocket.send_text("pong")
    except WebSocketDisconnect:
        ws_manager.disconnect_global(websocket)
    except Exception:
        ws_manager.disconnect_global(websocket)

# Static Frontend & Single Page Application (SPA) Serving
frontend_dist_path = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "frontend", "dist"))

def get_mime_type(file_path: str) -> str:
    ext = os.path.splitext(file_path)[1].lower()
    mapping = {
        ".js": "application/javascript; charset=utf-8",
        ".mjs": "application/javascript; charset=utf-8",
        ".css": "text/css; charset=utf-8",
        ".html": "text/html; charset=utf-8",
        ".svg": "image/svg+xml",
        ".json": "application/json; charset=utf-8",
        ".png": "image/png",
        ".jpg": "image/jpeg",
        ".jpeg": "image/jpeg",
        ".ico": "image/x-icon",
        ".woff2": "font/woff2",
        ".woff": "font/woff",
        ".ttf": "font/ttf"
    }
    return mapping.get(ext, "application/octet-stream")

if os.path.exists(frontend_dist_path):
    @app.get("/assets/{asset_file:path}")
    async def serve_dist_assets(asset_file: str):
        target = os.path.join(frontend_dist_path, "assets", asset_file)
        if os.path.exists(target) and os.path.isfile(target):
            mime = get_mime_type(target)
            return FileResponse(target, media_type=mime.split(";")[0], headers={"Content-Type": mime})
        raise HTTPException(status_code=404, detail="Asset not found")

    @app.get("/{full_path:path}")
    async def serve_spa(full_path: str):
        target_file = os.path.join(frontend_dist_path, full_path)
        if full_path and os.path.exists(target_file) and os.path.isfile(target_file):
            mime = get_mime_type(target_file)
            return FileResponse(target_file, media_type=mime.split(";")[0], headers={"Content-Type": mime})
        
        index_file = os.path.join(frontend_dist_path, "index.html")
        if os.path.exists(index_file):
            return FileResponse(
                index_file, 
                media_type="text/html", 
                headers={
                    "Content-Type": "text/html; charset=utf-8",
                    "Cache-Control": "no-cache, no-store, must-revalidate",
                    "Pragma": "no-cache",
                    "Expires": "0"
                }
            )
        return {"message": "VolleyPro API is running. Frontend build not found."}

if __name__ == "__main__":
    import uvicorn
    uvicorn.run("backend.main:app", host=settings.HOST, port=settings.PORT, reload=(settings.ENV == "development"))
