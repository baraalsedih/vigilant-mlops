import apiClient from './client';

export const fetchOverview = () => apiClient.get('/api/overview');
export const fetchDriftAlerts = () => apiClient.get('/api/drift/alerts');
export const fetchEvaluationReport = (modelVersion?: string) =>
  apiClient.get('/api/evaluation/report', { params: { version: modelVersion } });
export const fetchFeatureDrift = (timeWindow?: string) =>
  apiClient.get('/api/drift/features', { params: { window: timeWindow } });
