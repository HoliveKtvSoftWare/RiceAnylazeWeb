<template>
  <div class="dashboard-view">
    <main class="dashboard-content">

      <!-- 上部操作面板 -->
      <section class="">
        <h3>上传图片进行分割</h3>
        <div class="upload-controls">
          <label class="file-input-label">
            <input type="file" @change="handleFileSelect" accept="image/*" :disabled="analysisStore.isLoading" ref="fileInput" multiple />
            <span>🖼️选择单张图片</span>
          </label>

          <label class="folder-input-label">
            <input type="file" @change="handleFolderSelect" :webkitdirectory="true" :mozdirectory="true" :directory="true" accept="image/*" :disabled="analysisStore.isLoading" ref="folderInput" />
            <span>📁选择文件夹</span>
          </label>

          <div class="model-select">
            <label for="model-choice">选择模型:</label>
            <select id="model-choice" v-model="selectedModel" :disabled="analysisStore.isLoading">
              <option value="yolov8s.pt">YOLOv8s</option>
              <option value="yolov8s-1.pt">YOLOv8s-1</option>
            </select>
          </div>

          <button @click="handleFileUpload" :disabled="selectedFiles.length === 0 || analysisStore.isLoading" class="primary upload-button">
            {{ analysisStore.isLoading ? '处理中...' : '上传单张并分割' }}
          </button>

          <button @click="handleFolderUpload" :disabled="selectedFolderFiles.length === 0 || analysisStore.isLoading" class="primary folder-upload-button">
            {{ analysisStore.isLoading ? '处理中...' : '上传文件夹并分割' }}
          </button>

          <div v-if="uploadSuccessMessage" class="success-message inline">
            {{ uploadSuccessMessage }}
          </div>
        </div>

        <div v-if="analysisStore.isLoading && !uploadSuccessMessage" class="loading-indicator">
          正在上传或加载历史...
        </div>
        <div v-if="analysisStore.error" class="error-message">
          操作失败: {{ analysisStore.error }}
        </div>
      </section>

      <!-- 分割内容显示区域 -->
      <div class="main-area">
        <section class="detail-section card" v-if="analysisStore.selectedJob">
          <h3>分割详情: {{ analysisStore.selectedJob.originalFilename }}</h3>
          <div class="image-comparison">
            <div class="image-container">
              <h4>原始图片</h4>
              <img
                  v-if="analysisStore.selectedJob.originalImageUrl"
                  :src="analysisStore.selectedJob.originalImageUrl"
                  alt="原始图片"
                  @load="imageLoaded('original')"
                  @error="handleImageError('original')"
                  @mouseenter="handleMouseEnter('original')"
                  @mouseleave="handleMouseLeave('original')"
                  @wheel="handleWheel('original', $event)"
                  @mousedown="handleMouseDown('original', $event)"
                  :style="{
                  transform: `scale(${imageState.original.scale}) translate(${imageState.original.position.x}px, ${imageState.original.position.y}px)`,
                  cursor: imageState.original.isDragging ? 'grabbing' : (imageState.original.scale > 1 ? 'grab' : 'zoom-in')
                }"
                  :class="{
                  loading: !imageStatus.original.loaded && !imageStatus.original.error,
                  dragging: imageState.original.isDragging
                }"
              />
              <div v-if="imageState.original.scale !== 1 || imageState.original.position.x !== 0 || imageState.original.position.y !== 0" class="scale-indicator">
                <span>缩放: {{ (imageState.original.scale * 100).toFixed(0) }}%</span>
                <button @click="resetScale('original')" class="reset-button">重置</button>
              </div>
              <p v-if="imageStatus.original.error" class="error-message image-error">无法加载原始图片</p>
              <p v-else-if="!analysisStore.selectedJob.originalImageUrl">无原始图片记录</p>
            </div>
            <div class="image-container">
              <h4>标注图片</h4>
              <img
                  v-if="analysisStore.selectedJob.annotatedImageUrl && analysisStore.selectedJob.status === 'completed'"
                  :src="analysisStore.selectedJob.annotatedImageUrl"
                  alt="标注图片"
                  @load="imageLoaded('annotated')"
                  @error="handleImageError('annotated')"
                  @mouseenter="handleMouseEnter('annotated')"
                  @mouseleave="handleMouseLeave('annotated')"
                  @wheel="handleWheel('annotated', $event)"
                  @mousedown="handleMouseDown('annotated', $event)"
                  :style="{
                  transform: `scale(${imageState.annotated.scale}) translate(${imageState.annotated.position.x}px, ${imageState.annotated.position.y}px)`,
                  cursor: imageState.annotated.isDragging ? 'grabbing' : (imageState.annotated.scale > 1 ? 'grab' : 'zoom-in')
                }"
                  :class="{
                  loading: !imageStatus.annotated.loaded && !imageStatus.annotated.error,
                  dragging: imageState.annotated.isDragging
                }"
              />
              <div v-if="imageState.annotated.scale !== 1 || imageState.annotated.position.x !== 0 || imageState.annotated.position.y !== 0" class="scale-indicator">
                <span>缩放: {{ (imageState.annotated.scale * 100).toFixed(0) }}%</span>
                <button @click="resetScale('annotated')" class="reset-button">重置</button>
              </div>
              <p v-if="analysisStore.selectedJob.status === 'processing'" class="status-processing">处理中...</p>
              <p v-else-if="analysisStore.selectedJob.status === 'failed'" class="status-failed error-message">分析失败</p>
              <p v-else-if="analysisStore.selectedJob.status === 'completed' && !analysisStore.selectedJob.annotatedImageUrl" class="error-message image-error">标注图片URL为空</p>
              <p v-else-if="!(analysisStore.selectedJob.status!=='completed'||analysisStore.selectedJob.annotatedImageUrl)" class="status-completed">分析完成</p>
              <p v-else-if="imageStatus.annotated.error" class="error-message image-error">无法加载标注图片</p>
              <p v-else-if="analysisStore.selectedJob.status !== 'completed' && !analysisStore.selectedJob.annotatedImageUrl">暂无标注图片</p>
            </div>
          </div>
          <div class="job-details">
            <p><strong>提交时间:</strong> {{ formatDate(analysisStore.selectedJob.createdAt) }}</p>
            <p><strong>状态:</strong>
              <span class="status-tag" :class="`status-${analysisStore.selectedJob.status}`">
                       {{ translateStatus(analysisStore.selectedJob.status) }}
              </span>
            </p>
            <div class="result-links">
              <a v-if="analysisStore.selectedJob.resultJsonUrl && analysisStore.selectedJob.status === 'completed'" :href="analysisStore.selectedJob.resultJsonUrl" target="_blank" download class="download-button json">下载 JSON 结果</a>
              <button v-if="analysisStore.selectedJob.status === 'completed'" @click="openSingleDownloadDialog" class="download-button excel">下载 Excel 报告</button>
              <span v-if="analysisStore.selectedJob.status !== 'completed' && analysisStore.selectedJob.resultJsonUrl" class="disabled-links-note">(结果将在任务完成后可下载)</span>
            </div>
          </div>
        </section>
        <section class="detail-section card placeholder" v-else>
          <p>请从右侧列表中选择一个分割记录以查看详情。</p>
        </section>

        <aside class="job-list-section card">
          <div class="section-header">
            <h3>分割记录</h3>
            <div class="section-actions">
              <button @click="openDownloadDialog" :disabled="analysisStore.isLoading || analysisStore.historyList.length === 0" class="download-summary-button">
                {{ analysisStore.isLoading ? '处理中...' : '下载Excel总表' }}
              </button>
            </div>
          </div>
          <ul v-if="groupedHistory.length > 0" class="job-list">
            <template v-for="group in groupedHistory" :key="group.batchId">
              <!-- 批次组标题 -->
              <li
                  class="batch-item"
                  :class="{
                    'expanded': isBatchExpanded(group.batchId),
                    'selected': !group.hasFolder && analysisStore.selectedJob?.analysisId === group.jobs[0]?.analysisId
                  }"
                  @click="handleBatchClick(group)"
              >
                <div class="batch-header">
                  <span class="batch-icon">
                    <span v-if="group.hasFolder" class="folder-icon">📁</span>
                    <span v-else class="file-icon">🖼️</span>
                  </span>
                  <span class="batch-label">
                    <template v-if="group.hasFolder">
                      文件夹 ({{ group.jobs.length }} 个文件)
                    </template>
                    <template v-else>
                      {{ group.jobs[0]?.originalFilename }}
                    </template>
                  </span>
                  <span class="batch-timestamp">{{ formatDate(group.createdAt) }}</span>
                  <span class="expand-icon" v-if="group.hasFolder">{{ isBatchExpanded(group.batchId) ? '▼' : '▶' }}</span>
                  <span v-if="!group.hasFolder" class="status-indicator" :class="`status-${group.jobs[0]?.status}`" :title="translateStatus(group.jobs[0]?.status)"></span>
                  <button
                      v-if="!group.hasFolder"
                      @click.stop="deleteJob(group.jobs[0].analysisId, group.jobs[0].originalFilename)"
                      :disabled="analysisStore.isLoading"
                      class="delete-button"
                      title="删除记录"
                  >
                    ×
                  </button>
                </div>

                <!-- 展开的文件列表（仅当是文件夹且展开时显示） -->
                <ul v-if="group.hasFolder && isBatchExpanded(group.batchId)" class="batch-content">
                  <li
                      v-for="job in group.jobs"
                      :key="job.analysisId"
                      class="job-item nested"
                      :class="{ 'selected': analysisStore.selectedJob?.analysisId === job.analysisId }"
                  >
                    <div class="job-info" @click.stop="selectJob(job)">
                      <span class="filename">{{ job.originalFilename }}</span>
                      <span class="status-indicator" :class="`status-${job.status}`" :title="translateStatus(job.status)"></span>
                    </div>
                    <button
                        @click.stop="deleteJob(job.analysisId, job.originalFilename)"
                        :disabled="analysisStore.isLoading"
                        class="delete-button"
                        title="删除记录"
                    >
                      ×
                    </button>
                  </li>
                </ul>
              </li>
            </template>
          </ul>
          <p v-else-if="analysisStore.isLoading">正在加载历史记录...</p>
          <p v-else class="no-jobs-message">暂无分析记录。</p>
        </aside>
      </div>

    </main>

    <!-- Excel下载数据项选择弹窗 -->
    <SelectColumns
        :visible="showDownloadDialog"
        :download-type="currentDownloadType"
        :job="analysisStore.selectedJob"
        @close="closeDownloadDialog"
        @download="handleExcelDownload"
    />

  </div>
