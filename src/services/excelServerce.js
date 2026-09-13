import apiClient from './apiClient';

const EXCEL_MIME = 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';

const extractFilename = (disposition, fallback) => {
    if (!disposition) return fallback;
    const utf8Match = disposition.match(/filename\*=UTF-8''([^;]+)/i);
    if (utf8Match) {
        return decodeURIComponent(utf8Match[1].trim().replace(/^"|"$/g, ''));
    }
    const asciiMatch = disposition.match(/filename="?([^"]+)"?/i);
    if (asciiMatch) {
        return decodeURIComponent(asciiMatch[1].trim().replace(/^"|"$/g, ''));
    }
    return fallback;
};

const downloadBlob = (response, fallbackName = 'export.xlsx') => {
    const filename = extractFilename(response.headers['content-disposition'], fallbackName);
    const url = URL.createObjectURL(response.data);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    setTimeout(() => URL.revokeObjectURL(url), 1000);
    return filename;
};

const getExportColumns = () => {
    console.debug('Fetching export columns configuration...');
    return apiClient.get('/excel/columns')
        .then(response => response.data)
        .catch(error => {
            console.error('Failed to fetch export columns:', error.response?.data || error.message);
            throw error;
        });
};

const exportSingleToExcel = (analysisId, selectedColumns, unit) => {
    console.debug(`Exporting single analysis ${analysisId} to Excel...`);
    return apiClient.post(`/excel/${analysisId}`, { selectedColumns, unit }, {
        responseType: 'blob',
        timeout: 30000
    }).then(response => {
        console.debug('Single Excel export successful');
        const filename = downloadBlob(response, `${analysisId}.xlsx`);
        return { filename };
    }).catch(error => {
        console.error('Failed to export single Excel:', error.response?.data || error.message);
        throw error;
    });
};

const batchExportToExcel = (analysisIds, selectedColumns, unit, asyncMode = false) => {
    console.debug(`Batch exporting ${analysisIds.length} analyses to Excel, asyncMode:`, asyncMode);
    return apiClient.post('/excel/batch', { analysisIds, selectedColumns, unit, asyncMode }, {
        responseType: asyncMode ? 'json' : 'blob',
        timeout: asyncMode ? 10000 : Math.max(30000, analysisIds.length * 2000)
    }).then(response => {
        if (asyncMode) {
            console.debug('Batch export async task submitted, taskId:', response.data?.taskId);
            return response.data;
        }
        console.debug('Batch Excel export successful (sync)');
        const filename = downloadBlob(response, `batch_${analysisIds.length}_items.xlsx`);
        return { filename };
    }).catch(error => {
        console.error('Failed to batch export Excel:', error.response?.data || error.message);
        throw error;
    });
};

const exportAllToExcel = (selectedColumns, unit, asyncMode = true) => {
    console.debug('Exporting all analyses to Excel, asyncMode:', asyncMode);
    return apiClient.post('/excel/summary', { selectedColumns, unit, asyncMode }, {
        responseType: asyncMode ? 'json' : 'blob',
        timeout: asyncMode ? 10000 : 120000
    }).then(response => {
        if (asyncMode) {
            console.debug('Summary export async task submitted, taskId:', response.data?.taskId);
            return response.data;
        }
        console.debug('Summary Excel export successful (sync)');
        const filename = downloadBlob(response, 'summary.xlsx');
        return { filename };
    }).catch(error => {
        console.error('Failed to export all Excel:', error.response?.data || error.message);
        throw error;
    });
};

const getTaskStatus = (taskId) => {
    return apiClient.get(`/excel/tasks/${taskId}`)
        .then(response => response.data)
        .catch(error => {
            console.error('Failed to get task status:', error.response?.data || error.message);
            throw error;
        });
};

const downloadTaskResult = (taskId, fallbackName = 'export.xlsx') => {
    return apiClient.get(`/excel/download/${taskId}`, {
        responseType: 'blob',
        timeout: 120000
    }).then(response => {
        const filename = downloadBlob(response, fallbackName);
        return { filename };
    }).catch(error => {
        console.error('Failed to download task result:', error.response?.data || error.message);
        throw error;
    });
};

const pollAndDownloadTask = (taskId, onProgress, interval = 1500) => {
    return new Promise((resolve, reject) => {
        let attempts = 0;
        const maxAttempts = 300;

        const poll = async () => {
            attempts++;
            if (attempts > maxAttempts) {
                clearInterval(timer);
                reject(new Error('导出任务超时'));
                return;
            }
            try {
                const status = await getTaskStatus(taskId);
                onProgress?.({
                    status: status.status,
                    progress: status.progress ?? 0,
                    total: status.total ?? 0,
                    message: status.message || ''
                });

                if (status.status === 'completed') {
                    clearInterval(timer);
                    try {
                        const result = await downloadTaskResult(taskId, status.filename || 'export.xlsx');
                        resolve(result);
                    } catch (dlErr) {
                        reject(dlErr);
                    }
                } else if (status.status === 'failed') {
                    clearInterval(timer);
                    reject(new Error(status.error || '导出任务失败'));
                }
            } catch (err) {
                clearInterval(timer);
                reject(err);
            }
        };

        const timer = setInterval(poll, interval);
        poll();
    });
};

export const excelService = {
    getExportColumns,
    exportSingleToExcel,
    batchExportToExcel,
    exportAllToExcel,
    getTaskStatus,
    downloadTaskResult,
    pollAndDownloadTask,
    extractFilename,
    downloadBlob,
};