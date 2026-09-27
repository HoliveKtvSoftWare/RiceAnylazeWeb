import { defineStore } from 'pinia';
import { ref, reactive } from 'vue';
import { analysisService } from '@/services/analysisService'; // 导入分析服务
import { syncSelectedJob, processingJobIds } from '@/utils/analysisStatus';

// 轮询间隔：与后端状态更新的实际节奏一致（一次推理 5~10 s）
const POLL_INTERVAL_MS = 2000;
// 上传批次进行中时，用总轮数而不是轮询间隔来退避：
//   1) 多文件上传时 store 的 isLoading 会被反复翻转、历史也会被反复重取；
//   2) 轮询刷新列表的同时还在传文件，会让界面元素（按钮可达性、列表内容）抖动。
// 上传一般很快就结束，所以这里只是让轮询"等一等"，不丢任务。
const POLL_UPLOAD_BACKOFF_TICKS = 5;
let uploadInProgress = false;
let uploadBackoffTicks = 0;

export const useAnalysisStore = defineStore('analysis', () => {
  const jobs = ref([]); // 存储用户本次会话提交的任务
  const isLoading = ref(false); // 标记文件上传或获取历史的状态
  const error = ref(null); // 存储操作中的错误信息
  const historyList = ref([]); // 存储从后端获取的完整历史记录
  /** @type {{analysisId: string, originalFilename: string, originalImageUrl: string, annotatedImageUrl: string, status: string, createdAt: string, batchId?: string, taskType?: string} | null} */
  const selectedJob = ref(null); // 存储当前选中的历史记录对象
  const taskTypes = ref([]); // 后端支持的分析类型列表 [{ key, name, model, group }]
  const historyTaskType = ref(''); // 历史列表当前的分析类型过滤（'' 表示全部）
  // 历史数据的**分域**：'' = 全部（主页用）；'stem' / 'leaf' = 只取该大类（两个分析页用）。
  // 过滤发生在后端（/api/analysis/history?group=...），因此不在本类的记录根本不会回到前端。
  const historyGroup = ref('');
  // 主页统计（总览计数 / 近 N 天趋势 / 平均耗时），由 /api/analysis/stats 提供
  const stats = ref(null);
  // 历史是否已成功加载过至少一次。
  // 用它区分"首次加载"与"后台刷新"：轮询每 2 秒刷新一次历史，若界面上的
  // "正在加载…"提示直接绑 isLoading，就会每 2 秒闪一次。
  const historyLoadedOnce = ref(false);

  const uiTriggers = reactive({
    selectSingleFile: 0,
    selectFolder: 0,
    uploadSingle: 0,
    uploadFolder: 0,
  });

  function triggerSelectSingleFile() { uiTriggers.selectSingleFile++; }
  function triggerSelectFolder() { uiTriggers.selectFolder++; }
  function triggerUploadSingle() { uiTriggers.uploadSingle++; }
  function triggerUploadFolder() { uiTriggers.uploadFolder++; }

  /**
   * 设置/清除错误信息
   */
  function setError(message) {
    // 这个 action 负责所有对 error状态的修改
    error.value = message;
  }

  /**
   * 获取后端支持的分析类型列表
   * @returns {Promise<Array<object>|null>} 分析类型列表，失败时返回 null
   */
  async function fetchTaskTypes() {
    try {
      const data = await analysisService.getTasks();
      taskTypes.value = Array.isArray(data?.tasks) ? data.tasks : [];
      console.log('Task types updated in store:', taskTypes.value);
      return taskTypes.value;
    } catch (err) {
      console.error('Fetch tasks action failed:', err.response?.data || err.message);
      // 分析类型属于必要配置，失败时给出可见提示（保留列表为空，由页面回退到默认类型）
      setError(err.response?.data?.detail || '无法加载分析类型列表。');
      taskTypes.value = [];
      return null;
    }
  }

  /**
   * 上传图片文件进行分析
   * @param {File} file - 要上传的文件
   * @param {string} batchId - 批次ID，用于标识同一次上传的多个文件
   * @param {string} [taskType] - 分析类型（stem/leaf），不传时后端默认 stem
   */
  async function uploadFileAction(file, batchId = null, taskType = null, onUploadProgress = null) {
    isLoading.value = true;
    setError(null); // 调用 action 清除错误
    uploadInProgress = true;
    try {
      const responseData = await analysisService.uploadFile(file, batchId, taskType, onUploadProgress); // 调用 service
      console.log('Upload successful, response:', responseData);

      if (responseData.analysisId && responseData.originalFilename) {
        // 上传成功后刷新历史列表（沿用当前的分域与类型过滤条件）
        await fetchHistoryAction(historyTaskType.value);
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
      uploadInProgress = false;
      isLoading.value = false;
    }
  }

  /**
   * 批量上传文件夹进行分析
   * @param {FileList|Array} files - 文件夹中的文件列表
   * @param {string} [taskType] - 分析类型（stem/leaf），不传时后端默认 stem
   */
  async function uploadFolderAction(files, taskType = null, onUploadProgress = null) {
    isLoading.value = true;
    setError(null);
    uploadInProgress = true;
    try {
      const responseData = await analysisService.uploadFolder(files, taskType, onUploadProgress);
      console.log('Folder upload successful, response:', responseData);

      // 上传成功后刷新历史列表（沿用当前的历史过滤条件）
      await fetchHistoryAction(historyTaskType.value);

      return responseData; // 返回响应数据
    } catch (err) {
      console.error('Folder upload action failed:', err.response?.data || err.message);
      const detail = err.response?.data?.detail || err.message || '上传文件夹失败。';
      setError(detail);
      return null;
    } finally {
      uploadInProgress = false;
      isLoading.value = false;
    }
  }

  /**
   * 获取分析历史记录
   * @param {string} [taskType] - 可选的分析类型过滤（如 leaf_our），不传时只用分域过滤
   * @param {string} [group] - 可选的分域（stem/leaf）；不传时沿用当前 historyGroup，
   *                           显式传 '' 表示要全量（主页的近期记录用）
   */
  async function fetchHistoryAction(taskType = '', group = undefined) {
    isLoading.value = true;
    setError(null); // 调用 action 清除错误
    historyTaskType.value = taskType || ''; // 记录当前过滤条件，供上传后刷新复用
    if (group !== undefined) historyGroup.value = group || '';
    try {
      // 调用 service 获取历史数据（分域由后端完成）
      const historyData = await analysisService.getHistory(taskType || null, historyGroup.value || null);
      // 更新 historyList 状态
      historyList.value = historyData;
      // 历史刷新会返回新对象，按 ID 原地同步详情面板，避免状态停留在旧的“处理中”。
      syncSelectedJob(historyData, selectedJob.value);
      console.log('History updated in store:', historyList.value);
    } catch (err) {
      console.error('Fetch history action failed:', err);
      // error.value = '无法加载分析历史记录。'; // 不再直接修改
      setError('无法加载分析历史记录。'); // 调用 action 设置错误
      historyList.value = []; // 出错时清空列表
    } finally {
      historyLoadedOnce.value = true;
      isLoading.value = false;
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

  // ------------------------------------------------------------------
  // 未完成任务的状态轮询
  //
  // 放在 store 里而不是各页面组件里，原因有两个：
  //   1) 主页与两个分析页都要跟踪任务，各起一份定时器会互相打断；
  //   2) 上传大文件后立刻切页时，轮询不会因为组件卸载而中断。
  // 同一时刻只会有一个定时器（startPolling 会先停掉上一个）。
  // ------------------------------------------------------------------
  let pollTimer = null;
  let pollInFlight = false;
  let pollRunId = 0;
  // 已经进入"未完成"集合的任务，用于识别本轮变动的任务
  let seenRunningIds = new Set();

  /**
   * 开始轮询未完成的任务
   * @param {object} [options]
   * @param {string} [options.group] - 只取该大类的历史（'' = 全量，主页用）
   * @param {(record: object) => void} [options.onSettled] - 任务变为 completed/failed 时回调
   * @returns {boolean} 是否真的启动了轮询
   */
  function startPolling(options = {}) {
    const { group = historyGroup.value || '', onSettled = null } = options || {};
    stopPolling();
    // 新的一轮轮询开始时重置上传退避计数
    uploadBackoffTicks = 0;
    if (processingJobIds(historyList.value).length === 0) return false;

    const runId = pollRunId;
    seenRunningIds = new Set(processingJobIds(historyList.value));

    const tick = async () => {
      if (runId !== pollRunId) return;
      // 上传批次进行中：本轮不取数，直接等下一轮，避免与上传刷新抢 isLoading / 抢列表
      if (uploadInProgress) {
        uploadBackoffTicks += 1;
        if (uploadBackoffTicks <= POLL_UPLOAD_BACKOFF_TICKS) {
          pollTimer = setTimeout(tick, POLL_INTERVAL_MS);
          return;
        }
        // 退避到上限说明上传异常地久，恢复轮询，避免状态永久停在旧值
        uploadBackoffTicks = 0;
      }
      if (pollInFlight) return;
      pollInFlight = true;
      try {
        // 按该页面的大类取数（后端分域），同时刷新全部未完成任务的状态
        await fetchHistoryAction('', group);
        if (runId !== pollRunId) return;

        const runningNow = processingJobIds(historyList.value);
        const settled = historyList.value.filter(
          (job) => seenRunningIds.has(job.analysisId) && !runningNow.includes(job.analysisId),
        );
        seenRunningIds = new Set(runningNow);

        if (onSettled) {
          settled.forEach((job) => {
            try {
              onSettled(job);
            } catch (err) {
              console.error('轮询回调执行失败:', err);
            }
          });
        }

        if (runningNow.length === 0) {
          stopPolling();
          return;
        }
      } catch (err) {
        // 单次刷新失败时保留轮询，让下一次请求恢复，不把详情错误地标成失败。
        console.warn('分析状态轮询失败，将在下一轮重试:', err);
      } finally {
        pollInFlight = false;
        if (runId === pollRunId && processingJobIds(historyList.value).length > 0) {
          pollTimer = setTimeout(tick, POLL_INTERVAL_MS);
        }
      }
    };

    pollTimer = setTimeout(tick, POLL_INTERVAL_MS);
    void tick();
    return true;
  }

  function stopPolling() {
    if (pollTimer) clearTimeout(pollTimer);
    pollTimer = null;
    pollRunId += 1;
    pollInFlight = false;
  }

  function isPolling() {
    return pollTimer !== null;
  }

  /**
   * 是否处于"首次加载历史"状态（用于显示加载提示）。
   * 后台轮询刷新不算：否则提示会每 2 秒闪一次。
   */
  function isInitialHistoryLoading() {
    return isLoading.value && !historyLoadedOnce.value;
  }

  /**
   * 获取主页统计（总览计数 / 近 N 天趋势 / 平均耗时）
   * @param {number} [days] - 趋势窗口天数
   */
  async function fetchStatsAction(days = 7) {
    try {
      stats.value = await analysisService.getStats(days);
      return stats.value;
    } catch (err) {
      console.error('Fetch stats action failed:', err);
      // 统计失败不阻塞主页（还有近期记录列表可看），因此只记录、不设置全局错误
      stats.value = null;
      return null;
    }
  }

  return {
    jobs,
    isLoading,
    error,
    historyList,
    selectedJob,
    taskTypes,
    historyTaskType,
    historyGroup,
    stats,
    historyLoadedOnce,
    uiTriggers,
    fetchTaskTypes,
    uploadFileAction,
    uploadFolderAction,
    fetchHistoryAction,
    selectJobAction,
    setError,
    deleteJobAction,
    batchDeleteAction,
    startPolling,
    stopPolling,
    isPolling,
    isInitialHistoryLoading,
    fetchStatsAction,
    triggerSelectSingleFile,
    triggerSelectFolder,
    triggerUploadSingle,
    triggerUploadFolder,
  };
});
