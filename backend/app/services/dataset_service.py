"""
Dataset Service & State Manager.
Coordinates file paths, active dataset states, archive extractions, and service instances.
"""

import os
from typing import Dict, Any, Optional

from app.services.archive_service import ArchiveService
from app.services.validation_service import ValidationService
from app.services.preprocessing_service import PreprocessingService
from app.services.candidate_service import CandidateService
from app.services.feature_service import FeatureService
from app.services.training_service import TrainingService
from app.services.matching_service import MatchingService
from app.services.analytics_service import AnalyticsService
from app.services.output_service import OutputService

class DatasetManager:
    """Singleton-like manager for dataset workflows and service instances."""
    _instance = None

    def __new__(cls):
        if cls._instance is None:
            cls._instance = super(DatasetManager, cls).__new__(cls)
            cls._instance.archive_service = ArchiveService()
            cls._instance.validation_service = ValidationService()
            cls._instance.preprocessing_service = PreprocessingService()
            cls._instance.candidate_service = CandidateService()
            cls._instance.feature_service = FeatureService()
            cls._instance.training_service = TrainingService()
            cls._instance.matching_service = MatchingService()
            cls._instance.analytics_service = AnalyticsService()
            cls._instance.output_service = OutputService()
            
            # State tracking
            cls._instance.last_validation_report = None
            cls._instance.last_preprocessing_report = None
            cls._instance.last_candidate_report = None
            cls._instance.last_feature_report = None
            cls._instance.uploaded_files = {}
            cls._instance.sync_uploaded_files()
            cls._instance.active_data_source = "uploaded" if cls._instance.uploaded_files else "extracted"

        return cls._instance

    def sync_uploaded_files(self):
        """Scans backend/data/uploads for the newest uploaded source files."""
        uploads_dir = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "..", "data", "uploads"))
        if not os.path.isdir(uploads_dir):
            return

        files = []
        for fname in os.listdir(uploads_dir):
            fpath = os.path.join(uploads_dir, fname)
            if os.path.isfile(fpath) and fname.endswith((".tsv", ".csv", ".txt")):
                files.append((fpath, os.path.getmtime(fpath)))
        files.sort(key=lambda x: x[1], reverse=True)

        self.uploaded_files = {}
        for fpath, _ in files:
            fname_lower = os.path.basename(fpath).lower()
            if ("source1" in fname_lower or "s1" in fname_lower) and "source1" not in self.uploaded_files:
                self.uploaded_files["source1"] = fpath
            elif ("source2" in fname_lower or "s2" in fname_lower) and "source2" not in self.uploaded_files:
                self.uploaded_files["source2"] = fpath
            elif ("source3" in fname_lower or "s3" in fname_lower) and "source3" not in self.uploaded_files:
                self.uploaded_files["source3"] = fpath

        if self.uploaded_files:
            self.active_data_source = "uploaded"

def get_dataset_manager() -> DatasetManager:
    manager = DatasetManager()
    manager.sync_uploaded_files()
    return manager
