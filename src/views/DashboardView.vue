<template>
  <div class="dashboard-view">
    <main class="dashboard-content">

      <!-- 上部操作面板 -->
      <section class="upload-section card">
        <h3>上传图片进行分割</h3>
        <div class="upload-controls">
          <input type="file" @change="handleFileSelect" accept="image/*" :disabled="analysisStore.isLoading" ref="fileInput" />

          <div class="model-select">
            <label for="model-choice">选择模型:</label>
            <select id="model-choice" v-model="selectedModel" :disabled="analysisStore.isLoading">
              <option value="yolov8s.pt">YOLOv8s</option>
              <option value="yolov8s-1.pt">YOLOv8s-1</option>
            </select>
          </div>

          <button @click="handleFileUpload" :disabled="!selectedFile || analysisStore.isLoading" class="primary upload-button">
            {{ analysisStore.isLoading ? '处理中...' : '上传并分割' }}
          </button>
        </div>
        <div v-if="analysisStore.isLoading && !uploadSuccessMessage" class="loading-indicator">
          正在上传或加载历史...
        </div>
        <div v-if="analysisStore.error" class="error-message">
          操作失败: {{ analysisStore.error }}
        </div>
        <div v-if="uploadSuccessMessage" class="success-message">
          {{ uploadSuccessMessage }}
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
          <ul v-if="analysisStore.historyList.length > 0" class="job-list">
            <li
              v-for="job in analysisStore.historyList"
              :key="job.analysisId"
              class="job-item"
              :class="{ 'selected': analysisStore.selectedJob?.analysisId === job.analysisId }"
            >
              <div class="job-info" @click="selectJob(job)">
                <span class="filename">{{ job.originalFilename }}</span>
                <span class="timestamp">{{ formatDate(job.createdAt) }}</span>
                <span class="status-indicator" :class="`status-${job.status}`" :title="translateStatus(job.status)"></span>
              </div>
              <button
                @click="deleteJob(job.analysisId, job.originalFilename)"
                :disabled="analysisStore.isLoading"
                class="delete-button"
                title="删除记录"
              >
                ×
              </button>
            </li>
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
import { ref, onMounted, reactive, watch } from 'vue';
import { useAnalysisStore } from '@/stores/analysis';
import SelectColumns from '@/components/SelectColumns.vue';

const analysisStore = useAnalysisStore();
const selectedFile = ref(null);

// Excel下载弹窗相关状态
const showDownloadDialog = ref(false);
const currentDownloadType = ref('summary'); // 'summary' 或 'single'

