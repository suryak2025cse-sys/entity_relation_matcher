"""
Main FastAPI Application Entrypoint.
"""

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
import os

from app.api.dashboard import router as dashboard_router
from app.api.training import router as training_router
from app.api.upload import router as upload_router
from app.api.validation import router as validation_router
from app.api.preprocessing import router as preprocessing_router
from app.api.candidates import router as candidates_router
from app.api.features import router as features_router
from app.api.matching import router as matching_router
from app.api.results import router as results_router
from app.api.analytics import router as analytics_router
from app.api.output import router as output_router

app = FastAPI(
    title="Business Entity Resolution Platform",
    description="Enterprise full-stack entity matching system with fixed training dataset and reusable ML models.",
    version="1.0.0"
)

# CORS configuration
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Include API routers
app.include_router(dashboard_router)
app.include_router(training_router)
app.include_router(upload_router)
app.include_router(validation_router)
app.include_router(preprocessing_router)
app.include_router(candidates_router)
app.include_router(features_router)
app.include_router(matching_router)
app.include_router(results_router)
app.include_router(analytics_router)
app.include_router(output_router)

@app.get("/health")
def health_check():
    return {"status": "ok", "service": "Business Entity Resolution API"}

if __name__ == "__main__":
    import uvicorn
    uvicorn.run("app.main:app", host="0.0.0.0", port=8000, reload=True)
