<template>
  <main class="main-area">

        <section class="upload-sidebar">
          <h3 class="sidebar-title">操作栏</h3>
          <div class="upload-controls">
            <div class="model-select">
              <label for="model-choice">选择模型:</label>
              <select id="model-choice" v-model="analysisStore.currentModelName" :disabled="analysisStore.isLoading || analysisStore.modelsLoading">
                <option v-if="analysisStore.modelsLoading" value="">加载中...</option>
                <option v-else-if="analysisStore.availableModels.length === 0" :value="null">默认模型</option>
                <option
                  v-for="m in analysisStore.availableModels"
                  :key="m.name"
                  :value="m.name"
                >{{ m.name }}</option>
              </select>
            </div>

            <label class="file-input-label">
              <input type="file" @change="handleFileSelect" accept="image/*" :disabled="analysisStore.isLoading" ref="fileInput" multiple />
              <span>🖼️选择单张图片</span>
            </label>

            <label class="folder-input-label">
              <input type="file" @change="handleFolderSelect" :webkitdirectory="true" :mozdirectory="true" :directory="true" accept="image/*" :disabled="analysisStore.isLoading" ref="folderInput" />
              <span>📁选择文件夹</span>
            </label>

            <button @click="handleFileUpload" :disabled="selectedFiles.length === 0 || analysisStore.isLoading" class="primary upload-button">
              {{ analysisStore.isLoading ? '处理中...' : '上传图片并分割' }}
            </button>

            <button @click="handleFolderUpload" :disabled="selectedFolderFiles.length === 0 || analysisStore.isLoading" class="primary folder-upload-button">
              {{ analysisStore.isLoading ? '处理中...' : '上传文件夹并分割' }}
            </button>

          </div>

          <div class="job-details">
            <p><strong>状态:</strong>
              <span v-if="analysisStore.selectedJob" class="status-tag" :class="`status-${analysisStore.selectedJob.status}`">
                <span v-if="isPendingStatus(analysisStore.selectedJob.status)" class="status-spinner"></span>
                {{ translateStatus(analysisStore.selectedJob.status) }}
              </span>
              <span v-else class="status-tag status-unselected">未选中</span>
            </p>
          </div>
        </section>

        <div class="image-group" v-if="analysisStore.selectedJob || previewPendingFile">
          <div class="image-section-wrapper">
            <section class="image-section card">
            <div class="image-container">
              <h4>{{ previewPendingFile ? '待处理图片预览' : '原始图片' }}</h4>
              <img
                  v-if="getOriginalImageUrl()"
                  :src="getOriginalImageUrl()"
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
              <p v-else-if="!getOriginalImageUrl()">{{ previewPendingFile ? '无图片' : '无原始图片记录' }}</p>
            </div>
          </section>
          </div>

          <template v-if="analysisStore.selectedJob && !previewPendingFile">
          <div class="image-section-wrapper">
          <section class="image-section card">
            <div class="image-container">
              <h4>分割图片</h4>
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
              <p v-if="isPendingStatus(analysisStore.selectedJob.status)" class="status-processing">
                {{ analysisStore.selectedJob.status === 'queued' ? '排队中，等待前面的任务跑完...' : '处理中...' }}
              </p>
              <div v-else-if="analysisStore.selectedJob.status === 'failed'" class="failed-detail">
                <p class="status-failed error-message">❌ 分析失败</p>
                <p v-if="analysisStore.selectedJob.errorMessage" class="failed-error-msg">{{ analysisStore.selectedJob.errorMessage }}</p>
                <p class="failed-meta" v-if="displayModelUsed(analysisStore.selectedJob.modelUsed)">使用模型：{{ displayModelUsed(analysisStore.selectedJob.modelUsed) }}</p>
              </div>
              <p v-else-if="analysisStore.selectedJob.status === 'completed' && !analysisStore.selectedJob.annotatedImageUrl" class="error-message image-error">标注图片URL为空</p>
              <p v-else-if="!(analysisStore.selectedJob.status!=='completed'||analysisStore.selectedJob.annotatedImageUrl)" class="status-completed">分析完成</p>
              <p v-else-if="imageStatus.annotated.error" class="error-message image-error">无法加载标注图片</p>
              <p v-else-if="analysisStore.selectedJob.status !== 'completed' && !analysisStore.selectedJob.annotatedImageUrl">暂无标注图片</p>
            </div>
          </section>
          </div>
          </template>
        </div>

        <section class="image-group card placeholder" v-else>
          <p>请从右侧列表中选择一个分割记录以查看详情</p>
        </section>

        <div class="right-panel">
          <section class="upper-panel card">
            <h3>待处理文件</h3>
            <div v-if="selectedFiles.length > 0" class="pending-group">
              <div class="pending-group-title">单张文件 ({{ selectedFiles.length }})</div>
              <ul class="pending-list">
                <li
                  v-for="(file, index) in selectedFiles"
                  :key="'s-'+index"
                  class="pending-item clickable"
                  :class="{ 'is-previewing': isPreviewingFile('single', index) }"
                  @click="previewFromPendingList(file, 'single', index)"
                >
                  <span class="pending-icon">🖼️</span>
                  <span class="pending-name" :title="file.name">{{ file.name }}</span>
                  <span class="pending-size">({{ (file.size / 1024).toFixed(1) }} KB)</span>
                  <button @click.stop="removeSelectedFile(index)" class="pending-remove" title="移除">×</button>
                </li>
              </ul>
            </div>
            <div v-if="selectedFolderFiles.length > 0" class="pending-group">
              <div class="pending-group-title">文件夹文件 ({{ selectedFolderFiles.length }})</div>
              <ul class="pending-list">
                <li
                  v-for="(file, index) in selectedFolderFiles"
                  :key="'f-'+index"
                  class="pending-item clickable"
                  :class="{ 'is-previewing': isPreviewingFile('folder', index) }"
                  @click="previewFromPendingList(file, 'folder', index)"
                >
                  <span class="pending-icon">🖼️</span>
                  <span class="pending-name" :title="file.name">{{ file.name }}</span>
                  <span class="pending-size">({{ (file.size / 1024).toFixed(1) }} KB)</span>
                  <button @click.stop="removeFolderFile(index)" class="pending-remove" title="移除">×</button>
                </li>
              </ul>
            </div>
            <p v-if="selectedFiles.length === 0 && selectedFolderFiles.length === 0" class="no-pending">暂无待处理文件</p>

            <transition name="slide-up">
              <div v-if="uploadProgress.visible" class="upload-progress-panel">
                <div class="upload-progress-header">
                  <span class="upload-progress-label">
                    <span class="upload-progress-spinner" :class="{ done: uploadProgress.phase === 'done' }"></span>
                    {{ uploadProgress.currentFile }}
                  </span>
                  <span class="upload-progress-percent">{{ uploadProgress.percent }}%</span>
                </div>
                <div class="upload-progress-track">
                  <div
                    class="upload-progress-fill"
                    :class="{ done: uploadProgress.phase === 'done' }"
                    :style="{ width: uploadProgress.percent + '%' }"
                  ></div>
                </div>
              </div>
            </transition>
          </section>

          <aside class="job-list-section card" ref="jobListSectionRef">
            <div class="section-header">
              <div class="section-title-row">
                <h3>{{ listTitle }}</h3>
                <label class="select-all-checkbox" :class="{ 'has-selection': selectedAnalysisIds.length > 0 }">
                  <input
                      type="checkbox"
                      :checked="isAllSelected"
                      :indeterminate="isIndeterminate"
                      @change="toggleSelectAll"
                  />
                  <span class="checkbox-box">
                    <span class="checkbox-check"></span>
                  </span>
                  全选
                </label>
              </div>
              <div class="section-actions">
                <button
                    @click="batchExportJson"
                    :disabled="isExporting || selectedCompletedCount === 0"
                    class="download-summary-button json-batch">
                  {{ isExporting ? '导出中...' : `导出 JSON${selectedAnalysisIds.length > 0 ? ` (${selectedCompletedCount}/${selectedAnalysisIds.length})` : ''}` }}
                </button>
                <button
                    @click="openDownloadDialog"
                    :disabled="analysisStore.isLoading || excelStore.isLoading || selectedCompletedCount === 0"
                    class="download-summary-button">
                  {{ excelStore.isLoading ? '导出中...' : (analysisStore.isLoading ? '处理中...' : `导出 Excel${selectedAnalysisIds.length > 0 ? ` (${selectedCompletedCount}/${selectedAnalysisIds.length})` : ''}`) }}
                </button>
                <button
                    @click="handleBatchDelete"
                    :disabled="analysisStore.isLoading"
                    class="download-summary-button delete-batch">
                  {{ analysisStore.isLoading ? '处理中...' : `删除${selectedAnalysisIds.length > 0 ? ` (${selectedAnalysisIds.length})` : ''}` }}
                </button>
              </div>
            </div>

            <div v-if="excelStore.isLoading && excelStore.isAsyncTask" class="export-progress-bar">
              <div class="export-progress-info">
                <span>{{ excelStore.taskMessage }}</span>
                <span v-if="excelStore.taskTotal > 0">{{ excelStore.taskProgress }}/{{ excelStore.taskTotal }}</span>
              </div>
              <div class="export-progress-track">
                <div
                  class="export-progress-fill"
                  :style="{ width: exportProgressPercent + '%' }"
                ></div>
              </div>
            </div>
            <div v-else-if="excelStore.isLoading && !excelStore.isAsyncTask" class="export-progress-bar export-sync">
              <span>{{ excelStore.taskMessage || '正在生成并下载文件...' }}</span>
            </div>
            <div v-if="analysisStore.error" class="error-message">{{ analysisStore.error }}</div>
            <div v-if="notice" class="notice-message">{{ notice }}</div>
            <div v-if="excelStore.error" class="error-message">{{ excelStore.error }}</div>
            <ul v-if="groupedHistory.length > 0" class="job-list" ref="jobListRef">
            <template v-for="group in groupedHistory" :key="group.batchId">
              <!-- 批次组标题 -->
              <li
                  class="batch-item"
                  :class="{
                    'expanded': isBatchExpanded(group.batchId),
                    'selected': analysisStore.selectedJob?.batchId === group.batchId || (!group.hasFolder && analysisStore.selectedJob?.analysisId === group.jobs[0]?.analysisId)
                  }"
                  @click="handleBatchClick(group)"
              >
                <div class="batch-header">
                  <label
                      v-if="group.hasFolder"
                      class="folder-select-all"
                      @click.stop
                  >
                    <input
                        type="checkbox"
                        :checked="isFolderAllSelected(group)"
                        :indeterminate="isFolderIndeterminate(group)"
                        @change="toggleFolderSelectAll(group)"
                    />
                  </label>
                  <input
                      v-if="!group.hasFolder"
                      type="checkbox"
                      :value="group.jobs[0].analysisId"
                      v-model="selectedAnalysisIds"
                      @click.stop
                      class="job-checkbox"
                  />
                  <span class="batch-icon">
                    <span v-if="group.hasFolder" class="folder-icon">📁</span>
                    <span v-else class="file-icon">🖼️</span>
                  </span>
                  <span class="batch-label">
                    <template v-if="group.hasFolder">
                      {{ getGroupBatchName(group) || `文件夹 (${group.jobs.length} 个文件)` }}
                    </template>
                    <template v-else>
                      {{ group.jobs[0]?.originalFilename }}
                    </template>
                  </span>
                  <span v-if="!group.hasFolder && displayModelUsed(group.jobs[0]?.modelUsed)" class="batch-model-tag" :title="`使用模型: ${displayModelUsed(group.jobs[0].modelUsed)}`">
                    {{ displayModelUsed(group.jobs[0].modelUsed) }}
                  </span>
                  <span class="batch-timestamp">{{ formatDate(group.createdAt) }}</span>
                  <button
                      v-if="group.hasFolder"
                      @click.stop="toggleBatch(group.batchId)"
                      class="expand-button"
                      title="展开/收起"
                  >
                    <span class="expand-icon">{{ isBatchExpanded(group.batchId) ? '▼' : '▶' }}</span>
                  </button>
                  <span
                    v-if="!group.hasFolder"
                    class="status-indicator"
                    :class="`status-${group.jobs[0]?.status}`"
                    :title="group.jobs[0]?.status === 'failed' && group.jobs[0]?.errorMessage ? `分析失败：${group.jobs[0].errorMessage}` : translateStatus(group.jobs[0]?.status)"
                  ></span>
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

                <!-- 展开的文件列表-->
                <ul v-if="group.hasFolder && isBatchExpanded(group.batchId)" class="batch-content">
                  <li
                      v-for="job in group.jobs"
                      :key="job.analysisId"
                      class="job-item nested"
                      :class="{ 'selected': analysisStore.selectedJob?.analysisId === job.analysisId }"
                  >
                    <input
                        type="checkbox"
                        :value="job.analysisId"
                        v-model="selectedAnalysisIds"
                        @click.stop
                        class="job-checkbox"
                    />
                    <div class="job-info" @click.stop="selectJob(job)">
                      <span class="filename">{{ job.originalFilename }}</span>
                      <span v-if="displayModelUsed(job.modelUsed)" class="job-model-tag" :title="`使用模型: ${displayModelUsed(job.modelUsed)}`">{{ displayModelUsed(job.modelUsed) }}</span>
                      <span
                        class="status-indicator"
                        :class="`status-${job.status}`"
                        :title="job.status === 'failed' && job.errorMessage ? `分析失败：${job.errorMessage}` : translateStatus(job.status)"
                      ></span>
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
          <p v-else class="no-jobs-message">{{ emptyHint }}</p>
          </aside>
        </div>

  </main>

  <!-- Excel下载数据项选择弹窗 -->
  <ExcelDownload
      :visible="showDownloadDialog"
      :download-type="currentDownloadType"
      :job="singleSelectedJob"
      :selected-count="selectedAnalysisIds.length"
      :task-type="currentTaskType"
      @close="closeDownloadDialog"
      @download="handleExcelDownload"
  />

  <!-- 应用内确认框（不用 window.confirm，见 ConfirmDialog.vue 说明） -->
  <ConfirmDialog
      :visible="confirmState.visible"
      :title="confirmState.title"
      :message="confirmState.message"
      :confirm-text="confirmState.confirmText"
      :danger="confirmState.danger"
      @confirm="resolveConfirm(true)"
      @cancel="resolveConfirm(false)"
  />