</template>


<script setup>
import { ref, onMounted, reactive, watch, computed } from 'vue';
import { useAnalysisStore } from '@/stores/analysis';
import { useExcelStore } from '@/stores/excel';
import SelectColumns from '@/components/SelectColumns.vue';

const analysisStore = useAnalysisStore();
const excelStore = useExcelStore();
ref(null);
// Excel下载弹窗相关状态
const showDownloadDialog = ref(false);
const currentDownloadType = ref('summary'); // 'summary' 或 'single'

// 记录已刷新过的任务ID，避免重复刷新
const refreshedJobs = ref(new Set());

// 当前展开的批次ID
const expandedBatchIds = ref(new Set());

// 生成批次ID
const generateBatchId = () => {
  return 'batch_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
};

// 当前上传批次ID
const currentBatchId = ref(null);

// 按批次分组的历史记录
const groupedHistory = computed(() => {
  const groups = {};
  analysisStore.historyList.forEach(job => {
    // 如果有批次ID则使用批次ID，否则使用时间戳作为临时批次
    const batchId = job.batchId || Math.floor(new Date(job.createdAt).getTime() / 5000).toString();
    if (!groups[batchId]) {
      groups[batchId] = {
        batchId: batchId,
        jobs: [],
        createdAt: job.createdAt,
        hasFolder: false
      };
    }
    groups[batchId].jobs.push(job);
    // 如果一个批次有多个任务，标记为文件夹
    if (groups[batchId].jobs.length > 1) {
      groups[batchId].hasFolder = true;
    }
  });

  // 按创建时间倒序排列
  return Object.values(groups).sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
});

