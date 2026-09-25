import apiClient from './apiClient';
import { downloadBlob } from '@/utils/fileDownload';

const exportSingleJson = (analysisId, originalFilename, context = null) => {
  console.debug('Exporting JSON for analysis:', analysisId, originalFilename);
  return apiClient.get('/export/json/' + analysisId, {
    responseType: 'blob'
  }).then(response => {
    const filename = downloadBlob(response, `${analysisId}.json`, context);
    return { success: true, filename };
  }).catch(error => {
    console.error('Failed to export single JSON:', error.response?.data || error.message);
    throw error;
  });
};

const previewJson = (analysisId) => {
  console.debug('Previewing JSON for analysis:', analysisId);
  return apiClient.get('/export/json/preview/' + analysisId)
    .then(response => response.data)
    .catch(error => {
      console.error('Failed to preview JSON:', error.response?.data || error.message);
      throw error;
    });
};

const batchExportJson = (analysisIds, context = null) => {
  const params = analysisIds.map(id => 'analysis_ids=' + encodeURIComponent(id)).join('&');
  console.debug('Batch exporting JSON for', analysisIds.length, 'analyses');
  return apiClient.post('/export/json/batch?' + params, null, {
    responseType: 'blob',
    timeout: 0
  }).then(response => {
    const fallback = `batch_export_${analysisIds.length}files.zip`;
    const filename = downloadBlob(response, fallback, context);
    return { success: true, filename };
  }).catch(error => {
    console.error('Failed to batch export JSON:', error.response?.data || error.message);
    throw error;
  });
};

const getExportList = (limit = 50, offset = 0) => {
  console.debug('Fetching export list: limit=', limit, 'offset=', offset);
  return apiClient.get('/export/list', {
    params: { limit, offset }
  }).then(response => response.data)
    .catch(error => {
      console.error('Failed to fetch export list:', error.response?.data || error.message);
      throw error;
    });
};

export const exportService = {
  exportSingleJson,
  previewJson,
  batchExportJson,
  getExportList,
};