</template>


<script setup>
import {ref, reactive, watch, computed, nextTick, onMounted, onUnmounted} from 'vue';
import { useAnalysisStore } from '@/stores/analysis';
import { useExcelStore } from '@/stores/excel';
import { exportService } from '@/services/exportService';
import ExcelDownload from '@/components/ExcelDownload.vue';
import ConfirmDialog from '@/components/ConfirmDialog.vue';
import { beginCriticalOperation, endCriticalOperation } from '@/services/apiClient';

const analysisStore = useAnalysisStore();
const excelStore = useExcelStore();

// 茎秆与剑叶共用这一套工作台，只靠 group 区分：历史记录、模型下拉、批次进度
// 都跟着 group 走。两个页面各挂一个实例，路由切换时组件重建。
const props = defineProps({
  group: {
    type: String,
    default: 'stem',
    validator: (value) => ['stem', 'leaf'].includes(value),
  },
});

const showDownloadDialog = ref(false);
const currentDownloadType = ref('summary'); // 'summary' 或 'single'
// 导出时向后端索取列定义用的代表任务类型。取所选记录自己的 taskType，
// 后端据此解析出所属「族」再给列 —— 前端不参与"哪个记录属于哪一族"的判断。
const currentTaskType = ref(props.group);

// ---- 应用内确认框（替代 window.confirm）----
// 浏览器在用户勾选"阻止此页面创建更多对话框"后会静默屏蔽原生对话框，
// confirm() 直接返回 false，表现就是"点删除没任何反应"。删除不可撤销，
// 必须给出确定的反馈，所以换成自己画的对话框。
const confirmState = ref({
  visible: false,
  title: '确认操作',
  message: '',
  confirmText: '确定',
  danger: false,
});
let confirmHandler = null;