// 切换批次展开状态
const toggleBatch = (batchId) => {
  if (expandedBatchIds.value.has(batchId)) {
    expandedBatchIds.value.delete(batchId);
  } else {
    expandedBatchIds.value.add(batchId);
  }
};

// 判断批次是否展开
const isBatchExpanded = (batchId) => {
  return expandedBatchIds.value.has(batchId);
};

// 处理批次点击
const handleBatchClick = (group) => {
  if (group.hasFolder) {
    // 如果是文件夹，切换展开状态
    toggleBatch(group.batchId);
  } else {
    // 如果是单文件，直接选中任务
    selectJob(group.jobs[0]);
  }
};

// 显示总表下载弹窗
const openDownloadDialog = () => {
  currentDownloadType.value = 'summary';
  showDownloadDialog.value = true;
};

// 显示单个任务下载弹窗
const openSingleDownloadDialog = () => {
  if (!analysisStore.selectedJob) {
    analysisStore.setError('请先选择一个任务');
    return;
  }
  currentDownloadType.value = 'single';
  showDownloadDialog.value = true;
};

// 关闭弹窗
const closeDownloadDialog = () => {
  showDownloadDialog.value = false;
  currentDownloadType.value = 'summary';
};

// 处理Excel下载
const handleExcelDownload = async (downloadData) => {
  if (downloadData.type === 'summary') {
    // 下载总表
    const success = await excelStore.downloadExcelSummaryAction(downloadData.columns);
    if (success) {
      console.log('Excel summary download initiated with selected columns:', downloadData.columns);
    }
  } else if (downloadData.type === 'single') {
    // 下载单个任务报告
    const success = await excelStore.downloadSingleExcelAction(analysisStore.selectedJob.analysisId, downloadData.columns);
    if (success) {
      console.log('Single Excel report download initiated with selected columns:', downloadData.columns);
    }
  }
};
const uploadSuccessMessage = ref('');
const fileInput = ref(null);
const imageStatus = reactive({
  original: { loaded: false, error: false },
  annotated: { loaded: false, error: false },
});

