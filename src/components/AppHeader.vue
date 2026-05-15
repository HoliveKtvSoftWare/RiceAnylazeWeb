<template>
  <header class="app-header">
    <div class="header-title">
      <h1>🌾 水稻茎秆微表型结构分割平台</h1>
    </div>
    <div class="user-info" v-if="authStore.isAuthenticated">
      <span>欢迎, {{ authStore.user?.email || '用户' }}</span>
    </div>
  </header>
</template>

<script setup>
import { useAuthStore } from '@/stores/auth'; // 导入 auth store
const authStore = useAuthStore();
</script>

<style scoped>
.app-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 10px 20px;
  background-color: #e6f4ea; /* 淡绿色背景 */
  border-bottom: 1px solid #c8e6c9; /* 稍深的绿色边框 */
  color: #1b5e20; /* 深绿色文字 */
}

.header-title h1 {
  margin: 0;
  font-size: 1.5em;
}

.user-info span {
  margin-right: 15px;
}

.logout-button {
  background-color: #4caf50; /* 绿色按钮 */
  color: white;
  border: none;
  padding: 5px 10px;
  border-radius: 3px;
  cursor: pointer;
  transition: background-color 0.2s;
}

.logout-button:hover {
  background-color: #388e3c; /* 深一点的绿色 */
}

.quota-info {
  margin-right: 15px;
  font-size: 0.9em;
  color: var(--color-primary-green-dark);
  background-color: var(--color-primary-green-lightest);
  padding: 3px 8px;
  border-radius: 4px;
}
</style>
