<template>
  <div v-if="visible" class="modal-overlay" @click="closeDownloadDialog">
    <div class="modal-content" @click.stop>
      <div class="modal-header">
        <h3>{{ dialogTitle }}</h3>
        <button class="close-button" @click="closeDownloadDialog" aria-label="关闭"><X :size="18" /></button>
      </div>
      <div class="modal-body">
        <div class="selection-controls">
          <label class="select-all-label">
            <input
              type="checkbox"
              :checked="isAllColumnsSelected"
              :disabled="availableColumns.length === 0"
              @change="toggleAllColumns"
            />
            全选/取消全选
          </label>
          <span v-if="columnsLoading" class="columns-hint">正在加载数据项...</span>
        </div>
        <div class="columns-grid" v-if="availableColumns.length > 0">
          <label
            v-for="column in availableColumns"
            :key="column.key"
            class="column-checkbox"
          >
            <input
              type="checkbox"
              :value="column.key"
              v-model="selectedColumns"
            />
            {{ column.label }}
          </label>
        </div>
        <div v-else-if="columnsError" class="columns-error">
          {{ columnsError }}
          <button class="retry-button" @click="loadAvailableColumns(true)">重试</button>
        </div>
        <div v-else-if="!columnsLoading" class="columns-hint">暂无可导出的数据项</div>

        <!-- 单位选择 -->
        <div class="unit-selector">
          <label class="unit-label">导出单位：</label>
          <select v-model="selectedUnit" class="unit-dropdown">
            <option value="um">μm</option>
            <option value="mm">mm</option>
            <option value="cm">cm</option>
          </select>
        </div>
      </div>
      <div class="modal-footer">
        <button @click="closeDownloadDialog" class="cancel-button">取消</button>
        <button @click="downloadExcel" class="confirm-button" :disabled="selectedColumns.length === 0">
          {{ confirmButtonText }} ({{ selectedColumns.length }} 项)
        </button>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, watch } from 'vue';
import { useExcelStore } from '@/stores/excel';
import { X } from '@lucide/vue';

const props = defineProps({
  visible: {
    type: Boolean,
    default: false
  },
  downloadType: {
    type: String,
    default: 'single'
  },
  job: {
    type: Object,
    default: null
  },
  selectedCount: {
    type: Number,
    default: 1
  },
  // 当前查看/勾选任务所属的分析类型（stem/leaf），用于向后台获取对应的列集合
  taskType: {
    type: String,
    default: ''
  }
});

const emit = defineEmits(['close', 'download']);

const excelStore = useExcelStore();

const dialogTitle = computed(() => {
  switch (props.downloadType) {
    case 'summary': return '选择下载数据项 - 总表';
    case 'batch': return `选择下载数据项 - 批量 (${props.selectedCount} 个文件)`;
    case 'single':
    default: return `选择下载数据项 - ${props.job?.originalFilename || '单个文件'}`;
  }
});

const confirmButtonText = computed(() => {
  switch (props.downloadType) {
    case 'summary': return '下载总表';
    case 'batch': return '下载批量报告';
    case 'single':
    default: return '下载报告';
  }
});

// Excel下载弹窗相关状态
const DEFAULT_COLUMNS = ['filename']; // 默认勾选"样本名称"
const selectedColumns = ref([...DEFAULT_COLUMNS]);
const selectedUnit = ref('um');

// 数据项列表改为按分析类型从后端获取（不再前端硬编码）
const availableColumns = ref([]); // [{ key, label }]
const columnsLoading = ref(false);
const columnsError = ref('');
// 已按分析类型缓存过的列配置，避免同一类型重复请求
const columnsCache = ref({});

const isAllColumnsSelected = computed(() =>
  availableColumns.value.length > 0 && selectedColumns.value.length === availableColumns.value.length
);

const getCacheKey = () => props.taskType || '';

/**
 * 获取当前分析类型对应的可导出列
 * @param {boolean} force - 为 true 时忽略缓存重新请求
 */
const loadAvailableColumns = async (force = false) => {
  const cacheKey = getCacheKey();
  columnsError.value = '';

  if (!force && columnsCache.value[cacheKey]) {
    availableColumns.value = columnsCache.value[cacheKey];
    return;
  }

  columnsLoading.value = true;
  availableColumns.value = [];
  try {
    const result = await excelStore.fetchExportColumnsAction(cacheKey);
    if (!result) {
      columnsError.value = '获取导出列配置失败，请重试。';
      return;
    }
    availableColumns.value = result.columns;
    columnsCache.value = {
      ...columnsCache.value,
      [cacheKey]: result.columns,
    };
  } catch (err) {
    console.error('Failed to load export columns:', err);
    columnsError.value = '获取导出列配置失败，请重试。';
  } finally {
    columnsLoading.value = false;
  }
};

// 重置勾选项：默认只勾"样本名称"；若后端未提供该列则退回"全选"
const resetSelectedColumns = () => {
  const keys = availableColumns.value.map(col => col.key);
  if (keys.includes('filename')) {
    selectedColumns.value = [...DEFAULT_COLUMNS];
  } else if (keys.length > 0) {
    selectedColumns.value = [...keys];
  } else {
    selectedColumns.value = [...DEFAULT_COLUMNS];
  }
};