// 图片缩放和拖拽状态
const imageState = reactive({
  original: {
    scale: 1,
    isHovering: false,
    isDragging: false,
    position: { x: 0, y: 0 },
    dragStart: { x: 0, y: 0 }
  },
  annotated: {
    scale: 1,
    isHovering: false,
    isDragging: false,
    position: { x: 0, y: 0 },
    dragStart: { x: 0, y: 0 }
  },
});

const selectedModel = ref('yolov8s.pt'); // <-- 模型选择状态

// 监听选中任务变化，重置图片状态
watch(() => analysisStore.selectedJob, (newJob) => {
  if (newJob) {
    // 保留图片加载状态，只重置缩放和拖拽状态
    // 这样可以避免图片加载完成后再次显示为灰色
    imageState.original = {
      scale: 1,
      isHovering: false,
      isDragging: false,
      position: { x: 0, y: 0 },
      dragStart: { x: 0, y: 0 }
    };
    imageState.annotated = {
      scale: 1,
      isHovering: false,
      isDragging: false,
      position: { x: 0, y: 0 },
      dragStart: { x: 0, y: 0 }
    };
    console.log("Selected job changed, resetting scale and position.");
  }
});

// 组件挂载时获取历史
onMounted(() => {
  analysisStore.fetchHistoryAction();
});

// 处理文件选择（支持单文件和多文件选择）
const selectedFiles = ref([]);
const selectedFolderFiles = ref([]);
const folderInput = ref(null);

const handleFileSelect = (event) => {
  const files = Array.from(event.target.files).filter(file => file.type.startsWith('image/'));
  if (files.length > 0) {
    selectedFiles.value = files;
    uploadSuccessMessage.value = '';
    analysisStore.setError(null);
  } else {
    selectedFiles.value = [];
  }
};

// 处理文件夹选择
const handleFolderSelect = (event) => {
  const files = Array.from(event.target.files).filter(file => file.type.startsWith('image/'));
  if (files.length > 0) {
    selectedFolderFiles.value = files;
    uploadSuccessMessage.value = '';
    analysisStore.setError(null);
  } else {
    selectedFolderFiles.value = [];
  }
};

// 处理文件夹上传
const handleFolderUpload = async () => {
  if (selectedFolderFiles.value.length === 0) {
    analysisStore.setError('请先选择文件夹！');
    return;
  }
  uploadSuccessMessage.value = '';

  console.log(`上传文件夹，共 ${selectedFolderFiles.value.length} 个文件`);
  const response = await analysisStore.uploadFolderAction(selectedFolderFiles.value);

  if (response) {
    uploadSuccessMessage.value = `已成功提交 ${selectedFolderFiles.value.length} 个文件进行批量处理...`;
  }

  selectedFolderFiles.value = [];
  if (folderInput.value) {
    folderInput.value.value = '';
  }

  // 上传新文件后清空已刷新任务记录
  refreshedJobs.value.clear();

  // 开始轮询最新上传任务的状态
  if (analysisStore.historyList.length > 0) {
    const latestJob = analysisStore.historyList[0];
    if (latestJob.status === 'processing') {
      startPolling(latestJob.analysisId);
    }
  }
};

// 添加轮询，用于检查显示分析结果是否完成
// 轮询任务状态
let pollingInterval = null;

const startPolling = (analysisId) => {
  // 停止之前的轮询
  if (pollingInterval) {
    clearInterval(pollingInterval);
  }

  pollingInterval = setInterval(async () => {
    await analysisStore.fetchHistoryAction();

    // 检查任务是否完成
    const job = analysisStore.historyList.find(j => j.analysisId === analysisId);
    if (job && job.status === 'completed') {
      // 任务完成，停止轮询
      clearInterval(pollingInterval);
      pollingInterval = null;
      // 选中该任务以显示分析结果
      analysisStore.selectJobAction(job);
      uploadSuccessMessage.value = `文件处理完成！`;
    } else if (job && job.status === 'failed') {
      // 任务失败，停止轮询
      clearInterval(pollingInterval);
      pollingInterval = null;
      uploadSuccessMessage.value = '';
    }
  }, 2000); // 每2秒轮询一次
};

