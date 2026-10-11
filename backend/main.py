from contextlib import asynccontextmanager
from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from backend.config import settings
from backend.core.state import app_state
from backend.core.screening.pipeline import SCIENTIFIC_DISCLAIMER_TEXT
from backend.routes.health import router as health_router
from backend.routes.objects import router as objects_router
from backend.routes.conjunctions import router as conjunctions_router
from backend.routes.ephemeris import router as ephemeris_router
from backend.routes.weather import router as weather_router

@asynccontextmanager
async def lifespan(app: FastAPI):
    # Initialize application state (load catalog, screen lookahead window, load weather)
    print("Initializing TRAJACTRA Astrodynamics Engine...")
    app_state.initialize(force_offline=settings.OFFLINE_MODE)
    print(f"Engine Ready: {len(app_state.objects)} objects tracked, "
          f"{app_state.conjunctions.screening_metadata.events_count if app_state.conjunctions else 0} conjunctions screened.")
    yield

app = FastAPI(
    title=settings.PROJECT_NAME,
    description=settings.PROJECT_DESCRIPTOR,
    version="1.0.0",
    lifespan=lifespan
)

# CORS Middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.CORS_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Scientific Disclaimer Header Middleware
@app.middleware("http")
async def add_aerospace_headers(request: Request, call_next):
    response = await call_next(request)
    response.headers["X-Scientific-Disclaimer"] = SCIENTIFIC_DISCLAIMER_TEXT
    return response

# Register API Routers
app.include_router(health_router)
app.include_router(objects_router)
app.include_router(conjunctions_router)
app.include_router(ephemeris_router)
app.include_router(weather_router)

@app.get("/")
def root():
    return {
        "product": settings.PROJECT_NAME,
        "descriptor": settings.PROJECT_DESCRIPTOR,
        "documentation": "/docs",
        "health": "/health",
        "api_v1": {
            "objects": "/api/v1/objects",
            "conjunctions": "/api/v1/conjunctions",
            "weather": "/api/v1/weather/current"
        },
        "disclaimer": SCIENTIFIC_DISCLAIMER_TEXT
    }

if __name__ == "__main__":
    import uvicorn
    uvicorn.run("backend.main:app", host="0.0.0.0", port=settings.BACKEND_PORT, reload=False)
