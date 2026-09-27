<template>
  <main class="main-area">

        <section class="upload-sidebar">
          <h3 class="sidebar-title">操作栏</h3>
          <div class="upload-controls">
            <div class="control-block">
              <label class="control-label" for="model-choice">分析类型</label>
              <select id="model-choice" v-model="selectedTaskType" :disabled="isUploadBusy">
                <option v-if="groupTaskTypes.length === 0" :value="groupDefaultTaskType">
                  {{ groupLabel }}（默认）
                </option>
                <option v-for="task in groupTaskTypes" :key="task.key" :value="task.key">
                  {{ task.name }}
                </option>
              </select>
              <p v-if="currentTaskModel" class="control-hint" :title="currentTaskModel">权重: {{ currentTaskModel }}</p>
              <p v-if="currentTaskNote" class="control-hint">{{ currentTaskNote }}</p>
            </div>

            <div
                class="control-block upload-dropzone"
                :class="{ 'is-dragging': isDraggingFiles }"
                @dragenter.prevent="isDraggingFiles = true"
                @dragover.prevent="isDraggingFiles = true"
                @dragleave.prevent="handleDragLeave"
                @drop.prevent="handleFileDrop"
            >
              <UploadCloud :size="28" aria-hidden="true" />
              <span class="dropzone-title">拖入图片</span>
              <div class="file-source-actions">
                <label class="file-input-label" title="选择一张或多张图片">
                  <input type="file" @change="handleFileSelect" accept="image/*,.tif,.tiff" :disabled="isUploadBusy" ref="fileInput" multiple />
                  <Images :size="16" aria-hidden="true" />
                  <span>选择图片</span>
                </label>

                <label class="folder-input-label" title="选择整个文件夹">
                  <input type="file" @change="handleFolderSelect" :webkitdirectory="true" :mozdirectory="true" :directory="true" accept="image/*,.tif,.tiff" :disabled="isUploadBusy" ref="folderInput" />
                  <FolderOpen :size="16" aria-hidden="true" />
                  <span>选择文件夹</span>
                </label>
              </div>
              <p class="control-hint">TIF、TIFF、PNG、JPG，可多选</p>
            </div>

            <div class="control-block">
              <button @click="handleFileUpload" :disabled="shouldDisableUploadButton({ fileCount: selectedFiles.length, busy: isUploadBusy })" class="primary upload-button">
                <Upload :size="16" aria-hidden="true" />
                {{ isUploadBusy ? '处理中...' : `上传图片并分割${groupNoun}` }}
              </button>

              <button @click="handleFolderUpload" :disabled="shouldDisableUploadButton({ fileCount: selectedFolderFiles.length, busy: isUploadBusy })" class="primary folder-upload-button">
                <FolderUp :size="16" aria-hidden="true" />
                {{ isUploadBusy ? '处理中...' : `上传文件夹并分割${groupNoun}` }}
              </button>
            </div>

            <div v-if="uploadProgress.active" class="upload-progress" role="status" aria-live="polite">
              <div class="progress-copy">
                <span>{{ uploadProgress.label }}</span>
                <strong>{{ uploadProgress.percent }}%</strong>
              </div>
              <div class="progress-track"><span :style="{ width: `${uploadProgress.percent}%` }"></span></div>
            </div>

            <div v-if="analysisStore.error" class="error-message">
              操作失败: {{ analysisStore.error }}
            </div>

          </div>

          <div class="job-details">
            <div class="detail-row">
              <span class="detail-label">状态</span>
              <span v-if="analysisStore.selectedJob" class="status-tag" :class="`status-${analysisStore.selectedJob.status}`">
                {{ translateStatus(analysisStore.selectedJob.status) }}
              </span>
              <span v-else class="status-tag status-unselected">未选中</span>
            </div>
            <div v-if="analysisStore.selectedJob" class="detail-row">
              <span class="detail-label">类型</span>
              <span class="type-badge">{{ translateTaskType(analysisStore.selectedJob.taskType) }}</span>
            </div>
            <div v-if="analysisStore.selectedJob && selectedJobDuration" class="detail-row">
              <span class="detail-label">耗时</span>
              <span class="detail-value">{{ selectedJobDuration }}</span>
            </div>
            <div v-if="analysisStore.selectedJob" class="result-links">
              <button v-if="analysisStore.selectedJob.status === 'completed'" @click="downloadSingleJson" class="download-button json"><FileJson :size="16" />下载 JSON</button>
              <button v-if="analysisStore.selectedJob.status === 'completed'" @click="openCurrentDownloadDialog" class="download-button excel"><TableProperties :size="16" />下载 Excel</button>
              <span v-if="analysisStore.selectedJob.status !== 'completed'" class="disabled-links-note">结果将在任务完成后可下载</span>
            </div>
          </div>

          <div
              v-if="isInitialHistoryLoading && !uploadSuccessMessage && !uploadProgress.active"
              class="loading-indicator"
          >
            正在加载历史...
          </div>
        </section>

        <div class="image-group" v-if="analysisStore.selectedJob">
          <div class="image-section-wrapper">
            <section class="image-section card">
              <header class="image-card-head">
                <h4>原始图片</h4>
                <div class="image-tools">
                  <button class="tool-btn" title="缩小" aria-label="缩小原始图片" @click="zoomBy('original', -0.25)"><ZoomOut :size="15" /></button>
                  <span class="tool-zoom">{{ (imageState.original.scale * 100).toFixed(0) }}%</span>
                  <button class="tool-btn" title="放大" aria-label="放大原始图片" @click="zoomBy('original', 0.25)"><ZoomIn :size="15" /></button>
                  <button class="tool-btn" title="适应窗口" aria-label="重置原始图片" @click="resetScale('original')"><Maximize2 :size="15" /></button>
                  <label class="tool-toggle" :class="{ active: syncZoom }" :title="syncZoom ? '关闭两图联动' : '开启两图联动'">
                    <input type="checkbox" v-model="syncZoom" />
                    <Link2 v-if="syncZoom" :size="14" />
                    <Unlink2 v-else :size="14" />
                    联动
                  </label>
                  <button v-if="originalDownloadUrl" class="tool-btn" title="在新标签页打开原图" aria-label="在新标签页打开原图" @click="openImageInNewTab(originalDownloadUrl)"><ExternalLink :size="15" /></button>
                </div>
              </header>
              <div class="image-container">
                <img
                    v-if="originalDisplayUrl"
                    :src="originalDisplayUrl"
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
                <div v-if="imageStatus.original.error" class="image-fallback">
                  <ImageOff class="fallback-icon" :size="36" aria-hidden="true" />
                  <p v-if="isTiffUrl(originalDownloadUrl)">原图为 TIFF 格式，浏览器无法直接预览</p>
                  <p v-else>无法加载原始图片</p>
                  <a v-if="analysisStore.selectedJob.originalFileUrl"
                     :href="analysisStore.selectedJob.originalFileUrl"
                     target="_blank" class="fallback-link">下载原图查看</a>
                </div>
                <div v-else-if="!originalDisplayUrl" class="image-fallback">
                  <ImageOff class="fallback-icon" :size="36" aria-hidden="true" />
                  <p>无原始图片记录</p>
                </div>
              </div>
            </section>
          </div>

          <div class="image-section-wrapper">
          <section class="image-section card">
            <header class="image-card-head">
              <h4>分割图片</h4>
              <div class="image-tools">
                <span v-if="analysisStore.selectedJob.status === 'queued'" class="mini-status queued">排队中</span>
                <span v-else-if="analysisStore.selectedJob.status === 'processing'" class="mini-status processing">处理中…</span>
                <span v-else-if="analysisStore.selectedJob.status === 'failed'" class="mini-status failed">分析失败</span>
                <button class="tool-btn" title="缩小" aria-label="缩小分割图片" @click="zoomBy('annotated', -0.25)"><ZoomOut :size="15" /></button>
                <span class="tool-zoom">{{ (imageState.annotated.scale * 100).toFixed(0) }}%</span>
                <button class="tool-btn" title="放大" aria-label="放大分割图片" @click="zoomBy('annotated', 0.25)"><ZoomIn :size="15" /></button>
                <button class="tool-btn" title="适应窗口" aria-label="重置分割图片" @click="resetScale('annotated')"><Maximize2 :size="15" /></button>
                <button v-if="annotatedDisplayUrl" class="tool-btn" title="在新标签页打开" aria-label="在新标签页打开分割图片" @click="openImageInNewTab(annotatedDisplayUrl)"><ExternalLink :size="15" /></button>
              </div>
            </header>
            <div class="image-container">
              <img
                  v-if="annotatedDisplayUrl"
                  :src="annotatedDisplayUrl"
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
              <div v-if="analysisStore.selectedJob.status === 'queued'" class="image-fallback">
                <span class="spinner"></span>
                <p>已排队，前面还有 {{ queueAheadCount }} 张待处理…</p>
                <p class="fallback-hint">分析按顺序逐张执行，以保证不占满机器</p>
              </div>
              <div v-else-if="analysisStore.selectedJob.status === 'processing'" class="image-fallback">
                <span class="spinner"></span>
                <p>正在分析，请稍候…</p>
              </div>
              <div v-else-if="analysisStore.selectedJob.status === 'failed'" class="image-fallback">
                <TriangleAlert class="fallback-icon" :size="36" aria-hidden="true" />
                <p>分析失败，请检查图片或更换模型后重试</p>
              </div>
              <div v-else-if="imageStatus.annotated.error" class="image-fallback">
                <ImageOff class="fallback-icon" :size="36" aria-hidden="true" />
                <p>无法加载标注图片</p>
              </div>
              <div v-else-if="!annotatedDisplayUrl" class="image-fallback">
                <ImageOff class="fallback-icon" :size="36" aria-hidden="true" />
                <p>暂无标注图片</p>
              </div>
            </div>
          </section>
          </div>
        </div>

        <section class="image-group card placeholder" v-else>
          <div class="placeholder-inner">
            <Microscope class="placeholder-icon" :size="42" aria-hidden="true" />
            <h3>还没有选择记录</h3>
            <p>在左侧上传{{ groupNoun }}图片开始分析，或从右侧「{{ groupNoun }}分割记录」里点开一条历史结果查看原图与分割对照。</p>
          </div>
        </section>

        <div class="right-panel">
          <section class="upper-panel card">
            <h3>待处理文件</h3>
            <div v-if="selectedFiles.length > 0" class="pending-group">
              <div class="pending-group-title">单张文件 ({{ selectedFiles.length }})</div>
              <ul class="pending-list">
                <li v-for="(file, index) in selectedFiles" :key="'s-'+index" class="pending-item">
                  <Image :size="16" class="pending-icon" aria-hidden="true" />
                  <span class="pending-name" :title="file.name">{{ file.name }}</span>
                  <span class="pending-size">({{ (file.size / 1024).toFixed(1) }} KB)</span>
                  <button @click="removeSelectedFile(index)" class="pending-remove" title="移除" :aria-label="`移除 ${file.name}`"><X :size="15" /></button>
                </li>
              </ul>
            </div>
            <div v-if="selectedFolderFiles.length > 0" class="pending-group">
              <div class="pending-group-title">文件夹文件 ({{ selectedFolderFiles.length }})</div>
              <ul class="pending-list">
                <li v-for="(file, index) in selectedFolderFiles" :key="'f-'+index" class="pending-item">
                  <Image :size="16" class="pending-icon" aria-hidden="true" />
                  <span class="pending-name" :title="file.name">{{ file.name }}</span>
                  <span class="pending-size">({{ (file.size / 1024).toFixed(1) }} KB)</span>
                  <button @click="removeFolderFile(index)" class="pending-remove" title="移除" :aria-label="`移除 ${file.name}`"><X :size="15" /></button>
                </li>
              </ul>
            </div>
            <p v-if="selectedFiles.length === 0 && selectedFolderFiles.length === 0" class="no-pending">暂无待处理文件</p>
          </section>

          <aside class="job-list-section card">
            <div class="section-header">
              <div class="section-title-group">
                <h3>{{ groupNoun }}分割记录</h3>
                <div class="history-filter">
                  <label for="history-type-filter">类型:</label>
                  <select
                      id="history-type-filter"
                      v-model="historyTypeFilter"
                      class="history-type-select"
                      :title="historyTypeFilter ? translateTaskType(historyTypeFilter) : '本类全部'"
                  >
                    <option value="">本类全部</option>
                    <option v-for="task in groupTaskTypes" :key="task.key" :value="task.key">
                      {{ task.name }}
                    </option>
                  </select>
                </div>
                <div class="history-filter">
                  <label for="history-status-filter">状态:</label>
                  <select
                      id="history-status-filter"
                      v-model="historyStatusFilter"
                      class="history-type-select"
                      aria-label="按状态筛选"
                  >
                    <option value="">全部</option>
                    <option value="queued">排队中</option>
                    <option value="processing">处理中</option>
                    <option value="completed">已完成</option>
                    <option value="failed">失败</option>
                  </select>
                </div>
              </div>
              <div class="section-actions">
                <label class="select-all-checkbox">
                  <input
                      type="checkbox"
                      :checked="isAllCompletedSelected"
                      :indeterminate="isIndeterminate"
                      @change="toggleSelectAll"
                  />
                  全选
                </label>
                <span class="selection-count" v-if="selectedAnalysisIds.length > 0">已选 {{ selectedAnalysisIds.length }} 项</span>
                <button
                    @click="batchExportJson"
                    :disabled="isExporting || actionBusy || selectedAnalysisIds.length === 0"
                    class="download-summary-button json-batch">
                  <FileJson :size="15" aria-hidden="true" />
                  {{ isExporting ? '导出中...' : `批量导出 JSON${selectedAnalysisIds.length > 0 ? ` (${selectedAnalysisIds.length})` : ''}` }}
                </button>
                <button
                    @click="openDownloadDialog"
                    :disabled="actionBusy || selectedAnalysisIds.length === 0"
                    class="download-summary-button">
                  <TableProperties :size="15" aria-hidden="true" />
                  {{ isExporting ? '处理中...' : `批量导出 Excel${selectedAnalysisIds.length > 0 ? ` (${selectedAnalysisIds.length})` : ''}` }}
                </button>
                <button
                    @click="handleBatchDelete"
                    :disabled="actionBusy || selectedAnalysisIds.length === 0"
                    class="download-summary-button delete-batch">
                  <Trash2 :size="15" aria-hidden="true" />
                  {{ batchDeleteBusy ? '删除中...' : `批量删除${selectedAnalysisIds.length > 0 ? ` (${selectedAnalysisIds.length})` : ''}` }}
                </button>
              </div>
            </div>
            <ul v-if="groupedHistory.length > 0" class="job-list">
            <template v-for="group in pagedGroupedHistory" :key="group.batchId">
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
                      v-if="isSelectableJob(group.jobs[0])"
                      type="checkbox"
                      :value="group.jobs[0].analysisId"
                      v-model="selectedAnalysisIds"
                      @click.stop
                      class="job-checkbox"
                  />
                  <span class="batch-icon">
                    <Folder v-if="group.hasFolder" class="folder-icon" :size="17" aria-hidden="true" />
                    <Image v-else class="file-icon" :size="16" aria-hidden="true" />
                  </span>
                  <span class="batch-label">
                    <template v-if="group.hasFolder">
                      文件夹 ({{ group.jobs.length }} 个文件)
                    </template>
                    <template v-else>
                      {{ group.jobs[0]?.originalFilename }}
                    </template>
                  </span>
                  <span class="type-badge" :title="`分析类型: ${translateTaskType(group.jobs[0]?.taskType)}`">
                    {{ translateTaskType(group.jobs[0]?.taskType) }}
                  </span>
                  <span class="batch-timestamp">{{ formatDate(group.createdAt) }}</span>
                  <button
                      v-if="group.hasFolder"
                      @click.stop="toggleBatch(group.batchId)"
                      class="expand-button"
                      title="展开/收起"
                  >
                    <ChevronRight class="expand-icon" :size="16" aria-hidden="true" />
                  </button>
                  <span v-if="!group.hasFolder" class="status-indicator" :class="`status-${group.jobs[0]?.status}`" :title="translateStatus(group.jobs[0]?.status)"></span>
                  <button
                      v-if="!group.hasFolder"
                      @click.stop="deleteJob(group.jobs[0].analysisId, group.jobs[0].originalFilename)"
                      :disabled="actionBusy"
                      class="delete-button"
                      title="删除记录"
                  >
                    <Trash2 :size="14" />
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
                        v-if="isSelectableJob(job)"
                        type="checkbox"
                        :value="job.analysisId"
                        v-model="selectedAnalysisIds"
                        @click.stop
                        class="job-checkbox"
                    />
                    <div class="job-info" @click.stop="selectJob(job)">
                      <span class="filename">{{ job.originalFilename }}</span>
                      <span class="type-badge" :title="`分析类型: ${translateTaskType(job.taskType)}`">
                        {{ translateTaskType(job.taskType) }}
                      </span>
                      <span class="status-indicator" :class="`status-${job.status}`" :title="translateStatus(job.status)"></span>
                    </div>
                    <button
                        @click.stop="deleteJob(job.analysisId, job.originalFilename)"
                        :disabled="actionBusy"
                        class="delete-button"
                        title="删除记录"
                    >
                      <Trash2 :size="14" />
                    </button>
                  </li>
                </ul>
              </li>
            </template>
          </ul>
          <p v-else-if="historyLoading" class="no-jobs-message">正在加载历史记录...</p>
          <p v-else class="no-jobs-message">{{ hasActiveHistoryFilter ? '没有符合筛选条件的记录。' : '暂无分析记录。' }}</p>
          <nav v-if="historyPageCount > 1" class="history-pagination" aria-label="分割记录分页">
            <button class="page-button" :disabled="historyPage === 1" @click="historyPage--" aria-label="上一页"><ChevronLeft :size="16" /></button>
            <span>第 {{ historyPage }} / {{ historyPageCount }} 页</span>
            <button class="page-button" :disabled="historyPage === historyPageCount" @click="historyPage++" aria-label="下一页"><ChevronRight :size="16" /></button>
          </nav>
          </aside>
        </div>

  </main>

  <!-- Excel下载数据项选择弹窗 -->
  <ExcelDownload
      :visible="showDownloadDialog"
      :download-type="currentDownloadType"
      :job="analysisStore.selectedJob"
      :selected-count="selectedAnalysisIds.length"
      :task-type="exportTaskType"
      @close="closeDownloadDialog"
      @download="handleExcelDownload"
  />
