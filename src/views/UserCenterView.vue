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
          <button class="secondary" @click="showUsageHistory = true">查看使用记录</button>
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

    <!-- 使用记录模态框 -->
    <div v-if="showUsageHistory" class="modal-overlay" @click="showUsageHistory = false">
      <div class="modal-content usage-history-modal" @click.stop>
        <div class="modal-header">
          <h3>最近使用记录</h3>
          <button class="close-btn" @click="showUsageHistory = false">&times;</button>
        </div>
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
  padding: 24px 28px;
  max-width: 1200px;
  margin: 0 auto;
  animation: pageIn 0.5s cubic-bezier(0.16, 1, 0.3, 1);
}

@keyframes pageIn {
  from { opacity: 0; transform: translateY(16px); }
  to { opacity: 1; transform: translateY(0); }
}

.user-center-content {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 20px;
}

.card {
  padding: 24px;
  border-radius: var(--radius-lg);
  background: rgba(255, 255, 255, 0.85);
  backdrop-filter: blur(16px);
  -webkit-backdrop-filter: blur(16px);
  box-shadow: var(--shadow-md);
  border: 1px solid var(--color-border-light);
  transition: all var(--transition-normal);
}

.card:hover {
  box-shadow: var(--shadow-lg);
}

h3 {
  margin: 0 0 20px;
  padding-bottom: 12px;
  font-size: 1.1em;
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
  height: 20px;
  background: linear-gradient(180deg, var(--color-primary-green), var(--color-primary-green-light));
  border-radius: 2px;
}

.section-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 18px;
}

.section-header h3 {
  margin-bottom: 0;
  padding-bottom: 0;
  border-bottom: none;
}

.refresh-button {
  padding: 7px 14px;
  background-color: var(--color-surface);
  border: 1.5px solid var(--color-border);
  border-radius: var(--radius-md);
  cursor: pointer;
  font-size: 0.86em;
  color: var(--color-text-secondary);
  transition: all var(--transition-fast);
}

.refresh-button:hover:not(:disabled) {
  background-color: var(--color-primary-green-lightest);
  border-color: var(--color-primary-green-light);
  color: var(--color-primary-green-dark);
  transform: translateY(-1px);
}

.user-details .info-row {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 6px;
  padding: 12px 14px;
  border-radius: var(--radius-md);
  transition: background-color var(--transition-fast);
}

.user-details .info-row:hover {
  background-color: var(--color-primary-green-bg);
}

.info-row .label {
  font-weight: 500;
  color: var(--color-text-muted);
  font-size: 0.9em;
}

.info-row .value {
  color: var(--color-text-primary);
  font-weight: 600;
}

.loading-message {
  text-align: center;
  padding: 28px;
  color: var(--color-text-muted);
  font-size: 0.9em;
}

.quota-item {
  display: flex;
  align-items: baseline;
  gap: 8px;
  margin-bottom: 18px;
}

.quota-label {
  font-size: 0.92em;
  font-weight: 500;
  color: var(--color-text-muted);
}

.quota-value {
  font-size: 2.2em;
  font-weight: 800;
  background: linear-gradient(135deg, var(--color-primary-green-dark), var(--color-primary-green));
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;
  line-height: 1;
}

.quota-unit {
  font-size: 0.9em;
  color: var(--color-text-muted);
  font-weight: 500;
}

.quota-progress {
  margin-bottom: 20px;
}

.progress-bar {
  width: 100%;
  height: 10px;
  background: linear-gradient(90deg, var(--color-border-light), var(--color-border));
  border-radius: 5px;
  overflow: hidden;
  margin-bottom: 8px;
}

.progress-fill {
  height: 100%;
  background: linear-gradient(90deg, var(--color-primary-green-light), var(--color-primary-green));
  border-radius: 5px;
  transition: width 0.5s cubic-bezier(0.4, 0, 0.2, 1);
  position: relative;
}

.progress-fill::after {
  content: '';
  position: absolute;
  inset: 0;
  background: linear-gradient(90deg, transparent, rgba(255, 255, 255, 0.4), transparent);
  animation: shimmer 2s ease-in-out infinite;
}

@keyframes shimmer {
  0% { transform: translateX(-100%); }
  100% { transform: translateX(100%); }
}

.progress-text {
  font-size: 0.85em;
  color: var(--color-text-muted);
  text-align: right;
}

.quota-actions {
  display: flex;
  gap: 10px;
  margin-bottom: 6px;
}

.usage-history-modal {
  max-width: 560px;
  max-height: 400px;
  overflow-y: auto;
}

.modal-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 18px;
}

.modal-header h3 {
  margin-bottom: 0;
  border-bottom: none;
  padding-bottom: 0;
}

.modal-header h3::before {
  display: none;
}

.close-btn {
  width: 32px;
  height: 32px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: var(--color-border-light);
  border: none;
  border-radius: var(--radius-md);
  font-size: 1.3em;
  color: var(--color-text-muted);
  cursor: pointer;
  transition: all var(--transition-fast);
  padding: 0;
  line-height: 1;
}

