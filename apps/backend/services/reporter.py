"""
Reporter Service — VigilantMLOps

All evaluation and monitoring math lives here. API routes stay thin wrappers.

Evaluation types
----------------
Pre-Production
    evaluate_data(split)  — statistical profile of a dataset split
    evaluate_model()      — classification metrics via remote model API

Production
    evaluate_data_drift(production_df)             — PSI / KS / Chi² per feature
    evaluate_production_performance(preds, labels) — rolling metrics vs baseline
"""
from __future__ import annotations

import math
from enum import Enum
from pathlib import Path
from typing import Any

import httpx
import numpy as np
import polars as pl
import yaml
from pydantic import BaseModel, Field
from scipy import stats
from sklearn.metrics import (
    accuracy_score,
    average_precision_score,
    classification_report as sk_classification_report,
    confusion_matrix,
    f1_score,
    precision_score,
    recall_score,
    roc_auc_score,
    roc_curve,
)

from .data_loader import DataLoader, DataPaths


# ===========================================================================
# Configuration
# ===========================================================================


class ModelAPIConfig(BaseModel):
    base_url: str
    predict_endpoint: str = "/predict"
    health_endpoint: str = "/health"
    timeout_seconds: int = 30
    api_key: str | None = None

    @property
    def predict_url(self) -> str:
        return self.base_url.rstrip("/") + self.predict_endpoint

    @property
    def health_url(self) -> str:
        return self.base_url.rstrip("/") + self.health_endpoint


class DriftThresholds(BaseModel):
    # PSI (Population Stability Index)
    psi_warning: float = 0.1
    psi_critical: float = 0.2
    # Statistical tests — flag when p-value drops below threshold
    ks_pvalue_threshold: float = 0.05
    chi2_pvalue_threshold: float = 0.05
    # Absolute metric drop vs baseline to trigger alerts
    performance_decay_warning: float = 0.05
    performance_decay_critical: float = 0.10


class ReporterConfig(BaseModel):
    data: DataPaths
    model_api: ModelAPIConfig
    thresholds: DriftThresholds = Field(default_factory=DriftThresholds)
    target_column: str = "label"
    feature_columns: list[str] | None = None    # None → infer (all non-target cols)
    categorical_columns: list[str] = Field(default_factory=list)
    psi_bins: int = 10
    production_window_size: int = 500           # rows per rolling evaluation window

    @classmethod
    def from_yaml(cls, path: Path | str) -> "ReporterConfig":
        with open(path) as fh:
            raw = yaml.safe_load(fh)
        return cls.model_validate(raw)


# ===========================================================================
# Result schemas
# ===========================================================================


class DriftStatus(str, Enum):
    OK = "ok"
    WARNING = "warning"
    CRITICAL = "critical"


class FeatureStats(BaseModel):
    name: str
    dtype: str
    missing_count: int
    missing_pct: float
    n_unique: int
    mean: float | None = None
    std: float | None = None
    min: float | None = None
    p25: float | None = None
    p50: float | None = None
    p75: float | None = None
    max: float | None = None


class DataEvaluationResult(BaseModel):
    split: str
    n_rows: int
    n_features: int
    class_distribution: dict[str, int]
    imbalance_ratio: float                  # majority / minority class count
    duplicate_rows: int
    missing_cells: int
    features: list[FeatureStats]


class ModelEvaluationResult(BaseModel):
    accuracy: float
    precision: float
    recall: float
    f1: float
    roc_auc: float                          # 0.0 when probabilities not returned by API
    avg_precision: float
    confusion_matrix: list[list[int]]
    roc_curve_fpr: list[float] = Field(default_factory=list)   # x-axis for ROC plot
    roc_curve_tpr: list[float] = Field(default_factory=list)   # y-axis for ROC plot
    report: str                             # full sklearn classification report


class FeatureDriftResult(BaseModel):
    feature: str
    method: str                             # "psi+ks" for numeric | "psi+chi2" for categorical
    statistic: float                        # PSI score
    pvalue: float | None                    # KS or Chi² p-value
    status: DriftStatus


