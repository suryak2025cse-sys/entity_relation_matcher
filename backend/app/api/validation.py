"""
Validation API Endpoint: Validates source datasets and ground truth schema, encoding, and IDs.
"""

import os
from fastapi import APIRouter, HTTPException, Query
from app.services.dataset_service import get_dataset_manager
from app.schemas.api_schemas import ValidationReport

router = APIRouter(prefix="/api/validation", tags=["Data Validation"])

@router.get("/report", response_model=ValidationReport)
@router.post("/validate", response_model=ValidationReport)
@router.post("/run", response_model=ValidationReport)
def get_validation_report(dataset_type: str = Query("training", enum=["training", "test", "uploaded"])):
    manager = get_dataset_manager()
    status = manager.archive_service.get_archive_status()

    sources_to_validate = {}
    gt_file = None

    if dataset_type == "uploaded" and manager.uploaded_files:
        sources_to_validate["source1"] = (manager.uploaded_files.get("source1"), "S1-")
        sources_to_validate["source2"] = (manager.uploaded_files.get("source2"), "S2-")
        sources_to_validate["source3"] = (manager.uploaded_files.get("source3"), "S3-")
    elif dataset_type == "test":
        sources_to_validate["source1"] = (status.get("test_source1_file"), "S1-")
        sources_to_validate["source2"] = (status.get("test_source2_file"), "S2-")
        sources_to_validate["source3"] = (status.get("test_source3_file"), "S3-")
    else: # training
        sources_to_validate["source1"] = (status.get("source1_file"), "S1-")
        sources_to_validate["source2"] = (status.get("source2_file"), "S2-")
        sources_to_validate["source3"] = (status.get("source3_file"), "S3-")
        gt_file = status.get("ground_truth_file")

    source_results = {}
    all_errors = []
    all_warnings = []

    for src_name, (fpath, prefix) in sources_to_validate.items():
        if fpath and os.path.isfile(fpath):
            res = manager.validation_service.validate_entity_file(fpath, expected_prefix=prefix)
            source_results[src_name] = res
            all_errors.extend(res.get("errors", []))
            all_warnings.extend(res.get("warnings", []))
        else:
            source_results[src_name] = {
                "file_path": None,
                "is_valid": False,
                "errors": [f"{src_name} file not found."],
                "warnings": [],
                "total_rows": 0,
                "sample_rows": []
            }
            all_errors.append(f"{src_name} file not found.")

    gt_report = None
    if gt_file and os.path.isfile(gt_file):
        gt_report = manager.validation_service.validate_ground_truth_file(gt_file)
        all_errors.extend(gt_report.get("errors", []))
        all_warnings.extend(gt_report.get("warnings", []))

    report = {
        "is_valid": len(all_errors) == 0,
        "errors": all_errors,
        "warnings": all_warnings,
        "sources": source_results,
        "ground_truth": gt_report
    }

    manager.last_validation_report = report
    return ValidationReport(**report)
