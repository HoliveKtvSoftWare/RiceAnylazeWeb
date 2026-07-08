<template>
  <div class="user-center-view">
    <main class="user-center-content">
      <!-- 用户信息卡片 -->
      <section class="user-info-section card">
        <div class="section-header">
          <h3>个人信息</h3>
          <button @click="refreshUserInfo" :disabled="isLoading" class="refresh-button">
            {{ isLoading ? '刷新中...' : '刷新信息' }}
          </button>
        </div>

        <div v-if="authStore.user" class="user-details">
          <div class="info-row">
            <span class="label">用户ID:</span>
            <span class="value">{{ authStore.user.id || 'N/A' }}</span>
          </div>
          <div class="info-row">
            <span class="label">邮箱:</span>
            <span class="value">{{ authStore.user.email || 'N/A' }}</span>
          </div>
        </div>

        <div v-else class="loading-message">
          <p>正在加载用户信息...</p>
        </div>
      </section>

      <!-- 额度信息卡片 -->
      <section class="quota-section card">
        <h3>额度信息</h3>
        <div class="quota-details">
          <div class="quota-item">
            <div class="quota-label">当前额度</div>
            <div class="quota-value">{{ authStore.userQuota || 0 }}</div>
            <div class="quota-unit">次</div>
          </div>
          <div class="quota-progress">
            <div class="progress-bar">
              <div class="progress-fill" :style="{ width: quotaPercentage + '%' }"></div>
            </div>
            <div class="progress-text">{{ quotaPercentage }}% 已使用</div>
          </div>
        </div>
        <div class="quota-actions">
          <button class="primary" @click="showPurchaseModal = true">购买额度</button>
          <button class="secondary" @click="showUsageHistory = !showUsageHistory">
            {{ showUsageHistory ? '隐藏' : '查看' }}使用记录
          </button>
        </div>

        <!-- 使用记录 -->
        <div v-if="showUsageHistory" class="usage-history">
          <h4>最近使用记录</h4>
          <div v-if="usageHistory.length > 0" class="history-list">
            <div v-for="record in usageHistory" :key="record.id" class="history-item">
              <span class="record-date">{{ formatDate(record.date) }}</span>
              <span class="record-action">{{ record.action }}</span>
              <span class="record-cost">-{{ record.cost }} 额度</span>
            </div>
          </div>
          <div v-else class="no-history">
            <p>暂无使用记录</p>
          </div>
        </div>
      </section>

      <!-- 账户设置卡片 -->
      <section class="settings-section card">
        <h3>账户设置</h3>
        <div class="settings-options">
          <div class="setting-item">
            <label for="language">界面语言:</label>
            <select id="language" v-model="settings.language">
              <option value="zh-CN">简体中文</option>
              <option value="en-US">English</option>
            </select>
          </div>
        </div>
        <div class="settings-actions">
          <button class="primary" @click="saveSettings" :disabled="!settingsChanged">保存设置</button>
          <button class="secondary" @click="resetSettings">重置</button>
        </div>
      </section>

      <!-- 安全操作卡片 -->
      <section class="security-section card">
        <h3>安全操作</h3>
        <div class="security-actions">
          <button class="warning" @click="handleLogout">退出登录</button>
          <button class="danger" @click="showDeleteModal = true">删除账户</button>
        </div>
      </section>
    </main>

    <!-- 购买额度模态框 -->
    <div v-if="showPurchaseModal" class="modal-overlay" @click="showPurchaseModal = false">
      <div class="modal-content" @click.stop>
        <h3>购买额度</h3>
        <div class="purchase-options">
          <div class="purchase-option" v-for="option in purchaseOptions" :key="option.id"
               :class="{ selected: selectedOption === option.id }"
               @click="selectedOption = option.id">
            <div class="option-amount">{{ option.amount }} 次</div>
            <div class="option-price">¥{{ option.price }}</div>
          </div>
        </div>
        <div class="modal-actions">
          <button class="primary" @click="handlePurchase" :disabled="!selectedOption">确认购买</button>
          <button class="secondary" @click="showPurchaseModal = false">取消</button>
        </div>
      </div>
    </div>

    <!-- 删除账户确认模态框 -->
    <div v-if="showDeleteModal" class="modal-overlay" @click="showDeleteModal = false">
      <div class="modal-content danger" @click.stop>
        <h3>确认删除账户</h3>
        <p>此操作将永久删除您的账户和所有相关数据，无法恢复。</p>
        <div class="delete-confirm">
          <label>
            <input type="checkbox" v-model="deleteConfirmed" />
            我确认要删除我的账户
          </label>
        </div>
        <div class="modal-actions">
          <button class="danger" @click="handleDeleteAccount" :disabled="!deleteConfirmed">确认删除</button>
          <button class="secondary" @click="showDeleteModal = false">取消</button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, watch } from 'vue';
