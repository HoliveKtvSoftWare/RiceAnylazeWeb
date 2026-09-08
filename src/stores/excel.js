import { defineStore } from 'pinia';
import { ref } from 'vue';
import { excelService } from '@/services/excelServerce';

export const useExcelStore = defineStore('excel', () => {
    const isLoading = ref(false);
    const error = ref(null);
    const exportColumns = ref([]);

    function setError(message) {
        error.value = message;
    }
    /**
     * 下载单个分析任务的Excel报告
     */
    async function downloadSingleExcelAction(analysisId, selectedColumns, unit) {
        isLoading.value = true;
        setError(null);
        try {
            const response = await excelService.exportSingleToExcel(analysisId, selectedColumns, unit);
            if (response.filename && response.content) {
                const byteCharacters = atob(response.content);
                const byteNumbers = new Array(byteCharacters.length);
                for (let i = 0; i < byteCharacters.length; i++) {
                    byteNumbers[i] = byteCharacters.charCodeAt(i);
                }
                const byteArray = new Uint8Array(byteNumbers);
                const blob = new Blob([byteArray], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
                const url = window.URL.createObjectURL(blob);
                const link = document.createElement('a');
                link.href = url;
                link.download = response.filename;
                document.body.appendChild(link);
                link.click();
                document.body.removeChild(link);
                window.URL.revokeObjectURL(url);
                console.log(`Excel file downloaded: ${response.filename}`);
                return true;
            } else {
                setError('Excel文件数据格式错误');
                return false;
            }
        } catch (err) {
            console.error('Download single Excel action failed:', err);
            const detail = err.response?.data?.detail || err.message || '下载Excel报告失败。';
            setError(detail);
            return false;
        } finally {
            isLoading.value = false;
        }
    }

    /**
     * 下载所有分析记录的Excel总表
     */
    async function downloadExcelSummaryAction(selectedColumns, unit) {
        isLoading.value = true;
        setError(null);
        try {
            const response = await excelService.exportAllToExcel(selectedColumns, unit);
            if (response.filename && response.content) {
                const byteCharacters = atob(response.content);
                const byteNumbers = new Array(byteCharacters.length);
                for (let i = 0; i < byteCharacters.length; i++) {
                    byteNumbers[i] = byteCharacters.charCodeAt(i);
                }
                const byteArray = new Uint8Array(byteNumbers);
                const blob = new Blob([byteArray], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
                const url = window.URL.createObjectURL(blob);
                const link = document.createElement('a');
                link.href = url;
                link.download = response.filename;
                document.body.appendChild(link);
                link.click();
                document.body.removeChild(link);
                window.URL.revokeObjectURL(url);
                console.log(`Excel summary file downloaded: ${response.filename}`);
                return true;
            } else {
                setError('Excel总表数据格式错误');
                return false;
            }
        } catch (err) {
            console.error('Download Excel summary action failed:', err);
            const detail = err.response?.data?.detail || err.message || '下载Excel总表失败。';
            setError(detail);
            return false;
        } finally {
            isLoading.value = false;
        }
    }

    async function downloadBatchExcelAction(analysisIds, selectedColumns, unit) {
        isLoading.value = true;
        setError(null);
        try {
            const response = await excelService.batchExportToExcel(analysisIds, selectedColumns, unit);
            if (response.filename && response.content) {
                const byteCharacters = atob(response.content);
                const byteNumbers = new Array(byteCharacters.length);
                for (let i = 0; i < byteCharacters.length; i++) {
                    byteNumbers[i] = byteCharacters.charCodeAt(i);
                }
                const byteArray = new Uint8Array(byteNumbers);
                const blob = new Blob([byteArray], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
                const url = window.URL.createObjectURL(blob);
                const link = document.createElement('a');
                link.href = url;
                link.download = response.filename;
                document.body.appendChild(link);
                link.click();
                document.body.removeChild(link);
                window.URL.revokeObjectURL(url);
                console.log(`Batch Excel file downloaded (${analysisIds.length} analyses): ${response.filename}`);
                return true;
            } else {
                setError('Excel文件数据格式错误');
                return false;
            }
        } catch (err) {
            console.error('Download batch Excel action failed:', err);
            const detail = err.response?.data?.detail || err.message || '批量下载Excel报告失败。';
            setError(detail);
            return false;
        } finally {
            isLoading.value = false;
        }
    }

    return {
        isLoading,
        error,
        exportColumns,
        setError,
        downloadSingleExcelAction,
        downloadBatchExcelAction,
        downloadExcelSummaryAction,
    };
});