</template>



<script setup>
import { ref, onMounted, reactive, watch, computed } from 'vue';
import { useAnalysisStore } from '@/stores/analysis';
import { useExcelStore } from '@/stores/excel';
import { exportService } from '@/services/exportService';
import { processingJobIds } from '@/utils/analysisStatus';
import { formatDuration, recordDurationSeconds } from '@/utils/datetime';
import {
  actionBusyState,
  exportableRecordIds,
  isSelectableRecord,
  selectableRecordIds,
  selectionState,
  shouldDisableUploadButton,
  uploadBusyState,
  uploadProgressPercent,
} from '@/utils/uploadBusy';
import { getTaskGroup, groupTasks } from '@/utils/taskGroups';
import ExcelDownload from '@/components/ExcelDownload.vue';
import {
  ChevronLeft, ChevronRight, ExternalLink, FileJson, Folder, FolderOpen, FolderUp,
  Image, ImageOff, Images, Link2, Maximize2, Microscope, TableProperties,
  Trash2, TriangleAlert, Unlink2, Upload, UploadCloud, X, ZoomIn, ZoomOut,
} from '@lucide/vue';

// 本页负责的分析大类：stem=茎秆截面 / leaf=剑叶。
// 由路由外壳 views/AnalysisView.vue 用 <AnalysisWorkspace :group="group" /> 注入，
// 两个页面共用这同一份实现，UI 完全一致。
const props = defineProps({
  group: {
    type: String,
    required: true,
    validator: (value) => Boolean(getTaskGroup(value)),
  },
});