import { useRouter } from 'vue-router';
import { useAuthStore } from '@/stores/auth';

const authStore = useAuthStore();
const router = useRouter();

// 响应式状态
const isLoading = ref(false);
const showPurchaseModal = ref(false);
const showDeleteModal = ref(false);
const showUsageHistory = ref(false);
const selectedOption = ref(null);
const deleteConfirmed = ref(false);

// 用户设置
const settings = ref({
  emailNotifications: true,
  autoSave: true,
  language: 'zh-CN'
});

// 默认设置（用于重置）
let defaultSettings = { ...settings.value };

// 购买选项
const purchaseOptions = ref([
  { id: 1, amount: 10, price: 9.9 },
  { id: 2, amount: 50, price: 39.9 },
  { id: 3, amount: 100, price: 69.9 },
  { id: 4, amount: 200, price: 119.9 }
]);

// 使用记录（模拟数据）
const usageHistory = ref([
  { id: 1, date: new Date(Date.now() - 86400000), action: '图像分割', cost: 1 },
  { id: 2, date: new Date(Date.now() - 172800000), action: '图像分割', cost: 1 },
  { id: 3, date: new Date(Date.now() - 259200000), action: '图像分割', cost: 1 }
]);

// 计算属性
const quotaPercentage = computed(() => {
  const quota = authStore.userQuota || 0;
  const used = usageHistory.value.reduce((sum, record) => sum + record.cost, 0);
  return Math.min(Math.round((used / (quota + used)) * 100), 100);
});

const settingsChanged = computed(() => {
  return JSON.stringify(settings.value) !== JSON.stringify(defaultSettings);
});

// 生命周期
onMounted(() => {
  // 确保用户信息是最新的
  if (authStore.isAuthenticated && !authStore.user) {
    authStore.fetchUser();
  }
});

// 方法
const refreshUserInfo = async () => {
  isLoading.value = true;
  try {
    await authStore.fetchUser();
  } catch (error) {
    console.error('刷新用户信息失败:', error);
  } finally {
    isLoading.value = false;
  }
};

const formatDate = (dateString) => {
  if (!dateString) return 'N/A';
  try {
    return new Date(dateString).toLocaleString('zh-CN');
  } catch {
    return 'N/A';
  }
};

const saveSettings = () => {
  // 这里应该调用API保存设置
  console.log('保存设置:', settings.value);
  // 模拟保存成功
  defaultSettings = { ...settings.value };
};

const resetSettings = () => {
  settings.value = { ...defaultSettings };
};

const handlePurchase = () => {
  // 这里应该调用购买API
  console.log('购买选项:', selectedOption.value);
  showPurchaseModal.value = false;
  selectedOption.value = null;
};

const handleLogout = async () => {
  await authStore.logoutAction();
  router.push('/login');
};

const handleDeleteAccount = () => {
  // 这里应该调用删除账户API
  console.log('删除账户确认');
  showDeleteModal.value = false;
  deleteConfirmed.value = false;
  // 模拟删除后登出
  handleLogout();
};

// 监听设置变化
watch(settings, (newSettings) => {
  console.log('设置已更改:', newSettings);
}, { deep: true });
</script>

<style scoped>
.user-center-view {
  padding: 20px;
  max-width: 1200px;
  margin: 0 auto;
}

.user-center-content {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 20px;
}

