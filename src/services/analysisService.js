import apiClient from './apiClient';
import { transformKeys } from '@/utils/transform';

/**
 * 获取后端可用的模型列表
 * @param {string} [group] - 按大类过滤：stem=茎秆 / leaf=剑叶；不传返回全部
 * @returns {Promise<{models: Array<{name: string, path: string}>, default: string}>}
 */
const fetchModels = (group = null) => {
  return apiClient.get('/analysis/models', { params: group ? { group } : {} })
    .then(response => response.data);
};

/**
 * 上传文件进行分析
 *
 * 后端有两个端点，**字段名不同**，必须按文件数选对，否则 422：
 *   - `POST /analysis/upload`       收 `file` （单数，UploadFile）
 *   - `POST /analysis/upload/batch` 收 `files`（复数，List[UploadFile]）
 * 两个端点都接受 `batch_id` / `batch_name`：
 *   - `batch_id`：一次"选多张单图"时把同一个 id 发给每张图，后端复用它，
 *     使这批图在历史里归为同一批次（不传则每张图各成一个批次）
 *   - `batch_name`：批次展示名（如文件夹名）
 *
 * @param {File[]|FileList|File} files - 要上传的文件
 * @param {string} [modelName] - 选中的模型名称（可选）
 * @param {Function} [onProgress] - 上传进度回调
 * @param {string} [batchName] - 批次名称（可选）
 * @param {string} [batchId] - 批次 id（可选，多张单图共用）
 * @returns {Promise<object>} 后端返回的响应数据（含 analysisId / batchId）
 */
const uploadAnalysis = (files, modelName = null, onProgress = null, batchName = null, batchId = null) => {
  const fileArray = Array.from(files);
  if (fileArray.length === 0) {
    return Promise.reject(new Error('没有选择任何文件'));
  }

  const single = fileArray.length === 1;
  const formData = new FormData();
  if (single) {
    formData.append('file', fileArray[0]);
  } else {
    fileArray.forEach(file => formData.append('files', file));
  }
  if (modelName) {
    formData.append('model_name', modelName);
  }
  if (batchName) {
    formData.append('batch_name', batchName);
  }
  if (batchId) {
    formData.append('batch_id', batchId);
  }

  return apiClient.post(single ? '/analysis/upload' : '/analysis/upload/batch', formData, {
    headers: {
      'Content-Type': 'multipart/form-data',
    },
    onUploadProgress: (event) => {
      if (onProgress && event.total) {
        onProgress(Math.round((event.loaded * 100) / event.total));
      }
    },
  }).then(response => transformKeys(response.data));
};

/**
 * 获取当前用户的分析历史记录
 * @param {string} [group] - 按大类过滤：stem=茎秆 / leaf=剑叶；不传返回全部
 * @returns {Promise<Array<object>>} 包含分析记录对象的数组或抛出错误
 */
const getHistory = (group = null) => {
  console.debug('Fetching analysis history...', group || 'all'); // 添加日志
  // 发送 GET 请求到 /analysis/history
  // apiClient 的请求拦截器会自动添加 Authorization Token
  return apiClient.get('/analysis/history', { params: group ? { group } : {} })
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
  fetchModels,
  uploadAnalysis,
  getHistory,
  deleteJob,
  batchDeleteJobs,
};