const analysisStore = useAnalysisStore();
const excelStore = useExcelStore();

// 当前大类的展示文案与默认分析类型
const groupMeta = computed(() => getTaskGroup(props.group));
const groupLabel = computed(() => groupMeta.value?.label || props.group);
const groupNoun = computed(() => groupMeta.value?.noun || '分析');
// 该大类下的后端分析类型列表（茎秆 1 个，剑叶 9 个）
const groupTaskTypes = computed(() => groupTasks(analysisStore.taskTypes, props.group));
// 该大类覆盖的任务 key 集合，用于把历史记录限制在本类内
const groupTaskKeys = computed(() => new Set(groupTaskTypes.value.map((task) => task.key)));
const groupDefaultTaskType = computed(() => groupMeta.value?.defaultTaskKey || '');

// Excel下载弹窗相关状态
const showDownloadDialog = ref(false);
const currentDownloadType = ref('summary'); // 'summary' 或 'single'

// JSON导出相关状态
const selectedAnalysisIds = ref([]);
const isExporting = ref(false);
const historyStatusFilter = ref('');
const historyPage = ref(1);
const HISTORY_PAGE_SIZE = 20;

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

const filteredHistoryJobs = computed(() => {
  let jobs = analysisStore.historyList.filter(
    job => !historyStatusFilter.value || job.status === historyStatusFilter.value
  );
  // 本页只展示本大类的记录：大类内可再按具体分析类型细分
  if (groupTaskKeys.value.size > 0) {
    jobs = jobs.filter(job => groupTaskKeys.value.has(job.taskType));
  }
  if (historyTypeFilter.value) {
    jobs = jobs.filter(job => job.taskType === historyTypeFilter.value);
  }
  return jobs;
});

const historyBatchSizes = computed(() => {
  const sizes = {};
  filteredHistoryJobs.value.forEach(job => {
    const batchId = job.batchId || 'single_' + job.analysisId;
    sizes[batchId] = (sizes[batchId] || 0) + 1;
  });
  return sizes;
});

// 按批次ID分组的历史记录
const groupedHistory = computed(() => {
  const groups = {};
  filteredHistoryJobs.value.forEach(job => {
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
    g.hasFolder = historyBatchSizes.value[g.batchId] > 1;
  });

  return Object.values(groups).sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
});

const historyPageCount = computed(() => Math.max(1, Math.ceil(groupedHistory.value.length / HISTORY_PAGE_SIZE)));
const pagedGroupedHistory = computed(() => {
  const start = (historyPage.value - 1) * HISTORY_PAGE_SIZE;
  return groupedHistory.value.slice(start, start + HISTORY_PAGE_SIZE);
});
const hasActiveHistoryFilter = computed(() => Boolean(historyTypeFilter.value || historyStatusFilter.value));

/**
 * 哪些记录可以勾选。
 *
 * 以前只有 `completed` 才渲染勾选框，导致**分析失败的记录既看不到勾选框也选不中**，
 * 批量删除对它完全不可用（用户反馈过）。现在把失败也算进来：
 * 失败记录最需要的操作恰恰是删掉重传。
 * 仍在排队/处理中的记录不给勾选框，避免删除正在跑的任务造成状态混乱。
 * 判定逻辑在 utils/uploadBusy.js 里，便于单测。
 */
const isSelectableJob = (job) => isSelectableRecord(job);

/** 当前勾选里可用于导出的部分（导出只对完成的结果有意义） */
const exportableSelectedIds = computed(
  () => exportableRecordIds(selectedAnalysisIds.value, analysisStore.historyList),
);

// 全选：覆盖所有可勾选的记录（完成 + 失败），与列表里的勾选框口径一致
const selectableAnalysisIds = computed(() => selectableRecordIds(filteredHistoryJobs.value));

const selectionStateValue = computed(
  () => selectionState(selectedAnalysisIds.value, selectableAnalysisIds.value),
);

const isAllCompletedSelected = computed(() => selectionStateValue.value.allSelected);

const isIndeterminate = computed(() => selectionStateValue.value.indeterminate);

const toggleSelectAll = () => {
  if (isAllCompletedSelected.value) {
    selectedAnalysisIds.value = [];
  } else {
    selectedAnalysisIds.value = [...selectableAnalysisIds.value];
  }
};

// 可勾选的记录：完成与失败都可以（失败最需要删除重传），排队/处理中的不算
const folderSelectableIds = (group) => selectableRecordIds(group.jobs);

const isFolderAllSelected = (group) => (
  selectionState(selectedAnalysisIds.value, folderSelectableIds(group)).allSelected
);

const isFolderIndeterminate = (group) => (
  selectionState(selectedAnalysisIds.value, folderSelectableIds(group)).indeterminate
);

