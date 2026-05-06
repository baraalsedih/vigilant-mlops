export interface ReportMetrics {
  accuracy?: number;
  precision?: number;
  recall?: number;
  f1?: number;
  roc_auc?: number;
  avg_precision?: number;
  [key: string]: unknown;
}

export interface ReportArtifacts {
  confusion_matrix?: number[][];
  roc_curve_fpr?: number[];
  roc_curve_tpr?: number[];
  classification_report?: string;
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
