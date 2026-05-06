export interface ReportMetrics {
  // PRE_PROD fields
  accuracy?: number;
  precision?: number;
  recall?: number;
  f1?: number;
  roc_auc?: number;
  avg_precision?: number;
  // DATA_EVAL fields
  split?: string;
  stage?: string;
  n_rows?: number;
  n_features?: number;
  class_distribution?: Record<string, number>;
  imbalance_ratio?: number;
  duplicate_rows?: number;
  missing_cells?: number;
  [key: string]: unknown;
}

export interface FeatureStats {
  name: string;
  dtype: string;
  missing_count: number;
  missing_pct: number;
  n_unique: number;
  mean?: number | null;
  std?: number | null;
  min?: number | null;
  p25?: number | null;
  p50?: number | null;
  p75?: number | null;
  max?: number | null;
}

export interface ReportArtifacts {
  // PRE_PROD artifacts
  confusion_matrix?: number[][];
  roc_curve_fpr?: number[];
  roc_curve_tpr?: number[];
  classification_report?: string;
  // DATA_EVAL artifacts
  features?: FeatureStats[];
  [key: string]: unknown;
}

export interface ReportRecord {
  report_id: string;
  timestamp: string;
  report_type: string;
  model_version: string | null;
  metrics: ReportMetrics | null;
  artifacts: ReportArtifacts | null;
}

export interface IncidentRecord {
  incident_id: string;
  timestamp: string;
  severity: string;
  incident_type: string;
  description: string | null;
  status: string;
}

export type DriftStatus = 'ok' | 'warning' | 'critical';

export interface FeatureDriftResult {
  feature: string;
  method: string;
  statistic: number;
  pvalue: number | null;
  status: DriftStatus;
}

export interface DataDriftResult {
  n_accumulated: number;
  n_features_checked: number;
  n_drifted: number;
  drift_rate: number;
  overall_status: DriftStatus;
  features: FeatureDriftResult[];
}

export interface ModelHealthResponse {
  model_api: string;
  url: string;
  status_code: number | null;
  error: string | null;
}