const toggleFolderSelectAll = (group) => {
  const ids = folderSelectableIds(group);
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

// 下载当前展示图片的 Excel 报告（不受勾选影响）
const openCurrentDownloadDialog = () => {
  if (!analysisStore.selectedJob) {
    analysisStore.setError('请先选择一个任务');
    return;
  }
  // 导出目标就是当前查看的任务
  downloadDialogTargetId.value = analysisStore.selectedJob.analysisId || '';
  currentDownloadType.value = 'single';
  showDownloadDialog.value = true;
};

// 打开下载弹窗（根据选中数量自动决定类型）
const openDownloadDialog = () => {
  if (selectedAnalysisIds.value.length === 0) {
    analysisStore.setError('请先勾选至少一个已完成的任务');
    return;
  }
  // 勾选单个时按单条导出，导出目标为被勾选的那一条
  downloadDialogTargetId.value = selectedAnalysisIds.value.length === 1 ? selectedAnalysisIds.value[0] : '';
  currentDownloadType.value = selectedAnalysisIds.value.length === 1 ? 'single' : 'batch';
  showDownloadDialog.value = true;
};

// 关闭弹窗
const closeDownloadDialog = () => {
  showDownloadDialog.value = false;
  currentDownloadType.value = 'single';
  downloadDialogTargetId.value = '';
};

// 解析本次单条导出实际使用的任务ID与类型
const resolveSingleExportTarget = () => {
  const targetId = downloadDialogTargetId.value;
  if (targetId) {
    const job = analysisStore.historyList.find(item => item.analysisId === targetId);
    return { analysisId: targetId, taskType: job?.taskType || '' };
  }
  const job = analysisStore.selectedJob;
  return { analysisId: job?.analysisId || '', taskType: job?.taskType || '' };
};

// 处理Excel下载
const handleExcelDownload = async (downloadData) => {
  let success = false;
  if (downloadData.type === 'single') {
    // F1 修复：单条导出使用弹窗记录的导出目标，勾选集合只用于批量导出
    const { analysisId, taskType } = resolveSingleExportTarget();
    if (!analysisId) return;
    // 单条导出以后端记录自身的类型为准
    success = await excelStore.downloadSingleExcelAction(analysisId, downloadData.columns, downloadData.unit, taskType || exportTaskType.value);
  } else if (downloadData.type === 'batch') {
    success = await excelStore.downloadBatchExcelAction(exportableSelectedIds.value, downloadData.columns, downloadData.unit, downloadData.taskType || historyTypeFilter.value);
  } else if (downloadData.type === 'summary') {
    success = await excelStore.downloadExcelSummaryAction(downloadData.columns, downloadData.unit, downloadData.taskType || historyTypeFilter.value);
  }
  if (success) {
    console.log('Excel download initiated:', downloadData.type, selectedAnalysisIds.value.length, 'items');
  }
};

const downloadSingleJson = async () => {
  if (!analysisStore.selectedJob || analysisStore.selectedJob.status !== 'completed') {
    analysisStore.setError('只有已完成的任务才能导出 JSON');
    return;
  }
  isExporting.value = true;
  try {
    await exportService.exportSingleJson(analysisStore.selectedJob.analysisId);
    console.log('JSON export successful');
  } catch (err) {
    console.error('JSON export failed:', err);
  } finally {
    isExporting.value = false;
  }
};

const batchExportJson = async () => {
  if (exportableSelectedIds.value.length === 0) {
    analysisStore.setError('请先勾选至少一个已完成的任务（失败记录没有结果可导出）');
    return;
  }
  isExporting.value = true;
  try {
    await runAction(async () => {
      await exportService.batchExportJson(exportableSelectedIds.value);
      selectedAnalysisIds.value = [];
      console.log('Batch JSON export successful');
    });
  } catch (err) {
    console.error('Batch JSON export failed:', err);
  } finally {
    isExporting.value = false;
  }
};

const handleBatchDelete = async () => {
  if (selectedAnalysisIds.value.length === 0) return;
  const count = selectedAnalysisIds.value.length;
  const confirmed = confirm(`确定要删除选中的 ${count} 条记录吗？此操作不可恢复，同时会清理关联的原图、标注图和 JSON 文件。`);
  if (!confirmed) return;
  batchDeleteBusy.value = true;
  try {
    const result = await runAction(() => analysisStore.batchDeleteAction([...selectedAnalysisIds.value]));
    if (result) {
      const skipped = result.skipped_ids || [];
      selectedAnalysisIds.value = [];
      if (skipped.length > 0) {
        alert(`成功删除 ${result.deleted_count}/${result.total_requested} 条记录，${skipped.length} 条删除失败`);
      } else {
        alert(`成功删除 ${result.deleted_count} 条记录`);
      }
    }
  } finally {
    batchDeleteBusy.value = false;
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

// 两张图同步缩放/拖动（对比观察时更方便），可在图片卡片工具栏里开关
const syncZoom = ref(true);
const syncTargets = (type) => (syncZoom.value ? ['original', 'annotated'] : [type]);

// 原图显示用 URL：后端对 .tif/.tiff 等浏览器不支持的原图会生成 .preview.jpg
const originalDisplayUrl = computed(() => analysisStore.selectedJob?.originalImageUrl || '');
// 原图下载/新窗口打开用 URL（保留原始文件）
const originalDownloadUrl = computed(
  () => analysisStore.selectedJob?.originalFileUrl || analysisStore.selectedJob?.originalImageUrl || ''
);
// 只有任务完成才有分割图
const annotatedDisplayUrl = computed(() => {
  const job = analysisStore.selectedJob;
  if (!job || job.status !== 'completed') return '';
  return job.annotatedImageUrl || '';
});

const isTiffUrl = (url) => /\.tiff?($|\?)/i.test(url || '');

const zoomBy = (type, delta) => {
  const next = Math.max(0.25, Math.min(8, imageState[type].scale + delta));
  const value = parseFloat(next.toFixed(2));
  syncTargets(type).forEach((t) => { imageState[t].scale = value; });
};

const openImageInNewTab = (url) => {
  if (url) window.open(url, '_blank', 'noopener');
};

// 分析类型状态：selectedTaskType 用于上传，historyTypeFilter 用于历史列表过滤（'' 表示本类全部）
const selectedTaskType = ref('');
const historyTypeFilter = ref('');

// 分析类型显示名映射（优先用后端 /analysis/tasks 返回的 name，未知类型显示原文）
const TASK_TYPE_LABELS = {
  stem: '茎秆',
  leaf: '剑叶'
};

const translateTaskType = (taskType) => {
  if (!taskType) return '未知';
  const matched = analysisStore.taskTypes.find((t) => t.key === taskType);
  return matched?.name || TASK_TYPE_LABELS[taskType] || taskType;
};

// 当前选中记录在队列中的位置：前面还有几张（不是 queued 或取不到时为 0）
const queueAheadCount = computed(() => {
  const job = analysisStore.selectedJob;
  if (!job || job.status !== 'queued') return 0;
  const queued = analysisStore.historyList.filter((item) => item.status === 'queued');
  // 历史按创建时间倒序，同批次内排队顺序即创建顺序（越早排越前面）
  const ordered = [...queued].sort(
    (a, b) => new Date(a.createdAt || 0) - new Date(b.createdAt || 0),
  );
  const index = ordered.findIndex((item) => item.analysisId === job.analysisId);
  return index > 0 ? index : 0;
});

// 当前选中记录的推理耗时（早于该功能上线的记录没有起止时间，则不显示这一行）
const selectedJobDuration = computed(
  () => formatDuration(recordDurationSeconds(analysisStore.selectedJob)),
);

// 当前选中分析类型的权重名与说明（来自后端 /analysis/tasks）
const currentTaskModel = computed(
  () => analysisStore.taskTypes.find((t) => t.key === selectedTaskType.value)?.model || ''
);
const currentTaskNote = computed(
  () => analysisStore.taskTypes.find((t) => t.key === selectedTaskType.value)?.note || ''
);

// 将任务ID转换为所属的分析类型
const getTaskTypeById = (analysisId) => {
  if (!analysisId) return '';
  const job = analysisStore.historyList.find(item => item.analysisId === analysisId);
  return job?.taskType || '';
};

// Excel 弹窗的实际导出目标：单条下载时的任务ID（为空表示用当前查看的任务）
// 这样"当前查看任务"与"列表勾选任务"两种单条导出路径可以明确区分
const downloadDialogTargetId = ref('');

// 单条导出默认依据当前查看的任务
const singleExportTaskType = computed(() =>
  analysisStore.selectedJob?.taskType || historyTypeFilter.value || ''
);

// 弹窗中"单条导出"所依据的分析类型
const dialogSingleTaskType = computed(() =>
  getTaskTypeById(downloadDialogTargetId.value) || singleExportTaskType.value
);

// 导出弹窗整体使用的分析类型：单条看导出目标，批量/汇总看勾选项或筛选类型
const exportTaskType = computed(() => {
  if (currentDownloadType.value === 'single') {
    return dialogSingleTaskType.value;
  }
  if (selectedAnalysisIds.value.length > 0) {
    const firstType = getTaskTypeById(selectedAnalysisIds.value[0]);
    if (firstType) return firstType;
  }
  return historyTypeFilter.value || singleExportTaskType.value || '';
});

// 初始化分析类型列表：只保留本大类的类型，默认选中本类第一项
const initTaskTypes = async () => {
  await analysisStore.fetchTaskTypes();
  if (groupTaskTypes.value.length > 0) {
    selectedTaskType.value = groupTaskTypes.value[0].key;
  } else {
    // 类型列表拉取失败时回退到本类的默认类型，保证仍可上传
    selectedTaskType.value = groupDefaultTaskType.value;
  }
};

// 切换大类（/stem <-> /leaf）时重置页面级状态：
// 清掉上一页选中的记录与筛选，避免详情区停留在另一类的任务上。
const resetWorkspace = () => {
  analysisStore.selectJobAction(null);
  historyTypeFilter.value = '';
  historyStatusFilter.value = '';
  selectedAnalysisIds.value = [];
  expandedBatchIds.value = new Set();
  historyPage.value = 1;
  uploadSuccessMessage.value = '';
};

// 监听选中任务变化，重置图片状态
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
    console.log("Selected job changed, resetting scale and position.");
  }
});

// 组件挂载时获取历史
onMounted(async () => {
  isActive = true;
  // 先取分析类型（下拉只列本大类的类型），再按**本大类分域**拉取历史：
  // 过滤在后端完成（/api/analysis/history?group=...），另一类的记录不会回到前端。
  await initTaskTypes();
  await analysisStore.fetchHistoryAction('', props.group);
  // 页面重新打开时恢复对已有未完成任务的轮询，避免任务已完成但界面永远停在旧状态。
  if (processingJobIds(analysisStore.historyList).length > 0) startPolling();
});

// 切换页面（茎秆/剑叶）时：重新确定默认分析类型、重置本页状态，并重新按新大类取数
watch(() => props.group, async (group) => {
  if (!group) return;
  resetWorkspace();
  await initTaskTypes();
  await analysisStore.fetchHistoryAction('', group);
  if (processingJobIds(analysisStore.historyList).length > 0) startPolling();
});

// 切换具体分析类型筛选：仅切换本页展示，不重新请求（历史数据保持全量供轮询使用）
watch(historyTypeFilter, () => {
  selectedAnalysisIds.value = [];
  historyPage.value = 1;
});

watch(historyStatusFilter, () => {
  selectedAnalysisIds.value = [];
  historyPage.value = 1;
});

watch(groupedHistory, () => {
  historyPage.value = Math.min(historyPage.value, historyPageCount.value);
});

// 处理文件选择（支持单文件和多文件选择）
const selectedFiles = ref([]);
const selectedFolderFiles = ref([]);
const folderInput = ref(null);
const isDraggingFiles = ref(false);
const uploadProgress = reactive({ active: false, percent: 0, label: '' });

// 整批上传进行中（一个批次里可能有多张图，从第一张到最后一张都算）
const isUploading = ref(false);
// 上传/选择相关控件的忙碌状态。
// 注意**不要**直接用 analysisStore.isLoading：每传完一个文件，store 都会
// isLoading=true -> false 走一轮（上传 + 刷新历史），多文件上传时上下游走十几次，
// 按钮就在"处理中/可用"之间反复切换，看起来一直在闪。
// 判定逻辑抽在 utils/uploadBusy.js 里，便于单测。
const isUploadBusy = computed(() => uploadBusyState({
  isUploading: isUploading.value,
  uploadProgressActive: uploadProgress.active,
}));
// 历史面板的整体忙碌状态（仅用于"正在加载历史记录..."这类文字提示）。
// 注意**不要**拿它去禁用按钮：轮询每 2 秒就会把它置真一次。
const historyLoading = computed(
  () => analysisStore.isLoading || isUploading.value || uploadProgress.active,
);

