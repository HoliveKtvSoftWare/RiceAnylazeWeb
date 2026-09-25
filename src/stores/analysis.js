import { defineStore } from 'pinia';
import { ref } from 'vue';
import { analysisService } from '@/services/analysisService'; // 导入分析服务

export const useAnalysisStore = defineStore('analysis', () => {
  const isLoading = ref(false);
  const error = ref(null);
  const historyList = ref([]);
  /** @type {{analysisId: string, originalFilename: string, originalImageUrl: string, annotatedImageUrl: string, status: string, createdAt: string, batchId?: string} | null} */
  const selectedJob = ref(null);

  /** @type {Array<{name: string, path: string}>} */
  const availableModels = ref([]);
  const defaultModelName = ref(null);
  const currentModelName = ref(null);
  const modelsLoaded = ref(false);
  const modelsLoading = ref(false);

  /**
   * 设置/清除错误信息
   */
  function setError(message) {
    // 这个 action 负责所有对 error状态的修改
    error.value = message;
  }

  /**
   * 从后端拉取可用模型列表
   */
  async function fetchModelsAction() {
    modelsLoading.value = true;
    try {
      const data = await analysisService.fetchModels();
      availableModels.value = data.models || [];
      defaultModelName.value = data.default || null;
      if (!currentModelName.value && data.default) {
        currentModelName.value = data.default;
      }
      modelsLoaded.value = true;
      console.log('Models fetched:', availableModels.value, 'default:', defaultModelName.value);
    } catch (err) {
      console.error('Failed to fetch models:', err.response?.data || err.message);
      modelsLoaded.value = true;
    } finally {
      modelsLoading.value = false;
    }
  }

  /**
   * 上传图片文件进行分析
   * @param {File} file - 要上传的文件
   * @param {string} batchId - 批次ID，用于标识同一次上传的多个文件
   * @param {string} [modelName] - 选中的模型名称（可选）
   */
  async function uploadFileAction(file, batchId = null, fileCount = 1, modelName = null, onProgress = null, manageLoading = true) {
    if (manageLoading) isLoading.value = true;
    setError(null);
    try {
      const responseData = await analysisService.uploadFile(file, batchId, fileCount, modelName, onProgress);
      console.log('Upload successful, response:', responseData);

      if (responseData.analysisId && responseData.originalFilename) {
        await fetchHistoryAction(false);
      } else {
        console.error('Upload response missing analysis_id or original_filename:', responseData);
        setError('上传响应无效。'); // 调用 action 设置错误
      }
      return true; // 表示上传操作成功
    } catch (err) {
      console.error('Upload action failed:', err.response?.data || err.message);
      // 从后端错误中提取 detail 字段
      const detail = err.response?.data?.detail || err.message || '上传文件失败。';
      setError(detail); // 调用 action 设置错误
      return false; // 表示上传操作失败
    } finally {
      if (manageLoading) isLoading.value = false;
    }
  }

  /**
   * 批量上传文件夹进行分析
   * @param {FileList|Array} files - 文件夹中的文件列表
   * @param {string} [modelName] - 选中的模型名称（可选，整个批次用同一个模型）
   */
  async function uploadFolderAction(files, modelName = null, onProgress = null, manageLoading = true) {
    if (manageLoading) isLoading.value = true;
    setError(null);
    try {
      const responseData = await analysisService.uploadFolder(files, modelName, onProgress);
      console.log('Folder upload successful, response:', responseData);

      await fetchHistoryAction(false);

      return responseData; // 返回响应数据
    } catch (err) {
      console.error('Folder upload action failed:', err.response?.data || err.message);
      const detail = err.response?.data?.detail || err.message || '上传文件夹失败。';
      setError(detail);
      return null;
    } finally {
      if (manageLoading) isLoading.value = false;
    }
  }

  /**
   * 获取分析历史记录
   * @param {boolean} [manageLoading=true] - 是否管理全局 isLoading 状态
   */
  async function fetchHistoryAction(manageLoading = true) {
    if (manageLoading) isLoading.value = true;
    setError(null);
    try {
      const historyData = await analysisService.getHistory();
      historyList.value = historyData;
      if (selectedJob.value) {
        const updated = historyData.find(j => j.analysisId === selectedJob.value.analysisId);
        if (updated) {
          selectedJob.value = updated;
        }
      }
    } catch (err) {
      console.error('Fetch history action failed:', err);
      setError('无法加载分析历史记录。');
      historyList.value = [];
    } finally {
      if (manageLoading) isLoading.value = false;
    }
  }

  function selectJobAction(job) {
    console.debug('Job selected:', job);
    selectedJob.value = job; // 更新选中的记录
    // 选中新任务时也清除错误
    setError(null);
  }

  /**
   * 删除指定的分析记录
   */
  async function deleteJobAction(analysisId) {
    isLoading.value = true;
    setError(null);
    try {
      await analysisService.deleteJob(analysisId);

      const index = historyList.value.findIndex(job => job.analysisId === analysisId);
      if (index !== -1) {
        historyList.value.splice(index, 1);
      }

      if (selectedJob.value && selectedJob.value.analysisId === analysisId) {
        selectedJob.value = null;
      }

      console.log(`Job ${analysisId} deleted successfully`);
      return true;
    } catch (err) {
      console.error('Delete job action failed:', err);
      const detail = err.response?.data?.detail || err.message || '删除记录失败。';
      setError(detail);
      return false;
    } finally {
      isLoading.value = false;
    }
  }

  async function batchDeleteAction(analysisIds) {
    isLoading.value = true;
    setError(null);
    try {
      const result = await analysisService.batchDeleteJobs(analysisIds);

      const deletedSet = new Set(analysisIds);
      historyList.value = historyList.value.filter(job => !deletedSet.has(job.analysisId));

      if (selectedJob.value && deletedSet.has(selectedJob.value.analysisId)) {
        selectedJob.value = null;
      }

      console.log('Batch delete result:', result);
      return result;
    } catch (err) {
      console.error('Batch delete action failed:', err);
      const detail = err.response?.data?.detail || err.message || '批量删除记录失败。';
      setError(detail);
      return null;
    } finally {
      isLoading.value = false;
    }
  }

  return {
    isLoading,
    error,
    historyList,
    selectedJob,
    availableModels,
    defaultModelName,
    currentModelName,
    modelsLoaded,
    modelsLoading,
    uploadFileAction,
    uploadFolderAction,
    fetchHistoryAction,
    fetchModelsAction,
    selectJobAction,
    setError,
    deleteJobAction,
    batchDeleteAction,
  };
});