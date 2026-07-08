<template>
  <div v-if="visible" class="modal-overlay" @click="closeDownloadDialog">
    <div class="modal-content" @click.stop>
      <div class="modal-header">
        <h3>{{ downloadType === 'summary' ? '选择下载数据项 - 总表' : `选择下载数据项 - ${job?.originalFilename}` }}</h3>
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
          {{ downloadType === 'summary' ? '下载总表' : '下载报告' }} ({{ selectedColumns.length }} 项)
        </button>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref } from 'vue';

const props = defineProps({
  visible: {
    type: Boolean,
    default: false
  },
  downloadType: {
    type: String,
    default: 'summary'
  },
  job: {
    type: Object,
    default: null
  }
});

const emit = defineEmits(['close', 'download']);

// Excel下载弹窗相关状态
const selectedColumns = ref(['filename']);
const selectedUnit = ref('um');

// 可下载的数据项配置
const availableColumns = [
  { key: 'filename', label: '样本名称' },
  { key: 'largeTailCount', label: '大维管束数目' },
  { key: 'smallTailCount', label: '小维管束数目' },
  { key: 'totalCount', label: '总维管束数目' },
  { key: 'largeTailArea', label: '大维管束面积' },
  { key: 'smallTailArea', label: '小维管束面积' },
  { key: 'stemDiameter', label: '茎秆直径' },
  { key: 'stemPerimeter', label: '茎秆周长' },
  { key: 'cavityArea', label: '空腔面积' },
  { key: 'stemCavityAreaDiff', label: '茎秆面积与空腔面积差值' },
  { key: 'largeSmallAreaRatio', label: '大维管束面积与小维管束面积比值' },
  { key: 'largeSmallCountRatio', label: '大维管束数目与小维管束数目比值' },
  { key: 'stemArea', label: '茎秆面积' },
  { key: 'cavityStemAreaRatio', label: '空腔面积与茎秆面积比值' },
  { key: 'smallCountPerimeterRatio', label: '小维管束数目与茎秆周长比值' },
  { key: 'largeCountPerimeterCavityRatio', label: '大维管束数目与茎秆周长与空腔面积差值比值' }
];

// 全选/取消全选
const toggleAllColumns = () => {
  if (selectedColumns.value.length === availableColumns.length) {
    selectedColumns.value = [];
  } else {
    selectedColumns.value = availableColumns.map(col => col.key);
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
  selectedColumns.value = [];
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
  border-radius: 4px;
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
  border-radius: 4px;
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