.close-btn:hover {
  background-color: var(--color-error-light);
  color: var(--color-error);
  transform: rotate(90deg);
}

.history-list {
  margin-bottom: 12px;
}

.history-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 12px 14px;
  border-radius: var(--radius-md);
  margin-bottom: 6px;
  background-color: var(--color-primary-green-bg);
  transition: transform var(--transition-fast);
}

.history-item:hover {
  transform: translateX(4px);
}

.record-date {
  color: var(--color-text-muted);
  font-size: 0.85em;
}

.record-action {
  color: var(--color-text-secondary);
  font-weight: 500;
}

.record-cost {
  color: var(--color-error);
  font-weight: 600;
  font-size: 0.9em;
}

.no-history {
  text-align: center;
  padding: 32px 20px;
  color: var(--color-text-muted);
  font-size: 0.9em;
}

.settings-options {
  margin-bottom: 18px;
}

.setting-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 12px 14px;
  border-radius: var(--radius-md);
  transition: background-color var(--transition-fast);
}

.setting-item:hover {
  background-color: var(--color-primary-green-bg);
}

.setting-item label {
  font-weight: 500;
  color: var(--color-text-secondary);
  font-size: 0.92em;
}

.setting-item select {
  padding: 8px 14px;
  border-radius: var(--radius-md);
  border: 1.5px solid var(--color-border);
  font-size: 0.9em;
}

.settings-actions {
  display: flex;
  gap: 10px;
}

.security-actions {
  display: flex;
  gap: 10px;
  margin-bottom: 10px;
}

.modal-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background-color: rgba(0, 0, 0, 0.5);
  backdrop-filter: blur(4px);
  display: flex;
  justify-content: center;
  align-items: center;
  z-index: 1000;
  animation: fadeIn 0.2s ease-out;
}

@keyframes fadeIn {
  from { opacity: 0; }
  to { opacity: 1; }
}

.modal-content {
  background: rgba(255, 255, 255, 0.95);
  backdrop-filter: blur(20px);
  padding: 28px;
  border-radius: var(--radius-xl);
  max-width: 480px;
  width: 90%;
  max-height: 80vh;
  overflow-y: auto;
  box-shadow: var(--shadow-2xl);
  border: 1px solid rgba(255, 255, 255, 0.7);
  animation: modalIn 0.3s cubic-bezier(0.34, 1.56, 0.64, 1);
}

@keyframes modalIn {
  from { opacity: 0; transform: scale(0.92) translateY(16px); }
  to { opacity: 1; transform: scale(1) translateY(0); }
}

.modal-content h3 {
  margin-top: 0;
}

.modal-content h3::before {
  display: inline-block;
}

.purchase-options {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 12px;
  margin: 20px 0;
}

.purchase-option {
  border: 2px solid var(--color-border);
  border-radius: var(--radius-lg);
  padding: 18px 14px;
  text-align: center;
  cursor: pointer;
  transition: all var(--transition-normal);
  position: relative;
  background: var(--color-surface);
}

.purchase-option:hover {
  border-color: var(--color-primary-green-light);
  transform: translateY(-2px);
  box-shadow: var(--shadow-md);
}

.purchase-option.selected {
  border-color: var(--color-primary-green);
  background: linear-gradient(135deg, var(--color-primary-green-lightest), var(--color-primary-green-bg));
  box-shadow: 0 4px 12px rgba(76, 175, 80, 0.2);
}

.purchase-option.selected::after {
  content: '✓';
  position: absolute;
  top: 8px;
  right: 10px;
  width: 22px;
  height: 22px;
  background: var(--color-primary-green);
  color: white;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 0.75em;
  font-weight: bold;
}

.option-amount {
  font-size: 1.25em;
  font-weight: 700;
  color: var(--color-text-primary);
}

.option-price {
  color: var(--color-primary-green-dark);
  font-weight: 600;
  font-size: 0.95em;
  margin-top: 4px;
}

.modal-actions {
  display: flex;
  gap: 10px;
  justify-content: flex-end;
  margin-top: 8px;
}

.delete-confirm {
  margin: 20px 0;
  padding: 14px 16px;
  background-color: var(--color-warning-light);
  border: 1px solid rgba(245, 158, 11, 0.3);
  border-radius: var(--radius-md);
}

.delete-confirm label {
  display: flex;
  align-items: center;
  gap: 10px;
  color: #92400e;
  font-size: 0.9em;
  cursor: pointer;
}

.modal-content.danger {
  border-left: 4px solid var(--color-error);
}

@media (max-width: 768px) {
  .user-center-view {
    padding: 16px;
  }

  .user-center-content {
    grid-template-columns: 1fr;
  }

  .purchase-options {
    grid-template-columns: 1fr;
  }

  .quota-actions,
  .settings-actions,
  .security-actions,
  .modal-actions {
    flex-direction: column;
  }

  .quota-actions button,
  .settings-actions button,
  .security-actions button,
  .modal-actions button {
    width: 100%;
  }
}
</style>