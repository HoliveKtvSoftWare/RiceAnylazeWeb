import apiClient from './apiClient'; // 导入配置好的axios实例

/**
 * 上传图片文件进行分析
 * @param {File} file - 用户选择的图片文件对象
 * @returns {Promise<object>} 后端返回的包含 analysis_id 的响应数据或抛出错误
 */
const uploadFile = (file) => {
  const formData = new FormData();
  formData.append('file', file); // 'file' 键名需与后端参数名一致

  // 发送 POST 请求到 /analysis/upload
  return apiClient.post('/analysis/upload', formData, {
    // 明确设置 Content-Type
    headers: {
      'Content-Type': 'multipart/form-data',
    },
  }).then(response => response.data); // 成功时只返回 data 部分
};

/**
 * 获取当前用户的分析历史记录
 * @returns {Promise<Array<object>>} 包含分析记录对象的数组或抛出错误
 */
const getHistory = () => {
  console.debug('Fetching analysis history...'); // 添加日志
  // 发送 GET 请求到 /analysis/history
  // apiClient 的请求拦截器会自动添加 Authorization Token
  return apiClient.get('/analysis/history')
    .then(response => {
      console.debug('History fetched successfully:', response.data); // 添加日志
      // 后端返回的是一个包含历史记录对象的数组
      return response.data;
    })
    .catch(error => {
      console.error('Failed to fetch history:', error.response?.data || error.message); // 添加日志
      throw error; // 将错误继续抛出
    });
};

/**
 * 删除指定的分析记录
 * @param {string} analysisId - 要删除的分析记录ID
 * @returns {Promise<object>} 删除操作的结果
 */
const deleteJob = (analysisId) => {
  console.debug(`Deleting job with ID: ${analysisId}`);
  // 发送DELETE请求到/analysis/delete/{analysis_id}
  return apiClient.delete(`/analysis/delete/${analysisId}`)
    .then(response => {
      console.debug('Job deleted successfully');
      return response.data;
    })
    .catch(error => {
      console.error('Failed to delete job:', error.response?.data || error.message);
      throw error;
    });
};

/**
 * 获取可导出的列配置
 * @returns {Promise<object>} 包含可导出列配置的响应数据
 */
const getExportColumns = () => {
  console.debug('Fetching export columns configuration...');
  return apiClient.get('/analysis/excel/columns')
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
 * @returns {Promise<object>} 包含Excel文件数据的响应
 */
const exportSingleToExcel = (analysisId, selectedColumns) => {
  console.debug(`Exporting single analysis ${analysisId} to Excel with columns:`, selectedColumns);
  return apiClient.post(`/analysis/excel/${analysisId}`, { selectedColumns })
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
 * @returns {Promise<object>} 包含Excel文件数据的响应
 */
const exportAllToExcel = (selectedColumns) => {
  console.debug('Exporting all analyses to Excel with columns:', selectedColumns);
  return apiClient.post('/analysis/excel/summary', { selectedColumns })
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
export const analysisService = {
  uploadFile, // 上传图片文件进行分析
  getHistory, // 获取分析历史记录
  deleteJob, // 删除功能
  getExportColumns, // 获取可导出的列配置
  exportSingleToExcel, // 导出单个分析任务到Excel
  exportAllToExcel, // 导出所有分析记录到Excel
};
