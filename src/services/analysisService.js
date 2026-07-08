import apiClient from './apiClient'; // 导入配置好的axios实例

/**
 * 上传图片文件进行分析
 * @param {File} file - 用户选择的图片文件对象
 * @param {string} batchId - 批次ID，用于标识同一次上传的多个文件
 * @returns {Promise<object>} 后端返回的包含 analysis_id 的响应数据或抛出错误
 */
const uploadFile = (file, batchId = null) => {
  const formData = new FormData();
  formData.append('file', file); // 'file' 键名需与后端参数名一致
  if (batchId) {
    formData.append('batch_id', batchId); // 添加批次ID
  }

  // 发送 POST 请求到 /analysis/upload
  return apiClient.post('/analysis/upload', formData, {
    // 明确设置 Content-Type
    headers: {
      'Content-Type': 'multipart/form-data',
    },
  }).then(response => response.data); // 成功时只返回 data 部分
};

/**
 * 上传文件夹中的图片进行批量分析
 * @param {FileList|Array} files - 文件夹中的文件列表
 * @returns {Promise<Array<object>>} 所有文件上传结果的数组
 */
const uploadFolder = (files) => {
  // 生成唯一的批次ID
  const batchId = 'batch_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
  console.debug(`Uploading folder with batch ID: ${batchId}, total files: ${files.length}`);

  // 将文件列表转换为数组（处理 FileList 对象）
  const fileArray = Array.from(files);

  // 逐个上传文件，使用相同的批次ID
  const uploadPromises = fileArray.map((file, index) => {
    // 添加短暂延迟，避免请求过于频繁
    return new Promise(resolve => setTimeout(resolve, index * 200))
      .then(() => uploadFile(file, batchId))
      .then(result => {
        console.debug(`File uploaded successfully: ${file.name}`);
        return { success: true, file: file.name, result };
      })
      .catch(error => {
        console.error(`Failed to upload file: ${file.name}`, error);
        return { success: false, file: file.name, error: error.message };
      });
  });

  // 等待所有上传完成
  return Promise.all(uploadPromises)
    .then(results => {
      const successCount = results.filter(r => r.success).length;
      const failCount = results.filter(r => !r.success).length;
      console.debug(`Folder upload completed: ${successCount} succeeded, ${failCount} failed`);
      return { batchId, results, successCount, failCount };
    });
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

// 导出服务对象
export const analysisService = {
  uploadFile, // 上传图片文件进行分析
  uploadFolder, // 上传文件夹进行批量分析
  getHistory, // 获取分析历史记录
  deleteJob, // 删除功能
};