function askConfirm({ title, message, confirmText = '确定', danger = false, onConfirm }) {
  confirmState.value = { visible: true, title, message, confirmText, danger };
  confirmHandler = onConfirm;
  notice.value = '';
}

function resolveConfirm(accepted) {
  confirmState.value = { ...confirmState.value, visible: false };
  const handler = confirmHandler;
  confirmHandler = null;
  if (accepted && handler) handler();
}

// 删除/导出这类操作的文字反馈（不用 alert，同样会被浏览器屏蔽）
const notice = ref('');

// 后端是单 worker 串行队列：上传后先 `queued`（排队），worker 取到才开始 `processing`。
// 两种都属于"还没结束"，轮询必须覆盖 —— 之前只认 `processing`，而上传后是 `queued`，
// 结果轮询压根没启动，界面就永远停在"排队中"。
const PENDING_STATUSES = ['pending', 'queued', 'processing'];
const isPendingStatus = (status) => PENDING_STATUSES.includes(status);
const isFinishedStatus = (status) => status === 'completed' || status === 'failed';

// 列表标题带上分类，让"两边的记录是隔开的"这件事在界面上看得见
const LIST_TITLE = { stem: '茎秆分割记录', leaf: '剑叶分割记录' };
const listTitle = computed(() => LIST_TITLE[props.group] || '分割记录');
const EMPTY_HINT = {
  stem: '暂无茎秆分析记录。上传图片开始第一次茎秆分割。',
  leaf: '暂无剑叶分析记录。上传图片开始第一次剑叶分割。',
};
const emptyHint = computed(() => EMPTY_HINT[props.group] || '暂无分析记录。');

// JSON导出相关状态
const selectedAnalysisIds = ref([]);
const isExporting = ref(false);

const jobListSectionRef = ref(null);

let prevSectionHeight = 0;
let transitioning = false;

watch(() => selectedAnalysisIds.value.length, () => {
  const section = jobListSectionRef.value;
  if (!section || transitioning) return;
  prevSectionHeight = section.scrollHeight;
}, { flush: 'pre' });

watch(() => selectedAnalysisIds.value.length, () => {
  nextTick(() => {
    const section = jobListSectionRef.value;
    if (!section || transitioning) return;
    const newSectionHeight = section.scrollHeight;
    const delta = newSectionHeight - prevSectionHeight;
    if (Math.abs(delta) < 1) return;

    transitioning = true;
    section.style.height = prevSectionHeight + 'px';
    section.style.overflow = 'hidden';
    section.offsetHeight;
    section.style.transition = 'height 400ms cubic-bezier(0.4, 0, 0.2, 1)';
    requestAnimationFrame(() => {
      section.style.height = newSectionHeight + 'px';
    });
    setTimeout(() => {
      section.style.transition = '';
      section.style.height = '';
      section.style.overflow = '';
      transitioning = false;
    }, 450);
  });
});

// 记录已刷新过的任务ID，避免重复刷新
const refreshedJobs = ref(new Set());

// 当前展开的批次ID
const expandedBatchIds = ref(new Set());

// 生成批次ID
const generateBatchId = () => {
  return 'batch_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
};

// 从文件夹上传的文件列表中提取最顶层文件夹名称
const extractFolderName = (files) => {
  for (const file of files) {
    if (file.webkitRelativePath && file.webkitRelativePath.length > 0) {
      const parts = file.webkitRelativePath.split('/');
      if (parts.length > 0 && parts[0]) {
        return parts[0];
      }
    }
  }
  return null;
};

// 生成本地存储的批次名称（优先用后端返回的，其次用 localStorage）
const getGroupBatchName = (group) => {
  const firstJob = group.jobs[0];
  const backendName = firstJob?.batchName || firstJob?.batch_name;
  if (backendName) return backendName;

  if (group.batchId && !group.batchId.startsWith('single_')) {
    const storedName = analysisStore.getBatchName(group.batchId);
    if (storedName) return storedName;
  }

  return null;
};

// 当前上传批次ID
const currentBatchId = ref(null);

// 按批次ID分组的历史记录
const groupedHistory = computed(() => {
  const groups = {};
  analysisStore.historyList.forEach(job => {
    const batchId = job.batchId || 'single_' + job.analysisId;
    if (!groups[batchId]) {
      groups[batchId] = {
        batchId: batchId,
        jobs: [],
        createdAt: job.createdAt,
        hasFolder: false
      };
    }
    groups[batchId].jobs.push(job);
  });

  Object.values(groups).forEach(g => {
    g.hasFolder = g.jobs.length > 1;
  });

  return Object.values(groups).sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
});

const allAnalysisIds = computed(() => {
  return analysisStore.historyList.map(job => job.analysisId);
});

const singleSelectedJob = computed(() => {
  const ids = getCompletedSelectedIds();
  if (ids.length === 1) {
    return analysisStore.historyList.find(job => job.analysisId === ids[0]) || analysisStore.selectedJob;
  }
  return analysisStore.selectedJob;
});

const completedAnalysisIds = computed(() => {
  return analysisStore.historyList
    .filter(job => job.status === 'completed')
    .map(job => job.analysisId);
});

const selectedCompletedCount = computed(() => {
  const completedSet = new Set(completedAnalysisIds.value);
  return selectedAnalysisIds.value.filter(id => completedSet.has(id)).length;
});

const exportProgressPercent = computed(() => {
  const total = excelStore.taskTotal;
  const progress = excelStore.taskProgress;
  if (!total || total <= 0) return 0;
  return Math.min(100, Math.round((progress / total) * 100));
});

const isAllSelected = computed(() => {
  return allAnalysisIds.value.length > 0 &&
    allAnalysisIds.value.every(id => selectedAnalysisIds.value.includes(id));
});

const isIndeterminate = computed(() => {
  const total = allAnalysisIds.value.length;
  if (total === 0) return false;
  const selected = selectedAnalysisIds.value.filter(id => allAnalysisIds.value.includes(id)).length;
  return selected > 0 && selected < total;
});

const toggleSelectAll = () => {
  if (isAllSelected.value) {
    selectedAnalysisIds.value = [];
  } else {
    selectedAnalysisIds.value = [...allAnalysisIds.value];
  }
};

const folderAllIds = (group) => {
  return group.jobs.map(job => job.analysisId);
};

const isFolderAllSelected = (group) => {
  const ids = folderAllIds(group);
  return ids.length > 0 && ids.every(id => selectedAnalysisIds.value.includes(id));
};

const isFolderIndeterminate = (group) => {
  const ids = folderAllIds(group);
  if (ids.length === 0) return false;
  const selected = ids.filter(id => selectedAnalysisIds.value.includes(id)).length;
  return selected > 0 && selected < ids.length;
};

const toggleFolderSelectAll = (group) => {
  const ids = folderAllIds(group);
  if (isFolderAllSelected(group)) {
    selectedAnalysisIds.value = selectedAnalysisIds.value.filter(id => !ids.includes(id));
  } else {
    const set = new Set([...selectedAnalysisIds.value, ...ids]);
    selectedAnalysisIds.value = [...set];
  }
};

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

// 打开下载弹窗（根据选中数量自动决定类型）
const openDownloadDialog = () => {
  const ids = getCompletedSelectedIds();
  if (ids.length === 0) {
    analysisStore.setError('请先勾选至少一个已完成的任务');
    return;
  }
  const jobOf = (id) => analysisStore.historyList.find(j => j.analysisId === id) || analysisStore.selectedJob;
  const jobs = ids.map(jobOf).filter(Boolean);

  // 记录自带后端算好的 group（分析大类），前端不再用 task_type 去猜族 ——
  // 后端新增一个大类时，前端这里零改动。
  const groups = new Set(jobs.map(job => job.group || props.group));
  if (groups.size > 1) {
    analysisStore.setError('所选记录属于不同的分析大类，数据项不同，请分开导出');
    return;
  }

  // 同一族内不同权重（leaf / leaf_our …）列定义完全相同，取第一条的任务类型向后端要列即可
  currentTaskType.value = jobs[0]?.taskType || props.group;
  currentDownloadType.value = ids.length === 1 ? 'single' : 'batch';
  showDownloadDialog.value = true;
};

