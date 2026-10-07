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

  // 当前页面在看哪一类记录：'stem'（茎秆）或 'leaf'（剑叶）。
  // 两类的指标口径完全不同，记录也必须分开显示——否则在茎秆页勾到剑叶记录，
  // 导出时会拿错列定义（后端会判定"无效的列选择"）。
  const historyGroup = ref(null);

  function setHistoryGroup(group) {
    const next = group || null;
    if (historyGroup.value === next) return;
    historyGroup.value = next;
    // 换了分类，上一条选中的记录已经不属于当前列表了
    selectedJob.value = null;
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

    let consecutiveErrors = 0;

    const pollOnce = async () => {
      try {
        await fetchHistoryAction(false);
        consecutiveErrors = 0;

        let targetJobs = historyList.value;
        if (batchId) {
          const filtered = historyList.value.filter(j => j.batchId === batchId);
          if (filtered.length > 0) targetJobs = filtered;
        }

        // 只有 completed / failed 才算跑完；queued（排队）和 processing（正在跑）
        // 都还在进行中，不能算成"已完成"。
        const completedCount = targetJobs.filter(j => j.status === 'completed' || j.status === 'failed').length;
        batchProgress.value.completed = completedCount;

        const effectiveTotal = Math.min(totalCount, targetJobs.length);
        const hasProcessingRemaining = targetJobs.some(j => j.status === 'processing');

        if (!hasProcessingRemaining && (targetJobs.length >= effectiveTotal || completedCount >= effectiveTotal)) {
          stopBatchProgressPolling();
          batchFinalHideTimer = setTimeout(() => {
            batchProgress.value.visible = false;
          }, 2000);
        }
      } catch (err) {
        consecutiveErrors++;
        console.error('Batch progress polling error:', err);

        if (consecutiveErrors >= 3) {
          console.warn('Batch progress polling failed 3 times, stopping to avoid infinite loop.');
          stopBatchProgressPolling();
          batchProgress.value.visible = false;
        }
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

    let consecutiveErrors = 0;

    const pollOnce = async () => {
      try {
        await fetchHistoryAction(false);
        consecutiveErrors = 0;

        let targetJobs = historyList.value;
        if (batchId) {
          const filtered = historyList.value.filter(j => j.batchId === batchId);
          if (filtered.length > 0) targetJobs = filtered;
        }

        // 只有 completed / failed 才算跑完；queued（排队）和 processing（正在跑）
        // 都还在进行中，不能算成"已完成"。
        const completedCount = targetJobs.filter(j => j.status === 'completed' || j.status === 'failed').length;
        batchProgress.value.completed = completedCount;

        const effectiveTotal = Math.min(totalCount, targetJobs.length);
        const hasProcessingRemaining = targetJobs.some(j => j.status === 'processing');

        if (!hasProcessingRemaining && (targetJobs.length >= effectiveTotal || completedCount >= effectiveTotal)) {
          stopBatchProgressPolling();
          batchFinalHideTimer = setTimeout(() => {
            batchProgress.value.visible = false;
          }, 2000);
        }
      } catch (err) {
        consecutiveErrors++;
        console.error('Batch progress polling error:', err);

        if (consecutiveErrors >= 3) {
          console.warn('Batch progress polling failed 3 times, stopping to avoid infinite loop.');
          stopBatchProgressPolling();
          batchProgress.value.visible = false;
        }
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
   * @param {string} [group] - 不传则跟随当前页面的分类（stem / leaf）
   */
  async function fetchModelsAction(group) {
    const targetGroup = group === undefined ? historyGroup.value : group;
    modelsLoading.value = true;
    try {
      const data = await analysisService.fetchModels(targetGroup);
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
   * 上传文件进行分析（单/多文件统一）
   * @param {File[]|FileList|File} files - 要上传的文件
   * @param {string} [modelName] - 选中的模型名称
   * @param {Function} [onProgress] - 上传进度回调
   * @param {string} [batchName] - 批次名称（可选）
   * @param {string} [batchId] - 批次 id（可选）：逐个上传多张单图时传同一个 id，
   *   后端复用它把这批图归为同一批次；不传则每张图各成一个批次
   * @param {boolean} [manageLoading=true] - 是否由本 action 管理全局 isLoading。
   *   调用方若自己包了 loading（如逐个上传的进度弹窗），传 false 避免中途被清掉。
   */
  async function uploadAnalysisAction(files, modelName = null, onProgress = null, batchName = null,
                                      batchId = null, manageLoading = true) {
    if (manageLoading) isLoading.value = true;
    setError(null);
    try {
      const responseData = await analysisService.uploadAnalysis(files, modelName, onProgress, batchName, batchId);
      console.log('Upload analysis successful, response:', responseData);

      // 用后端返回的 batch_id 登记批次名：历史记录里的 batchId 就是它。
      // （客户端自己生成的 id 会被后端映射成 uuid5，直接拿它登记会查不到名字）
      const responseBatchId = responseData?.batchId || responseData?.batch_id;
      if (responseBatchId && batchName) {
        setBatchName(responseBatchId, batchName);
      }

      await fetchHistoryAction(false);

      return responseData;
    } catch (err) {
      console.error('Upload analysis failed:', err.response?.data || err.message);
      const detail = err.response?.data?.detail || err.message || '上传文件失败。';
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
      const historyData = await analysisService.getHistory(historyGroup.value);
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

  function setCurrentModelName(name) {
    currentModelName.value = name;
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

  // 刷新后恢复批次进度浮层。type 就是当时上传的分析大类，顺便把历史过滤对齐，
  // 否则恢复出来的计数会把另一类的记录也算进去。
  // 只有已登录用户才恢复轮询，避免登录页/未登录状态发起无意义请求
  if (batchProgress.value.visible && batchProgress.value.total > 0 && batchProgress.value.completed < batchProgress.value.total) {
    const hasToken = !!localStorage.getItem('authToken');
    if (hasToken) {
      const { type, total, batchId, completed } = batchProgress.value;
      if (type === 'stem' || type === 'leaf') {
        historyGroup.value = type;
      }
      resumeBatchProgressPolling(type, total, batchId, completed);
    } else {
      // 未登录但有残留进度数据，说明上次是未登出就关了，清理掉
      console.warn('Found unfinished batch progress but user is not logged in, clearing stale progress.');
      localStorage.removeItem(BATCH_PROGRESS_STORAGE_KEY);
      batchProgress.value = { visible: false, type: '', batchId: null, total: 0, completed: 0 };
    }
  }

  return {
    isLoading,
    error,
    historyList,
    historyGroup,
    setHistoryGroup,
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
    uploadAnalysisAction,
    fetchHistoryAction,
    fetchModelsAction,
    selectJobAction,
    setCurrentModelName,
    setError,
    deleteJobAction,
    batchDeleteAction,
  };
});