// 只有**首次**加载历史才显示加载提示。
// 轮询每 2 秒刷新一次历史，若提示直接绑 isLoading，底部就会每 2 秒闪一下
// （用户反馈"下载按钮那块在闪"，实际闪的是这条提示）。
const isInitialHistoryLoading = computed(
  () => analysisStore.isLoading && !analysisStore.historyLoadedOnce,
);

// 用户自己发起的操作是否在进行（删除、导出）。
// 按钮**可用性**只认它，不认 isLoading —— 否则轮询每 2 秒刷新一次历史就会把
// 删除按钮反复禁用，用户点了没反应（看起来像"删不掉"）。
const pendingActions = ref(0);
const actionBusy = computed(() => actionBusyState({ pendingActions: pendingActions.value }));
// 批量删除自身的进行状态（只用于按钮文案，避免文案跟着后台刷新乱跳）
const batchDeleteBusy = ref(false);

/** 包住"用户自己发起的操作"：期间按钮保持禁用（后台刷新不影响它） */
const runAction = async (task) => {
  pendingActions.value += 1;
  try {
    return await task();
  } finally {
    pendingActions.value = Math.max(0, pendingActions.value - 1);
  }
};

const supportedImagePattern = /\.(tif|tiff|png|jpe?g|bmp|webp)$/i;
const isSupportedImage = file => file.type.startsWith('image/') || supportedImagePattern.test(file.name);

const setSelectedImages = (files) => {
  const images = Array.from(files).filter(isSupportedImage);
  if (images.length === 0) {
    analysisStore.setError('未找到支持的图片文件。');
    return;
  }
  const uniqueFiles = new Map(selectedFiles.value.map(file => [`${file.name}-${file.size}-${file.lastModified}`, file]));
  images.forEach(file => uniqueFiles.set(`${file.name}-${file.size}-${file.lastModified}`, file));
  selectedFiles.value = [...uniqueFiles.values()];
  uploadSuccessMessage.value = '';
  analysisStore.setError(null);
};

const handleFileSelect = (event) => {
  setSelectedImages(event.target.files);
};

const handleFileDrop = (event) => {
  isDraggingFiles.value = false;
  if (isUploadBusy.value) return;
  setSelectedImages(event.dataTransfer.files);
};

const handleDragLeave = (event) => {
  if (!event.currentTarget.contains(event.relatedTarget)) isDraggingFiles.value = false;
};

const removeSelectedFile = (index) => {
  selectedFiles.value.splice(index, 1);
};

const removeFolderFile = (index) => {
  selectedFolderFiles.value.splice(index, 1);
};

// 处理文件夹选择
const handleFolderSelect = (event) => {
  const files = Array.from(event.target.files).filter(isSupportedImage);
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
  uploadProgress.active = true;
  uploadProgress.percent = 0;
  uploadProgress.label = `正在上传 ${selectedFolderFiles.value.length} 个文件`;
  // 整批期间保持忙碌，避免多文件上传时按钮反复启用/禁用（闪烁）
  isUploading.value = true;

  console.log(`上传文件夹，共 ${selectedFolderFiles.value.length} 个文件，分析类型: ${selectedTaskType.value}`);
  const taskType = selectedTaskType.value;
  try {
    const response = await analysisStore.uploadFolderAction(selectedFolderFiles.value, taskType, (event) => {
      if (event.total) uploadProgress.percent = Math.round((event.loaded / event.total) * 100);
    });

    if (response) {
      uploadProgress.percent = 100;
      uploadSuccessMessage.value = `已成功提交 ${selectedFolderFiles.value.length} 个文件进行批量处理...`;
      // 上传后把筛选切到刚上传的类型，确保新任务可见且后续轮询能定位到它
      historyTypeFilter.value = taskType;
      selectedFolderFiles.value = [];
      if (folderInput.value) {
        folderInput.value.value = '';
      }
      // 登记本次上传的任务并开始轮询（定时器由 store 统一持有）
      trackUploadedJobs((response.analyses || []).map(item => item.analysis_id || item.analysisId));
    }
  } finally {
    uploadProgress.active = false;
    isUploading.value = false;
  }

  // 上传新文件后清空已刷新任务记录
  refreshedJobs.value.clear();
};

// 轮询由 store 统一管理（主页 / 两个分析页共用一份定时器），这里只负责把
// "本页大类 + 任务结束时的界面反应"传进去。
const pendingUploadIds = new Set();

const handleSettledJob = (job) => {
  const isFromThisPage = groupTaskKeys.value.has(job.taskType);
  if (!isFromThisPage) return;
  if (job.status === 'completed') {
    if (pendingUploadIds.has(job.analysisId) || !analysisStore.selectedJob) {
      analysisStore.selectJobAction(job);
    }
    if (pendingUploadIds.has(job.analysisId)) {
      uploadSuccessMessage.value = '文件处理完成！';
      pendingUploadIds.delete(job.analysisId);
    }
  } else if (job.status === 'failed') {
    pendingUploadIds.delete(job.analysisId);
  }
};

const startPolling = () => analysisStore.startPolling({
  group: props.group,
  // 页面已卸载时不再改本组件的状态（轮询本身保留，供其它页面继续跟踪任务）
  onSettled: (job) => { if (isActive) handleSettledJob(job); },
});

// 组件是否仍然挂载：轮询定时器在 store 里、可能比本页面活得久
let isActive = true;