class DataDriftResult(BaseModel):
    n_features_checked: int
    n_drifted: int
    drift_rate: float
    overall_status: DriftStatus
    features: list[FeatureDriftResult]


class PerformanceWindow(BaseModel):
    window_index: int
    n_samples: int
    accuracy: float
    precision: float
    recall: float
    f1: float
    decay_accuracy: float                   # positive = degradation vs baseline
    decay_f1: float
    status: DriftStatus


class ProductionModelEvaluationResult(BaseModel):
    n_samples: int
    baseline_accuracy: float
    baseline_f1: float
    current_accuracy: float
    current_f1: float
    decay_accuracy: float
    decay_f1: float
    overall_status: DriftStatus
    windows: list[PerformanceWindow]


# ===========================================================================
# Private helpers
# ===========================================================================

_EPSILON = 1e-8
_STATUS_PRIORITY: dict[DriftStatus, int] = {
    DriftStatus.OK: 0,
    DriftStatus.WARNING: 1,
    DriftStatus.CRITICAL: 2,
}


def _max_status(*statuses: DriftStatus) -> DriftStatus:
    return max(statuses, key=lambda s: _STATUS_PRIORITY[s])


def _status_from_psi(psi: float, t: DriftThresholds) -> DriftStatus:
    if psi >= t.psi_critical:
        return DriftStatus.CRITICAL
    if psi >= t.psi_warning:
        return DriftStatus.WARNING
    return DriftStatus.OK


def _status_from_pvalue(pvalue: float, threshold: float) -> DriftStatus:
    return DriftStatus.CRITICAL if pvalue < threshold else DriftStatus.OK


def _status_from_decay(decay_acc: float, decay_f1: float, t: DriftThresholds) -> DriftStatus:
    worst = max(abs(decay_acc), abs(decay_f1))
    if worst >= t.performance_decay_critical:
        return DriftStatus.CRITICAL
    if worst >= t.performance_decay_warning:
        return DriftStatus.WARNING
    return DriftStatus.OK


def _resolve_feature_cols(df: pl.DataFrame, cfg: ReporterConfig) -> list[str]:
    if cfg.feature_columns:
        return cfg.feature_columns
    return [c for c in df.columns if c != cfg.target_column]


def _compute_feature_stats(series: pl.Series) -> FeatureStats:
    n = series.len()
    null_count = series.null_count()
    clean = series.drop_nulls()

    result: dict[str, Any] = {
        "name": series.name,
        "dtype": str(series.dtype),
        "missing_count": null_count,
        "missing_pct": round(null_count / n, 4) if n > 0 else 0.0,
        "n_unique": series.n_unique(),
    }

    if series.dtype.is_numeric() and len(clean) > 0:
        arr = clean.to_numpy()
        result.update(
            mean=round(float(np.mean(arr)), 6),
            std=round(float(np.std(arr, ddof=1)), 6),
            min=round(float(np.min(arr)), 6),
            p25=round(float(np.percentile(arr, 25)), 6),
            p50=round(float(np.percentile(arr, 50)), 6),
            p75=round(float(np.percentile(arr, 75)), 6),
            max=round(float(np.max(arr)), 6),
        )

    return FeatureStats(**result)


def _psi_numeric(ref: pl.Series, prod: pl.Series, n_bins: int) -> float:
    """PSI for continuous features using reference quantile bins."""
    ref_arr = ref.drop_nulls().to_numpy()
    prod_arr = prod.drop_nulls().to_numpy()

    breakpoints = np.quantile(ref_arr, np.linspace(0, 1, n_bins + 1))
    breakpoints[0] = -np.inf
    breakpoints[-1] = np.inf

    ref_counts, _ = np.histogram(ref_arr, bins=breakpoints)
    prod_counts, _ = np.histogram(prod_arr, bins=breakpoints)

    ref_pct = (ref_counts + _EPSILON) / (len(ref_arr) + _EPSILON * n_bins)
    prod_pct = (prod_counts + _EPSILON) / (len(prod_arr) + _EPSILON * n_bins)

    return round(float(np.sum((prod_pct - ref_pct) * np.log(prod_pct / ref_pct))), 6)


