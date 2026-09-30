"""
Upload API Endpoint: Handles user uploads for Source 1, Source 2, and Source 3 datasets.
"""

import os
import shutil
from typing import Optional
from fastapi import APIRouter, UploadFile, File, Form, HTTPException
from app.services.dataset_service import get_dataset_manager

UPLOADS_DIR = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "..", "data", "uploads"))

router = APIRouter(prefix="/api/upload", tags=["Data Upload"])

CHUNK_SIZE = 1024 * 1024  # 1 MB chunk

@router.post("/datasets")
async def upload_datasets(
    source1: Optional[UploadFile] = File(None),
    source2: Optional[UploadFile] = File(None),
    source3: Optional[UploadFile] = File(None),
):
    manager = get_dataset_manager()
    os.makedirs(UPLOADS_DIR, exist_ok=True)
    uploaded_info = {}

    files_map = {
        "source1": source1,
        "source2": source2,
        "source3": source3
    }

    for source_key, up_file in files_map.items():
        if up_file and up_file.filename:
            dest_path = os.path.join(UPLOADS_DIR, f"user_{source_key}_{up_file.filename}")
            with open(dest_path, "wb") as buffer:
                while chunk := await up_file.read(CHUNK_SIZE):
                    buffer.write(chunk)

            size_bytes = os.path.getsize(dest_path)
            uploaded_info[source_key] = {
                "filename": up_file.filename,
                "path": dest_path,
                "size_bytes": size_bytes,
                "size_mb": round(size_bytes / (1024 * 1024), 2)
            }
            manager.uploaded_files[source_key] = dest_path

    if uploaded_info:
        manager.active_data_source = "uploaded"

    return {
        "success": True,
        "message": f"Successfully uploaded {len(uploaded_info)} dataset file(s).",
        "uploaded_files": uploaded_info,
        "active_source": manager.active_data_source
    }

@router.post("/load-sample")
def load_sample_datasets():
    """Instantly loads the 5k sample datasets from sample_test_datasets/ into uploads."""
    manager = get_dataset_manager()
    os.makedirs(UPLOADS_DIR, exist_ok=True)
    sample_dir = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "..", "..", "sample_test_datasets"))
    
    uploaded_info = {}
    mapping = {
        "source1": "source1_5k.tsv",
        "source2": "source2_5k.tsv",
        "source3": "source3_5k.tsv"
    }

    for key, fname in mapping.items():
        src_path = os.path.join(sample_dir, fname)
        if os.path.isfile(src_path):
            dest_path = os.path.join(UPLOADS_DIR, f"user_{key}_{fname}")
            shutil.copyfile(src_path, dest_path)
            size_bytes = os.path.getsize(dest_path)
            uploaded_info[key] = {
                "filename": fname,
                "path": dest_path,
                "size_bytes": size_bytes,
                "size_mb": round(size_bytes / (1024 * 1024), 2)
            }
            manager.uploaded_files[key] = dest_path

    if uploaded_info:
        manager.active_data_source = "uploaded"

    return {
        "success": True,
        "message": "Instantly loaded 3 sample 5k datasets (Source 1, 2, 3) into uploads!",
        "uploaded_files": uploaded_info,
        "active_source": manager.active_data_source
    }

@router.get("/status")
def get_upload_status():
    manager = get_dataset_manager()
    return {
        "active_source": manager.active_data_source,
        "uploaded_files": manager.uploaded_files
    }