// 上传成功后把新任务登记进来，并启动轮询
const trackUploadedJobs = (ids) => {
  (ids || []).forEach((id) => { if (id) pendingUploadIds.add(String(id)); });
  startPolling();
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
  const failedFiles = [];
  const filesToUpload = [...selectedFiles.value];
  // 固定本次上传的分析类型，避免上传过程中用户切换下拉导致混用
  const taskType = selectedTaskType.value;
  uploadProgress.active = true;
  uploadProgress.percent = 0;
  // 整批期间保持忙碌：多文件上传时 store 的 isLoading 会随每个文件上下翻转，
  // 直接拿它当按钮状态会让按钮一直闪。
  isUploading.value = true;

  try {
    for (const [index, file] of filesToUpload.entries()) {
      uploadProgress.label = `正在上传 ${file.name}（${index + 1}/${filesToUpload.length}）`;
      console.log(`上传文件: ${file.name}, 分析类型: ${taskType}, 批次ID: ${currentBatchId.value}`);
      const success = await analysisStore.uploadFileAction(file, currentBatchId.value, taskType, (event) => {
        const currentRatio = event.total ? event.loaded / event.total : 0;
        // 进度只按"整批"折算，避免每个文件各自 0→100 导致进度条反复回跳
        uploadProgress.percent = uploadProgressPercent({
          index,
          total: filesToUpload.length,
          currentRatio,
        });
      });
      if (success) {
        uploadedCount.push(file.name);
      } else {
        failedFiles.push(file);
      }
      uploadProgress.percent = Math.round(((index + 1) / filesToUpload.length) * 100);
      // 短暂延迟，避免请求过于频繁
      await new Promise(resolve => setTimeout(resolve, 300));
    }
  } finally {
    uploadProgress.active = false;
    isUploading.value = false;
  }
  if (uploadedCount.length === filesToUpload.length) uploadProgress.percent = 100;

  if (uploadedCount.length > 0) {
    if (uploadedCount.length === 1) {
      uploadSuccessMessage.value = `文件 "${uploadedCount[0]}" 已成功提交后台处理...`;
    } else {
      uploadSuccessMessage.value = `已成功提交 ${uploadedCount.length} 个文件进行处理...`;
    }
    // 上传后把筛选切到刚上传的类型，确保新任务可见且后续轮询能定位到它
    historyTypeFilter.value = taskType;
  }

  selectedFiles.value = failedFiles;
  if (fileInput.value && failedFiles.length === 0) {
    fileInput.value.value = '';
  }

  // 上传新文件后清空已刷新任务记录，因为会有新任务加入
  refreshedJobs.value.clear();

  // 登记本次上传的任务并开始轮询。
  // store 的 uploadFileAction 只回传成功与否，这里按"本批次仍在处理中的记录"认领任务 ID。
  const uploadedIds = analysisStore.historyList
    .filter(job => job.batchId === currentBatchId.value && job.status === 'processing')
    .map(job => String(job.analysisId));
  trackUploadedJobs(uploadedIds.length ? uploadedIds : []);
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

  // 用操作锁包住：期间按钮禁用，但轮询刷新不会影响它（否则按钮会一直"点不动"）
  await runAction(async () => {
    const success = await analysisStore.deleteJobAction(analysisId);
    if (success) {
      console.log(`记录 "${filename}" 已成功删除`);
    }
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

  const delta = event.deltaY > 0 ? -0.15 : 0.15;
  const newScale = Math.max(0.25, Math.min(8, imageState[type].scale + delta));
  const value = parseFloat(newScale.toFixed(2));

  syncTargets(type).forEach((t) => { imageState[t].scale = value; });
};

// 重置图片缩放
const resetScale = (type) => {
  syncTargets(type).forEach((t) => {
    imageState[t].scale = 1;
    imageState[t].position = { x: 0, y: 0 };
  });
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
  const maxMove = 400;
  const x = Math.max(-maxMove, Math.min(maxMove, deltaX));
  const y = Math.max(-maxMove, Math.min(maxMove, deltaY));

  // 同步模式下两张图一起平移（复制同一份坐标，保证对齐）
  syncTargets(type).forEach((t) => {
    imageState[t].position = { x, y };
  });
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

// 组件卸载时移除事件监听。
// 轮询刻意**不在这里停止**：定时器归 store 所有，这样"上传大文件后切到别的页面"
// 任务状态仍会继续刷新，回到本页时看到的就是最新状态。
import { onUnmounted } from 'vue';
onUnmounted(() => {
  isActive = false;
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
.card { background-color: var(--color-surface, #ffffff); padding: 20px; border-radius: 0; box-shadow: -1px -1px 3px rgba(0,0,0,0.1); }
h3 { margin-top: 0; color: var(--color-primary-green-dark, #2e7d32); border-bottom: 2px solid var(--color-primary-green-lightest, #e6f4ea); padding-bottom: 10px; margin-bottom: 20px; }
.error-message { color: var(--color-error, red); font-size: 0.9em; margin-top: 10px; }
.success-message { color: var(--color-primary-green-dark, green); font-size: 0.9em; margin-top: 10px; }
.success-message.inline { margin-top: 0; white-space: nowrap; }
button { padding: 8px 12px; border: none; border-radius: 2px; cursor: pointer; font-size: 1em; transition: background-color 0.2s, opacity 0.2s; }
button.primary { background-color: var(--color-primary-green, #4caf50); color: white; }
button.primary:hover:not(:disabled) { background-color: var(--color-primary-green-dark, #2e7d32); }
button:disabled { background-color: #ccc !important; opacity: 0.6; cursor: not-allowed; }

/* 左侧上传侧栏 */
.upload-sidebar {
  background-color: var(--color-surface, #ffffff);
  padding: 0;
  border-radius: 0;
  box-shadow: -1px -1px 3px rgba(0,0,0,0.1);
  flex: 0 0 180px;
  order: 0;
  display: flex;
  flex-direction: column;
}

.sidebar-title {
  margin: 0;
  padding: 16px 7px 10px;
  font-size: 1.05em;
  color: var(--color-primary-green-dark, #2e7d32);
  border: none;
}

.sidebar-title::after {
  content: '';
  display: block;
  height: 2px;
  background-color: var(--color-primary-green-lightest, #e6f4ea);
  margin: 8px 0 0;
}

/* 上传按钮组 - 竖向列布局 */
.upload-controls {
  display: flex;
  flex-direction: column;
  align-items: stretch;
  gap: 12px;
  flex: 1;
  min-height: 0;
  padding: 12px 7px;
}

/* 自定义文件选择按钮样式 */
.file-input-label, .folder-input-label {
  position: relative;
  display: block;
  width: 100%;
  padding: 10px 12px;
  border-radius: 2px;
  cursor: pointer;
  font-size: 0.9em;
  transition: background-color 0.2s;
  border: none;
  background-color: #999;
  color: white;
  text-align: center;
  box-sizing: border-box;
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
.model-select label { margin-right: 5px; font-size: 0.9em; color: #555; display: block; margin-bottom: 5px; }
.model-select select { padding: 8px 10px; border-radius: 0; border: 1px solid #ccc; background-color: white; width: 100%; box-sizing: border-box; }

.upload-button,
.folder-upload-button {
  width: 100%;
  padding: 10px 12px;
  box-sizing: border-box;
}

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
  align-items: stretch;
  height: 100%;
  max-height: 800px;
  width: 100%;
  box-sizing: border-box;
}

/* 右侧面板（纵向布局） */
.right-panel {
  flex: 49;
  order: 2;
  display: flex;
  flex-direction: column;
  gap: 20px;
  min-width: 0;
}

/* 上方区域 */
.upper-panel {
  flex: 1;
  min-height: 0;
  display: flex;
  flex-direction: column;
}

.upper-panel h3 {
  margin: 0;
}

.pending-group {
  flex: 1;
  min-height: 0;
  display: flex;
  flex-direction: column;
}

.pending-group-title {
  font-size: 0.85em;
  color: #666;
  margin-bottom: 4px;
  padding: 4px 8px;
  background: #f5f5f5;
  border-radius: 0;
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
  gap: 6px;
  padding: 4px 6px;
  font-size: 0.85em;
  border-bottom: 1px solid #eee;
}

.pending-item:hover {
  background: #f9f9f9;
}

.pending-icon {
  flex-shrink: 0;
}

.pending-name {
  flex: 1;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.pending-size {
  color: #888;
  flex-shrink: 0;
}

.pending-remove {
  background: none;
  border: none;
  color: #999;
  font-size: 1.1em;
  cursor: pointer;
  padding: 0 4px;
  line-height: 1;
  flex-shrink: 0;
}

.pending-remove:hover {
  color: #dc3545;
}

.no-pending {
  color: #888;
  text-align: center;
  padding: 20px;
  font-style: italic;
  margin: 0;
}

/* 分割记录 */
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
  margin-bottom: 15px;
  gap: 10px;
}

.section-title-group {
  display: flex;
  align-items: center;
  gap: 12px;
  min-width: 0;
}

/* 历史列表的分析类型筛选 */
.history-filter {
  display: flex;
  align-items: center;
  gap: 5px;
  white-space: nowrap;
}

.history-filter label {
  font-size: 0.85em;
  color: #555;
}

.history-type-select {
  padding: 4px 8px;
  border: 1px solid #ccc;
  border-radius: 0;
  background-color: white;
  font-size: 0.85em;
  color: #333;
  box-sizing: border-box;
}

/* 分析类型徽标 */
.type-badge {
  flex-shrink: 0;
  font-size: 0.75em;
  line-height: 1.5;
  padding: 0 6px;
  border-radius: 10px;
  background-color: var(--color-primary-green-lightest, #e6f4ea);
  color: var(--color-primary-green-dark, #2e7d32);
  border: 1px solid rgba(46, 125, 50, 0.25);
  white-space: nowrap;
  /* 分页后各页的类型名长短不一（茎秆 / 剑叶 · v11(exp08)），给个下限让徽标对齐 */
  min-width: 52px;
  text-align: center;
}

.section-header h3 {
  margin-bottom: 0;
  border-bottom: none;
  padding-bottom: 0;
}

.section-actions {
  display: flex;
  gap: 10px;
  margin-left: auto; /* 筛选下拉与标题同处左侧，操作按钮保持靠右 */
  flex-shrink: 0;
}

.download-summary-button {
  background-color: var(--color-primary-green-dark, #2e7d32);
  color: white;
  padding: 6px 12px;
  border: none;
  border-radius: 2px;
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
  border-radius: 0;
  overflow: hidden;
  transition: background-color 0.2s;
}

.batch-item:hover {
  background-color: #f9f9f9;
}

.batch-item.selected {
  background-color: var(--color-primary-green-lightest, #e6f4ea);
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

.expand-button {
  background: none;
  border: none;
  font-size: 0.75em;
  color: #666;
  flex-shrink: 0;
  cursor: pointer;
  padding: 4px 6px;
  border-radius: 2px;
  transition: color 0.2s, background-color 0.2s;
}

.expand-button:hover {
  color: #333;
  background-color: #f0f0f0;
}

.expand-icon {
  display: inline-block;
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
  width: 20px;
  height: 20px;
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

.status-indicator.status-queued { background-color: #8a94a6; }          /* 灰蓝 - 排队中 */
.status-indicator.status-processing { background-color: #ff9800; }      /* 橙色 - 处理中 */
.status-indicator.status-completed { background-color: #28a745; }        /* 绿色 - 已完成 */
.status-indicator.status-failed { background-color: var(--color-error, #dc3545); } /* 红色 - 失败 */
.no-jobs-message { color: #666; text-align: center; padding: 20px; }

/* 图片组容器（纵向排列） */
.image-group {
  flex: 51;
  order: 1;
  min-width: 0;
  display: flex;
  flex-direction: column;
  gap: 20px;
  padding: 0 5px;
}

.image-section-wrapper {
  flex: 1;
  display: flex;
  flex-direction: column;
  padding: 8px 5px;
  min-height: 0;
  border-radius: 0;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.15);
  background-color: rgba(255, 255, 255, 0.5);
  backdrop-filter: blur(12px) saturate(160%);
  -webkit-backdrop-filter: blur(12px) saturate(160%);
  border: 1px solid rgba(255, 255, 255, 0.6);
}
.image-group.placeholder { color: #888; text-align: center; padding: 50px 20px; font-style: italic; display: block; overflow: visible; }

.image-section {
  flex: 1;
  min-height: 0;
  display: flex;
  flex-direction: column;
  padding: 0;
  overflow: hidden;
  border-radius: 0;
  box-shadow: none;
  background-color: transparent;
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
  top: 10px;
  left: 50%;
  transform: translateX(-50%);
  background: rgba(255, 255, 255, 0.8);
  padding: 5px 15px;
  border-radius: 15px;
  color: #555;
  font-weight: 600;
  font-size: 0.9em;
  z-index: 10;
  box-shadow: 0 2px 5px rgba(0, 0, 0, 0.2);
  margin: 0;
}
.image-container img {
  max-width: 100%;
  height: 100%;
  max-height: 100%;
  object-fit: contain;
  border: 1px solid #ddd;
  border-radius: 0;
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

.status-completed { color: #28a745; font-style: italic; text-align: center; }

.status-failed.error-message {
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
  border-radius: 0;
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
  border-radius: 2px;
  padding: 2px 8px;
  font-size: 10px;
  cursor: pointer;
  transition: background-color 0.2s;
}

.reset-button:hover {
  background: #45a049;
}

.image-container img.loading { opacity: 0.5; }
.image-error { border: 1px dashed var(--color-error, red); padding: 20px; color: var(--color-error, red); }
.status-processing { color: #666; font-style: italic; text-align: center; }

.status-failed { color: var(--color-error, #dc3545); font-style: italic; }

.job-details { margin-top: 20px; font-size: 0.95em; color: #333; padding: 8px 10px; }
.job-details p { margin-bottom: 8px; }
.job-details strong { margin-right: 5px; color: #111; margin-left: 8px; }

.status-tag { padding: 3px 8px; border-radius: 15px; font-size: 0.85em; color: white; min-width: 60px; text-align: center; display: inline-block; }
.status-tag.status-queued { background-color: #8a94a6; }          /* 灰蓝 - 排队中（分析串行执行，等待前面的图） */
.status-tag.status-processing { background-color: #ff9800; }      /* 橙色 - 处理中 */
/* 绿色 - 已完成 */
.status-tag.status-completed { background-color: #28a745; } /* 绿色 - 已完成 */
.status-tag.status-failed { background-color: var(--color-error, #dc3545); } /* 红色 - 失败 */
.status-tag.status-unselected { background-color: #d3d3d3; color: #555; } /* 淡灰色 - 未选中 */

.result-links { margin-top: 15px; display: flex; flex-direction: column; gap: 10px; }
.download-button { display: block; width: 100%; padding: 10px 12px; border-radius: 2px; text-decoration: none; color: white !important; font-size: 0.9em; transition: background-color 0.2s; cursor: pointer; border: none; box-sizing: border-box; text-align: center; }
.download-button.excel { background-color: var(--color-primary-green-dark, #2e7d32); }
.download-button.excel:hover { background-color: #1b5e20; }
.download-button.json { background-color: #ffa000; }
.download-button.json:hover { background-color: #ef6c00; }
.disabled-links-note { font-size: 0.8em; color: #888; margin-left: 5px; align-self: center; }

.select-all-checkbox {
  display: inline-flex;
  align-items: center;
  gap: 5px;
  font-size: 13px;
  color: #555;
  cursor: pointer;
  user-select: none;
  white-space: nowrap;
}

.select-all-checkbox input[type="checkbox"] {
  width: 15px;
  height: 15px;
  cursor: pointer;
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
}

.batch-header .job-checkbox {
  margin-right: 2px;
}

.job-item .job-checkbox {
  margin-right: 6px;
}

.download-summary-button.json-batch {
  background-color: #ffa000;
}

.download-summary-button.json-batch:hover:not(:disabled) {
  background-color: #ef6c00;
}

.download-summary-button.delete-batch {
  background-color: #f44336;
}

.download-summary-button.delete-batch:hover:not(:disabled) {
  background-color: #d32f2f;
}

/* ============================================================
   现代化外观覆盖层（写在最后，同优先级下覆盖上面的旧样式）
   ============================================================ */

/* ---------- 卡片 ---------- */
.card {
  background-color: var(--color-surface);
  border: 1px solid var(--color-border);
  border-radius: var(--radius);
  box-shadow: var(--shadow-sm);
}

/* ---------- 主区域：三栏网格 + 占满可视高度 ---------- */
.main-area {
  display: grid;
  grid-template-columns: 236px minmax(0, 1fr) 390px;
  grid-template-areas: "side images right";
  gap: 16px;
  align-items: stretch;
  height: 100%;
  max-height: none;
}

.upload-sidebar {
  grid-area: side;
  border-radius: var(--radius);
  border: 1px solid var(--color-border);
  box-shadow: var(--shadow-sm);
  overflow: hidden;
  min-height: 0;
}

.image-group {
  grid-area: images;
  padding: 0;
  gap: 16px;
  min-height: 0;
}

.image-group.placeholder {
  grid-area: images;
}

.right-panel {
  grid-area: right;
  gap: 16px;
  min-height: 0;
}

/* ---------- 左侧操作栏 ---------- */
.sidebar-title {
  padding: 15px 15px 10px;
  margin: 0;
  font-size: 1em;
  color: var(--color-primary-green-dark);
  background-color: var(--color-surface);
}

.sidebar-title::after {
  background-color: var(--color-border);
  margin: 10px 0 0;
}

.upload-controls {
  gap: 14px;
  padding: 14px 15px;
}

.control-block {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.upload-dropzone {
  align-items: center;
  padding: 13px 10px 10px;
  border: 1px dashed var(--color-border-strong);
  border-radius: var(--radius-sm);
  background-color: var(--color-surface-2);
  color: var(--color-text-muted);
  transition: border-color 0.18s ease, background-color 0.18s ease, color 0.18s ease;
}

.upload-dropzone.is-dragging {
  border-color: var(--color-primary-green);
  background-color: var(--color-primary-green-lightest);
  color: var(--color-primary-green-dark);
}

.dropzone-title {
  font-size: 0.84em;
  font-weight: 600;
  color: var(--color-text);
}

.file-source-actions {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 7px;
  width: 100%;
}

.control-label {
  font-size: 0.75em;
  font-weight: 600;
  letter-spacing: 0.06em;
  text-transform: uppercase;
  color: var(--color-text-faint);
}

.control-hint {
  margin: 0;
  font-size: 0.76em;
  line-height: 1.45;
  color: var(--color-text-faint);
  overflow-wrap: anywhere;
}

.model-select label {
  color: var(--color-text-muted);
}

.model-select select {
  border-radius: var(--radius-sm);
}

/* 上传选择按钮：虚线框 + 悬停高亮 */
.file-input-label,
.folder-input-label {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 6px;
  border-radius: var(--radius-sm);
  background-color: var(--color-surface);
  border: 1px solid var(--color-border-strong);
  color: var(--color-text);
  font-size: 0.86em;
  font-weight: 500;
  padding: 9px 10px;
}

.file-input-label:hover,
.folder-input-label:hover {
  background-color: var(--color-primary-green-lightest);
  border-color: var(--color-primary-green);
  color: var(--color-primary-green-dark);
}

.file-input-label:has(input:disabled),
.folder-input-label:has(input:disabled) {
  background-color: var(--color-surface-2);
  border-color: var(--color-border);
}

.folder-upload-button {
  background-color: var(--color-info);
}

.folder-upload-button:hover:not(:disabled) {
  background-color: #1f6fd0;
}

.upload-button,
.folder-upload-button,
.download-button,
.download-summary-button {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 7px;
}

.upload-progress {
  display: flex;
  flex-direction: column;
  gap: 6px;
  padding: 10px;
  border-radius: var(--radius-sm);
  background-color: var(--color-primary-green-lightest);
}

.progress-copy {
  display: flex;
  justify-content: space-between;
  gap: 8px;
  min-width: 0;
  color: var(--color-primary-green-darkest);
  font-size: 0.78em;
}

.progress-copy span {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.progress-copy strong { font-variant-numeric: tabular-nums; }
.progress-track { height: 5px; overflow: hidden; border-radius: var(--radius-pill); background: #cfe5d5; }
.progress-track span { display: block; height: 100%; border-radius: inherit; background: var(--color-primary-green); transition: width 0.15s ease; }

/* 任务状态与下载区（吸底） */
.job-details {
  margin-top: auto;
  padding: 12px 15px 16px;
  border-top: 1px solid var(--color-border);
  background-color: var(--color-surface-2);
  display: flex;
  flex-direction: column;
  gap: 9px;
}

.detail-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
  font-size: 0.85em;
}

.detail-label {
  color: var(--color-text-muted);
  font-weight: 500;
}

.result-links {
  margin-top: 4px;
  gap: 8px;
}

.loading-indicator {
  font-style: normal;
  font-size: 0.8em;
  color: var(--color-text-muted);
  padding: 6px 15px 12px;
}

/* ---------- 图片卡片 ---------- */
.image-section-wrapper {
  border-radius: var(--radius);
  border: 1px solid var(--color-border);
  box-shadow: var(--shadow-sm);
  background-color: var(--color-surface);
  backdrop-filter: none;
  -webkit-backdrop-filter: none;
  padding: 0;
  overflow: hidden;
}

.image-section {
  border: none;
  box-shadow: none;
  background-color: transparent;
  border-radius: var(--radius);
}

.image-card-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 10px;
  padding: 8px 12px;
  border-bottom: 1px solid var(--color-border);
  background-color: var(--color-surface-2);
  flex-shrink: 0;
}

.image-card-head h4 {
  margin: 0;
  font-size: 0.92em;
  font-weight: 600;
  color: var(--color-text);
  position: static;
  transform: none;
  background: none;
  box-shadow: none;
  padding: 0;
  border-radius: 0;
}

.image-tools {
  display: flex;
  align-items: center;
  gap: 6px;
  flex-shrink: 0;
}

.tool-btn {
  min-width: 26px;
  padding: 2px 8px;
  font-size: 0.85em;
  line-height: 1.5;
  background-color: var(--color-surface);
  border: 1px solid var(--color-border-strong);
  border-radius: var(--radius-xs);
  color: var(--color-text);
}

.tool-btn:hover:not(:disabled) {
  background-color: var(--color-primary-green-lightest);
  border-color: var(--color-primary-green);
  color: var(--color-primary-green-dark);
}

.tool-zoom {
  min-width: 44px;
  text-align: center;
  font-size: 0.78em;
  color: var(--color-text-muted);
  font-variant-numeric: tabular-nums;
}

.tool-toggle {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  font-size: 0.78em;
  color: var(--color-text-muted);
  cursor: pointer;
  user-select: none;
  padding: 0 2px;
}

.tool-toggle.active {
  color: var(--color-primary-green-dark);
  font-weight: 600;
}

.mini-status {
  font-size: 0.76em;
  padding: 2px 9px;
  border-radius: var(--radius-pill);
  font-weight: 500;
}

.mini-status.queued {
  background-color: #eef1f5;
  color: #5b6675;
}

.mini-status.processing {
  background-color: #fff4e5;
  color: var(--color-warning);
}

.mini-status.failed {
  background-color: #fdecee;
  color: var(--color-error);
}

.fallback-hint {
  font-size: 0.8em;
  color: var(--color-text-faint);
  margin-top: -4px;
}

.image-container {
  background: linear-gradient(180deg, #f8fbf9 0%, #eef3f0 100%);
}

.image-container img {
  border: none;
  border-radius: 0;
  background-color: transparent;
}

.image-container img.dragging {
  box-shadow: 0 12px 28px rgba(16, 40, 24, 0.28);
}

/* 图片状态/错误占位 */
.image-fallback {
  position: absolute;
  inset: 0;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 10px;
  padding: 24px;
  text-align: center;
  color: var(--color-text-muted);
}

.image-fallback p {
  margin: 0;
  position: static;
  transform: none;
  width: auto;
  font-size: 0.9em;
  line-height: 1.5;
}

.fallback-icon {
  font-size: 2.2em;
  opacity: 0.65;
}

.fallback-link {
  font-size: 0.85em;
  font-weight: 500;
  color: var(--color-primary-green-dark);
}

.spinner {
  width: 26px;
  height: 26px;
  border-radius: 50%;
  border: 3px solid var(--color-primary-green-light);
  border-top-color: var(--color-primary-green);
  animation: spin 0.9s linear infinite;
}

@keyframes spin {
  to { transform: rotate(360deg); }
}

/* 未选中记录的占位 */
.image-group.placeholder {
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 48px 24px;
  color: var(--color-text-muted);
  font-style: normal;
  overflow: hidden;
}

.placeholder-inner {
  max-width: 420px;
  text-align: center;
}

.placeholder-icon {
  display: block;
  margin: 0 auto 10px;
  opacity: 0.8;
}

.placeholder-inner h3 {
  margin: 0 0 8px;
  padding: 0;
  border: none;
  font-size: 1.05em;
  color: var(--color-text);
}

.placeholder-inner p {
  margin: 0;
  font-size: 0.88em;
  line-height: 1.6;
}

/* ---------- 右侧：待处理文件 + 分割记录 ---------- */
.upper-panel {
  flex: 0 1 auto;
  max-height: 30%;
}

.job-list-section {
  flex: 1 1 auto;
  min-height: 0;
}

.section-header {
  margin-bottom: 14px;
  align-items: flex-start;
  flex-wrap: wrap;
  gap: 12px 16px;
}

.section-title-group { display: flex; flex: 1 1 100%; min-height: 34px; flex-wrap: wrap; }

/* 类型 / 状态两个筛选下拉的宽度必须**锁死**：
   下拉宽度默认会跟着最长选项文字走，而剑叶有 9 个很长的模型名
   （如"剑叶 · Rice-SVBDete"），会把 <select> 撑宽到整行放不下两个框而换行 ——
   这就是"茎秆页并排、剑叶页一上一下"的原因。
   现在固定宽度 + 超出省略号，两个页面排布完全一致。 */
.section-title-group .history-filter { flex-shrink: 0; }
.section-title-group .history-filter:first-of-type .history-type-select {
  width: 124px;
  min-width: 124px;
  text-overflow: ellipsis;
}
.section-title-group .history-filter:last-of-type .history-type-select {
  width: 88px;
  min-width: 88px;
}
/* 内容再挤也保持两个框在同一行，超出时整组换到下一行（而不是把两个框拆开） */
.section-title-group > .history-filter { white-space: nowrap; }
@media (max-width: 1240px) {
  /* 窄屏给右侧面板留点余量：标题独占一行，两个筛选框仍然并排 */
  .section-title-group > h3 { flex: 1 1 100%; margin-bottom: 2px; }
}
.section-actions {
  flex: 1 1 100%; width: 100%; margin-left: 0; padding-top: 10px;
  border-top: 1px solid var(--color-border); align-items: center;
  justify-content: flex-end; flex-wrap: wrap; gap: 8px;
}
.select-all-checkbox { display: inline-flex; align-items: center; gap: 6px; min-height: 32px; margin-right: auto; color: var(--color-text-muted); white-space: nowrap; }
.selection-count { color: var(--color-text-muted); font-size: 0.82em; white-space: nowrap; }

.section-header h3 {
  font-size: 1em;
}

.pending-group-title {
  border-radius: var(--radius-xs);
  background-color: var(--color-surface-2);
  color: var(--color-text-muted);
  font-weight: 500;
}

.pending-item {
  border-bottom: 1px solid var(--color-border);
  border-radius: var(--radius-xs);
}

.pending-item:hover {
  background-color: var(--color-primary-green-lightest);
}

.pending-icon { color: var(--color-primary-green-dark); flex-shrink: 0; }
.pending-remove,
.delete-button,
.expand-button,
.page-button,
.tool-btn { display: inline-flex; align-items: center; justify-content: center; }

.no-pending,
.no-jobs-message {
  color: var(--color-text-faint);
  font-style: normal;
  font-size: 0.88em;
}

.job-list {
  max-height: none;
  padding-right: 2px;
}

.history-pagination {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 10px;
  min-height: 38px;
  padding-top: 8px;
  border-top: 1px solid var(--color-border);
  color: var(--color-text-muted);
  font-size: 0.8em;
}

.page-button {
  width: 28px;
  height: 28px;
  padding: 0;
  color: var(--color-text);
  background: var(--color-surface);
  border: 1px solid var(--color-border-strong);
  border-radius: var(--radius-xs);
}

.page-button:hover:not(:disabled) {
  color: var(--color-primary-green-dark);
  border-color: var(--color-primary-green);
  background: var(--color-primary-green-lightest);
}

.batch-item {
  border: 1px solid var(--color-border);
  border-radius: var(--radius-sm);
  margin-bottom: 8px;
  transition: border-color 0.18s ease, background-color 0.18s ease, box-shadow 0.18s ease;
}

.batch-item:hover {
  background-color: var(--color-surface-2);
  border-color: var(--color-border-strong);
}

.batch-item.selected {
  background-color: var(--color-primary-green-lightest);
  border-color: var(--color-primary-green-light);
  box-shadow: inset 3px 0 0 var(--color-primary-green);
}

.batch-header {
  padding: 10px 12px;
  gap: 8px;
  min-height: 44px;
}

.batch-icon { display: inline-flex; color: var(--color-text-muted); }

.job-item {
  padding: 8px 12px 8px 34px;
  border-bottom: 1px solid var(--color-border);
}

.job-item:hover {
  background-color: var(--color-surface-2);
}

.job-item.selected {
  background-color: var(--color-primary-green-lightest);
  box-shadow: inset 3px 0 0 var(--color-primary-green);
}

.batch-content {
  border-top: 1px solid var(--color-border);
}

.type-badge {
  border-radius: var(--radius-pill);
  padding: 1px 8px;
  font-size: 0.72em;
  line-height: 1.6;
}

.status-indicator {
  width: 8px;
  height: 8px;
  box-shadow: 0 0 0 3px rgba(0, 0, 0, 0.04);
}

.delete-button {
  width: 22px;
  height: 22px;
  font-size: 14px;
  background: transparent;
  color: var(--color-text-faint);
  border-radius: var(--radius-xs);
  transition: background-color 0.16s ease, color 0.16s ease;
}

.delete-button:hover:not(:disabled) {
  background: #fdecee;
  color: var(--color-error);
}

.delete-button:disabled {
  background: transparent;
}

.download-summary-button {
  border-radius: var(--radius-sm);
  min-height: 34px;
  padding: 7px 12px;
  font-weight: 500;
  white-space: nowrap;
}

.status-tag {
  border-radius: var(--radius-pill);
  padding: 3px 10px;
  font-size: 0.78em;
  font-weight: 500;
  min-width: 0;
}

/* ---------- 响应式 ---------- */
@media (max-width: 1560px) {
  .main-area {
    grid-template-columns: 220px minmax(0, 1fr) 340px;
  }
}

@media (max-width: 1240px) {
  .main-area {
    grid-template-columns: 220px minmax(0, 1fr);
    grid-template-areas:
      "side images"
      "side right";
    grid-auto-rows: min-content;
    height: auto;
  }
  .image-group {
    min-height: 68vh;
  }
}

@media (max-width: 900px) {
  .main-area {
    grid-template-columns: minmax(0, 1fr);
    grid-template-areas:
      "side"
      "images"
      "right";
  }
  .image-group {
    min-height: 60vh;
  }
  .section-actions {
    justify-content: flex-start;
  }
  .select-all-checkbox { flex-basis: 100%; margin-right: 0; }
  .selection-count { margin-right: auto; }
  .batch-timestamp {
    display: none;
  }
}
</style>