def _psi_categorical(ref: pl.Series, prod: pl.Series) -> float:
    """PSI for categorical features — computed directly from category proportions."""
    all_cats = set(ref.drop_nulls().unique().to_list()) | set(prod.drop_nulls().unique().to_list())
    n_cats = len(all_cats) or 1
    ref_n = ref.drop_nulls().len()
    prod_n = prod.drop_nulls().len()

    psi = 0.0
    for cat in all_cats:
        ref_pct = ((ref == cat).sum() + _EPSILON) / (ref_n + _EPSILON * n_cats)
        prod_pct = ((prod == cat).sum() + _EPSILON) / (prod_n + _EPSILON * n_cats)
        psi += (prod_pct - ref_pct) * math.log(prod_pct / ref_pct)

    return round(psi, 6)


def _ks_test(ref: pl.Series, prod: pl.Series) -> tuple[float, float]:
    """Two-sample Kolmogorov-Smirnov test for continuous features."""
    ks_stat, pvalue = stats.ks_2samp(
        ref.drop_nulls().to_numpy(),
        prod.drop_nulls().to_numpy(),
    )
    return round(float(ks_stat), 6), round(float(pvalue), 6)


def _chi2_test(ref: pl.Series, prod: pl.Series) -> tuple[float, float]:
    """Chi-squared test via 2×K contingency table for categorical features."""
    all_cats = sorted(
        set(ref.drop_nulls().unique().to_list()) | set(prod.drop_nulls().unique().to_list())
    )
    ref_counts = np.array([(ref == c).sum() for c in all_cats], dtype=float)
    prod_counts = np.array([(prod == c).sum() for c in all_cats], dtype=float)
    chi2, pvalue, *_ = stats.chi2_contingency(np.vstack([ref_counts, prod_counts]))
    return round(float(chi2), 6), round(float(pvalue), 6)


# ===========================================================================
# Service
# ===========================================================================