// 记录已刷新过的任务ID，避免重复刷新
const refreshedJobs = ref(new Set());

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
    const success = await analysisStore.downloadExcelSummaryAction(downloadData.columns);
    if (success) {
      console.log('Excel summary download initiated with selected columns:', downloadData.columns);
    }
  } else if (downloadData.type === 'single') {
    // 下载单个任务报告
    const success = await analysisStore.downloadSingleExcelAction(analysisStore.selectedJob.analysisId, downloadData.columns);
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

// 处理文件选择
const handleFileSelect = (event) => {
  const file = event.target.files[0];
  if (file) {
    selectedFile.value = file;
    uploadSuccessMessage.value = '';
    analysisStore.setError(null);
  } else {
    selectedFile.value = null;
  }
};

// 处理文件上传
const handleFileUpload = async () => {
  if (!selectedFile.value) {
    analysisStore.setError('请先选择一个图片文件！');
    return;
  }
  uploadSuccessMessage.value = '';
  // 注意：目前 selectedModel 尚未传递给后端
  console.log(`准备上传文件: ${selectedFile.value.name}, 使用模型: ${selectedModel.value}`);

  const success = await analysisStore.uploadFileAction(selectedFile.value);

  if (success) {
    uploadSuccessMessage.value = `文件 "${selectedFile.value.name}" 已成功提交后台处理！将刷新历史列表...`;
    selectedFile.value = null;
    if (fileInput.value) {
      fileInput.value.value = '';
    }

    // 上传新文件后清空已刷新任务记录，因为会有新任务加入
    refreshedJobs.value.clear();
  }
};

// 处理选中历史记录
const selectJob = async (job) => {
  // 清除上传成功消息，避免切换任务时仍然显示
  uploadSuccessMessage.value = '';

  // 先选中任务
  analysisStore.selectJobAction(job);

  // 每次点击都自动刷新历史记录，获取最新的任务状态
  await analysisStore.fetchHistoryAction();

  // 重新选中当前任务（确保显示最新的数据）
  const updatedJob = analysisStore.historyList.find(j => j.analysisId === job.analysisId);
  if (updatedJob) {
    analysisStore.selectJobAction(updatedJob);
  }
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
  const newScale = Math.max(0.5, Math.min(3, imageState[type].scale + delta));

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



// 格式化日期
const formatDate = (date) => {
  if (!date) return '';
  return new Date(date).toLocaleString('zh-CN', { dateStyle: 'short', timeStyle: 'short', hour12: false });
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
/* --- 基础样式 --- */
.dashboard-view { }
.dashboard-content { display: flex; flex-direction: column; gap: 20px; }
.card { background-color: var(--color-surface, #ffffff); padding: 20px; border-radius: 8px; box-shadow: 0 1px 3px rgba(0,0,0,0.1); }
h3 { margin-top: 0; color: var(--color-primary-green-dark, #2e7d32); border-bottom: 2px solid var(--color-primary-green-lightest, #e6f4ea); padding-bottom: 10px; margin-bottom: 20px; }
.error-message { color: var(--color-error, red); font-size: 0.9em; margin-top: 10px; }
.success-message { color: var(--color-primary-green-dark, green); font-size: 0.9em; margin-top: 10px; }
button { padding: 8px 12px; border: none; border-radius: 4px; cursor: pointer; font-size: 1em; transition: background-color 0.2s, opacity 0.2s; }
button.primary { background-color: var(--color-primary-green, #4caf50); color: white; }
button.primary:hover:not(:disabled) { background-color: var(--color-primary-green-dark, #2e7d32); }
button:disabled { background-color: #ccc !important; opacity: 0.6; cursor: not-allowed; }

/* 上传区域 */
.upload-controls { display: flex; align-items: center; gap: 15px; flex-wrap: wrap; margin-bottom: 15px; }
.model-select label { margin-right: 5px; font-size: 0.9em; color: #555; }
.model-select select { padding: 6px 10px; border-radius: 4px; border: 1px solid #ccc; background-color: white; }
.upload-button { margin-left: auto; } /* 尝试将按钮推到右边 */
.loading-indicator { font-style: italic; color: #666; margin-top: 10px; }


/* --- 主内容区分栏布局 (左右调整) --- */
.main-area {
  display: flex;
  gap: 20px;
  align-items: flex-start;
}

/* 右侧历史列表 */
/* 分割记录区域样式调整 */
.job-list-section {
  flex: 0 0 350px; /* 右侧栏固定宽度 */
  order: 2; /* 显示在右侧 */
  max-height: calc(100vh - 250px); /* 根据需要调整高度 */
  display: flex;
  flex-direction: column;
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

/* 下载Excel总表按钮样式 - 与Excel报告按钮颜色一致 */
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
  flex-grow: 1;
  list-style: none;
  padding: 0;
  margin: 0;
}
.job-item {
  border: 1px solid #eee; padding: 10px 15px; margin-bottom: 8px; border-radius: 4px;
  display: flex; justify-content: space-between; align-items: center; gap: 10px;
  transition: background-color 0.2s;
}
.job-item:hover { background-color: #f9f9f9; }
.job-item.selected { background-color: var(--color-primary-green-lightest, #e6f4ea); border-left: 4px solid var(--color-primary-green, #4caf50); }

.job-info {
  display: flex;
  align-items: center;
  gap: 10px;
  flex-grow: 1;
  cursor: pointer;
  min-width: 0; /* 允许文本溢出 */
}

.job-item .filename { font-weight: 500; flex-grow: 1; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; margin-right: 5px; font-size: 0.9em; }
.job-item .timestamp { font-size: 0.8em; color: #666; flex-shrink: 0; margin-right: 5px; }
.job-item .status-indicator { width: 10px; height: 10px; border-radius: 50%; flex-shrink: 0; }

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
.status-processing, .status-queued, .status-pending { background-color: #ff9800; }
.status-completed { background-color: var(--color-primary-green, #4caf50); }
.status-failed { background-color: var(--color-error, #dc3545); }
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
.image-container { text-align: center; flex: 1; min-width: 250px; overflow: hidden; /* 隐藏缩放溢出 */ position: relative; }
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
  user-select: none; /* 防止拖拽时选中文本 */
  -webkit-user-select: none;
  -moz-user-select: none;
  -ms-user-select: none;
}

.image-container img.dragging {
  transition: none; /* 拖拽时禁用过渡动画 */
  box-shadow: 0 4px 15px rgba(0, 0, 0, 0.3); /* 拖拽时显示阴影 */
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

.image-container {
  position: relative;
}

.image-container img.loading { opacity: 0.5; }
.image-error { border: 1px dashed var(--color-error, red); padding: 20px; color: var(--color-error, red); min-height: 100px; display: flex; align-items: center; justify-content: center; }
.status-processing, .status-failed { color: #666; font-style: italic; }

.job-details { margin-top: 20px; font-size: 0.95em; color: #333; }
.job-details p { margin-bottom: 8px; }
.job-details strong { margin-right: 5px; color: #111; }

.status-tag { padding: 3px 8px; border-radius: 12px; font-size: 0.85em; color: white; min-width: 60px; text-align: center; display: inline-block; }
.status-tag.status-processing, .status-tag.status-queued, .status-tag.status-pending { background-color: #ff9800; }
.status-tag.status-completed { background-color: var(--color-primary-green, #4caf50); }
.status-tag.status-failed { background-color: var(--color-error, #dc3545); }

.result-links { margin-top: 15px; display: flex; gap: 15px; flex-wrap: wrap; }
.download-button { display: inline-block; padding: 8px 15px; border-radius: 4px; text-decoration: none; color: white !important; font-size: 0.9em; transition: background-color 0.2s; cursor: pointer; border: none; }
.download-button.excel { background-color: var(--color-primary-green-dark, #2e7d32); }
.download-button.excel:hover { background-color: #1b5e20; }
.download-button.json { background-color: #ffa000; }
.download-button.json:hover { background-color: #ef6c00; }
.disabled-links-note { font-size: 0.8em; color: #888; margin-left: 5px; align-self: center; }

</style>
