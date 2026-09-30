"""
Supervised Model Training, Inference, and Persistence Module.
"""

import os
import json
import joblib
from datetime import datetime
from typing import Dict, Any, List, Optional, Tuple
import numpy as np
from sklearn.ensemble import (
    HistGradientBoostingClassifier, 
    RandomForestClassifier,
    ExtraTreesClassifier,
    GradientBoostingClassifier,
    AdaBoostClassifier,
    VotingClassifier
)
from sklearn.neural_network import MLPClassifier
from sklearn.linear_model import LogisticRegression
from sklearn.model_selection import train_test_split

from app.ml.features import FEATURE_COLUMNS, FeatureExtractor
from app.ml.evaluation import evaluate_predictions, find_optimal_threshold

MODELS_DIR = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "..", "models"))

class EntityResolutionModel:
    """
    Supervised model wrapper for entity matching probability prediction with 8 state-of-the-art algorithms.
    """
    def __init__(self, model_type: str = "hist_gradient_boosting"):
        self.model_type = model_type
        self.model = None
        self.threshold = 0.65
        self.metadata: Dict[str, Any] = {}
        self.feature_names = FEATURE_COLUMNS
        self.feature_extractor = FeatureExtractor()

    def _init_estimator(self, model_type: str):
        if model_type == "random_forest":
            return RandomForestClassifier(
                n_estimators=120,
                max_depth=16,
                min_samples_split=6,
                random_state=42,
                n_jobs=-1,
                class_weight="balanced_subsample"
            )
        elif model_type == "extra_trees":
            return ExtraTreesClassifier(
                n_estimators=150,
                max_depth=18,
                min_samples_split=4,
                random_state=42,
                n_jobs=-1,
                class_weight="balanced"
            )
        elif model_type == "gradient_boosting":
            return GradientBoostingClassifier(
                n_estimators=120,
                learning_rate=0.1,
                max_depth=6,
                subsample=0.85,
                random_state=42
            )
        elif model_type == "mlp_neural_net":
            return MLPClassifier(
                hidden_layer_sizes=(64, 32, 16),
                activation="relu",
                solver="adam",
                alpha=0.001,
                batch_size=256,
                learning_rate_init=0.005,
                max_iter=200,
                early_stopping=True,
                random_state=42
            )
        elif model_type == "adaboost":
            return AdaBoostClassifier(
                n_estimators=100,
                learning_rate=0.15,
                random_state=42
            )
        elif model_type == "super_ensemble_voting":
            # State-of-the-art Soft Voting Super-Ensemble
            clf1 = HistGradientBoostingClassifier(max_iter=100, learning_rate=0.08, random_state=42)
            clf2 = ExtraTreesClassifier(n_estimators=80, max_depth=14, random_state=42, n_jobs=-1)
            clf3 = RandomForestClassifier(n_estimators=80, max_depth=14, random_state=42, n_jobs=-1)
            clf4 = LogisticRegression(max_iter=500, random_state=42)
            return VotingClassifier(
                estimators=[
                    ("hist_gb", clf1),
                    ("extra_trees", clf2),
                    ("rf", clf3),
                    ("lr", clf4)
                ],
                voting="soft",
                n_jobs=-1
            )
        elif model_type == "logistic_regression":
            return LogisticRegression(
                max_iter=1000,
                class_weight="balanced",
                random_state=42
            )
        else:  # hist_gradient_boosting default
            return HistGradientBoostingClassifier(
                max_iter=150,
                max_depth=12,
                min_samples_leaf=15,
                learning_rate=0.08,
                random_state=42,
                class_weight="balanced"
            )

    def train_and_select(
        self,
        X: np.ndarray,
        y: np.ndarray,
        dataset_name: str = "dataset_archive.zip",
        preferred_model_type: Optional[str] = None
    ) -> Dict[str, Any]:
        """
        Trains model candidates, evaluates validation metrics, optimizes threshold for F0.5,
        and selects the best performing model.
        """
        if len(X) == 0 or len(y) == 0:
            raise ValueError("Training data X and y cannot be empty.")

        # Split into Train and Validation
        X_train, X_val, y_train, y_val = train_test_split(
            X, y, test_size=0.25, random_state=42, stratify=y if len(np.unique(y)) > 1 else None
        )

        candidate_types = [preferred_model_type] if preferred_model_type else ["hist_gradient_boosting", "random_forest", "logistic_regression"]
        best_model = None
        best_type = ""
        best_f05 = -1.0
        best_threshold = 0.5
        best_metrics = {}
        best_curve = []
        all_evaluations = {}

        for m_type in candidate_types:
            clf = self._init_estimator(m_type)
            clf.fit(X_train, y_train)
            
            # Predict probabilities on validation
            if hasattr(clf, "predict_proba"):
                val_probs = clf.predict_proba(X_val)[:, 1]
            else:
                val_probs = clf.decision_function(X_val)

            opt_thresh, opt_metrics, curve = find_optimal_threshold(y_val, val_probs, beta=0.5)
            all_evaluations[m_type] = {
                "metrics": opt_metrics,
                "optimal_threshold": opt_thresh
            }

            if opt_metrics["f05"] > best_f05:
                best_f05 = opt_metrics["f05"]
                best_model = clf
                best_type = m_type
                best_threshold = opt_thresh
                best_metrics = opt_metrics
                best_curve = curve

        self.model = best_model
        self.model_type = best_type
        self.threshold = best_threshold
        
        # Calculate feature importances if available
        feature_importance_dict = {}
        if hasattr(self.model, "feature_importances_"):
            for fname, imp in zip(self.feature_names, self.model.feature_importances_):
                feature_importance_dict[fname] = round(float(imp), 4)
        elif hasattr(self.model, "coef_"):
            for fname, imp in zip(self.feature_names, self.model.coef_[0]):
                feature_importance_dict[fname] = round(float(abs(imp)), 4)

        self.metadata = {
            "model_version": "v1",
            "model_type": self.model_type,
            "training_date": datetime.utcnow().isoformat() + "Z",
            "training_dataset": dataset_name,
            "feature_version": "v1",
            "feature_count": len(self.feature_names),
            "threshold": float(best_threshold),
            "validation_precision": best_metrics.get("precision", 0.0),
            "validation_recall": best_metrics.get("recall", 0.0),
            "validation_f1": best_metrics.get("f1", 0.0),
            "validation_f05": best_metrics.get("f05", 0.0),
            "validation_accuracy": best_metrics.get("accuracy", 0.0),
            "tp": best_metrics.get("tp", 0),
            "fp": best_metrics.get("fp", 0),
            "tn": best_metrics.get("tn", 0),
            "fn": best_metrics.get("fn", 0),
            "total_training_samples": len(X),
            "total_positive_pairs": int(np.sum(y == 1)),
            "total_negative_pairs": int(np.sum(y == 0)),
            "feature_importances": feature_importance_dict,
            "threshold_curve": best_curve[:25],
            "all_model_evaluations": all_evaluations
        }
        return self.metadata

    def predict_proba(self, X: np.ndarray) -> np.ndarray:
        """Predicts match probabilities for a feature matrix X."""
        if self.model is None:
            raise RuntimeError("Model has not been trained or loaded.")
        if len(X) == 0:
            return np.array([])
        if hasattr(self.model, "predict_proba"):
            return self.model.predict_proba(X)[:, 1]
        elif hasattr(self.model, "decision_function"):
            raw = self.model.decision_function(X)
            # Sigmoid transform
            return 1.0 / (1.0 + np.exp(-raw))
        else:
            return self.model.predict(X).astype(float)

    def predict(self, X: np.ndarray, threshold: Optional[float] = None) -> np.ndarray:
        """Predicts binary match labels using specified or trained threshold."""
        thresh = self.threshold if threshold is None else float(threshold)
        probs = self.predict_proba(X)
        return (probs >= thresh).astype(int)

    def save(self, models_dir: str = MODELS_DIR):
        """Saves trained model, metadata, feature config, and preprocessing config."""
        os.makedirs(models_dir, exist_ok=True)
        
        # Save model joblib
        model_path = os.path.join(models_dir, "trained_model.joblib")
        joblib.dump(self.model, model_path)
        
        # Save metadata JSON
        meta_path = os.path.join(models_dir, "model_metadata.json")
        with open(meta_path, "w", encoding="utf-8") as f:
            json.dump(self.metadata, f, indent=2)
            
        # Save feature config JSON
        feat_config_path = os.path.join(models_dir, "feature_config.json")
        with open(feat_config_path, "w", encoding="utf-8") as f:
            json.dump({
                "feature_version": "v1",
                "feature_names": self.feature_names,
                "feature_count": len(self.feature_names),
                "saved_at": datetime.utcnow().isoformat() + "Z"
            }, f, indent=2)
            
        # Save preprocessing config JSON
        prep_config_path = os.path.join(models_dir, "preprocessing_config.json")
        with open(prep_config_path, "w", encoding="utf-8") as f:
            json.dump({
                "preprocessing_version": "v1",
                "strip_legal_suffixes": True,
                "address_standardization": True,
                "saved_at": datetime.utcnow().isoformat() + "Z"
            }, f, indent=2)

    def load(self, models_dir: str = MODELS_DIR) -> bool:
        """Loads saved model and metadata from disk."""
        model_path = os.path.join(models_dir, "trained_model.joblib")
        meta_path = os.path.join(models_dir, "model_metadata.json")
        
        if not os.path.isfile(model_path):
            return False
            
        self.model = joblib.load(model_path)
        
        if os.path.isfile(meta_path):
            with open(meta_path, "r", encoding="utf-8") as f:
                self.metadata = json.load(f)
                self.threshold = float(self.metadata.get("threshold", 0.65))
                self.model_type = self.metadata.get("model_type", "hist_gradient_boosting")
        return True

    @classmethod
    def load_existing(cls, models_dir: str = MODELS_DIR) -> Optional["EntityResolutionModel"]:
        """Loads and returns an existing trained model instance if available."""
        inst = cls()
        if inst.load(models_dir):
            return inst
        return None
