import { defineStore } from 'pinia';
import { ref, reactive } from 'vue';
import { analysisService } from '@/services/analysisService'; // 导入分析服务

export const useAnalysisStore = defineStore('analysis', () => {
  const jobs = ref([]); // 存储用户本次会话提交的任务
  const isLoading = ref(false); // 标记文件上传或获取历史的状态
  const error = ref(null); // 存储操作中的错误信息
  const historyList = ref([]); // 存储从后端获取的完整历史记录
  /** @type {{analysisId: string, originalFilename: string, originalImageUrl: string, annotatedImageUrl: string, status: string, createdAt: string, batchId?: string} | null} */
  const selectedJob = ref(null); // 存储当前选中的历史记录对象

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
   * 上传图片文件进行分析
   * @param {File} file - 要上传的文件
   * @param {string} batchId - 批次ID，用于标识同一次上传的多个文件
   */
  async function uploadFileAction(file, batchId = null) {
    isLoading.value = true;
    setError(null); // 调用 action 清除错误
    try {
      const responseData = await analysisService.uploadFile(file, batchId); // 调用 service
      console.log('Upload successful, response:', responseData);

      if (responseData.analysis_id && responseData.original_filename) {
        // 上传成功后刷新历史列表
        await fetchHistoryAction();
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
      isLoading.value = false;
    }
  }

  /**
   * 批量上传文件夹进行分析
   * @param {FileList|Array} files - 文件夹中的文件列表
   */
  async function uploadFolderAction(files) {
    isLoading.value = true;
    setError(null);
    try {
      const responseData = await analysisService.uploadFolder(files);
      console.log('Folder upload successful, response:', responseData);

      // 上传成功后刷新历史列表
      await fetchHistoryAction();

      return responseData; // 返回响应数据
    } catch (err) {
      console.error('Folder upload action failed:', err.response?.data || err.message);
      const detail = err.response?.data?.detail || err.message || '上传文件夹失败。';
      setError(detail);
      return null;
    } finally {
      isLoading.value = false;
    }
  }

  /**
   * 获取分析历史记录
   */
  async function fetchHistoryAction() {
    isLoading.value = true;
    setError(null); // 调用 action 清除错误
    try {
      // 调用 service 获取历史数据
      const historyData = await analysisService.getHistory();
      // 更新 historyList 状态
      historyList.value = historyData;
      console.log('History updated in store:', historyList.value);
    } catch (err) {
      console.error('Fetch history action failed:', err);
      // error.value = '无法加载分析历史记录。'; // 不再直接修改
      setError('无法加载分析历史记录。'); // 调用 action 设置错误
      historyList.value = []; // 出错时清空列表
    } finally {
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

      // 从本地历史记录中移除已删除的记录
      const index = historyList.value.findIndex(job => job.analysisId === analysisId);
      if (index !== -1) {
        historyList.value.splice(index, 1);
      }

      // 如果当前选中的记录被删除，则清空选中状态
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

  return {
    // State
    jobs,
    isLoading,
    error,
    historyList,
    selectedJob,
    uiTriggers,
    // Actions
    uploadFileAction,
    uploadFolderAction,
    fetchHistoryAction,
    selectJobAction,
    setError,
    deleteJobAction,
    triggerSelectSingleFile,
    triggerSelectFolder,
    triggerUploadSingle,
    triggerUploadFolder,
  };
});