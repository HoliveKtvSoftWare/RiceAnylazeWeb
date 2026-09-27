<template>
  <div v-if="visible" class="modal-overlay" @click="closeDownloadDialog">
    <div class="modal-content" @click.stop>
      <div class="modal-header">
        <h3>{{ dialogTitle }}</h3>
        <button class="close-button" @click="closeDownloadDialog">×</button>
      </div>
      <div class="modal-body">
        <div class="selection-controls">
          <label class="select-all-label">
            <input
              type="checkbox"
              :checked="selectedColumns.length === availableColumns.length"
              @change="toggleAllColumns"
            />
            全选/取消全选
            <span v-if="columnsLoading" class="columns-loading">加载数据项中…</span>
          </label>
        </div>
        <div class="columns-grid">
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
import { excelService } from '@/services/excelServerce';

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
  // 本次导出对应的分析类型（stem / leaf_our …）。茎秆与剑叶是两套完全不同的
  // 指标，列定义必须跟着记录走，否则后端会判定"无效的列选择"。
  taskType: {
    type: String,
    default: 'stem'
  }
});

const emit = defineEmits(['close', 'download']);

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
const selectedColumns = ref(['filename']);
const selectedUnit = ref('um');

// 可下载的数据项：向后端要当前分析类型的列定义。
// 原来这里写死了一份茎秆列表，剑叶记录一勾选就会被后端判定"无效的列选择"。
const availableColumns = ref([{ key: 'filename', label: '样本名称' }]);
const columnsLoading = ref(false);

const loadAvailableColumns = async (taskType) => {
  columnsLoading.value = true;
  try {
    const data = await excelService.getExportColumns(taskType || 'stem');
    const mapping = data.available_columns || {};
    const items = Object.keys(mapping).map(key => ({ key, label: mapping[key] }));
    availableColumns.value = items.length ? items : [{ key: 'filename', label: '样本名称' }];
  } catch (err) {
    console.error('Failed to load export columns:', err);
    availableColumns.value = [{ key: 'filename', label: '样本名称' }];
  } finally {
    columnsLoading.value = false;
  }
};

// 全选/取消全选
const toggleAllColumns = () => {
  if (selectedColumns.value.length === availableColumns.value.length) {
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
    unit: selectedUnit.value
  });

  closeDownloadDialog();
};

// 关闭弹窗
const closeDownloadDialog = () => {
  emit('close');
};

watch(() => props.visible, (val) => {
  if (val) {
    selectedColumns.value = ['filename'];
    selectedUnit.value = 'um';
    loadAvailableColumns(props.taskType);
  }
});
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

.columns-loading {
  margin-left: 10px;
  font-weight: normal;
  font-size: 0.85em;
  color: #888;
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