.card {
  background-color: var(--color-surface, #ffffff);
  padding: 20px;
  border-radius: 8px;
  box-shadow: 0 1px 3px rgba(0,0,0,0.1);
}

h3 {
  margin-top: 0;
  color: var(--color-primary-green-dark, #2e7d32);
  border-bottom: 2px solid var(--color-primary-green-lightest, #e6f4ea);
  padding-bottom: 10px;
  margin-bottom: 20px;
}

/* 用户信息部分 */
.section-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 20px;
}

.refresh-button {
  padding: 6px 12px;
  background-color: #f0f0f0;
  border: 1px solid #ddd;
  border-radius: 4px;
  cursor: pointer;
  font-size: 0.9em;
}

.refresh-button:hover:not(:disabled) {
  background-color: #e0e0e0;
}

.user-details .info-row {
  display: flex;
  justify-content: space-between;
  margin-bottom: 10px;
  padding: 8px 0;
  border-bottom: 1px solid #f0f0f0;
}

.info-row .label {
  font-weight: 500;
  color: #555;
}

.info-row .value {
  color: #333;
}

.loading-message {
  text-align: center;
  padding: 20px;
  color: #666;
}

/* 额度部分 */
.quota-item {
  display: flex;
  align-items: center;
  gap: 10px;
  margin-bottom: 15px;
}

.quota-label {
  font-weight: 500;
  color: #555;
}

.quota-value {
  font-size: 1.5em;
  font-weight: bold;
  color: var(--color-primary-green, #4caf50);
}

.quota-unit {
  color: #666;
}

.quota-progress {
  margin-bottom: 20px;
}

.progress-bar {
  width: 100%;
  height: 8px;
  background-color: #f0f0f0;
  border-radius: 4px;
  overflow: hidden;
  margin-bottom: 5px;
}

.progress-fill {
  height: 100%;
  background-color: var(--color-primary-green, #4caf50);
  transition: width 0.3s ease;
}

.progress-text {
  font-size: 0.9em;
  color: #666;
  text-align: right;
}

.quota-actions {
  display: flex;
  gap: 10px;
  margin-bottom: 20px;
}

.usage-history {
  border-top: 1px solid #eee;
  padding-top: 15px;
}

.usage-history h4 {
  margin-bottom: 10px;
  color: #555;
}

.history-item {
  display: flex;
  justify-content: space-between;
  padding: 8px 0;
  border-bottom: 1px solid #f0f0f0;
}

.record-date {
  color: #666;
  font-size: 0.9em;
}

.record-action {
  color: #333;
}

.record-cost {
  color: #e74c3c;
  font-weight: 500;
}

.no-history {
  text-align: center;
  padding: 20px;
  color: #666;
}

/* 设置部分 */
.settings-options {
  margin-bottom: 20px;
}

.setting-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 15px;
  padding: 10px 0;
  border-bottom: 1px solid #f0f0f0;
}

.setting-item label {
  font-weight: 500;
  color: #555;
}

.setting-item input[type="checkbox"] {
  transform: scale(1.2);
}

.setting-item select {
  padding: 6px 10px;
  border-radius: 4px;
  border: 1px solid #ccc;
}

.settings-actions {
  display: flex;
  gap: 10px;
}

/* 安全部分 */
.security-actions {
  display: flex;
  gap: 10px;
  margin-bottom: 15px;
}

.security-note {
  font-size: 0.9em;
  color: #666;
}

/* 按钮样式 */
button {
  padding: 8px 16px;
  border: none;
  border-radius: 4px;
  cursor: pointer;
  font-size: 0.9em;
  transition: background-color 0.2s;
}

button.primary {
  background-color: var(--color-primary-green, #4caf50);
  color: white;
}

button.primary:hover:not(:disabled) {
  background-color: var(--color-primary-green-dark, #2e7d32);
}

button.secondary {
  background-color: #f0f0f0;
  color: #333;
  border: 1px solid #ddd;
}

button.secondary:hover:not(:disabled) {
  background-color: #e0e0e0;
}

button.warning {
  background-color: #ff9800;
  color: white;
}

button.warning:hover:not(:disabled) {
  background-color: #f57c00;
}

button.danger {
  background-color: #f44336;
  color: white;
}

button.danger:hover:not(:disabled) {
  background-color: #d32f2f;
}

button:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

/* 模态框样式 */
.modal-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background-color: rgba(0, 0, 0, 0.5);
  display: flex;
  justify-content: center;
  align-items: center;
  z-index: 1000;
}

.modal-content {
  background: white;
  padding: 30px;
  border-radius: 8px;
  max-width: 500px;
  width: 90%;
  max-height: 80vh;
  overflow-y: auto;
}

.modal-content h3 {
  margin-top: 0;
}

.purchase-options {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 10px;
  margin: 20px 0;
}

.purchase-option {
  border: 2px solid #ddd;
  border-radius: 8px;
  padding: 15px;
  text-align: center;
  cursor: pointer;
  transition: all 0.2s;
}

.purchase-option:hover {
  border-color: var(--color-primary-green, #4caf50);
}

.purchase-option.selected {
  border-color: var(--color-primary-green, #4caf50);
  background-color: var(--color-primary-green-lightest, #e6f4ea);
}

.option-amount {
  font-size: 1.2em;
  font-weight: bold;
  color: #333;
}

.option-price {
  color: var(--color-primary-green, #4caf50);
  font-weight: 500;
}

.modal-actions {
  display: flex;
  gap: 10px;
  justify-content: flex-end;
}

.delete-confirm {
  margin: 20px 0;
  padding: 15px;
  background-color: #fff3cd;
  border: 1px solid #ffeaa7;
  border-radius: 4px;
}

.delete-confirm label {
  display: flex;
  align-items: center;
  gap: 10px;
  color: #856404;
}

.modal-content.danger {
  border-left: 4px solid #f44336;
}

/* 响应式设计 */
@media (max-width: 768px) {
  .user-center-content {
    grid-template-columns: 1fr;
  }

  .purchase-options {
    grid-template-columns: 1fr;
  }

  .quota-actions,
  .settings-actions,
  .security-actions {
    flex-direction: column;
  }
}
</style>
