import { defineStore } from 'pinia';
import { ref } from 'vue';
import { excelService } from '@/services/excelServerce';

const ASYNC_THRESHOLD = 20;

export const useExcelStore = defineStore('excel', () => {
    const isLoading = ref(false);
    const error = ref(null);
    const exportColumns = ref([]);

    const taskProgress = ref(0);
    const taskTotal = ref(0);
    const taskMessage = ref('');
    const isAsyncTask = ref(false);

    function setError(message) {
        error.value = message;
    }

    function resetProgress() {
        taskProgress.value = 0;
        taskTotal.value = 0;
        taskMessage.value = '';
        isAsyncTask.value = false;
    }

    function onProgressUpdate({ progress, total, message }) {
        taskProgress.value = progress ?? 0;
        taskTotal.value = total ?? 0;
        taskMessage.value = message || '';
    }

    async function downloadSingleExcelAction(analysisId, selectedColumns, unit) {
        isLoading.value = true;
        setError(null);
        resetProgress();
        try {
            const result = await excelService.exportSingleToExcel(analysisId, selectedColumns, unit);
            console.log(`Single Excel downloaded: ${result.filename}`);
            return true;
        } catch (err) {
            console.error('Download single Excel failed:', err);
            const detail = err.response?.data?.detail || err.message || '下载Excel报告失败。';
            setError(detail);
            return false;
        } finally {
            isLoading.value = false;
        }
    }

    async function downloadBatchExcelAction(analysisIds, selectedColumns, unit) {
        isLoading.value = true;
        setError(null);
        resetProgress();

        const useAsync = analysisIds.length > ASYNC_THRESHOLD;
        if (useAsync) {
            isAsyncTask.value = true;
            taskMessage.value = '正在提交导出任务...';
        }

        try {
            if (useAsync) {
                const { taskId } = await excelService.batchExportToExcel(
                    analysisIds, selectedColumns, unit, true
                );
                taskMessage.value = '导出任务已提交，处理中...';
                await excelService.pollAndDownloadTask(taskId, onProgressUpdate);
            } else {
                await excelService.batchExportToExcel(
                    analysisIds, selectedColumns, unit, false
                );
            }
            console.log(`Batch Excel downloaded (${analysisIds.length} items)`);
            return true;
        } catch (err) {
            console.error('Download batch Excel failed:', err);
            const detail = err.response?.data?.detail || err.message || '批量下载Excel报告失败。';
            setError(detail);
            return false;
        } finally {
            isLoading.value = false;
            resetProgress();
        }
    }

    async function downloadExcelSummaryAction(selectedColumns, unit) {
        isLoading.value = true;
        setError(null);
        resetProgress();
        isAsyncTask.value = true;
        taskMessage.value = '正在提交导出任务...';

        try {
            const { taskId } = await excelService.exportAllToExcel(selectedColumns, unit, true);
            taskMessage.value = '汇总导出任务已提交，处理中...';
            await excelService.pollAndDownloadTask(taskId, onProgressUpdate);
            console.log('Summary Excel downloaded');
            return true;
        } catch (err) {
            console.error('Download Excel summary failed:', err);
            const detail = err.response?.data?.detail || err.message || '下载Excel总表失败。';
            setError(detail);
            return false;
        } finally {
            isLoading.value = false;
            resetProgress();
        }
    }

    return {
        isLoading,
        error,
        exportColumns,
        taskProgress,
        taskTotal,
        taskMessage,
        isAsyncTask,
        setError,
        downloadSingleExcelAction,
        downloadBatchExcelAction,
        downloadExcelSummaryAction,
    };
});