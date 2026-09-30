"""
Preprocessing Service: Processes raw datasets in chunks using the unified EntityPreprocessor.
Outputs preprocessed TSVs with normalized business names, addresses, and country representations.
"""

import os
import gc
import pandas as pd
from typing import Dict, Any, List, Optional
from app.ml.preprocessing import EntityPreprocessor

PROCESSED_DATA_DIR = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "..", "data", "processed"))

class PreprocessingService:
    def __init__(self, chunk_size: int = 20000):
        self.chunk_size = chunk_size
        self.preprocessor = EntityPreprocessor(strip_legal_suffixes=True)
        os.makedirs(PROCESSED_DATA_DIR, exist_ok=True)

    def process_file(
        self,
        input_path: str,
        output_filename: str,
        max_rows: Optional[int] = None,
        progress_callback=None
    ) -> Dict[str, Any]:
        """
        Processes an entity TSV file in chunks and saves to backend/data/processed/.
        """
        if not os.path.isfile(input_path):
            raise FileNotFoundError(f"Input file not found: {input_path}")

        out_path = os.path.join(PROCESSED_DATA_DIR, output_filename)
        total_processed = 0
        samples = []

        # Read first chunk to initialize file
        is_first = True
        for chunk in pd.read_csv(input_path, sep="\t", chunksize=self.chunk_size, encoding="utf-8", dtype=str):
            if max_rows and total_processed >= max_rows:
                break

            processed_chunk = self.preprocessor.preprocess_dataframe_chunk(chunk)
            
            if is_first:
                # Store sample transformations
                for _, row in processed_chunk.head(5).iterrows():
                    samples.append({
                        "raw_name": row.get("business_name", ""),
                        "normalized_name": row.get("business_name_normalized", ""),
                        "stem_name": row.get("business_name_stem", ""),
                        "raw_address": row.get("business_address", ""),
                        "normalized_address": row.get("business_address_normalized", ""),
                        "raw_country": row.get("country", ""),
                        "normalized_country": row.get("country_normalized", "")
                    })
                processed_chunk.to_csv(out_path, sep="\t", index=False, mode="w", encoding="utf-8")
                is_first = False
            else:
                processed_chunk.to_csv(out_path, sep="\t", index=False, mode="a", header=False, encoding="utf-8")

            total_processed += len(processed_chunk)
            if progress_callback:
                progress_callback(total_processed)

            # Manual garbage collection per chunk to keep RAM bounded
            del processed_chunk
            del chunk
            gc.collect()

        return {
            "input_file": input_path,
            "output_file": out_path,
            "total_processed": total_processed,
            "sample_transformations": samples
        }

    def get_processed_files(self) -> Dict[str, str]:
        """Returns map of available processed files."""
        result = {}
        if os.path.isdir(PROCESSED_DATA_DIR):
            for fname in os.listdir(PROCESSED_DATA_DIR):
                if fname.endswith(".tsv"):
                    result[fname] = os.path.join(PROCESSED_DATA_DIR, fname)
        return result
