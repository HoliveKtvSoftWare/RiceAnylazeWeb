<template>
  <header class="app-header">
    <div class="header-title">
      <h1>🌾水稻茎秆微表型结构分割平台</h1>
    </div>
    <div class="user-info" v-if="authStore.isAuthenticated">
      <div class="dropdown" ref="dropdownRef" @click="openDropdown">
        <span class="dropdown-trigger">欢迎, {{ authStore.user?.email || '用户' }} ▼</span>
        <div class="dropdown-menu" v-show="isDropdownOpen">
          <button class="dropdown-item" @click.stop="goToUserCenter">用户中心</button>
          <button class="dropdown-item logout-btn" @click.stop="handleLogout">退出登录</button>
        </div>
      </div>
    </div>
  </header>
</template>

<script setup>
import { ref, onMounted, onUnmounted } from 'vue';
import { useAuthStore } from '@/stores/auth'; // 导入 auth store
import { useRouter } from 'vue-router';

const authStore = useAuthStore();
const router = useRouter();
const isDropdownOpen = ref(false);
const dropdownRef = ref(null);

const openDropdown = () => {
  isDropdownOpen.value = true;
};

const closeDropdown = () => {
  isDropdownOpen.value = false;
};

const handleClickOutside = (event) => {
  if (dropdownRef.value && !dropdownRef.value.contains(event.target)) {
    closeDropdown();
  }
};

onMounted(() => {
  document.addEventListener('click', handleClickOutside);
});

onUnmounted(() => {
  document.removeEventListener('click', handleClickOutside);
});

const goToUserCenter = () => {
  isDropdownOpen.value = false;
  router.push('/user-center'); // 跳转到用户中心页面
};

const handleLogout = async () => {
  isDropdownOpen.value = false;
  await authStore.logoutAction(); // 调用退出登录方法
  router.push('/login'); // 跳转到登录页面
};
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

.user-info {
  position: relative;
}

.dropdown {
  cursor: pointer;
}

.dropdown-trigger {
  margin-right: 15px;
  padding: 5px 10px;
  border-radius: 4px;
  transition: background-color 0.2s;
}

.dropdown-trigger:hover {
  background-color: rgba(76, 175, 80, 0.2);
}

.dropdown-menu {
  position: absolute;
  top: 100%;
  right: 0;
  margin-top: 5px;
  background-color: white;
  border: 1px solid #c8e6c9;
  border-radius: 4px;
  box-shadow: 0 2px 10px rgba(0, 0, 0, 0.1);
  min-width: 140px;
}

.dropdown-item {
  display: block;
  width: 100%;
  padding: 10px 15px;
  text-align: left;
  border: none;
  background: none;
  cursor: pointer;
  color: #1b5e20;
  transition: background-color 0.2s;
}

.dropdown-item:hover {
  background-color: #e6f4ea;
}

.dropdown-item.logout-btn {
  color: #ff9800;
}

.dropdown-item.logout-btn:hover {
  background-color: #ffebee;
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