// 处理文件上传
const handleFileUpload = async () => {
  if (selectedFiles.value.length === 0) {
    analysisStore.setError('请先选择图片文件！');
    return;
  }
  uploadSuccessMessage.value = '';

  // 生成批次ID
  currentBatchId.value = generateBatchId();
  const uploadedCount = [];

  for (const file of selectedFiles.value) {
    console.log(`上传文件: ${file.name}, 使用模型: ${selectedModel.value}, 批次ID: ${currentBatchId.value}`);
    const success = await analysisStore.uploadFileAction(file, currentBatchId.value);
    if (success) {
      uploadedCount.push(file.name);
    }
    // 短暂延迟，避免请求过于频繁
    await new Promise(resolve => setTimeout(resolve, 300));
  }

  if (uploadedCount.length > 0) {
    if (uploadedCount.length === 1) {
      uploadSuccessMessage.value = `文件 "${uploadedCount[0]}" 已成功提交后台处理...`;
    } else {
      uploadSuccessMessage.value = `已成功提交 ${uploadedCount.length} 个文件进行处理...`;
    }
  }

  selectedFiles.value = [];
  if (fileInput.value) {
    fileInput.value.value = '';
  }

  // 上传新文件后清空已刷新任务记录，因为会有新任务加入
  refreshedJobs.value.clear();

  // 开始轮询最新上传任务的状态
  if (analysisStore.historyList.length > 0) {
    const latestJob = analysisStore.historyList[0];
    if (latestJob.status === 'processing') {
      startPolling(latestJob.analysisId);
    }
  }
};

// 处理选中历史记录
const selectJob = (job) => {
  // 清除上传成功消息，避免切换任务时仍然显示
  uploadSuccessMessage.value = '';

  // 选中任务
  analysisStore.selectJobAction(job);
};

// 删除分割记录
const deleteJob = async (analysisId, filename) => {
  if (!confirm(`确定要删除记录 "${filename}" 吗？此操作不可撤销。`)) {
    return;
  }

  const success = await analysisStore.deleteJobAction(analysisId);
  if (success) {
    console.log(`记录 "${filename}" 已成功删除`);
  }
};

// 处理图片加载错误
const handleImageError = (type) => {
  console.error(`无法加载 ${type} 图片。`);
  if (type === 'original') {
    imageStatus.original.error = true;
  } else if (type === 'annotated') {
    imageStatus.annotated.error = true;
  }
};

// 处理图片加载成功
const imageLoaded = (type) => {
  console.debug(`${type} image loaded successfully.`);
  if (type === 'original') {
    imageStatus.original.loaded = true;
    imageStatus.original.error = false;
  } else if (type === 'annotated') {
    imageStatus.annotated.loaded = true;
    imageStatus.annotated.error = false;
  }
};

// 处理鼠标进入图片
const handleMouseEnter = (type) => {
  imageState[type].isHovering = true;
};

// 处理鼠标离开图片
const handleMouseLeave = (type) => {
  imageState[type].isHovering = false;
};

// 处理鼠标滚轮缩放
const handleWheel = (type, event) => {
  if (!imageState[type].isHovering) return;

  event.preventDefault();

  const delta = event.deltaY > 0 ? -0.1 : 0.1;
  const newScale = Math.max(0.5, Math.min(5, imageState[type].scale + delta));

  imageState[type].scale = parseFloat(newScale.toFixed(2));
};

// 重置图片缩放
const resetScale = (type) => {
  imageState[type].scale = 1;
  imageState[type].position = { x: 0, y: 0 };
};

// 处理鼠标按下开始拖拽
const handleMouseDown = (type, event) => {
  if (event.button !== 0) return; // 只响应左键

  imageState[type].isDragging = true;
  imageState[type].dragStart = {
    x: event.clientX - imageState[type].position.x,
    y: event.clientY - imageState[type].position.y
  };

  // 阻止默认行为，避免文本选择
  event.preventDefault();
};

// 处理鼠标移动拖拽
const handleMouseMove = (type, event) => {
  if (!imageState[type].isDragging) return;

  const deltaX = event.clientX - imageState[type].dragStart.x;
  const deltaY = event.clientY - imageState[type].dragStart.y;

  // 限制移动范围，防止图片移出可视区域太远
  const maxMove = 200;
  imageState[type].position.x = Math.max(-maxMove, Math.min(maxMove, deltaX));
  imageState[type].position.y = Math.max(-maxMove, Math.min(maxMove, deltaY));
};

// 处理鼠标释放结束拖拽
const handleMouseUp = (type) => {
  imageState[type].isDragging = false;
};

