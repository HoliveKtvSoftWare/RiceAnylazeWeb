import apiClient from './apiClient';
import { transformKeys } from '@/utils/transform';

/**
 * 获取后端可用的模型列表
 * @returns {Promise<{models: Array<{name: string, path: string}>, default: string}>}
 */
const fetchModels = () => {
  return apiClient.get('/analysis/models')
    .then(response => response.data);
};

/**
 * 上传图片文件进行分析
 * @param {File} file - 用户选择的图片文件对象
 * @param {string} batchId - 批次ID，用于标识同一次上传的多个文件
 * @param {string} [modelName] - 选中的模型名称（可选，不传则后端用默认模型）
 * @returns {Promise<object>} 后端返回的包含 analysis_id 的响应数据或抛出错误
 */
const uploadFile = (file, batchId = null, fileCount = 1, modelName = null, onProgress = null) => {
  const formData = new FormData();
  formData.append('file', file);
  if (batchId) {
    formData.append('batch_id', batchId);
  }
  if (modelName) {
    formData.append('model_name', modelName);
  }

  return apiClient.post('/analysis/upload', formData, {
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
 * 批量上传文件夹中的图片进行分析
 * @param {FileList|Array} files - 文件夹中的文件列表
 * @param {string} [modelName] - 选中的模型名称（可选，整个批次用同一个模型）
 * @returns {Promise<object>} 后端返回的批量上传结果
 */
const uploadFolder = (files, modelName = null, onProgress = null) => {
  const fileArray = Array.from(files);
  const formData = new FormData();
  fileArray.forEach(file => {
    formData.append('files', file);
  });
  if (modelName) {
    formData.append('model_name', modelName);
  }

  return apiClient.post('/analysis/upload/batch', formData, {
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
 * @returns {Promise<Array<object>>} 包含分析记录对象的数组或抛出错误
 */
const getHistory = () => {
  console.debug('Fetching analysis history...'); // 添加日志
  // 发送 GET 请求到 /analysis/history
  // apiClient 的请求拦截器会自动添加 Authorization Token
  return apiClient.get('/analysis/history')
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
  uploadFile,
  uploadFolder,
  getHistory,
  deleteJob,
  batchDeleteJobs,
};