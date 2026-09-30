"""
Threshold Management and Tuning Utilities.
"""

from typing import Dict, Any, List, Tuple
import numpy as np
from app.ml.evaluation import find_optimal_threshold, evaluate_predictions

class ThresholdManager:
    """Manages prediction confidence thresholds."""
    def __init__(self, default_threshold: float = 0.65):
        self.threshold = default_threshold
        
    def set_threshold(self, threshold: float):
        self.threshold = max(0.01, min(0.99, float(threshold)))
        
    def optimize(self, y_true: np.ndarray, y_probs: np.ndarray, beta: float = 0.5) -> Tuple[float, Dict[str, Any], List[Dict[str, Any]]]:
        best_t, best_metrics, curve = find_optimal_threshold(y_true, y_probs, beta=beta)
        self.threshold = best_t
        return best_t, best_metrics, curve
        
    def predict(self, probs: np.ndarray) -> np.ndarray:
        return (np.array(probs) >= self.threshold).astype(int)