// 全局鼠标事件处理
const handleGlobalMouseMove = (event) => {
  if (imageState.original.isDragging) {
    handleMouseMove('original', event);
  }
  if (imageState.annotated.isDragging) {
    handleMouseMove('annotated', event);
  }
};

const handleGlobalMouseUp = () => {
  if (imageState.original.isDragging) {
    handleMouseUp('original');
  }
  if (imageState.annotated.isDragging) {
    handleMouseUp('annotated');
  }
};

// 添加全局事件监听
onMounted(() => {
  window.addEventListener('mousemove', handleGlobalMouseMove);
  window.addEventListener('mouseup', handleGlobalMouseUp);
});

// 组件卸载时移除事件监听
import { onUnmounted } from 'vue';
onUnmounted(() => {
  window.removeEventListener('mousemove', handleGlobalMouseMove);
  window.removeEventListener('mouseup', handleGlobalMouseUp);
});

// 格式化日期 - 确保UTC时间正确转为本地时间
const formatDate = (date) => {
  if (!date) return '';
  let parsedDate;
  if (typeof date === 'string') {
    // 匹配 ISO 8601 格式但不带时区标识的字符串 (如 "2026-07-08T08:18:00")
    // 以及 "2026-07-08 08:18:00" 这类格式，均视为 UTC 时间
    const isoPattern = /^\d{4}-\d{2}-\d{2}[T ]\d{2}:\d{2}:\d{2}(?:\.\d+)?$/;
    if (isoPattern.test(date) && !date.endsWith('Z') && !date.includes('+') && !date.includes('GMT')) {
      // 将空格替换为 T 并附加 Z，强制当作 UTC 时间解析
      const normalized = date.replace(' ', 'T') + 'Z';
      parsedDate = new Date(normalized);
      // 如果解析失败(Invalid Date)，回退到原始字符串
      if (isNaN(parsedDate.getTime())) {
        parsedDate = new Date(date);
      }
    } else {
      parsedDate = new Date(date);
    }
  } else {
    parsedDate = new Date(date);
  }
  if (isNaN(parsedDate.getTime())) return '';
  return parsedDate.toLocaleString('zh-CN', { dateStyle: 'short', timeStyle: 'short', hour12: false });
};

// 翻译状态
const translateStatus = (status) => {
  const statusMap = {
    processing: '处理中', completed: '已完成', failed: '失败',
    queued: '排队中', pending: '待处理'
  };
  return statusMap[status] || status;
};

</script>