class ReporterService:
    """
    Central evaluation service for VigilantMLOps.

    Instantiate with a ReporterConfig (or load one from YAML via
    ReporterConfig.from_yaml(path)). Call evaluate_model() at least once
    before evaluate_production_performance() to establish a baseline.

    Remote model API contract
    -------------------------
    POST {model_api.predict_url}
    Body:    {"instances": [{"feat1": v, "feat2": v, ...}, ...]}
    Returns: {"predictions": [0, 1, ...], "probabilities": [[p0,p1], ...]}
             "probabilities" is optional — omit to skip ROC-AUC / AP metrics.
    """

    def __init__(self, config: ReporterConfig) -> None:
        self.config = config
        self._loader = DataLoader(config.data)
        self._baseline: ModelEvaluationResult | None = None

    # ------------------------------------------------------------------
    # Pre-Production — 1: Data Evaluation
    # ------------------------------------------------------------------

    def evaluate_data(self, split: str = "test") -> DataEvaluationResult:
        """Statistical profile of a dataset split (train / test / val)."""
        df = self._loader.load_split(split)
        feature_cols = _resolve_feature_cols(df, self.config)
        target = self.config.target_column

        vc = df[target].value_counts().sort(target)
        dist: dict[str, int] = dict(zip(
            vc[target].cast(pl.String).to_list(),
            vc["count"].to_list(),
        ))
        counts = list(dist.values())
        imbalance = (
            round(max(counts) / min(counts), 4)
            if len(counts) > 1 and min(counts) > 0
            else 1.0
        )

        return DataEvaluationResult(
            split=split,
            n_rows=df.height,
            n_features=len(feature_cols),
            class_distribution=dist,
            imbalance_ratio=imbalance,
            duplicate_rows=int(df.is_duplicated().sum()),
            missing_cells=sum(df[col].null_count() for col in df.columns),
            features=[_compute_feature_stats(df[col]) for col in feature_cols],
        )

    # ------------------------------------------------------------------
    # Pre-Production — 2: Model Evaluation (via remote API)
    # ------------------------------------------------------------------

    def evaluate_model(self) -> ModelEvaluationResult:
        """
        Send the test set to the remote model API and compute classification metrics.
        Stores the result as the production baseline for later decay tracking.
        """
        df = self._loader.load_test()
        feature_cols = _resolve_feature_cols(df, self.config)
        y_true: list[int] = df[self.config.target_column].to_list()

        api_response = self._call_predict(df.select(feature_cols).to_dicts())
        y_pred: list[int] = api_response["predictions"]
        y_prob: list[list[float]] | None = api_response.get("probabilities")

        result = self._build_classification_result(y_true, y_pred, y_prob)
        self._baseline = result
        return result

    # ------------------------------------------------------------------
    # Production — 1: Ongoing Data Evaluation (drift)
    # ------------------------------------------------------------------

    def evaluate_data_drift(self, production_df: pl.DataFrame) -> DataDriftResult:
        """
        Compare an incoming production batch against the reference split.
        Numeric     → PSI + two-sample KS test.
        Categorical → PSI + Chi² contingency test.
        The stricter of the two signals determines per-feature status.
        """
        reference_df = self._loader.load_reference()
        feature_cols = [
            col for col in _resolve_feature_cols(reference_df, self.config)
            if col in production_df.columns
        ]
        t = self.config.thresholds
        feature_results: list[FeatureDriftResult] = []

        for col in feature_cols:
            ref_s, prod_s = reference_df[col], production_df[col]
            is_cat = col in self.config.categorical_columns

            if is_cat:
                psi = _psi_categorical(ref_s, prod_s)
                _, pvalue = _chi2_test(ref_s, prod_s)
                status = _max_status(
                    _status_from_psi(psi, t),
                    _status_from_pvalue(pvalue, t.chi2_pvalue_threshold),
                )
                feature_results.append(FeatureDriftResult(
                    feature=col, method="psi+chi2",
                    statistic=psi, pvalue=pvalue, status=status,
                ))
            else:
                psi = _psi_numeric(ref_s, prod_s, self.config.psi_bins)
                _, pvalue = _ks_test(ref_s, prod_s)
                status = _max_status(
                    _status_from_psi(psi, t),
                    _status_from_pvalue(pvalue, t.ks_pvalue_threshold),
                )
                feature_results.append(FeatureDriftResult(
                    feature=col, method="psi+ks",
                    statistic=psi, pvalue=pvalue, status=status,
                ))

        drifted = [r for r in feature_results if r.status != DriftStatus.OK]
        drift_rate = round(len(drifted) / len(feature_results), 4) if feature_results else 0.0
        overall = (
            _max_status(*(r.status for r in feature_results))
            if feature_results
            else DriftStatus.OK
        )

        return DataDriftResult(
            n_features_checked=len(feature_results),
            n_drifted=len(drifted),
            drift_rate=drift_rate,
            overall_status=overall,
            features=feature_results,
        )

    # ------------------------------------------------------------------
    # Production — 2: Ongoing Model Evaluation
    # ------------------------------------------------------------------

    def evaluate_production_performance(
        self,
        predictions: list[int],
        ground_truth: list[int],
    ) -> ProductionModelEvaluationResult:
        """
        Compute aggregate and windowed metrics against the pre-production baseline.
        Positive decay values indicate degradation (baseline metric > current metric).
        Requires evaluate_model() to have been called first.
        """
        if self._baseline is None:
            raise RuntimeError(
                "No baseline found. Call evaluate_model() before evaluate_production_performance()."
            )

        y_true = np.array(ground_truth)
        y_pred = np.array(predictions)
        t = self.config.thresholds
        window_size = self.config.production_window_size
        n = len(y_true)

        current_acc = round(float(accuracy_score(y_true, y_pred)), 4)
        current_f1 = round(float(f1_score(y_true, y_pred, zero_division=0)), 4)
        decay_acc = round(self._baseline.accuracy - current_acc, 4)
        decay_f1 = round(self._baseline.f1 - current_f1, 4)

        windows: list[PerformanceWindow] = []
        for i, start in enumerate(range(0, n, window_size)):
            wt = y_true[start : start + window_size]
            wp = y_pred[start : start + window_size]
            if len(wt) < 2:
                continue
            w_acc = round(float(accuracy_score(wt, wp)), 4)
            w_f1 = round(float(f1_score(wt, wp, zero_division=0)), 4)
            w_decay_acc = round(self._baseline.accuracy - w_acc, 4)
            w_decay_f1 = round(self._baseline.f1 - w_f1, 4)
            windows.append(PerformanceWindow(
                window_index=i,
                n_samples=int(len(wt)),
                accuracy=w_acc,
                precision=round(float(precision_score(wt, wp, zero_division=0)), 4),
                recall=round(float(recall_score(wt, wp, zero_division=0)), 4),
                f1=w_f1,
                decay_accuracy=w_decay_acc,
                decay_f1=w_decay_f1,
                status=_status_from_decay(w_decay_acc, w_decay_f1, t),
            ))

        return ProductionModelEvaluationResult(
            n_samples=n,
            baseline_accuracy=self._baseline.accuracy,
            baseline_f1=self._baseline.f1,
            current_accuracy=current_acc,
            current_f1=current_f1,
            decay_accuracy=decay_acc,
            decay_f1=decay_f1,
            overall_status=_status_from_decay(decay_acc, decay_f1, t),
            windows=windows,
        )

    # ------------------------------------------------------------------
    # Private
    # ------------------------------------------------------------------

    def _call_predict(self, instances: list[dict[str, Any]]) -> dict[str, Any]:
        headers: dict[str, str] = {"Content-Type": "application/json"}
        if self.config.model_api.api_key:
            headers["Authorization"] = f"Bearer {self.config.model_api.api_key}"

        with httpx.Client(timeout=self.config.model_api.timeout_seconds) as client:
            response = client.post(
                self.config.model_api.predict_url,
                json={"instances": instances},
                headers=headers,
            )
        response.raise_for_status()
        return response.json()

    def _build_classification_result(
        self,
        y_true: list[int],
        y_pred: list[int],
        y_prob: list[list[float]] | None,
    ) -> ModelEvaluationResult:
        yt, yp = np.array(y_true), np.array(y_pred)

        roc_auc, avg_precision = 0.0, 0.0
        fpr_list: list[float] = []
        tpr_list: list[float] = []
        if y_prob is not None:
            probs = np.array(y_prob)
            pos_probs = probs[:, 1] if probs.ndim == 2 else probs
            roc_auc = round(float(roc_auc_score(yt, pos_probs)), 4)
            avg_precision = round(float(average_precision_score(yt, pos_probs)), 4)
            fpr, tpr, _ = roc_curve(yt, pos_probs)
            fpr_list = [round(float(v), 6) for v in fpr]
            tpr_list = [round(float(v), 6) for v in tpr]

        return ModelEvaluationResult(
            accuracy=round(float(accuracy_score(yt, yp)), 4),
            precision=round(float(precision_score(yt, yp, zero_division=0)), 4),
            recall=round(float(recall_score(yt, yp, zero_division=0)), 4),
            f1=round(float(f1_score(yt, yp, zero_division=0)), 4),
            roc_auc=roc_auc,
            avg_precision=avg_precision,
            confusion_matrix=confusion_matrix(yt, yp).tolist(),
            roc_curve_fpr=fpr_list,
            roc_curve_tpr=tpr_list,
            report=sk_classification_report(yt, yp, zero_division=0),
        )
