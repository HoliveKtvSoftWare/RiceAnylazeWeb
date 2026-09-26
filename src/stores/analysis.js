import { defineStore } from 'pinia';
import { ref, computed, watch } from 'vue';
import { analysisService } from '@/services/analysisService';

const BATCH_NAME_STORAGE_KEY = 'rice_analysis_batch_names';
const BATCH_PROGRESS_STORAGE_KEY = 'rice_analysis_batch_progress';

function loadBatchNameMap() {
  try {
    const raw = localStorage.getItem(BATCH_NAME_STORAGE_KEY);
    if (raw) return JSON.parse(raw);
  } catch { /* localStorage unavailable */ }
  return {};
}

function saveBatchNameMap(map) {
  try {
    localStorage.setItem(BATCH_NAME_STORAGE_KEY, JSON.stringify(map));
  } catch { /* localStorage unavailable */ }
}

function loadBatchProgress() {
  try {
    const raw = localStorage.getItem(BATCH_PROGRESS_STORAGE_KEY);
    if (raw) return JSON.parse(raw);
  } catch { /* localStorage unavailable */ }
  return null;
}

function saveBatchProgress(progress) {
  try {
    if (progress && progress.visible) {
      localStorage.setItem(BATCH_PROGRESS_STORAGE_KEY, JSON.stringify(progress));
    } else {
      localStorage.removeItem(BATCH_PROGRESS_STORAGE_KEY);
    }
  } catch { /* localStorage unavailable */ }
}

export const useAnalysisStore = defineStore('analysis', () => {
  const isLoading = ref(false);
  const error = ref(null);
  const historyList = ref([]);
  /** @type {{analysisId: string, originalFilename: string, originalImageUrl: string, annotatedImageUrl: string, status: string, createdAt: string, batchId?: string} | null} */
  const selectedJob = ref(null);

  const batchNameMap = ref(loadBatchNameMap());

  function setBatchName(batchId, name) {
    if (!batchId || !name) return;
    batchNameMap.value[batchId] = name;
    saveBatchNameMap(batchNameMap.value);
  }

  function getBatchName(batchId) {
    if (!batchId) return null;
    return batchNameMap.value[batchId] || null;
  }

  /** @type {Array<{name: string, path: string}>} */
  const availableModels = ref([]);
  const defaultModelName = ref(null);
  const currentModelName = ref(null);
  const modelsLoaded = ref(false);
  const modelsLoading = ref(false);

  // 批次分割进度（全局浮层，跨页面保持）
  const savedProgress = loadBatchProgress();
  const batchProgress = ref(savedProgress || {
    visible: false,
    type: '',
    batchId: null,
    total: 0,
    completed: 0
  });
  let batchPollingInterval = null;
  let batchFinalHideTimer = null;

  watch(batchProgress, (val) => {
    saveBatchProgress(val);
  }, { deep: true });

  const batchProgressPercent = computed(() => {
    const total = batchProgress.value.total;
    const completed = batchProgress.value.completed;
    if (!total || total <= 0) return 0;
    return Math.min(100, Math.round((completed / total) * 1000) / 10);
  });

  function stopBatchProgressPolling() {
    if (batchPollingInterval) {
      clearInterval(batchPollingInterval);
      batchPollingInterval = null;
    }
    if (batchFinalHideTimer) {
      clearTimeout(batchFinalHideTimer);
      batchFinalHideTimer = null;
    }
  }

  function startBatchProgressPolling(type, totalCount, batchId = null) {
    stopBatchProgressPolling();

    batchProgress.value = {
      visible: true,
      type: type,
      batchId: batchId,
      total: totalCount,
      completed: 0
    };

    const pollOnce = async () => {
      try {
        await fetchHistoryAction(false);

        let targetJobs = historyList.value;
        if (batchId) {
          const filtered = historyList.value.filter(j => j.batchId === batchId);
          if (filtered.length > 0) targetJobs = filtered;
        }

        const completedCount = targetJobs.filter(j => j.status !== 'processing').length;
        batchProgress.value.completed = completedCount;

        if (completedCount >= totalCount) {
          stopBatchProgressPolling();
          batchFinalHideTimer = setTimeout(() => {
            batchProgress.value.visible = false;
          }, 2000);
        }
      } catch (err) {
        console.error('Batch progress polling error:', err);
      }
    };

    pollOnce();
    batchPollingInterval = setInterval(pollOnce, 2000);
  }

  function resumeBatchProgressPolling(type, totalCount, batchId, currentCompleted) {
    stopBatchProgressPolling();

    batchProgress.value = {
      visible: true,
      type: type,
      batchId: batchId,
      total: totalCount,
      completed: currentCompleted
    };

    const pollOnce = async () => {
      try {
        await fetchHistoryAction(false);

        let targetJobs = historyList.value;
        if (batchId) {
          const filtered = historyList.value.filter(j => j.batchId === batchId);
          if (filtered.length > 0) targetJobs = filtered;
        }

        const completedCount = targetJobs.filter(j => j.status !== 'processing').length;
        batchProgress.value.completed = completedCount;

        if (completedCount >= totalCount) {
          stopBatchProgressPolling();
          batchFinalHideTimer = setTimeout(() => {
            batchProgress.value.visible = false;
          }, 2000);
        }
      } catch (err) {
        console.error('Batch progress polling error:', err);
      }
    };

    pollOnce();
    batchPollingInterval = setInterval(pollOnce, 2000);
  }

  function clearBatchProgress() {
    stopBatchProgressPolling();
    batchProgress.value = { visible: false, type: '', batchId: null, total: 0, completed: 0 };
  }

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
  async function uploadFileAction(file, batchId = null, modelName = null, onProgress = null, manageLoading = true, batchName = null) {
    if (manageLoading) isLoading.value = true;
    setError(null);
    try {
      const responseData = await analysisService.uploadFile(file, batchId, modelName, onProgress, batchName);
      console.log('Upload successful, response:', responseData);

      if (responseData.analysisId && responseData.originalFilename) {
        if (batchId && batchName) {
          setBatchName(batchId, batchName);
        }
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
  async function uploadFolderAction(files, modelName = null, onProgress = null, manageLoading = true, batchName = null) {
    if (manageLoading) isLoading.value = true;
    setError(null);
    try {
      const responseData = await analysisService.uploadFolder(files, modelName, onProgress, batchName);
      console.log('Folder upload successful, response:', responseData);

      const responseBatchId = responseData?.batchId || responseData?.batch_id;
      if (responseBatchId && batchName) {
        setBatchName(responseBatchId, batchName);
      }

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

  // 刷新后恢复批次进度浮层
  if (batchProgress.value.visible && batchProgress.value.total > 0 && batchProgress.value.completed < batchProgress.value.total) {
    const { type, total, batchId, completed } = batchProgress.value;
    resumeBatchProgressPolling(type, total, batchId, completed);
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
    batchProgress,
    batchProgressPercent,
    batchNameMap,
    setBatchName,
    getBatchName,
    startBatchProgressPolling,
    clearBatchProgress,
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