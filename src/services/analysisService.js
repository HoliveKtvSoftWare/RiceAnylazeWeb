import apiClient from './apiClient'; // 导入配置好的axios实例

const toCamelCase = (str) => str.replace(/_([a-z0-9])/g, (_, c) => c.toUpperCase());

const transformKeys = (obj) => {
  if (Array.isArray(obj)) return obj.map(transformKeys);
  if (obj && typeof obj === 'object') {
    const result = {};
    for (const key of Object.keys(obj)) {
      result[toCamelCase(key)] = transformKeys(obj[key]);
    }
    return result;
  }
  return obj;
};

/**
 * 获取后端支持的分析类型列表
 * @returns {Promise<object>} 包含 tasks 数组的响应数据（如 { tasks: [{ key, name, model }] }）
 */
const getTasks = () => {
  console.debug('Fetching analysis task types...');
  return apiClient.get('/analysis/tasks')
      .then(response => transformKeys(response.data))
      .catch(error => {
        console.error('Failed to fetch analysis tasks:', error.response?.data || error.message);
        throw error;
      });
};

/**
 * 上传图片文件进行分析
 * @param {File} file - 用户选择的图片文件对象
 * @param {string} batchId - 批次ID，用于标识同一次上传的多个文件
 * @param {string} [taskType] - 分析类型（stem/leaf），不传时后端默认 stem
 * @returns {Promise<object>} 后端返回的包含 analysis_id 的响应数据或抛出错误
 */
const uploadFile = (file, batchId = null, taskType = null, onUploadProgress = null) => {
  const formData = new FormData();
  formData.append('file', file); // 'file' 键名需与后端参数名一致
  if (batchId) {
    formData.append('batch_id', batchId); // 添加批次ID
  }
  if (taskType) {
    formData.append('task_type', taskType); // 添加分析类型
  }

  // 发送 POST 请求到 /analysis/upload
  return apiClient.post('/analysis/upload', formData, {
    // 明确设置 Content-Type
    headers: {
      'Content-Type': 'multipart/form-data',
    },
    onUploadProgress,
  }).then(response => transformKeys(response.data));
};

/**
 * 批量上传文件夹中的图片进行分析
 * @param {FileList|Array} files - 文件夹中的文件列表
 * @param {string} [taskType] - 分析类型（stem/leaf），不传时后端默认 stem
 * @returns {Promise<object>} 后端返回的批量上传结果
 */
const uploadFolder = (files, taskType = null, onUploadProgress = null) => {
  const fileArray = Array.from(files);
  const formData = new FormData();
  fileArray.forEach(file => {
    formData.append('files', file);
  });
  if (taskType) {
    formData.append('task_type', taskType); // 添加分析类型
  }

  return apiClient.post('/analysis/upload/batch', formData, {
    headers: {
      'Content-Type': 'multipart/form-data',
    },
    onUploadProgress,
  }).then(response => transformKeys(response.data));
};

/**
 * 获取当前用户的分析历史记录
 * @param {string} [taskType] - 可选的分析类型过滤（如 leaf_our），不传时不按类型过滤
 * @param {string} [group] - 可选的分析大类过滤（stem=茎秆 / leaf=剑叶）；
 *                           与 taskType 同时传时后端以 taskType 为准
 * @returns {Promise<Array<object>>} 包含分析记录对象的数组或抛出错误
 */
const getHistory = (taskType = null, group = null) => {
  console.debug('Fetching analysis history...', taskType ? `taskType=${taskType}` : group ? `group=${group}` : 'all'); // 添加日志
  // 发送 GET 请求到 /analysis/history
  // apiClient 的请求拦截器会自动添加 Authorization Token
  const params = {};
  if (taskType) params.task_type = taskType;
  if (group) params.group = group;
  return apiClient.get('/analysis/history', { params: Object.keys(params).length ? params : undefined })
      .then(response => {
        console.debug('History fetched successfully:', response.data);
        return transformKeys(response.data);
      })
      .catch(error => {
        console.error('Failed to fetch history:', error.response?.data || error.message); // 添加日志
        throw error; // 将错误继续抛出
      });
};

/**
 * 获取当前用户的分析统计（主页用）
 * @param {number} [days] - 趋势窗口天数（后端限制 1~90，默认 7）
 * @returns {Promise<object>} { total, byStatus, byGroup, avgDurationSeconds, daily: [...] }
 */
const getStats = (days = 7) => {
  console.debug('Fetching analysis stats...', `days=${days}`);
  return apiClient.get('/analysis/stats', { params: { days } })
      .then(response => transformKeys(response.data))
      .catch(error => {
        console.error('Failed to fetch analysis stats:', error.response?.data || error.message);
        throw error;
      });
};

/**
 * 删除指定的分析记录
 * @param {string} analysisId - 要删除的分析记录ID
 * @returns {Promise<object>} 删除操作的结果
 */
const deleteJob = (analysisId) => {
  console.debug(`Deleting job with ID: ${analysisId}`);
  return apiClient.delete(`/analysis/delete/${analysisId}`)
      .then(response => response.data)
      .catch(error => {
        console.error('Failed to delete job:', error.response?.data || error.message);
        throw error;
      });
};

/**
 * 批量删除分析记录
 * @param {Array<string>} analysisIds - 要删除的分析记录ID数组
 * @returns {Promise<object>} 批量删除操作的结果
 */
const batchDeleteJobs = (analysisIds) => {
  console.debug(`Batch deleting ${analysisIds.length} jobs`);
  return apiClient.post('/analysis/delete/batch', { analysisIds })
      .then(response => response.data)
      .catch(error => {
        console.error('Failed to batch delete jobs:', error.response?.data || error.message);
        throw error;
      });
};

// 导出服务对象
export const analysisService = {
  getTasks,
  uploadFile,
  uploadFolder,
  getHistory,
  getStats,
  deleteJob,
  batchDeleteJobs,
};