// 打开弹窗或分析类型变化时，重新拉取列配置并重置勾选状态
watch(
  () => [props.visible, props.taskType],
  ([visible]) => {
    if (!visible) return;
    loadAvailableColumns().then(() => {
      resetSelectedColumns();
    });
  },
  { immediate: true }
);

// 全选/取消全选
const toggleAllColumns = () => {
  if (isAllColumnsSelected.value) {
    selectedColumns.value = [];
  } else {
    selectedColumns.value = availableColumns.value.map(col => col.key);
  }
};

// 下载Excel
const downloadExcel = () => {
  emit('download', {
    type: props.downloadType,
    columns: selectedColumns.value,
    jobId: props.downloadType === 'single' ? props.job?.analysisId : null,
    taskType: props.taskType || '',
    unit: selectedUnit.value
  });

  closeDownloadDialog();
};

// 关闭弹窗：重置为默认勾选（避免下次打开时全不勾选、确认按钮禁用）
const closeDownloadDialog = () => {
  resetSelectedColumns();
  emit('close');
};
</script>

<style scoped>
/* Excel下载弹窗样式 */
.modal-overlay {
  position: fixed;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  background-color: rgba(0, 0, 0, 0.5);
  display: flex;
  justify-content: center;
  align-items: center;
  z-index: 1000;
}

.modal-content {
  background: white;
  border-radius: 8px;
  box-shadow: 0 4px 20px rgba(0, 0, 0, 0.15);
  width: 90%;
  max-width: 650px;
  max-height: 80vh;
  overflow: hidden;
  display: flex;
  flex-direction: column;
}

.modal-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 20px;
  border-bottom: 1px solid #eee;
}

.modal-header h3 {
  margin: 0;
  color: #333;
  font-size: 1.2em;
}

.close-button {
  background: none;
  border: none;
  font-size: 1.5em;
  cursor: pointer;
  color: #666;
  padding: 0;
  width: 30px;
  height: 30px;
  display: flex;
  align-items: center;
  justify-content: center;
}

.close-button:hover {
  color: #333;
  background-color: #f5f5f5;
  border-radius: 50%;
}

.modal-body {
  padding: 20px;
  flex: 1;
  overflow-y: auto;
}

.selection-controls {
  margin-bottom: 20px;
  padding-bottom: 15px;
  border-bottom: 1px solid #eee;
  display: flex;
  align-items: center;
  gap: 12px;
}

.select-all-label {
  display: flex;
  align-items: center;
  font-weight: bold;
  color: #333;
  cursor: pointer;
}

.select-all-label input {
  margin-right: 8px;
}

/* 列配置加载/错误提示 */
.columns-hint {
  display: inline-block;
  font-size: 0.85em;
  color: #888;
}

.columns-error {
  padding: 16px;
  background-color: #fff5f5;
  border: 1px dashed var(--color-error, #dc3545);
  border-radius: 4px;
  color: var(--color-error, #dc3545);
  font-size: 0.9em;
  display: flex;
  align-items: center;
  gap: 12px;
}

.retry-button {
  padding: 4px 12px;
  border: 1px solid var(--color-error, #dc3545);
  background: white;
  color: var(--color-error, #dc3545);
  border-radius: 2px;
  cursor: pointer;
  font-size: 0.9em;
}

.retry-button:hover {
  background-color: #fdecea;
}

.columns-grid {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 12px;
}

.column-checkbox {
  display: flex;
  align-items: center;
  padding: 8px 12px;
  background-color: #f8f9fa;
  border-radius: 4px;
  cursor: pointer;
  transition: background-color 0.2s;
}

.column-checkbox:hover {
  background-color: #e9ecef;
}

.column-checkbox input {
  margin-right: 8px;
}

.unit-selector {
  margin-top: 20px;
  padding-top: 15px;
  border-top: 1px solid #eee;
  display: flex;
  align-items: center;
}

.unit-label {
  font-weight: bold;
  color: #333;
  margin-right: 10px;
}

.unit-dropdown {
  padding: 8px 12px;
  border: 1px solid #ccc;
  border-radius: 4px;
  font-size: 14px;
  background-color: white;
  cursor: pointer;
}

.unit-dropdown:focus {
  outline: none;
  border-color: var(--color-primary-green, #4caf50);
}

.modal-footer {
  display: flex;
  justify-content: flex-end;
  gap: 10px;
  padding: 20px;
  border-top: 1px solid #eee;
  background-color: #f8f9fa;
}

.cancel-button {
  padding: 10px 20px;
  border: 1px solid #ccc;
  background: white;
  border-radius: 2px;
  cursor: pointer;
  color: #666;
}

.cancel-button:hover {
  background-color: #f5f5f5;
}

.confirm-button {
  padding: 10px 20px;
  border: none;
  background-color: var(--color-primary-green, #4caf50);
  color: white;
  border-radius: 2px;
  cursor: pointer;
}

.confirm-button:hover:not(:disabled) {
  background-color: var(--color-primary-green-dark, #2e7d32);
}

.confirm-button:disabled {
  background-color: #ccc;
  cursor: not-allowed;
  opacity: 0.6;
}
</style>