// 关闭弹窗
const closeDownloadDialog = () => {
  showDownloadDialog.value = false;
  currentDownloadType.value = 'single';
};

// 处理Excel下载
const handleExcelDownload = async (downloadData) => {
  let success = false;
  if (downloadData.type === 'single') {
    const id = selectedAnalysisIds.value[0] || analysisStore.selectedJob?.analysisId;
    if (!id) return;
    const job = analysisStore.historyList.find(j => j.analysisId === id) || analysisStore.selectedJob;
    const originalFilename = job?.originalFilename || '';
    success = await excelStore.downloadSingleExcelAction(id, originalFilename, downloadData.columns, downloadData.unit, currentTaskType.value);
  } else if (downloadData.type === 'batch') {
    success = await excelStore.downloadBatchExcelAction(selectedAnalysisIds.value, downloadData.columns, downloadData.unit, currentTaskType.value);
  } else if (downloadData.type === 'summary') {
    success = await excelStore.downloadExcelSummaryAction(downloadData.columns, downloadData.unit, currentTaskType.value);
  }
  if (success) {
    console.log('Excel download initiated:', downloadData.type, selectedAnalysisIds.value.length, 'items');
  }
};

const getCompletedSelectedIds = () => {
  const completedSet = new Set(completedAnalysisIds.value);
  return selectedAnalysisIds.value.filter(id => completedSet.has(id));
};

const batchExportJson = async () => {
  const ids = getCompletedSelectedIds();
  if (ids.length === 0) {
    analysisStore.setError('选中的记录里没有已完成的任务，无法导出 JSON。');
    return;
  }
  isExporting.value = true;
  try {
    if (ids.length === 1) {
      const job = analysisStore.historyList.find(j => j.analysisId === ids[0]) || analysisStore.selectedJob;
      const originalFilename = job?.originalFilename || '';
      await exportService.exportSingleJson(ids[0], originalFilename);
      console.log('Single JSON export successful');
    } else {
      await exportService.batchExportJson(ids);
      console.log('Batch JSON export successful');
    }
    selectedAnalysisIds.value = selectedAnalysisIds.value.filter(id => !ids.includes(id));
  } catch (err) {
    console.error('JSON export failed:', err);
  } finally {
    isExporting.value = false;
  }
};

