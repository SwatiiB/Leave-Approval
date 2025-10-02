import os
import sys
from pathlib import Path

# Add both server and server/app to Python path for Vercel
current_file = Path(__file__).resolve()
server_app_dir = current_file.parent
server_dir = server_app_dir.parent
root_dir = server_dir.parent

# Add paths to sys.path
for path in [str(root_dir), str(server_dir), str(server_app_dir)]:
    if path not in sys.path:
        sys.path.insert(0, path)

from fastapi import FastAPI, Request, Response
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse
from dotenv import load_dotenv

# Load environment variables
load_dotenv()
# Also try loading from server directory
load_dotenv(server_dir / ".env")

app = FastAPI(title="Leave Approval System API", version="1.0.0")

# Import routes after path setup
try:
    from routes import auth, leave
except ImportError:
    try:
        from app.routes import auth, leave
    except ImportError:
        from server.app.routes import auth, leave

# AMP Email CORS Middleware
@app.middleware("http")
async def add_amp_cors_headers(request: Request, call_next):
    response = await call_next(request)
    
    # Add AMP-specific CORS headers
    if request.url.path.startswith("/leave/"):
        # Get the source origin from AMP request
        amp_source_origin = request.query_params.get("__amp_source_origin")
        if amp_source_origin:
            # Decode the email address (URL encoded)
            import urllib.parse
            decoded_origin = urllib.parse.unquote(amp_source_origin)
            response.headers["AMP-Access-Control-Allow-Source-Origin"] = decoded_origin
        else:
            # Fallback for non-AMP requests
            response.headers["AMP-Access-Control-Allow-Source-Origin"] = request.headers.get("Origin", "*")
        
        response.headers["Access-Control-Allow-Origin"] = "*"
        response.headers["Access-Control-Allow-Methods"] = "GET, POST, PUT, DELETE, OPTIONS"
        response.headers["Access-Control-Allow-Headers"] = "*"
        response.headers["Access-Control-Expose-Headers"] = "*"
        response.headers["Access-Control-Allow-Credentials"] = "true"
    
    return response

# Get URLs from environment for CORS configuration
FRONTEND_URL = os.getenv("FRONTEND_URL", "http://localhost:5173")
BACKEND_URL = os.getenv("BACKEND_URL", "http://localhost:8000")

# Enhanced CORS configuration for AMP emails
# Based on working configuration that properly handles AMP email rendering
origins = [
    # Development origins
    "http://localhost:3000",
    "http://localhost:5173",  # Vite default port
    "http://127.0.0.1:5173",
    "http://127.0.0.1:3000",
    # Production URLs from environment
    FRONTEND_URL,
    BACKEND_URL,
    # Google/Gmail AMP email origins
    "https://mail.google.com",
    "https://gmail.com", 
    "https://amp.gmail.dev",
    # Google domains pattern support
    "https://accounts.google.com",
    "https://mail.google.com",
    "https://googlemail.com",
]

# Remove duplicates and None values
origins = list(set(filter(None, origins)))

app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    allow_headers=[
        "Content-Type",
        "Authorization", 
        "X-Requested-With",
        "Accept",
        "Origin",
        "AMP-CORS-REQUEST-HEADERS",  # Critical for AMP emails
        "AMP-Same-Origin",           # Critical for AMP emails
        "*"  # Allow all headers for AMP compatibility
    ],
    expose_headers=[
        "AMP-Access-Control-Allow-Source-Origin",
        "AMP-CORS-REQUEST-HEADERS",
        "Access-Control-Expose-Headers",
        "*"  # Expose all headers for AMP compatibility
    ],
)

# Create an API router to handle the /api prefix
from fastapi import APIRouter
api_router = APIRouter()

# Include all sub-routers under the API router
api_router.include_router(auth.router, prefix="/auth", tags=["auth"])
api_router.include_router(leave.router, prefix="/leave", tags=["leave"])

# Add the API router to the main app with /api prefix
app.include_router(api_router, prefix="/api")

# Also include routes without /api prefix for direct access
app.include_router(auth.router, prefix="/auth", tags=["auth-direct"])
app.include_router(leave.router, prefix="/leave", tags=["leave-direct"])

# Add a test endpoint to verify API is working
@app.get("/health")
def health_check():
    return {"status": "healthy", "message": "API is working"}

@app.get("/api/health") 
def api_health_check():
    return {"status": "healthy", "message": "API endpoint is working"}

# Debug endpoint to list all routes
@app.get("/debug/routes")
def list_routes():
    routes = []
    for route in app.routes:
        if hasattr(route, 'methods') and hasattr(route, 'path'):
            routes.append({
                "path": route.path,
                "methods": list(route.methods)
            })
    return {"routes": routes}

# Static frontend serving (expects built files copied to ./static/client)
STATIC_CLIENT_DIR = os.path.join(os.path.dirname(__file__), "static", "client")
if os.path.isdir(STATIC_CLIENT_DIR):
    app.mount("/assets", StaticFiles(directory=os.path.join(STATIC_CLIENT_DIR, "assets")), name="assets")

@app.get("/")
def root():
    # Serve SPA index if available, otherwise API info
    index_path = os.path.join(STATIC_CLIENT_DIR, "index.html")
    if os.path.isfile(index_path):
        return FileResponse(index_path)
    return {"message": "Leave Application System API", "version": "1.0.0"}

# SPA fallback for client-side routes
@app.get("/{full_path:path}")
def spa_fallback(full_path: str):
    index_path = os.path.join(STATIC_CLIENT_DIR, "index.html")
    if os.path.isfile(index_path):
        return FileResponse(index_path)
    return {"detail": "Not Found"}
