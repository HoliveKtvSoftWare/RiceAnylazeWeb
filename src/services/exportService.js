import apiClient from './apiClient';

const downloadBlob = (response, filename) => {
  const url = URL.createObjectURL(response.data);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
};

const extractFilename = (disposition, fallback) => {
  if (!disposition) return fallback;
  const match = disposition.match(/filename\*?=(?:UTF-8'')?([^;]+)/i);
  if (match) {
    return decodeURIComponent(match[1].trim().replace(/^"|"$/g, ''));
  }
  return fallback;
};

const exportSingleJson = (analysisId) => {
  console.debug('Exporting JSON for analysis:', analysisId);
  return apiClient.get('/export/json/' + analysisId, {
    responseType: 'blob'
  }).then(response => {
    const filename = extractFilename(response.headers['content-disposition'], analysisId + '.json');
    downloadBlob(response, filename);
    return { success: true };
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

const batchExportJson = (analysisIds) => {
  const params = analysisIds.map(id => 'analysis_ids=' + encodeURIComponent(id)).join('&');
  console.debug('Batch exporting JSON for', analysisIds.length, 'analyses');
  return apiClient.post('/export/json/batch?' + params, null, {
    responseType: 'blob'
  }).then(response => {
    const fallback = 'batch_export_' + analysisIds.length + 'files.zip';
    const filename = extractFilename(response.headers['content-disposition'], fallback);
    downloadBlob(response, filename);
    return { success: true };
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