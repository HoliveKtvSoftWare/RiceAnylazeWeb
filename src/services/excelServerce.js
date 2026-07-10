import apiClient from './apiClient';

/**
 * 获取可导出的列配置
 * @returns {Promise<object>} 包含可导出列配置的响应数据
 */
const getExportColumns = () => {
    console.debug('Fetching export columns configuration...');
    return apiClient.get('/excel/columns')
        .then(response => {
            console.debug('Export columns fetched successfully');
            return response.data;
        })
        .catch(error => {
            console.error('Failed to fetch export columns:', error.response?.data || error.message);
            throw error;
        });
};

/**
 * 导出单个分析任务到Excel文件
 * @param {string} analysisId - 分析任务ID
 * @param {Array<string>} selectedColumns - 选定的列数组
 * @param {string} unit - 导出单位（um/mm/cm）
 * @returns {Promise<object>} 包含Excel文件数据的响应
 */
const exportSingleToExcel = (analysisId, selectedColumns, unit) => {
    console.debug(`Exporting single analysis ${analysisId} to Excel with columns:`, selectedColumns, 'unit:', unit);
    return apiClient.post(`/excel/${analysisId}`, { selectedColumns, unit })
        .then(response => {
            console.debug('Single Excel export successful');
            return response.data;
        })
        .catch(error => {
            console.error('Failed to export single Excel:', error.response?.data || error.message);
            throw error;
        });
};

/**
 * 导出所有分析记录到Excel文件
 * @param {Array<string>} selectedColumns - 选定的列数组
 * @param {string} unit - 导出单位（um/mm/cm）
 * @returns {Promise<object>} 包含Excel文件数据的响应
 */
const exportAllToExcel = (selectedColumns, unit) => {
    console.debug('Exporting all analyses to Excel with columns:', selectedColumns, 'unit:', unit);
    return apiClient.post('/excel/summary', { selectedColumns, unit })
        .then(response => {
            console.debug('All Excel export successful');
            return response.data;
        })
        .catch(error => {
            console.error('Failed to export all Excel:', error.response?.data || error.message);
            throw error;
        });
};

// 导出服务对象
export const excelService = {
    getExportColumns, // 获取可导出的列配置
    exportSingleToExcel, // 导出单个分析任务到Excel
    exportAllToExcel, // 导出所有分析记录到Excel
};