import apiClient from './apiClient';

/**
 * 获取可导出的列配置
 * @param {string} [taskType] - 可选的分析类型（stem/leaf），不传时后端等价于 stem
 * @returns {Promise<object>} 包含 available_columns / message 的响应数据
 */
const getExportColumns = (taskType = null) => {
    console.debug('Fetching export columns configuration...', taskType ? `taskType=${taskType}` : 'default');
    const params = {};
    if (taskType) params.task_type = taskType; // 契约：GET /excel/columns 使用 snake_case 查询参数
    return apiClient.get('/excel/columns', { params })
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
 * @param {string} [taskType] - 可选的分析类型（后端以记录自身类型为准，此处仅作为补充信息）
 * @returns {Promise<object>} 包含Excel文件数据的响应
 */
const exportSingleToExcel = (analysisId, selectedColumns, unit, taskType = null) => {
    console.debug(`Exporting single analysis ${analysisId} to Excel with columns:`, selectedColumns, 'unit:', unit, 'taskType:', taskType);
    const payload = { selectedColumns, unit };
    if (taskType) payload.taskType = taskType; // 契约：请求体使用 camelCase
    return apiClient.post(`/excel/${analysisId}`, payload)
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
 * 导出多个分析任务到Excel文件
 * @param {Array<string>} analysisIds - 分析任务ID数组
 * @param {Array<string>} selectedColumns - 选定的列数组
 * @param {string} unit - 导出单位（um/mm/cm）
 * @param {string} [taskType] - 可选的分析类型（后端以记录自身类型为准，此处仅作为补充信息）
 * @returns {Promise<object>} 包含Excel文件数据的响应
 */
const batchExportToExcel = (analysisIds, selectedColumns, unit, taskType = null) => {
    console.debug(`Batch exporting ${analysisIds.length} analyses to Excel with columns:`, selectedColumns, 'unit:', unit, 'taskType:', taskType);
    const payload = { analysisIds, selectedColumns, unit };
    if (taskType) payload.taskType = taskType; // 契约：请求体使用 camelCase
    return apiClient.post('/excel/batch', payload)
        .then(response => {
            console.debug('Batch Excel export successful');
            return response.data;
        })
        .catch(error => {
            console.error('Failed to batch export Excel:', error.response?.data || error.message);
            throw error;
        });
};

/**
 * 导出所有分析记录到Excel总表
 * @param {Array<string>} selectedColumns - 选定的列数组
 * @param {string} unit - 导出单位（um/mm/cm）
 * @param {string} [taskType] - 可选的分析类型（stem/leaf），总表按此类型导出
 * @returns {Promise<object>} 包含Excel文件数据的响应
 */
const exportAllToExcel = (selectedColumns, unit, taskType = null) => {
    console.debug('Exporting all analyses to Excel with columns:', selectedColumns, 'unit:', unit, 'taskType:', taskType);
    const payload = { selectedColumns, unit };
    if (taskType) payload.taskType = taskType; // 契约：请求体使用 camelCase（仅 summary 生效）
    return apiClient.post('/excel/summary', payload)
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
    batchExportToExcel, // 导出多个分析任务到Excel
    exportAllToExcel, // 导出所有分析记录到Excel
};