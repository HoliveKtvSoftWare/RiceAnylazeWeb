import { defineStore } from 'pinia';
import { ref } from 'vue';
import { excelService } from '@/services/excelServerce';

export const useExcelStore = defineStore('excel', () => {
    const isLoading = ref(false);
    const error = ref(null);
    const exportColumns = ref([]);
    const columnsTaskType = ref(''); // 上一次成功获取列配置所用的分析类型

    function setError(message) {
        error.value = message;
    }

    /**
     * 按分析类型获取可导出的列配置
     * @param {string} [taskType] - 分析类型（stem/leaf）
     * @returns {Promise<object|null>} { columns, message } 或 null（失败时 error 中带提示）
     */
    async function fetchExportColumnsAction(taskType = '') {
        try {
            const data = await excelService.getExportColumns(taskType || null);
            const rawColumns = data?.available_columns || {};
            // 后端返回 { 列key: 中文列名 }，转换为组件使用的 [{ key, label }]
            exportColumns.value = Object.keys(rawColumns).map(key => ({
                key,
                label: rawColumns[key],
            }));
            columnsTaskType.value = taskType || '';
            console.log('Export columns updated in store:', exportColumns.value);
            return { columns: exportColumns.value, message: data?.message || '' };
        } catch (err) {
            console.error('Fetch export columns action failed:', err.response?.data || err.message);
            exportColumns.value = [];
            columnsTaskType.value = '';
            const detail = err.response?.data?.detail || err.message || '获取导出列配置失败。';
            setError(detail);
            return null;
        }
    }

    /**
     * 下载单个分析任务的Excel报告
     * @param {string} analysisId - 分析任务ID
     * @param {Array<string>} selectedColumns - 选定的列
     * @param {string} unit - 导出单位
     * @param {string} [taskType] - 分析类型（后端以记录自身类型为准）
     */
    async function downloadSingleExcelAction(analysisId, selectedColumns, unit, taskType = '') {
        isLoading.value = true;
        setError(null);
        try {
            const response = await excelService.exportSingleToExcel(analysisId, selectedColumns, unit, taskType || null);
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
     * @param {Array<string>} selectedColumns - 选定的列
     * @param {string} unit - 导出单位
     * @param {string} [taskType] - 分析类型（总表按此类型导出）
     */
    async function downloadExcelSummaryAction(selectedColumns, unit, taskType = '') {
        isLoading.value = true;
        setError(null);
        try {
            const response = await excelService.exportAllToExcel(selectedColumns, unit, taskType || null);
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

    async function downloadBatchExcelAction(analysisIds, selectedColumns, unit, taskType = '') {
        isLoading.value = true;
        setError(null);
        try {
            const response = await excelService.batchExportToExcel(analysisIds, selectedColumns, unit, taskType || null);
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
        columnsTaskType,
        setError,
        fetchExportColumnsAction,
        downloadSingleExcelAction,
        downloadBatchExcelAction,
        downloadExcelSummaryAction,
    };
});