import apiClient from './apiClient';
import { downloadBlob } from '@/utils/fileDownload';
import { transformKeys } from '@/utils/transform';

const getExportColumns = () => {
    console.debug('Fetching export columns configuration...');
    return apiClient.get('/excel/columns')
        .then(response => response.data)
        .catch(error => {
            console.error('Failed to fetch export columns:', error.response?.data || error.message);
            throw error;
        });
};

const exportSingleToExcel = (analysisId, originalFilename, selectedColumns, unit, context = null) => {
    console.debug(`Exporting single analysis ${analysisId} (${originalFilename}) to Excel...`);
    return apiClient.post(`/excel/${analysisId}`, { selectedColumns, unit }, {
        responseType: 'blob',
        timeout: 30000
    }).then(response => {
        console.debug('Single Excel export successful');
        const filename = downloadBlob(response, `${analysisId}.xlsx`, context, false, unit);
        return { filename };
    }).catch(error => {
        console.error('Failed to export single Excel:', error.response?.data || error.message);
        throw error;
    });
};

const batchExportToExcel = (analysisIds, selectedColumns, unit, asyncMode = false, context = null) => {
    console.debug(`Batch exporting ${analysisIds.length} analyses to Excel, asyncMode:`, asyncMode);
    return apiClient.post('/excel/batch', { analysisIds, selectedColumns, unit, asyncMode }, {
        responseType: asyncMode ? 'json' : 'blob',
        timeout: asyncMode ? 10000 : Math.max(30000, analysisIds.length * 2000)
    }).then(response => {
        if (asyncMode) {
            const data = transformKeys(response.data);
            console.debug('Batch export async task submitted, taskId:', data.taskId);
            return data;
        }
        console.debug('Batch Excel export successful (sync)');
        const filename = downloadBlob(response, `batch_${analysisIds.length}_items.xlsx`, context, false, unit);
        return { filename };
    }).catch(error => {
        console.error('Failed to batch export Excel:', error.response?.data || error.message);
        throw error;
    });
};

const exportAllToExcel = (selectedColumns, unit, asyncMode = true, context = null) => {
    console.debug('Exporting all analyses to Excel, asyncMode:', asyncMode);
    return apiClient.post('/excel/summary', { selectedColumns, unit, asyncMode }, {
        responseType: asyncMode ? 'json' : 'blob',
        timeout: asyncMode ? 10000 : 120000
    }).then(response => {
        if (asyncMode) {
            const data = transformKeys(response.data);
            console.debug('Summary export async task submitted, taskId:', data.taskId);
            return data;
        }
        console.debug('Summary Excel export successful (sync)');
        const filename = downloadBlob(response, 'summary.xlsx', context, false, unit);
        return { filename };
    }).catch(error => {
        console.error('Failed to export all Excel:', error.response?.data || error.message);
        throw error;
    });
};

const getTaskStatus = (taskId) => {
    return apiClient.get(`/excel/tasks/${taskId}`)
        .then(response => transformKeys(response.data))
        .catch(error => {
            console.error('Failed to get task status:', error.response?.data || error.message);
            throw error;
        });
};

const downloadTaskResult = (taskId, fallbackName = 'export.xlsx', context = null) => {
    return apiClient.get(`/excel/download/${taskId}`, {
        responseType: 'blob',
        timeout: 120000
    }).then(response => {
        const filename = downloadBlob(response, fallbackName, context);
        return { filename };
    }).catch(error => {
        console.error('Failed to download task result:', error.response?.data || error.message);
        throw error;
    });
};

const pollAndDownloadTask = (taskId, onProgress, interval = 1500, context = null) => {
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
                        const result = await downloadTaskResult(taskId, status.filename || 'export.xlsx', context);
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
};