const handleBatchDelete = async () => {
  const count = selectedAnalysisIds.value.length;
  if (count === 0) {
    analysisStore.setError('请先勾选要删除的记录（每条记录前面的复选框），再点删除。');
    return;
  }
  const ids = [...selectedAnalysisIds.value];
  askConfirm({
    title: '批量删除记录',
    message: `确定要删除选中的 ${count} 条记录吗？此操作不可恢复，关联的原图、标注图和 JSON 文件会一并清理。`,
    confirmText: `删除 ${count} 条`,
    danger: true,
    onConfirm: async () => {
      const result = await analysisStore.batchDeleteAction(ids);
      if (!result) return;
      const skipped = result.skipped_ids || [];
      selectedAnalysisIds.value = selectedAnalysisIds.value.filter(id => !ids.includes(id));
      notice.value = skipped.length > 0
        ? `成功删除 ${result.deleted_count}/${result.total_requested} 条记录，${skipped.length} 条删除失败`
        : `成功删除 ${result.deleted_count} 条记录`;
    },
  });
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

watch(() => analysisStore.selectedJob, (newJob) => {
  if (newJob) {
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

    if (isPendingStatus(newJob.status)) {
      startPolling(newJob.analysisId);
    } else {
      stopPolling();
    }
  } else {
    stopPolling();
  }
});

// 组件挂载时切到本页的分类，再取历史和模型列表（都跟着分类过滤）
onMounted(() => {
  analysisStore.setHistoryGroup(props.group);
  analysisStore.fetchHistoryAction();
  analysisStore.fetchModelsAction();
});

// 处理文件选择（支持单文件和多文件选择）
const selectedFiles = ref([]);
const selectedFolderFiles = ref([]);
const folderInput = ref(null);

// 上传进度条
const uploadProgress = ref({
  visible: false,
  percent: 0,
  currentFile: '',
  completed: 0,
  total: 0,
  phase: 'uploading'
});

// 待处理文件预览
const previewPendingFile = ref(null);
const blobUrls = new Set();

const getOriginalImageUrl = () => {
  if (previewPendingFile.value) {
    return previewPendingFile.value.blobUrl;
  }
  return analysisStore.selectedJob?.originalImageUrl;
};

const isPreviewingFile = (listType, index) => {
  if (!previewPendingFile.value) return false;
  return previewPendingFile.value.listType === listType && previewPendingFile.value.index === index;
};

const previewFromPendingList = (file, listType, index) => {
  resetScale('original');
  imageStatus.original = { loaded: false, error: false };

  const blobUrl = URL.createObjectURL(file);
  blobUrls.add(blobUrl);

  previewPendingFile.value = {
    file,
    blobUrl,
    listType,
    index,
    name: file.name
  };
};

const clearPreviewPendingFile = () => {
  if (previewPendingFile.value) {
    const url = previewPendingFile.value.blobUrl;
    if (blobUrls.has(url)) {
      URL.revokeObjectURL(url);
      blobUrls.delete(url);
    }
    previewPendingFile.value = null;
  }
};

const handleFileSelect = (event) => {
  const files = Array.from(event.target.files).filter(file => file.type.startsWith('image/'));
  if (files.length > 0) {
    selectedFiles.value = files;
    uploadSuccessMessage.value = '';
    analysisStore.setError(null);
    clearPreviewPendingFile();
  } else {
    selectedFiles.value = [];
    clearPreviewPendingFile();
  }
};

const removeSelectedFile = (index) => {
  if (previewPendingFile.value && previewPendingFile.value.listType === 'single' && previewPendingFile.value.index === index) {
    clearPreviewPendingFile();
  } else if (previewPendingFile.value && previewPendingFile.value.listType === 'single' && previewPendingFile.value.index > index) {
    previewPendingFile.value.index--;
  }
  selectedFiles.value.splice(index, 1);
};

const removeFolderFile = (index) => {
  if (previewPendingFile.value && previewPendingFile.value.listType === 'folder' && previewPendingFile.value.index === index) {
    clearPreviewPendingFile();
  } else if (previewPendingFile.value && previewPendingFile.value.listType === 'folder' && previewPendingFile.value.index > index) {
    previewPendingFile.value.index--;
  }
  selectedFolderFiles.value.splice(index, 1);
};

// 处理文件夹选择
const handleFolderSelect = (event) => {
  const files = Array.from(event.target.files).filter(file => file.type.startsWith('image/'));
  if (files.length > 0) {
    selectedFolderFiles.value = files;
    uploadSuccessMessage.value = '';
    analysisStore.setError(null);
    clearPreviewPendingFile();
  } else {
    selectedFolderFiles.value = [];
    clearPreviewPendingFile();
  }
};

// 处理文件夹上传
const handleFolderUpload = async () => {
  if (selectedFolderFiles.value.length === 0) {
    analysisStore.setError('请先选择文件夹！');
    return;
  }
  uploadSuccessMessage.value = '';
  analysisStore.isLoading = true;

  const totalFiles = selectedFolderFiles.value.length;
  const folderName = extractFolderName(selectedFolderFiles.value);
  uploadProgress.value = {
    visible: true,
    percent: 0,
    currentFile: '文件夹批量上传中',
    completed: 0,
    total: totalFiles,
    phase: 'uploading'
  };

  console.log(`上传文件夹 "${folderName}"，共 ${totalFiles} 个文件，使用模型: ${analysisStore.currentModelName}`);
  let response = null;
  beginCriticalOperation();
  try {
    // 整个文件夹一次请求：交给后端建一个批次（不传 batchId，由后端生成）
    response = await analysisStore.uploadAnalysisAction(
      selectedFolderFiles.value,
      analysisStore.currentModelName,
      (percent) => { uploadProgress.value.percent = percent; },
      folderName,
      null,
      false            // loading 由本页面统一管理
    );
  } finally {
    analysisStore.isLoading = false;
    endCriticalOperation();
  }

  if (response) {
    uploadProgress.value.percent = 100;
    uploadProgress.value.phase = 'done';
    uploadProgress.value.currentFile = '上传完成，后端处理中...';
    setTimeout(() => { uploadProgress.value.visible = false; }, 2500);
    uploadSuccessMessage.value = `已成功提交 ${totalFiles} 个文件进行批量处理...`;

    let batchId = null;
    if (Array.isArray(analysisStore.historyList) && analysisStore.historyList.length > 0) {
      const latestJob = analysisStore.historyList[0];
      batchId = latestJob.batchId || null;
    }
    analysisStore.startBatchProgressPolling(props.group, totalFiles, batchId);
  } else {
    uploadProgress.value.visible = false;
  }

  selectedFolderFiles.value = [];
  clearPreviewPendingFile();
  if (folderInput.value) {
    folderInput.value.value = '';
  }

  // 上传新文件后清空已刷新任务记录
  refreshedJobs.value.clear();

  // 开始轮询最新上传任务的状态
  if (analysisStore.historyList.length > 0) {
    const latestJob = analysisStore.historyList[0];
    if (isPendingStatus(latestJob.status)) {
      startPolling(latestJob.analysisId);
    }
  }
};

let pollingInterval = null;

const stopPolling = () => {
  if (pollingInterval) {
    clearInterval(pollingInterval);
    pollingInterval = null;
  }
};

const startPolling = (analysisId) => {
  stopPolling();

  pollingInterval = setInterval(async () => {
    await analysisStore.fetchHistoryAction(false);

    const job = analysisStore.historyList.find(j => j.analysisId === analysisId);
    // 只有真正结束（completed / failed）才停；排队或被取走跑都继续轮询
    if (job && isFinishedStatus(job.status)) {
      stopPolling();
      if (job.status === 'completed') {
        uploadSuccessMessage.value = `文件处理完成！`;
      } else {
        uploadSuccessMessage.value = '';
      }
    }
  }, 2000);
};

// 处理文件上传
const handleFileUpload = async () => {
  if (selectedFiles.value.length === 0) {
    analysisStore.setError('请先选择图片文件！');
    return;
  }
  uploadSuccessMessage.value = '';
  analysisStore.isLoading = true;

  currentBatchId.value = generateBatchId();
  const uploadedCount = [];

  const totalFiles = selectedFiles.value.length;
  const batchName = totalFiles > 1 ? `批量上传 (${totalFiles} 个文件)` : null;
  let completedIndex = 0;

  uploadProgress.value = {
    visible: true,
    percent: 0,
    currentFile: '',
    completed: 0,
    total: totalFiles,
    phase: 'uploading'
  };

  beginCriticalOperation();
  try {
    for (const file of selectedFiles.value) {
      const currentIdx = completedIndex + 1;
      uploadProgress.value.currentFile = `[${currentIdx}/${totalFiles}] ${file.name}`;
      uploadProgress.value.completed = completedIndex;

      const updatePercent = (p) => {
        uploadProgress.value.percent = Math.round(((completedIndex * 100) + p) / totalFiles);
      };

      console.log(`上传文件: ${file.name}, 使用模型: ${analysisStore.currentModelName}, 批次ID: ${currentBatchId.value}`);
      // 逐个上传，但共用同一个 currentBatchId，后端把它们归为同一批次
      const success = await analysisStore.uploadAnalysisAction(
        [file],
        analysisStore.currentModelName,
        updatePercent,
        batchName,
        currentBatchId.value,
        false          // loading 由本页面统一管理
      );
      if (success) {
        uploadedCount.push(file.name);
      }
      completedIndex++;
      await new Promise(resolve => setTimeout(resolve, 200));
    }
  } finally {
    analysisStore.isLoading = false;
    endCriticalOperation();
  }

  if (uploadedCount.length > 0) {
    uploadProgress.value.percent = 100;
    uploadProgress.value.phase = 'done';
    uploadProgress.value.currentFile = `全部 ${uploadedCount.length} 个文件上传完成，后端处理中...`;
    uploadProgress.value.completed = totalFiles;
    setTimeout(() => { uploadProgress.value.visible = false; }, 2500);

    analysisStore.startBatchProgressPolling(props.group, totalFiles, currentBatchId.value);

    if (uploadedCount.length === 1) {
      uploadSuccessMessage.value = `文件 "${uploadedCount[0]}" 已成功提交后台处理...`;
    } else {
      uploadSuccessMessage.value = `已成功提交 ${uploadedCount.length} 个文件进行处理...`;
    }
  } else {
    uploadProgress.value.visible = false;
  }

  selectedFiles.value = [];
  clearPreviewPendingFile();
  if (fileInput.value) {
    fileInput.value.value = '';
  }

  // 上传新文件后清空已刷新任务记录，因为会有新任务加入
  refreshedJobs.value.clear();

  // 开始轮询最新上传任务的状态
  if (analysisStore.historyList.length > 0) {
    const latestJob = analysisStore.historyList[0];
    if (isPendingStatus(latestJob.status)) {
      startPolling(latestJob.analysisId);
    }
  }
};

// 处理选中历史记录
const selectJob = (job) => {
  clearPreviewPendingFile();
  uploadSuccessMessage.value = '';
  analysisStore.selectJobAction(job);
};

// 删除分割记录
const deleteJob = async (analysisId, filename) => {
  askConfirm({
    title: '删除记录',
    message: `确定要删除记录「${filename}」吗？此操作不可撤销，原图、标注图和结果文件会一并清除。`,
    confirmText: '删除',
    danger: true,
    onConfirm: async () => {
      const ok = await analysisStore.deleteJobAction(analysisId);
      if (ok) {
        notice.value = `记录「${filename}」已删除`;
        console.log(`记录 "${filename}" 已成功删除`);
      }
    },
  });
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
onUnmounted(() => {
  window.removeEventListener('mousemove', handleGlobalMouseMove);
  window.removeEventListener('mouseup', handleGlobalMouseUp);
  clearPreviewPendingFile();
  blobUrls.forEach(url => URL.revokeObjectURL(url));
  blobUrls.clear();
  if (pollingInterval) {
    clearInterval(pollingInterval);
    pollingInterval = null;
  }
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

// 翻译 modelUsed 字段（三种值：实际名 / "default" / null）
const displayModelUsed = (val) => {
  if (!val) return null;          // null / undefined / '' — 老数据，不显示
  if (val === 'default') return '默认模型';
  return val;                     // 实际模型名，直接展示
};

</script>


<style scoped>
.card {
  margin: 0;
  padding: 5px;
  border-radius: var(--radius-lg);
  background: rgba(255, 255, 255, 0.92);
  backdrop-filter: blur(12px);
  box-shadow: var(--shadow-md);
  border: 1px solid var(--color-border-light);
}

h3 {
  margin: 0 0 5px;
  padding-bottom: 12px;
  font-size: 1.05em;
  font-weight: 700;
  color: var(--color-text-primary);
  border-bottom: 1px solid var(--color-border-light);
  display: flex;
  align-items: center;
  gap: 8px;
}

h3::before {
  content: '';
  display: inline-block;
  width: 4px;
  height: 18px;
  background: linear-gradient(180deg, var(--color-primary-green), var(--color-primary-green-light));
  border-radius: 2px;
}

.main-area {
  display: flex;
  gap: 5px;
  align-items: stretch;
  height: 100%;
  width: 100%;
  box-sizing: border-box;
  animation: pageIn 0.4s ease-out;
}

@keyframes pageIn {
  from { opacity: 0; transform: translateY(10px); }
  to { opacity: 1; transform: translateY(0); }
}

.upload-sidebar {
  margin: 0;
  padding: 5px;
  background: rgba(255, 255, 255, 0.92);
  backdrop-filter: blur(12px);
  border-radius: var(--radius-lg);
  box-shadow: var(--shadow-md);
  border: 1px solid var(--color-border-light);
  flex: 0 0 190px;
  order: 0;
  display: flex;
  flex-direction: column;
}

.sidebar-title {
  margin: 0;
  padding: 10px 4px 8px;
  font-size: 1em;
  font-weight: 700;
  color: var(--color-text-primary);
  border: none;
}

.upload-controls {
  display: flex;
  flex-direction: column;
  align-items: stretch;
  gap: 5px;
  flex: 1;
  min-height: 0;
  padding: 8px 4px;
}

.model-select {
  margin-bottom: 5px;
}

.model-select label {
  display: block;
  margin-bottom: 4px;
  font-size: 0.84em;
  font-weight: 600;
  color: var(--color-text-muted);
}

.model-select select {
  padding: 8px 12px;
  border: 1.5px solid var(--color-border);
  border-radius: var(--radius-md);
  background-color: var(--color-surface);
  width: 100%;
  box-sizing: border-box;
  font-size: 0.88em;
}

.file-input-label,
.folder-input-label {
  position: relative;
  display: block;
  width: 100%;
  padding: 10px 14px;
  border-radius: var(--radius-md);
  cursor: pointer;
  font-size: 0.88em;
  font-weight: 500;
  transition: all var(--transition-normal);
  border: 1.5px dashed var(--color-border);
  background: var(--color-surface);
  color: var(--color-text-secondary);
  text-align: center;
  box-sizing: border-box;
}

.file-input-label:hover:not(:disabled),
.folder-input-label:hover:not(:disabled) {
  background: var(--color-primary-green-lightest);
  border-color: var(--color-primary-green);
  color: var(--color-primary-green-dark);
  transform: translateY(-1px);
}

.file-input-label input[type="file"],
.folder-input-label input[type="file"] {
  position: absolute;
  opacity: 0;
  pointer-events: none;
}

.file-input-label:has(input:disabled),
.folder-input-label:has(input:disabled) {
  background-color: var(--color-border-light);
  cursor: not-allowed;
  opacity: 0.6;
}

.upload-button,
.folder-upload-button {
  width: 100%;
  padding: 10px 12px;
  box-sizing: border-box;
  font-size: 0.88em;
  font-weight: 600;
}

.folder-upload-button {
  background: linear-gradient(135deg, #42a5f5, #1976d2);
  box-shadow: 0 2px 8px rgba(25, 118, 210, 0.3);
}

.folder-upload-button:hover:not(:disabled) {
  transform: translateY(-1px);
  box-shadow: 0 4px 12px rgba(25, 118, 210, 0.4);
}

.batch-model-tag {
  font-size: 0.7em;
  background: linear-gradient(135deg, var(--color-primary-green-lightest), var(--color-primary-green-bg));
  color: var(--color-primary-green-dark);
  padding: 2px 8px;
  border-radius: 50px;
  margin-left: 6px;
  white-space: nowrap;
  max-width: 110px;
  overflow: hidden;
  text-overflow: ellipsis;
  flex-shrink: 0;
  border: 1px solid rgba(76, 175, 80, 0.2);
}

.job-model-tag {
  font-size: 0.68em;
  background: linear-gradient(135deg, var(--color-primary-green-lightest), var(--color-primary-green-bg));
  color: var(--color-primary-green-dark);
  padding: 1px 6px;
  border-radius: 50px;
  margin-left: 4px;
  white-space: nowrap;
  max-width: 90px;
  overflow: hidden;
  text-overflow: ellipsis;
  flex-shrink: 0;
  border: 1px solid rgba(76, 175, 80, 0.2);
}

.right-panel {
  flex: 49;
  order: 2;
  display: flex;
  flex-direction: column;
  gap: 5px;
  min-width: 0;
}

.upper-panel {
  flex: 1;
  min-height: 0;
  display: flex;
  flex-direction: column;
}

.pending-group {
  flex: 1;
  min-height: 0;
  display: flex;
  flex-direction: column;
}

.pending-group-title {
  font-size: 0.8em;
  font-weight: 600;
  color: var(--color-text-muted);
  margin-bottom: 6px;
  padding: 6px 10px;
  background: var(--color-primary-green-bg);
  border-radius: var(--radius-md);
  text-transform: uppercase;
  letter-spacing: 0.5px;
}

.pending-list {
  list-style: none;
  margin: 0;
  padding: 0;
  overflow-y: auto;
  flex: 1;
  min-height: 0;
}

.pending-item {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 8px 10px;
  font-size: 0.85em;
  border-radius: var(--radius-md);
  margin-bottom: 3px;
  transition: all var(--transition-fast);
}

.pending-item.clickable {
  cursor: pointer;
}

.pending-item.clickable:hover {
  background: var(--color-primary-green-bg);
  transform: translateX(2px);
}

.pending-item.is-previewing {
  background: linear-gradient(135deg, var(--color-primary-green-lightest), var(--color-primary-green-bg));
  border: 1px solid var(--color-primary-green);
  box-shadow: 0 0 0 2px rgba(76, 175, 80, 0.15);
  font-weight: 500;
}

.pending-icon {
  flex-shrink: 0;
  font-size: 1em;
}

.pending-name {
  flex: 1;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  font-weight: 500;
  color: var(--color-text-secondary);
}

.pending-size {
  color: var(--color-text-muted);
  flex-shrink: 0;
  font-size: 0.82em;
}

.pending-remove {
  background: var(--color-error-light);
  border: none;
  color: var(--color-error);
  font-size: 0.95em;
  cursor: pointer;
  padding: 2px 6px;
  line-height: 1;
  flex-shrink: 0;
  border-radius: var(--radius-sm);
  transition: all var(--transition-fast);
}

.pending-remove:hover {
  background: var(--color-error);
  color: white;
  transform: scale(1.1);
}

.no-pending {
  color: var(--color-text-muted);
  text-align: center;
  padding: 24px 12px;
  font-size: 0.85em;
  margin: 0;
}

.upload-progress-panel {
  margin-top: 5px;
  padding: 12px 14px;
  background: linear-gradient(135deg, rgba(76, 175, 80, 0.08), rgba(76, 175, 80, 0.02));
  border: 1px solid rgba(76, 175, 80, 0.2);
  border-radius: var(--radius-md);
}

.upload-progress-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 8px;
  gap: 8px;
}

.upload-progress-label {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 0.82em;
  color: var(--color-text-primary);
  font-weight: 500;
  min-width: 0;
}

.upload-progress-spinner {
  width: 14px;
  height: 14px;
  border: 2px solid rgba(76, 175, 80, 0.25);
  border-top-color: var(--color-accent);
  border-radius: 50%;
  animation: spin 0.7s linear infinite;
  flex-shrink: 0;
}

.upload-progress-spinner.done {
  border-color: var(--color-accent);
  animation: none;
  background: var(--color-accent);
  position: relative;
}

.upload-progress-spinner.done::after {
  content: '';
  position: absolute;
  left: 3px;
  top: 0px;
  width: 4px;
  height: 8px;
  border: solid white;
  border-width: 0 2px 2px 0;
  transform: rotate(45deg);
}

@keyframes spin {
  to { transform: rotate(360deg); }
}

.upload-progress-percent {
  font-size: 0.9em;
  font-weight: 600;
  color: var(--color-accent);
  flex-shrink: 0;
}

.upload-progress-track {
  width: 100%;
  height: 8px;
  background: rgba(0, 0, 0, 0.06);
  border-radius: 999px;
  overflow: hidden;
}

.upload-progress-fill {
  height: 100%;
  background: linear-gradient(90deg, var(--color-accent), #66bb6a);
  border-radius: 999px;
  transition: width 0.15s ease-out;
  position: relative;
}

.upload-progress-fill::after {
  content: '';
  position: absolute;
  inset: 0;
  background: linear-gradient(90deg, transparent, rgba(255, 255, 255, 0.3), transparent);
  animation: shimmer 1.5s infinite;
}

.upload-progress-fill.done {
  background: linear-gradient(90deg, #2e7d32, #43a047);
}

.upload-progress-fill.done::after {
  animation: none;
}

@keyframes shimmer {
  0% { transform: translateX(-100%); }
  100% { transform: translateX(100%); }
}

.job-list-section {
  flex: 1;
  min-height: 0;
  display: flex;
  flex-direction: column;
}

.section-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 5px;
  flex-wrap: wrap;
  gap: 10px;
}

.section-title-row {
  display: flex;
  align-items: center;
  gap: 4px;
}

.section-header h3 {
  margin-bottom: 0;
  border-bottom: none;
  padding-bottom: 0;
}

.section-actions {
  display: flex;
  gap: 8px;
  flex-wrap: wrap;
}

.select-all-checkbox {
  display: inline-flex;
  align-items: center;
  gap: 7px;
  font-size: 0.85em;
  color: var(--color-text-secondary);
  cursor: pointer;
  user-select: none;
  white-space: nowrap;
  padding: 4px 8px;
  border-radius: var(--radius-md);
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
}

.select-all-checkbox:hover {
  background-color: var(--color-border-light);
}

.select-all-checkbox.has-selection {
  color: var(--color-primary-green-dark);
}

.select-all-checkbox input[type="checkbox"] {
  position: absolute;
  opacity: 0;
  width: 0;
  height: 0;
  pointer-events: none;
}

.checkbox-box {
  position: relative;
  width: 16px;
  height: 16px;
  border: 2px solid var(--color-border);
  border-radius: 4px;
  background: var(--color-surface);
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
  flex-shrink: 0;
}

.select-all-checkbox:hover .checkbox-box {
  border-color: var(--color-primary-green-light);
}

.select-all-checkbox input[type="checkbox"]:checked + .checkbox-box,
.select-all-checkbox input[type="checkbox"]:indeterminate + .checkbox-box {
  border-color: var(--color-primary-green);
  background: var(--color-primary-green);
  box-shadow: 0 2px 6px rgba(76, 175, 80, 0.35);
  transform: scale(1.05);
}

.select-all-checkbox input[type="checkbox"]:indeterminate + .checkbox-box::before {
  content: '';
  position: absolute;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  width: 9px;
  height: 2px;
  background: white;
  border-radius: 1px;
  animation: checkPop 0.3s cubic-bezier(0.4, 0, 0.2, 1);
}

.checkbox-check {
  position: absolute;
  top: 50%;
  left: 50%;
  width: 9px;
  height: 5px;
  border-left: 2px solid white;
  border-bottom: 2px solid white;
  transform: translate(-50%, -50%) rotate(-45deg) scale(0);
  transition: transform 0.3s cubic-bezier(0.4, 0, 0.2, 1);
  opacity: 0;
}

.select-all-checkbox input[type="checkbox"]:checked + .checkbox-box .checkbox-check {
  transform: translate(-50%, -60%) rotate(-45deg) scale(1);
  opacity: 1;
  animation: checkPop 0.35s cubic-bezier(0.34, 1.56, 0.64, 1);
}

@keyframes checkPop {
  0% { transform: translate(-50%, -50%) rotate(-45deg) scale(0.3); }
  50% { transform: translate(-50%, -70%) rotate(-45deg) scale(1.2); }
  100% { transform: translate(-50%, -60%) rotate(-45deg) scale(1); }
}

.select-all-checkbox.has-selection .checkbox-box {
  border-color: var(--color-primary-green-light);
  box-shadow: 0 0 0 3px rgba(76, 175, 80, 0.08);
}

.download-summary-button {
  background: linear-gradient(135deg, var(--color-primary-green), var(--color-primary-green-dark));
  color: white;
  padding: 7px 12px;
  border: none;
  border-radius: var(--radius-md);
  cursor: pointer;
  font-size: 0.82em;
  font-weight: 600;
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
  white-space: nowrap;
  box-shadow: 0 2px 6px rgba(76, 175, 80, 0.3);
}

.download-summary-button:hover:not(:disabled) {
  transform: translateY(-1px);
  box-shadow: 0 4px 10px rgba(76, 175, 80, 0.4);
}

.download-summary-button:disabled {
  cursor: not-allowed;
  transform: none;
  box-shadow: none;
  background: var(--color-border);
  opacity: 0.6;
}

.download-summary-button.json-batch {
  background: linear-gradient(135deg, #ffb300, #ef6c00);
  box-shadow: 0 2px 6px rgba(239, 108, 0, 0.3);
}

.download-summary-button.delete-batch {
  background: linear-gradient(135deg, #ef5350, #c62828);
  box-shadow: 0 2px 6px rgba(198, 40, 40, 0.3);
  width: auto;
}

.job-list {
  overflow-y: auto;
  flex-shrink: 1;
  max-height: 500px;
  list-style: none;
  padding: 0;
  margin: 0;
}

.batch-item {
  border: 1px solid var(--color-border-light);
  margin-bottom: 5px;
  border-radius: var(--radius-md);
  overflow: hidden;
  transition: all var(--transition-fast);
  background: var(--color-surface);
}

.batch-item:hover {
  border-color: var(--color-primary-green-light);
  box-shadow: var(--shadow-sm);
}

.batch-item.selected {
  background: linear-gradient(135deg, var(--color-primary-green-lightest), var(--color-primary-green-bg));
  border-color: var(--color-primary-green);
  box-shadow: 0 0 0 3px rgba(76, 175, 80, 0.1);
}

.batch-header {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 10px 14px;
  cursor: pointer;
  min-width: 0;
}

.batch-icon {
  font-size: 15px;
  flex-shrink: 0;
}

.folder-icon {
  font-size: 17px;
}

.file-icon {
  font-size: 15px;
}

.batch-label {
  font-weight: 600;
  flex-grow: 1;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  font-size: 0.88em;
  color: var(--color-text-primary);
}

.batch-timestamp {
  font-size: 0.75em;
  color: var(--color-text-muted);
  flex-shrink: 0;
}

.expand-button {
  background: transparent;
  border: none;
  font-size: 0.8em;
  color: var(--color-text-muted);
  flex-shrink: 0;
  cursor: pointer;
  padding: 4px 8px;
  border-radius: var(--radius-sm);
  transition: all var(--transition-fast);
}

.expand-button:hover {
  color: var(--color-primary-green-dark);
  background-color: var(--color-primary-green-lightest);
}

.expand-icon {
  display: inline-block;
  transition: transform var(--transition-normal);
}

.batch-item.expanded .expand-icon {
  transform: rotate(90deg);
}

.batch-content {
  list-style: none;
  padding: 4px 0;
  margin: 0;
  background-color: var(--color-surface);
  border-top: 1px solid var(--color-border-light);
}

.job-item {
  border: none;
  padding: 8px 14px 8px 36px;
  margin-bottom: 5px;
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 8px;
  border-radius: 0;
  transition: all var(--transition-fast);
}

.job-item:hover {
  background-color: var(--color-primary-green-bg);
}

.job-item.selected {
  background-color: var(--color-primary-green-lightest);
}

.job-item.nested {
  padding-left: 48px;
}

.job-info {
  display: flex;
  align-items: center;
  gap: 8px;
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
  margin-right: 4px;
  font-size: 0.86em;
  color: var(--color-text-secondary);
}

.delete-button {
  background: transparent;
  color: var(--color-text-muted);
  border: none;
  border-radius: 50%;
  width: 22px;
  height: 22px;
  cursor: pointer;
  font-size: 14px;
  font-weight: bold;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all var(--transition-fast);
  flex-shrink: 0;
}

.delete-button:hover:not(:disabled) {
  background: var(--color-error);
  color: white;
  transform: scale(1.1);
}

.delete-button:disabled {
  opacity: 0.4;
  cursor: not-allowed;
}

.status-indicator {
  width: 10px;
  height: 10px;
  border-radius: 50%;
  flex-shrink: 0;
  position: relative;
}

.status-indicator::after {
  content: '';
  position: absolute;
  inset: -2px;
  border-radius: 50%;
  opacity: 0;
  animation: statusPulse 2s ease-in-out infinite;
}

.status-indicator.status-processing {
  background-color: var(--color-warning);
}

.status-indicator.status-processing::after {
  background-color: rgba(245, 158, 11, 0.3);
  opacity: 1;
}

.status-indicator.status-completed {
  background-color: var(--color-success);
}

.status-indicator.status-failed {
  background-color: var(--color-error);
}

@keyframes statusPulse {
  0%, 100% { transform: scale(1); opacity: 0.6; }
  50% { transform: scale(1.6); opacity: 0; }
}

.no-jobs-message {
  color: var(--color-text-muted);
  text-align: center;
  padding: 24px 12px;
  font-size: 0.88em;
}

.image-group {
  flex: 51;
  order: 1;
  min-width: 0;
  display: flex;
  flex-direction: column;
  gap: 5px;
  padding: 0;
}

.image-section-wrapper {
  flex: 1;
  display: flex;
  flex-direction: column;
  padding: 0;
  min-height: 0;
  border-radius: var(--radius-lg);
  box-shadow: var(--shadow-md);
  background-color: rgba(255, 255, 255, 0.92);
  backdrop-filter: blur(12px);
  border: 1px solid var(--color-border-light);
  overflow: hidden;
  transition: box-shadow var(--transition-normal);
}

.image-section-wrapper:hover {
  box-shadow: var(--shadow-lg);
}

.image-group.placeholder {
  color: var(--color-text-muted);
  text-align: center;
  padding: 50px 20px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-style: normal;
  font-size: 0.95em;
}

.image-section {
  flex: 1;
  min-height: 0;
  display: flex;
  flex-direction: column;
  padding: 0;
  overflow: hidden;
  box-shadow: none;
  background-color: transparent;
  border-radius: 0;
}

.image-container {
  text-align: center;
  width: 100%;
  overflow: hidden;
  position: relative;
  flex: 1;
  min-height: 0;
}

.image-container > p {
  position: absolute;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  width: 80%;
  margin: 0;
  box-sizing: border-box;
}

.image-container h4 {
  position: absolute;
  top: 12px;
  left: 50%;
  transform: translateX(-50%);
  background: rgba(255, 255, 255, 0.92);
  backdrop-filter: blur(8px);
  padding: 6px 16px;
  border-radius: 50px;
  color: var(--color-text-secondary);
  font-weight: 600;
  font-size: 0.85em;
  z-index: 10;
  box-shadow: var(--shadow-sm);
  margin: 0;
  border: 1px solid var(--color-border-light);
}

.image-container img {
  max-width: 100%;
  height: 100%;
  max-height: 100%;
  object-fit: contain;
  border: none;
  background-color: #fafafa;
  display: block;
  margin: 0 auto;
  cursor: zoom-in;
  transition: transform 0.15s ease, opacity 0.25s ease;
  transform-origin: center center;
  user-select: none;
  -webkit-user-select: none;
  opacity: 1;
}

.image-container img.dragging {
  transition: none;
  cursor: grabbing;
}

.image-container img.loading {
  opacity: 0;
}

.scale-indicator {
  position: absolute;
  bottom: 12px;
  left: 50%;
  transform: translateX(-50%);
  background: rgba(0, 0, 0, 0.75);
  backdrop-filter: blur(8px);
  color: white;
  padding: 6px 14px;
  font-size: 11px;
  display: flex;
  align-items: center;
  gap: 10px;
  z-index: 10;
  border-radius: 50px;
  border: 1px solid rgba(255, 255, 255, 0.2);
}

.reset-button {
  background: var(--color-primary-green);
  color: white;
  border: none;
  border-radius: var(--radius-sm);
  padding: 3px 10px;
  font-size: 10px;
  font-weight: 600;
  cursor: pointer;
  transition: all var(--transition-fast);
}

.reset-button:hover {
  background: var(--color-primary-green-dark);
}

.status-completed {
  color: var(--color-success);
  text-align: center;
  font-style: normal;
  font-weight: 500;
}

.status-failed.error-message {
  color: var(--color-error);
}

.failed-detail {
  position: absolute;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  width: 80%;
  text-align: center;
  padding: 18px 12px;
  background: var(--color-error-light);
  border: 1.5px dashed var(--color-error);
  border-radius: var(--radius-lg);
}

.failed-detail .status-failed {
  margin: 0 0 6px;
  font-weight: 600;
}

.failed-error-msg {
  margin: 0 0 6px;
  font-size: 0.82em;
  color: var(--color-error);
  word-break: break-all;
}

.failed-meta {
  margin: 0;
  font-size: 0.78em;
  color: var(--color-text-muted);
}

.status-processing {
  color: var(--color-text-muted);
  text-align: center;
  font-style: normal;
}

.image-error {
  border: 1.5px dashed var(--color-error);
  padding: 20px;
  color: var(--color-error);
  border-radius: var(--radius-md);
}

.job-details {
  margin-top: 5px;
  font-size: 0.9em;
  color: var(--color-text-secondary);
  padding: 10px 12px;
  background: var(--color-primary-green-bg);
  border-radius: var(--radius-md);
}

.job-details p {
  margin-bottom: 6px;
}

.job-details strong {
  margin-right: 5px;
  color: var(--color-text-primary);
}

.status-tag {
  padding: 3px 10px;
  border-radius: 50px;
  font-size: 0.8em;
  color: white;
  font-weight: 600;
  min-width: 60px;
  text-align: center;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 6px;
}

.status-spinner {
  width: 10px;
  height: 10px;
  border: 1.5px solid rgba(255, 255, 255, 0.4);
  border-top-color: #ffffff;
  border-radius: 50%;
  animation: statusSpin 0.7s linear infinite;
}

@keyframes statusSpin {
  from { transform: rotate(0deg); }
  to { transform: rotate(360deg); }
}

.status-tag.status-processing {
  background: linear-gradient(135deg, var(--color-warning), #f57c00);
}

.status-tag.status-completed {
  background: linear-gradient(135deg, var(--color-success), #16a34a);
}

.status-tag.status-failed {
  background: linear-gradient(135deg, var(--color-error), #dc2626);
}

.status-tag.status-unselected {
  background: var(--color-border);
  color: var(--color-text-muted);
}

.folder-select-all {
  flex-shrink: 0;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  margin-right: 4px;
}

.folder-select-all input[type="checkbox"] {
  width: 15px;
  height: 15px;
  cursor: pointer;
}

.job-checkbox {
  flex-shrink: 0;
  width: 16px;
  height: 16px;
  cursor: pointer;
  margin-right: 4px;
  accent-color: var(--color-primary-green);
}

.batch-header .job-checkbox {
  margin-right: 2px;
}

.job-item .job-checkbox {
  margin-right: 6px;
}

.export-progress-bar {
  margin: 0 0 5px;
  padding: 12px 14px;
  background: linear-gradient(135deg, var(--color-primary-green-lightest), var(--color-primary-green-bg));
  border-radius: var(--radius-md);
  font-size: 0.84em;
  color: var(--color-primary-green-dark);
  border: 1px solid rgba(76, 175, 80, 0.2);
}

.export-progress-bar.export-sync {
  display: flex;
  align-items: center;
  font-weight: 500;
}

.export-progress-info {
  display: flex;
  justify-content: space-between;
  margin-bottom: 6px;
  font-weight: 500;
}

.export-progress-track {
  width: 100%;
  height: 8px;
  background: rgba(76, 175, 80, 0.15);
  border-radius: 4px;
  overflow: hidden;
}

.export-progress-fill {
  height: 100%;
  background: linear-gradient(90deg, var(--color-primary-green-light), var(--color-primary-green-dark));
  border-radius: 4px;
  transition: width 0.4s cubic-bezier(0.4, 0, 0.2, 1);
}

.error-message {
  animation: shake 0.4s ease-in-out;
}

.notice-message {
  margin: 6px 0;
  padding: 8px 12px;
  border-radius: var(--radius-md, 8px);
  font-size: 0.88em;
  color: var(--color-primary-green-dark, #2e7d32);
  background: var(--color-primary-green-bg, rgba(76, 175, 80, 0.12));
  border: 1px solid rgba(76, 175, 80, 0.25);
}
</style>