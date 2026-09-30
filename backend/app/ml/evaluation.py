"""
Evaluation Metrics Module for Business Entity Resolution.
Focuses on F0.5, Precision, Recall, and confusion matrix metrics.
"""

from typing import Dict, Any, List, Tuple
import numpy as np

def compute_f_beta(precision: float, recall: float, beta: float = 0.5) -> float:
    """Computes F-beta score (default beta=0.5)."""
    if precision + recall == 0:
        return 0.0
    beta_sq = beta ** 2
    numerator = (1.0 + beta_sq) * precision * recall
    denominator = (beta_sq * precision) + recall
    return numerator / denominator if denominator > 0 else 0.0

def evaluate_predictions(y_true: np.ndarray, y_pred: np.ndarray) -> Dict[str, Any]:
    """
    Computes precision, recall, f1, f0.5, tp, fp, tn, fn.
    """
    y_true = np.array(y_true, dtype=int)
    y_pred = np.array(y_pred, dtype=int)
    
    tp = int(np.sum((y_true == 1) & (y_pred == 1)))
    fp = int(np.sum((y_true == 0) & (y_pred == 1)))
    fn = int(np.sum((y_true == 1) & (y_pred == 0)))
    tn = int(np.sum((y_true == 0) & (y_pred == 0)))
    
    precision = float(tp / (tp + fp)) if (tp + fp) > 0 else 0.0
    recall = float(tp / (tp + fn)) if (tp + fn) > 0 else 0.0
    f1 = float(2 * precision * recall / (precision + recall)) if (precision + recall) > 0 else 0.0
    f05 = compute_f_beta(precision, recall, beta=0.5)
    
    accuracy = float((tp + tn) / len(y_true)) if len(y_true) > 0 else 0.0
    
    return {
        "precision": round(precision, 4),
        "recall": round(recall, 4),
        "f1": round(f1, 4),
        "f05": round(f05, 4),
        "accuracy": round(accuracy, 4),
        "tp": tp,
        "fp": fp,
        "fn": fn,
        "tn": tn,
        "total_samples": len(y_true)
    }

def find_optimal_threshold(
    y_true: np.ndarray,
    y_probs: np.ndarray,
    beta: float = 0.5,
    min_thresh: float = 0.1,
    max_thresh: float = 0.95,
    steps: int = 86
) -> Tuple[float, Dict[str, Any], List[Dict[str, Any]]]:
    """
    Scans candidate decision thresholds to maximize F-beta (default F0.5).
    Returns (best_threshold, best_metrics, threshold_curve_data)
    """
    y_true = np.array(y_true, dtype=int)
    y_probs = np.array(y_probs, dtype=float)
    
    best_threshold = 0.5
    best_f_beta = -1.0
    best_metrics = {}
    curve_data = []
    
    thresholds = np.linspace(min_thresh, max_thresh, steps)
    for t in thresholds:
        t_val = round(float(t), 3)
        y_pred = (y_probs >= t_val).astype(int)
        metrics = evaluate_predictions(y_true, y_pred)
        score = metrics["f05"] if beta == 0.5 else metrics["f1"]
        
        curve_data.append({
            "threshold": t_val,
            "f05": metrics["f05"],
            "f1": metrics["f1"],
            "precision": metrics["precision"],
            "recall": metrics["recall"],
            "tp": metrics["tp"],
            "fp": metrics["fp"]
        })
        
        if score > best_f_beta or (score == best_f_beta and metrics["precision"] > best_metrics.get("precision", 0)):
            best_f_beta = score
            best_threshold = t_val
            best_metrics = {**metrics, "optimal_threshold": t_val}
            
    return best_threshold, best_metrics, curve_data
