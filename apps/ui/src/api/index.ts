import apiClient from './client';
import type { ReportRecord, IncidentRecord, DataDriftResult, ModelHealthResponse } from './types';
import { SAMPLE_RECORDS } from './sampleRecords';

export const fetchReportHistory = (): Promise<ReportRecord[]> =>
  apiClient.get<ReportRecord[]>('/api/v1/reports/history').then((r) => r.data);

export const fetchIncidents = (): Promise<IncidentRecord[]> =>
  apiClient.get<IncidentRecord[]>('/api/v1/incidents').then((r) => r.data);

export const fetchDrift = (): Promise<DataDriftResult> =>
  apiClient
    .post<DataDriftResult>('/api/v1/reporter/evaluate-drift', { records: SAMPLE_RECORDS })
    .then((r) => r.data);

export const fetchModelHealth = (): Promise<ModelHealthResponse> =>
  apiClient.get<ModelHealthResponse>('/api/v1/reporter/model-health').then((r) => r.data);

export const fetchIncident = (id: string): Promise<IncidentRecord> =>
  apiClient.get<IncidentRecord>(`/api/v1/incidents/${id}`).then((r) => r.data);
