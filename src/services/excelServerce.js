import apiClient from './apiClient';
import { downloadBlob } from '@/utils/fileDownload';
import { transformKeys } from '@/utils/transform';

const getExportColumns = (taskType = 'stem') => {
    console.debug('Fetching export columns configuration for', taskType);
    return apiClient.get('/excel/columns', { params: { task_type: taskType } })
        .then(response => response.data)
        .catch(error => {
            console.error('Failed to fetch export columns:', error.response?.data || error.message);
            throw error;
        });
};

const exportSingleToExcel = (analysisId, originalFilename, selectedColumns, unit, taskType = 'stem') => {
    console.debug(`Exporting single analysis ${analysisId} (${originalFilename}) to Excel...`);
    return apiClient.post(`/excel/${analysisId}`, { selectedColumns, unit, taskType }, {
        responseType: 'blob',
        timeout: 30000
    }).then(response => {
        console.debug('Single Excel export successful');
        const filename = downloadBlob(response, 'export.xlsx');
        return { filename };
    }).catch(error => {
        console.error('Failed to export single Excel:', error.response?.data || error.message);
        throw error;
    });
};

const batchExportToExcel = (analysisIds, selectedColumns, unit, asyncMode = false, taskType = 'stem') => {
    console.debug(`Batch exporting ${analysisIds.length} analyses to Excel, asyncMode:`, asyncMode);
    return apiClient.post('/excel/batch', { analysisIds, selectedColumns, unit, asyncMode, taskType }, {
        responseType: asyncMode ? 'json' : 'blob',
        timeout: asyncMode ? 10000 : Math.max(30000, analysisIds.length * 2000)
    }).then(response => {
        if (asyncMode) {
            const data = transformKeys(response.data);
            console.debug('Batch export async task submitted, taskId:', data.taskId);
            return data;
        }
        console.debug('Batch Excel export successful (sync)');
        const filename = downloadBlob(response, 'batch_export.xlsx');
        return { filename };
    }).catch(error => {
        console.error('Failed to batch export Excel:', error.response?.data || error.message);
        throw error;
    });
};

const exportAllToExcel = (selectedColumns, unit, asyncMode = true, taskType = 'stem') => {
    console.debug('Exporting all analyses to Excel, asyncMode:', asyncMode);
    return apiClient.post('/excel/summary', { selectedColumns, unit, asyncMode, taskType }, {
        responseType: asyncMode ? 'json' : 'blob',
        timeout: asyncMode ? 10000 : 120000
    }).then(response => {
        if (asyncMode) {
            const data = transformKeys(response.data);
            console.debug('Summary export async task submitted, taskId:', data.taskId);
            return data;
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
        .then(response => transformKeys(response.data))
        .catch(error => {
            console.error('Failed to get task status:', error.response?.data || error.message);
            throw error;
        });
};

const downloadTaskResult = (taskId) => {
    return apiClient.get(`/excel/download/${taskId}`, {
        responseType: 'blob',
        timeout: 120000
    }).then(response => {
        const filename = downloadBlob(response, 'export.xlsx');
        return { filename };
    }).catch(error => {
        console.error('Failed to download task result:', error.response?.data || error.message);
        throw error;
    });
};

const cancelTask = (taskId) => {
    console.debug(`Cancelling export task ${taskId}...`);
    return apiClient.post(`/excel/tasks/${taskId}/cancel`)
        .then(() => true)
        .catch(error => {
            console.warn('Cancel task API not available or failed:', error.response?.status);
            return false;
        });
};

const pollAndDownloadTask = (taskId, onProgress, interval = 1500) => {
    let timer = null;
    let attempts = 0;
    const maxAttempts = 300;
    let cancelled = false;

    const promise = new Promise((resolve, reject) => {
        const poll = async () => {
            if (cancelled) return;
            attempts++;
            if (attempts > maxAttempts) {
                clearInterval(timer);
                reject(new Error('导出任务超时'));
                return;
            }
            try {
                const status = await getTaskStatus(taskId);
                if (cancelled) return;
                onProgress?.({
                    status: status.status,
                    progress: status.progress ?? 0,
                    total: status.total ?? 0,
                    message: status.message || ''
                });

                if (status.status === 'completed') {
                    clearInterval(timer);
                    try {
                        const result = await downloadTaskResult(taskId);
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
                if (!cancelled) reject(err);
            }
        };

        timer = setInterval(poll, interval);
        poll();
    });

    promise.cancel = async () => {
        cancelled = true;
        if (timer) {
            clearInterval(timer);
            timer = null;
        }
        try {
            await cancelTask(taskId);
        } catch (e) {
            console.warn('Error notifying backend of cancellation:', e);
        }
    };

    return promise;
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