<style scoped>
/* 基础样式 */
.dashboard-content { display: flex; flex-direction: column; gap: 20px; }
.card { background-color: var(--color-surface, #ffffff); padding: 20px; border-radius: 8px; box-shadow: -1px -1px 3px rgba(0,0,0,0.1); }
h3 { margin-top: 0; color: var(--color-primary-green-dark, #2e7d32); border-bottom: 2px solid var(--color-primary-green-lightest, #e6f4ea); padding-bottom: 10px; margin-bottom: 20px; }
.error-message { color: var(--color-error, red); font-size: 0.9em; margin-top: 10px; }
.success-message { color: var(--color-primary-green-dark, green); font-size: 0.9em; margin-top: 10px; }
.success-message.inline { margin-top: 0; white-space: nowrap; }
button { padding: 8px 12px; border: none; border-radius: 4px; cursor: pointer; font-size: 1em; transition: background-color 0.2s, opacity 0.2s; }
button.primary { background-color: var(--color-primary-green, #4caf50); color: white; }
button.primary:hover:not(:disabled) { background-color: var(--color-primary-green-dark, #2e7d32); }
button:disabled { background-color: #ccc !important; opacity: 0.6; cursor: not-allowed; }

/* 上传区域 */
.upload-controls {
  display: flex;
  align-items: center;
  gap: 15px;
  flex-wrap: wrap;
  margin-bottom: 15px;
  padding: 15px;
  border-radius: 8px;
  box-shadow: 0 1px 3px rgba(0,0,0,0.1);
}

/* 自定义文件选择按钮样式 */
.file-input-label, .folder-input-label {
  position: relative;
  display: inline-block;
  padding: 8px 12px;
  border-radius: 4px;
  cursor: pointer;
  font-size: 0.9em;
  transition: background-color 0.2s;
  border: none;
  background-color: #999;
  color: white;
}

.file-input-label:hover:not(:disabled),
.folder-input-label:hover:not(:disabled) {
  background-color: #777;
}

.file-input-label input[type="file"],
.folder-input-label input[type="file"] {
  position: absolute;
  opacity: 0;
  pointer-events: none;
}

.file-input-label:has(input:disabled),
.folder-input-label:has(input:disabled) {
  background-color: #ccc;
  cursor: not-allowed;
  opacity: 0.6;
}
.model-select label { margin-right: 5px; font-size: 0.9em; color: #555; }
.model-select select { padding: 6px 10px; border-radius: 4px; border: 1px solid #ccc; background-color: white; }

.folder-upload-button {
  background-color: #2196f3; /* 蓝色区分于普通上传 */
}

.folder-upload-button:hover:not(:disabled) {
  background-color: #1976d2;
}

.loading-indicator { font-style: italic; color: #666; margin-top: 10px; }


/* 分割内容 */
.main-area {
  display: flex;
  gap: 20px;
  align-items: flex-start;
}

/* 分割记录 */
.job-list-section {
  flex: 0 0 25%; /* 右侧栏固定宽度 */
  order: 2; /* 显示在右侧 */
  display: flex;
  flex-direction: column;
  /* Flexbox 默认会拉伸子元素高度与其他兄弟元素一致 */
}

.section-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 15px;
}

.section-header h3 {
  margin-bottom: 0;
  border-bottom: none;
  padding-bottom: 0;
}

.section-actions {
  display: flex;
  gap: 10px;
}

.download-summary-button {
  background-color: var(--color-primary-green-dark, #2e7d32);
  color: white;
  padding: 6px 12px;
  border: none;
  border-radius: 4px;
  cursor: pointer;
  font-size: 0.85em;
  transition: background-color 0.2s;
  white-space: nowrap;
}

.download-summary-button:hover:not(:disabled) {
  background-color: #1b5e20;
}

.download-summary-button:disabled {
  background-color: #ccc;
  opacity: 0.6;
  cursor: not-allowed;
}

.job-list {
  overflow-y: auto;
  flex-shrink: 1;
  max-height: 500px; /* 列表最大高度，避免内容过多时撑满容器 */
  list-style: none;
  padding: 0;
  margin: 0;
}

/* 批次组样式 */
.batch-item {
  border: 1px solid #eee;
  margin-bottom: 8px;
  border-radius: 4px;
  overflow: hidden;
  transition: background-color 0.2s;
}

.batch-item:hover {
  background-color: #f9f9f9;
}

.batch-item.expanded {
  background-color: var(--color-primary-green-lightest, #f1f8e9);
}

.batch-item.selected {
  background-color: var(--color-primary-green-lightest, #e6f4ea);
  border-left: 4px solid var(--color-primary-green, #4caf50);
}

.batch-header {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 10px 15px;
  cursor: pointer;
  min-width: 0;
}

.batch-icon {
  font-size: 16px;
  flex-shrink: 0;
}

.folder-icon {
  font-size: 18px;
}

.file-icon {
  font-size: 16px;
}

.batch-label {
  font-weight: 500;
  flex-grow: 1;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  font-size: 0.9em;
}

.batch-timestamp {
  font-size: 0.8em;
  color: #666;
  flex-shrink: 0;
}

.expand-icon {
  font-size: 0.75em;
  color: #666;
  flex-shrink: 0;
  transition: transform 0.2s;
}

.batch-item.expanded .expand-icon {
  transform: rotate(90deg);
}

/* 批次内容列表 */
.batch-content {
  list-style: none;
  padding: 0;
  margin: 0;
  background-color: #ffffff;
  border-top: 1px solid #eee;
}

/* 任务项样式 */
.job-item {
  border: none;
  padding: 8px 15px 8px 35px;
  margin-bottom: 0;
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 10px;
  transition: background-color 0.2s;
}

.job-item:hover {
  background-color: #f5f5f5;
}

.job-item.selected {
  background-color: var(--color-primary-green-lightest, #e6f4ea);
  border-left: 4px solid var(--color-primary-green, #4caf50);
}

.job-item.nested {
  padding-left: 45px;
}

.job-info {
  display: flex;
  align-items: center;
  gap: 10px;
  flex-grow: 1;
  cursor: pointer;
  min-width: 0;
}

.job-item .filename {
  font-weight: 500;
  flex-grow: 1;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  margin-right: 5px;
  font-size: 0.9em;
}

.delete-button {
  background: #dc3545;
  color: white;
  border: none;
  border-radius: 50%;
  width: 24px;
  height: 24px;
  cursor: pointer;
  font-size: 16px;
  font-weight: bold;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: background-color 0.2s;
  flex-shrink: 0;
}

.delete-button:hover:not(:disabled) {
  background: #c82333;
}

.delete-button:disabled {
  background-color: #ccc;
  opacity: 0.6;
  cursor: not-allowed;
}
/* 状态指示器基础样式 */
.status-indicator {
  width: 10px;
  height: 10px;
  border-radius: 50%;
  flex-shrink: 0;
}

.status-indicator.status-processing { background-color: #ff9800; }      /* 橙色 - 处理中 */
.status-indicator.status-completed { background-color: #28a745; }        /* 绿色 - 已完成 */
.status-indicator.status-failed { background-color: var(--color-error, #dc3545); } /* 红色 - 失败 */
.no-jobs-message { color: #666; text-align: center; padding: 20px; }

/* 左侧详情区域 */
.detail-section {
  flex-grow: 1; /* 占据主要空间 */
  order: 1; /* 显示在左侧 */
}
.detail-section.placeholder { color: #888; text-align: center; padding: 50px 20px; font-style: italic; }

.image-comparison {
  display: flex; gap: 20px; margin-bottom: 20px; justify-content: space-around;
  flex-wrap: wrap; border-bottom: 1px solid #eee; padding-bottom: 20px;
}
.image-container {
  text-align: center;
  flex: 1;
  min-width: 250px;
  overflow: hidden;
  position: relative;
}
.image-container h4 {
  position: absolute;
  top: 10px;
  left: 50%;
  transform: translateX(-50%);
  background: rgba(255, 255, 255, 0.8);
  padding: 5px 15px;
  border-radius: 20px;
  color: #555;
  font-weight: 600;
  font-size: 0.9em;
  z-index: 10;
  box-shadow: 0 2px 5px rgba(0, 0, 0, 0.2);
  margin: 0;
}
.image-container img {
  max-width: 100%;
  height: auto;
  max-height: 350px;
  object-fit: contain;
  border: 1px solid #ddd;
  border-radius: 4px;
  min-height: 200px;
  background-color: #f0f0f0;
  display: block;
  margin: 0 auto;
  cursor: zoom-in;
  transition: transform 0.1s ease;
  transform-origin: center center;
  user-select: none;
  -webkit-user-select: none;
  -moz-user-select: none;
  -ms-user-select: none;
}

.image-container img.dragging {
  transition: none;
  box-shadow: 0 4px 15px rgba(0, 0, 0, 0.3);
}

.status-completed { color: #28a745; font-style: italic; }

.status-failed.error-message {
  text-align: center;
  display: flex;
  align-items: center;
  justify-content: center;
  min-height: 200px;
  color: var(--color-error, #dc3545);
}

/* 缩放指示器样式 */
.scale-indicator {
  position: absolute;
  bottom: 10px;
  left: 50%;
  transform: translateX(-50%);
  background: rgba(0, 0, 0, 0.7);
  color: white;
  padding: 5px 10px;
  border-radius: 15px;
  font-size: 12px;
  display: flex;
  align-items: center;
  gap: 8px;
  z-index: 10;
}

.reset-button {
  background: #4caf50;
  color: white;
  border: none;
  border-radius: 12px;
  padding: 2px 8px;
  font-size: 10px;
  cursor: pointer;
  transition: background-color 0.2s;
}

.reset-button:hover {
  background: #45a049;
}

.image-container img.loading { opacity: 0.5; }
.image-error { border: 1px dashed var(--color-error, red); padding: 20px; color: var(--color-error, red); min-height: 100px; display: flex; align-items: center; justify-content: center; }
.status-processing { color: #666; font-style: italic; }

.status-failed { color: var(--color-error, #dc3545); font-style: italic; }

.job-details { margin-top: 20px; font-size: 0.95em; color: #333; }
.job-details p { margin-bottom: 8px; }
.job-details strong { margin-right: 5px; color: #111; }

.status-tag { padding: 3px 8px; border-radius: 12px; font-size: 0.85em; color: white; min-width: 60px; text-align: center; display: inline-block; }
.status-tag.status-processing { background-color: #ff9800; }      /* 橙色 - 处理中 */
/* 绿色 - 已完成 */
.status-tag.status-completed { background-color: #28a745; } /* 绿色 - 已完成 */
.status-tag.status-failed { background-color: var(--color-error, #dc3545); } /* 红色 - 失败 */

.result-links { margin-top: 15px; display: flex; gap: 15px; flex-wrap: wrap; }
.download-button { display: inline-block; padding: 8px 15px; border-radius: 4px; text-decoration: none; color: white !important; font-size: 0.9em; transition: background-color 0.2s; cursor: pointer; border: none; }
.download-button.excel { background-color: var(--color-primary-green-dark, #2e7d32); }
.download-button.excel:hover { background-color: #1b5e20; }
.download-button.json { background-color: #ffa000; }
.download-button.json:hover { background-color: #ef6c00; }
.disabled-links-note { font-size: 0.8em; color: #888; margin-left: 5px; align-self: center; }

</style>