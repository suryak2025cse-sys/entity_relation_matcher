"""
Archive Service: Detects, inspects, and safely extracts dataset archives.
Never modifies original archive.
"""

import os
import zipfile
import tarfile
import shutil
import pandas as pd
from typing import Dict, Any, List, Optional, Tuple

ROOT_DIR = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "..", ".."))
BACKEND_DIR = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", ".."))
TRAINING_DATA_DIR = os.path.join(BACKEND_DIR, "data", "training")
EXTRACTED_DATA_DIR = os.path.join(BACKEND_DIR, "data", "extracted")

class ArchiveService:
    def __init__(self):
        os.makedirs(TRAINING_DATA_DIR, exist_ok=True)
        os.makedirs(EXTRACTED_DATA_DIR, exist_ok=True)

    def find_archive(self) -> Optional[str]:
        """
        Locates archive in backend/data/training/ or project root.
        """
        # 1. Check backend/data/training/
        for fname in os.listdir(TRAINING_DATA_DIR):
            if fname.endswith(('.zip', '.tar.gz', '.tgz', '.tar')):
                return os.path.join(TRAINING_DATA_DIR, fname)
                
        # 2. Check root workspace dir
        for fname in os.listdir(ROOT_DIR):
            if fname.endswith(('.zip', '.tar.gz', '.tgz', '.tar')):
                return os.path.join(ROOT_DIR, fname)
                
        return None

    def get_archive_status(self) -> Dict[str, Any]:
        """Inspects archive existence and extraction state."""
        archive_path = self.find_archive()
        extracted_files = self.list_extracted_files()
        is_extracted = len(extracted_files) > 0
        classified = self.classify_files(extracted_files)

        if not archive_path or not os.path.isfile(archive_path):
            return {
                "detected": is_extracted,
                "archive_path": archive_path,
                "archive_name": "dataset_archive.zip" if is_extracted else None,
                "file_size_bytes": sum(f["size_bytes"] for f in extracted_files),
                "file_size_formatted": f"{sum(f['size_mb'] for f in extracted_files):.2f} MB",
                "is_extracted": is_extracted,
                "extracted_files": extracted_files,
                **classified
            }

        size_bytes = os.path.getsize(archive_path)
        size_mb = size_bytes / (1024 * 1024)
        fname = os.path.basename(archive_path)

        return {
            "detected": True,
            "archive_path": archive_path,
            "archive_name": fname,
            "file_size_bytes": size_bytes,
            "file_size_formatted": f"{size_mb:.2f} MB" if size_mb < 1024 else f"{size_mb/1024:.2f} GB",
            "is_extracted": is_extracted,
            "extracted_files": extracted_files,
            **classified
        }

    def extract_archive(self, progress_callback=None) -> Dict[str, Any]:
        """Safely extracts the archive to backend/data/extracted/."""
        archive_path = self.find_archive()
        if not archive_path or not os.path.isfile(archive_path):
            raise FileNotFoundError("No dataset archive found to extract.")

        # Ensure destination directory exists
        os.makedirs(EXTRACTED_DATA_DIR, exist_ok=True)

        if archive_path.endswith('.zip'):
            with zipfile.ZipFile(archive_path, 'r') as z:
                total_files = len(z.infolist())
                for idx, member in enumerate(z.infolist()):
                    # Avoid directory traversal vulnerability
                    target_path = os.path.join(EXTRACTED_DATA_DIR, member.filename)
                    norm_target = os.path.normpath(target_path)
                    if not norm_target.startswith(os.path.normpath(EXTRACTED_DATA_DIR)):
                        continue
                    z.extract(member, EXTRACTED_DATA_DIR)
                    if progress_callback and total_files > 0:
                        progress_callback(int((idx + 1) * 100 / total_files))
        elif archive_path.endswith(('.tar.gz', '.tgz', '.tar')):
            with tarfile.open(archive_path, 'r:*') as t:
                t.extractall(EXTRACTED_DATA_DIR)

        return self.get_archive_status()

    def list_extracted_files(self) -> List[Dict[str, Any]]:
        """Walks extracted directory and returns file metadata."""
        files_info = []
        if not os.path.isdir(EXTRACTED_DATA_DIR):
            return []

        for root, _, files in os.walk(EXTRACTED_DATA_DIR):
            for file in files:
                full_path = os.path.join(root, file)
                rel_path = os.path.relpath(full_path, EXTRACTED_DATA_DIR).replace("\\", "/")
                size = os.path.getsize(full_path)
                files_info.append({
                    "relative_path": rel_path,
                    "full_path": full_path,
                    "filename": file,
                    "size_bytes": size,
                    "size_mb": round(size / (1024 * 1024), 2)
                })
        return files_info

    def classify_files(self, file_list: List[Dict[str, Any]]) -> Dict[str, Optional[str]]:
        """
        Dynamically discovers and identifies Source 1, 2, 3, Ground Truth, and Test files
        by inspecting filenames and schema content.
        """
        mapping = {
            "source1_file": None,
            "source2_file": None,
            "source3_file": None,
            "ground_truth_file": None,
            "test_source1_file": None,
            "test_source2_file": None,
            "test_source3_file": None,
        }

        for item in file_list:
            path = item["full_path"]
            rel = item["relative_path"].lower()

            if "ground_truth" in rel or "groundtruth" in rel or "gt.tsv" in rel:
                mapping["ground_truth_file"] = path
            elif "train" in rel or "training" in rel:
                if "source1" in rel or "source_1" in rel or "s1" in rel:
                    mapping["source1_file"] = path
                elif "source2" in rel or "source_2" in rel or "s2" in rel:
                    mapping["source2_file"] = path
                elif "source3" in rel or "source_3" in rel or "s3" in rel:
                    mapping["source3_file"] = path
            elif "test" in rel:
                if "source1" in rel or "source_1" in rel or "s1" in rel:
                    mapping["test_source1_file"] = path
                elif "source2" in rel or "source_2" in rel or "s2" in rel:
                    mapping["test_source2_file"] = path
                elif "source3" in rel or "source_3" in rel or "s3" in rel:
                    mapping["test_source3_file"] = path
            else:
                # Fallback matching by name
                if "source1" in rel:
                    mapping["source1_file"] = mapping["source1_file"] or path
                elif "source2" in rel:
                    mapping["source2_file"] = mapping["source2_file"] or path
                elif "source3" in rel:
                    mapping["source3_file"] = mapping["source3_file"] or path

        return mapping
