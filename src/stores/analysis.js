import { defineStore } from 'pinia';
import { ref } from 'vue';
import { analysisService } from '@/services/analysisService'; // 导入分析服务

export const useAnalysisStore = defineStore('analysis', () => {
  // --- State ---
  const jobs = ref([]); // (可选) 存储用户本次会话提交的任务
  const isLoading = ref(false); // 标记文件上传或获取历史的状态
  const error = ref(null); // 存储操作中的错误信息
  const historyList = ref([]); // 存储从后端获取的完整历史记录
  const selectedJob = ref(null); // 存储当前选中的历史记录对象

  // --- 新增 Action: 设置/清除错误信息 ---
  function setError(message) {
    // 这个 action 负责所有对 error状态的修改
    error.value = message;
  }
  // --- 结束新增 ---

  // --- Actions ---
  async function uploadFileAction(file) {
    isLoading.value = true;
    setError(null); // 调用 action 清除错误
    try {
      const responseData = await analysisService.uploadFile(file); // 调用 service
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
   * @param {string} analysisId - 要删除的分析记录ID
   * @returns {Promise<boolean>} 删除操作是否成功
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

  /**
   * 下载单个分析任务的Excel报告
   * @param {string} analysisId - 分析任务ID
   * @param {Array<string>} selectedColumns - 选定的列数组
   * @returns {Promise<boolean>} 下载操作是否成功
   */
  async function downloadSingleExcelAction(analysisId, selectedColumns) {
    isLoading.value = true;
    setError(null);
    try {
      const response = await analysisService.exportSingleToExcel(analysisId, selectedColumns);

      // 处理Excel文件下载
      if (response.filename && response.content) {
        // 将base64内容转换为blob
        const byteCharacters = atob(response.content);
        const byteNumbers = new Array(byteCharacters.length);
        for (let i = 0; i < byteCharacters.length; i++) {
          byteNumbers[i] = byteCharacters.charCodeAt(i);
        }
        const byteArray = new Uint8Array(byteNumbers);
        const blob = new Blob([byteArray], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });

        // 创建下载链接
        const url = window.URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = response.filename;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        window.URL.revokeObjectURL(url);

        console.log(`Excel file downloaded: ${response.filename}`);
        return true;
      } else {
        setError('Excel文件数据格式错误');
        return false;
      }
    } catch (err) {
      console.error('Download single Excel action failed:', err);
      const detail = err.response?.data?.detail || err.message || '下载Excel报告失败。';
      setError(detail);
      return false;
    } finally {
      isLoading.value = false;
    }
  }

  /**
   * 下载所有分析记录的Excel总表
   * @param {Array<string>} selectedColumns - 选定的列数组
   * @returns {Promise<boolean>} 下载操作是否成功
   */
  async function downloadExcelSummaryAction(selectedColumns) {
    isLoading.value = true;
    setError(null);
    try {
      const response = await analysisService.exportAllToExcel(selectedColumns);

      // 处理Excel文件下载
      if (response.filename && response.content) {
        // 将base64内容转换为blob
        const byteCharacters = atob(response.content);
        const byteNumbers = new Array(byteCharacters.length);
        for (let i = 0; i < byteCharacters.length; i++) {
          byteNumbers[i] = byteCharacters.charCodeAt(i);
        }
        const byteArray = new Uint8Array(byteNumbers);
        const blob = new Blob([byteArray], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });

        // 创建下载链接
        const url = window.URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = response.filename;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        window.URL.revokeObjectURL(url);

        console.log(`Excel summary file downloaded: ${response.filename}`);
        return true;
      } else {
        setError('Excel总表数据格式错误');
        return false;
      }
    } catch (err) {
      console.error('Download Excel summary action failed:', err);
      const detail = err.response?.data?.detail || err.message || '下载Excel总表失败。';
      setError(detail);
      return false;
    } finally {
      isLoading.value = false;
    }
  }

  // --- 返回 store 的公共接口 ---
  return {
    // State
    jobs,
    isLoading,
    error,
    historyList,
    selectedJob,
    // Actions
    uploadFileAction,
    fetchHistoryAction,
    selectJobAction,
    setError,
    deleteJobAction,
    downloadSingleExcelAction,
    downloadExcelSummaryAction,
  };
});
